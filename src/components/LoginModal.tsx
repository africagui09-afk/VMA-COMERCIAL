import React, { useState } from 'react';
import {
  AlertCircle,
  AlertOctagon,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { getStoredProfiles, Profile, verifyAndSwitchProfile } from '../lib/auth';
import { getRoleBadgeInfo } from '../lib/formatters';
import { User } from '../types';

interface LoginModalProps {
  currentUser?: User;
  currentRole?: string;
  onSelectUser?: (user: User) => void;
  onSwitchSuccess?: (user: User) => void;
  onClose: () => void;
  onLockout: (errorMessage: string) => void;
  theme?: 'dark' | 'light';
  isOpen?: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  currentUser,
  currentRole,
  onSelectUser,
  onSwitchSuccess,
  onClose,
  onLockout,
  theme = 'dark',
  isOpen = true,
}) => {
  if (!isOpen) return null;

  const isLight = theme === 'light';
  const profiles: Profile[] = getStoredProfiles();

  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSelectProfileToSwitch = (prof: Profile) => {
    setSelectedProfile(prof);
    setPasswordInput('');
    setLocalError(null);
  };

  const handleConfirmSwitch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!selectedProfile) {
      setLocalError('Por favor, selecione um perfil de operador para alternar.');
      return;
    }

    const trimmedPass = passwordInput.trim();
    if (!trimmedPass) {
      // REGRA ESTRITA: Se o campo ficar em branco, bloqueia imediatamente o acesso ao sistema
      const blockMsg = `Acesso Bloqueado: A senha para o perfil "${selectedProfile.name}" é obrigatória e não foi preenchida. O sistema foi bloqueado por segurança.`;
      onLockout(blockMsg);
      return;
    }

    setIsVerifying(true);
    try {
      const res = await verifyAndSwitchProfile(selectedProfile.email, trimmedPass);

      if (res.success && res.user) {
        if (onSelectUser) onSelectUser(res.user);
        if (onSwitchSuccess) onSwitchSuccess(res.user);
        onClose();
      } else {
        // REGRA ESTRITA: Se a senha estiver incorreta, bloqueia imediatamente o acesso
        const blockMsg = `Acesso Bloqueado: Palavra-passe incorreta para "${selectedProfile.name}". O acesso foi cancelado e o sistema foi bloqueado por motivos de segurança.`;
        onLockout(blockMsg);
      }
    } catch (err: any) {
      onLockout(err?.message || 'Acesso Bloqueado por falha de autenticação.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div
        className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#111620] border-zinc-700 text-zinc-100'
        }`}
      >
        {/* Header */}
        <div
          className={`p-4 border-b flex items-center justify-between ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0e131b] border-zinc-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center border border-emerald-500/30">
              <ShieldAlert className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black">
                Alternar Operador • Validação Estrita
              </h3>
              <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                Qualquer troca de usuário exige a validação obrigatória da palavra-passe.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {/* Banner de Aviso RBAC */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs flex items-start gap-2.5">
            <AlertOctagon className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
            <div>
              <span className="font-bold">Atenção de Segurança (RBAC):</span>
              <p className="mt-0.5 leading-relaxed text-[11px]">
                Para proteger as finanças, estoque e caixas da VMA Comercial, é terminantemente proibido alternar de usuário sem validação. Senhas incorretas ou vazias bloquearão imediatamente o acesso ao sistema.
              </p>
            </div>
          </div>

          {localError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-start gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="font-semibold leading-relaxed">{localError}</div>
            </div>
          )}

          {/* 1. Seleção do Usuário Alvo */}
          <div>
            <label className="block font-bold uppercase tracking-wider text-[11px] mb-2 text-zinc-400">
              1. Selecione o Perfil do Operador Desejado:
            </label>
            <div className="space-y-2">
              {profiles.map((p) => {
                const isCurrentActive =
                  (currentUser?.email && currentUser.email.toLowerCase() === p.email.toLowerCase()) ||
                  (currentRole && currentRole.toUpperCase() === p.role.toUpperCase());
                const isSelected = selectedProfile?.id === p.id;
                const roleBadge = getRoleBadgeInfo(p.role);

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectProfileToSwitch(p)}
                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? isLight
                          ? 'bg-emerald-50 border-emerald-500 shadow-sm text-slate-900 ring-2 ring-emerald-500/30'
                          : 'bg-[#15231c] border-emerald-500 text-white ring-2 ring-emerald-500/30'
                        : isLight
                        ? 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-800'
                        : 'bg-[#151b26] border-zinc-800 hover:border-zinc-700 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-black text-xs text-zinc-200">
                        {p.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-xs sm:text-sm flex items-center gap-2">
                          <span>{p.name}</span>
                          {isCurrentActive && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800">
                              Atual
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-400 font-mono">{p.email}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${roleBadge.bg} ${roleBadge.color} ${roleBadge.border}`}
                      >
                        {p.role}
                      </span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Formulário de Senha Estrita */}
          {selectedProfile && (
            <form
              onSubmit={handleConfirmSwitch}
              className={`p-4 rounded-xl border space-y-3 animate-fadeIn ${
                isLight ? 'bg-slate-50 border-slate-300' : 'bg-zinc-900/90 border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>2. Digite a Palavra-Passe para {selectedProfile.name}:</span>
                </span>
                <span className="text-[10px] text-zinc-400 font-medium">Campo Obrigatório</span>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="switch-password-input"
                  required
                  autoFocus
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Informe a palavra-passe ou PIN do operador..."
                  className={`w-full pl-3.5 pr-10 py-2.5 rounded-xl text-xs sm:text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                      : 'bg-[#0a0d14] border-zinc-700 text-white placeholder:text-zinc-500'
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

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-zinc-500">
                  Senha incorreta/vazia bloqueará a visualização imediatamente.
                </span>
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isVerifying ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Validando...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Validar & Entrar</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div
          className={`p-3.5 border-t flex items-center justify-between text-xs ${
            isLight ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-[#0e131b] border-zinc-800 text-zinc-400'
          }`}
        >
          <div className="flex items-center gap-1.5 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Validação Criptografada • KwanzaPOS RBAC</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border font-semibold text-xs hover:bg-zinc-800/40 cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
export default LoginModal;
