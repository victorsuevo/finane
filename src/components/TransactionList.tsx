import { useMemo } from 'react';
import { Transaction } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { TrendingUp, TrendingDown, Trash2, Target, CreditCard } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  transactions: Transaction[];
  onDelete: (id: number) => void;
  onEdit?: (t: Transaction) => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  'Alimentação': '🛒',
  'Transporte': '🚗',
  'Lazer': '🎬',
  'Saúde': '💊',
  'Educação': '📚',
  'Moradia': '🏠',
  'Salário': '💰',
  'Investimentos': '📈',
  'Meta': '🎯',
  'Mercado': '🛍️',
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

function getMonthKey(dateStr: string): string {
  const d = parseISO(dateStr);
  return format(d, 'yyyy-MM');
}

function getMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const d = new Date(parseInt(year), parseInt(month) - 1, 1);
  return format(d, "MMMM 'de' yyyy", { locale: ptBR });
}

export default function TransactionList({ transactions, onDelete, onEdit }: Props) {
  // Group transactions by month
  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of transactions) {
      const key = getMonthKey(t.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    // Sort months descending
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [transactions]);

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
      {grouped.map(([monthKey, monthTx]) => {
        const income = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const expense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        const balance = income - expense;

        return (
          <div key={monthKey} className="space-y-2">
            {/* Month header */}
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <h4 className="font-black text-xs text-slate-500 uppercase tracking-widest capitalize">
                {getMonthLabel(monthKey)}
              </h4>
              <div className="flex items-center gap-3 text-[10px] font-bold">
                <span className="text-emerald-600">+{formatCurrency(income)}</span>
                <span className="text-rose-500">-{formatCurrency(expense)}</span>
                <span className={cn(
                  "px-2 py-0.5 rounded-full",
                  balance >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                )}>
                  {balance >= 0 ? '+' : ''}{formatCurrency(balance)}
                </span>
              </div>
            </div>

            {/* Transactions */}
            <div className="space-y-1">
              {monthTx.map((t) => {
                const isInstallment = t.installments && t.installments > 1;
                const isGoalContrib = t.goal_id != null;

                return (
                  <div
                    key={t.id}
                    className="group flex items-center justify-between p-3 bg-white hover:bg-slate-50/50 rounded-2xl transition-all border border-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0",
                        isGoalContrib
                          ? 'bg-indigo-50 text-indigo-600'
                          : t.type === 'income'
                            ? 'bg-emerald-50'
                            : 'bg-slate-100'
                      )}>
                        {isGoalContrib ? <Target size={18} className="text-indigo-500" /> : getCategoryIcon(t.category)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[13px] text-slate-900 leading-tight truncate max-w-[160px]">
                          {t.description || t.category}
                        </p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-[10px] text-slate-400 font-medium tracking-tight">
                            {format(parseISO(t.date), "dd 'de' MMM", { locale: ptBR })}
                          </p>
                          {isInstallment && (
                            <span className="flex items-center gap-0.5 text-[9px] font-bold text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded-full">
                              <CreditCard size={8} />
                              {t.installment_num}/{t.installments}×
                            </span>
                          )}
                          {isGoalContrib && (
                            <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-full">
                              Meta
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className={cn(
                        "font-bold text-sm tracking-tight whitespace-nowrap",
                        t.type === 'income' ? 'text-emerald-600' : isGoalContrib ? 'text-indigo-600' : 'text-slate-900'
                      )}>
                        {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                      </p>
                      <button
                        onClick={() => t.id && onDelete(t.id)}
                        className="p-2 text-slate-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        title={t.installments && t.installments > 1 && !t.installment_ref ? 'Deletar todas as parcelas' : 'Deletar'}
                      >
                        <Trash2 size={16} />
                      </button>
                      {onEdit && <button onClick={() => onEdit(t)} className="p-2 text-slate-200 hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg></button>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
