import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Store,
  UserCheck,
} from 'lucide-react';
import { authenticateWithEmailPassword, REAL_PROFILES } from '../lib/auth';
import { User } from '../types';

interface LoginProps {
  onLoginSuccess?: (user: User) => void;
  onLoginSucesso?: (user?: User) => void;
  theme?: 'dark' | 'light';
  lockoutMessage?: string | null;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, onLoginSucesso, theme = 'dark', lockoutMessage }) => {
  const [email, setEmail] = useState<string>('victorabreu528@gmail.com');
  const [password, setPassword] = useState<string>('vma2026');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(lockoutMessage || null);

  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    if (!email.trim()) {
      setErrorMessage('Por favor, selecione ou informe o seu e-mail corporativo.');
      return;
    }

    if (!password.trim()) {
      setErrorMessage('Acesso Bloqueado: A senha de acesso é estritamente obrigatória e não pode ficar em branco.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await authenticateWithEmailPassword(email, password);
      if (result.success && result.user) {
        if (onLoginSuccess) onLoginSuccess(result.user);
        if (onLoginSucesso) onLoginSucesso(result.user);
      } else {
        setErrorMessage(result.error || 'Acesso Bloqueado: Credenciais inválidas. Verifique sua palavra-passe.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro inesperado ao conectar ao serviço de autenticação.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectQuickUser = (profileEmail: string, profileName: string) => {
    setEmail(profileEmail);
    setPassword('');
    setErrorMessage(null);
    setInfoMessage(`Operador "${profileName}" selecionado. Digite obrigatoriamente a sua senha para liberar o sistema.`);
    // Focus password field
    const pwdInput = document.getElementById('login-password');
    if (pwdInput) pwdInput.focus();
  };

  const isLight = theme === 'light';

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-200 ${
        isLight ? 'bg-slate-100 text-slate-900' : 'bg-[#0a0d14] text-zinc-100'
      }`}
    >
      <div className="w-full max-w-md">
        {/* Main Card */}
        <div
          className={`rounded-2xl border shadow-2xl overflow-hidden transition-all duration-200 ${
            isLight
              ? 'bg-white border-slate-200 shadow-slate-300/40'
              : 'bg-[#111620] border-zinc-800 shadow-black/80'
          }`}
        >
          {/* Header */}
          <div
            className={`p-6 text-center border-b ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0d131d] border-zinc-800'
            }`}
          >
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 text-zinc-950 font-black mb-3 shadow-lg shadow-emerald-500/20">
              <Store className="w-7 h-7 text-zinc-950" />
            </div>
            <h1
              className={`text-xl font-black tracking-tight ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}
            >
              VMA Comercial Lda
            </h1>
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mt-0.5">
              KwanzaPOS • Saurimo, Angola
            </p>
            <p className={`text-xs mt-1.5 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              Sistema de Ponto de Venda & Gestão de Acesso Seguro
            </p>
          </div>

          {/* Form Area */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Error Message */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-start gap-2.5 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="font-medium leading-relaxed">{errorMessage}</div>
              </div>
            )}

            {/* Info Message when operator selected */}
            {infoMessage && (
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-xs flex items-start gap-2">
                <Shield className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
                <div className="font-medium leading-relaxed">{infoMessage}</div>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="login-email"
                className={`text-xs font-bold uppercase tracking-wider ${
                  isLight ? 'text-slate-700' : 'text-zinc-300'
                }`}
              >
                E-mail Corporativo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@vma.co.ao"
                  className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400'
                      : 'bg-[#0a0d14] border-zinc-700 text-zinc-100 placeholder:text-zinc-500'
                  }`}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="login-password"
                className={`text-xs font-bold uppercase tracking-wider ${
                  isLight ? 'text-slate-700' : 'text-zinc-300'
                }`}
              >
                Senha de Acesso
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400'
                      : 'bg-[#0a0d14] border-zinc-700 text-zinc-100 placeholder:text-zinc-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-200"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-emerald-700/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Validando Credenciais...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Entrar no KwanzaPOS</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Real Profiles Selector for seamless validation */}
          <div
            className={`p-5 border-t text-xs ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0e131b] border-zinc-800'
            }`}
          >
            <div className="flex items-center justify-between mb-2.5">
              <span
                className={`font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5 ${
                  isLight ? 'text-slate-700' : 'text-zinc-300'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Operadores Registrados na VMA:</span>
              </span>
              <span className="text-[10px] text-zinc-400">Clique para preencher</span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {REAL_PROFILES.map((p) => {
                const isSelected = email.toLowerCase() === p.email.toLowerCase();
                const roleBadgeColor =
                  p.role === 'ADMINISTRADOR'
                    ? 'bg-purple-950/40 text-purple-400 border-purple-800'
                    : p.role === 'GERENTE'
                    ? 'bg-blue-950/40 text-blue-400 border-blue-800'
                    : 'bg-emerald-950/40 text-emerald-400 border-emerald-800';

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectQuickUser(p.email, p.name)}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? isLight
                          ? 'bg-emerald-50 border-emerald-400 text-slate-900 shadow-sm'
                          : 'bg-[#15231c] border-emerald-500 text-white'
                        : isLight
                        ? 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
                        : 'bg-[#111620] border-zinc-800 hover:border-zinc-700 text-zinc-300'
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1.5 text-xs">
                        <span>{p.name}</span>
                        {isSelected && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                      </div>
                      <div className="text-[11px] text-zinc-400 font-mono">{p.email}</div>
                    </div>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${roleBadgeColor}`}
                    >
                      {p.role}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Security Notice */}
            <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                <span>Autenticação Criptografada Supabase Auth / SHA-256</span>
              </span>
              <span>Saurimo, AO</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
