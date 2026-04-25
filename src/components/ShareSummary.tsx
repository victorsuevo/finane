import React from 'react';
import { Share2, Copy, Check, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Transaction, Summary, Goal } from '../types';
import { formatCurrency } from '../lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  summary: Summary;
  transactions: Transaction[];
  goals?: Goal[];
  userName?: string;
  currentMonth: string;
}

export default function ShareSummary({ summary, transactions, goals = [], userName, currentMonth }: Props) {
  const [copied, setCopied] = React.useState(false);

  const generateReport = () => {
    const now = new Date();
    const dateStr = format(now, "dd/MM/yy 'às' HH:mm", { locale: ptBR });
    
    // Parse currentMonth string to date for labels
    const currentMonthDate = parseISO(`${currentMonth}-01`);
    const monthName = format(currentMonthDate, "MMMM/yyyy", { locale: ptBR });

    // Global Balance
    const balance = (summary.totalIncome || 0) - (summary.totalExpense || 0);

    // Monthly Data based on system month
    const monthTx = transactions.filter(t => t.date.startsWith(currentMonth));
    const monthIncome = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const monthExpense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const monthBalance = monthIncome - monthExpense;

    const DIVIDER = "─────────────";

    let report = `📊 *RELATÓRIO SUEVO*\n`;
    report += `👤 ${userName || 'Usuário'}\n`;
    report += `🗓️ ${dateStr}\n\n`;

    report += `💼 *SALDO GERAL*\n`;
    report += `In: ${formatCurrency(summary.totalIncome || 0)}\n`;
    report += `Out: ${formatCurrency(summary.totalExpense || 0)}\n`;
    report += `✅ *Total: ${formatCurrency(balance)}*\n\n`;

    report += `📅 *${monthName.toUpperCase()}*\n`;
    report += `Entradas: ${formatCurrency(monthIncome)}\n`;
    report += `Saídas: ${formatCurrency(monthExpense)}\n`;
    report += `${monthBalance >= 0 ? '🟢' : '🔴'} Balanço: ${formatCurrency(monthBalance)}\n\n`;

    if (goals.length > 0) {
      report += `🎯 *METAS*\n`;
      goals.forEach(g => {
        const pct = Math.min(Math.round((g.current_amount / g.target_amount) * 100), 100);
        const bar = '█'.repeat(Math.floor(pct / 10)) + '░'.repeat(10 - Math.floor(pct / 10));
        report += `🏆 ${g.name} (${pct}%)\n`;
        report += `[${bar}] ${formatCurrency(g.current_amount)}\n`;
      });
      report += `\n`;
    }

    const installmentTx = transactions.filter(t => t.installments && t.installments > 1 && t.installment_ref == null);
    if (installmentTx.length > 0) {
      report += `💳 *PARCELAS ATIVAS*\n`;
      installmentTx.slice(0, 5).forEach(t => {
        const cleanDesc = t.description?.split(' (')[0] || t.category;
        report += `• ${cleanDesc}: ${formatCurrency(t.amount)} (${t.installments}x)\n`;
      });
      report += `\n`;
    }

    if (monthTx.length > 0) {
      report += `🕐 *LANÇAMENTOS DO MÊS*\n`;
      monthTx.slice(0, 10).forEach(t => {
        const icon = t.type === 'income' ? '➕' : '➖';
        const dateLabel = format(parseISO(t.date), 'dd/MM');
        const cleanDesc = t.description?.split(' (')[0] || t.category;
        report += `${icon} ${dateLabel} ${cleanDesc}: *${formatCurrency(t.amount)}*\n`;
      });
    }

    report += `\n_Gerado pelo SUEVO App_ 🚀`;
    return report;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateReport());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="px-5">
      <button
        onClick={handleCopy}
        className="w-full py-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-center gap-3 text-slate-600 hover:bg-green-50 hover:border-green-300 transition-all shadow-sm group"
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
              COPIADO! Agora cole no WhatsApp 📱
            </motion.div>
          ) : (
            <motion.div
              key="share"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest group-hover:text-green-700"
            >
              <FileText size={16} />
              Compartilhar Relatório Completo
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    </div>
  );
}
