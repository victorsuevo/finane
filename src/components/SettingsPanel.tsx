import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Moon, Sun, DollarSign, User, Save } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getApiUrl } from '../lib/api';

interface Props {
  onClose: () => void;
}

export default function SettingsPanel({ onClose }: Props) {
  const { user, token, updateUser } = useAuth();
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('finane_theme') === 'dark');
  const [currency, setCurrency] = useState(() => localStorage.getItem('app_currency') || 'BRL');
  const [name, setName] = useState(user?.name || '');
  const [autoRegister, setAutoRegister] = useState(() => localStorage.getItem('suevo_auto_register') === 'true');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('finane_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('finane_theme', 'light');
    }
  }, [darkMode]);

  const handleSave = async () => {
    setLoading(true);
    try {
      // Rates relative to BRL (Example hardcoded, since live API might be complex)
      let rate = 1;
      if (currency === 'USD') rate = 5.0; // 1 USD = 5 BRL
      if (currency === 'CAD') rate = 3.7; // 1 CAD = 3.7 BRL
      
      localStorage.setItem('app_currency', currency);
      localStorage.setItem('app_currency_rate', rate.toString());
      localStorage.setItem('suevo_auto_register', autoRegister.toString());

      if (name !== user?.name) {
        // Need a profile update endpoint or just update local if no endpoint
        const res = await fetch(getApiUrl(`/api/users/profile`), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ name })
        });
        
        if (res.ok && user) {
          updateUser({ ...user, name });
        }
      }

      window.location.reload(); // Reload to apply currency format everywhere
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl"
      >
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <h2 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            Configurações
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Profile Name */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <User size={14} /> Nome do Perfil
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-3 rounded-xl outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Currency */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <DollarSign size={14} /> Moeda de Exibição
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-3 rounded-xl outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="BRL">Real Brasileiro (BRL) - Oficial</option>
              <option value="USD">Dólar Americano (USD) - Cotação ~R$ 5,00</option>
              <option value="CAD">Dólar Canadense (CAD) - Cotação ~R$ 3,70</option>
            </select>
            <p className="text-[10px] text-slate-400">
              O sistema continua salvando internamente em Reais. Isso apenas altera a exibição aproximada.
            </p>
          </div>

          {/* Theme */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              Aparência
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setDarkMode(false)}
                className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors ${!darkMode ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
              >
                <Sun size={16} /> Claro
              </button>
              <button
                onClick={() => setDarkMode(true)}
                className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors ${darkMode ? 'bg-purple-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
              >
                <Moon size={16} /> Escuro
              </button>
            </div>
          </div>

          {/* AI Settings */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              Assistente IA
            </label>
            <div 
              onClick={() => setAutoRegister(!autoRegister)}
              className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded-xl cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Auto-Lançamento</p>
                <p className="text-[10px] text-slate-500">Registrar gastos sem perguntar</p>
              </div>
              <div className={`w-10 h-5 rounded-full transition-colors relative ${autoRegister ? 'bg-purple-600' : 'bg-slate-400'}`}>
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${autoRegister ? 'right-1' : 'left-1'}`} />
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'Salvando...' : <><Save size={18} /> Salvar e Aplicar</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
