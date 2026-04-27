import React, { useState, useEffect } from 'react';
import { Mail, Lock, User, Wallet, ArrowRight, Loader2, Eye, EyeOff, Fingerprint } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getApiUrl } from '../lib/api';
import { NativeBiometric } from 'capacitor-native-biometric';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const { login: authLogin } = useAuth();

  useEffect(() => {
    const checkBiometric = async () => {
      try {
        const result = await NativeBiometric.isAvailable();
        if (result.isAvailable) {
          setBiometricAvailable(true);
        }
      } catch (e) {
        console.log('Biometria não disponível neste dispositivo');
      }
    };
    checkBiometric();
  }, []);

  const handleBiometricLogin = async () => {
    try {
      await NativeBiometric.verifyIdentity({
        reason: "Acesse sua conta SUEVO",
        title: "Autenticação Biométrica",
        subtitle: "Use sua digital ou reconhecimento facial",
        description: "Confirme sua identidade para entrar",
      });
      
      const credentials = await NativeBiometric.getCredentials({
        server: "suevo.app"
      });
      
      if (credentials) {
        setLoading(true);
        const res = await fetch(getApiUrl('/api/auth/login'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: credentials.username, password: credentials.password }),
        });

        const data = await res.json();
        if (res.ok) {
          authLogin(data.token, data.user);
        } else {
          setError(data.error || 'Erro no login biométrico');
        }
        setLoading(false);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code !== "USER_CANCELED") {
        setError('Biometria falhou ou não configurada.');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const body = isLogin ? { email, password } : { name, email, password };

      const res = await fetch(getApiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok) {
        // Se o login manual deu certo e biometria está disponível, salvamos as credenciais
        if (isLogin && biometricAvailable) {
          try {
            await NativeBiometric.setCredentials({
              username: email,
              password: password,
              server: "suevo.app"
            });
          } catch (e) {
            console.error("Erro ao salvar credenciais biométricas:", e);
          }
        }
        authLogin(data.token, data.user);
      } else {
        setError(data.error || 'Erro ao processar solicitação');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-10">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/20 mb-6">
            <Wallet className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">SUEVO</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Gestão Financeira Inteligente</p>
        </div>

        <div className="flex p-1 bg-slate-100 rounded-2xl mb-8">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${
              isLogin ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 opacity-60'
            }`}
          >
            Entrar
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${
              !isLogin ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 opacity-60'
            }`}
          >
            Criar Conta
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
                <input
                  required
                  type="text"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
              <input
                required
                type="email"
                placeholder="exemplo@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
              <input
                required
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-12 text-sm font-bold text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-center border border-rose-100">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-[1.5rem] shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50 uppercase tracking-widest text-xs"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : (
                <>
                  {isLogin ? 'Acessar Conta' : 'Criar minha conta'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            {isLogin && biometricAvailable && (
              <button
                type="button"
                onClick={handleBiometricLogin}
                disabled={loading}
                className="w-16 bg-slate-100 hover:bg-slate-200 text-indigo-600 rounded-[1.5rem] flex items-center justify-center shadow-sm transition-all disabled:opacity-50"
                title="Login Biométrico"
              >
                <Fingerprint size={28} />
              </button>
            )}
          </div>
        </form>

        <p className="mt-10 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          SUEVO Financial &copy; 2026
        </p>
      </div>
    </div>
  );
}
