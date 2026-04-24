import React from 'react';
import { Share2, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction, Summary } from '../types';
import { formatCurrency } from '../lib/utils';

interface Props {
  summary: Summary;
  transactions: Transaction[];
}

export default function ShareSummary({ summary, transactions }: Props) {
  const [copied, setCopied] = React.useState(false);

  const generateReport = () => {
    const date = new Date().toLocaleDateString('pt-BR');
    const balance = summary.totalIncome - summary.totalExpense;
    
    let report = `📊 *Relatório Financeiro Finaneasy* - ${date}\n\n`;
    report += `💰 *Saldo:* ${formatCurrency(balance)}\n`;
    report += `📈 *Entradas:* ${formatCurrency(summary.totalIncome)}\n`;
    report += `📉 *Saídas:* ${formatCurrency(summary.totalExpense)}\n\n`;
    report += `*Últimas Transações:*\n`;
    
    transactions.slice(0, 5).forEach(t => {
      const icon = t.type === 'income' ? '✅' : '❌';
      report += `${icon} ${t.category}: ${formatCurrency(t.amount)} (${t.description || 'Sem descrição'})\n`;
    });

    return report;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateReport());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="px-5">
      <button
        onClick={handleCopy}
        className="w-full py-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-center gap-3 text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
      >
        <AnimatePresence mode="wait">
          {copied ? (
            <motion.div
              key="check"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-2 text-emerald-600 font-bold text-xs"
            >
              <Check size={16} />
              COPIADO PARA O WHATSAPP
            </motion.div>
          ) : (
            <motion.div
              key="share"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest"
            >
              <Share2 size={16} />
              Compartilhar Resumo
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    </div>
  );
}
