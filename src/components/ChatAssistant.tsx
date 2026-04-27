import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, User, Loader2, Paperclip, FileText, Image as ImageIcon, Check } from 'lucide-react';
import { Transaction, Goal } from '../types';
import { chatWithAssistant } from '../services/geminiService';
import { cn } from '../lib/utils';
import { getApiUrl } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface Message {
  role: 'assistant' | 'user';
  text: string;
  transactionData?: any; // Dados para o botão de confirmação
}

interface Props {
  transactions: Transaction[];
  goals?: Goal[];
  onRefresh?: () => void;
}

export default function ChatAssistant({ transactions, goals = [], onRefresh }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  
  useEffect(() => {
    if (user && messages.length === 0) {
      setMessages([
        { role: 'assistant', text: `Oi, ${user.name}! Eu sou o assistente SUEVO. Como posso te ajudar com suas finanças hoje?` }
      ]);
    }
  }, [user]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ data: string, mimeType: string, name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedFile) || loading) return;

    const userMsg = input.trim();
    const currentFile = selectedFile;
    
    setInput('');
    setSelectedFile(null);
    setMessages(prev => [...prev, { role: 'user', text: userMsg || (currentFile ? `[Arquivo: ${currentFile.name}]` : '') }]);
    setLoading(true);

    const fileToSend = currentFile ? { data: currentFile.data, mimeType: currentFile.mimeType } : undefined;
    const response = await chatWithAssistant(userMsg || "Analise este arquivo", messages, transactions, goals, user?.name, fileToSend);
    
    if (typeof response === 'object' && 'error' in response) {
      // ... erro handling ...
      const isExpired = response.error?.toLowerCase().includes("expira") || 
                        response.details?.toLowerCase().includes("expira");

      if (isExpired) {
        setMessages(prev => [...prev, { role: 'assistant', text: "Sua sessão expirou. Por favor, faça login novamente." }]);
        setTimeout(logout, 3000);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', text: `Erro: ${response.details || response.error}` }]);
      }
    } else {
      let cleanText = response || 'Desculpe, não consegui processar isso.';
      let txData = null;

      // Detectar o marcador [TRANSACTION_DATA:...]
      const match = cleanText.match(/\[TRANSACTION_DATA:(.*?)\]/);
      if (match) {
        try {
          txData = JSON.parse(match[1]);
          cleanText = cleanText.replace(/\[TRANSACTION_DATA:.*?\]/, '').trim();
        } catch (e) {
          console.error("Erro ao parsear dados da transação:", e);
        }
      }

      const newMsg: Message = { 
        role: 'assistant', 
        text: cleanText,
        transactionData: txData
      };

      setMessages(prev => [...prev, newMsg]);

      // Se auto-lançamento estiver ativado, disparar agora de forma segura fora do setter
      const isAuto = localStorage.getItem('suevo_auto_register') === 'true';
      if (txData && isAuto) {
        setTimeout(() => handleConfirmTransaction(txData, messages.length + 1), 100);
      }
    }
    setLoading(false);
  };

  const handleConfirmTransaction = async (data: any, msgIndex: number) => {
    try {
      const token = localStorage.getItem("finane_token")?.replace(/^"(.*)"$/, '$1');
      
      if (data.is_refund) {
        // Lógica de Estorno via Chat
        const resList = await fetch(getApiUrl("/api/transactions"), {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const transactions = await resList.json();
        const target = transactions.find((t: any) => 
          t.amount === data.amount && 
          t.type === 'expense' &&
          (t.description.toLowerCase().includes(data.description.toLowerCase()) || 
           data.description.toLowerCase().includes(t.description.toLowerCase()))
        );

        if (target) {
          await fetch(getApiUrl(`/api/transactions/${target.id}`), {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
          });
          setMessages(prev => prev.map((m, i) => i === msgIndex ? { ...m, transactionData: null, text: m.text + "\n\n✅ **Estorno realizado: Gasto original removido!**" } : m));
          if (onRefresh) onRefresh();
        } else {
          setMessages(prev => prev.map((m, i) => i === msgIndex ? { ...m, transactionData: null, text: m.text + "\n\n❌ **Nenhuma transação correspondente encontrada para estornar.**" } : m));
        }
        return;
      }

      const res = await fetch(getApiUrl("/api/transactions"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          ...data,
          date: new Date().toISOString().split('T')[0] // Data de hoje
        })
      });

      if (res.ok) {
        setMessages(prev => prev.map((m, i) => i === msgIndex ? { ...m, transactionData: null, text: m.text + "\n\n✅ **Lançamento registrado com sucesso!**" } : m));
        if (onRefresh) onRefresh();
      }
    } catch (error) {
      console.error("Erro ao processar:", error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      setSelectedFile({
        data: base64String,
        mimeType: file.type,
        name: file.name
      });
      // Reseta o valor do input para permitir selecionar o mesmo arquivo novamente
      if (e.target) e.target.value = '';
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      {/* Trigger Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 left-8 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-2xl z-50 flex items-center justify-center transition-colors border-4 border-white"
      >
        <MessageCircle size={24} />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-24 left-6 right-6 sm:left-auto sm:right-auto sm:w-[400px] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl z-[60] overflow-hidden flex flex-col border border-slate-100 dark:border-slate-800 h-[500px]"
          >
            {/* Header */}
            <div className="p-4 bg-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot size={20} />
                <span className="font-bold text-sm">Assistente SUEVO</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Messages Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
              {(messages || []).map((msg, i) => {
                if (!msg || !msg.text) return null;
                
                return (
                  <div key={i} className={cn("flex gap-2 max-w-[85%]", msg.role === 'user' ? "ml-auto flex-row-reverse" : "")}>
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1",
                      msg.role === 'assistant' ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    )}>
                      {msg.role === 'assistant' ? <Bot size={14} /> : <User size={14} />}
                    </div>
                    <div className={cn(
                      "p-3 rounded-2xl text-[11px] leading-relaxed shadow-sm prose prose-sm max-w-none prose-p:my-0 prose-strong:font-bold prose-headings:text-sm prose-headings:my-1",
                      msg.role === 'assistant' ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 prose-slate dark:prose-invert" : "bg-indigo-600 text-white prose-invert"
                    )}>
                      <ReactMarkdown>{String(msg.text || "")}</ReactMarkdown>
                      
                      {msg.transactionData && (
                        <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700 not-prose">
                          <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Confirmar Lançamento?</p>
                          <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {msg.transactionData.description || 'Nova Transação'}
                                {msg.transactionData.installments > 1 && ` (${msg.transactionData.installments}x)`}
                              </p>
                              <p className="text-[10px] text-indigo-600 font-bold">
                                {((msg.transactionData.amount) ? Number(msg.transactionData.amount) : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </p>
                            </div>
                            <button 
                              onClick={() => handleConfirmTransaction(msg.transactionData, i)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1 flex-shrink-0"
                            >
                              <Check size={12} /> Confirmar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {loading && (
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center animate-pulse">
                    <Bot size={14} />
                  </div>
                  <div className="p-3 rounded-2xl bg-white shadow-sm flex items-center gap-2">
                    <Loader2 size={12} className="animate-spin text-indigo-600" />
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Pensando...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 space-y-2">
              {selectedFile && (
                <div className="flex items-center gap-2 p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl border border-indigo-100 dark:border-indigo-800 animate-in fade-in slide-in-from-bottom-2">
                  <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center">
                    {selectedFile.mimeType.startsWith('image/') ? <ImageIcon size={14} /> : <FileText size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-indigo-900 dark:text-indigo-200 truncate">{selectedFile.name}</p>
                    <p className="text-[8px] text-indigo-400 dark:text-indigo-400 uppercase tracking-widest">{selectedFile.mimeType}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedFile(null)}
                    className="p-1 hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded-lg text-indigo-600 dark:text-indigo-400"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              
              <form onSubmit={handleSend} className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*,application/pdf"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-10 h-10 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <Paperclip size={18} />
                </button>
                
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Pergunte ou envie um arquivo..."
                  className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2 text-xs font-bold border-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
                <button
                  type="submit"
                  disabled={(!input.trim() && !selectedFile) || loading}
                  className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center transition-opacity disabled:opacity-50"
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
