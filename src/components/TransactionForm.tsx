import React, { useState, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import { X, CreditCard, Target } from 'lucide-react';
import { Goal } from '../types';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import ConfirmModal from './ConfirmModal';

interface Props {
  onSuccess: () => void;
  onClose: () => void;
  initialType?: 'income' | 'expense';
  goals?: Goal[];
  editTransaction?: any;
  defaultDate?: string; // format: "yyyy-MM"
}

const INCOME_CATEGORIES = [
  'Salário', 'Investimentos', 'Presente', 'Venda', 'Freelance', 'Outros'
];

const BASE_EXPENSE_CATEGORIES = [
  'Alimentação', 'Transporte', 'Lazer', 'Saúde', 'Educação',
  'Moradia', 'Mercado', 'Assinaturas', 'Outros'
];

// Prefix used to identify goal-categories in the select
const GOAL_PREFIX = '__GOAL__';

export default function TransactionForm({
  onSuccess,
  onClose,
  initialType = 'expense',
  goals = [],
  editTransaction,
  defaultDate,
}: Props) {
  const [amount, setAmount] = useState(editTransaction ? editTransaction.amount.toString() : '');
  const [type, setType] = useState<'income' | 'expense'>(editTransaction ? editTransaction.type : initialType);
  const [category, setCategory] = useState(
    editTransaction ? editTransaction.category : (initialType === 'income' ? 'Salário' : 'Outros')
  );
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

  // Is the currently selected category a goal?
  const selectedGoal = useMemo(() => {
    if (!category.startsWith(GOAL_PREFIX)) return null;
    const goalId = parseInt(category.replace(GOAL_PREFIX, ''), 10);
    return goals.find(g => g.id === goalId) ?? null;
  }, [category, goals]);

  const handleTypeChange = (newType: 'income' | 'expense') => {
    setType(newType);
    setCategory(newType === 'income' ? 'Salário' : 'Outros');
    setInstallments(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Resolve real category name and goal_id
    const isGoal = !!selectedGoal;
    const realCategory = isGoal ? selectedGoal!.name : category;
    const goal_id = isGoal ? selectedGoal!.id : null;

    try {
      const payload: any = {
        amount: parseFloat(amount),
        type,
        category: realCategory,
        description: description || realCategory,
        date,
        installments: installments > 1 ? installments : 1,
        goal_id,
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
    >
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="bg-white w-full max-w-lg p-8 rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Nova Transação
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={24} className="text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ── Type Toggle ── */}
          <div className="flex p-1.5 bg-slate-100 rounded-2xl">
            {(['expense', 'income'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => handleTypeChange(t)}
                className={cn(
                  'flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all',
                  type === t
                    ? t === 'expense'
                      ? 'bg-white shadow-sm text-rose-600'
                      : 'bg-white shadow-sm text-emerald-600'
                    : 'text-slate-500 opacity-60'
                )}
              >
                {t === 'expense' ? 'Saída' : 'Entrada'}
              </button>
            ))}
          </div>

          {/* ── Amount ── */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
              Valor
            </label>
            <div 
              className="flex items-baseline gap-2 cursor-text"
              onClick={() => inputRef.current?.focus()}
            >
              <span className="text-2xl font-black text-slate-300 select-none">R$</span>
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
                className="w-full text-5xl font-black bg-transparent border-none focus:ring-0 text-slate-900 placeholder:text-slate-100 tracking-tighter"
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
                  ? 'bg-indigo-50 border-indigo-200'
                  : 'bg-slate-50 border-slate-100'
              )}
            >
              <label
                className={cn(
                  'text-[10px] font-black uppercase tracking-widest block mb-2',
                  isGoalCategory ? 'text-indigo-400' : 'text-slate-400'
                )}
              >
                {isGoalCategory ? '🎯 Meta' : 'Categoria'}
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className={cn(
                  'w-full bg-transparent border-none text-sm font-bold focus:ring-0 p-0',
                  isGoalCategory ? 'text-indigo-800' : 'text-slate-900'
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
                  </>
                )}
              </select>
            </div>

            {/* Date */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                Data
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-transparent border-none text-sm font-bold text-slate-900 focus:ring-0 p-0"
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

          {/* ── Installments (expense only, not goal) ── */}
          {type === 'expense' && !isGoalCategory && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                <CreditCard size={11} /> {editTransaction ? 'Ajustar Parcelas' : 'Parcelas'}
              </label>
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => setInstallments(n => Math.max(1, n - 1))}
                  className="w-8 h-8 bg-slate-200 hover:bg-slate-300 rounded-lg font-black text-slate-700 flex items-center justify-center transition-colors"
                >
                  −
                </button>
                <span className="font-black text-lg text-slate-900 min-w-[4rem] text-center">
                  {installments === 1 ? 'À vista' : `${installments}×`}
                </span>
                <button
                  type="button"
                  onClick={() => setInstallments(n => Math.min(48, n + 1))}
                  className="w-8 h-8 bg-slate-200 hover:bg-slate-300 rounded-lg font-black text-slate-700 flex items-center justify-center transition-colors"
                >
                  +
                </button>
                {installments > 1 && amount && (
                  <span className="text-[10px] text-slate-400 font-bold">
                    = R$ {parseFloat(amount).toFixed(2)}/mês por {installments} meses
                  </span>
                )}
              </div>
              {editTransaction && (editTransaction.installments > 1 || editTransaction.installment_ref) && (
                <p className="mt-3 text-[9px] text-amber-600 font-bold uppercase tracking-tight">
                  ⚠️ Alterar parcelas excluirá a série antiga e gerará uma nova.
                </p>
              )}
            </div>
          )}

          {/* ── Description ── */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
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
              className="w-full bg-transparent border-none text-sm font-bold text-slate-900 focus:ring-0 p-0"
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
                  : 'bg-slate-900 hover:bg-black'
              )}
            >
              {loading
                ? 'Processando...'
                : installments > 1
                ? (editTransaction ? `Atualizar Série (${installments}×)` : `Parcelar em ${installments}×`)
                : isGoalCategory
                ? `Aportar para "${selectedGoal?.name}"`
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
