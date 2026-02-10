
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
import { Key } from 'lucide-react';

// Proper global declaration for aistudio to avoid TS2339 and handle potential environment conflicts
declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
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
  useEffect(() => {
    const checkKey = async () => {
      const aistudio = window.aistudio;
      if (aistudio) {
        try {
          const selected = await aistudio.hasSelectedApiKey();
          setHasApiKey(selected);
        } catch (e) {
          console.debug("Erro ao verificar chave:", e);
          setHasApiKey(false);
        }
      } else {
        // If aistudio is not present, assume key is provided via standard process.env (e.g., local dev)
        setHasApiKey(true);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    const aistudio = window.aistudio;
    if (aistudio) {
      try {
        await aistudio.openSelectKey();
        // Mandatory: Assume successful selection and proceed to avoid race condition
        setHasApiKey(true); 
      } catch (e) {
        console.error("Erro ao abrir seletor de chave:", e);
      }
    }
  };

  // App initialization logic
  useEffect(() => {
    // Only proceed if key state is resolved and positive
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
        console.error("Erro crítico na inicialização:", err);
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
            title: 'Lembrete de Vencimento - ContasPro',
            body: `O boleto "${bill.beneficiary}" de R$ ${bill.amount.toFixed(2)} vence amanhã!`
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

  // Logic to handle "Requested entity was not found" error globally if needed
  // For now, it's handled via the UI in Scanner/Assistant, but we could add a window listener here

  // Blocking screen if API Key is not yet selected in an environment that requires it
  if (hasApiKey === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-sm w-full bg-white p-8 rounded-3xl shadow-xl border border-slate-100 text-center animate-scale-in">
          <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Key className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Configuração da IA</h2>
          <p className="text-slate-500 text-sm mb-8 leading-relaxed">
            Para habilitar o scanner de boletos e o assistente financeiro, selecione uma chave de API válida de um projeto faturado.
          </p>
          
          <button 
            onClick={handleSelectKey}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 active:scale-95 transition-all flex items-center justify-center space-x-2"
          >
            <span>Configurar API Key</span>
          </button>
          
          <p className="mt-6 text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed px-4">
            Saiba mais em <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-blue-500 underline">ai.google.dev/billing</a>
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (!isLoaded || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-[10px] mt-4 font-black uppercase tracking-[0.2em]">Carregando ContasPro...</p>
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
