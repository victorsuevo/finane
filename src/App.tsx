import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Wallet, Save, Check, ChevronLeft, ChevronRight, LogOut, Crown } from 'lucide-react';
import { Transaction, Summary, Goal } from './types';
import { formatCurrency, cn } from './lib/utils';
import { format, subMonths, addMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';
import AIInsights from './components/AIInsights';
import CategoryChart from './components/CategoryChart';
import ChatAssistant from './components/ChatAssistant';
import Login from './components/Login';
import GoalList from './components/GoalList';
import GoalForm from './components/GoalForm';
import ShareSummary from './components/ShareSummary';
import ManagerPanel from './components/ManagerPanel';
import SettingsPanel from './components/SettingsPanel';
import ConfirmModal from './components/ConfirmModal';
import HelpModal from './components/HelpModal';
import { useAuth } from './contexts/AuthContext';

export default function App() {
  const { user, token, logout, isLoading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [summary, setSummary] = useState<Summary>({ totalIncome: 0, totalExpense: 0 });
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'income' | 'expense'>('expense');
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showManager, setShowManager] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));

  const handlePrevMonth = () => {
    setSelectedMonth(prev => format(subMonths(parseISO(`${prev}-01`), 1), 'yyyy-MM'));
  };

  const handleNextMonth = () => {
    setSelectedMonth(prev => format(addMonths(parseISO(`${prev}-01`), 1), 'yyyy-MM'));
  };

  const monthLabel = format(parseISO(`${selectedMonth}-01`), "MMMM 'de' yyyy", { locale: ptBR });

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const [tRes, sRes, gRes] = await Promise.all([
        fetch('/api/transactions', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/summary', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/goals', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      if (tRes.status === 401 || tRes.status === 403) {
        logout();
        return;
      }
      const tData = await tRes.json();
      const sData = await sRes.json();
      const gData = await gRes.json();
      setTransactions(Array.isArray(tData) ? tData : []);
      setSummary(sData || { totalIncome: 0, totalExpense: 0 });
      setGoals(Array.isArray(gData) ? gData : []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  }, [token, logout]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    setSaveStatus('saving');
    await fetchData();
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const handleAfterAdd = async () => {
    setSaveStatus('saving');
    await fetchData();
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const executeDelete = async () => {
    if (!deleteId) return;
    try {
      await fetch(`/api/transactions/${deleteId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setDeleteId(null);
      await handleAfterAdd();
    } catch (error) {
      console.error('Erro ao deletar:', error);
    }
  };

  const globalBalance = ((summary?.totalIncome || 0) - (summary?.totalExpense || 0));
  const monthTransactions = (transactions || []).filter(t => t?.date?.startsWith(selectedMonth));
  const monthIncome = monthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const monthExpense = monthTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const monthBalance = monthIncome - monthExpense;

  if (authLoading) return null;
  if (!user) return <Login />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-purple-100">
      <header className="fixed top-0 inset-x-0 h-16 bg-white/80 backdrop-blur-md z-40 px-6 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowSettings(true)} className="w-8 h-8 bg-purple-600 hover:bg-purple-700 transition-colors rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20 cursor-pointer">
            <Wallet className="text-white" size={18} />
          </button>
          <h1 className="font-black text-lg tracking-tight uppercase">SUEVO</h1>
          <button onClick={() => setShowHelp(true)} className="w-6 h-6 flex items-center justify-center rounded-full border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all ml-1">
            <span className="text-xs font-black">?</span>
          </button>
        </div>
        <div className="flex items-center gap-3">
          <motion.button whileTap={{ scale: 0.95 }} onClick={handleSave} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors text-slate-600">
            <AnimatePresence mode="wait">
              {saveStatus === 'saved' ? (
                <motion.span key="saved" initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1 text-emerald-600 text-[10px] font-black uppercase tracking-widest">
                  <Check size={12} /> Salvo
                </motion.span>
              ) : saveStatus === 'saving' ? (
                <motion.span key="saving" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Salvando...</motion.span>
              ) : (
                <motion.span key="idle" className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest">
                  <Save size={12} /> Salvar
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
          {user.is_manager && (
            <button onClick={() => setShowManager(true)} className="w-8 h-8 bg-amber-100 hover:bg-amber-200 rounded-full flex items-center justify-center transition-colors">
              <Crown size={16} className="text-amber-600" />
            </button>
          )}
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-slate-900 leading-none">{user.name}</span>
            <button onClick={logout} className="text-[9px] font-bold text-rose-500 hover:text-rose-600 uppercase tracking-tighter flex items-center gap-0.5">
              <LogOut size={8} /> Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto pt-24 pb-12 space-y-6">
        <div className="px-5">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1">Saldo do Mês</p>
          <h2 className={cn("text-4xl font-black tracking-tighter leading-none transition-colors", monthBalance >= 0 ? "text-slate-900" : "text-rose-600")}>
            {monthBalance > 0 && "+ "}{formatCurrency(monthBalance)}
          </h2>
        </div>

        <div className="px-5 flex items-center justify-between">
          <button onClick={handlePrevMonth} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
            <ChevronLeft size={18} className="text-slate-600" />
          </button>
          <div className="font-bold text-sm text-slate-800 capitalize tracking-wide">{monthLabel}</div>
          <button onClick={handleNextMonth} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
            <ChevronRight size={18} className="text-slate-600" />
          </button>
        </div>

        <div className="px-5 grid grid-cols-2 gap-3">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => { setFormType('income'); setShowForm(true); }} className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100/50 cursor-pointer">
            <p className="text-[10px] text-emerald-600 font-bold uppercase mb-1">Entradas</p>
            <p className="text-lg font-bold text-emerald-700 font-mono">+ {formatCurrency(monthIncome)}</p>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => { setFormType('expense'); setShowForm(true); }} className="bg-rose-50 p-4 rounded-2xl border border-rose-100/50 cursor-pointer">
            <p className="text-[10px] text-rose-600 font-bold uppercase mb-1">Saídas</p>
            <p className="text-lg font-bold text-rose-700 font-mono">- {formatCurrency(monthExpense)}</p>
          </motion.div>
        </div>

        <CategoryChart transactions={transactions} currentMonth={selectedMonth} />

        <GoalList goals={goals} onAdd={() => setShowGoalForm(true)} onRefresh={handleAfterAdd} />

        <ShareSummary summary={{ totalIncome: monthIncome, totalExpense: monthExpense }} transactions={monthTransactions} goals={goals} userName={user.name} />

        <AIInsights transactions={monthTransactions} goals={goals} />

        <div className="space-y-4 pb-24">
          <div className="px-5 flex justify-between items-end">
            <h3 className="font-bold text-sm text-slate-900 tracking-tight">Transações do Mês</h3>
            <span className="text-[10px] text-slate-400 font-bold">
              {monthTransactions.length} registros
            </span>
          </div>
          <TransactionList transactions={monthTransactions} onDelete={(id) => setDeleteId(id)} onEdit={(t) => { setEditTx(t); setFormType(t.type); setShowForm(true); }} />
        </div>
      </main>

      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { setFormType('expense'); setShowForm(true); }} className="fixed bottom-8 right-8 w-14 h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl shadow-2xl z-50 flex items-center justify-center transition-colors">
        <Plus size={28} />
      </motion.button>

      <ChatAssistant transactions={transactions} goals={goals} />

      {showForm && (
        <TransactionForm
          initialType={formType}
          editTransaction={editTx}
          defaultDate={selectedMonth}
          goals={goals}
          onSuccess={() => { handleAfterAdd(); setShowForm(false); }}
          onClose={() => { setShowForm(false); setEditTx(null); }}
        />
      )}

      {showGoalForm && (
        <GoalForm onSuccess={() => { handleAfterAdd(); setShowGoalForm(false); }} onClose={() => setShowGoalForm(false)} />
      )}

      {showManager && <ManagerPanel onClose={() => setShowManager(false)} />}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={executeDelete}
        title="Excluir Transação?"
        message="Tem certeza que deseja remover este registro?"
      />

      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}
