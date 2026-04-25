import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, Calendar, ArrowRight } from 'lucide-react';
import { Transaction } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  onSelectTransaction: (date: string) => void;
}

export default function HistoryModal({ isOpen, onClose, transactions, onSelectTransaction }: Props) {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return transactions.slice(0, 50); // Show last 50 by default
    const term = searchTerm.toLowerCase();
    return transactions.filter(t => 
      t.description?.toLowerCase().includes(term) || 
      t.category.toLowerCase().includes(term) ||
      t.amount.toString().includes(term)
    );
  }, [transactions, searchTerm]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 40 }}
            className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
          >
            {/* Header */}
            <div className="p-6 pb-4 border-b border-slate-50">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Histórico Global</h2>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  autoFocus
                  type="text"
                  placeholder="Buscar por descrição, categoria ou valor..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-300"
                />
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filtered.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-slate-400 font-medium">Nenhum registro encontrado.</p>
                </div>
              ) : (
                filtered.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      onSelectTransaction(t.date);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 rounded-[1.5rem] transition-all group border border-transparent hover:border-slate-100"
                  >
                    <div className="flex items-center gap-3 text-left">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center text-lg",
                        t.type === 'income' ? 'bg-emerald-50' : 'bg-rose-50'
                      )}>
                        <Calendar size={18} className={t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'} />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-900 leading-tight">
                          {t.description || t.category}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          {format(parseISO(t.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <p className={cn(
                        "font-black text-sm",
                        t.type === 'income' ? 'text-emerald-600' : 'text-slate-900'
                      )}>
                        {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                      </p>
                      <ArrowRight size={14} className="text-slate-200 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="p-4 bg-slate-50 text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Clique em um registro para pular para o mês correspondente
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
