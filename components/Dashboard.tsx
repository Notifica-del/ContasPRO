
import React from 'react';
import { Bill, Company, BillStatus } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, Clock, AlertTriangle, CheckCircle2, ReceiptText, Bell, ChevronRight } from 'lucide-react';

interface DashboardProps {
  bills: Bill[];
  companies: Company[];
  notificationPermission: 'default' | 'granted' | 'denied';
  onRequestNotification: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ bills, companies, notificationPermission, onRequestNotification }) => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  
  const pendingBills = bills.filter(b => b.status === BillStatus.PENDING);
  const overdueBills = bills.filter(b => b.status === BillStatus.PENDING && b.dueDate < todayStr);
  const dueToday = bills.filter(b => b.status === BillStatus.PENDING && b.dueDate === todayStr);
  const paidBills = bills.filter(b => b.status === BillStatus.PAID);

  const pendingAmount = pendingBills.reduce((acc, b) => acc + b.amount, 0);

  const dataByCompany = companies.map(c => {
    const companyBills = bills.filter(b => b.companyId === c.id);
    return {
      name: c.name,
      amount: companyBills.reduce((acc, b) => acc + b.amount, 0),
      color: c.color
    };
  });

  const stats = [
    { label: 'Pendente', value: `R$ ${pendingAmount.toLocaleString()}`, icon: <Clock className="w-5 h-5 text-blue-500" />, sub: `${pendingBills.length} itens`, color: 'blue' },
    { label: 'Atrasado', value: `R$ ${overdueBills.reduce((acc, b) => acc + b.amount, 0).toLocaleString()}`, icon: <AlertTriangle className="w-5 h-5 text-red-500" />, sub: `${overdueBills.length} urgentes`, color: 'red' },
    { label: 'Hoje', value: `R$ ${dueToday.reduce((acc, b) => acc + b.amount, 0).toLocaleString()}`, icon: <TrendingUp className="w-5 h-5 text-amber-500" />, sub: `${dueToday.length} boletos`, color: 'amber' },
    { label: 'Pago', value: `R$ ${paidBills.reduce((acc, b) => acc + b.amount, 0).toLocaleString()}`, icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />, sub: `${paidBills.length} total`, color: 'emerald' },
  ];

  return (
    <div className="space-y-6 animate-fade-in px-1 md:px-0">
      {/* Banner de Permissão de Notificação - Estilo iOS */}
      {notificationPermission === 'default' && (
        <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm flex items-center justify-between animate-slide-down">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-100">
              <Bell className="w-5 h-5 text-white animate-bounce" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-800">Ativar Notificações?</p>
              <p className="text-[10px] text-slate-400 font-medium">Lembretes automáticos de vencimento.</p>
            </div>
          </div>
          <button 
            onClick={onRequestNotification}
            className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-blue-100 transition-colors active:scale-95"
          >
            Configurar
          </button>
        </div>
      )}

      {/* Grid de Stats Compacto para Mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {stats.map((stat, idx) => (
          <div 
            key={idx} 
            className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between active:scale-95 transition-transform animate-slide-up"
            style={{ animationDelay: `${idx * 0.05}s` }}
          >
            <div className="flex justify-between items-start">
              <div className={`p-2 bg-slate-50 rounded-2xl`}>{stat.icon}</div>
              <ChevronRight className="w-3 h-3 text-slate-200" />
            </div>
            <div className="mt-4">
              <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{stat.label}</p>
              <h3 className="text-sm md:text-lg font-black text-slate-900 truncate">{stat.value}</h3>
              <p className="text-[9px] text-slate-400 font-bold mt-0.5">{stat.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-5 md:p-6 rounded-3xl border border-slate-100 shadow-sm animate-scale-in" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm md:text-base font-black text-slate-800 uppercase tracking-tight">Distribuição de Gastos</h3>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span className="text-[10px] text-slate-400 font-bold uppercase">Unidades</span>
            </div>
          </div>
          <div className="h-[220px] md:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataByCompany} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 700 }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.08)', fontSize: '12px' }}
                />
                <Bar dataKey="amount" radius={[8, 8, 0, 0]} barSize={24}>
                  {dataByCompany.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color.replace('bg-', '#').replace('500', '600')} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-scale-in" style={{ animationDelay: '0.3s' }}>
          <h3 className="text-sm md:text-base font-black text-slate-800 uppercase tracking-tight mb-6">Últimos Lançamentos</h3>
          <div className="space-y-4">
            {bills.slice(0, 5).map((bill, i) => (
              <div 
                key={bill.id} 
                className="flex items-center space-x-3 p-3 active:bg-slate-50 rounded-2xl transition-all border border-transparent active:border-slate-100 animate-fade-in"
                style={{ animationDelay: `${0.35 + (i * 0.05)}s` }}
              >
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs text-white ${companies.find(c => c.id === bill.companyId)?.color}`}>
                  {companies.find(c => c.id === bill.companyId)?.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-slate-900 truncate">{bill.beneficiary}</p>
                  <p className="text-[10px] text-slate-400 font-bold">{new Date(bill.dueDate).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-slate-900">R$ {bill.amount.toFixed(2)}</p>
                  <div className={`text-[8px] font-black uppercase tracking-widest ${bill.status === BillStatus.PAID ? 'text-emerald-500' : 'text-blue-500'}`}>
                    {bill.status === BillStatus.PAID ? 'Pago' : 'Aberto'}
                  </div>
                </div>
              </div>
            ))}
            {bills.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <ReceiptText className="w-12 h-12 opacity-10 mb-2" />
                <p className="text-[10px] font-bold uppercase tracking-widest">Nenhuma conta</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
