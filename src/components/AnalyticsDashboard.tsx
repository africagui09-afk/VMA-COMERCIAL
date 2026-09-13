import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Calendar,
  CheckCircle,
  CreditCard,
  DollarSign,
  FileDown,
  LayoutDashboard,
  PackageX,
  PieChart,
  Plus,
  Printer,
  Receipt,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import { Expense, ExpenseCategory, Product, Sale, User } from '../types';
import { formatDateTime, formatDateShort, formatKz, getExpenseCategoryLabel, getPaymentMethodName } from '../lib/formatters';
import { addExpense, deleteExpense, getExpenses } from '../lib/storage';
import { calculateAnalyticsMetrics, AnalyticsPeriod } from '../lib/analyticsRepository';
import { imprimirPainelAnalitico } from '../lib/domPrinter';

interface AnalyticsDashboardProps {
  currentUser: User;
  sales: Sale[];
  products: Product[];
  expenses: Expense[];
  onRefreshData: () => void;
  onBackToPDV: () => void;
  onExportPDF: () => void;
  theme?: 'dark' | 'light';
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  currentUser,
  sales,
  products,
  expenses,
  onRefreshData,
  onBackToPDV,
  onExportPDF,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const [period, setPeriod] = useState<AnalyticsPeriod>('TUDO');

  // Expense modal state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState<boolean>(false);
  const [expenseDesc, setExpenseDesc] = useState<string>('');
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('FIXA');
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [expenseDate, setExpenseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expenseError, setExpenseError] = useState<string | null>(null);

  // REPOSITÓRIO CENTRAL UNIFICADO:
  // Garante que Desktop, Tablet e Mobile recebam exatamente as mesmas métricas e gráficos.
  const analyticsData = useMemo(() => {
    return calculateAnalyticsMetrics(sales, expenses, products, period);
  }, [sales, expenses, products, period]);

  const { metrics, filteredSales, filteredExpenses, paymentBreakdown, topProducts } = analyticsData;

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    setExpenseError(null);

    const amount = parseFloat(expenseAmount);
    if (!expenseDesc.trim()) {
      setExpenseError('Informe a descrição da despesa ou perda.');
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      setExpenseError('Informe um valor válido em Kz.');
      return;
    }

    addExpense({
      description: expenseDesc.trim(),
      category: expenseCategory,
      amount,
      date: expenseDate,
      registeredBy: `${currentUser.name} (${currentUser.role})`,
    });

    setIsExpenseModalOpen(false);
    setExpenseDesc('');
    setExpenseAmount('');
    onRefreshData();
  };

  const handleDeleteExpense = (id: string) => {
    if (confirm('Tem certeza que deseja apagar este registo de despesa?')) {
      deleteExpense(id);
      onRefreshData();
    }
  };

  return (
    <div className={`flex-1 flex flex-col overflow-y-auto ${isLight ? 'bg-slate-100 text-slate-900' : 'bg-[#0a0d14] text-zinc-100'}`}>
      {/* Top action header with visible "Voltar ao PDV" and "Exportar Relatório A4" */}
      <div className={`border-b p-3 sm:p-5 sticky top-0 z-20 shadow-md ${isLight ? 'bg-white border-slate-200' : 'bg-[#0e131b] border-zinc-800'}`}>
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Back button & Title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              id="btn-voltar-dashboard"
              onClick={onBackToPDV}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl active:scale-95 font-bold text-xs sm:text-sm border transition-all shadow-sm ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-zinc-700'
              }`}
              title="Voltar para a Frente de Caixa"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-500" />
              <span>Voltar ao PDV</span>
            </button>
            <div>
              <h1 className={`text-base sm:text-xl font-black tracking-tight flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <LayoutDashboard className="w-5 h-5 text-emerald-500" />
                <span>Painel Analítico & Financeiro</span>
              </h1>
              <p className={`text-xs hidden sm:block ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                Faturamento, CMV, Lucro Líquido e Gestão de Despesas/Perdas
              </p>
            </div>
          </div>

          {/* Period selector & A4 Export */}
          <div className="flex items-center gap-2">
            <div className={`flex items-center border rounded-xl p-0.5 text-xs ${isLight ? 'bg-slate-200/80 border-slate-300' : 'bg-zinc-900 border-zinc-700/80'}`}>
              {(['HOJE', 'SEMANA', 'MES', 'TUDO'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    period === p
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : isLight
                      ? 'text-slate-700 hover:text-slate-950'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {p === 'HOJE' ? 'Hoje' : p === 'SEMANA' ? '7 Dias' : p === 'MES' ? 'Mês' : 'Geral'}
                </button>
              ))}
            </div>

            <button
              type="button"
              id="btn-imprimir-painel-dom"
              onClick={() => imprimirPainelAnalitico()}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors border shadow-sm cursor-pointer active:scale-95 ${
                isLight
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 border-emerald-400 font-black'
              }`}
              title="Imprimir Painel Analítico via Clonagem HTML direta (sem bloqueio de PDF)"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
            </button>

            <button
              type="button"
              id="btn-exportar-pdf-painel"
              onClick={onExportPDF}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors border shadow-sm ${
                isLight
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-emerald-400 border-emerald-500/30'
              }`}
              title="Exportar Relatório Executivo A4 em PDF"
            >
              <FileDown className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar PDF A4</span>
            </button>
          </div>
        </div>
      </div>

      <div id="container-painel-analitico" className="max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-6">
        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Total Vendido (Kz) */}
          <div className={`p-4 rounded-2xl border relative overflow-hidden transition-colors ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#111620] border-zinc-800'
          }`}>
            <div className="flex items-center justify-between text-xs">
              <span className={`font-bold ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>Total Vendido (Kz)</span>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <div className={`text-xl sm:text-2xl font-black mt-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {formatKz(metrics.faturamentoBruto)}
            </div>
            <div className={`text-[11px] mt-1 flex items-center justify-between ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
              <span>{metrics.countVendas} vendas no período</span>
              <span>TM: {formatKz(metrics.ticketMedio)}</span>
            </div>
            <div className="absolute bottom-0 inset-x-0 h-1 bg-emerald-500" />
          </div>

          {/* Total Custo (Kz) */}
          <div className={`p-4 rounded-2xl border relative overflow-hidden transition-colors ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#111620] border-zinc-800'
          }`}>
            <div className="flex items-center justify-between text-xs">
              <span className={`font-bold ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>Total Custo (Kz)</span>
              <ArrowDownRight className="w-4 h-4 text-amber-500" />
            </div>
            <div className={`text-xl sm:text-2xl font-black mt-2 ${isLight ? 'text-amber-600' : 'text-amber-300'}`}>
              {formatKz(metrics.custoVendasCMV)}
            </div>
            <div className={`text-[11px] mt-1 ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
              Lucro Bruto: <strong className={isLight ? 'text-slate-800' : 'text-zinc-200'}>{formatKz(metrics.lucroBruto)}</strong> ({metrics.margemBrutaPercent}%)
            </div>
            <div className="absolute bottom-0 inset-x-0 h-1 bg-amber-500" />
          </div>

          {/* Despesas & Perdas (Kz) */}
          <div className={`p-4 rounded-2xl border relative overflow-hidden transition-colors ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#111620] border-zinc-800'
          }`}>
            <div className="flex items-center justify-between text-xs">
              <span className={`font-bold ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>Despesas & Perdas (Kz)</span>
              <PackageX className="w-4 h-4 text-rose-500" />
            </div>
            <div className={`text-xl sm:text-2xl font-black mt-2 ${isLight ? 'text-rose-600' : 'text-rose-400'}`}>
              {formatKz(metrics.totalDespesasPerdas)}
            </div>
            <div className={`text-[11px] mt-1 ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
              {filteredExpenses.length} registos (Fixas, Variáveis, Salários, Perdas)
            </div>
            <div className="absolute bottom-0 inset-x-0 h-1 bg-rose-500" />
          </div>

          {/* Lucro Líquido (Kz) */}
          <div className={`p-4 rounded-2xl border relative overflow-hidden shadow-sm transition-colors ${
            isLight
              ? 'bg-emerald-50/70 border-emerald-300'
              : 'bg-[#0f1d17] border-emerald-500/60 shadow-lg shadow-emerald-950/30'
          }`}>
            <div className="flex items-center justify-between text-xs">
              <span className={`font-extrabold uppercase tracking-wider ${isLight ? 'text-emerald-900' : 'text-emerald-300'}`}>
                Lucro Líquido (Kz)
              </span>
              <Wallet className="w-4 h-4 text-emerald-500" />
            </div>
            <div className={`text-xl sm:text-2xl font-black mt-2 ${
              metrics.lucroLiquidoReal >= 0
                ? isLight ? 'text-emerald-700' : 'text-emerald-400'
                : isLight ? 'text-rose-600' : 'text-rose-400'
            }`}>
              {formatKz(metrics.lucroLiquidoReal)}
            </div>
            <div className={`text-[11px] mt-1 flex items-center justify-between ${isLight ? 'text-emerald-800 font-semibold' : 'text-emerald-400/80'}`}>
              <span>Margem Líquida Real:</span>
              <span className="font-black">{metrics.margemLiquidaPercent}%</span>
            </div>
            <div className="absolute bottom-0 inset-x-0 h-1 bg-emerald-500" />
          </div>
        </div>

        {/* Charts and Breakdown Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Visual Financial Comparison Bar Chart */}
          <div className={`lg:col-span-2 p-5 rounded-2xl border space-y-4 transition-colors ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0e131b] border-zinc-800'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`text-sm sm:text-base font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  <BarChart3 className="w-4 h-4 text-emerald-500" />
                  <span>Demonstrativo Financeiro (Kz)</span>
                </h3>
                <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                  Comparação direta entre Faturamento, Custos CMV, Despesas e Lucro Líquido
                </p>
              </div>
            </div>

            {/* Custom High-Quality SVG Visual Bars */}
            <div className="space-y-4 pt-2">
              {/* Faturamento bar */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className={`font-medium ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>Faturamento Total das Vendas</span>
                  <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{formatKz(metrics.faturamentoBruto)}</span>
                </div>
                <div className={`w-full h-5 rounded-lg overflow-hidden border ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
                  <div className="h-full bg-emerald-500 rounded-lg transition-all duration-700" style={{ width: '100%' }} />
                </div>
              </div>

              {/* Custos CMV bar */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className={`font-medium ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>Custo Mercadorias Vendidas (CMV)</span>
                  <span className={`font-bold ${isLight ? 'text-amber-600' : 'text-amber-400'}`}>{formatKz(metrics.custoVendasCMV)}</span>
                </div>
                <div className={`w-full h-5 rounded-lg overflow-hidden border ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
                  <div
                    className="h-full bg-amber-500/90 rounded-lg transition-all duration-700"
                    style={{
                      width: `${metrics.faturamentoBruto > 0 ? (metrics.custoVendasCMV / metrics.faturamentoBruto) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* Despesas/Perdas bar */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className={`font-medium ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>Despesas Operacionais & Avarias</span>
                  <span className={`font-bold ${isLight ? 'text-rose-600' : 'text-rose-400'}`}>{formatKz(metrics.totalDespesasPerdas)}</span>
                </div>
                <div className={`w-full h-5 rounded-lg overflow-hidden border ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
                  <div
                    className="h-full bg-rose-500/90 rounded-lg transition-all duration-700"
                    style={{
                      width: `${metrics.faturamentoBruto > 0 ? Math.min(100, (metrics.totalDespesasPerdas / metrics.faturamentoBruto) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* Lucro Líquido Real bar */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className={`font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>Resultado Líquido Real</span>
                  <span className={`font-black ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>{formatKz(metrics.lucroLiquidoReal)}</span>
                </div>
                <div className={`w-full h-5 rounded-lg overflow-hidden border ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
                  <div
                    className="h-full bg-emerald-500 rounded-lg transition-all duration-700 shadow-sm"
                    style={{
                      width: `${metrics.faturamentoBruto > 0 ? Math.max(0, (metrics.lucroLiquidoReal / metrics.faturamentoBruto) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Payment Methods Breakdown */}
          <div className={`p-5 rounded-2xl border space-y-4 transition-colors ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0e131b] border-zinc-800'
          }`}>
            <h3 className={`text-sm sm:text-base font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <CreditCard className="w-4 h-4 text-emerald-500" />
              <span>Meios de Pagamento</span>
            </h3>

            <div className="space-y-3 pt-1">
              {paymentBreakdown.map((item) => (
                <div key={item.method} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className={`font-medium ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>{getPaymentMethodName(item.method)}</span>
                    <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-zinc-100'}`}>{formatKz(item.amount)} ({item.percentage}%)</span>
                  </div>
                  <div className={`w-full h-2.5 rounded-full overflow-hidden border ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
                    <div
                      className={`h-full rounded-full ${
                        item.method === 'MULTICAIXA'
                          ? 'bg-emerald-500'
                          : item.method === 'DINHEIRO'
                          ? 'bg-blue-500'
                          : item.method === 'TRANSFERENCIA'
                          ? 'bg-amber-400'
                          : 'bg-purple-500'
                      }`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Top Products mini list */}
            <div className={`pt-3 border-t ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
              <h4 className={`text-xs font-bold mb-2 ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>Top 5 Produtos Mais Vendidos</h4>
              <div className="space-y-2">
                {topProducts.map((p, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <span className={`truncate max-w-[150px] ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                      {idx + 1}. {p.name}
                    </span>
                    <span className="font-semibold text-emerald-500">{formatKz(p.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* MÓDULO DE CONTROLE DE DESPESAS E PERDAS */}
        <div className={`p-5 rounded-2xl border space-y-4 transition-colors ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0e131b] border-zinc-800'
        }`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className={`text-sm sm:text-base font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <PackageX className="w-4 h-4 text-rose-500" />
                <span>Gestão de Despesas & Perdas Operacionais</span>
              </h3>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                Registe quebras, produtos com prazo vencido e custos operacionais que abatem o lucro líquido
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setExpenseError(null);
                setExpenseDesc('');
                setExpenseAmount('');
                setIsExpenseModalOpen(true);
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors border shadow-sm ${
                isLight
                  ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                  : 'bg-rose-950/70 border-rose-700/80 hover:bg-rose-900/60 text-rose-300'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Registar Nova Despesa / Perda</span>
            </button>
          </div>

          {/* Category Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
            {(['FIXA', 'VARIAVEL', 'SALARIO', 'PERDA'] as const).map((cat) => {
              const catExpenses = expenses.filter((e) => e.category === cat);
              const catTotal = catExpenses.reduce((sum, e) => sum + e.amount, 0);
              const info = getExpenseCategoryLabel(cat);
              return (
                <div key={cat} className={`p-3 rounded-xl border ${info.bg} ${info.border}`}>
                  <div className={`text-[11px] font-bold ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>{info.label}</div>
                  <div className={`text-sm sm:text-base font-black mt-1 ${info.color}`}>
                    {formatKz(catTotal)}
                  </div>
                  <div className={`text-[10px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                    {catExpenses.length} {catExpenses.length === 1 ? 'lançamento' : 'lançamentos'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Expenses Table */}
          <div className={`overflow-x-auto rounded-xl border ${isLight ? 'border-slate-200 bg-white' : 'border-zinc-800'}`}>
            <table className="w-full text-left text-xs">
              <thead className={`uppercase text-[10px] tracking-wider border-b ${
                isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-zinc-900 text-zinc-400 border-zinc-800'
              }`}>
                <tr>
                  <th className="p-3">Data</th>
                  <th className="p-3">Descrição da Despesa/Perda</th>
                  <th className="p-3">Categoria</th>
                  <th className="p-3">Registado Por</th>
                  <th className="p-3 text-right">Valor em Kz</th>
                  <th className="p-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-zinc-800/60'}`}>
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={`p-6 text-center ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                      Nenhuma despesa ou perda registada até ao momento.
                    </td>
                  </tr>
                ) : (
                  expenses.map((exp) => (
                    <tr key={exp.id} className={`transition-colors ${isLight ? 'hover:bg-slate-50' : 'hover:bg-zinc-900/40'}`}>
                      <td className={`p-3 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>{exp.date}</td>
                      <td className={`p-3 font-semibold ${isLight ? 'text-slate-900' : 'text-zinc-200'}`}>{exp.description}</td>
                      <td className="p-3">
                        {(() => {
                          const info = getExpenseCategoryLabel(exp.category);
                          return (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${info.bg} ${info.color} ${info.border}`}>
                              {info.label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className={`p-3 text-[11px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>{exp.registeredBy}</td>
                      <td className="p-3 text-right font-bold text-rose-500">
                        -{formatKz(exp.amount)}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                          title="Remover despesa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* REGISTER EXPENSE / LOSS MODAL */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#111620] border border-zinc-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <PackageX className="w-4 h-4 text-rose-400" />
                <span>Registar Despesa ou Perda</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsExpenseModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Descrição do Ocorrido *</label>
                <input
                  type="text"
                  required
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  placeholder="Ex: 2 garrafas partidas no manuseio, conta de luz ENDE..."
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">Categoria *</label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value as ExpenseCategory)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none"
                  >
                    <option value="FIXA">Fixa (Aluguer, Renda, Internet)</option>
                    <option value="VARIAVEL">Variável (Energia, Água, Transporte)</option>
                    <option value="SALARIO">Salário (Equipa & Comissões)</option>
                    <option value="PERDA">Perda (Avaria, Quebra, Validade)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-rose-400 mb-1">Valor em Kz *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    placeholder="Ex: 15000"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 font-bold focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Data do Ocorrido</label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none"
                />
              </div>

              {expenseError && (
                <div className="p-2.5 rounded-lg bg-rose-950/80 border border-rose-700 text-rose-300 text-xs">
                  {expenseError}
                </div>
              )}

              <div className="pt-2 border-t border-zinc-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-3 py-1.5 bg-zinc-800 text-zinc-300 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-bold rounded-lg"
                >
                  Registar Despesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
