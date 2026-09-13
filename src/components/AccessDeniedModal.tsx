import React from 'react';
import { Lock, ShieldAlert, Store, X } from 'lucide-react';
import { User } from '../types';

interface AccessDeniedModalProps {
  currentUser: User;
  attemptedViewName: string;
  onClose: () => void;
  onGoToPDV: () => void;
  theme?: 'dark' | 'light';
}

export const AccessDeniedModal: React.FC<AccessDeniedModalProps> = ({
  currentUser,
  attemptedViewName,
  onClose,
  onGoToPDV,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className={`w-full max-w-md rounded-2xl border-2 border-rose-500 shadow-2xl overflow-hidden p-6 text-center space-y-4 animate-shake ${
          isLight ? 'bg-white text-slate-900' : 'bg-[#141219] text-zinc-100'
        }`}
      >
        <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/30">
          <ShieldAlert className="w-9 h-9 text-rose-500" />
        </div>

        <div className="space-y-1.5">
          <h3 className="text-lg font-black text-rose-500 tracking-tight">
            Acesso Negado: Privilégio Insuficiente
          </h3>
          <p className="text-xs text-zinc-400">
            A tentativa de acesso à aba <strong className="text-zinc-200">"{attemptedViewName}"</strong> foi
            bloqueada pelas diretrizes de segurança da VMA Comercial Lda.
          </p>
        </div>

        <div
          className={`p-3.5 rounded-xl border text-xs text-left space-y-1 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/80 border-zinc-800'
          }`}
        >
          <div className="flex justify-between">
            <span className="text-zinc-400">Operador:</span>
            <span className="font-bold">{currentUser.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Perfil Atual:</span>
            <span className="font-bold text-rose-400 uppercase">{currentUser.role}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Permissão Concedida:</span>
            <span className="font-bold text-emerald-400">Apenas Frente de Caixa</span>
          </div>
        </div>

        <p className="text-[11px] text-zinc-500">
          Contacte o Administrador (Victor Abreu) ou o Gerente (Mauro Jorge) para solicitação de privilégios.
        </p>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition-colors"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onGoToPDV();
            }}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
          >
            <Store className="w-4 h-4" />
            <span>Voltar à Frente de Caixa</span>
          </button>
        </div>
      </div>
    </div>
  );
};
