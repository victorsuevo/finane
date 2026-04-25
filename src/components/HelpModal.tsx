import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, HelpCircle, Plus, Target, Sparkles, BarChart3, Calendar, CreditCard, Search, TrendingUp, Wallet, ShieldCheck } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpModal({ isOpen, onClose }: Props) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-[3rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <HelpCircle className="text-white" size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Manual SUEVO</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Guia Rápido de Funcionalidades</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {/* Seção 1 */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-indigo-600">
                  <Sparkles size={18} />
                  <h3 className="font-black text-xs uppercase tracking-widest">Patrimônio Real (Net Worth)</h3>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  O SUEVO agora calcula sua riqueza real. No topo do dashboard, você vê o <strong>Patrimônio Real</strong>, que é a soma do seu saldo em conta mais o valor total acumulado em seus investimentos. 
                  O gráfico de área "Patrimônio Total" mostra essa evolução ao longo do tempo.
                </p>
              </section>

              {/* Seção 2 */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-emerald-600">
                  <Wallet size={18} />
                  <h3 className="font-black text-xs uppercase tracking-widest">Gestão de Investimentos</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl">
                    <p className="text-[10px] font-black text-indigo-600 uppercase mb-2">Edição Direta</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Passe o mouse ou toque em um card de investimento para ver os botões de <strong>Editar</strong> ou <strong>Excluir</strong>.</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl">
                    <p className="text-[10px] font-black text-emerald-600 uppercase mb-2">Carteira de Ativos</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Confira no carrossel de gráficos a distribuição percentual da sua carteira (Cripto, Renda Fixa, etc).</p>
                  </div>
                </div>
              </section>

              {/* Seção 3 */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-rose-600">
                  <BarChart3 size={18} />
                  <h3 className="font-black text-xs uppercase tracking-widest">Gastos Mais Precisos</h3>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  O gráfico de "Gastos por Categoria" agora ignora automaticamente aportes em investimentos. Assim, você vê apenas o que realmente foi gasto em consumo, moradia, lazer, etc.
                </p>
              </section>

              {/* Seção 4 */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-amber-600">
                  <Search size={18} />
                  <h3 className="font-black text-xs uppercase tracking-widest">Histórico & Busca</h3>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Clique no ícone de lupa <Search size={14} className="inline" /> ao lado de "Transações do Mês" para abrir o histórico completo. Lá você pode buscar qualquer transação antiga por nome ou data.
                </p>
              </section>

              {/* Seção 5 */}
              <section className="bg-indigo-50 dark:bg-indigo-950/20 p-6 rounded-[2rem] border border-indigo-100 dark:border-indigo-900/30">
                <div className="flex items-center gap-2 text-indigo-600 mb-2">
                  <ShieldCheck size={18} />
                  <h3 className="font-black text-xs uppercase tracking-widest">Dica de Segurança</h3>
                </div>
                <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
                  Seus dados são salvos automaticamente. Use o botão <strong>Salvar</strong> no topo para garantir o backup manual ou atualizar o saldo após grandes mudanças.
                </p>
              </section>
            </div>

            <div className="p-8 bg-slate-50 dark:bg-slate-800/50 text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">SUEVO Financial Ecosystem &copy; 2026</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
