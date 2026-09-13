import React from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  FileDown,
  Printer,
  X,
} from 'lucide-react';
import { Expense, Product, Sale, User } from '../types';
import { formatDateTime, formatKz, getPaymentMethodName } from '../lib/formatters';

interface PDFReportModalProps {
  currentUser: User;
  sales: Sale[];
  products: Product[];
  expenses: Expense[];
  onClose: () => void;
}

export const PDFReportModal: React.FC<PDFReportModalProps> = ({
  currentUser,
  sales,
  products,
  expenses,
  onClose,
}) => {
  const activeSales = sales.filter((s) => s.status === 'CONCLUIDA');
  const cancelledSales = sales.filter((s) => s.status === 'CANCELADA');

  const faturamento = activeSales.reduce((sum, s) => sum + s.total, 0);
  const cmv = activeSales.reduce((sum, s) => sum + s.totalCost, 0);
  const lucroBruto = Math.max(0, faturamento - cmv);
  const totalDespesas = expenses.reduce((sum, e) => sum + e.amount, 0);
  const lucroLiquido = lucroBruto - totalDespesas;

  const criticalProducts = products.filter((p) => p.stock <= p.minStock);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Container styled as printable A4 with dark preview surrounding */}
      <div className="bg-[#161b22] border border-zinc-700 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col my-auto max-h-[95vh]">
        {/* Action Bar (Not printed) */}
        <div className="no-print p-4 bg-[#0e131b] border-b border-zinc-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>
            <h3 className="text-sm sm:text-base font-bold text-white">
              Visualização de Relatório em Formato A4
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md active:scale-95 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Salvar em PDF (A4)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE A4 SHEET PREVIEW */}
        <div className="p-4 sm:p-8 overflow-y-auto bg-zinc-950 flex justify-center">
          <div
            id="a4-report-document"
            className="bg-white text-zinc-950 w-full max-w-[210mm] min-h-[297mm] p-8 sm:p-12 shadow-2xl rounded-sm font-sans text-xs space-y-6 print:m-0 print:p-8 print:shadow-none print:max-w-none print:w-full"
          >
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-zinc-900 pb-4">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-zinc-900">
                  KWANZA<span className="text-emerald-700">POS</span>
                </h1>
                <p className="text-[11px] font-bold text-zinc-600 uppercase">
                  Sistema de Gestão Comercial & Ponto de Venda
                </p>
                <p className="text-[10px] text-zinc-500 mt-1">
                  NIF da Empresa: 5418029310 | Luanda, República de Angola
                </p>
              </div>

              <div className="text-right">
                <div className="bg-zinc-100 border border-zinc-300 px-3 py-1.5 rounded text-right">
                  <div className="text-[10px] font-bold uppercase text-zinc-600">Documento Oficial</div>
                  <div className="text-xs font-black text-zinc-900">RELATÓRIO FINANCEIRO A4</div>
                </div>
                <div className="text-[10px] text-zinc-500 mt-2">
                  Emissão: <strong>{formatDateTime(new Date().toISOString())}</strong>
                </div>
                <div className="text-[10px] text-zinc-500">
                  Emitido por: <strong>{currentUser.name} ({currentUser.role})</strong>
                </div>
              </div>
            </div>

            {/* Financial Summary Table */}
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-zinc-800 mb-2 border-b border-zinc-300 pb-1">
                1. Demonstrativo Financeiro Consolidado (Moeda: Kwanza - Kz)
              </h2>
              <table className="w-full border border-zinc-300 text-left text-xs">
                <thead className="bg-zinc-100 text-zinc-700">
                  <tr>
                    <th className="p-2 border border-zinc-300">Indicador Económico</th>
                    <th className="p-2 border border-zinc-300 text-center">Registos</th>
                    <th className="p-2 border border-zinc-300 text-right">Valor Total (Kz)</th>
                    <th className="p-2 border border-zinc-300 text-right">% Faturamento</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 border border-zinc-300 font-bold">Faturamento Bruto de Vendas</td>
                    <td className="p-2 border border-zinc-300 text-center">{activeSales.length} vendas</td>
                    <td className="p-2 border border-zinc-300 text-right font-bold text-zinc-900">
                      {formatKz(faturamento)}
                    </td>
                    <td className="p-2 border border-zinc-300 text-right">100.0%</td>
                  </tr>
                  <tr>
                    <td className="p-2 border border-zinc-300 text-zinc-700">(-) Custo das Mercadorias Vendidas (CMV)</td>
                    <td className="p-2 border border-zinc-300 text-center">-</td>
                    <td className="p-2 border border-zinc-300 text-right text-zinc-700">
                      -{formatKz(cmv)}
                    </td>
                    <td className="p-2 border border-zinc-300 text-right">
                      {faturamento > 0 ? ((cmv / faturamento) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                  <tr className="bg-zinc-50 font-bold">
                    <td className="p-2 border border-zinc-300">(=) Lucro Bruto Comercial</td>
                    <td className="p-2 border border-zinc-300 text-center">-</td>
                    <td className="p-2 border border-zinc-300 text-right">
                      {formatKz(lucroBruto)}
                    </td>
                    <td className="p-2 border border-zinc-300 text-right">
                      {faturamento > 0 ? ((lucroBruto / faturamento) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 border border-zinc-300 text-rose-700">
                      (-) Despesas Operacionais & Avarias/Perdas
                    </td>
                    <td className="p-2 border border-zinc-300 text-center">{expenses.length} itens</td>
                    <td className="p-2 border border-zinc-300 text-right text-rose-700">
                      -{formatKz(totalDespesas)}
                    </td>
                    <td className="p-2 border border-zinc-300 text-right">
                      {faturamento > 0 ? ((totalDespesas / faturamento) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                  <tr className="bg-emerald-50 text-emerald-950 font-black text-sm border-2 border-emerald-700">
                    <td className="p-2 border border-emerald-600 uppercase">(=) LUCRO LÍQUIDO REAL APURADO</td>
                    <td className="p-2 border border-emerald-600 text-center">-</td>
                    <td className="p-2 border border-emerald-600 text-right text-emerald-800">
                      {formatKz(lucroLiquido)}
                    </td>
                    <td className="p-2 border border-emerald-600 text-right">
                      {faturamento > 0 ? ((lucroLiquido / faturamento) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Inventory Status and Critical Alerts */}
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-zinc-800 mb-2 border-b border-zinc-300 pb-1">
                2. Alerta de Estoque Crítico & Ruptura de Produtos
              </h2>
              {criticalProducts.length === 0 ? (
                <p className="text-zinc-600 text-xs italic">
                  Todos os produtos operam dentro ou acima da margem de segurança do estoque mínimo.
                </p>
              ) : (
                <table className="w-full border border-zinc-300 text-left text-[11px]">
                  <thead className="bg-rose-50 text-rose-900">
                    <tr>
                      <th className="p-1.5 border border-zinc-300">Produto</th>
                      <th className="p-1.5 border border-zinc-300">Categoria</th>
                      <th className="p-1.5 border border-zinc-300 text-right">Preço de Venda</th>
                      <th className="p-1.5 border border-zinc-300 text-center">Estoque Atual</th>
                      <th className="p-1.5 border border-zinc-300 text-center">Estoque Mínimo</th>
                      <th className="p-1.5 border border-zinc-300 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {criticalProducts.map((prod) => (
                      <tr key={prod.id} className="text-zinc-800">
                        <td className="p-1.5 border border-zinc-300 font-bold">{prod.name}</td>
                        <td className="p-1.5 border border-zinc-300">{prod.category}</td>
                        <td className="p-1.5 border border-zinc-300 text-right">{formatKz(prod.price)}</td>
                        <td className="p-1.5 border border-zinc-300 text-center font-bold text-rose-700">
                          {prod.stock} {prod.unit}
                        </td>
                        <td className="p-1.5 border border-zinc-300 text-center">{prod.minStock} {prod.unit}</td>
                        <td className="p-1.5 border border-zinc-300 text-center font-bold text-rose-600">
                          {prod.stock <= 0 ? 'ESGOTADO' : 'CRÍTICO'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Recent Completed Sales */}
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-zinc-800 mb-2 border-b border-zinc-300 pb-1">
                3. Últimas Transações Registadas no Período
              </h2>
              <table className="w-full border border-zinc-300 text-left text-[11px]">
                <thead className="bg-zinc-100 text-zinc-700">
                  <tr>
                    <th className="p-1.5 border border-zinc-300">Nº Fatura / VD</th>
                    <th className="p-1.5 border border-zinc-300">Data e Hora</th>
                    <th className="p-1.5 border border-zinc-300">Vendedor</th>
                    <th className="p-1.5 border border-zinc-300">Cliente</th>
                    <th className="p-1.5 border border-zinc-300 text-right">Total Pago</th>
                  </tr>
                </thead>
                <tbody>
                  {activeSales.slice(0, 5).map((sale) => (
                    <tr key={sale.id}>
                      <td className="p-1.5 border border-zinc-300 font-mono font-bold">{sale.invoiceNumber}</td>
                      <td className="p-1.5 border border-zinc-300">{formatDateTime(sale.createdAt)}</td>
                      <td className="p-1.5 border border-zinc-300">{sale.sellerName}</td>
                      <td className="p-1.5 border border-zinc-300">{sale.customerName || 'Consumidor Final'}</td>
                      <td className="p-1.5 border border-zinc-300 text-right font-bold text-zinc-900">
                        {formatKz(sale.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Signatures & Certification block */}
            <div className="pt-8 border-t border-zinc-300 grid grid-cols-2 gap-8 text-center text-xs text-zinc-600">
              <div>
                <div className="border-b border-zinc-400 w-48 mx-auto mb-2" />
                <p className="font-bold text-zinc-800">Assinatura do Responsável / Operador</p>
                <p className="text-[10px] text-zinc-500">{currentUser.name} - {currentUser.role}</p>
              </div>

              <div>
                <div className="border-b border-zinc-400 w-48 mx-auto mb-2" />
                <p className="font-bold text-zinc-800">Carimbo da Gerência / Administração</p>
                <p className="text-[10px] text-zinc-500">KwanzaPOS Loja Comercial</p>
              </div>
            </div>

            {/* Legal Notice */}
            <div className="text-center text-[9px] text-zinc-400 pt-4 border-t border-zinc-200">
              Processado por Software Certificado de Faturação KwanzaPOS • Em conformidade com o Regime Jurídico de Facturação em Angola.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
