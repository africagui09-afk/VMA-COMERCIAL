import { Expense, Product, Sale } from '../types';

export type AnalyticsPeriod = 'HOJE' | 'SEMANA' | 'MES' | 'TUDO';

export interface AnalyticsMetrics {
  faturamentoBruto: number;
  custoVendasCMV: number;
  lucroBruto: number;
  totalDespesasPerdas: number;
  lucroLiquidoReal: number;
  margemBrutaPercent: string;
  margemLiquidaPercent: string;
  countVendas: number;
  ticketMedio: number;
  vendasConcluidasCount: number;
  vendasCanceladasCount: number;
  totalCancelado: number;
}

export interface PaymentBreakdownItem {
  method: string;
  amount: number;
  percentage: number;
}

export interface TopProductItem {
  id: string;
  name: string;
  quantity: number;
  revenue: number;
  profit: number;
}

export interface CategoryBreakdownItem {
  category: string;
  amount: number;
  quantity: number;
  percentage: number;
}

export interface UnifiedAnalyticsData {
  period: AnalyticsPeriod;
  metrics: AnalyticsMetrics;
  filteredSales: Sale[];
  filteredExpenses: Expense[];
  paymentBreakdown: PaymentBreakdownItem[];
  topProducts: TopProductItem[];
  categoryBreakdown: CategoryBreakdownItem[];
  calculatedAt: string;
}

/**
 * REPOSITÓRIO CENTRAL UNIFICADO DE ANÁLISE (KwanzaPOS)
 * Garante que Desktop, Tablet e Mobile calculem exatamente os mesmos
 * dados e métricas financeiras a partir do mesmo estado de vendas, despesas e produtos.
 */
export function calculateAnalyticsMetrics(
  sales: Sale[],
  expenses: Expense[],
  products: Product[],
  period: AnalyticsPeriod = 'TUDO'
): UnifiedAnalyticsData {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // 1. Filtragem rigorosa por período
  const allCompletedSales = sales.filter((s) => s.status === 'CONCLUIDA');
  const cancelledSales = sales.filter((s) => s.status === 'CANCELADA');

  let filteredSales = allCompletedSales;
  let filteredExpenses = expenses;
  let periodCancelledSales = cancelledSales;

  if (period === 'HOJE') {
    filteredSales = allCompletedSales.filter((s) => s.createdAt.startsWith(todayStr));
    filteredExpenses = expenses.filter((e) => e.date === todayStr);
    periodCancelledSales = cancelledSales.filter((s) => s.createdAt.startsWith(todayStr));
  } else if (period === 'SEMANA') {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    filteredSales = allCompletedSales.filter((s) => new Date(s.createdAt) >= sevenDaysAgo);
    filteredExpenses = expenses.filter((e) => new Date(e.date) >= sevenDaysAgo);
    periodCancelledSales = cancelledSales.filter((s) => new Date(s.createdAt) >= sevenDaysAgo);
  } else if (period === 'MES') {
    const currentMonthStr = todayStr.substring(0, 7);
    filteredSales = allCompletedSales.filter((s) => s.createdAt.startsWith(currentMonthStr));
    filteredExpenses = expenses.filter((e) => e.date.startsWith(currentMonthStr));
    periodCancelledSales = cancelledSales.filter((s) => s.createdAt.startsWith(currentMonthStr));
  }

  // 2. Cálculo dos Indicadores Principais (KPIs)
  const faturamentoBruto = filteredSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  const custoVendasCMV = filteredSales.reduce((sum, s) => sum + (Number(s.totalCost) || 0), 0);
  const lucroBruto = Math.max(0, faturamentoBruto - custoVendasCMV);
  const totalDespesasPerdas = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const lucroLiquidoReal = lucroBruto - totalDespesasPerdas;

  const margemBrutaPercent = faturamentoBruto > 0 ? ((lucroBruto / faturamentoBruto) * 100).toFixed(1) : '0.0';
  const margemLiquidaPercent = faturamentoBruto > 0 ? ((lucroLiquidoReal / faturamentoBruto) * 100).toFixed(1) : '0.0';

  const countVendas = filteredSales.length;
  const ticketMedio = countVendas > 0 ? Math.round(faturamentoBruto / countVendas) : 0;
  const totalCancelado = periodCancelledSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);

  const metrics: AnalyticsMetrics = {
    faturamentoBruto,
    custoVendasCMV,
    lucroBruto,
    totalDespesasPerdas,
    lucroLiquidoReal,
    margemBrutaPercent,
    margemLiquidaPercent,
    countVendas,
    ticketMedio,
    vendasConcluidasCount: countVendas,
    vendasCanceladasCount: periodCancelledSales.length,
    totalCancelado,
  };

  // 3. Distribuição por Meio de Pagamento
  const paymentsTotals: Record<string, number> = {
    MULTICAIXA: 0,
    DINHEIRO: 0,
    TRANSFERENCIA: 0,
    MISTO: 0,
  };

  filteredSales.forEach((s) => {
    if (Array.isArray(s.payments)) {
      s.payments.forEach((p) => {
        const method = p.method || 'DINHEIRO';
        paymentsTotals[method] = (paymentsTotals[method] || 0) + (Number(p.amount) || 0);
      });
    }
  });

  const totalPayments = Object.values(paymentsTotals).reduce((a, b) => a + b, 0);
  const paymentBreakdown: PaymentBreakdownItem[] = Object.entries(paymentsTotals).map(([method, amount]) => ({
    method,
    amount,
    percentage: totalPayments > 0 ? Math.round((amount / totalPayments) * 100) : 0,
  }));

  // 4. Produtos Mais Vendidos
  const productMap: Record<string, { id: string; name: string; quantity: number; revenue: number; profit: number }> = {};

  filteredSales.forEach((s) => {
    if (Array.isArray(s.items)) {
      s.items.forEach((item) => {
        const prodId = item.productId || item.productName;
        if (!productMap[prodId]) {
          productMap[prodId] = {
            id: prodId,
            name: item.productName || 'Produto sem nome',
            quantity: 0,
            revenue: 0,
            profit: 0,
          };
        }
        const itemRevenue = Number(item.total) || Number(item.quantity) * Number(item.unitPrice) || 0;
        const itemCost = Number(item.costPrice) * Number(item.quantity) || itemRevenue * 0.7;
        productMap[prodId].quantity += Number(item.quantity) || 0;
        productMap[prodId].revenue += itemRevenue;
        productMap[prodId].profit += itemRevenue - itemCost;
      });
    }
  });

  const topProducts: TopProductItem[] = Object.values(productMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  // 5. Distribuição por Categoria
  const categoryMap: Record<string, { amount: number; quantity: number }> = {};
  filteredSales.forEach((s) => {
    if (Array.isArray(s.items)) {
      s.items.forEach((item) => {
        const matchedProd = products.find((p) => p.id === item.productId);
        const cat = matchedProd?.category || 'Geral';
        if (!categoryMap[cat]) {
          categoryMap[cat] = { amount: 0, quantity: 0 };
        }
        const itemRevenue = Number(item.total) || Number(item.quantity) * Number(item.unitPrice) || 0;
        categoryMap[cat].amount += itemRevenue;
        categoryMap[cat].quantity += Number(item.quantity) || 0;
      });
    }
  });

  const totalCatAmount = Object.values(categoryMap).reduce((acc, c) => acc + c.amount, 0);
  const categoryBreakdown: CategoryBreakdownItem[] = Object.entries(categoryMap).map(([category, data]) => ({
    category,
    amount: data.amount,
    quantity: data.quantity,
    percentage: totalCatAmount > 0 ? Math.round((data.amount / totalCatAmount) * 100) : 0,
  }));

  return {
    period,
    metrics,
    filteredSales,
    filteredExpenses,
    paymentBreakdown,
    topProducts,
    categoryBreakdown,
    calculatedAt: new Date().toISOString(),
  };
}
