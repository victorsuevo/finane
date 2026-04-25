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
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-indigo-600">
                  <BarChart3 size={18} />
                  <h3 className="font-black text-xs uppercase tracking-widest">Painel Principal</h3>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  O painel exibe o resumo financeiro do mês selecionado. O <strong>Patrimônio Real</strong> apresenta a soma do saldo em conta corrente com o valor total alocado em investimentos. Os gráficos detalham a distribuição de despesas por categoria e a evolução da sua carteira. Navegue pelos meses utilizando as setas direcionais no topo da tela.
                </p>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2 text-emerald-600">
                  <CreditCard size={18} />
                  <h3 className="font-black text-xs uppercase tracking-widest">Gestão de Transações</h3>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Utilize o botão flutuante (+) para registrar novas receitas ou despesas. Transações podem ser categorizadas, parceladas ou vinculadas a metas e investimentos específicos. Ao lançar uma despesa e classificá-la como "Investimento", o sistema automaticamente deduzirá o valor da sua conta principal e o adicionará à carteira selecionada.
                </p>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2 text-rose-600">
                  <Target size={18} />
                  <h3 className="font-black text-xs uppercase tracking-widest">Carteira de Ativos e Metas</h3>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Gerencie sua carteira adicionando ativos (Renda Fixa, Variável, Criptomoedas, etc.) através do painel de investimentos. Para modificar os dados de um investimento ou meta já lançada, clique no ícone de lápis (editar) associado ao item correspondente na tela principal.
                </p>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2 text-amber-600">
                  <Search size={18} />
                  <h3 className="font-black text-xs uppercase tracking-widest">Histórico e Filtros</h3>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Acesse o histórico completo clicando no ícone de busca (lupa) na seção de transações do mês. A ferramenta permite filtrar transações anteriores por descrição, categoria ou período. Ao clicar sobre uma transação no histórico, o sistema navegará automaticamente para o mês correspondente.
                </p>
              </section>
              
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-purple-600">
                  <Sparkles size={18} />
                  <h3 className="font-black text-xs uppercase tracking-widest">Inteligência Artificial</h3>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  O assistente integrado analisa seus hábitos de consumo e fornece dicas personalizadas com base no seu histórico recente. Você pode interagir com o chat no canto inferior esquerdo para fazer perguntas específicas sobre suas finanças ou solicitar resumos de gastos.
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
