import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Printer,
  RotateCcw,
  Search,
  ShieldAlert,
  UserCheck,
  X,
  XCircle,
} from 'lucide-react';
import { Sale, User } from '../types';
import { formatDateTime, formatKz, getPaymentMethodName } from '../lib/formatters';
import { canCancelSale, cancelSale } from '../lib/storage';

interface SalesHistoryProps {
  currentUser: User;
  sales: Sale[];
  onRefreshData: () => void;
  onBackToPDV: () => void;
  onReprintReceipt: (sale: Sale) => void;
  theme?: 'dark' | 'light';
}

export const SalesHistory: React.FC<SalesHistoryProps> = ({
  currentUser,
  sales,
  onRefreshData,
  onBackToPDV,
  onReprintReceipt,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CONCLUIDA' | 'CANCELADA'>('ALL');

  // Cancel Modal state
  const [cancellingSale, setCancellingSale] = useState<Sale | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('Erro de digitação do operador');
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Selected Sale Details Modal
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);

  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      // If Vendedor, show only their own sales
      if (currentUser.role === 'VENDEDOR' && sale.sellerId !== currentUser.id) {
        return false;
      }

      const matchSearch =
        sale.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.sellerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sale.customerName || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = statusFilter === 'ALL' || sale.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [sales, currentUser, searchTerm, statusFilter]);

  const handleOpenCancelModal = (sale: Sale) => {
    const check = canCancelSale(sale, currentUser);
    if (!check.canCancel) {
      alert(check.reason || 'Não é possível cancelar esta venda.');
      return;
    }
    setCancellingSale(sale);
    setCancelReason('Erro de digitação do operador');
    setCancelError(null);
  };

  const handleConfirmCancellation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingSale) return;

    const res = cancelSale(cancellingSale.id, currentUser, cancelReason);
    if (!res.success) {
      setCancelError(res.error || 'Erro ao cancelar venda.');
      return;
    }

    setCancellingSale(null);
    onRefreshData();
  };

  return (
    <div className={`flex-1 flex flex-col overflow-y-auto ${isLight ? 'bg-slate-100 text-slate-900' : 'bg-[#0a0d14] text-zinc-100'}`}>
      {/* Top action header with visible "Voltar ao PDV" */}
      <div className={`border-b p-3 sm:p-5 sticky top-0 z-20 shadow-md ${isLight ? 'bg-white border-slate-200' : 'bg-[#0e131b] border-zinc-800'}`}>
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Back button & Title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              id="btn-voltar-historico"
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
                <RotateCcw className="w-5 h-5 text-emerald-500" />
                <span>Histórico de Vendas & Fecho</span>
              </h1>
              <p className={`text-xs hidden sm:block ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                Consulta de talões, reimpressão e cancelamentos autorizados
              </p>
            </div>
          </div>

          {/* Role badge rule reminder */}
          <div className={`text-xs border px-3 py-1.5 rounded-xl flex items-center gap-2 ${
            isLight ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-zinc-900 border-zinc-800 text-zinc-400'
          }`}>
            <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
            {(currentUser.role === 'ADMINISTRADOR' || currentUser.role === 'GERENTE') ? (
              <span>Regra de Cancelamento: Permitido para <strong>Administradores</strong> e <strong>Gerentes</strong> apenas em até <strong>1 hora</strong> da emissão.</span>
            ) : (
              <span>Modo Vendedor: Consulta das suas vendas de hoje (cancelamento restrito a Gerente/Admin).</span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-5">
        {/* Filters */}
        <div className={`p-3 sm:p-4 rounded-2xl border flex flex-col md:flex-row gap-3 items-center justify-between transition-colors ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0e131b] border-zinc-800'
        }`}>
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por fatura VD, operador ou cliente..."
              className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs outline-none transition-colors border ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-200 focus:border-emerald-500'
              }`}
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                statusFilter === 'ALL'
                  ? isLight ? 'bg-slate-800 text-white shadow-sm' : 'bg-zinc-700 text-white font-semibold'
                  : isLight ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              Todas ({sales.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('CONCLUIDA')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                statusFilter === 'CONCLUIDA'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : isLight ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              Concluídas
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('CANCELADA')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                statusFilter === 'CANCELADA'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : isLight ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              Canceladas
            </button>
          </div>
        </div>

        {/* Sales Table */}
        <div className={`rounded-2xl border overflow-hidden shadow-sm transition-colors ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#0e131b] border-zinc-800 shadow-md'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className={`uppercase text-[10px] tracking-wider border-b ${
                isLight ? 'bg-slate-100 text-slate-700 border-slate-200 font-black' : 'bg-zinc-900/90 text-zinc-400 border-zinc-800 font-bold'
              }`}>
                <tr>
                  <th className="p-3 sm:p-4">Fatura / VD</th>
                  <th className="p-3 sm:p-4">Data & Hora</th>
                  <th className="p-3 sm:p-4">Operador / Vendedor</th>
                  <th className="p-3 sm:p-4">Cliente</th>
                  <th className="p-3 sm:p-4">Pagamento</th>
                  <th className="p-3 sm:p-4 text-right">Valor Total (Kz)</th>
                  <th className="p-3 sm:p-4 text-center">Status</th>
                  <th className="p-3 sm:p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-zinc-800/60'}`}>
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={8} className={`p-8 text-center ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                      Nenhuma venda encontrada com os critérios informados.
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((sale) => {
                    const isCancelled = sale.status === 'CANCELADA';
                    const timeDiffMin = Math.round((Date.now() - new Date(sale.createdAt).getTime()) / (1000 * 60));
                    const isWithinOneHour = timeDiffMin <= 60;
                    const canUserRoleCancel = currentUser.role === 'ADMINISTRADOR' || currentUser.role === 'GERENTE';
                    const cancelPermitted = canUserRoleCancel && isWithinOneHour && !isCancelled;
                    const isExpiredForCancel = canUserRoleCancel && !isWithinOneHour && !isCancelled;

                    return (
                      <tr
                        key={sale.id}
                        className={`transition-colors ${
                          isCancelled
                            ? isLight ? 'bg-slate-100/70 text-slate-400 line-through' : 'bg-zinc-950/40 text-zinc-500 line-through'
                            : isLight ? 'hover:bg-slate-50 text-slate-800' : 'hover:bg-zinc-900/40'
                        }`}
                      >
                        <td className={`p-3 sm:p-4 font-mono font-bold ${isLight ? 'text-slate-900' : 'text-zinc-200'}`}>
                          {sale.invoiceNumber}
                        </td>
                        <td className={`p-3 sm:p-4 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                          <div className="flex items-center gap-1">
                            <Clock className={`w-3 h-3 ${isLight ? 'text-slate-500' : 'text-zinc-500'}`} />
                            <span className={isLight ? 'font-medium text-slate-800' : ''}>{formatDateTime(sale.createdAt)}</span>
                          </div>
                          <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>há {timeDiffMin} min</span>
                        </td>
                        <td className={`p-3 sm:p-4 font-medium ${isLight ? 'text-slate-900' : 'text-zinc-300'}`}>
                          {sale.sellerName}
                        </td>
                        <td className={`p-3 sm:p-4 ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>
                          {sale.customerName || 'Consumidor Final'}
                        </td>
                        <td className={`p-3 sm:p-4 ${isLight ? 'text-slate-800 font-medium' : 'text-zinc-300'}`}>
                          {getPaymentMethodName(sale.payments[0]?.method || 'DINHEIRO')}
                        </td>
                        <td className={`p-3 sm:p-4 text-right font-black text-sm ${
                          isCancelled
                            ? isLight ? 'text-slate-400' : 'text-zinc-500'
                            : isLight ? 'text-emerald-700' : 'text-emerald-400'
                        }`}>
                          {formatKz(sale.total)}
                        </td>
                        <td className="p-3 sm:p-4 text-center">
                          {isCancelled ? (
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                              isLight
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : 'bg-rose-950/70 border-rose-800 text-rose-400'
                            }`}>
                              Cancelada
                            </span>
                          ) : (
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                              isLight
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-emerald-950/40 border-emerald-800 text-emerald-400'
                            }`}>
                              Concluída
                            </span>
                          )}
                        </td>
                        <td className="p-3 sm:p-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* View details */}
                            <button
                              type="button"
                              onClick={() => setViewingSale(sale)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isLight
                                  ? 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
                                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                              }`}
                              title="Ver Detalhes dos Itens"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Reprint receipt */}
                            <button
                              type="button"
                              onClick={() => onReprintReceipt(sale)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isLight
                                  ? 'text-slate-600 hover:text-emerald-600 hover:bg-slate-100'
                                  : 'text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800'
                              }`}
                              title="Reimprimir Talão"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            {/* Cancel Sale button */}
                            {cancelPermitted && (
                              <button
                                type="button"
                                onClick={() => handleOpenCancelModal(sale)}
                                className={`px-2 py-1 rounded-lg border text-[11px] font-bold transition-colors ml-1 ${
                                  isLight
                                    ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                                    : 'bg-rose-950/70 border-rose-800 text-rose-300 hover:bg-rose-900'
                                }`}
                                title="Cancelar Venda e Devolver ao Estoque (dentro de 1h)"
                              >
                                Cancelar
                              </button>
                            )}
                            {isExpiredForCancel && (
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] border ml-1 cursor-not-allowed ${
                                  isLight
                                    ? 'bg-slate-100 border-slate-300 text-slate-500'
                                    : 'text-zinc-500 bg-zinc-900 border-zinc-800'
                                }`}
                                title="Prazo máximo de cancelamento (1 hora) expirado"
                              >
                                +1h
                              </span>
                            )}
                          </div>
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

      {/* CANCELLATION CONFIRMATION MODAL */}
      {cancellingSale && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#111620] border border-zinc-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-400" />
                <span>Confirmar Cancelamento de Venda</span>
              </h3>
              <button
                type="button"
                onClick={() => setCancellingSale(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-zinc-900 rounded-xl text-xs space-y-1">
              <div>Fatura: <strong className="text-white">{cancellingSale.invoiceNumber}</strong></div>
              <div>Total: <strong className="text-emerald-400">{formatKz(cancellingSale.total)}</strong></div>
              <div>Operador Original: <strong className="text-zinc-300">{cancellingSale.sellerName}</strong></div>
            </div>

            <form onSubmit={handleConfirmCancellation} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-zinc-300 mb-1">
                  Motivo do Cancelamento:
                </label>
                <textarea
                  required
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Informe o motivo (Ex: Cliente desistiu da compra, erro na forma de pagamento...)"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-rose-500 text-xs"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800 text-amber-300 text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>O cancelamento devolverá automaticamente todos os itens vendidos de volta ao estoque local.</span>
              </div>

              {cancelError && (
                <div className="p-2.5 rounded-lg bg-rose-950/80 border border-rose-700 text-rose-300 text-xs">
                  {cancelError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setCancellingSale(null)}
                  className="px-3 py-1.5 bg-zinc-800 text-zinc-300 rounded-lg text-xs"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs"
                >
                  Confirmar e Cancelar Venda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SALE DETAILS MODAL */}
      {viewingSale && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#111620] border border-zinc-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Itens da Fatura: {viewingSale.invoiceNumber}</span>
              </h3>
              <button
                type="button"
                onClick={() => setViewingSale(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              <div className="text-xs text-zinc-400 pb-2 border-b border-zinc-800 flex justify-between">
                <span>Operador: <strong className="text-zinc-200">{viewingSale.sellerName}</strong></span>
                <span>Data: <strong className="text-zinc-200">{formatDateTime(viewingSale.createdAt)}</strong></span>
              </div>

              <div className="space-y-1.5 pt-2">
                {viewingSale.items.map((item, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 flex justify-between text-xs">
                    <div>
                      <div className="font-bold text-zinc-200">{item.productName}</div>
                      <div className="text-zinc-500 text-[10px]">
                        {item.quantity} un × {formatKz(item.unitPrice)}
                      </div>
                    </div>
                    <div className="font-bold text-emerald-400">
                      {formatKz(item.total)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-zinc-800 flex justify-between text-sm font-bold">
                <span>Total:</span>
                <span className="text-emerald-400">{formatKz(viewingSale.total)}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setViewingSale(null)}
                className="px-4 py-1.5 bg-zinc-800 text-zinc-200 rounded-lg text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
