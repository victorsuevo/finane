import { Investment } from '../types';
import { formatCurrency } from '../lib/utils';
import { TrendingUp, Landmark, Bitcoin, ShieldCheck, Wallet, Plus, Edit2, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ConfirmModal from './ConfirmModal';

interface Props {
  investments: Investment[];
  onAdd: () => void;
  onRefresh: () => void;
  onEdit: (inv: Investment) => void;
}

const TYPE_ICONS = {
  'renda_fixa': { icon: Landmark, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30', label: 'Renda Fixa' },
  'renda_variavel': { icon: TrendingUp, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-950/30', label: 'Renda Variável' },
  'cripto': { icon: Bitcoin, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30', label: 'Cripto' },
  'reserva': { icon: ShieldCheck, color: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-950/30', label: 'Reserva' },
};

export default function InvestmentPortfolio({ investments, onAdd, onRefresh, onEdit }: Props) {
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { token } = useAuth();

  const total = investments.reduce((acc, inv) => acc + (inv.current_amount || 0), 0);

  const handleDelete = async () => {
    if (!deleteId || !token) return;
    try {
      await fetch(`/api/investments/${deleteId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setDeleteId(null);
      onRefresh();
    } catch (error) {
      console.error('Erro ao deletar investimento:', error);
    }
  };

  return (
    <div className="mx-5 space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h3 className="font-black text-sm text-slate-900 dark:text-white tracking-tight uppercase">Carteira de Investimentos</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Patrimônio Acumulado</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 tracking-tighter">{formatCurrency(total)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {investments.map((inv) => {
          const config = TYPE_ICONS[inv.type as keyof typeof TYPE_ICONS] || TYPE_ICONS.reserva;
          return (
            <motion.div 
              key={inv.id}
              layoutId={`inv-${inv.id}`}
              className="bg-white dark:bg-slate-800 p-4 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group relative"
            >
              <div className="flex justify-between items-start mb-3">
                <div className={`p-2 rounded-xl ${config.bg}`}>
                  <config.icon className={config.color} size={18} />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => onEdit(inv)}
                    className="p-1.5 bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button 
                    onClick={() => setDeleteId(inv.id!)}
                    className="p-1.5 bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{config.label}</p>
              <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate mb-2">{inv.name}</h4>
              <p className="text-sm font-black text-slate-900 dark:text-slate-100">{formatCurrency(inv.current_amount)}</p>
            </motion.div>
          );
        })}
        
        <motion.button
          onClick={onAdd}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[2rem] p-4 flex flex-col items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all min-h-[120px]"
        >
          <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm">
            <Plus className="text-slate-400" size={20} />
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Definir Carteira</span>
        </motion.button>
      </div>

      <ConfirmModal 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Remover Ativo?"
        message="Deseja realmente excluir este investimento da sua carteira?"
      />
    </div>
  );
}
