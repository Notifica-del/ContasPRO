
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

    const isPdf = file.type === 'application/pdf';
    setFileType(isPdf ? 'pdf' : 'image');
    
    // Preview local imediato
    if (isPdf) {
      setPreviewUrl(null); // Não mostramos preview de PDF nativamente aqui por simplicidade
    } else {
      const localPreview = URL.createObjectURL(file);
      setPreviewUrl(localPreview);
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
          const data = await processBillDocument(base64, file.type);
          
          // Normalização de data DD/MM/YYYY para YYYY-MM-DD
          if (data.dueDate && data.dueDate.includes('/')) {
            const parts = data.dueDate.split('/');
            if (parts.length === 3) {
              if (parts[0].length === 4) {
                data.dueDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
              } else {
                data.dueDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
              }
            }
          }
          
          if (!data.beneficiary && !data.amount) {
            throw new Error("Não foi possível identificar dados básicos no arquivo. Tente um arquivo mais legível.");
          }

          setResult({
            beneficiary: data.beneficiary || '',
            amount: data.amount || 0,
            dueDate: data.dueDate || new Date().toISOString().split('T')[0],
            category: data.category || 'Outros'
          });
        } catch (err: any) {
          setError(err.message || 'Erro ao ler o documento. Certifique-se que o arquivo não está protegido por senha.');
          console.error("Erro OCR:", err);
        } finally {
          setLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Erro ao processar arquivo no navegador.');
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
      alert('Por favor, preencha o beneficiário e a data de vencimento.');
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
            <div className="mb-6 relative h-48 flex flex-col items-center justify-center bg-slate-50 rounded-2xl overflow-hidden">
              {previewUrl ? (
                <img src={previewUrl} className="absolute inset-0 w-full h-full object-cover opacity-20 grayscale" alt="Preview" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center opacity-10">
                   <FileText className="w-32 h-32 text-slate-900" />
                </div>
              )}
              <div className="relative z-10 flex flex-col items-center">
                 <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" />
                 <p className="text-xs font-black text-blue-600 uppercase tracking-widest">IA Analisando {fileType === 'pdf' ? 'PDF' : 'Imagem'}...</p>
                 <p className="text-[10px] text-slate-400 mt-1 font-bold">Extraindo valores e vencimentos</p>
              </div>
            </div>
          ) : (
            <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6 transition-transform hover:rotate-3 shadow-inner">
              <Camera className="w-10 h-10 text-blue-600" />
            </div>
          )}
          
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Novo Lançamento</h2>
          <p className="text-slate-500 mb-8 text-sm px-4">Capture uma foto do boleto ou selecione um arquivo PDF.</p>

          <input 
            type="file" 
            accept="image/*,application/pdf" 
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
              <span>{loading ? 'Processando...' : 'Foto ou PDF'}</span>
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
          
          <p className="mt-6 text-[10px] font-bold text-slate-300 uppercase tracking-widest flex items-center justify-center gap-2">
            <CheckCircle className="w-3 h-3" /> Suporta Boletos, Faturas e Recibos
          </p>
        </div>
      ) : null}

      {error && (
        <div className="bg-red-50 p-6 rounded-3xl border border-red-100 flex flex-col items-center space-y-3 text-red-700 text-center animate-slide-down shadow-sm">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <XCircle className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <p className="font-bold text-sm">Problema no Processamento</p>
            <p className="text-xs opacity-80 mt-1 max-w-[200px] mx-auto">{error}</p>
          </div>
          <button 
            onClick={() => { setError(null); setPreviewUrl(null); setFileType(null); }}
            className="mt-2 bg-red-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md shadow-red-100"
          >
            Tentar de novo
          </button>
        </div>
      )}

      {(result || isManual) && (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl animate-slide-up relative overflow-hidden">
          {previewUrl && !isManual && (
            <div className="mb-4 -mx-6 -mt-6 h-32 relative group">
              <img src={previewUrl} className="w-full h-full object-cover" alt="Boleto Scaneado" />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent"></div>
              <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-[10px] font-black text-slate-800 shadow-sm flex items-center gap-1">
                <ImageIcon className="w-3 h-3" />
                IMAGEM CAPTURADA
              </div>
            </div>
          )}

          {!previewUrl && fileType === 'pdf' && !isManual && (
            <div className="mb-4 -mx-6 -mt-6 h-32 bg-slate-50 flex flex-col items-center justify-center space-y-1 relative">
               <FileText className="w-10 h-10 text-slate-300" />
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Documento PDF Lido</p>
               <div className="absolute top-4 left-4 bg-blue-600 px-2 py-1 rounded-lg text-[10px] font-black text-white shadow-sm flex items-center gap-1">
                <FileSearch className="w-3 h-3" />
                PDF ANALISADO
              </div>
            </div>
          )}

          <div className="absolute top-0 right-0 p-3 pt-4 pr-4">
            {!isManual ? (
              <div className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center space-x-1 animate-fade-in shadow-sm border border-emerald-100">
                <CheckCircle className="w-3 h-3" />
                <span>EXTRAÇÃO IA</span>
              </div>
            ) : (
              <div className="bg-blue-50 text-blue-600 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center space-x-1 animate-fade-in shadow-sm border border-blue-100">
                <PencilLine className="w-3 h-3" />
                <span>MANUAL</span>
              </div>
            )}
          </div>

          <h3 className="text-lg font-bold text-slate-800 mb-6 mt-2">{isManual ? 'Novo Lançamento' : 'Revisar Dados Extraídos'}</h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">Unidade de Destino</label>
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
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">Beneficiário / Empresa</label>
              <input 
                type="text" 
                placeholder="Ex: Companhia de Energia"
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
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">Valor Total (R$)</label>
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
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">Categoria de Custo</label>
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
              className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center space-x-2 mt-4"
            >
              <CheckCircle className="w-5 h-5" />
              <span>Confirmar e Salvar</span>
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
              Descartar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Scanner;
