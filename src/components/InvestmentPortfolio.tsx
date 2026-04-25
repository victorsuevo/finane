import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Wallet, Landmark, Bitcoin, ShieldCheck, Plus } from 'lucide-react';
import { Investment } from '../types';
import { formatCurrency } from '../lib/utils';

interface Props {
  investments: Investment[];
  onAdd: () => void;
}

const TYPE_ICONS: Record<string, any> = {
  'renda_fixa': <Landmark className="text-blue-500" size={20} />,
  'renda_variavel': <TrendingUp className="text-emerald-500" size={20} />,
  'cripto': <Bitcoin className="text-orange-500" size={20} />,
  'reserva': <ShieldCheck className="text-indigo-500" size={20} />,
};

const TYPE_LABELS: Record<string, string> = {
  'renda_fixa': 'Renda Fixa',
  'renda_variavel': 'Renda Variável',
  'cripto': 'Criptoativos',
  'reserva': 'Reserva de Valor',
};

export default function InvestmentPortfolio({ investments, onAdd }: Props) {
  const totalInvested = investments.reduce((acc, inv) => acc + inv.current_amount, 0);

  return (
    <div className="px-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-black text-sm text-slate-900 tracking-tight">Carteira de Investimentos</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Patrimônio Acumulado</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-black text-indigo-600 leading-none">
            {formatCurrency(totalInvested)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {investments.length === 0 ? (
          <button 
            onClick={onAdd}
            className="col-span-2 p-8 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center gap-2 hover:border-indigo-300 hover:bg-indigo-50 transition-all group"
          >
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center group-hover:bg-indigo-100 group-hover:scale-110 transition-all">
              <Plus size={20} className="text-slate-400 group-hover:text-indigo-600" />
            </div>
            <span className="text-xs font-black text-slate-400 group-hover:text-indigo-600 uppercase tracking-widest">Definir Carteira</span>
          </button>
        ) : (
          <>
            {investments.map((inv) => (
              <motion.div
                key={inv.id}
                whileHover={{ y: -2 }}
                className="p-5 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 bg-slate-50 rounded-xl">
                    {TYPE_ICONS[inv.type] || <Wallet size={20} />}
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter block leading-none">
                      {TYPE_LABELS[inv.type]}
                    </span>
                  </div>
                </div>
                
                <h4 className="text-xs font-black text-slate-900 mb-1 truncate">
                  {inv.name}
                </h4>
                <p className="text-base font-black text-slate-900 font-mono tracking-tight">
                  {formatCurrency(inv.current_amount)}
                </p>
              </motion.div>
            ))}
            
            <button 
              onClick={onAdd}
              className="p-5 border-2 border-dashed border-slate-100 rounded-[2rem] flex flex-col items-center justify-center gap-1 hover:border-indigo-200 hover:bg-indigo-50 transition-all group"
            >
              <Plus size={20} className="text-slate-300 group-hover:text-indigo-500" />
              <span className="text-[9px] font-black text-slate-300 group-hover:text-indigo-500 uppercase tracking-widest">Novo Ativo</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
