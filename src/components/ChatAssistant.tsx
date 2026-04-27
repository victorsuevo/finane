import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, User, Loader2, Check } from 'lucide-react';
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
  const scrollRef = useRef<HTMLDivElement>(null);

  // Efeito para capturar transações detectadas via Notificação em modo Manual
  useEffect(() => {
    const checkPending = () => {
      const pending = localStorage.getItem('suevo_pending_msg');
      if (pending) {
        try {
          const { text, txData, timestamp } = JSON.parse(pending);
          // Só processa se for recente (últimos 5 minutos)
          if (Date.now() - timestamp < 5 * 60 * 1000) {
            let cleanText = text;
            let transactionData = txData;

            // Limpeza extra se o texto ainda tiver o marcador
            const match = cleanText.match(/\[TRANSACTION_DATA:(.*?)\]/);
            if (match) {
              cleanText = cleanText.replace(/\[TRANSACTION_DATA:.*?\]/, '').trim();
            }

            setMessages(prev => [...prev, { 
              role: 'assistant', 
              text: cleanText, 
              transactionData: transactionData 
            }]);
            setIsOpen(true); // Abre o chat para o usuário ver
          }
        } catch (e) {
          console.error("Erro ao recuperar mensagem pendente:", e);
        }
        localStorage.removeItem('suevo_pending_msg');
      }
    };

    checkPending();
    window.addEventListener('suevo_pending_tx', checkPending);
    return () => window.removeEventListener('suevo_pending_tx', checkPending);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    const response = await chatWithAssistant(userMsg, messages, transactions, goals, user?.name);
    
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
      
      // Ação de Deletar TUDO
      if (data.action === 'delete_all') {
        const res = await fetch(getApiUrl("/api/transactions"), {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          setMessages(prev => prev.map((m, i) => i === msgIndex ? { ...m, transactionData: null, text: m.text + "\n\n✅ **Todas as transações foram removidas com sucesso!**" } : m));
          if (onRefresh) onRefresh();
        } else {
          setMessages(prev => prev.map((m, i) => i === msgIndex ? { ...m, transactionData: null, text: m.text + "\n\n❌ **Erro ao tentar remover as transações.**" } : m));
        }
        return;
      }

      // Ação de Deletar ESPECÍFICA (via ID ou is_refund search)
      if (data.action === 'delete' || data.is_refund) {
        let targetId = data.id;

        if (!targetId) {
          // Busca manual se não tiver ID (legado/fallback)
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
          targetId = target?.id;
        }

        if (targetId) {
          await fetch(getApiUrl(`/api/transactions/${targetId}`), {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
          });
          const successMsg = data.is_refund ? "Estorno realizado: Gasto original removido!" : "Transação removida com sucesso!";
          setMessages(prev => prev.map((m, i) => i === msgIndex ? { ...m, transactionData: null, text: m.text + `\n\n✅ **${successMsg}**` } : m));
          if (onRefresh) onRefresh();
        } else {
          setMessages(prev => prev.map((m, i) => i === msgIndex ? { ...m, transactionData: null, text: m.text + "\n\n❌ **Nenhuma transação correspondente encontrada.**" } : m));
        }
        return;
      }

      // Inclusão de Transação (Padrão)
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
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
              <form onSubmit={handleSend} className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Pergunte ao SUEVO..."
                  className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2 text-xs font-bold border-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
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
