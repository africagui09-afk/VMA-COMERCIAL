import React, { useState } from 'react';
import {
  Check,
  Key,
  KeyRound,
  Lock,
  Plus,
  Save,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { getStoredProfiles, Profile, saveStoredProfiles, updateUserCredentials } from '../lib/auth';
import { User, UserRole } from '../types';

interface UserManagementModalProps {
  currentUser: User;
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  currentUser,
  onClose,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const [profiles, setProfiles] = useState<Profile[]>(getStoredProfiles());
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('VENDEDOR');
  const [newPin, setNewPin] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  // Form for new user
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [createName, setCreateName] = useState<string>('');
  const [createEmail, setCreateEmail] = useState<string>('');
  const [createRole, setCreateRole] = useState<UserRole>('VENDEDOR');
  const [createPin, setCreatePin] = useState<string>('2026');

  const handleStartEdit = (profile: Profile) => {
    setEditingProfileId(profile.id);
    setNewRole(profile.role);
    setNewPin(profile.pin || '2026');
    setNewPassword('');
    setStatusMessage(null);
  };

  const handleSaveCredentials = async (targetId: string) => {
    setStatusMessage(null);
    const res = await updateUserCredentials(currentUser, targetId, newRole, newPin, newPassword);
    if (res.success) {
      setProfiles(getStoredProfiles());
      setEditingProfileId(null);
      setStatusMessage({ text: 'Credenciais e nível de acesso atualizados com sucesso!' });
    } else {
      setStatusMessage({ text: res.error || 'Erro ao atualizar credenciais.', isError: true });
    }
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!createName.trim() || !createEmail.trim()) {
      setStatusMessage({ text: 'Nome e E-mail são obrigatórios.', isError: true });
      return;
    }

    const newProf: Profile = {
      id: `usr-${Date.now()}`,
      name: createName.trim(),
      email: createEmail.trim().toLowerCase(),
      role: createRole,
      pin: createPin.trim() || '2026',
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [...profiles, newProf];
    saveStoredProfiles(updated);
    setProfiles(updated);
    setIsCreating(false);
    setCreateName('');
    setCreateEmail('');
    setStatusMessage({ text: `Novo operador "${newProf.name}" cadastrado com sucesso!` });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#111620] border-zinc-800 text-zinc-100'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`p-4 sm:p-5 border-b flex items-center justify-between ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0d131d] border-zinc-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <UserCog className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>Gestão de Usuários & Credenciais</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800">
                  Exclusivo Administrador
                </span>
              </h2>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                VMA Comercial Lda • Controle de perfis e alteração de senhas/PINs
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback alert */}
        {statusMessage && (
          <div
            className={`p-3 text-xs font-semibold flex items-center justify-between border-b ${
              statusMessage.isError
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            }`}
          >
            <span>{statusMessage.text}</span>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-xs underline hover:opacity-80"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Top action bar */}
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-500" />
              <span>Operadores Registrados ({profiles.length})</span>
            </div>
            {!isCreating && (
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Operador</span>
              </button>
            )}
          </div>

          {/* New User Form */}
          {isCreating && (
            <form
              onSubmit={handleCreateUser}
              className={`p-4 rounded-xl border space-y-3 ${
                isLight ? 'bg-slate-50 border-slate-300' : 'bg-[#0d131d] border-zinc-700'
              }`}
            >
              <div className="font-bold text-xs uppercase text-emerald-500 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                <span>Cadastrar Novo Operador</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="Ex: João Baptista"
                    className="w-full px-3 py-2 rounded-lg border bg-zinc-900 border-zinc-700 text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">E-mail Corporativo (@vma.co.ao)</label>
                  <input
                    type="email"
                    required
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    placeholder="joao.baptista@vma.co.ao"
                    className="w-full px-3 py-2 rounded-lg border bg-zinc-900 border-zinc-700 text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Perfil de Acesso</label>
                  <select
                    value={createRole}
                    onChange={(e) => setCreateRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 rounded-lg border bg-zinc-900 border-zinc-700 text-zinc-100"
                  >
                    <option value="VENDEDOR">Vendedor (Frente de Caixa apenas)</option>
                    <option value="GERENTE">Gerente (Estoque, Despesas, Fiados)</option>
                    <option value="ADMINISTRADOR">Administrador (Acesso Total)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">PIN Rápido</label>
                  <input
                    type="text"
                    value={createPin}
                    onChange={(e) => setCreatePin(e.target.value)}
                    placeholder="2026"
                    className="w-full px-3 py-2 rounded-lg border bg-zinc-900 border-zinc-700 text-zinc-100"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Operador</span>
                </button>
              </div>
            </form>
          )}

          {/* List of profiles */}
          <div className="space-y-3">
            {profiles.map((p) => {
              const isEditing = editingProfileId === p.id;
              const isCurrent = currentUser.email.toLowerCase() === p.email.toLowerCase();

              return (
                <div
                  key={p.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isEditing
                      ? isLight
                        ? 'bg-purple-50 border-purple-400'
                        : 'bg-[#181524] border-purple-600/60'
                      : isLight
                      ? 'bg-slate-50 border-slate-200'
                      : 'bg-[#0e131b] border-zinc-800'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs ${
                          p.role === 'ADMINISTRADOR'
                            ? 'bg-purple-600/30 text-purple-400'
                            : p.role === 'GERENTE'
                            ? 'bg-blue-600/30 text-blue-400'
                            : 'bg-emerald-600/30 text-emerald-400'
                        }`}
                      >
                        {p.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-sm flex items-center gap-2">
                          <span>{p.name}</span>
                          {isCurrent && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800">
                              Você
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-400 font-mono">{p.email}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                          p.role === 'ADMINISTRADOR'
                            ? 'bg-purple-950/40 text-purple-400 border-purple-800'
                            : p.role === 'GERENTE'
                            ? 'bg-blue-950/40 text-blue-400 border-blue-800'
                            : 'bg-emerald-950/40 text-emerald-400 border-emerald-800'
                        }`}
                      >
                        {p.role}
                      </span>
                      {!isEditing && (
                        <button
                          type="button"
                          onClick={() => handleStartEdit(p)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 flex items-center gap-1.5"
                        >
                          <KeyRound className="w-3 h-3" />
                          <span>Alterar Credenciais</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline edit mode */}
                  {isEditing && (
                    <div className="mt-3 pt-3 border-t border-zinc-700/60 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                        <div>
                          <label className="block font-semibold mb-1 text-zinc-300">Alterar Nível de Perfil</label>
                          <select
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value as UserRole)}
                            className="w-full px-2.5 py-1.5 rounded-lg border bg-zinc-900 border-zinc-700 text-zinc-100"
                          >
                            <option value="VENDEDOR">Vendedor (Frente de Caixa)</option>
                            <option value="GERENTE">Gerente (Estoque & Finanças)</option>
                            <option value="ADMINISTRADOR">Administrador (Total)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block font-semibold mb-1 text-zinc-300">PIN Rápido (4 dígitos)</label>
                          <input
                            type="text"
                            value={newPin}
                            onChange={(e) => setNewPin(e.target.value)}
                            placeholder="2026"
                            className="w-full px-2.5 py-1.5 rounded-lg border bg-zinc-900 border-zinc-700 text-zinc-100"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold mb-1 text-zinc-300">Nova Senha (Opcional)</label>
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Nova senha..."
                            className="w-full px-2.5 py-1.5 rounded-lg border bg-zinc-900 border-zinc-700 text-zinc-100"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingProfileId(null)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveCredentials(p.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-sm"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Salvar Alterações</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div
          className={`p-4 border-t flex items-center justify-between text-xs ${
            isLight ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-[#0d131d] border-zinc-800 text-zinc-400'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Sincronização com Supabase Auth e tabela profiles ativa</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
