import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { Transaction } from '../types';
import { chatWithAssistant } from '../services/geminiService';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

interface Message {
  role: 'assistant' | 'user';
  text: string;
}

interface Props {
  transactions: Transaction[];
}

export default function ChatAssistant({ transactions }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: 'Oi! Eu sou o assistente do Finane. Como posso te ajudar com suas finanças hoje?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { logout } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);

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

    const response = await chatWithAssistant(userMsg, transactions);
    
    if (typeof response === 'object' && 'error' in response) {
      const isExpired = response.error?.toLowerCase().includes("expira") || 
                        response.details?.toLowerCase().includes("expira");

      if (isExpired) {
        setMessages(prev => [...prev, { role: 'assistant', text: "Sua sessão expirou. Por favor, faça login novamente." }]);
        setTimeout(logout, 3000);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', text: `Erro: ${response.details || response.error}` }]);
      }
    } else {
      setMessages(prev => [...prev, { role: 'assistant', text: response || 'Desculpe, não consegui processar isso.' }]);
    }
    setLoading(false);
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
            className="fixed bottom-24 left-6 right-6 sm:left-auto sm:right-auto sm:w-[400px] bg-white rounded-3xl shadow-2xl z-[60] overflow-hidden flex flex-col border border-slate-100 h-[500px]"
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
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex gap-2 max-w-[85%]", msg.role === 'user' ? "ml-auto flex-row-reverse" : "")}>
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1",
                    msg.role === 'assistant' ? "bg-indigo-100 text-indigo-600" : "bg-slate-200 text-slate-600"
                  )}>
                    {msg.role === 'assistant' ? <Bot size={14} /> : <User size={14} />}
                  </div>
                  <div className={cn(
                    "p-3 rounded-2xl text-[11px] leading-relaxed shadow-sm",
                    msg.role === 'assistant' ? "bg-white text-slate-800" : "bg-indigo-600 text-white"
                  )}>
                    {msg.text}
                  </div>
                </div>
              ))}
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
            <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-100 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pergunte algo ao Finane..."
                className="flex-1 bg-slate-100 rounded-xl px-4 py-2 text-xs font-bold border-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-300"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center transition-opacity disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
