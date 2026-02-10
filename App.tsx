
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

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [bills, setBills] = useState<Bill[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<'default' | 'granted' | 'denied'>('default');

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

    const timer = setTimeout(() => setIsLoaded(true), 600);
    return () => clearTimeout(timer);
  }, []);

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

  if (!isLoaded || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm mt-4 font-bold uppercase tracking-widest">ContasPro</p>
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
