import { useState, useEffect, useCallback } from 'react';
import { Plus, Wallet, LogOut } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import Login from './components/Login';

export default function App() {
  const { user, token, logout, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  if (authLoading) return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white font-black uppercase tracking-widest text-xs">
      Carregando...
    </div>
  );
  
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
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-slate-900 leading-none">{user.name}</span>
            <button onClick={logout} className="text-[9px] font-bold text-rose-500 hover:text-rose-600 uppercase tracking-tighter flex items-center gap-0.5">
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto pt-24 pb-12 space-y-6 flex flex-col items-center justify-center">
        <div className="px-5 py-20 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm text-center">
          <h2 className="text-xl font-black text-slate-900 mb-2">MODO DE SEGURANÇA</h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
            O núcleo foi carregado com sucesso.
          </p>
        </div>
      </main>
    </div>
  );
}
