import React from 'react';
import { motion } from 'motion/react';
import { Target, TrendingUp, Calendar } from 'lucide-react';
import { Goal } from '../types';
import { formatCurrency } from '../lib/utils';

interface Props {
  goals: Goal[];
  onAdd: () => void;
}

export default function GoalList({ goals, onAdd }: Props) {
  return (
    <div className="px-5 space-y-4">
      <div className="flex justify-between items-end">
        <h3 className="font-bold text-sm text-slate-900 tracking-tight">Metas de Economia</h3>
        <span 
          onClick={onAdd}
          className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider cursor-pointer hover:text-indigo-700 transition-colors"
        >
          Nova Meta
        </span>
      </div>
      
      <div className="space-y-3">
        {goals.length === 0 ? (
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6 text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Sem metas ativas</p>
            <p className="text-[11px] text-slate-500">Defina um objetivo para começar a poupar.</p>
          </div>
        ) : goals.map((goal) => {
          const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
          
          return (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                    <Target size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">{goal.name}</h4>
                    <p className="text-[10px] text-slate-400 font-medium">Meta: {formatCurrency(goal.target_amount)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-slate-900">{Math.round(progress)}%</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-indigo-600 rounded-full"
                  />
                </div>
                <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest">
                  <span className="text-slate-400">Restam {formatCurrency(goal.target_amount - goal.current_amount)}</span>
                  {goal.deadline && (
                    <div className="flex items-center gap-1 text-indigo-600">
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
