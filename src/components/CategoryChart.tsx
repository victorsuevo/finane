import { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, PieChart, Pie, AreaChart, Area,
  CartesianGrid, Legend
} from 'recharts';
import { Transaction, Investment } from '../types';
import { format, subMonths, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, BarChart3, LineChart as LineIcon, PieChart as PieIcon, AreaChart as AreaIcon, Wallet } from 'lucide-react';

interface Props {
  transactions: Transaction[];
  currentMonth: string;
  investments: Investment[];
}

const COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#14b8a6', '#f43f5e', '#06b6d4'];

export default function CategoryChart({ transactions = [], currentMonth, investments = [] }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);

  const currentMonthDate = useMemo(() => {
    try {
      const d = parseISO(`${currentMonth}-01`);
      return isValid(d) ? d : new Date();
    } catch {
      return new Date();
    }
  }, [currentMonth]);

  const monthExpenseData = useMemo(() => {
    const totalIncome = (transactions || [])
      .filter(t => t?.type === 'income' && t?.date?.startsWith(currentMonth))
      .reduce((s, t) => s + t.amount, 0);

    const expenses = (transactions || [])
      .filter(t => t?.type === 'expense' && t?.date?.startsWith(currentMonth) && !t.investment_id)
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(expenses)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions, currentMonth]);

  const investmentDistribution = useMemo(() => {
    const dist = (investments || []).reduce((acc, inv) => {
      const typeLabel = {
        'renda_fixa': 'Renda Fixa',
        'renda_variavel': 'Variável',
        'cripto': 'Cripto',
        'reserva': 'Reserva'
      }[inv.type] || inv.type;
      
      acc[typeLabel] = (acc[typeLabel] || 0) + inv.current_amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(dist).map(([name, value]) => ({ name, value }));
  }, [investments]);

  const evolutionData = useMemo(() => {
    const months = Array.from({ length: 6 }).map((_, i) => {
      const d = subMonths(currentMonthDate, 5 - i);
      return format(d, 'yyyy-MM');
    });

    return months.map(m => {
      const monthTxs = (transactions || []).filter(t => t?.date?.startsWith(m));
      const income = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expense = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      
      let label = m;
      try {
        label = format(parseISO(`${m}-01`), 'MMM', { locale: ptBR });
      } catch {}

      return { month: m, label, income, expense, balance: income - expense };
    });
  }, [transactions, currentMonthDate]);

  const areaData = useMemo(() => {
    let cumulative = 0;
    const sortedTxs = [...(transactions || [])].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    
    const monthMap = {} as Record<string, number>;
    sortedTxs.forEach(t => {
      if (!t?.date || t.date.length < 7) return;
      const m = t.date.substring(0, 7);
      const val = t.type === 'income' ? t.amount : -t.amount;
      monthMap[m] = (monthMap[m] || 0) + val;
    });

    const months = Object.keys(monthMap).sort();
    const recentMonths = months.slice(-8);
    const currentInvestTotal = (investments || []).reduce((acc, inv) => acc + (inv.current_amount || 0), 0);

    return recentMonths.map(m => {
      cumulative += monthMap[m];
      let name = m;
      try {
        name = format(parseISO(`${m}-01`), 'MMM', { locale: ptBR });
      } catch {}

      return { name, saldo: cumulative + currentInvestTotal };
    });
  }, [transactions, investments]);

  const charts = [
    {
      id: 'bar',
      title: 'Gastos por Categoria',
      subtitle: 'Despesas do mês atual',
      icon: <BarChart3 size={16} />,
      render: () => (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthExpenseData} layout="vertical" margin={{ left: 10, right: 20 }}>
            <XAxis type="number" hide />
            <YAxis 
              dataKey="name" 
              type="category" 
              width={80} 
              axisLine={false} 
              tickLine={false}
              tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
            />
            <Tooltip 
              cursor={{ fill: 'transparent' }}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', backgroundColor: 'rgba(15, 23, 42, 0.95)', color: '#fff' }}
              itemStyle={{ color: '#fff' }}
              labelStyle={{ color: '#fff' }}
              formatter={(value: number) => [value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 'Gasto']}
            />
            <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={12} activeBar={false}>
              {monthExpenseData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )
    },
    {
      id: 'invest_pie',
      title: 'Carteira de Ativos',
      subtitle: 'Composição dos investimentos',
      icon: <Wallet size={16} />,
      render: () => (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={investmentDistribution}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              paddingAngle={5}
              dataKey="value"
            >
              {investmentDistribution.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
            </Pie>
            <Tooltip 
              cursor={{ fill: 'transparent' }}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', backgroundColor: 'rgba(15, 23, 42, 0.95)', color: '#fff' }}
              itemStyle={{ color: '#fff' }}
              labelStyle={{ color: '#fff' }}
              formatter={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            />
            <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '9px', fontWeight: 600 }} />
          </PieChart>
        </ResponsiveContainer>
      )
    },
    {
      id: 'line',
      title: 'Evolução Mensal',
      subtitle: 'Entradas vs Saídas (6 meses)',
      icon: <LineIcon size={16} />,
      render: () => (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={evolutionData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600 }} />
            <YAxis hide />
            <Tooltip 
              cursor={{ stroke: 'transparent' }}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', backgroundColor: 'rgba(15, 23, 42, 0.95)', color: '#fff' }}
              itemStyle={{ color: '#fff' }}
              labelStyle={{ color: '#fff' }}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 700, paddingTop: '10px' }} />
            <Line type="monotone" dataKey="income" name="Entradas" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} />
            <Line type="monotone" dataKey="expense" name="Saídas" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: '#ef4444' }} />
          </LineChart>
        </ResponsiveContainer>
      )
    },
    {
      id: 'area',
      title: 'Patrimônio Total',
      subtitle: 'Saldo + Investimentos',
      icon: <AreaIcon size={16} />,
      render: () => (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={areaData}>
            <defs>
              <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600 }} />
            <Tooltip 
              cursor={{ stroke: 'transparent' }}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', backgroundColor: 'rgba(15, 23, 42, 0.95)', color: '#fff' }}
              itemStyle={{ color: '#fff' }}
              labelStyle={{ color: '#fff' }}
              formatter={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            />
            <Area type="monotone" dataKey="saldo" name="Patrimônio" stroke="#6366f1" fillOpacity={1} fill="url(#colorSaldo)" strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
      )
    },
    {
      id: 'composition',
      title: 'Composição Mensal',
      subtitle: 'Entradas e Saídas empilhadas',
      icon: <BarChart3 size={16} />,
      render: () => (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={evolutionData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600 }} />
            <YAxis hide />
            <Tooltip 
              cursor={{ fill: 'transparent' }}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', backgroundColor: 'rgba(15, 23, 42, 0.95)', color: '#fff' }}
              itemStyle={{ color: '#fff' }}
              labelStyle={{ color: '#fff' }}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 700, paddingTop: '10px' }} />
            <Bar dataKey="income" name="Entradas" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} activeBar={false} />
            <Bar dataKey="expense" name="Saídas" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} activeBar={false} />
          </BarChart>
        </ResponsiveContainer>
      )
    }
  ];

  const nextChart = () => setActiveIndex((prev) => (prev + 1) % charts.length);
  const prevChart = () => setActiveIndex((prev) => (prev - 1 + charts.length) % charts.length);

  return (
    <div className="mx-5 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden relative group">
      <div className="p-6 pb-2 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-indigo-600 dark:text-indigo-400">{charts[activeIndex].icon}</span>
            <h3 className="font-black text-sm text-slate-900 dark:text-white tracking-tight uppercase">
              {charts[activeIndex].title}
            </h3>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">
            {charts[activeIndex].subtitle}
          </p>
        </div>
        
        <div className="flex items-center gap-1.5">
          <button 
            onClick={prevChart}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          <button 
            onClick={nextChart}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="h-64 px-4 pb-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="h-full w-full"
          >
            {charts[activeIndex].render()}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex justify-center gap-1.5 pb-2">
        {charts.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === activeIndex ? 'w-6 bg-indigo-600' : 'w-1 bg-slate-200'
            }`}
          />
        ))}
      </div>

    </div>
  );
}
