
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

    const actualMimeType = file.type;
    const isPdf = actualMimeType === 'application/pdf';
    setFileType(isPdf ? 'pdf' : 'image');
    
    if (isPdf) {
      setPreviewUrl(null);
    } else {
      setPreviewUrl(URL.createObjectURL(file));
    }
    
    setLoading(true);
    setError(null);
    setResult(null);
    setIsManual(false);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          // Passamos o MIME type real detectado pelo navegador
          const data = await processBillDocument(base64, actualMimeType || (isPdf ? 'application/pdf' : 'image/jpeg'));
          
          setResult({
            beneficiary: data.beneficiary || 'Documento Lido',
            amount: data.amount || 0,
            dueDate: data.dueDate || new Date().toISOString().split('T')[0],
            category: data.category || 'Outros'
          });
        } catch (err: any) {
          setError(err.message || 'Erro ao processar o arquivo. Tente novamente com uma imagem mais nítida ou PDF original.');
          console.error("Scanner Error:", err);
        } finally {
          setLoading(false);
        }
      };
      reader.onerror = () => {
        setError("Erro ao ler o arquivo localmente.");
        setLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Falha inesperada no seletor de arquivos.');
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
      alert('Por favor, verifique o beneficiário e a data.');
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
            <div className="mb-6 relative h-48 flex flex-col items-center justify-center bg-slate-50 rounded-2xl overflow-hidden border-2 border-dashed border-blue-100">
              {previewUrl && (
                <img src={previewUrl} className="absolute inset-0 w-full h-full object-cover opacity-10 grayscale" alt="Preview" />
              )}
              <div className="relative z-10 flex flex-col items-center">
                 <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                 <p className="text-sm font-black text-blue-700 uppercase tracking-widest">Processando {fileType?.toUpperCase()}...</p>
                 <p className="text-[10px] text-slate-400 mt-2 font-bold px-6">Extraindo dados com Gemini 3 Pro Vision</p>
              </div>
            </div>
          ) : (
            <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6 transition-transform hover:rotate-3 shadow-inner">
              <Camera className="w-10 h-10 text-blue-600" />
            </div>
          )}
          
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Novo Lançamento</h2>
          <p className="text-slate-500 mb-8 text-sm px-4">Tire uma foto nítida ou anexe o arquivo PDF original da fatura.</p>

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
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center space-x-3 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-blue-100"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
              <span>{loading ? 'Analisando documento...' : 'Foto ou PDF'}</span>
            </button>
            
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="py-4 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-2xl font-bold flex items-center justify-center space-x-2 active:scale-95 transition-all disabled:opacity-50"
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
          
          <div className="mt-8 flex items-center justify-center gap-4">
            <div className="flex flex-col items-center">
              <div className="p-2 bg-emerald-50 rounded-lg mb-1"><CheckCircle className="w-4 h-4 text-emerald-600" /></div>
              <span className="text-[8px] font-bold text-slate-400">BOLETOS</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="p-2 bg-emerald-50 rounded-lg mb-1"><CheckCircle className="w-4 h-4 text-emerald-600" /></div>
              <span className="text-[8px] font-bold text-slate-400">FATURAS</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="p-2 bg-emerald-50 rounded-lg mb-1"><CheckCircle className="w-4 h-4 text-emerald-600" /></div>
              <span className="text-[8px] font-bold text-slate-400">PDFs</span>
            </div>
          </div>
        </div>
      ) : null}

      {error && (
        <div className="bg-red-50 p-6 rounded-3xl border border-red-100 flex flex-col items-center space-y-4 text-red-700 text-center animate-slide-down shadow-md">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <p className="font-bold text-base">Falha na Leitura</p>
            <p className="text-xs opacity-90 mt-2 max-w-[240px] leading-relaxed">{error}</p>
          </div>
          <button 
            onClick={() => { setError(null); setPreviewUrl(null); setFileType(null); }}
            className="w-full bg-red-600 text-white py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-red-200 active:scale-95 transition-all"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {(result || isManual) && (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl animate-slide-up relative overflow-hidden">
          {previewUrl && !isManual && (
            <div className="mb-4 -mx-6 -mt-6 h-32 relative group">
              <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent"></div>
              <div className="absolute top-4 left-4 bg-white/95 backdrop-blur px-2 py-1 rounded-lg text-[9px] font-black text-slate-800 shadow-sm flex items-center gap-1 border border-slate-100">
                <ImageIcon className="w-3 h-3 text-blue-600" />
                DOC CAPTURADO
              </div>
            </div>
          )}

          {!previewUrl && fileType === 'pdf' && !isManual && (
            <div className="mb-4 -mx-6 -mt-6 h-32 bg-slate-50 flex flex-col items-center justify-center space-y-1 relative">
               <FileText className="w-12 h-12 text-blue-200" />
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Documento PDF Carregado</p>
               <div className="absolute top-4 left-4 bg-blue-600 px-2 py-1 rounded-lg text-[9px] font-black text-white shadow-sm flex items-center gap-1">
                <FileSearch className="w-3 h-3" />
                OCR ATIVO
              </div>
            </div>
          )}

          <div className="absolute top-0 right-0 p-3 pt-4 pr-4">
            {!isManual ? (
              <div className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center space-x-1 animate-fade-in shadow-sm border border-emerald-100">
                <CheckCircle className="w-3 h-3" />
                <span>IA PRO-3</span>
              </div>
            ) : (
              <div className="bg-blue-50 text-blue-600 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center space-x-1 animate-fade-in shadow-sm border border-blue-100">
                <PencilLine className="w-3 h-3" />
                <span>MANUAL</span>
              </div>
            )}
          </div>

          <h3 className="text-lg font-bold text-slate-800 mb-6 mt-2">{isManual ? 'Novo Lançamento' : 'Revisar Dados'}</h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">Unidade</label>
              <select 
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 ring-blue-500/20 outline-none transition-all"
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
                placeholder="Nome do fornecedor"
                value={result?.beneficiary} 
                onChange={e => updateField('beneficiary', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 ring-blue-500/20 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">Vencimento</label>
                <input 
                  type="date" 
                  value={result?.dueDate} 
                  onChange={e => updateField('dueDate', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 ring-blue-500/20 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">Valor (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  placeholder="0,00"
                  value={result?.amount || ''} 
                  onChange={e => updateField('amount', parseFloat(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-900 focus:ring-2 ring-blue-500/20 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">Categoria</label>
              <select 
                value={result?.category}
                onChange={(e) => updateField('category', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 ring-blue-500/20 outline-none transition-all"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <button 
              onClick={confirmBill}
              className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-100 active:scale-95 transition-all flex items-center justify-center space-x-2 mt-4"
            >
              <CheckCircle className="w-5 h-5" />
              <span>Confirmar Lançamento</span>
            </button>
            
            <button 
              onClick={() => {
                setResult(null);
                setIsManual(false);
                setPreviewUrl(null);
                setFileType(null);
              }}
              className="w-full py-2 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-red-500 transition-colors"
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
