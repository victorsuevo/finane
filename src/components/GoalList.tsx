import React from 'react';
import { motion } from 'framer-motion';
import { Target, Calendar, Trash2, PiggyBank } from 'lucide-react';
import { Goal } from '../types';
import { formatCurrency } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import ConfirmModal from './ConfirmModal';
import { useState } from 'react';

interface Props {
  goals: Goal[];
  onAdd: () => void;
  onRefresh: () => void;
  onEdit: (goal: Goal) => void;
}

export default function GoalList({ goals, onAdd, onRefresh, onEdit }: Props) {
  const { token } = useAuth();
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const handleDelete = async () => {
    if (!deleteId) return;
    await fetch(`/api/goals/${deleteId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    setDeleteId(null);
    onRefresh();
  };

  return (
    <div className="px-5 space-y-4">
      <div className="flex justify-between items-end">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white tracking-tight">Metas de Economia</h3>
        <span
          onClick={onAdd}
          className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider cursor-pointer hover:text-indigo-700 transition-colors"
        >
          + Nova Meta
        </span>
      </div>

      <div className="space-y-3">
        {goals.length === 0 ? (
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center">
            <PiggyBank className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Sem metas ativas</p>
            <p className="text-[11px] text-slate-500">Defina um objetivo para começar a poupar.</p>
          </div>
        ) : goals.map((goal) => {
          const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
          const remaining = goal.target_amount - goal.current_amount;
          const isComplete = remaining <= 0;

          return (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`group bg-white dark:bg-slate-800 p-4 rounded-2xl border shadow-sm space-y-3 transition-all ${isComplete ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/20' : 'border-slate-100 dark:border-slate-700'}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isComplete ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600' : 'bg-rose-50 dark:bg-rose-950 text-rose-600'}`}>
                    <Target size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">{goal.name}</h4>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Meta: {formatCurrency(goal.target_amount)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className={`text-xs font-black ${isComplete ? 'text-emerald-600' : 'text-slate-900 dark:text-slate-300'}`}>
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <div className="flex transition-opacity">
                    <button
                      onClick={() => onEdit(goal)}
                      className="p-1.5 text-slate-300 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                    </button>
                    <button
                      onClick={() => goal.id && setDeleteId(goal.id)}
                      className="p-1.5 text-slate-300 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={`h-full rounded-full ${isComplete ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                  />
                </div>

                <div className="flex justify-between items-center">
                  <div className="text-[9px] font-bold uppercase tracking-widest">
                    {isComplete ? (
                      <span className="text-emerald-600">🎉 Meta atingida!</span>
                    ) : (
                      <span className="text-slate-400">
                        Guardado: {formatCurrency(goal.current_amount)} · Faltam {formatCurrency(remaining)}
                      </span>
                    )}
                  </div>
                  {goal.deadline && (
                    <div className="flex items-center gap-1 text-[9px] font-bold text-indigo-600">
                      <Calendar size={10} />
                      <span>{goal.deadline}</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Remover Meta?"
        message="Tem certeza que deseja excluir esta meta? Isso não excluirá as transações que você já realizou para ela."
      />
    </div>
  );
}
