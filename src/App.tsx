import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Wallet, LogOut, ChevronLeft, ChevronRight, Save, Check, Crown, Search } from 'lucide-react';
import { Transaction, Goal, Investment } from './types';
import { formatCurrency, cn } from './lib/utils';
import { getApiUrl } from './lib/api';
import { format, subMonths, addMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import TransactionList from './components/TransactionList';
import CategoryChart from './components/CategoryChart';
import AIInsights from './components/AIInsights';
import Login from './components/Login';
import TransactionForm from './components/TransactionForm';
import GoalList from './components/GoalList';
import GoalForm from './components/GoalForm';
import InvestmentPortfolio from './components/InvestmentPortfolio';
import NotificationHandler from './components/NotificationHandler';
import InvestmentForm from './components/InvestmentForm';
import ManagerPanel from './components/ManagerPanel';
import SettingsPanel from './components/SettingsPanel';
import HelpModal from './components/HelpModal';
import ChatAssistant from './components/ChatAssistant';
import ShareSummary from './components/ShareSummary';
import HistoryModal from './components/HistoryModal';
import ConfirmModal from './components/ConfirmModal';
import { useAuth } from './contexts/AuthContext';

export default function App() {
  const { user, token, logout, isLoading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('suevo_cache_transactions');
    return saved ? JSON.parse(saved) : [];
  });
  const [goals, setGoals] = useState<Goal[]>(() => {
    const saved = localStorage.getItem('suevo_cache_goals');
    return saved ? JSON.parse(saved) : [];
  });
  const [investments, setInvestments] = useState<Investment[]>(() => {
    const saved = localStorage.getItem('suevo_cache_investments');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  
  // Modais
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'income' | 'expense'>('expense');
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showInvestForm, setShowInvestForm] = useState(false);
  const [showManager, setShowManager] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  // Edição
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [editInvest, setEditInvest] = useState<Investment | null>(null);
  const [deleteTx, setDeleteTx] = useState<Transaction | null>(null);
  
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Dark Mode Sync
  useEffect(() => {
    const isDark = localStorage.getItem('finane_theme') === 'dark';
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const [tRes, gRes, iRes] = await Promise.all([
        fetch(getApiUrl('/api/transactions'), { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(getApiUrl('/api/goals'), { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(getApiUrl('/api/investments'), { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      const tData = await tRes.json();
      const gData = await gRes.json();
      const iData = await iRes.json();
      
      const finalT = Array.isArray(tData) ? tData : [];
      const finalG = Array.isArray(gData) ? gData : [];
      const finalI = Array.isArray(iData) ? iData : [];

      setTransactions(finalT);
      setGoals(finalG);
      setInvestments(finalI);

      // Atualizar Cache Offline
      localStorage.setItem('suevo_cache_transactions', JSON.stringify(finalT));
      localStorage.setItem('suevo_cache_goals', JSON.stringify(finalG));
      localStorage.setItem('suevo_cache_investments', JSON.stringify(finalI));
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

  const handleDeleteTx = async () => {
    if (!deleteTx || !deleteTx.id) return;
    try {
      const res = await fetch(getApiUrl(`/api/transactions/${deleteTx.id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setDeleteTx(null);
        handleAfterAdd();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrevMonth = () => setSelectedMonth(prev => format(subMonths(parseISO(`${prev}-01`), 1), 'yyyy-MM'));
  const handleNextMonth = () => setSelectedMonth(prev => format(addMonths(parseISO(`${prev}-01`), 1), 'yyyy-MM'));

  const monthTransactions = transactions.filter(t => t && t.date && t.date.startsWith(selectedMonth));
  const monthIncome = monthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
  const monthExpense = monthTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
  const monthBalance = monthIncome - monthExpense;

  // Calculate historical balances for goals and investments
  // Logic: Initial_Balance = Current_Value (from DB) - Total_Transaction_Sum
  // Value_at_Month = Initial_Balance + Sum(Transactions UNTIL that month)
  
  const monthGoals = goals.map(g => {
    const totalTransactionsSum = transactions
      .filter(t => {
        if (!t) return false;
        const goalIdMatch = t.goal_id && Number(t.goal_id) === Number(g.id);
        const nameMatch = !t.goal_id && t.category && g.name && t.category.trim().toLowerCase() === g.name.trim().toLowerCase();
        return goalIdMatch || nameMatch;
      })
      .reduce((sum, t) => sum + (t.type === 'expense' ? (t.amount || 0) : -(t.amount || 0)), 0);
    
    const initialBalance = g.current_amount - totalTransactionsSum;
    
    const untilMonthTransactions = transactions
      .filter(t => {
        if (!t || !t.date) return false;
        const goalIdMatch = t.goal_id && Number(t.goal_id) === Number(g.id);
        const nameMatch = !t.goal_id && t.category && g.name && t.category.trim().toLowerCase() === g.name.trim().toLowerCase();
        const dateMatch = t.date.substring(0, 7) <= selectedMonth;
        return (goalIdMatch || nameMatch) && dateMatch;
      })
      .reduce((sum, t) => sum + (t.type === 'expense' ? (t.amount || 0) : -(t.amount || 0)), 0);

    return { ...g, current_amount: Math.max(0, initialBalance + untilMonthTransactions) };
  });

  const monthInvestments = investments.map(inv => {
    const totalTransactionsSum = transactions
      .filter(t => {
        if (!t) return false;
        const investIdMatch = t.investment_id && Number(t.investment_id) === Number(inv.id);
        const nameMatch = !t.investment_id && t.category && inv.name && t.category.trim().toLowerCase() === inv.name.trim().toLowerCase();
        return investIdMatch || nameMatch;
      })
      .reduce((sum, t) => sum + (t.type === 'expense' ? (t.amount || 0) : -(t.amount || 0)), 0);
    
    const initialBalance = inv.current_amount - totalTransactionsSum;
    
    const untilMonthTransactions = transactions
      .filter(t => {
        if (!t || !t.date) return false;
        const investIdMatch = t.investment_id && Number(t.investment_id) === Number(inv.id);
        const nameMatch = !t.investment_id && t.category && inv.name && t.category.trim().toLowerCase() === inv.name.trim().toLowerCase();
        const dateMatch = t.date.substring(0, 7) <= selectedMonth;
        return (investIdMatch || nameMatch) && dateMatch;
      })
      .reduce((sum, t) => sum + (t.type === 'expense' ? (t.amount || 0) : -(t.amount || 0)), 0);

    return { ...inv, current_amount: Math.max(0, initialBalance + untilMonthTransactions) };
  });

  const totalInvestments = monthInvestments.reduce((acc, inv) => acc + (inv.current_amount || 0), 0);
  
  // New: Monthly Investment Contribution (like Entrada/Saída)
  const monthInvestTotal = monthTransactions
    .filter(t => t && (t.investment_id != null || (t.type === 'expense' && investments.some(inv => inv.name && t.category && inv.name.trim().toLowerCase() === t.category.trim().toLowerCase()))))
    .reduce((s, t) => s + (t.amount || 0), 0);

  if (authLoading) return null;
  if (!user) return <Login />;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50 font-sans selection:bg-purple-100 pb-24 transition-colors duration-200">
      <NotificationHandler onRefresh={fetchData} />
      <header className="fixed top-0 inset-x-0 h-16 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md z-40 px-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowSettings(true)} 
            title="Configurações e Preferências"
            className="group relative w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20 active:scale-95 transition-all hover:ring-4 hover:ring-purple-500/20"
          >
            <Wallet className="text-white" size={18} />
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              Ajustes do App
            </span>
          </button>
          <h1 className="font-black text-lg tracking-tight uppercase">SUEVO</h1>
          <button onClick={() => setShowHelp(true)} className="w-5 h-5 flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-600 text-[10px] font-black text-slate-400 hover:text-indigo-600 transition-colors">?</button>
        </div>
        <div className="flex items-center gap-3">
          <motion.button whileTap={{ scale: 0.95 }} onClick={handleAfterAdd} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-slate-600 dark:text-slate-300">
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
            <button onClick={() => setShowManager(true)} className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 rounded-full flex items-center justify-center transition-colors">
              <Crown size={16} className="text-amber-600" />
            </button>
          )}
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold leading-none">{user.name}</span>
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
            <h2 className={cn("text-4xl font-black tracking-tighter leading-none transition-all", monthBalance >= 0 ? "text-slate-900 dark:text-white" : "text-rose-600")}>
              {monthBalance >= 0 ? "+" : ""} {formatCurrency(monthBalance)}
            </h2>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-slate-400 uppercase font-black tracking-tighter mb-1">Patrimônio Real</p>
            <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(totalInvestments + monthBalance)}</p>
          </div>
        </div>

        {/* Seletor de Mês */}
        <div className="px-5 flex items-center justify-between">
          <button onClick={handlePrevMonth} className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm active:scale-90">
            <ChevronLeft size={18} className="text-slate-600 dark:text-slate-400" />
          </button>
          <div className="font-bold text-sm text-slate-800 dark:text-slate-200 capitalize tracking-wide">
            {format(parseISO(`${selectedMonth}-01`), "MMMM 'de' yyyy", { locale: ptBR })}
          </div>
          <button onClick={handleNextMonth} className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm active:scale-90">
            <ChevronRight size={18} className="text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        {/* Cards de Resumo Coloridos */}
        <div className="px-5 grid grid-cols-3 gap-2">
          <motion.div 
            whileHover={{ scale: 1.02 }} 
            whileTap={{ scale: 0.98 }} 
            onClick={() => { setFormType('income'); setEditTx(null); setShowForm(true); }}
            className="bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-[1.5rem] border border-emerald-100/50 dark:border-emerald-900/30 cursor-pointer shadow-sm hover:shadow-md transition-all"
          >
            <p className="text-[8px] text-emerald-600 dark:text-emerald-400 font-black uppercase mb-1 tracking-widest">Entradas</p>
            <p className="text-sm font-black text-emerald-700 dark:text-emerald-300 tracking-tight">{formatCurrency(monthIncome)}</p>
          </motion.div>
          <motion.div 
            whileHover={{ scale: 1.02 }} 
            whileTap={{ scale: 0.98 }} 
            onClick={() => { setFormType('expense'); setEditTx(null); setShowForm(true); }}
            className="bg-rose-50 dark:bg-rose-950/30 p-3 rounded-[1.5rem] border border-rose-100/50 dark:border-rose-900/30 cursor-pointer shadow-sm hover:shadow-md transition-all"
          >
            <p className="text-[8px] text-rose-600 dark:text-rose-400 font-black uppercase mb-1 tracking-widest">Saídas</p>
            <p className="text-sm font-black text-rose-700 dark:text-rose-300 tracking-tight">{formatCurrency(monthExpense)}</p>
          </motion.div>
          <motion.div 
            whileHover={{ scale: 1.02 }} 
            whileTap={{ scale: 0.98 }} 
            onClick={() => { setEditInvest(null); setShowInvestForm(true); }}
            className="bg-indigo-50 dark:bg-indigo-950/30 p-3 rounded-[1.5rem] border border-indigo-100/50 dark:border-indigo-900/30 cursor-pointer shadow-sm hover:shadow-md transition-all"
          >
            <p className="text-[8px] text-indigo-600 dark:text-indigo-400 font-black uppercase mb-1 tracking-widest">Investido</p>
            <p className="text-sm font-black text-indigo-700 dark:text-indigo-300 tracking-tight">{formatCurrency(monthInvestTotal)}</p>
          </motion.div>
        </div>

        {/* Gráficos */}
        <CategoryChart transactions={transactions} currentMonth={selectedMonth} investments={monthInvestments} />

        {/* Metas */}
        <GoalList goals={monthGoals} onAdd={() => { setEditGoal(null); setShowGoalForm(true); }} onRefresh={handleAfterAdd} onEdit={(g) => { setEditGoal(g); setShowGoalForm(true); }} />

        {/* Investimentos */}
        <InvestmentPortfolio investments={monthInvestments} onAdd={() => { setEditInvest(null); setShowInvestForm(true); }} onRefresh={handleAfterAdd} onEdit={(inv) => { setEditInvest(inv); setShowInvestForm(true); }} />

        {/* Compartilhar */}
        <ShareSummary 
          currentMonth={selectedMonth}
          summary={{ 
            totalIncome: transactions.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0), 
            totalExpense: transactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0)
          }} 
          transactions={monthTransactions} 
          goals={monthGoals} 
          userName={user.name} 
        />

        {/* Insights IA */}
        <AIInsights transactions={monthTransactions} goals={monthGoals} userName={user.name} />

        {/* Lista de Transações */}
        <div className="space-y-4">
          <div className="px-5 flex justify-between items-end">
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm text-slate-900 dark:text-white tracking-tight uppercase">Transações do Mês</h3>
              <button onClick={() => setShowHistory(true)} className="p-1 text-slate-300 hover:text-indigo-600 transition-colors">
                <Search size={14} />
              </button>
            </div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{monthTransactions.length} registros</span>
          </div>
          <TransactionList 
            transactions={monthTransactions} 
            onDelete={(t) => setDeleteTx(t)} 
            onEdit={(t) => { setEditTx(t); setFormType(t.type); setShowForm(true); }} 
            totalIncome={monthIncome}
          />
        </div>
      </main>

      {/* Botão Flutuante */}
      <motion.button 
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => { setFormType('expense'); setEditTx(null); setShowForm(true); }} 
        className="fixed bottom-8 right-8 w-14 h-14 bg-indigo-600 dark:bg-indigo-500 text-white rounded-2xl shadow-2xl z-50 flex items-center justify-center transition-all active:rotate-90"
      >
        <Plus size={28} />
      </motion.button>

      <ChatAssistant transactions={transactions} goals={monthGoals} onRefresh={handleAfterAdd} />

      {/* Modais */}
      {showForm && (
        <TransactionForm
          initialType={formType}
          editTransaction={editTx}
          onSuccess={() => { handleAfterAdd(); setShowForm(false); setEditTx(null); }}
          onClose={() => { setShowForm(false); setEditTx(null); }}
          goals={goals}
          investments={investments}
          defaultDate={selectedMonth}
        />
      )}

      {showGoalForm && (
        <GoalForm editGoal={editGoal} onSuccess={() => { handleAfterAdd(); setShowGoalForm(false); }} onClose={() => setShowGoalForm(false)} />
      )}

      {showInvestForm && (
        <InvestmentForm editInvestment={editInvest} onSuccess={() => { handleAfterAdd(); setShowInvestForm(false); }} onClose={() => setShowInvestForm(false)} />
      )}

      {showManager && <ManagerPanel onClose={() => setShowManager(false)} />}
      {showSettings && <SettingsPanel onClose={() => { setShowSettings(false); fetchData(); }} />}
      {showHelp && <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />}
      {showHistory && <HistoryModal isOpen={showHistory} onClose={() => setShowHistory(false)} transactions={transactions} onNavigate={(monthKey) => { setSelectedMonth(monthKey); setShowHistory(false); }} />}

      <ConfirmModal
        isOpen={!!deleteTx}
        onClose={() => setDeleteTx(null)}
        onConfirm={handleDeleteTx}
        title="Excluir Transação"
        message={deleteTx && (deleteTx.installments > 1 || deleteTx.installment_ref) ? 'Tem certeza que deseja excluir esta série de parcelas? Todas as parcelas vinculadas a esta compra serão excluídas e o valor será revertido.' : 'Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.'}
        confirmLabel="Sim, Excluir"
      />
    </div>
  );
}
