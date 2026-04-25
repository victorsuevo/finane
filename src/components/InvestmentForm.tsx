import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Landmark, TrendingUp, Bitcoin, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  onSuccess: () => void;
  onClose: () => void;
}

const TYPES = [
  { id: 'renda_fixa', label: 'Renda Fixa', icon: <Landmark size={20} />, color: 'text-blue-500', bg: 'bg-blue-50' },
  { id: 'renda_variavel', label: 'Renda Variável', icon: <TrendingUp size={20} />, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { id: 'cripto', label: 'Criptoativos', icon: <Bitcoin size={20} />, color: 'text-orange-500', bg: 'bg-orange-50' },
  { id: 'reserva', label: 'Reserva de Valor', icon: <ShieldCheck size={20} />, color: 'text-indigo-500', bg: 'bg-indigo-50' },
];

export default function InvestmentForm({ onSuccess, onClose }: Props) {
  const [name, setName] = useState('');
  const [type, setType] = useState('renda_fixa');
  const [initialAmount, setInitialAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/investments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          type,
          current_amount: parseFloat(initialAmount) || 0,
        }),
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
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-4">
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl space-y-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Novo Investimento</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={24} className="text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
              Tipo de Ativo
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id)}
                  className={cn(
                    "p-4 rounded-2xl border text-left transition-all flex items-center gap-3",
                    type === t.id 
                      ? "bg-slate-900 border-slate-900 text-white shadow-lg" 
                      : "bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-lg",
                    type === t.id ? "bg-white/10" : t.bg
                  )}>
                    {React.cloneElement(t.icon as React.ReactElement, { 
                      className: type === t.id ? "text-white" : t.color 
                    })}
                  </div>
                  <span className="text-[11px] font-black leading-tight">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
              Nome (ex: Nubank, Bitcoin, Tesouro)
            </label>
            <input
              required
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20"
              placeholder="Digite o nome..."
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
              Saldo Inicial (opcional)
            </label>
            <input
              type="number"
              step="0.01"
              value={initialAmount}
              onChange={e => setInitialAmount(e.target.value)}
              className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20"
              placeholder="R$ 0,00"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl shadow-indigo-200 transition-all disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Criar Ativo'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
