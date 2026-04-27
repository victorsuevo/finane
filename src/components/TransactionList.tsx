import { useMemo, useState } from 'react';
import { Transaction } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { TrendingUp, TrendingDown, Trash2, Target, CreditCard, LayoutList, LayoutGrid } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  transactions: Transaction[];
  onDelete: (t: Transaction) => void;
  onEdit?: (t: Transaction) => void;
  totalIncome: number;
}

const CATEGORY_ICONS: Record<string, string> = {
  'Alimentação': '🍽️',
  'Transporte': '🚗',
  'Lazer': '🎬',
  'Saúde': '💊',
  'Educação': '📚',
  'Moradia': '🏠',
  'Salário': '💰',
  'Investimentos': '📈',
  'Meta': '🎯',
  'Mercado': '🛒',
  'Assinaturas': '📱',
  'Freelance': '💼',
  'Presente': '🎁',
  'Venda': '🏷️',
  'Despesas Pessoais': '👔',
  'Seguros': '🛡️',
};

function getCategoryIcon(category: string): string {
  return CATEGORY_ICONS[category] || '🏷️';
}

export default function TransactionList({ transactions, onDelete, onEdit, totalIncome }: Props) {
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [groupBy, setGroupBy] = useState<'date' | 'category'>('date');

  const filteredTransactions = useMemo(() => {
    if (filter === 'all') return transactions;
    return transactions.filter(t => t.type === filter);
  }, [transactions, filter]);

  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    
    if (groupBy === 'date') {
      for (const t of filteredTransactions) {
        const d = parseISO(t.date);
        const key = format(d, 'yyyy-MM');
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(t);
      }
    } else {
      for (const t of filteredTransactions) {
        const key = t.category;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(t);
      }
    }

    return Array.from(map.entries()).sort((a, b) => {
      if (groupBy === 'date') return b[0].localeCompare(a[0]);
      return a[0].localeCompare(b[0]);
    });
  }, [filteredTransactions, groupBy]);

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 px-6">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
          <TrendingUp size={24} />
        </div>
        <p className="text-slate-400 text-sm font-medium">Nenhuma transação encontrada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4">
      {/* Filtros e Controles */}
      <div className="flex flex-col gap-4 sticky top-16 bg-slate-50/90 dark:bg-black/90 backdrop-blur-md py-2 z-30">
        <div className="flex p-1 bg-slate-200/50 dark:bg-slate-800/50 rounded-xl">
          <button onClick={() => setFilter('all')} className={cn("flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all", filter === 'all' ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-400")}>Todos</button>
          <button onClick={() => setFilter('income')} className={cn("flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all", filter === 'income' ? "bg-emerald-500 text-white shadow-sm" : "text-slate-400")}>Entradas</button>
          <button onClick={() => setFilter('expense')} className={cn("flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all", filter === 'expense' ? "bg-rose-500 text-white shadow-sm" : "text-slate-400")}>Saídas</button>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl">
            <button 
              onClick={() => setGroupBy('date')} 
              className={cn("px-3 py-1.5 rounded-lg flex items-center gap-2 text-[10px] font-black uppercase tracking-tighter transition-all", groupBy === 'date' ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200")}
            >
              <LayoutList size={12} /> Data
            </button>
            <button 
              onClick={() => setGroupBy('category')} 
              className={cn("px-3 py-1.5 rounded-lg flex items-center gap-2 text-[10px] font-black uppercase tracking-tighter transition-all", groupBy === 'category' ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200")}
            >
              <LayoutGrid size={12} /> Categoria
            </button>
          </div>
          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{filteredTransactions.length} itens</span>
        </div>
      </div>

      <div className="space-y-6">
        {grouped.map(([key, items]) => {
          const total = items.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
          
          let label = key;
          if (groupBy === 'date') {
            const [year, month] = key.split('-');
            const d = new Date(parseInt(year), parseInt(month) - 1, 1);
            label = format(d, "MMMM 'de' yyyy", { locale: ptBR });
          }

          return (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest capitalize">
                    {label}
                  </h4>
                  {groupBy === 'category' && totalIncome > 0 && total < 0 && (
                    <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 px-1.5 py-0.5 rounded-full">
                      {(Math.abs(total) / totalIncome * 100).toFixed(1)}%
                    </span>
                  )}
                </div>
                <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-full", total >= 0 ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600" : "bg-rose-50 dark:bg-rose-950/30 text-rose-600")}>
                  {total >= 0 ? '+' : ''}{formatCurrency(total)}
                </span>
              </div>

              <div className="space-y-1">
                {items.map((t) => {
                  const isInstallment = t.installments && t.installments > 1;
                  const isGoalContrib = t.goal_id != null;

                  return (
                    <div key={t.id} className="group flex items-center justify-between p-3 bg-white dark:bg-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 rounded-2xl transition-all border border-slate-50 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0", isGoalContrib ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600' : t.type === 'income' ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-slate-100 dark:bg-slate-900/50')}>
                          {isGoalContrib ? <Target size={18} className="text-indigo-500" /> : t.type === 'income' ? '💰' : getCategoryIcon(t.category)}
                        </div>
                        <div className="min-w-0 relative group/desc">
                          <p 
                            className="font-bold text-[13px] text-slate-900 dark:text-white leading-tight truncate max-w-[160px]"
                          >
                            {(t.description || t.category).replace(/\s*\(\d+\/\d+\)\s*$/, '')}
                          </p>
                          {(t.description || t.category).length > 20 && (
                            <div className="absolute bottom-full left-0 mb-2 hidden group-hover/desc:block z-50 pointer-events-none">
                              <div className="bg-slate-900 dark:bg-slate-800 text-white text-[10px] font-medium py-1.5 px-3 rounded-lg shadow-xl border border-slate-700/50 whitespace-nowrap">
                                {t.description || t.category}
                              </div>
                              <div className="w-2 h-2 bg-slate-900 dark:bg-slate-800 border-b border-r border-slate-700/50 rotate-45 -mt-1 ml-4" />
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-[10px] text-slate-400 font-medium tracking-tight">
                              {format(parseISO(t.date), "dd 'de' MMM", { locale: ptBR })}
                            </p>
                            {isInstallment && (
                              <span className="flex items-center gap-0.5 text-[9px] font-bold text-purple-500 bg-purple-50 dark:bg-purple-950/30 px-1.5 py-0.5 rounded-full">
                                <CreditCard size={8} />
                                {t.installment_num}/{t.installments}×
                              </span>
                            )}
                            {isGoalContrib && (
                              <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 px-1.5 py-0.5 rounded-full">Meta</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end gap-1">
                          <span className={cn("text-xs font-black tracking-tighter", t.type === 'income' ? "text-emerald-600" : "text-rose-600")}>
                            {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                          </span>
                          {t.type === 'expense' && totalIncome > 0 && (
                            <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 px-1 rounded">
                              {((t.amount / totalIncome) * 100).toFixed(1)}%
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => onDelete(t)} className="p-2 text-slate-300 dark:text-slate-500 hover:text-red-500 dark:hover:text-rose-400 transition-colors">
                            <Trash2 size={16} />
                          </button>
                          {onEdit && (
                            <button onClick={() => onEdit(t)} className="p-2 text-slate-300 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil">
                                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
