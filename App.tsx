
import React, { useState, useEffect, useCallback } from 'react';
import { Bill, User, UserRole, BillStatus, BillType } from './types';
import { COMPANIES, INITIAL_USERS } from './constants';
import { storage } from './storage';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import BillList from './components/BillList';
import Scanner from './components/Scanner';
import AdminPanel from './components/AdminPanel';
import { Bell, Info, CheckCircle, ShieldAlert } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [bills, setBills] = useState<Bill[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<'default' | 'granted' | 'denied'>('default');

  // Initialize data
  useEffect(() => {
    try {
      const savedBills = storage.getBills();
      const savedUsers = storage.getUsers();
      const savedCurrent = storage.getCurrentUser();

      if (savedUsers && savedUsers.length > 0) {
        setUsers(savedUsers);
      } else {
        setUsers(INITIAL_USERS);
        storage.setUsers(INITIAL_USERS);
      }

      if (savedBills && savedBills.length > 0) {
        setBills(savedBills);
      }

      if (savedCurrent) {
        setCurrentUser(savedCurrent);
      } else {
        const admin = INITIAL_USERS.find(u => u.role === UserRole.ADMIN);
        if (admin) {
          setCurrentUser(admin);
          storage.setCurrentUser(admin);
        }
      }

      if (typeof window !== 'undefined' && 'Notification' in window) {
        setNotificationPermission(Notification.permission as any);
      }
    } catch (err) {
      console.error("Erro na inicialização:", err);
    }

    // Artificial delay for smoother loading feeling
    const timer = setTimeout(() => setIsLoaded(true), 600);
    return () => clearTimeout(timer);
  }, []);

  // Check for upcoming bills (24h reminder)
  const checkUpcomingBills = useCallback(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted' || bills.length === 0) return;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const sentLog = storage.getSentNotifications();

    const upcoming = bills.filter(b => 
      b.status === BillStatus.PENDING && 
      b.dueDate === tomorrowStr &&
      !sentLog.includes(b.id)
    );

    upcoming.forEach(bill => {
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          payload: {
            title: 'Lembrete de Vencimento - ContasPro',
            body: `O boleto "${bill.beneficiary}" de R$ ${bill.amount.toFixed(2)} vence amanhã!`
          }
        });
        storage.markNotificationAsSent(bill.id);
      } else {
        new Notification('Lembrete de Vencimento', {
          body: `A conta "${bill.beneficiary}" vence amanhã.`
        });
        storage.markNotificationAsSent(bill.id);
      }
    });
  }, [bills]);

  useEffect(() => {
    if (isLoaded) {
      checkUpcomingBills();
      const interval = setInterval(checkUpcomingBills, 1000 * 60 * 15);
      return () => clearInterval(interval);
    }
  }, [isLoaded, checkUpcomingBills]);

  useEffect(() => {
    if (isLoaded) {
      storage.setBills(bills);
      storage.setUsers(users);
      if (currentUser) {
        const updated = users.find(u => u.id === currentUser.id);
        if (updated) {
          setCurrentUser(updated);
          storage.setCurrentUser(updated);
        }
      }
    }
  }, [bills, users, isLoaded, currentUser]);

  const addBill = (billData: Partial<Bill>) => {
    const newBill: Bill = {
      id: Math.random().toString(36).substr(2, 9),
      beneficiary: billData.beneficiary || 'Desconhecido',
      amount: billData.amount || 0,
      dueDate: billData.dueDate || new Date().toISOString().split('T')[0],
      category: billData.category || 'Outros',
      status: billData.status || BillStatus.PENDING,
      companyId: billData.companyId || COMPANIES[0].id,
      type: billData.type || BillType.SINGLE,
      createdAt: new Date().toISOString(),
      ...billData
    } as Bill;
    setBills(prev => [newBill, ...prev]);
    setActiveTab('bills');
  };

  const updateBillStatus = (id: string, status: BillStatus) => {
    setBills(prev => prev.map(b => b.id === id ? { ...b, status } : b));
  };

  const updatePermissions = (userId: string, units: string[]) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, accessibleUnits: units } : u));
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('Seu navegador não suporta notificações nativas.');
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission as any);
    
    if (permission === 'granted') {
      alert('Notificações ativadas! Agora você receberá alertas de vencimento.');
      checkUpcomingBills();
    }
  };

  if (!isLoaded || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center">
          <div className="relative w-16 h-16 mb-6">
            <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent animate-pulse">
            ContasPro
          </h2>
          <p className="text-slate-400 text-sm mt-2">Sincronizando ambiente...</p>
        </div>
      </div>
    );
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            bills={bills.filter(b => currentUser.accessibleUnits.includes(b.companyId))} 
            companies={COMPANIES.filter(c => currentUser.accessibleUnits.includes(c.id))} 
            notificationPermission={notificationPermission}
            onRequestNotification={requestNotificationPermission}
          />
        );
      case 'bills':
        return <BillList bills={bills} onStatusChange={updateBillStatus} accessibleUnits={currentUser.accessibleUnits} />;
      case 'scanner':
        return <Scanner onAddBill={addBill} accessibleUnits={currentUser.accessibleUnits} />;
      case 'admin':
        return currentUser.role === UserRole.ADMIN ? <AdminPanel users={users} onUpdateUserPermissions={updatePermissions} /> : null;
      case 'notifications':
        return (
          <div className="max-w-md mx-auto space-y-6">
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl text-center animate-scale-in">
               <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                 <Bell className="w-8 h-8 text-blue-600" />
               </div>
               <h2 className="text-xl font-bold text-slate-800 mb-2">Monitoramento de Contas</h2>
               <p className="text-slate-500 text-sm mb-6">Receba avisos automáticos 24h antes do vencimento para evitar juros e multas.</p>
               
               {notificationPermission === 'granted' ? (
                 <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex items-center justify-center space-x-3 mb-6 animate-fade-in">
                   <CheckCircle className="text-emerald-600 w-5 h-5" />
                   <span className="text-emerald-700 font-bold text-sm">Alertas Configurados</span>
                 </div>
               ) : notificationPermission === 'denied' ? (
                 <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex flex-col items-center p-6 space-y-2 mb-6 animate-fade-in">
                   <ShieldAlert className="text-red-600 w-6 h-6" />
                   <span className="text-red-700 font-bold text-sm">Acesso Bloqueado</span>
                   <p className="text-[10px] text-red-500">Libere as notificações nas configurações do navegador para continuar.</p>
                 </div>
               ) : (
                 <button 
                   onClick={requestNotificationPermission}
                   className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-all mb-6"
                 >
                   Ativar Notificações
                 </button>
               )}
            </div>
            
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-lg animate-slide-up" style={{ animationDelay: '0.1s' }}>
               <h3 className="font-bold text-slate-800 mb-4 flex items-center space-x-2">
                 <Info className="w-4 h-4 text-blue-500" />
                 <span>Próximos Lembretes</span>
               </h3>
               <div className="space-y-3">
                 {bills.filter(b => b.status === BillStatus.PENDING).slice(0, 5).map((b, i) => (
                   <div key={b.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between animate-fade-in" style={{ animationDelay: `${0.1 + (i * 0.05)}s` }}>
                     <div className="min-w-0">
                       <p className="text-xs font-bold text-slate-900 truncate">{b.beneficiary}</p>
                       <p className="text-[10px] text-slate-500">Vence em {new Date(b.dueDate).toLocaleDateString()}</p>
                     </div>
                     <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${storage.getSentNotifications().includes(b.id) ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                       {storage.getSentNotifications().includes(b.id) ? 'Enviado' : 'Agendado'}
                     </span>
                   </div>
                 ))}
                 {bills.filter(b => b.status === BillStatus.PENDING).length === 0 && (
                   <div className="text-center py-6">
                      <p className="text-xs text-slate-400">Sem agendamentos futuros.</p>
                   </div>
                 )}
               </div>
            </div>
          </div>
        );
      default:
        return <Dashboard bills={bills} companies={COMPANIES} notificationPermission={notificationPermission} onRequestNotification={requestNotificationPermission} />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} user={currentUser}>
      <div key={activeTab} className="tab-content-enter">
        {renderTab()}
      </div>
    </Layout>
  );
};

export default App;
