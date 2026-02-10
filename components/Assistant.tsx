
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Loader2, Bot, User as UserIcon } from 'lucide-react';
import { chatWithFinancialAssistant } from '../geminiService';
import { Bill } from '../types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AssistantProps {
  bills: Bill[];
}

const Assistant: React.FC<AssistantProps> = ({ bills }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Olá! Sou seu assistente ContasPro IA. Como posso ajudar com suas finanças hoje?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const response = await chatWithFinancialAssistant(userMsg, bills);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Desculpe, tive um problema técnico para acessar seus dados agora." }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    "Quanto devo pagar este mês?",
    "Quais contas estão vencidas?",
    "Resumo por categoria"
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] max-w-2xl mx-auto bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden animate-scale-in">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 flex items-center space-x-3 text-white">
        <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-bold text-sm">Consultoria IA</h2>
          <p className="text-[10px] opacity-80 uppercase tracking-widest font-bold">Online e analisando dados</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            <div className={`flex items-start space-x-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-blue-100' : 'bg-indigo-100'}`}>
                {msg.role === 'user' ? <UserIcon className="w-4 h-4 text-blue-600" /> : <Bot className="w-4 h-4 text-indigo-600" />}
              </div>
              <div className={`p-3 rounded-2xl text-sm ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-slate-100 text-slate-800 rounded-tl-none'
              }`}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start animate-pulse">
            <div className="bg-slate-50 p-3 rounded-2xl flex items-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              <span className="text-xs text-slate-400 font-medium">Analisando suas contas...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="p-4 bg-slate-50 border-t border-slate-100">
        <div className="flex space-x-2 overflow-x-auto pb-3 scrollbar-hide">
          {suggestions.map((s, i) => (
            <button 
              key={i}
              onClick={() => setInput(s)}
              className="whitespace-nowrap px-3 py-1.5 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-600 hover:border-blue-300 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
        <div className="relative">
          <input 
            type="text" 
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleSend()}
            placeholder="Pergunte sobre seus gastos..."
            className="w-full bg-white border border-slate-200 rounded-2xl pl-4 pr-12 py-3 text-sm focus:ring-2 ring-blue-500/20 outline-none transition-all"
          />
          <button 
            onClick={handleSend}
            disabled={loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center active:scale-90 transition-transform disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Assistant;
