import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, BarChart3, Trash2, Crown, Shield, X, ChevronUp, ChevronDown,
  TrendingUp, Database, UserCheck
} from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

interface UserRecord {
  id: number;
  name: string;
  email: string;
  is_manager: number | boolean;
}

interface Stats {
  users: number;
  transactions: number;
  goals: number;
  totalVolume: number;
}

export default function ManagerPanel({ onClose }: { onClose: () => void }) {
  const { token } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [uRes, sRes] = await Promise.all([
        fetch('/api/manager/users', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/manager/stats', { headers: { 'Authorization': `Bearer ${token}` } }),
      ]);
      setUsers(await uRes.json());
      setStats(await sRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handlePromote = async (id: number, promote: boolean) => {
    await fetch(`/api/manager/users/${id}/promote`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ is_manager: promote }),
    });
    fetchData();
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Deletar usuário "${name}" e todos os seus dados?`)) return;
    await fetch(`/api/manager/users/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    fetchData();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white w-full max-w-2xl rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Crown size={20} className="text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Painel do Gestor</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Administração SUEVO</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={22} className="text-slate-400" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-6">
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Usuários', value: stats.users, icon: <Users size={16} />, color: 'text-purple-600 bg-purple-50' },
                { label: 'Transações', value: stats.transactions, icon: <BarChart3 size={16} />, color: 'text-emerald-600 bg-emerald-50' },
                { label: 'Metas', value: stats.goals, icon: <TrendingUp size={16} />, color: 'text-indigo-600 bg-indigo-50' },
                { label: 'Volume Total', value: formatCurrency(stats.totalVolume), icon: <Database size={16} />, color: 'text-amber-600 bg-amber-50' },
              ].map(s => (
                <div key={s.label} className="bg-slate-50 rounded-2xl p-4 space-y-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.color}`}>
                    {s.icon}
                  </div>
                  <p className="text-lg font-black text-slate-900">{s.value}</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Users Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">
              Usuários Cadastrados ({users.length})
            </h3>
            {loading ? (
              <div className="text-center py-8 text-slate-300">Carregando...</div>
            ) : (
              <div className="space-y-2">
                {users.map(u => {
                  const isManager = !!(u.is_manager);
                  return (
                    <div key={u.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isManager ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-black ${isManager ? 'bg-amber-200 text-amber-800' : 'bg-slate-200 text-slate-600'}`}>
                          {u.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-black text-slate-900">{u.name}</p>
                            {isManager && (
                              <span className="text-[8px] font-black bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 uppercase">
                                <Crown size={8} /> Gestor
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePromote(u.id, !isManager)}
                          title={isManager ? 'Rebaixar' : 'Promover a Gestor'}
                          className={`p-2 rounded-xl transition-colors text-xs font-bold ${isManager ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
                        >
                          {isManager ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                        </button>
                        <button
                          onClick={() => handleDelete(u.id, u.name)}
                          className="p-2 bg-rose-50 text-rose-400 hover:bg-rose-100 hover:text-rose-600 rounded-xl transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Setup tip */}
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-4">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">💡 Dica do Gestor</p>
            <p className="text-xs text-slate-500">
              Para promover o primeiro gestor via API, use:<br />
              <code className="text-[10px] font-mono bg-white px-1 rounded">POST /api/manager/setup</code> com o body <code className="text-[10px] font-mono bg-white px-1 rounded">{`{"secret":"suevo-manager-2025"}`}</code>
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
