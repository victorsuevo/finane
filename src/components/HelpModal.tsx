import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, HelpCircle, Plus, Target, Sparkles, BarChart3, Calendar, CreditCard } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    title: "Navegação Mensal",
    description: "Use as setas no topo para navegar entre os meses. O saldo e as transações mudarão automaticamente para o período selecionado.",
    icon: <Calendar className="text-blue-500" />,
  },
  {
    title: "Lançar Transações",
    description: "Clique no botão '+' ou nos cards de Entrada/Saída. Você pode parcelar compras em até 48x e o sistema cuidará das datas futuras para você.",
    icon: <Plus className="text-emerald-500" />,
  },
  {
    title: "Metas e Objetivos",
    description: "Crie metas (ex: Reserva de Emergência). Ao lançar um gasto, selecione a categoria 'Meta' para que o valor seja acumulado no seu objetivo.",
    icon: <Target className="text-indigo-500" />,
  },
  {
    title: "Inteligência Artificial",
    description: "O banner de Insights analisa seus gastos automaticamente. Se precisar de ajuda, use o botão flutuante para conversar com o assistente SUEVO.",
    icon: <Sparkles className="text-purple-500" />,
  },
  {
    title: "Análise Visual",
    description: "Deslize para os lados no card de gráficos para alternar entre: Gastos por Categoria, Evolução Mensal, Distribuição, Patrimônio e Composição.",
    icon: <BarChart3 className="text-orange-500" />,
  },
  {
    title: "Edição e Exclusão",
    description: "Clique em qualquer transação para editar. Se for parcelada, você pode atualizar a série toda ou excluí-la de uma vez só.",
    icon: <CreditCard className="text-slate-500" />,
  }
];

export default function HelpModal({ isOpen, onClose }: Props) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 40 }}
            className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="p-8 pb-4 flex items-center justify-between border-b border-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                  <HelpCircle className="text-white" size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Guia SUEVO</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Manual do Usuário</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-3 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={24} className="text-slate-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {STEPS.map((step, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-5 bg-slate-50 rounded-3xl border border-slate-100 hover:border-indigo-100 transition-colors group"
                  >
                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      {step.icon}
                    </div>
                    <h3 className="font-black text-slate-900 mb-2">{step.title}</h3>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      {step.description}
                    </p>
                  </motion.div>
                ))}
              </div>

              <div className="p-6 bg-indigo-900 rounded-[2rem] text-white">
                <h4 className="font-black text-lg mb-2">Pronto para começar?</h4>
                <p className="text-xs text-indigo-200 leading-relaxed opacity-80">
                  O SUEVO foi desenhado para ser intuitivo. Se tiver qualquer dúvida específica, basta perguntar ao nosso assistente de IA clicando no ícone de brilho no canto da tela.
                </p>
                <button 
                  onClick={onClose}
                  className="mt-6 w-full py-4 bg-white text-indigo-900 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-50 transition-colors"
                >
                  Entendi, vamos lá!
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
