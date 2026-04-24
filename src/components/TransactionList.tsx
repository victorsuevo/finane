import { Transaction } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { TrendingUp, TrendingDown, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  transactions: Transaction[];
  onDelete: (id: number) => void;
}

export default function TransactionList({ transactions, onDelete }: Props) {
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
    <div className="space-y-1 px-4">
      {transactions.map((t) => (
        <div 
          key={t.id} 
          className="group flex items-center justify-between p-3 bg-white hover:bg-slate-50/50 rounded-2xl transition-all border-b border-slate-50 last:border-b-0"
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center text-lg",
              t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'
            )}>
              {t.category === 'Alimentação' ? '🛒' : 
               t.category === 'Transporte' ? '🚗' : 
               t.category === 'Lazer' ? '🎬' : 
               t.category === 'Saúde' ? '💊' : 
               t.category === 'Educação' ? '📚' : 
               t.category === 'Moradia' ? '🏠' : 
               t.category === 'Salário' ? '💰' : '🏷️'}
            </div>
            <div>
              <p className="font-bold text-[13px] text-slate-900 leading-tight">{t.description || t.category}</p>
              <p className="text-[10px] text-slate-400 font-medium tracking-tight">
                {format(parseISO(t.date), "dd 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <p className={cn(
              "font-bold text-sm tracking-tight",
              t.type === 'income' ? 'text-emerald-600' : 'text-slate-900'
            )}>
              {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
            </p>
            <button 
              onClick={() => t.id && onDelete(t.id)}
              className="p-2 text-slate-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
