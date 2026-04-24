import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Transaction } from '../types';
import { subDays, isAfter, parseISO } from 'date-fns';

interface Props {
  transactions: Transaction[];
}

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#ef4444', '#f97316', '#f59e0b', '#eab308'];

export default function CategoryChart({ transactions }: Props) {
  const chartData = useMemo(() => {
    const thirtyDaysAgo = subDays(new Date(), 30);
    
    const expensesByCategory = transactions
      .filter(t => t.type === 'expense' && isAfter(parseISO(t.date), thirtyDaysAgo))
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(expensesByCategory)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  if (chartData.length === 0) return null;

  return (
    <div className="mx-5 p-6 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
      <div>
        <h3 className="font-bold text-sm text-slate-900 tracking-tight">Gastos por Categoria</h3>
        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Últimos 30 dias</p>
      </div>

      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <XAxis type="number" hide />
            <YAxis 
              dataKey="name" 
              type="category" 
              width={80} 
              axisLine={false} 
              tickLine={false}
              tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }}
            />
            <Tooltip 
              cursor={{ fill: 'transparent' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-slate-900 text-white p-2 rounded-xl text-[10px] shadow-xl border border-white/10 font-bold">
                      {payload[0].value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar 
              dataKey="value" 
              radius={[0, 8, 8, 0]} 
              barSize={12}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
