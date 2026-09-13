import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Plus,
  Search,
  Filter,
  Trash2,
  CheckCircle,
  Clock,
  DollarSign,
  AlertCircle,
  Receipt,
  FileSpreadsheet,
} from 'lucide-react';
import { Expense, ExpenseCategory, ExpenseType, ExpenseStatus, User } from '../types';
import { formatKz } from '../lib/formatters';
import { addExpense, deleteExpense, updateExpense } from '../lib/storage';
import { broadcastLocalChange } from '../lib/realtimeSync';

interface ExpensesManagementProps {
  currentUser: User;
  expenses: Expense[];
  onRefreshData: () => void;
  onBackToPDV: () => void;
  theme?: 'dark' | 'light';
}

const CATEGORIAS_PADRAO = [
  'Salários',
  'Renda',
  'Energia / ENDE',
  'Água / EPAL',
  'Internet & Comunicação',
  'Manutenção',
  'Transporte / Combustível',
  'Mercadorias',
  'Impostos / Taxas',
  'Outros',
];

export const ExpensesManagement: React.FC<ExpensesManagementProps> = ({
  currentUser,
  expenses,
  onRefreshData,
  onBackToPDV,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';

  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<'TODOS' | ExpenseType>('TODOS');
  const [filterStatus, setFilterStatus] = useState<'TODOS' | ExpenseStatus>('TODOS');
  const [filterCategoria, setFilterCategoria] = useState<string>('TODAS');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formDesc, setFormDesc] = useState('');
  const [formTipo, setFormTipo] = useState<ExpenseType>('FIXA');
  const [formCat, setFormCat] = useState<string>('Renda');
  const [formValor, setFormValor] = useState('');
  const [formDataVenc, setFormDataVenc] = useState(new Date().toISOString().split('T')[0]);
  const [formStatus, setFormStatus] = useState<ExpenseStatus>('PAGO');
  const [formNotas, setFormNotas] = useState('');
  const [formError, setFormError] = useState('');

  // Filtragem
  const despesasFiltradas = useMemo(() => {
    return expenses.filter((e) => {
      const matchSearch =
        e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(e.category).toLowerCase().includes(searchTerm.toLowerCase());
      const matchTipo = filterTipo === 'TODOS' || (e.type || 'FIXA') === filterTipo;
      const matchStatus = filterStatus === 'TODOS' || (e.status || 'PAGO') === filterStatus;
      const matchCat = filterCategoria === 'TODAS' || e.category === filterCategoria;
      return matchSearch && matchTipo && matchStatus && matchCat;
    });
  }, [expenses, searchTerm, filterTipo, filterStatus, filterCategoria]);

  // Estatísticas
  const stats = useMemo(() => {
    const total = expenses.reduce((acc, e) => acc + e.amount, 0);
    const pagas = expenses
      .filter((e) => (e.status || 'PAGO') === 'PAGO')
      .reduce((acc, e) => acc + e.amount, 0);
    const pendentes = expenses
      .filter((e) => e.status === 'PENDENTE')
      .reduce((acc, e) => acc + e.amount, 0);
    const fixas = expenses
      .filter((e) => (e.type || 'FIXA') === 'FIXA')
      .reduce((acc, e) => acc + e.amount, 0);
    const variaveis = expenses
      .filter((e) => e.type === 'VARIAVEL')
      .reduce((acc, e) => acc + e.amount, 0);

    return { total, pagas, pendentes, fixas, variaveis };
  }, [expenses]);

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDesc.trim()) {
      setFormError('Informe a descrição da despesa.');
      return;
    }
    const val = Number(formValor);
    if (isNaN(val) || val <= 0) {
      setFormError('Informe um valor numérico válido maior que zero.');
      return;
    }

    addExpense({
      description: formDesc.trim(),
      type: formTipo,
      category: formCat,
      amount: val,
      dueDate: formDataVenc,
      date: new Date().toISOString().split('T')[0],
      status: formStatus,
      registeredBy: `${currentUser.name} (${currentUser.role})`,
      notes: formNotas.trim() || undefined,
    });

    broadcastLocalChange('despesas');
    onRefreshData();
    setIsModalOpen(false);
    setFormDesc('');
    setFormValor('');
    setFormNotas('');
    setFormError('');
  };

  const handleToggleStatus = (expense: Expense) => {
    const novoStatus: ExpenseStatus = expense.status === 'PENDENTE' ? 'PAGO' : 'PENDENTE';
    updateExpense({
      ...expense,
      status: novoStatus,
      date: novoStatus === 'PAGO' ? new Date().toISOString().split('T')[0] : expense.date,
    });
    broadcastLocalChange('despesas');
    onRefreshData();
  };

  const handleDelete = (id: string, desc: string) => {
    if (confirm(`Deseja realmente eliminar o registro da despesa "${desc}"?`)) {
      deleteExpense(id);
      broadcastLocalChange('despesas');
      onRefreshData();
    }
  };

  return (
    <div className={`flex-1 flex flex-col overflow-y-auto ${isLight ? 'bg-slate-100 text-slate-900' : 'bg-slate-900 text-slate-100'}`}>
      {/* Top Header */}
      <div className={`border-b p-4 sm:p-5 sticky top-0 z-20 transition-colors ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-800 border-slate-700'}`}>
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToPDV}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm border transition-all cursor-pointer ${
                isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300' : 'bg-slate-700 hover:bg-slate-600 text-slate-100 border-slate-600'
              }`}
            >
              <ArrowLeft className="w-4 h-4 text-emerald-500" />
              <span>Voltar ao PDV</span>
            </button>
            <div>
              <h1 className={`text-base sm:text-xl font-black tracking-tight flex items-center gap-2 ${isLight ? 'text-slate-950' : 'text-white'}`}>
                <Receipt className="w-5 h-5 text-rose-500" />
                <span>Gestão de Despesas e Saídas</span>
              </h1>
              <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Controle de custos operacionais, despesas fixas, variáveis e salários
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs sm:text-sm shadow-md cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Despesa</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 w-full space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`p-4 rounded-xl border transition-colors ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-800 border-slate-700'}`}>
            <span className={`text-xs font-bold uppercase ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Total de Saídas</span>
            <div className="text-xl sm:text-2xl font-black text-rose-500 mt-1">{formatKz(stats.total)}</div>
            <span className="text-[11px] text-slate-400">Total acumulado no período</span>
          </div>

          <div className={`p-4 rounded-xl border transition-colors ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-800 border-slate-700'}`}>
            <span className={`text-xs font-bold uppercase ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Despesas Liquidadas</span>
            <div className="text-xl sm:text-2xl font-black text-emerald-500 mt-1">{formatKz(stats.pagas)}</div>
            <span className="text-[11px] text-emerald-600 font-semibold">Total pago efetivamente</span>
          </div>

          <div className={`p-4 rounded-xl border transition-colors ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-800 border-slate-700'}`}>
            <span className={`text-xs font-bold uppercase ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Pendentes / A Vencer</span>
            <div className="text-xl sm:text-2xl font-black text-amber-500 mt-1">{formatKz(stats.pendentes)}</div>
            <span className="text-[11px] text-amber-600 font-semibold">Compromissos pendentes</span>
          </div>

          <div className={`p-4 rounded-xl border transition-colors ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-800 border-slate-700'}`}>
            <span className={`text-xs font-bold uppercase ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Fixas vs Variáveis</span>
            <div className="text-sm font-bold mt-1 space-y-0.5">
              <div className="flex justify-between">
                <span className="text-slate-400 text-xs">Fixas:</span>
                <span className="text-rose-400 font-black">{formatKz(stats.fixas)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 text-xs">Variáveis:</span>
                <span className="text-amber-400 font-black">{formatKz(stats.variaveis)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className={`p-4 rounded-2xl border flex flex-col md:flex-row gap-3 items-center justify-between transition-colors ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-800 border-slate-700'}`}>
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por descrição ou categoria..."
              className={`w-full pl-10 pr-4 py-2 border rounded-xl text-xs outline-none transition-all ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-950 focus:border-rose-500'
                  : 'bg-slate-900 border-slate-700 text-slate-100 focus:border-rose-500'
              }`}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto text-xs">
            {/* Tipo */}
            <div className="flex items-center rounded-lg border overflow-hidden">
              {(['TODOS', 'FIXA', 'VARIAVEL'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFilterTipo(t)}
                  className={`px-3 py-1.5 font-bold text-xs transition-colors cursor-pointer ${
                    filterTipo === t
                      ? 'bg-rose-500 text-white'
                      : isLight
                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {t === 'TODOS' ? 'Todos Tipos' : t}
                </button>
              ))}
            </div>

            {/* Status */}
            <div className="flex items-center rounded-lg border overflow-hidden">
              {(['TODOS', 'PAGO', 'PENDENTE'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1.5 font-bold text-xs transition-colors cursor-pointer ${
                    filterStatus === s
                      ? 'bg-emerald-500 text-slate-950'
                      : isLight
                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Categoria Select */}
            <select
              value={filterCategoria}
              onChange={(e) => setFilterCategoria(e.target.value)}
              className={`py-1.5 px-3 border rounded-lg text-xs outline-none cursor-pointer ${
                isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-700 text-slate-200'
              }`}
            >
              <option value="TODAS">Todas Categorias</option>
              {CATEGORIAS_PADRAO.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table List */}
        <div className={`border rounded-2xl overflow-hidden transition-colors ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-800 border-slate-700'}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className={`uppercase font-black text-[10px] tracking-wider ${isLight ? 'bg-slate-100 text-slate-800' : 'bg-slate-900/80 text-slate-300'}`}>
                <tr>
                  <th className="p-3.5">Descrição</th>
                  <th className="p-3.5">Tipo</th>
                  <th className="p-3.5">Categoria</th>
                  <th className="p-3.5">Vencimento / Data</th>
                  <th className="p-3.5">Valor</th>
                  <th className="p-3.5">Estado</th>
                  <th className="p-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-slate-100' : 'divide-slate-700/60'}`}>
                {despesasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                      Nenhuma despesa encontrada para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  despesasFiltradas.map((e) => {
                    const status = e.status || 'PAGO';
                    const tipo = e.type || 'FIXA';
                    return (
                      <tr key={e.id} className={`transition-colors ${isLight ? 'hover:bg-slate-50 text-slate-900' : 'hover:bg-slate-700/30 text-slate-200'}`}>
                        <td className="p-3.5 font-bold">
                          <div>{e.description}</div>
                          {e.notes && <div className="text-[10px] text-slate-400 font-normal">{e.notes}</div>}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              tipo === 'FIXA'
                                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                                : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            }`}
                          >
                            {tipo}
                          </span>
                        </td>
                        <td className="p-3.5 font-medium">{e.category}</td>
                        <td className="p-3.5 text-slate-400">
                          {e.dueDate || e.date}
                        </td>
                        <td className="p-3.5 font-black text-rose-500 text-sm">
                          {formatKz(e.amount)}
                        </td>
                        <td className="p-3.5">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(e)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black flex items-center gap-1 cursor-pointer transition-colors ${
                              status === 'PAGO'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30'
                            }`}
                            title="Clique para alternar o status Pago/Pendente"
                          >
                            {status === 'PAGO' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            <span>{status}</span>
                          </button>
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleDelete(e.id, e.description)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-500/10 cursor-pointer transition-colors"
                            title="Eliminar registro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Nova Despesa */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className={`w-full max-w-lg p-6 rounded-2xl shadow-2xl border space-y-4 ${isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-800 border-slate-700 text-slate-100'}`}>
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-black flex items-center gap-2">
                <Receipt className="w-5 h-5 text-rose-500" />
                <span>Registrar Nova Despesa</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-400 text-xs font-bold">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1">Descrição do Custo / Pagamento *</label>
                <input
                  type="text"
                  required
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Ex: Renda mensal da loja, Conta ENDE, Salário..."
                  className={`w-full p-2.5 border rounded-lg text-xs outline-none ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-950' : 'bg-slate-900 border-slate-700 text-slate-100'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Tipo de Despesa</label>
                  <select
                    value={formTipo}
                    onChange={(e) => setFormTipo(e.target.value as ExpenseType)}
                    className={`w-full p-2.5 border rounded-lg text-xs outline-none cursor-pointer ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-950' : 'bg-slate-900 border-slate-700 text-slate-100'
                    }`}
                  >
                    <option value="FIXA">Fixa (Recorrente)</option>
                    <option value="VARIAVEL">Variável (Pontual)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Categoria</label>
                  <select
                    value={formCat}
                    onChange={(e) => setFormCat(e.target.value)}
                    className={`w-full p-2.5 border rounded-lg text-xs outline-none cursor-pointer ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-950' : 'bg-slate-900 border-slate-700 text-slate-100'
                    }`}
                  >
                    {CATEGORIAS_PADRAO.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Valor (Kz) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    value={formValor}
                    onChange={(e) => setFormValor(e.target.value)}
                    placeholder="Ex: 85000"
                    className={`w-full p-2.5 border rounded-lg text-xs outline-none font-bold ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-950' : 'bg-slate-900 border-slate-700 text-slate-100'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Data de Vencimento</label>
                  <input
                    type="date"
                    value={formDataVenc}
                    onChange={(e) => setFormDataVenc(e.target.value)}
                    className={`w-full p-2.5 border rounded-lg text-xs outline-none ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-950' : 'bg-slate-900 border-slate-700 text-slate-100'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Estado de Pagamento</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as ExpenseStatus)}
                    className={`w-full p-2.5 border rounded-lg text-xs outline-none cursor-pointer ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-950' : 'bg-slate-900 border-slate-700 text-slate-100'
                    }`}
                  >
                    <option value="PAGO">Pago (Liquidado)</option>
                    <option value="PENDENTE">Pendente (A Pagar)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Registrado Por</label>
                  <input
                    type="text"
                    disabled
                    value={currentUser.name}
                    className={`w-full p-2.5 border rounded-lg text-xs opacity-60 ${
                      isLight ? 'bg-slate-100 border-slate-300' : 'bg-slate-900 border-slate-700'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Observações (Opcional)</label>
                <textarea
                  rows={2}
                  value={formNotas}
                  onChange={(e) => setFormNotas(e.target.value)}
                  placeholder="Número de fatura do fornecedor, comprovativo..."
                  className={`w-full p-2.5 border rounded-lg text-xs outline-none ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-950' : 'bg-slate-900 border-slate-700 text-slate-100'
                  }`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`px-4 py-2 font-bold rounded-lg text-xs cursor-pointer ${
                    isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-800' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-lg text-xs cursor-pointer transition-colors shadow-sm"
                >
                  Salvar Despesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
