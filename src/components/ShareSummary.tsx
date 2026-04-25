import React from 'react';
import { Share2, Copy, Check, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction, Summary, Goal } from '../types';
import { formatCurrency } from '../lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  summary: Summary;
  transactions: Transaction[];
  goals?: Goal[];
  userName?: string;
}

export default function ShareSummary({ summary, transactions, goals = [], userName }: Props) {
  const [copied, setCopied] = React.useState(false);

  const generateReport = () => {
    const now = new Date();
    const dateStr = format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    const balance = (summary.totalIncome || 0) - (summary.totalExpense || 0);

    // Group current month transactions
    const currentMonth = format(now, 'yyyy-MM');
    const monthTx = transactions.filter(t => t.date.startsWith(currentMonth));
    const prevMonths = transactions.filter(t => !t.date.startsWith(currentMonth));

    // Category breakdown for current month
    const expenseByCategory: Record<string, number> = {};
    monthTx.filter(t => t.type === 'expense').forEach(t => {
      expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount;
    });

    const incomeByCategory: Record<string, number> = {};
    monthTx.filter(t => t.type === 'income').forEach(t => {
      incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + t.amount;
    });

    const monthIncome = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const monthExpense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const monthBalance = monthIncome - monthExpense;

    let report = '';
    report += `╔═══════════════════════════╗\n`;
    report += `║  📊 RELATÓRIO SUEVO  ║\n`;
    report += `╚═══════════════════════════╝\n`;
    report += `👤 *${userName || 'Usuário'}*\n`;
    report += `🗓️ Emitido em: ${dateStr}\n`;
    report += `\n`;

    // Overall balance
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `💼 *SALDO GERAL*\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `📈 Entradas totais:   ${formatCurrency(summary.totalIncome || 0)}\n`;
    report += `📉 Saídas totais:     ${formatCurrency(summary.totalExpense || 0)}\n`;
    report += `${balance >= 0 ? '✅' : '⚠️'} Saldo atual:       *${formatCurrency(balance)}*\n\n`;

    // Current month
    const monthName = format(now, "MMMM/yyyy", { locale: ptBR });
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `📅 *${monthName.toUpperCase()}*\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `📈 Entradas: ${formatCurrency(monthIncome)}\n`;
    report += `📉 Saídas:   ${formatCurrency(monthExpense)}\n`;
    report += `${monthBalance >= 0 ? '🟢' : '🔴'} Balanço: ${formatCurrency(monthBalance)}\n\n`;

    // Income breakdown
    if (Object.keys(incomeByCategory).length > 0) {
      report += `💚 *Entradas por categoria:*\n`;
      Object.entries(incomeByCategory)
        .sort((a, b) => b[1] - a[1])
        .forEach(([cat, val]) => {
          report += `  • ${cat}: ${formatCurrency(val)}\n`;
        });
      report += `\n`;
    }

    // Expense breakdown
    if (Object.keys(expenseByCategory).length > 0) {
      report += `❤️ *Saídas por categoria:*\n`;
      Object.entries(expenseByCategory)
        .sort((a, b) => b[1] - a[1])
        .forEach(([cat, val]) => {
          const pct = monthExpense > 0 ? ((val / monthExpense) * 100).toFixed(0) : 0;
          report += `  • ${cat}: ${formatCurrency(val)} (${pct}%)\n`;
        });
      report += `\n`;
    }

    // Goals
    if (goals.length > 0) {
      report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      report += `🎯 *METAS*\n`;
      report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      goals.forEach(g => {
        const pct = Math.min(Math.round((g.current_amount / g.target_amount) * 100), 100);
        const remaining = g.target_amount - g.current_amount;
        const bar = '█'.repeat(Math.floor(pct / 10)) + '░'.repeat(10 - Math.floor(pct / 10));
        report += `🏆 *${g.name}*\n`;
        report += `   [${bar}] ${pct}%\n`;
        report += `   Guardado: ${formatCurrency(g.current_amount)} / Meta: ${formatCurrency(g.target_amount)}\n`;
        if (remaining > 0) {
          report += `   Faltam: ${formatCurrency(remaining)}\n`;
        } else {
          report += `   ✅ Meta atingida!\n`;
        }
        if (g.deadline) report += `   📅 Prazo: ${g.deadline}\n`;
        report += `\n`;
      });
    }

    // Installments active
    const installmentTx = transactions.filter(t => t.installments && t.installments > 1 && t.installment_ref == null);
    if (installmentTx.length > 0) {
      report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      report += `💳 *PARCELAS ATIVAS*\n`;
      report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      installmentTx.slice(0, 5).forEach(t => {
        const desc = t.description?.replace(` (1/${t.installments})`, '') || t.category;
        report += `  • ${desc}: ${formatCurrency(t.amount)}/mês × ${t.installments}×\n`;
      });
      report += `\n`;
    }

    // Last 5 transactions
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `🕐 *ÚLTIMAS TRANSAÇÕES*\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    transactions.slice(0, 8).forEach(t => {
      const icon = t.type === 'income' ? '✅' : t.goal_id ? '🎯' : '❌';
      const dateLabel = format(parseISO(t.date), 'dd/MM', { locale: ptBR });
      report += `${icon} ${dateLabel} · ${t.description || t.category}: *${formatCurrency(t.amount)}*\n`;
    });

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
