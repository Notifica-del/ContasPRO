
import React from 'react';
import { NAV_ITEMS } from '../constants';
import { User, UserRole } from '../types';
import { Plus } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: User;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, user }) => {
  // Filtramos os itens de navegação para mobile para separar o scanner como FAB
  const mobileNavItems = NAV_ITEMS.filter(item => item.id !== 'scanner');
  
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-24 md:pb-0 md:pl-64">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-200 z-50">
        <div className="p-6 border-bottom">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            ContasPro
          </h1>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            if (item.adminOnly && user.role !== UserRole.ADMIN) return null;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all active:scale-95 ${
                  isActive 
                    ? 'bg-blue-50 text-blue-600 font-semibold' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center space-x-3 p-2 bg-slate-50 rounded-xl">
            <img src={user.avatar} className="w-10 h-10 rounded-full border border-white" alt={user.name} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
              <p className="text-[10px] text-slate-500 truncate uppercase font-bold">{user.role}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Header - Mobile */}
      <header className="md:hidden sticky top-0 glass-morphism border-b border-slate-200 z-40 safe-top">
        <div className="px-5 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">ContasPro</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Gestão Inteligente</p>
          </div>
          <div className="flex items-center space-x-3">
             <div className="text-right hidden sm:block">
               <p className="text-xs font-bold text-slate-900">{user.name}</p>
               <p className="text-[9px] text-slate-400 font-bold uppercase">{user.role}</p>
             </div>
             <img src={user.avatar} className="w-9 h-9 rounded-full ring-2 ring-blue-500/10 border border-white shadow-sm" alt={user.name} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>

      {/* Navigation - Mobile (Enhanced with FAB) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-morphism border-t border-slate-200 safe-bottom z-50">
        <div className="relative flex justify-around items-center px-2 pt-2 pb-1">
          
          {/* Botão Flutuante Central (Scanner/Novo) */}
          <div className="absolute -top-7 left-1/2 -translate-x-1/2">
            <button
              onClick={() => setActiveTab('scanner')}
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-90 ${
                activeTab === 'scanner' 
                  ? 'bg-indigo-700 text-white fab-pulse' 
                  : 'bg-blue-600 text-white shadow-blue-200'
              }`}
            >
              <Plus className={`w-7 h-7 transition-transform duration-300 ${activeTab === 'scanner' ? 'rotate-45' : ''}`} />
            </button>
          </div>

          {mobileNavItems.map((item, index) => {
            if (item.adminOnly && user.role !== UserRole.ADMIN) return <div key={item.id} className="min-w-[64px]" />;
            const isActive = activeTab === item.id;
            
            // Adicionamos um espaçador no meio para o FAB
            const isCenterGap = index === 2;

            return (
              <React.Fragment key={item.id}>
                {isCenterGap && <div className="w-16" />}
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`flex flex-col items-center justify-center min-w-[64px] py-1 transition-all active:scale-95 ${
                    isActive ? 'text-blue-600' : 'text-slate-400'
                  }`}
                >
                  <div className={`p-1.5 rounded-xl transition-colors ${isActive ? 'bg-blue-50/50' : ''}`}>
                    {/* Fix: use React.ReactElement<any> to allow the injection of the 'className' property during cloneElement */}
                    {React.cloneElement(item.icon as React.ReactElement<any>, { 
                      className: `w-6 h-6 transition-transform ${isActive ? 'scale-110' : 'scale-100'}` 
                    })}
                  </div>
                  <span className={`text-[9px] font-bold mt-1 uppercase tracking-tighter ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                    {item.label}
                  </span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default Layout;
