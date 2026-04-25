import React, { useState, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, CreditCard, Target, Plus, Landmark, TrendingUp, Bitcoin, ShieldCheck, Wallet } from 'lucide-react';
import { Goal, Investment } from '../types';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import ConfirmModal from './ConfirmModal';

interface Props {
  onSuccess: () => void;
  onClose: () => void;
  initialType?: 'income' | 'expense';
  goals?: Goal[];
  investments?: Investment[];
  editTransaction?: any;
  defaultDate?: string; // format: "yyyy-MM"
}

const INCOME_CATEGORIES = [
  'Salário', 'Investimentos', 'Presente', 'Venda', 'Freelance', 'Outros'
];

const BASE_EXPENSE_CATEGORIES = [
  'Alimentação', 'Transporte', 'Lazer', 'Saúde', 'Educação',
  'Moradia', 'Mercado', 'Assinaturas', 'Despesas Pessoais', 'Seguros', 'Outros'
];

const GOAL_PREFIX = '__GOAL__';
const INVEST_PREFIX = '__INVEST__';

export default function TransactionForm({
  onSuccess,
  onClose,
  initialType = 'expense',
  goals = [],
  investments = [],
  editTransaction,
  defaultDate,
}: Props) {
  const [amount, setAmount] = useState(editTransaction ? editTransaction.amount.toString() : '');
  const [type, setType] = useState<'income' | 'expense'>(editTransaction ? editTransaction.type : initialType);
  const [category, setCategory] = useState(() => {
    if (editTransaction) {
      if (editTransaction.goal_id) return `${GOAL_PREFIX}${editTransaction.goal_id}`;
      if (editTransaction.investment_id) return `${INVEST_PREFIX}${editTransaction.investment_id}`;
      return editTransaction.category;
    }
    return initialType === 'income' ? 'Salário' : 'Outros';
  });
  const [description, setDescription] = useState(editTransaction ? (editTransaction.description || '') : '');
  const [date, setDate] = useState(() => {
    if (editTransaction) return editTransaction.date;
    const today = new Date().toISOString().split('T')[0];
    if (!defaultDate) return today;
    
    // If defaultDate (yyyy-MM) matches current month, use today.
    // Otherwise use the 1st of that month.
    if (today.startsWith(defaultDate)) return today;
    return `${defaultDate}-01`;
  });
  const [installments, setInstallments] = useState(editTransaction ? editTransaction.installments : 1);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { token } = useAuth();

  // Active (not completed) goals for the dropdown
  const activeGoals = useMemo(
    () => goals.filter(g => g.current_amount < g.target_amount),
    [goals]
  );

  // Is the currently selected category a goal or investment?
  const selectedGoal = useMemo(() => {
    if (!category.startsWith(GOAL_PREFIX)) return null;
    const goalId = parseInt(category.replace(GOAL_PREFIX, ''), 10);
    return goals.find(g => g.id === goalId) ?? null;
  }, [category, goals]);

  const selectedInvestment = useMemo(() => {
    if (!category.startsWith(INVEST_PREFIX)) return null;
    const invId = parseInt(category.replace(INVEST_PREFIX, ''), 10);
    return investments.find(inv => inv.id === invId) ?? null;
  }, [category, investments]);

  const handleTypeChange = (newType: 'income' | 'expense') => {
    setType(newType);
    setCategory(newType === 'income' ? 'Salário' : 'Outros');
    setInstallments(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Resolve real category name and goal_id/investment_id
    const isGoal = !!selectedGoal;
    const isInvest = !!selectedInvestment;
    const realCategory = isGoal ? selectedGoal!.name : (isInvest ? selectedInvestment!.name : category);
    const goal_id = isGoal ? selectedGoal!.id : null;
    const investment_id = isInvest ? selectedInvestment!.id : null;

    try {
      const payload: any = {
        amount: parseFloat(amount),
        type,
        category: realCategory,
        description: description || realCategory,
        date,
        installments: installments > 1 ? installments : 1,
        goal_id,
        investment_id
      };

      const res = await fetch(editTransaction ? `/api/transactions/${editTransaction.id}` : '/api/transactions', {
        method: editTransaction ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onSuccess();
        onClose();
      }
    } catch (err) {
      console.error('Erro ao salvar transação:', err);
    } finally {
      setLoading(false);
    }
  };

  const isGoalCategory = !!selectedGoal;
  const isInvestCategory = !!selectedInvestment;
  const isSpecial = isGoalCategory || isInvestCategory;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
    >
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="bg-white dark:bg-slate-900 w-full max-w-lg p-8 rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {editTransaction ? 'Editar Transação' : 'Nova Transação'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X size={24} className="text-slate-400 dark:text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ── Type Toggle ── */}
          <div className="flex p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl">
            {(['expense', 'income'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => handleTypeChange(t)}
                className={cn(
                  'flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all',
                  type === t
                    ? t === 'expense'
                      ? 'bg-white dark:bg-slate-700 shadow-sm text-rose-600 dark:text-rose-400'
                      : 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-500 dark:text-slate-400 opacity-60'
                )}
              >
                {t === 'expense' ? 'Saída' : 'Entrada'}
              </button>
            ))}
          </div>

          {/* ── Amount ── */}
          <div>
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">
              Valor
            </label>
            <div 
              className="flex items-baseline gap-2 cursor-text"
              onClick={() => inputRef.current?.focus()}
            >
              <span className="text-2xl font-black text-slate-400 dark:text-slate-600 select-none">R$</span>
              <input
                ref={inputRef}
                required
                autoFocus
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full text-5xl font-black bg-transparent border-none focus:ring-0 text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-700 tracking-tighter"
              />
            </div>
          </div>

          {/* ── Category & Date (side-by-side) ── */}
          <div className="grid grid-cols-2 gap-4">

            {/* Category */}
            <div
              className={cn(
                'p-4 rounded-2xl border transition-all',
                isGoalCategory
                  ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/50'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700'
              )}
            >
              <label
                className={cn(
                  'text-[10px] font-black uppercase tracking-widest block mb-2',
                  isGoalCategory ? 'text-indigo-400 dark:text-indigo-500' : (isInvestCategory ? 'text-purple-400 dark:text-purple-500' : 'text-slate-400 dark:text-slate-500')
                )}
              >
                {isGoalCategory ? '🎯 Meta' : (isInvestCategory ? '📈 Investimento' : 'Categoria')}
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className={cn(
                  'w-full bg-transparent border-none text-sm font-bold focus:ring-0 p-0',
                  isGoalCategory ? 'text-indigo-800 dark:text-indigo-300' : 'text-slate-900 dark:text-white [&>optgroup]:bg-white dark:[&>optgroup]:bg-slate-900 [&>option]:bg-white dark:[&>option]:bg-slate-900'
                )}
              >
                {type === 'income' ? (
                  INCOME_CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))
                ) : (
                  <>
                    {/* Regular expense categories */}
                    <optgroup label="Despesas">
                      {BASE_EXPENSE_CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </optgroup>

                    {/* Goal categories (only shown if goals exist) */}
                    {activeGoals.length > 0 && (
                      <optgroup label="🎯 Metas">
                        {activeGoals.map(g => {
                          const remaining = g.target_amount - g.current_amount;
                          return (
                            <option
                              key={g.id}
                              value={`${GOAL_PREFIX}${g.id}`}
                            >
                              {g.name} (faltam R$ {remaining.toFixed(2)})
                            </option>
                          );
                        })}
                      </optgroup>
                    )}

                    {/* Investment categories */}
                    {investments.length > 0 && (
                      <optgroup label="📈 Investimentos">
                        {investments.map(inv => (
                          <option
                            key={inv.id}
                            value={`${INVEST_PREFIX}${inv.id}`}
                          >
                            {inv.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </>
                )}
              </select>
            </div>

            {/* Date */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">
                Data
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-transparent border-none text-sm font-bold text-slate-900 dark:text-white focus:ring-0 p-0 [color-scheme:light_dark]"
              />
            </div>
          </div>

          {/* ── Goal info banner ── */}
          {isGoalCategory && selectedGoal && (
            <div className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-2xl">
              <Target size={16} className="text-indigo-500 shrink-0" />
              <div className="text-xs">
                <p className="font-black text-indigo-800">{selectedGoal.name}</p>
                <p className="text-indigo-500">
                  Guardado: R$ {selectedGoal.current_amount.toFixed(2)} /
                  Meta: R$ {selectedGoal.target_amount.toFixed(2)} —
                  faltam{' '}
                  <strong>
                    R$ {(selectedGoal.target_amount - selectedGoal.current_amount).toFixed(2)}
                  </strong>
                </p>
              </div>
            </div>
          )}

          {/* ── Investment info banner ── */}
          {isInvestCategory && selectedInvestment && (
            <div className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-2xl">
              <Plus size={16} className="text-purple-500 shrink-0" />
              <div className="text-xs">
                <p className="font-black text-purple-800">{selectedInvestment.name}</p>
                <p className="text-purple-500">
                  Saldo Acumulado: <strong>R$ {selectedInvestment.current_amount.toFixed(2)}</strong>
                </p>
              </div>
            </div>
          )}

          {/* ── Installments (expense only) ── */}
          {type === 'expense' && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                <CreditCard size={11} /> {editTransaction ? 'Ajustar Parcelas' : 'Parcelas'}
              </label>
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => setInstallments(n => Math.max(1, n - 1))}
                  className="w-8 h-8 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg font-black text-slate-700 dark:text-slate-300 flex items-center justify-center transition-colors"
                >
                  −
                </button>
                <span className="font-black text-lg text-slate-900 dark:text-white min-w-[4rem] text-center">
                  {installments === 1 ? 'À vista' : `${installments}×`}
                </span>
                <button
                  type="button"
                  onClick={() => setInstallments(n => Math.min(48, n + 1))}
                  className="w-8 h-8 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg font-black text-slate-700 dark:text-slate-300 flex items-center justify-center transition-colors"
                >
                  +
                </button>
                {installments > 1 && amount && (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">
                    = R$ {parseFloat(amount).toFixed(2)}/mês por {installments} meses
                  </span>
                )}
              </div>
              {editTransaction && (editTransaction.installments > 1 || editTransaction.installment_ref) && (
                <p className="mt-3 text-[9px] text-amber-600 dark:text-amber-500 font-bold uppercase tracking-tight">
                  ⚠️ Alterar parcelas excluirá a série antiga e gerará uma nova.
                </p>
              )}
            </div>
          )}

          {/* ── Description ── */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">
              Descrição
            </label>
            <input
              type="text"
              placeholder={
                isGoalCategory
                  ? 'Observação (ex: depósito mensal)'
                  : 'Para o que é este gasto?'
              }
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-transparent border-none text-sm font-bold text-slate-900 dark:text-white focus:ring-0 p-0 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          {/* ── Submit ── */}
          <div className="space-y-3">
            <button
              type="submit"
              disabled={loading}
              className={cn(
                'w-full py-5 text-white rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl transition-all disabled:opacity-50',
                isGoalCategory
                  ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'
                  : (isInvestCategory ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/20' : 'bg-slate-900 dark:bg-slate-800 hover:bg-black dark:hover:bg-slate-700')
              )}
            >
              {loading
                ? 'Processando...'
                : installments > 1
                ? (editTransaction ? `Atualizar Série (${installments}×)` : `Parcelar em ${installments}×`)
                : isGoalCategory
                ? `Aportar para "${selectedGoal?.name}"`
                : isInvestCategory
                ? `Investir em "${selectedInvestment?.name}"`
                : (editTransaction ? 'Salvar Alterações' : 'Confirmar Transação')}
            </button>

            {editTransaction && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-4 text-rose-500 font-bold text-xs uppercase tracking-widest hover:bg-rose-50 rounded-[1.5rem] transition-colors"
              >
                Excluir {editTransaction.installments > 1 || editTransaction.installment_ref ? 'Série Completa' : 'Transação'}
              </button>
            )}
          </div>
        </form>

        <ConfirmModal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={async () => {
            setLoading(true);
            try {
              const res = await fetch(`/api/transactions/${editTransaction.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
              });
              if (res.ok) {
                onSuccess();
                onClose();
              }
            } catch (err) {
              console.error(err);
            } finally {
              setLoading(false);
            }
          }}
          title="Tem certeza?"
          message={`Você está prestes a excluir ${editTransaction?.installments > 1 || editTransaction?.installment_ref ? 'toda a série de parcelas desta compra' : 'esta transação'}. Esta ação não pode ser desfeita.`}
          confirmLabel="Sim, Excluir"
        />
      </motion.div>
    </motion.div>
  );
}
