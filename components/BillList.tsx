
import React, { useState } from 'react';
import { Bill, BillStatus, Company } from '../types';
import { Search, Filter, MoreVertical, Calendar, Landmark, CheckCircle, Clock, AlertTriangle, ReceiptText, Check, Plus } from 'lucide-react';
import { COMPANIES } from '../constants';

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
    // Aguarda a animação de pulso/checkmark terminar antes de atualizar o estado global
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
    if (markingId === id) return 'Pago!';
    switch (status) {
      case BillStatus.PAID: return 'Pago';
      case BillStatus.PENDING: return 'Pendente';
      case BillStatus.OVERDUE: return 'Vencido';
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="sticky top-[64px] md:top-0 bg-slate-50 pt-2 pb-4 z-30 space-y-3">
        <div className="flex items-center space-x-3 animate-slide-down">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Buscar por beneficiário..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-sm focus:ring-2 ring-blue-500/20 outline-none shadow-sm transition-all"
            />
          </div>
          {/* O botão 'Novo' apenas serve como atalho visual para a aba de lançamento no App.tsx */}
          {/* Para funcionar 100%, o componente pai deveria trocar a tab, mas o usuário pediu a adição manual em si */}
        </div>
        
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <button 
            onClick={() => setStatusFilter('ALL')}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 ${statusFilter === 'ALL' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200'}`}
          >
            Todos
          </button>
          <button 
            onClick={() => setStatusFilter(BillStatus.PENDING)}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 ${statusFilter === BillStatus.PENDING ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200'}`}
          >
            Pendentes
          </button>
          <button 
            onClick={() => setStatusFilter(BillStatus.PAID)}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 ${statusFilter === BillStatus.PAID ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200'}`}
          >
            Pagos
          </button>
          <div className="w-px bg-slate-200 mx-2" />
          {accessibleUnits.map(unitId => {
            const unit = COMPANIES.find(c => c.id === unitId);
            return (
              <button 
                key={unitId}
                onClick={() => setUnitFilter(unitFilter === unitId ? 'ALL' : unitId)}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 ${unitFilter === unitId ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
              >
                {unit?.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        {filteredBills.map((bill, i) => {
          const isMarking = markingId === bill.id;
          return (
            <div 
              key={bill.id} 
              className={`bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all 
                ${isMarking ? 'animate-success-action z-10' : 'animate-slide-up'} 
                ${!isMarking && markingId !== null && statusFilter === BillStatus.PENDING ? 'opacity-50' : ''}`}
              style={{ animationDelay: isMarking ? '0s' : `${0.1 + (i * 0.05)}s` }}
            >
              <div className="flex items-center space-x-4 flex-1 min-w-0">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${isMarking ? 'bg-emerald-100' : COMPANIES.find(c => c.id === bill.companyId)?.color + ' bg-opacity-10'} transition-all duration-500`}>
                  <Landmark className={`w-6 h-6 transition-colors duration-500 ${isMarking ? 'text-emerald-600' : COMPANIES.find(c => c.id === bill.companyId)?.color.replace('bg-', 'text-')}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h4 className={`text-sm font-bold truncate transition-colors duration-500 ${isMarking ? 'text-emerald-700' : 'text-slate-900'}`}>{bill.beneficiary}</h4>
                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-bold uppercase">{bill.category}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-xs text-slate-500 mt-0.5">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(bill.dueDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(bill.status, bill.id)}
                      <span className={isMarking ? 'text-emerald-600 font-bold' : ''}>{getStatusLabel(bill.status, bill.id)}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-right flex items-center space-x-4">
                <div className="transition-transform duration-500" style={{ transform: isMarking ? 'scale(1.1)' : 'scale(1)' }}>
                  <p className={`text-sm font-black leading-tight transition-colors duration-500 ${isMarking ? 'text-emerald-600' : 'text-slate-900'}`}>
                    R$ {bill.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  {bill.status === BillStatus.PENDING && !isMarking && (
                    <button 
                      onClick={() => handleMarkAsPaid(bill.id)}
                      className="text-[10px] text-blue-600 font-bold hover:underline active:opacity-50"
                    >
                      Marcar Pago
                    </button>
                  )}
                  {isMarking && (
                    <span className="text-[10px] text-emerald-600 font-bold animate-fade-in">Concluído</span>
                  )}
                </div>
                <button className={`text-slate-300 hover:text-slate-600 p-1 transition-colors ${isMarking ? 'opacity-0' : 'opacity-100'}`}>
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>
          );
        })}

        {filteredBills.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-4 animate-fade-in">
            <ReceiptText className="w-16 h-16 opacity-10" />
            <p className="font-medium">Nenhuma conta encontrada</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BillList;
