import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Sparkles, Loader2, ChevronDown, ChevronUp, EyeOff } from 'lucide-react';
import { Transaction, Goal } from '../types';
import { getFinancialInsights } from '../services/geminiService';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  transactions: Transaction[];
  goals?: Goal[];
}

export default function AIInsights({ transactions, goals = [] }: Props) {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

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
    <motion.div 
      layout
      className="mx-5 p-4 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-500/20 transition-all duration-300"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <Sparkles size={16} className="text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Insights IA</p>
              {isCollapsed && insight && (
                <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded text-white/70 font-bold">OCULTO</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!isCollapsed && (
                <button 
                  onClick={generate}
                  disabled={loading}
                  className="text-[10px] bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded-full transition-colors disabled:opacity-50 font-bold"
                >
                  {loading ? '...' : 'ATUALIZAR'}
                </button>
              )}
              <button 
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                title={isCollapsed ? "Expandir" : "Recolher"}
              >
                {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              </button>
            </div>
          </div>
          
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="text-[11px] leading-snug font-medium pt-2">
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
                        <div className="prose prose-invert prose-sm max-w-none prose-p:my-0 prose-strong:font-bold text-inherit">
                          <ReactMarkdown>
                            {insight || 'Adicione transações para ver seus insights personalizados.'}
                          </ReactMarkdown>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
