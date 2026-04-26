import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, Landmark, Bitcoin, ShieldCheck, Save, Loader2 } from 'lucide-react';
import { Investment } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

interface Props {
  onSuccess: () => void;
  onClose: () => void;
  editInvestment?: Investment | null;
}

const TYPES = [
  { id: 'renda_fixa', label: 'Renda Fixa', icon: Landmark, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  { id: 'renda_variavel', label: 'Variável', icon: TrendingUp, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-950/30' },
  { id: 'cripto', label: 'Cripto', icon: Bitcoin, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30' },
  { id: 'reserva', label: 'Reserva', icon: ShieldCheck, color: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-950/30' },
];

export default function InvestmentForm({ onSuccess, onClose, editInvestment }: Props) {
  const { token } = useAuth();
  const [name, setName] = useState('');
  const [type, setType] = useState('renda_fixa');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isAporte, setIsAporte] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editInvestment) {
      setName(editInvestment.name);
      setType(editInvestment.type);
      setAmount(editInvestment.current_amount.toString());
    }
  }, [editInvestment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);

    try {
      const method = editInvestment ? 'PUT' : 'POST';
      const url = editInvestment ? `/api/investments/${editInvestment.id}` : '/api/investments';
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          type,
          current_amount: parseFloat(amount),
          date,
          isAporte
        })
      });

      if (res.ok) {
        onSuccess();
      }
    } catch (error) {
      console.error('Erro ao salvar investimento:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="w-full max-w-md bg-white dark:bg-slate-800 rounded-t-[3rem] sm:rounded-[3rem] p-8 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              {editInvestment ? 'Editar Ativo' : 'Novo Ativo'}
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              {editInvestment ? 'Atualize os dados do seu investimento' : 'Adicione um novo item à sua carteira'}
            </p>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Ativo</label>
            <div className="grid grid-cols-2 gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id)}
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-2xl border-2 transition-all",
                    type === t.id 
                      ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30" 
                      : "border-slate-100 dark:border-slate-700 hover:border-slate-200"
                  )}
                >
                  <div className={`p-1.5 rounded-lg ${t.bg}`}>
                    <t.icon className={t.color} size={16} />
                  </div>
                  <span className={cn("text-[10px] font-black uppercase tracking-tight", type === t.id ? "text-indigo-600" : "text-slate-400")}>
                    {t.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Ativo</label>
            <input
              required
              type="text"
              placeholder={type === 'renda_fixa' ? 'Ex: Tesouro Selic, CDB...' : type === 'renda_variavel' ? 'Ex: Ações, FIIs, PETR4...' : type === 'cripto' ? 'Ex: Bitcoin, Ethereum...' : 'Ex: Poupança, Conta Corrente...'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor Atual</label>
            <div className="relative">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 font-bold">R$</span>
              <input
                required
                type="number"
                step="0.01"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-2xl py-4 pl-14 pr-6 text-xl font-black text-slate-900 dark:text-white placeholder:text-slate-200 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data do Saldo</label>
              <input
                required
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>
            <div className="space-y-2 flex flex-col justify-end">
              <button
                type="button"
                onClick={() => setIsAporte(!isAporte)}
                className={cn(
                  "flex items-center gap-2 p-4 rounded-2xl border-2 transition-all h-[58px]",
                  isAporte 
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30" 
                    : "border-slate-100 dark:border-slate-700"
                )}
              >
                <div className={cn("w-4 h-4 rounded border-2 flex items-center justify-center transition-all", isAporte ? "bg-emerald-500 border-emerald-500" : "border-slate-300")}>
                  {isAporte && <Save size={10} className="text-white" />}
                </div>
                <span className="text-[9px] font-black uppercase tracking-tight text-slate-600 dark:text-slate-300">Lançar Aporte</span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-[2rem] shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50 uppercase tracking-widest text-xs"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (
              <>
                <Save size={18} />
                {editInvestment ? 'Salvar Alterações' : 'Confirmar Ativo'}
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
