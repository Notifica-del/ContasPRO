
import React, { useState } from 'react';
import { Bill, BillStatus } from '../types';
import { Search, MoreVertical, Calendar, CheckCircle, Clock, AlertTriangle, ReceiptText, Check, Tag } from 'lucide-react';
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
    setTimeout(() => {
      onStatusChange(id, BillStatus.PAID);
      setMarkingId(null);
    }, 700);
  };

  return (
    <div className="space-y-4 animate-fade-in pb-24">
      <div className="sticky top-0 bg-slate-50/95 backdrop-blur-md pt-2 pb-4 z-30 space-y-3 -mx-4 px-4 border-b border-slate-100">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Buscar contas..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-sm focus:ring-2 ring-blue-500/10 outline-none shadow-sm transition-all"
          />
        </div>
        
        <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-hide">
          <FilterButton active={statusFilter === 'ALL'} onClick={() => setStatusFilter('ALL')} label="Todos" />
          <FilterButton active={statusFilter === BillStatus.PENDING} onClick={() => setStatusFilter(BillStatus.PENDING)} label="Pendentes" />
          <FilterButton active={statusFilter === BillStatus.PAID} onClick={() => setStatusFilter(BillStatus.PAID)} label="Pagos" />
          <div className="w-px h-6 bg-slate-200 self-center mx-1 flex-shrink-0" />
          {accessibleUnits.map(id => (
            <FilterButton 
              key={id} 
              active={unitFilter === id} 
              onClick={() => setUnitFilter(unitFilter === id ? 'ALL' : id)} 
              label={COMPANIES.find(c => c.id === id)?.name || id} 
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filteredBills.map((bill, i) => {
          const isMarking = markingId === bill.id;
          const company = COMPANIES.find(c => c.id === bill.companyId);
          const isOverdue = bill.status === BillStatus.PENDING && new Date(bill.dueDate) < new Date(new Date().setHours(0,0,0,0));
          
          return (
            <div 
              key={bill.id} 
              className={`relative bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden transition-all duration-300
                ${isMarking ? 'bill-card-success scale-[1.01] z-10' : 'animate-slide-up'}
                ${!isMarking && markingId !== null ? 'opacity-40 grayscale-[0.5]' : ''}`}
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${company?.color}`} />
              
              <div className="p-4 grid grid-cols-[1fr_auto] gap-x-2 gap-y-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`w-2 h-2 rounded-full ${company?.color} shrink-0`} />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">{company?.name}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 truncate pr-2">
                    {bill.beneficiary}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1 text-slate-400">
                      <Tag className="w-3 h-3" />
                      <span className="text-[10px] font-bold uppercase tracking-tight">{bill.category}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end">
                  <p className={`text-base font-black tracking-tighter ${isMarking ? 'text-emerald-600' : 'text-slate-900'}`}>
                    R$ {bill.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <div className={`flex items-center gap-1 mt-1 px-2 py-0.5 rounded-lg ${
                    bill.status === BillStatus.PAID ? 'bg-emerald-50 text-emerald-600' : 
                    isOverdue ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    <span className="text-[9px] font-black uppercase tracking-widest leading-none">
                      {bill.status === BillStatus.PAID ? 'Pago' : isOverdue ? 'Vencido' : 'Pendente'}
                    </span>
                  </div>
                </div>

                <div className="col-span-2 flex items-center justify-between pt-3 border-t border-slate-50 mt-1">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1.5 rounded-xl border border-slate-100">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span className={`text-[11px] font-bold ${isOverdue ? 'text-red-500' : 'text-slate-600'}`}>
                        {new Date(bill.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative min-w-[80px] h-9 flex items-center justify-end">
                      {bill.status === BillStatus.PENDING && !isMarking && (
                        <button 
                          onClick={() => handleMarkAsPaid(bill.id)}
                          className="bg-blue-600 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md shadow-blue-100 active:scale-95 transition-all w-full"
                        >
                          Pagar
                        </button>
                      )}
                      {isMarking && (
                        <div className="bg-emerald-500 text-white w-8 h-8 rounded-full flex items-center justify-center animate-check-pop ml-auto">
                          <Check className="w-5 h-5" />
                        </div>
                      )}
                      {bill.status === BillStatus.PAID && !isMarking && (
                        <div className="text-emerald-500 bg-emerald-50 p-1.5 rounded-lg">
                          <CheckCircle className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <button className="p-2 text-slate-300 hover:text-slate-500 transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredBills.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center text-slate-300 space-y-4">
            <div className="p-6 bg-slate-50 rounded-full">
              <ReceiptText className="w-12 h-12 opacity-20" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest">Nenhuma conta encontrada</p>
          </div>
        )}
      </div>
    </div>
  );
};

const FilterButton: React.FC<{ active: boolean, onClick: () => void, label: string }> = ({ active, onClick, label }) => (
  <button 
    onClick={onClick}
    className={`px-4 py-2 rounded-xl text-[10px] font-black whitespace-nowrap transition-all uppercase tracking-wider flex-shrink-0
      ${active ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'bg-white text-slate-500 border border-slate-200'}`}
  >
    {label}
  </button>
);

export default BillList;
