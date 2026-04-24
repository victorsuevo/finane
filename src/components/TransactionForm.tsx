import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, X } from 'lucide-react';
import { Transaction } from '../types';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  onSuccess: () => void;
  onClose: () => void;
  initialType?: 'income' | 'expense';
}

const INCOME_CATEGORIES = [
  'Salário', 'Investimentos', 'Presente', 'Venda', 'Freelance', 'Outros'
];

const EXPENSE_CATEGORIES = [
  'Alimentação', 'Transporte', 'Lazer', 'Saúde', 'Educação', 'Moradia', 'Mercado', 'Assinaturas', 'Outros'
];

export default function TransactionForm({ onSuccess, onClose, initialType = 'expense' }: Props) {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>(initialType);
  const [category, setCategory] = useState(type === 'income' ? 'Salário' : 'Outros');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          type,
          category,
          description,
          date
        }),
      });

      if (res.ok) {
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Erro ao salvar transação:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
    >
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="bg-white w-full max-w-lg p-8 rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl space-y-8"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Nova Transação</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={24} className="text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="flex p-1.5 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={cn(
                "flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all",
                type === 'expense' ? "bg-white shadow-sm text-rose-600" : "text-slate-500 opacity-60"
              )}
            >
              Saída
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={cn(
                "flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all",
                type === 'income' ? "bg-white shadow-sm text-emerald-600" : "text-slate-500 opacity-60"
              )}
            >
              Entrada
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Valor Total</label>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-300">R$</span>
                <input
                  required
                  autoFocus
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full text-5xl font-black bg-transparent border-none focus:ring-0 text-slate-900 placeholder:text-slate-100 tracking-tighter"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Categoria</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-transparent border-none text-sm font-bold text-slate-900 focus:ring-0 p-0"
                >
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Data</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-transparent border-none text-sm font-bold text-slate-900 focus:ring-0 p-0"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Descrição</label>
              <input
                type="text"
                placeholder="Para o que é este gasto?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-transparent border-none text-sm font-bold text-slate-900 focus:ring-0 p-0"
              />
            </div>
          </div>

          <button
            disabled={loading}
            type="submit"
            className="w-full py-5 bg-slate-900 hover:bg-black text-white rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl transition-all disabled:opacity-50"
          >
            {loading ? 'Processando...' : 'Confirmar Transação'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
