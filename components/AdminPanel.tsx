
import React, { useRef } from 'react';
import { User, Company } from '../types';
import { UserCheck, Shield, Download, Upload, AlertCircle, Database, Trash2 } from 'lucide-react';
import { COMPANIES } from '../constants';
import { storage } from '../storage';

interface AdminPanelProps {
  users: User[];
  onUpdateUserPermissions: (userId: string, accessibleUnits: string[]) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ users, onUpdateUserPermissions }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleUnit = (user: User, unitId: string) => {
    let newUnits: string[];
    if (user.accessibleUnits.includes(unitId)) {
      newUnits = user.accessibleUnits.filter(id => id !== unitId);
    } else {
      newUnits = [...user.accessibleUnits, unitId];
    }
    onUpdateUserPermissions(user.id, newUnits);
  };

  const handleExport = () => {
    const data = storage.exportFullBackup();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `contaspro-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (confirm('Atenção: Importar dados irá substituir todas as contas e usuários atuais. Deseja continuar?')) {
          storage.importFullBackup(json);
          alert('Dados importados com sucesso! O aplicativo será reiniciado.');
          window.location.reload();
        }
      } catch (err) {
        alert('Erro ao ler arquivo de backup. Certifique-se que o arquivo é um JSON válido do ContasPro.');
      }
    };
    reader.readAsText(file);
  };

  const clearDatabase = () => {
    if (confirm('TEM CERTEZA? Isso apagará TODAS as contas cadastradas permanentemente.')) {
      storage.setBills([]);
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-3xl text-white shadow-lg animate-scale-in">
        <div className="flex items-center space-x-3 mb-2">
          <Shield className="w-6 h-6 text-blue-400" />
          <h2 className="text-xl font-bold">Painel Administrativo</h2>
        </div>
        <p className="text-slate-400 text-sm">Gerencie o acesso dos usuários e a manutenção dos dados.</p>
      </div>

      {/* Gestão de Usuários */}
      <div className="space-y-4">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Usuários e Permissões</h3>
        {users.map((user, idx) => (
          <div 
            key={user.id} 
            className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm animate-slide-up"
            style={{ animationDelay: `${idx * 0.1}s` }}
          >
            <div className="flex items-center space-x-4 mb-6">
              <img src={user.avatar} className="w-12 h-12 rounded-full border-2 border-slate-50" alt={user.name} />
              <div>
                <h3 className="font-bold text-slate-900">{user.name}</h3>
                <p className="text-xs text-slate-500">{user.email} • {user.role}</p>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-3">Acesso às Unidades</label>
              <div className="grid grid-cols-2 gap-2">
                {COMPANIES.map(company => {
                  const hasAccess = user.accessibleUnits.includes(company.id);
                  return (
                    <button
                      key={company.id}
                      onClick={() => toggleUnit(user, company.id)}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all active:scale-95 ${
                        hasAccess 
                          ? 'border-blue-100 bg-blue-50/50 text-blue-900 shadow-sm' 
                          : 'border-slate-50 bg-slate-50/50 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${company.color} ${!hasAccess && 'grayscale opacity-30'}`} />
                        <span className="text-xs font-bold truncate">{company.name}</span>
                      </div>
                      {hasAccess && <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Manutenção de Dados */}
      <div className="space-y-4 pt-4">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Dados e Manutenção</h3>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center shrink-0">
              <Database className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Backup do Sistema</h4>
              <p className="text-xs text-slate-500 mt-1">Exporte seus dados para salvá-los externamente ou migrar de aparelho.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={handleExport}
              className="flex items-center justify-center space-x-2 py-3 bg-slate-900 text-white rounded-2xl text-xs font-bold active:scale-95 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Exportar JSON</span>
            </button>
            
            <input 
              type="file" 
              accept=".json" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleImport}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center space-x-2 py-3 bg-white border-2 border-slate-900 text-slate-900 rounded-2xl text-xs font-bold active:scale-95 transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>Importar JSON</span>
            </button>
          </div>

          <div className="pt-4 border-t border-slate-50">
            <div className="bg-red-50 p-4 rounded-2xl flex flex-col space-y-3">
              <div className="flex items-center space-x-2 text-red-700">
                <AlertCircle className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-tight">Zona de Perigo</span>
              </div>
              <button 
                onClick={clearDatabase}
                className="w-full py-3 bg-white border border-red-200 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all flex items-center justify-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Limpar Todas as Contas</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
