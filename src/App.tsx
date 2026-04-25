import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Wallet, TrendingUp, TrendingDown, Crown, Save, Check } from 'lucide-react';
import { Transaction, Summary, Goal } from './types';
import { formatCurrency } from './lib/utils';
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
import { useAuth } from './contexts/AuthContext';
import { LogOut } from 'lucide-react';

export default function App() {
  const { user, token, logout, isLoading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [summary, setSummary] = useState<Summary>({ totalIncome: 0, totalExpense: 0 });
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'income' | 'expense'>('expense');
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showManager, setShowManager] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

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
    // Autosave: fetch fresh data immediately after any addition
    setSaveStatus('saving');
    await fetchData();
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch(`/api/transactions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      await handleAfterAdd();
    } catch (error) {
      console.error('Erro ao deletar:', error);
    }
  };

  const balance = (summary.totalIncome || 0) - (summary.totalExpense || 0);

  if (authLoading) return null;
  if (!user) return <Login />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-purple-100">
      {/* Header */}
      <header className="fixed top-0 inset-x-0 h-16 bg-white/80 backdrop-blur-md z-40 px-6 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Wallet className="text-white" size={18} />
          </div>
          <h1 className="font-black text-lg tracking-tight uppercase">SUEVO</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Save Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors text-slate-600"
          >
            <AnimatePresence mode="wait">
              {saveStatus === 'saved' ? (
                <motion.span key="saved" initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1 text-emerald-600 text-[10px] font-black uppercase tracking-widest">
                  <Check size={12} /> Salvo
                </motion.span>
              ) : saveStatus === 'saving' ? (
                <motion.span key="saving" className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Salvando...
                </motion.span>
              ) : (
                <motion.span key="idle" className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest">
                  <Save size={12} /> Salvar
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Manager button (only for managers) */}
          {user.is_manager && (
            <button
              onClick={() => setShowManager(true)}
              className="w-8 h-8 bg-amber-100 hover:bg-amber-200 rounded-full flex items-center justify-center transition-colors"
              title="Painel do Gestor"
            >
              <Crown size={16} className="text-amber-600" />
            </button>
          )}

          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-slate-900 leading-none">{user.name}</span>
            <button
              onClick={logout}
              className="text-[9px] font-bold text-rose-500 hover:text-rose-600 uppercase tracking-tighter flex items-center gap-0.5"
            >
              <LogOut size={8} /> Sair
            </button>
          </div>
          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
            <span className="text-purple-700 font-bold text-[10px]">
              {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto pt-24 pb-12 space-y-6">
        {/* Balance Section */}
        <div className="px-5">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Saldo Atual</p>
          <h2 className={`text-4xl font-bold tracking-tight ${balance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
            {formatCurrency(balance)}
          </h2>
        </div>

        {/* Summary Grid - Bento Style */}
        <div className="px-5 grid grid-cols-2 gap-3">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { setFormType('income'); setShowForm(true); }}
            className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100/50 cursor-pointer transition-all hover:shadow-lg hover:shadow-emerald-500/10"
          >
            <p className="text-[10px] text-emerald-600 font-bold uppercase mb-1">Entradas</p>
            <p className="text-lg font-bold text-emerald-700 font-mono">
              + {formatCurrency(summary.totalIncome || 0)}
            </p>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { setFormType('expense'); setShowForm(true); }}
            className="bg-rose-50 p-4 rounded-2xl border border-rose-100/50 cursor-pointer transition-all hover:shadow-lg hover:shadow-rose-500/10"
          >
            <p className="text-[10px] text-rose-600 font-bold uppercase mb-1">Saídas</p>
            <p className="text-lg font-bold text-rose-700 font-mono">
              - {formatCurrency(summary.totalExpense || 0)}
            </p>
          </motion.div>
        </div>

        <CategoryChart transactions={transactions} />

        <GoalList
          goals={goals}
          onAdd={() => setShowGoalForm(true)}
          onRefresh={handleAfterAdd}
        />

        <ShareSummary
          summary={summary}
          transactions={transactions}
          goals={goals}
          userName={user.name}
        />

        <AIInsights transactions={transactions} />

        {/* Transactions List */}
        <div className="space-y-4">
          <div className="px-5 flex justify-between items-end">
            <h3 className="font-bold text-sm text-slate-900 tracking-tight">Histórico por Mês</h3>
            <span className="text-[10px] text-slate-400 font-bold">
              {transactions.length} registros
            </span>
          </div>
          <TransactionList
            transactions={transactions}
            onDelete={handleDelete}
          />
        </div>
      </main>

      {/* Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => { setFormType('expense'); setShowForm(true); }}
        className="fixed bottom-8 right-8 w-14 h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl shadow-2xl z-50 flex items-center justify-center transition-colors"
      >
        <Plus size={28} />
      </motion.button>

      <ChatAssistant transactions={transactions} />

      {/* Forms Overlay */}
      {showForm && (
        <TransactionForm
          initialType={formType}
          goals={goals}
          onSuccess={() => {
            handleAfterAdd();
            setShowForm(false);
          }}
          onClose={() => setShowForm(false)}
        />
      )}

      {showGoalForm && (
        <GoalForm
          onSuccess={() => {
            handleAfterAdd();
            setShowGoalForm(false);
          }}
          onClose={() => setShowGoalForm(false)}
        />
      )}

      {showManager && (
        <ManagerPanel onClose={() => setShowManager(false)} />
      )}
    </div>
  );
}
