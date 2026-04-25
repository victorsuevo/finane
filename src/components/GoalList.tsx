import React from 'react';
import { motion } from 'motion/react';
import { Target, Calendar, Trash2, PiggyBank } from 'lucide-react';
import { Goal } from '../types';
import { formatCurrency } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  goals: Goal[];
  onAdd: () => void;
  onRefresh: () => void;
}

export default function GoalList({ goals, onAdd, onRefresh }: Props) {
  const { token } = useAuth();

  const handleDelete = async (id: number) => {
    if (!confirm('Deletar esta meta?')) return;
    await fetch(`/api/goals/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    onRefresh();
  };

  return (
    <div className="px-5 space-y-4">
      <div className="flex justify-between items-end">
        <h3 className="font-bold text-sm text-slate-900 tracking-tight">Metas de Economia</h3>
        <span
          onClick={onAdd}
          className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider cursor-pointer hover:text-indigo-700 transition-colors"
        >
          + Nova Meta
        </span>
      </div>

      <div className="space-y-3">
        {goals.length === 0 ? (
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6 text-center">
            <PiggyBank className="w-8 h-8 text-slate-300 mx-auto mb-2" />
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
              className={`group bg-white p-4 rounded-2xl border shadow-sm space-y-3 transition-all ${isComplete ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-100'}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isComplete ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                    <Target size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">{goal.name}</h4>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Meta: {formatCurrency(goal.target_amount)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className={`text-xs font-black ${isComplete ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <button
                    onClick={() => goal.id && handleDelete(goal.id)}
                    className="p-1.5 text-slate-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
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
    </div>
  );
}
