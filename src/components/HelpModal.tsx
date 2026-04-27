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

            <div className="flex-1 overflow-y-auto p-8 space-y-8">              <section className="space-y-4">
                <div className="flex items-center gap-2 text-indigo-600">
                  <BarChart3 size={18} />
                  <h3 className="font-black text-xs uppercase tracking-widest">Painel Principal e Dashboards</h3>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  O painel é sua central de comando. O <strong>Resultado do Mês</strong> mostra quanto sobrou (ou faltou) após todas as movimentações. O <strong>Patrimônio Real</strong> é a métrica mais importante: ele soma o dinheiro que você tem hoje com tudo o que você já investiu em ativos.
                </p>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">Como usar os gráficos:</p>
                  <ul className="text-[11px] text-slate-500 dark:text-slate-400 space-y-2 list-disc pl-4">
                    <li>Deslize para os lados (ou use as setas) no carrossel para ver diferentes visualizações: Gastos por Categoria, Composição Mensal, Evolução de 6 meses e Crescimento do Patrimônio.</li>
                    <li>O gráfico de <strong>Composição Mensal</strong> empilha suas entradas e saídas para que você veja visualmente se está vivendo abaixo do que ganha.</li>
                  </ul>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2 text-emerald-600">
                  <CreditCard size={18} />
                  <h3 className="font-black text-xs uppercase tracking-widest">Lançamentos e Parcelamento</h3>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Tudo começa no botão (+). Ao lançar uma despesa, você pode definir se ela foi à vista ou <strong>parcelada</strong>.
                </p>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">Recursos Avançados:</p>
                  <ul className="text-[11px] text-slate-500 dark:text-slate-400 space-y-2 list-disc pl-4">
                    <li><strong>Investimento como Gasto:</strong> Ao comprar um ativo (ex: Tesouro Direto), lance como uma Saída na categoria correspondente. O SUEVO entenderá que esse dinheiro saiu do seu saldo, mas aumentou seu patrimônio real.</li>
                    <li><strong>Parcelas:</strong> Ao definir 12 parcelas, o sistema criará automaticamente o lançamento para os próximos 12 meses. Se você editar ou excluir uma parcela, o sistema perguntará se deseja aplicar a mudança em toda a série.</li>
                  </ul>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2 text-rose-600">
                  <Target size={18} />
                  <h3 className="font-black text-xs uppercase tracking-widest">Metas e Ativos</h3>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  As <strong>Metas</strong> são seus objetivos (ex: Viagem, Carro Novo). Os <strong>Ativos</strong> são onde seu dinheiro está rendendo (ex: Renda Fixa, Cripto).
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Para atualizar o valor de um ativo (valorização/desvalorização), utilize o ícone de lápis ao lado dele. Isso ajustará seu patrimônio sem necessariamente criar uma transação de entrada.
                </p>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2 text-amber-600">
                  <Search size={18} />
                  <h3 className="font-black text-xs uppercase tracking-widest">Busca e Histórico Inteligente</h3>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  A lupa na lista de transações abre o <strong>Histórico de Lançamentos</strong>. Você pode buscar qualquer coisa por nome ou data.
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-bold italic">
                  Dica: No histórico, clique em qualquer transação para ser levado instantaneamente ao mês em que ela ocorreu no painel principal.
                </p>
              </section>
              
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-purple-600">
                  <Sparkles size={18} />
                  <h3 className="font-black text-xs uppercase tracking-widest">Inteligência Artificial (Chat)</h3>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  No canto inferior esquerdo, você tem o Assistente SUEVO. Ele conhece todos os seus dados e pode tirar dúvidas sobre seus gastos, metas e investimentos.
                </p>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">Exemplos do que perguntar:</p>
                  <ul className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1 italic pl-4">
                    <li>"Quanto eu gastei com mercado nos últimos 3 meses?"</li>
                    <li>"Me dê 3 dicas para sobrar mais dinheiro este mês."</li>
                    <li>"Qual a minha meta que está mais próxima de ser atingida?"</li>
                  </ul>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2 text-blue-600">
                  <ShieldCheck size={18} />
                  <h3 className="font-black text-xs uppercase tracking-widest">Automação e Notificações</h3>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  O SUEVO pode ler as notificações do seu banco e automatizar seu controle financeiro de forma inteligente.
                </p>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">Recursos de Automação:</p>
                  <ul className="text-[11px] text-slate-500 dark:text-slate-400 space-y-2 list-disc pl-4">
                    <li><strong>Lançamento Automático:</strong> Detecta compras aprovadas, Pix e transferências, registrando-os ou perguntando se deseja salvar.</li>
                    <li><strong>Inteligência de Estornos:</strong> Se você receber uma notificação de estorno ou cancelamento, o SUEVO identifica o gasto original e o remove para você automaticamente.</li>
                    <li><strong>Filtro de Segurança:</strong> Notificações de compras negadas, senhas incorretas ou saldo insuficiente são ignoradas, garantindo que seu extrato contenha apenas transações reais.</li>
                  </ul>
                </div>
              </section>
            </div>

            <div className="p-8 bg-slate-50 dark:bg-slate-800/50 text-center border-t border-slate-100 dark:border-slate-700">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">SUEVO Financial Ecosystem &copy; 2026</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
