
import React, { useState, useEffect, useCallback } from 'react';
import { Bill, User, UserRole, BillStatus, BillType } from './types';
import { COMPANIES, INITIAL_USERS } from './constants';
import { storage } from './storage';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import BillList from './components/BillList';
import Scanner from './components/Scanner';
import AdminPanel from './components/AdminPanel';
import Assistant from './components/Assistant';
import { Key, Sparkles, AlertCircle } from 'lucide-react';

// Declaration to satisfy TypeScript compiler for environmental global objects
// Fix: Use the correct AIStudio type as expected by the environment to avoid conflicting declarations
// We define the AIStudio interface locally as well to ensure it is recognized during compilation if not already global
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio: AIStudio;
  }
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [bills, setBills] = useState<Bill[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<'default' | 'granted' | 'denied'>('default');

  // Check if API key is already selected on mount
  const checkKeyStatus = useCallback(async () => {
    if (window.aistudio) {
      try {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      } catch (e) {
        console.debug("Failed to check key status:", e);
        setHasApiKey(false);
      }
    } else {
      // Local dev or non-restricted environment
      setHasApiKey(true);
    }
  }, []);

  useEffect(() => {
    checkKeyStatus();

    // Listener for when the service encounters an "Entity not found" error
    const handleKeyError = () => {
      setHasApiKey(false);
      // Automatically attempt to re-open selection if possible
      window.aistudio?.openSelectKey().then(() => setHasApiKey(true));
    };

    window.addEventListener('AISTUDIO_API_KEY_ERROR', handleKeyError);
    return () => window.removeEventListener('AISTUDIO_API_KEY_ERROR', handleKeyError);
  }, [checkKeyStatus]);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        // Mandatory: Assume success to avoid race condition delays
        setHasApiKey(true); 
      } catch (e) {
        console.error("Error opening key selector:", e);
      }
    }
  };

  // App initialization logic
  useEffect(() => {
    if (hasApiKey !== true) return;

    const initApp = () => {
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

        if (savedCurrent && savedCurrent.id) {
          setCurrentUser(savedCurrent);
        } else {
          const admin = INITIAL_USERS[0];
          setCurrentUser(admin);
          storage.setCurrentUser(admin);
        }

        if (typeof window !== 'undefined' && 'Notification' in window) {
          setNotificationPermission(Notification.permission as any);
        }
      } catch (err) {
        console.error("Critical error during initialization:", err);
        setCurrentUser(INITIAL_USERS[0]);
      } finally {
        setIsLoaded(true);
      }
    };

    initApp();
  }, [hasApiKey]);

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
            title: 'Lembrete: Vencimento Amanhã',
            body: `A conta "${bill.beneficiary}" de R$ ${bill.amount.toFixed(2)} vence em 24h.`
          }
        });
        storage.markNotificationAsSent(bill.id);
      }
    });
  }, [bills]);

  useEffect(() => {
    if (isLoaded) {
      checkUpcomingBills();
      const interval = setInterval(checkUpcomingBills, 1000 * 60 * 60);
      return () => clearInterval(interval);
    }
  }, [isLoaded, checkUpcomingBills]);

  useEffect(() => {
    if (isLoaded && currentUser) {
      storage.setBills(bills);
      storage.setUsers(users);
      storage.setCurrentUser(currentUser);
    }
  }, [bills, users, isLoaded, currentUser]);

  const addBill = (billData: Partial<Bill>) => {
    const newBill: Bill = {
      id: Math.random().toString(36).substr(2, 9),
      beneficiary: billData.beneficiary || 'Desconhecido',
      amount: billData.amount || 0,
      dueDate: billData.dueDate || new Date().toISOString().split('T')[0],
      category: billData.category || 'Outros',
      status: BillStatus.PENDING,
      companyId: billData.companyId || COMPANIES[0].id,
      type: billData.type || BillType.SINGLE,
      createdAt: new Date().toISOString()
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
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission as any);
  };

  // Blocking key selection screen
  if (hasApiKey === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-blue-100/50 border border-slate-100 text-center animate-scale-in relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600" />
          
          <div className="w-24 h-24 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner relative">
             <Key className="w-12 h-12 text-blue-600" />
             <div className="absolute -top-2 -right-2 bg-indigo-600 text-white p-1.5 rounded-lg shadow-lg">
                <Sparkles className="w-4 h-4" />
             </div>
          </div>

          <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Potencialize com IA</h2>
          <p className="text-slate-500 text-base mb-10 leading-relaxed px-2">
            O ContasPro utiliza os modelos mais avançados da Google para automatizar sua gestão financeira. Selecione sua chave de API para começar.
          </p>
          
          <div className="space-y-4">
            <button 
              onClick={handleSelectKey}
              className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-200 active:scale-[0.98] transition-all flex items-center justify-center space-x-3 group"
            >
              <span>Configurar Agora</span>
              <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            </button>

            <div className="flex items-center justify-center space-x-2 text-slate-400">
               <AlertCircle className="w-4 h-4" />
               <span className="text-[11px] font-bold uppercase tracking-wider">Requer faturamento ativo</span>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-slate-50">
             <p className="text-xs text-slate-400 font-medium">
               Dúvidas sobre o faturamento? <br />
               <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-blue-500 font-bold underline hover:text-blue-600">Consulte o guia oficial</a>
             </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoaded || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-[5px] border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-[10px] mt-6 font-black uppercase tracking-[0.3em] animate-pulse">Sincronizando ContasPro</p>
        </div>
      </div>
    );
  }

  const renderTab = () => {
    const filteredBills = bills.filter(b => currentUser.accessibleUnits.includes(b.companyId));
    
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            bills={filteredBills} 
            companies={COMPANIES.filter(c => currentUser.accessibleUnits.includes(c.id))} 
            notificationPermission={notificationPermission}
            onRequestNotification={requestNotificationPermission}
          />
        );
      case 'bills':
        return <BillList bills={bills} onStatusChange={updateBillStatus} accessibleUnits={currentUser.accessibleUnits} />;
      case 'scanner':
        return <Scanner onAddBill={addBill} accessibleUnits={currentUser.accessibleUnits} />;
      case 'assistant':
        return <Assistant bills={filteredBills} />;
      case 'admin':
        return currentUser.role === UserRole.ADMIN ? <AdminPanel users={users} onUpdateUserPermissions={updatePermissions} /> : null;
      default:
        return null;
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
