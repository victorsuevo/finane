import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Wallet, LogOut, ChevronLeft, ChevronRight, Save, Check, Crown, Search, Share2 } from 'lucide-react';
import { Transaction, Goal, Investment } from './types';
import { formatCurrency, cn } from './lib/utils';
import { format, subMonths, addMonths, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import TransactionList from './components/TransactionList';
import CategoryChart from './components/CategoryChart';
import AIInsights from './components/AIInsights';
import Login from './components/Login';
import TransactionForm from './components/TransactionForm';
import GoalList from './components/GoalList';
import GoalForm from './components/GoalForm';
import InvestmentPortfolio from './components/InvestmentPortfolio';
import InvestmentForm from './components/InvestmentForm';
import ManagerPanel from './components/ManagerPanel';
import SettingsPanel from './components/SettingsPanel';
import HelpModal from './components/HelpModal';
import ChatAssistant from './components/ChatAssistant';
import ShareSummary from './components/ShareSummary';
import { useAuth } from './contexts/AuthContext';

export default function App() {
  const { user, token, logout, isLoading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'income' | 'expense'>('expense');
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showInvestForm, setShowInvestForm] = useState(false);
  const [showManager, setShowManager] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const [tRes, gRes, iRes] = await Promise.all([
        fetch('/api/transactions', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/goals', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/investments', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      const tData = await tRes.json();
      const gData = await gRes.json();
      const iData = await iRes.json();
      setTransactions(Array.isArray(tData) ? tData : []);
      setGoals(Array.isArray(gData) ? gData : []);
      setInvestments(Array.isArray(iData) ? iData : []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchData();
  }, [fetchData, token]);

  const handleAfterAdd = async () => {
    setSaveStatus('saving');
    await fetchData();
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const handlePrevMonth = () => setSelectedMonth(prev => format(subMonths(parseISO(`${prev}-01`), 1), 'yyyy-MM'));
  const handleNextMonth = () => setSelectedMonth(prev => format(addMonths(parseISO(`${prev}-01`), 1), 'yyyy-MM'));

  const monthTransactions = transactions.filter(t => t?.date?.startsWith(selectedMonth));
  const monthIncome = monthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
  const monthExpense = monthTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
  const monthBalance = monthIncome - monthExpense;

  const totalInvestments = investments.reduce((acc, inv) => acc + (inv.current_amount || 0), 0);

  if (authLoading) return null;
  if (!user) return <Login />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-purple-100 pb-24">
      <header className="fixed top-0 inset-x-0 h-16 bg-white/80 backdrop-blur-md z-40 px-6 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowSettings(true)} className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Wallet className="text-white" size={18} />
          </button>
          <h1 className="font-black text-lg tracking-tight uppercase">SUEVO</h1>
        </div>
        <div className="flex items-center gap-3">
          <motion.button whileTap={{ scale: 0.95 }} onClick={handleAfterAdd} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors text-slate-600">
            <AnimatePresence mode="wait">
              {saveStatus === 'saved' ? (
                <motion.span key="saved" initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1 text-emerald-600 text-[10px] font-black uppercase">
                  <Check size={12} /> Salvo
                </motion.span>
              ) : saveStatus === 'saving' ? (
                <motion.span key="saving" className="text-[10px] font-black uppercase text-slate-400">Salvando...</motion.span>
              ) : (
                <motion.span key="idle" className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest">
                  <Save size={12} /> Salvar
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
          {user.is_manager && (
            <button onClick={() => setShowManager(true)} className="w-8 h-8 bg-amber-100 hover:bg-amber-200 rounded-full flex items-center justify-center">
              <Crown size={16} className="text-amber-600" />
            </button>
          )}
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-slate-900 leading-none">{user.name}</span>
            <button onClick={logout} className="text-[9px] font-bold text-rose-500 hover:text-rose-600 uppercase tracking-tighter">
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto pt-24 space-y-6">
        {/* Resultado Principal */}
        <div className="px-5 flex items-end justify-between">
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1">Resultado do Mês</p>
            <h2 className={cn("text-4xl font-black tracking-tighter leading-none transition-all", monthBalance >= 0 ? "text-slate-900" : "text-rose-600")}>
              {monthBalance >= 0 ? "+" : ""} {formatCurrency(monthBalance)}
            </h2>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-slate-400 uppercase font-black tracking-tighter mb-1">Patrimônio Acumulado</p>
            <p className="text-xs font-bold text-indigo-600">{formatCurrency(totalInvestments + monthBalance)}</p>
          </div>
        </div>

        {/* Seletor de Mês */}
        <div className="px-5 flex items-center justify-between">
          <button onClick={handlePrevMonth} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
            <ChevronLeft size={18} className="text-slate-600" />
          </button>
          <div className="font-bold text-sm text-slate-800 capitalize tracking-wide">
            {format(parseISO(`${selectedMonth}-01`), "MMMM 'de' yyyy", { locale: ptBR })}
          </div>
          <button onClick={handleNextMonth} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
            <ChevronRight size={18} className="text-slate-600" />
          </button>
        </div>

        {/* Cards de Resumo Coloridos */}
        <div className="px-5 grid grid-cols-2 gap-3">
          <motion.div 
            whileHover={{ scale: 1.02 }} 
            whileTap={{ scale: 0.98 }} 
            onClick={() => { setFormType('income'); setShowForm(true); }}
            className="bg-emerald-50 p-4 rounded-[2rem] border border-emerald-100/50 cursor-pointer shadow-sm hover:shadow-md transition-all"
          >
            <p className="text-[10px] text-emerald-600 font-black uppercase mb-1 tracking-widest">Entradas</p>
            <p className="text-xl font-black text-emerald-700 tracking-tight">+ {formatCurrency(monthIncome)}</p>
          </motion.div>
          <motion.div 
            whileHover={{ scale: 1.02 }} 
            whileTap={{ scale: 0.98 }} 
            onClick={() => { setFormType('expense'); setShowForm(true); }}
            className="bg-rose-50 p-4 rounded-[2rem] border border-rose-100/50 cursor-pointer shadow-sm hover:shadow-md transition-all"
          >
            <p className="text-[10px] text-rose-600 font-black uppercase mb-1 tracking-widest">Saídas</p>
            <p className="text-xl font-black text-rose-700 tracking-tight">- {formatCurrency(monthExpense)}</p>
          </motion.div>
        </div>

        {/* Gráficos */}
        <CategoryChart transactions={transactions} currentMonth={selectedMonth} investments={investments} />

        {/* Metas primeiro como estava no print */}
        <GoalList goals={goals} onAdd={() => setShowGoalForm(true)} onRefresh={handleAfterAdd} />

        {/* Investimentos */}
        <InvestmentPortfolio investments={investments} onAdd={() => setShowInvestForm(true)} onRefresh={handleAfterAdd} />

        {/* Botão de Compartilhar */}
        <ShareSummary 
          summary={{ totalIncome: monthIncome, totalExpense: monthExpense }} 
          transactions={monthTransactions} 
          goals={goals} 
          userName={user.name} 
        />

        {/* Insights IA */}
        <AIInsights transactions={monthTransactions} goals={goals} />

        {/* Lista de Transações com Cabeçalho completo */}
        <div className="space-y-4">
          <div className="px-5 flex justify-between items-end">
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm text-slate-900 tracking-tight uppercase">Transações do Mês</h3>
              <button className="p-1 text-slate-300 hover:text-indigo-600 transition-colors">
                <Search size={14} />
              </button>
            </div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{monthTransactions.length} registros</span>
          </div>
          <TransactionList 
            transactions={monthTransactions} 
            onDelete={() => fetchData()} 
            onEdit={(t) => { setFormType(t.type); fetchData(); }} 
          />
        </div>
      </main>

      {/* Botão Flutuante */}
      <motion.button 
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => { setFormType('expense'); setShowForm(true); }} 
        className="fixed bottom-8 right-8 w-14 h-14 bg-slate-900 text-white rounded-2xl shadow-2xl z-50 flex items-center justify-center transition-colors"
      >
        <Plus size={28} />
      </motion.button>

      <ChatAssistant transactions={transactions} goals={goals} />

      {/* Modais */}
      {showForm && (
        <TransactionForm
          initialType={formType}
          onSuccess={handleAfterAdd}
          onClose={() => setShowForm(false)}
          goals={goals}
          investments={investments}
          defaultDate={selectedMonth}
        />
      )}

      {showGoalForm && (
        <GoalForm onSuccess={handleAfterAdd} onClose={() => setShowGoalForm(false)} />
      )}

      {showInvestForm && (
        <InvestmentForm onSuccess={handleAfterAdd} onClose={() => setShowInvestForm(false)} />
      )}

      {showManager && <ManagerPanel onClose={() => setShowManager(false)} />}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}
