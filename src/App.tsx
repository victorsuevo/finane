import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, Wallet, TrendingUp, TrendingDown, Bell } from 'lucide-react';
import { Transaction, Summary } from './types';
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
import { Goal } from './types';
import { useAuth } from './contexts/AuthContext';
import { LogOut } from 'lucide-react';

export default function App() {
  const { user, token, logout, isLoading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [summary, setSummary] = useState<Summary>({ totalIncome: 0, totalExpense: 0 });
  const [showForm, setShowForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
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
      setTransactions(tData);
      setSummary(sData || { totalIncome: 0, totalExpense: 0 });
      setGoals(gData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: number) => {
    try {
      await fetch(`/api/transactions/${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchData();
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
          <h1 className="font-black text-lg tracking-tight uppercase">FINANE</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-slate-900 leading-none">{user.name}</span>
            <button 
              onClick={logout}
              className="text-[9px] font-bold text-rose-500 hover:text-rose-600 uppercase tracking-tighter"
            >
              Sair
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
          <h2 className="text-4xl font-bold tracking-tight text-slate-900">
            {formatCurrency(balance)}
          </h2>
        </div>

        {/* Summary Grid - Bento Style */}
        <div className="px-5 grid grid-cols-2 gap-3">
          <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100/50">
            <p className="text-[10px] text-emerald-600 font-bold uppercase mb-1">Entradas</p>
            <p className="text-lg font-bold text-emerald-700 font-mono">
              + {formatCurrency(summary.totalIncome || 0)}
            </p>
          </div>
          <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100/50">
            <p className="text-[10px] text-rose-600 font-bold uppercase mb-1">Saídas</p>
            <p className="text-lg font-bold text-rose-700 font-mono">
              - {formatCurrency(summary.totalExpense || 0)}
            </p>
          </div>
        </div>

        <CategoryChart transactions={transactions} />

        <GoalList 
          goals={goals} 
          onAdd={() => setShowGoalForm(true)} 
        />

        <ShareSummary 
          summary={summary} 
          transactions={transactions} 
        />

        {/* AI Section - Re-styled as Bento component */}
        <AIInsights transactions={transactions} />

        {/* Transactions List */}
        <div className="space-y-4">
          <div className="px-5 flex justify-between items-end">
            <h3 className="font-bold text-sm text-slate-900 tracking-tight">Atividades Recentes</h3>
            <span className="text-[10px] text-purple-600 font-bold uppercase tracking-wider cursor-pointer">Ver Tudo</span>
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
        onClick={() => setShowForm(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl shadow-2xl z-50 flex items-center justify-center transition-colors"
      >
        <Plus size={28} />
      </motion.button>

      <ChatAssistant transactions={transactions} />

      {/* Forms Overlay */}
      {showForm && (
        <TransactionForm 
          onSuccess={() => {
            fetchData();
            setShowForm(false);
          }}
          onClose={() => setShowForm(false)}
        />
      )}

      {showGoalForm && (
        <GoalForm 
          onSuccess={() => {
            fetchData();
            setShowGoalForm(false);
          }}
          onClose={() => setShowGoalForm(false)}
        />
      )}
    </div>
  );
}
