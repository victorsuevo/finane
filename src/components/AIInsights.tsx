import { useEffect, useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Transaction, Goal } from '../types';
import { getFinancialInsights } from '../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  transactions: Transaction[];
  goals?: Goal[];
}

export default function AIInsights({ transactions, goals = [] }: Props) {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    const text = await getFinancialInsights(transactions, goals);
    setInsight(text || null);
    setLoading(false);
  };

  useEffect(() => {
    if (transactions.length > 0 && !insight) {
      generate();
    }
  }, [transactions]);

  return (
    <div className="mx-5 p-4 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <Sparkles size={16} className="text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Insights IA</p>
            <button 
              onClick={generate}
              disabled={loading}
              className="text-[10px] bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded-full transition-colors disabled:opacity-50 font-bold"
            >
              {loading ? '...' : 'ATUALIZAR'}
            </button>
          </div>
          
          <div className="text-[11px] leading-snug font-medium">
            {loading ? (
              <div className="space-y-1.5 py-1">
                <div className="h-2 bg-white/20 rounded-full animate-pulse w-full" />
                <div className="h-2 bg-white/20 rounded-full animate-pulse w-[90%]" />
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={insight}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {insight || 'Adicione transações para ver seus insights personalizados.'}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
