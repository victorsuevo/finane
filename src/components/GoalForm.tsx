import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, X, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Goal } from '../types';

interface Props {
  onSuccess: () => void;
  onClose: () => void;
  editGoal?: Goal | null;
}

export default function GoalForm({ onSuccess, onClose, editGoal }: Props) {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    if (editGoal) {
      setName(editGoal.name);
      setTargetAmount(editGoal.target_amount.toString());
      setDeadline(editGoal.deadline || '');
    }
  }, [editGoal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editGoal ? `/api/goals/${editGoal.id}` : '/api/goals';
      const method = editGoal ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          target_amount: parseFloat(targetAmount),
          deadline: deadline || null
        }),
      });

      if (res.ok) {
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Erro ao salvar meta:', error);
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
        className="bg-white dark:bg-slate-800 w-full max-w-lg p-8 rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl space-y-8"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {editGoal ? 'Editar Meta' : 'Nova Meta'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X size={24} className="text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Nome da Meta</label>
            <input
              required
              autoFocus
              type="text"
              placeholder="Ex: Viagem, Carro Novo..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-transparent border-none text-lg font-bold text-slate-900 dark:text-white focus:ring-0 p-0"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Valor Alvo</label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-400">R$</span>
                <input
                  required
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className="w-full bg-transparent border-none text-lg font-bold text-slate-900 dark:text-white focus:ring-0 p-0"
                />
              </div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Prazo (Opcional)</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full bg-transparent border-none text-sm font-bold text-slate-900 dark:text-white focus:ring-0 p-0 [color-scheme:light_dark]"
              />
            </div>
          </div>

          <button
            disabled={loading}
            type="submit"
            className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 transition-all disabled:opacity-50"
          >
            {loading ? 'Salvando...' : (editGoal ? 'Salvar Alterações' : 'Criar Meta')}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
