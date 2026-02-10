
import React, { useState, useRef } from 'react';
import { Camera, Upload, Loader2, CheckCircle, XCircle, PencilLine, Keyboard } from 'lucide-react';
import { processBillImage } from '../geminiService';
import { OCRResult, Bill, BillType, BillStatus } from '../types';
import { CATEGORIES, COMPANIES } from '../constants';

interface ScannerProps {
  onAddBill: (bill: Partial<Bill>) => void;
  accessibleUnits: string[];
}

const Scanner: React.FC<ScannerProps> = ({ onAddBill, accessibleUnits }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [isManual, setIsManual] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState(accessibleUnits[0] || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setIsManual(false);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          const data = await processBillImage(base64);
          if (data.dueDate && data.dueDate.includes('/')) {
            const parts = data.dueDate.split('/');
            if (parts.length === 3) {
              data.dueDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          }
          setResult(data);
        } catch (err: any) {
          setError('Não foi possível ler este boleto. Certifique-se que a imagem está clara e bem iluminada.');
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Erro ao processar imagem.');
      setLoading(false);
    }
  };

  const startManualEntry = () => {
    setError(null);
    setIsManual(true);
    setResult({
      beneficiary: '',
      amount: 0,
      dueDate: new Date().toISOString().split('T')[0],
      category: 'Outros'
    });
  };

  const updateField = (field: keyof OCRResult, value: string | number) => {
    setResult(prev => prev ? { ...prev, [field]: value } : null);
  };

  const confirmBill = () => {
    if (!result) return;
    if (!result.beneficiary || !result.dueDate || !result.amount) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    onAddBill({
      beneficiary: result.beneficiary,
      amount: Number(result.amount),
      dueDate: result.dueDate,
      category: result.category,
      companyId: selectedUnit,
      status: BillStatus.PENDING,
      type: BillType.SINGLE
    });
    setResult(null);
    setIsManual(false);
  };

  return (
    <div className="max-w-md mx-auto space-y-6 animate-fade-in">
      {!result && !isManual ? (
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl text-center animate-scale-in">
          <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6 transition-transform hover:rotate-3">
            <Camera className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Novo Lançamento</h2>
          <p className="text-slate-500 mb-8 text-sm">Escolha como deseja adicionar sua conta ao sistema.</p>

          <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileUpload}
          />

          <div className="flex flex-col space-y-3">
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center space-x-3 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-blue-100"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
              <span>{loading ? 'Analisando com IA...' : 'Capturar com Câmera'}</span>
            </button>
            
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="py-4 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-2xl font-bold flex items-center justify-center space-x-2 active:scale-95 transition-all disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                <span className="text-sm">Galeria</span>
              </button>
              
              <button 
                onClick={startManualEntry}
                disabled={loading}
                className="py-4 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-2xl font-bold flex items-center justify-center space-x-2 active:scale-95 transition-all"
              >
                <Keyboard className="w-4 h-4" />
                <span className="text-sm">Manual</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {error && (
        <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex items-center space-x-3 text-red-700 text-sm animate-slide-down">
          <XCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {(result || isManual) && (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl animate-slide-up relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3">
            {!isManual ? (
              <div className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center space-x-1 animate-fade-in">
                <CheckCircle className="w-3 h-3" />
                <span>EXTRAÇÃO IA</span>
              </div>
            ) : (
              <div className="bg-blue-50 text-blue-600 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center space-x-1 animate-fade-in">
                <PencilLine className="w-3 h-3" />
                <span>MANUAL</span>
              </div>
            )}
          </div>

          <h3 className="text-lg font-bold text-slate-800 mb-6">{isManual ? 'Novo Lançamento' : 'Revisar e Editar'}</h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">Unidade de Destino</label>
              <select 
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 ring-blue-500/20 outline-none transition-all"
              >
                {accessibleUnits.map(id => (
                  <option key={id} value={id}>{COMPANIES.find(c => c.id === id)?.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">Beneficiário</label>
              <input 
                type="text" 
                value={result?.beneficiary} 
                onChange={e => updateField('beneficiary', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 ring-blue-500/20 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">Vencimento</label>
                <input 
                  type="date" 
                  value={result?.dueDate} 
                  onChange={e => updateField('dueDate', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 ring-blue-500/20 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">Valor (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={result?.amount || ''} 
                  onChange={e => updateField('amount', parseFloat(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 ring-blue-500/20 outline-none transition-all"
                />
              </div>
            </div>

            <button 
              onClick={confirmBill}
              className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center space-x-2"
            >
              <CheckCircle className="w-5 h-5" />
              <span>Confirmar Lançamento</span>
            </button>
            
            <button 
              onClick={() => {
                setResult(null);
                setIsManual(false);
              }}
              className="w-full py-2 text-slate-400 text-xs font-semibold hover:text-red-500 transition-colors"
            >
              Cancelar e voltar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Scanner;
