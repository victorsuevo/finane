import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Wallet, LogOut, ChevronLeft, ChevronRight, Save, Check } from 'lucide-react';
import { Transaction, Goal } from './types';
import { formatCurrency, cn } from './lib/utils';
import { format, subMonths, addMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import TransactionList from './components/TransactionList';
import CategoryChart from './components/CategoryChart';
import AIInsights from './components/AIInsights';
import Login from './components/Login';
import TransactionForm from './components/TransactionForm';
import { useAuth } from './contexts/AuthContext';

export default function App() {
  const { user, token, logout, isLoading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [showForm, setShowForm] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const [tRes, gRes] = await Promise.all([
        fetch('/api/transactions', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/goals', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      const tData = await tRes.json();
      const gData = await gRes.json();
      setTransactions(Array.isArray(tData) ? tData : []);
      setGoals(Array.isArray(gData) ? gData : []);
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
  const monthIncome = monthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const monthExpense = monthTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const monthBalance = monthIncome - monthExpense;

  if (authLoading) return null;
  if (!user) return <Login />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="fixed top-0 inset-x-0 h-16 bg-white/80 backdrop-blur-md z-40 px-6 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Wallet className="text-white" size={18} />
          </div>
          <h1 className="font-black text-lg tracking-tight uppercase">SUEVO</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleAfterAdd} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors text-slate-600">
            {saveStatus === 'saved' ? <span className="text-emerald-600 text-[10px] font-black uppercase"><Check size={12} /> Salvo</span> : 
             saveStatus === 'saving' ? <span className="text-[10px] font-black uppercase text-slate-400">Salvando...</span> :
             <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest"><Save size={12} /> Salvar</span>}
          </button>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-slate-900 leading-none">{user.name}</span>
            <button onClick={logout} className="text-[9px] font-bold text-rose-500 hover:text-rose-600 uppercase tracking-tighter">
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto pt-24 pb-12 space-y-6">
        <div className="px-5">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1">Saldo do Mês</p>
          <h2 className={cn("text-4xl font-black tracking-tighter leading-none", monthBalance >= 0 ? "text-slate-900" : "text-rose-600")}>
            {formatCurrency(monthBalance)}
          </h2>
        </div>

        <div className="px-5 flex items-center justify-between">
          <button onClick={handlePrevMonth} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50">
            <ChevronLeft size={18} />
          </button>
          <div className="font-bold text-sm text-slate-800 capitalize">
            {format(parseISO(`${selectedMonth}-01`), "MMMM 'de' yyyy", { locale: ptBR })}
          </div>
          <button onClick={handleNextMonth} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50">
            <ChevronRight size={18} />
          </button>
        </div>

        <CategoryChart transactions={transactions} currentMonth={selectedMonth} />

        <AIInsights transactions={monthTransactions} goals={goals} />

        <div className="space-y-4 pb-24">
          <div className="px-5 flex justify-between items-end">
            <h3 className="font-bold text-sm text-slate-900 tracking-tight">Transações</h3>
            <span className="text-[10px] text-slate-400 font-bold">{monthTransactions.length} registros</span>
          </div>
          <TransactionList transactions={monthTransactions} onDelete={() => {}} onEdit={() => {}} />
        </div>
      </main>

      <motion.button 
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowForm(true)} 
        className="fixed bottom-8 right-8 w-14 h-14 bg-slate-900 text-white rounded-2xl shadow-2xl z-50 flex items-center justify-center"
      >
        <Plus size={28} />
      </motion.button>

      {showForm && (
        <TransactionForm
          onSuccess={() => { handleAfterAdd(); setShowForm(false); }}
          onClose={() => setShowForm(false)}
          goals={goals}
        />
      )}
    </div>
  );
}
