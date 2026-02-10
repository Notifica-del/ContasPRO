
import React, { useState } from 'react';
import { Bill, BillStatus, Company } from '../types.ts';
import { Search, MoreVertical, Calendar, Landmark, CheckCircle, Clock, AlertTriangle, ReceiptText, Check } from 'lucide-react';
import { COMPANIES } from '../constants.tsx';

interface BillListProps {
  bills: Bill[];
  onStatusChange: (id: string, status: BillStatus) => void;
  accessibleUnits: string[];
}

const BillList: React.FC<BillListProps> = ({ bills, onStatusChange, accessibleUnits }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<BillStatus | 'ALL'>('ALL');
  const [unitFilter, setUnitFilter] = useState<string | 'ALL'>('ALL');
  const [markingId, setMarkingId] = useState<string | null>(null);

  const filteredBills = bills.filter(bill => {
    const matchesSearch = bill.beneficiary.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || bill.status === statusFilter;
    const matchesUnit = (unitFilter === 'ALL' || bill.companyId === unitFilter) && accessibleUnits.includes(bill.companyId);
    return matchesSearch && matchesStatus && matchesUnit;
  });

  const handleMarkAsPaid = (id: string) => {
    setMarkingId(id);
    // Timeout para permitir a execução da animação de pulso definida no CSS global
    setTimeout(() => {
      onStatusChange(id, BillStatus.PAID);
      setMarkingId(null);
    }, 800);
  };

  const getStatusIcon = (status: BillStatus, id: string) => {
    if (markingId === id) {
      return <div className="animate-check-pop"><Check className="w-4 h-4 text-emerald-600" /></div>;
    }
    switch (status) {
      case BillStatus.PAID: return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case BillStatus.PENDING: return <Clock className="w-4 h-4 text-blue-500" />;
      case BillStatus.OVERDUE: return <AlertTriangle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusLabel = (status: BillStatus, id: string) => {
    if (markingId === id) return 'Confirmado!';
    switch (status) {
      case BillStatus.PAID: return 'Pago';
      case BillStatus.PENDING: return 'Pendente';
      case BillStatus.OVERDUE: return 'Vencido';
    }
  };

  return (
    <div className="space-y-4 animate-fade-in pb-10">
      <div className="sticky top-[64px] md:top-0 bg-slate-50/95 backdrop-blur-sm pt-2 pb-4 z-30 space-y-3">
        <div className="relative animate-slide-down px-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Buscar por beneficiário..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-sm focus:ring-2 ring-blue-500/20 outline-none shadow-sm transition-all"
          />
        </div>
        
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide px-1 animate-fade-in">
          <button 
            onClick={() => setStatusFilter('ALL')}
            className={`px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all uppercase tracking-tighter ${statusFilter === 'ALL' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-white text-slate-600 border border-slate-200'}`}
          >
            Todos
          </button>
          <button 
            onClick={() => setStatusFilter(BillStatus.PENDING)}
            className={`px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all uppercase tracking-tighter ${statusFilter === BillStatus.PENDING ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-white text-slate-600 border border-slate-200'}`}
          >
            Pendentes
          </button>
          <button 
            onClick={() => setStatusFilter(BillStatus.PAID)}
            className={`px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all uppercase tracking-tighter ${statusFilter === BillStatus.PAID ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-white text-slate-600 border border-slate-200'}`}
          >
            Pagos
          </button>
          <div className="w-px bg-slate-200 mx-2 flex-shrink-0" />
          {accessibleUnits.map(unitId => {
            const unit = COMPANIES.find(c => c.id === unitId);
            return (
              <button 
                key={unitId}
                onClick={() => setUnitFilter(unitFilter === unitId ? 'ALL' : unitId)}
                className={`px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all uppercase tracking-tighter ${unitFilter === unitId ? 'bg-slate-800 text-white shadow-lg' : 'bg-white text-slate-600 border border-slate-200'}`}
              >
                {unit?.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3 px-1">
        {filteredBills.map((bill, i) => {
          const isMarking = markingId === bill.id;
          const company = COMPANIES.find(c => c.id === bill.companyId);
          
          return (
            <div 
              key={bill.id} 
              className={`bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group relative overflow-hidden transition-all
                ${isMarking ? 'animate-success-action ring-2 ring-emerald-500/20 z-10' : 'animate-slide-up'} 
                ${!isMarking && markingId !== null ? 'opacity-40 scale-95' : ''}`}
              style={{ animationDelay: isMarking ? '0s' : `${0.05 + (i * 0.03)}s` }}
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors duration-500 ${isMarking ? 'bg-emerald-100' : company?.color + ' bg-opacity-10'}`}>
                  <Landmark className={`w-5 h-5 transition-colors duration-500 ${isMarking ? 'text-emerald-600' : company?.color.replace('bg-', 'text-')}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h4 className={`text-xs font-black truncate transition-colors duration-500 ${isMarking ? 'text-emerald-700' : 'text-slate-900'}`}>{bill.beneficiary}</h4>
                  </div>
                  <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-0.5 font-bold uppercase tracking-tight">
                    <span className="truncate">{bill.category}</span>
                    <span>•</span>
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-2.5 h-2.5" />
                      <span>{new Date(bill.dueDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 mt-1">
                    {getStatusIcon(bill.status, bill.id)}
                    <span className={`text-[9px] font-black uppercase tracking-widest ${isMarking ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {getStatusLabel(bill.status, bill.id)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-end justify-center ml-2 min-w-[80px]">
                <p className={`text-sm font-black leading-tight transition-all duration-500 ${isMarking ? 'text-emerald-600 scale-110' : 'text-slate-900'}`}>
                  R$ {bill.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                
                <div className="mt-2 flex items-center space-x-2">
                  {bill.status === BillStatus.PENDING && !isMarking ? (
                    <button 
                      onClick={() => handleMarkAsPaid(bill.id)}
                      className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white active:scale-90 transition-all border border-blue-100/50"
                    >
                      Pagar
                    </button>
                  ) : isMarking ? (
                    <div className="h-6 flex items-center animate-fade-in">
                       <span className="text-[9px] text-emerald-600 font-black uppercase tracking-widest">OK</span>
                    </div>
                  ) : null}
                  
                  <button className={`text-slate-300 hover:text-slate-600 p-1 transition-opacity ${isMarking ? 'opacity-0' : 'opacity-100'}`}>
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredBills.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center text-slate-300 space-y-4 animate-fade-in">
            <ReceiptText className="w-16 h-16 opacity-10" />
            <p className="text-sm font-black uppercase tracking-widest">Nenhuma conta</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BillList;
