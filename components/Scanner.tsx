
import React, { useState, useRef } from 'react';
import { Camera, Upload, Loader2, CheckCircle, XCircle, PencilLine, Keyboard, Image as ImageIcon, FileText, FileSearch } from 'lucide-react';
import { processBillDocument } from '../geminiService';
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'pdf' | null>(null);
  const [selectedUnit, setSelectedUnit] = useState(accessibleUnits[0] || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const actualMimeType = file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
    const isPdf = actualMimeType === 'application/pdf';
    
    setFileType(isPdf ? 'pdf' : 'image');
    setLoading(true);
    setError(null);
    setResult(null);
    setIsManual(false);

    if (isPdf) {
      setPreviewUrl(null);
    } else {
      setPreviewUrl(URL.createObjectURL(file));
    }

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          const data = await processBillDocument(base64, actualMimeType);
          
          setResult({
            beneficiary: data.beneficiary || 'Documento Lido',
            amount: data.amount || 0,
            dueDate: data.dueDate || new Date().toISOString().split('T')[0],
            category: data.category || 'Outros'
          });
        } catch (err: any) {
          setError(err.message || 'Erro ao processar o arquivo. Certifique-se que o documento é legível.');
        } finally {
          setLoading(false);
        }
      };
      reader.onerror = () => {
        setError("Erro ao ler arquivo.");
        setLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Erro no seletor de arquivos.');
      setLoading(false);
    }
  };

  const startManualEntry = () => {
    setError(null);
    setPreviewUrl(null);
    setFileType(null);
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
    if (!result.beneficiary || !result.dueDate) {
      alert('Preencha os campos obrigatórios.');
      return;
    }

    onAddBill({
      beneficiary: result.beneficiary,
      amount: Number(result.amount) || 0,
      dueDate: result.dueDate,
      category: result.category,
      companyId: selectedUnit,
      status: BillStatus.PENDING,
      type: BillType.SINGLE
    });
    setResult(null);
    setIsManual(false);
    setPreviewUrl(null);
    setFileType(null);
  };

  return (
    <div className="max-w-md mx-auto space-y-6 animate-fade-in">
      {!result && !isManual ? (
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl text-center animate-scale-in">
          {loading ? (
            <div className="mb-6 h-48 flex flex-col items-center justify-center bg-slate-50 rounded-2xl border-2 border-dashed border-blue-200">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
              <p className="text-sm font-black text-blue-700 uppercase tracking-widest">IA Analisando {fileType?.toUpperCase()}</p>
              <p className="text-[10px] text-slate-400 mt-2 font-bold">Extração Gemini 3 Pro Vision</p>
            </div>
          ) : (
            <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Camera className="w-10 h-10 text-blue-600" />
            </div>
          )}
          
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Novo Lançamento</h2>
          <p className="text-slate-500 mb-8 text-sm px-4 text-balance">Escaneie um boleto ou anexe um arquivo PDF de cobrança.</p>

          <input 
            type="file" 
            accept="image/*,application/pdf" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileUpload}
          />

          <div className="flex flex-col space-y-3">
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center space-x-3 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
              <span>{loading ? 'Processando...' : 'Foto ou PDF'}</span>
            </button>
            
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="py-4 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-2xl font-bold flex items-center justify-center space-x-2 active:scale-95 transition-all"
              >
                <Upload className="w-4 h-4" />
                <span className="text-sm">Arquivos</span>
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
          
          <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-center gap-4">
             <div className="bg-slate-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <FileText className="w-3 h-3 text-red-500" />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-tight">Suporte PDF</span>
             </div>
             <div className="bg-slate-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <ImageIcon className="w-3 h-3 text-blue-500" />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-tight">Suporte Foto</span>
             </div>
          </div>
        </div>
      ) : null}

      {error && (
        <div className="bg-red-50 p-6 rounded-3xl border border-red-100 flex flex-col items-center space-y-4 text-red-700 text-center animate-slide-down">
          <XCircle className="w-10 h-10 text-red-500" />
          <div>
            <p className="font-bold">Falha na Leitura</p>
            <p className="text-xs opacity-90 mt-1">{error}</p>
          </div>
          <button 
            onClick={() => { setError(null); setLoading(false); }}
            className="w-full bg-red-600 text-white py-3 rounded-2xl text-xs font-black uppercase tracking-widest"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {(result || isManual) && (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl animate-slide-up relative overflow-hidden">
          {!isManual && (
             <div className="mb-4 -mx-6 -mt-6 h-32 bg-slate-50 flex flex-col items-center justify-center space-y-1">
               {previewUrl ? (
                 <img src={previewUrl} className="w-full h-full object-cover opacity-60" alt="Preview" />
               ) : (
                 <FileSearch className="w-12 h-12 text-blue-200" />
               )}
               <div className="absolute top-4 left-4 bg-blue-600 px-3 py-1 rounded-full text-[9px] font-black text-white shadow-lg">
                DADOS EXTRAÍDOS PELA IA
              </div>
            </div>
          )}

          <h3 className="text-lg font-bold text-slate-800 mb-6">{isManual ? 'Lançamento Manual' : 'Verificar Lançamento'}</h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">Unidade</label>
              <select 
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none"
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
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">Vencimento</label>
                <input 
                  type="date" 
                  value={result?.dueDate} 
                  onChange={e => updateField('dueDate', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">Valor (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={result?.amount || ''} 
                  onChange={e => updateField('amount', parseFloat(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">Categoria</label>
              <select 
                value={result?.category}
                onChange={(e) => updateField('category', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <button 
              onClick={confirmBill}
              className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-100 flex items-center justify-center space-x-2 mt-4"
            >
              <CheckCircle className="w-5 h-5" />
              <span>Confirmar Lançamento</span>
            </button>
            
            <button 
              onClick={() => { setResult(null); setIsManual(false); setPreviewUrl(null); }}
              className="w-full py-2 text-slate-400 text-[10px] font-black uppercase tracking-widest"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Scanner;
