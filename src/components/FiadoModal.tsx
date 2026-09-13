import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  FileSpreadsheet,
  Plus,
  Receipt,
  Search,
  ShieldAlert,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import {
  buscarClientes,
  ClienteFiado,
  getClientesFiadoAsync,
  getClientesLocais,
  saveClientesLocais,
  validarLimiteFiado,
} from '../lib/fiadoService';
import { formatKz } from '../lib/formatters';

interface FiadoModalProps {
  isOpen: boolean;
  totalVenda: number;
  onClose: () => void;
  onConfirmFiado: (cliente: ClienteFiado) => void;
  theme?: 'dark' | 'light';
}

export const FiadoModal: React.FC<FiadoModalProps> = ({
  isOpen,
  totalVenda,
  onClose,
  onConfirmFiado,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [clientes, setClientes] = useState<ClienteFiado[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<ClienteFiado | null>(null);
  const [isCreatingClient, setIsCreatingClient] = useState<boolean>(false);

  // New Client Form
  const [novoNome, setNovoNome] = useState<string>('');
  const [novoTelefone, setNovoTelefone] = useState<string>('');
  const [novoNif, setNovoNif] = useState<string>('');
  const [novoLimite, setNovoLimite] = useState<string>('300000');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      getClientesFiadoAsync().then((list) => setClientes(list));
      setSelectedCliente(null);
      setSearchTerm('');
      setIsCreatingClient(false);
    }
  }, [isOpen]);

  const filteredClientes = useMemo(() => {
    if (!searchTerm.trim()) return clientes;
    const q = searchTerm.trim().toLowerCase();
    return clientes.filter(
      (c) =>
        c.nome.toLowerCase().includes(q) ||
        c.nif.toLowerCase().includes(q) ||
        c.telefone.toLowerCase().includes(q)
    );
  }, [clientes, searchTerm]);

  // Validation of the selected client against the current sale total
  const validacao = useMemo(() => {
    if (!selectedCliente) return null;
    return validarLimiteFiado(selectedCliente, totalVenda);
  }, [selectedCliente, totalVenda]);

  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!novoNome.trim()) {
      setFormError('Nome do cliente é obrigatório.');
      return;
    }

    const limiteNum = parseFloat(novoLimite);
    if (isNaN(limiteNum) || limiteNum <= 0) {
      setFormError('Informe um limite de crédito válido em Kz.');
      return;
    }

    const novo: ClienteFiado = {
      id: `cli-${Date.now()}`,
      nome: novoNome.trim(),
      telefone: novoTelefone.trim() || '924 000 000',
      nif: novoNif.trim() || '999999999',
      endereco: 'Saurimo, Lunda Sul',
      limite_credito: limiteNum,
      saldo_devedor: 0,
      status: 'ATIVO',
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    };

    const todos = getClientesLocais();
    todos.unshift(novo);
    saveClientesLocais(todos);
    setClientes(todos);
    setSelectedCliente(novo);
    setIsCreatingClient(false);
    setNovoNome('');
    setNovoTelefone('');
    setNovoNif('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#111620] border-zinc-800 text-zinc-100'
        }`}
      >
        {/* Header */}
        <div
          className={`p-4 sm:p-5 border-b flex items-center justify-between ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0d131d] border-zinc-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>Venda a Fiado • Conta Corrente de Clientes</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800">
                  Validação Estrita
                </span>
              </h2>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                Tabela clientes_fiado • Saurimo, Angola • Total da Venda: <strong className="text-emerald-500 font-black">{formatKz(totalVenda)}</strong>
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

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Strict Limit Alert Banner if selected */}
          {selectedCliente && validacao && (
            <div>
              {!validacao.permitido ? (
                <div className="p-4 rounded-xl bg-rose-500/15 border-2 border-rose-500 text-rose-300 space-y-2 animate-shake">
                  <div className="flex items-center gap-2 font-black text-sm text-rose-400">
                    <ShieldAlert className="w-5 h-5 text-rose-500" />
                    <span>VENDA A FIADO BLOQUEADA: LIMITE DE CRÉDITO EXCEDIDO</span>
                  </div>
                  <p className="text-xs leading-relaxed text-rose-200">
                    {validacao.erro}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-rose-500/30 text-xs">
                    <div className="bg-rose-950/50 p-2 rounded-lg">
                      <span className="text-[10px] text-rose-300 block">Saldo Devedor:</span>
                      <strong className="text-rose-100">{formatKz(validacao.saldoAtual)}</strong>
                    </div>
                    <div className="bg-rose-950/50 p-2 rounded-lg">
                      <span className="text-[10px] text-rose-300 block">Total da Venda:</span>
                      <strong className="text-rose-100">+{formatKz(totalVenda)}</strong>
                    </div>
                    <div className="bg-rose-950/50 p-2 rounded-lg">
                      <span className="text-[10px] text-rose-300 block">Total Projetado:</span>
                      <strong className="text-rose-400 font-black">{formatKz(validacao.saldoProjetado)}</strong>
                    </div>
                    <div className="bg-rose-950/50 p-2 rounded-lg">
                      <span className="text-[10px] text-rose-300 block">Limite do Cliente:</span>
                      <strong className="text-zinc-200">{formatKz(validacao.limiteCredito)}</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-black text-sm text-emerald-400">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span>CRÉDITO APROVADO PARA {selectedCliente.nome.toUpperCase()}</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-400">
                      Disponível: {formatKz(validacao.disponivel - totalVenda)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                    <div className="bg-emerald-950/40 p-2 rounded-lg border border-emerald-800/40">
                      <span className="text-[10px] text-emerald-400 block">Saldo Anterior:</span>
                      <strong>{formatKz(validacao.saldoAtual)}</strong>
                    </div>
                    <div className="bg-emerald-950/40 p-2 rounded-lg border border-emerald-800/40">
                      <span className="text-[10px] text-emerald-400 block">Nova Venda:</span>
                      <strong>{formatKz(totalVenda)}</strong>
                    </div>
                    <div className="bg-emerald-950/40 p-2 rounded-lg border border-emerald-800/40">
                      <span className="text-[10px] text-emerald-400 block">Novo Saldo Devedor:</span>
                      <strong className="text-emerald-300 font-black">{formatKz(validacao.saldoProjetado)}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Search bar & Create toggle */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar cliente por nome, NIF ou telefone em Saurimo..."
                className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400'
                    : 'bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500'
                }`}
              />
            </div>
            <button
              type="button"
              onClick={() => setIsCreatingClient(!isCreatingClient)}
              className="px-3 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Cliente</span>
            </button>
          </div>

          {/* New Client Form if open */}
          {isCreatingClient && (
            <form
              onSubmit={handleCreateClient}
              className={`p-4 rounded-xl border space-y-3 ${
                isLight ? 'bg-slate-50 border-slate-300' : 'bg-[#0d131d] border-zinc-700'
              }`}
            >
              <div className="text-xs font-bold uppercase text-amber-400 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                <span>Cadastrar Novo Cliente para Fiado</span>
              </div>
              {formError && (
                <div className="p-2.5 rounded bg-rose-500/20 text-rose-300 text-xs">{formError}</div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1">Nome da Empresa / Cliente</label>
                  <input
                    type="text"
                    required
                    value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value)}
                    placeholder="Ex: Comercial Katoca Lda"
                    className="w-full px-3 py-2 rounded-lg border bg-zinc-900 border-zinc-700 text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Contacto Telefónico</label>
                  <input
                    type="text"
                    value={novoTelefone}
                    onChange={(e) => setNovoTelefone(e.target.value)}
                    placeholder="924 000 000"
                    className="w-full px-3 py-2 rounded-lg border bg-zinc-900 border-zinc-700 text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">NIF do Cliente</label>
                  <input
                    type="text"
                    value={novoNif}
                    onChange={(e) => setNovoNif(e.target.value)}
                    placeholder="5000000000"
                    className="w-full px-3 py-2 rounded-lg border bg-zinc-900 border-zinc-700 text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Limite de Crédito Aprovado (Kz)</label>
                  <input
                    type="number"
                    value={novoLimite}
                    onChange={(e) => setNovoLimite(e.target.value)}
                    placeholder="300000"
                    className="w-full px-3 py-2 rounded-lg border bg-zinc-900 border-zinc-700 text-zinc-100"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCreatingClient(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white"
                >
                  Salvar Cliente
                </button>
              </div>
            </form>
          )}

          {/* List of Clients */}
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {filteredClientes.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-xs">
                Nenhum cliente de fiado encontrado para a busca "{searchTerm}".
              </div>
            ) : (
              filteredClientes.map((c) => {
                const isSelected = selectedCliente?.id === c.id;
                const saldoAtual = c.saldo_devedor || 0;
                const limite = c.limite_credito || 0;
                const disponivel = Math.max(0, limite - saldoAtual);
                const willExceed = saldoAtual + totalVenda > limite;

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCliente(c)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isSelected
                        ? willExceed
                          ? 'bg-rose-950/40 border-rose-500 text-zinc-100'
                          : 'bg-emerald-950/40 border-emerald-500 text-zinc-100 shadow-sm'
                        : isLight
                        ? 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-800'
                        : 'bg-[#0e131b] border-zinc-800 hover:border-zinc-700 text-zinc-300'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-sm flex items-center gap-2">
                        <span>{c.nome}</span>
                        {isSelected && (
                          <span
                            className={`text-[10px] font-black px-1.5 py-0.2 rounded ${
                              willExceed
                                ? 'bg-rose-900 text-rose-200'
                                : 'bg-emerald-900 text-emerald-200'
                            }`}
                          >
                            SELECIONADO
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-3">
                        <span>NIF: {c.nif}</span>
                        <span>Tel: {c.telefone}</span>
                        <span>{c.endereco}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] text-zinc-400 block">Saldo Devedor:</span>
                        <span className="font-bold text-amber-400">{formatKz(saldoAtual)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-zinc-400 block">Limite Total:</span>
                        <span className="font-bold text-zinc-300">{formatKz(limite)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-zinc-400 block">Disponível:</span>
                        <span
                          className={`font-black ${
                            disponivel < totalVenda ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {formatKz(disponivel)}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className={`p-4 border-t flex items-center justify-between gap-3 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0d131d] border-zinc-800'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={!selectedCliente || (validacao ? !validacao.permitido : true)}
            onClick={() => {
              if (selectedCliente && validacao?.permitido) {
                onConfirmFiado(selectedCliente);
              }
            }}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md active:scale-95 ${
              selectedCliente && validacao?.permitido
                ? 'bg-amber-600 hover:bg-amber-500 text-white cursor-pointer'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>
              {validacao && !validacao.permitido
                ? 'Bloqueado (Limite Excedido)'
                : 'Concluir Venda a Fiado'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
