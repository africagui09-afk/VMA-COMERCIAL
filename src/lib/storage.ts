import { Expense, Product, Sale, SyncQueueItem, User } from '../types';
import { broadcastLocalChange } from './realtimeBus';

export const SELLER_DAILY_LIMIT = 900000; // 900.000 Kz

export const DEFAULT_USERS: User[] = [
  {
    id: 'user-seller-1',
    name: 'Carlos Vendedor',
    email: 'carlos.vendedor@kwanzapos.ao',
    role: 'VENDEDOR',
    pin: '1111',
  },
  {
    id: 'user-manager-1',
    name: 'Maria Silva',
    email: 'maria.gerente@kwanzapos.ao',
    role: 'GERENTE',
    pin: '2222',
  },
  {
    id: 'user-admin-1',
    name: 'Eng. António Domingos',
    email: 'antonio.admin@kwanzapos.ao',
    role: 'ADMINISTRADOR',
    pin: '1234',
  },
];

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Cerveja Cuca Lata 330ml',
    barcode: '5601234001',
    category: 'Bebidas',
    price: 650,
    costPrice: 450,
    stock: 85,
    minStock: 25,
    unit: 'lata',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-2',
    name: 'Refrigerante Blue Polpa 330ml',
    barcode: '5601234002',
    category: 'Bebidas',
    price: 500,
    costPrice: 320,
    stock: 42,
    minStock: 20,
    unit: 'un',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-3',
    name: 'Água Mineral Pura 1.5L',
    barcode: '5601234003',
    category: 'Bebidas',
    price: 400,
    costPrice: 220,
    stock: 110,
    minStock: 30,
    unit: 'garrafa',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-4',
    name: 'Arroz Agulha Tio Lucas 1kg',
    barcode: '5601234004',
    category: 'Mercearia',
    price: 1850,
    costPrice: 1350,
    stock: 4, // ABAIXO DO MÍNIMO
    minStock: 15,
    unit: 'pacote',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-5',
    name: 'Óleo Alimentar Fula 1L',
    barcode: '5601234005',
    category: 'Mercearia',
    price: 2400,
    costPrice: 1750,
    stock: 3, // ABAIXO DO MÍNIMO
    minStock: 12,
    unit: 'garrafa',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-6',
    name: 'Leite em Pó Nido Fortificada 400g',
    barcode: '5601234006',
    category: 'Laticínios',
    price: 4950,
    costPrice: 3800,
    stock: 19,
    minStock: 8,
    unit: 'lata',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-7',
    name: 'Massa Esparguete Nacional 500g',
    barcode: '5601234007',
    category: 'Mercearia',
    price: 850,
    costPrice: 550,
    stock: 65,
    minStock: 20,
    unit: 'pacote',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-8',
    name: 'Açúcar Branco Doce 1kg',
    barcode: '5601234008',
    category: 'Mercearia',
    price: 1200,
    costPrice: 850,
    stock: 2, // ABAIXO DO MÍNIMO
    minStock: 10,
    unit: 'kg',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-9',
    name: 'Sabão Azul Tradicional 200g',
    barcode: '5601234009',
    category: 'Higiene & Limpeza',
    price: 450,
    costPrice: 280,
    stock: 48,
    minStock: 15,
    unit: 'barra',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-10',
    name: 'Detergente Omo Multiação 1kg',
    barcode: '5601234010',
    category: 'Higiene & Limpeza',
    price: 3200,
    costPrice: 2300,
    stock: 14,
    minStock: 8,
    unit: 'pacote',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-11',
    name: 'Bolacha Maria Campina 200g',
    barcode: '5601234011',
    category: 'Mercearia',
    price: 600,
    costPrice: 380,
    stock: 0, // ESGOTADO
    minStock: 15,
    unit: 'pacote',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-12',
    name: 'Café Ginga Torrado Moído 250g',
    barcode: '5601234012',
    category: 'Bebidas',
    price: 2100,
    costPrice: 1450,
    stock: 22,
    minStock: 10,
    unit: 'pacote',
    updatedAt: new Date().toISOString(),
  },
];

const now = Date.now();
const minutesAgo = (m: number) => new Date(now - m * 60 * 1000).toISOString();
const hoursAgo = (h: number) => new Date(now - h * 60 * 60 * 1000).toISOString();
const daysAgo = (d: number) => new Date(now - d * 24 * 60 * 60 * 1000).toISOString();

const INITIAL_SALES: Sale[] = [
  {
    id: 'sale-001',
    invoiceNumber: 'VD-2026-0001',
    items: [
      {
        productId: 'prod-1',
        productName: 'Cerveja Cuca Lata 330ml',
        quantity: 12,
        unitPrice: 650,
        costPrice: 450,
        discount: 0,
        total: 7800,
      },
      {
        productId: 'prod-2',
        productName: 'Refrigerante Blue Polpa 330ml',
        quantity: 6,
        unitPrice: 500,
        costPrice: 320,
        discount: 0,
        total: 3000,
      },
    ],
    subtotal: 10800,
    discountTotal: 0,
    total: 10800,
    totalCost: 7320,
    payments: [{ method: 'MULTICAIXA', amount: 10800 }],
    amountReceived: 10800,
    change: 0,
    sellerId: 'user-seller-1',
    sellerName: 'Carlos Vendedor',
    sellerRole: 'VENDEDOR',
    customerName: 'Manuel Santos',
    status: 'CONCLUIDA',
    createdAt: minutesAgo(20), // 20 min atrás -> GERENTE PODE CANCELAR
    syncedToSupabase: true,
    sincronizado: true,
  },
  {
    id: 'sale-002',
    invoiceNumber: 'VD-2026-0002',
    items: [
      {
        productId: 'prod-6',
        productName: 'Leite em Pó Nido Fortificada 400g',
        quantity: 3,
        unitPrice: 4950,
        costPrice: 3800,
        discount: 0,
        total: 14850,
      },
      {
        productId: 'prod-7',
        productName: 'Massa Esparguete Nacional 500g',
        quantity: 5,
        unitPrice: 850,
        costPrice: 550,
        discount: 0,
        total: 4250,
      },
      {
        productId: 'prod-10',
        productName: 'Detergente Omo Multiação 1kg',
        quantity: 2,
        unitPrice: 3200,
        costPrice: 2300,
        discount: 0,
        total: 6400,
      },
    ],
    subtotal: 25500,
    discountTotal: 500,
    total: 25000,
    totalCost: 18750,
    payments: [{ method: 'DINHEIRO', amount: 25000 }],
    amountReceived: 30000,
    change: 5000,
    sellerId: 'user-seller-1',
    sellerName: 'Carlos Vendedor',
    sellerRole: 'VENDEDOR',
    status: 'CONCLUIDA',
    createdAt: hoursAgo(3), // 3 horas atrás -> GERENTE NÃO PODE CANCELAR (apenas Admin)
    syncedToSupabase: true,
    sincronizado: true,
  },
  {
    id: 'sale-003',
    invoiceNumber: 'VD-2026-0003',
    items: [
      {
        productId: 'prod-5',
        productName: 'Óleo Alimentar Fula 1L',
        quantity: 10,
        unitPrice: 2400,
        costPrice: 1750,
        discount: 0,
        total: 24000,
      },
      {
        productId: 'prod-4',
        productName: 'Arroz Agulha Tio Lucas 1kg',
        quantity: 15,
        unitPrice: 1850,
        costPrice: 1350,
        discount: 0,
        total: 27750,
      },
    ],
    subtotal: 51750,
    discountTotal: 0,
    total: 51750,
    totalCost: 37750,
    payments: [{ method: 'TRANSFERENCIA', amount: 51750 }],
    amountReceived: 51750,
    change: 0,
    sellerId: 'user-manager-1',
    sellerName: 'Maria Silva',
    sellerRole: 'GERENTE',
    customerName: 'Padaria Kianda',
    status: 'CONCLUIDA',
    createdAt: daysAgo(1),
    syncedToSupabase: true,
    sincronizado: true,
  },
];

const INITIAL_EXPENSES: Expense[] = [
  {
    id: 'exp-001',
    description: 'Avaria/Quebra de 1 caixa de Cuca no descarregamento',
    category: 'PERDA',
    amount: 10800,
    date: new Date().toISOString().split('T')[0],
    registeredBy: 'Maria Silva (Gerente)',
    createdAt: hoursAgo(4),
    syncedToSupabase: true,
  },
  {
    id: 'exp-002',
    description: 'Renda e aluguer do espaço comercial da loja',
    category: 'FIXA',
    amount: 80000,
    date: new Date().toISOString().split('T')[0],
    registeredBy: 'Eng. António Domingos',
    createdAt: daysAgo(2),
    syncedToSupabase: true,
  },
  {
    id: 'exp-003',
    description: 'Recarga de Energia Elétrica ENDE Loja',
    category: 'VARIAVEL',
    amount: 25000,
    date: new Date().toISOString().split('T')[0],
    registeredBy: 'Eng. António Domingos',
    createdAt: daysAgo(1),
    syncedToSupabase: true,
  },
  {
    id: 'exp-004',
    description: 'Adiantamento de Salário e Comissões dos Caixas',
    category: 'SALARIO',
    amount: 50000,
    date: new Date().toISOString().split('T')[0],
    registeredBy: 'Maria Silva (Gerente)',
    createdAt: hoursAgo(6),
    syncedToSupabase: true,
  },
];

export const KEYS = {
  PRODUCTS: 'kwanzapos_products_v1',
  SALES: 'kwanzapos_sales_v1',
  EXPENSES: 'kwanzapos_expenses_v1',
  CURRENT_USER: 'kwanzapos_current_user_v1',
  SYNC_QUEUE: 'kwanzapos_sync_queue_v1',
  INVOICE_SEQ: 'kwanzapos_invoice_sequence_v1',
  SUPABASE_CONFIG: 'kwanzapos_supabase_config_v1',
};

// Safe localStorage access
export function getFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function setToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Erro ao guardar no storage [${key}]:`, err);
  }
}

// Initialize seed data if not present or force clean
export function initStorage(forceClean: boolean = false): void {
  if (forceClean) {
    setToStorage(KEYS.PRODUCTS, INITIAL_PRODUCTS);
    setToStorage(KEYS.SALES, INITIAL_SALES);
    setToStorage(KEYS.EXPENSES, INITIAL_EXPENSES);
    setToStorage(KEYS.CURRENT_USER, DEFAULT_USERS[0]);
    setToStorage(KEYS.INVOICE_SEQ, 4);
    return;
  }

  const existingProducts = getFromStorage<Product[] | null>(KEYS.PRODUCTS, null);
  if (!existingProducts || !Array.isArray(existingProducts) || existingProducts.length === 0) {
    setToStorage(KEYS.PRODUCTS, INITIAL_PRODUCTS);
  }

  const existingSales = getFromStorage<Sale[] | null>(KEYS.SALES, null);
  if (!existingSales || !Array.isArray(existingSales)) {
    setToStorage(KEYS.SALES, INITIAL_SALES);
  }

  const existingExpenses = getFromStorage<Expense[] | null>(KEYS.EXPENSES, null);
  if (!existingExpenses || !Array.isArray(existingExpenses)) {
    setToStorage(KEYS.EXPENSES, INITIAL_EXPENSES);
  }

  const existingUser = getFromStorage<User | null>(KEYS.CURRENT_USER, null);
  if (!existingUser || !existingUser.id || !existingUser.role) {
    setToStorage(KEYS.CURRENT_USER, DEFAULT_USERS[0]);
  }

  if (!localStorage.getItem(KEYS.INVOICE_SEQ)) {
    setToStorage(KEYS.INVOICE_SEQ, 4);
  }
}

export function resetStorageToDefault(): void {
  initStorage(true);
}

// User state
export function getCurrentUser(): User {
  const user = getFromStorage<User>(KEYS.CURRENT_USER, DEFAULT_USERS[0]);
  if (!user || !user.id || !user.role) {
    setToStorage(KEYS.CURRENT_USER, DEFAULT_USERS[0]);
    return DEFAULT_USERS[0];
  }
  return user;
}

export function setCurrentUser(user: User): void {
  setToStorage(KEYS.CURRENT_USER, user);
}

export function getSystemUsers(): User[] {
  return DEFAULT_USERS;
}

// Products
export function getProducts(): Product[] {
  const prods = getFromStorage<Product[]>(KEYS.PRODUCTS, INITIAL_PRODUCTS);
  if (!Array.isArray(prods) || prods.length === 0) {
    setToStorage(KEYS.PRODUCTS, INITIAL_PRODUCTS);
    return INITIAL_PRODUCTS;
  }
  return prods;
}

export function saveProduct(product: Product): void {
  const products = getProducts();
  const index = products.findIndex((p) => p.id === product.id);
  const nowStr = new Date().toISOString();
  const updatedProduct = { ...product, updatedAt: nowStr };

  if (index >= 0) {
    products[index] = updatedProduct;
    addToSyncQueue('produtos', 'UPDATE', updatedProduct);
  } else {
    products.unshift(updatedProduct);
    addToSyncQueue('produtos', 'INSERT', updatedProduct);
  }
  setToStorage(KEYS.PRODUCTS, products);
  broadcastLocalChange('produtos', updatedProduct);
}

export function deleteProduct(productId: string): void {
  const products = getProducts();
  const filtered = products.filter((p) => p.id !== productId);
  setToStorage(KEYS.PRODUCTS, filtered);
  addToSyncQueue('produtos', 'DELETE', { id: productId });
  broadcastLocalChange('produtos', { id: productId, deleted: true });
}

export function adjustProductStock(productId: string, quantityChange: number, reason: string): Product | null {
  const products = getProducts();
  const p = products.find((item) => item.id === productId);
  if (!p) return null;
  p.stock = Math.max(0, p.stock + quantityChange);
  p.updatedAt = new Date().toISOString();
  saveProduct(p);
  return p;
}

// Sales
export function getSales(): Sale[] {
  return getFromStorage<Sale[]>(KEYS.SALES, INITIAL_SALES);
}

// Calculate Seller's sales total for today
export function getSellerDailyTotal(sellerId: string, dateStr?: string): number {
  const targetDate = dateStr || new Date().toISOString().split('T')[0];
  const sales = getSales();
  return sales
    .filter((s) => s.status === 'CONCLUIDA' && s.sellerId === sellerId && s.createdAt.startsWith(targetDate))
    .reduce((sum, s) => sum + s.total, 0);
}

// Check seller daily limit (900.000 Kz)
export function checkSellerLimit(
  sellerId: string,
  sellerRole: string,
  newSaleTotal: number
): { allowed: boolean; currentTotal: number; limit: number; remaining: number; error?: string } {
  if (sellerRole !== 'VENDEDOR') {
    return { allowed: true, currentTotal: 0, limit: SELLER_DAILY_LIMIT, remaining: SELLER_DAILY_LIMIT };
  }

  const currentTotal = getSellerDailyTotal(sellerId);
  const projectedTotal = currentTotal + newSaleTotal;
  const remaining = Math.max(0, SELLER_DAILY_LIMIT - currentTotal);

  if (projectedTotal > SELLER_DAILY_LIMIT) {
    return {
      allowed: false,
      currentTotal,
      limit: SELLER_DAILY_LIMIT,
      remaining,
      error: `Limite diário de 900.000 Kz excedido! Vendas hoje: ${currentTotal.toLocaleString('pt-AO')} Kz. Saldo restante: ${remaining.toLocaleString('pt-AO')} Kz. Esta venda é de ${newSaleTotal.toLocaleString('pt-AO')} Kz.`,
    };
  }

  return { allowed: true, currentTotal, limit: SELLER_DAILY_LIMIT, remaining };
}

// Generate Conflict-Free Invoice Number across simultaneous devices (e.g. VD-2026-0004)
function getNextInvoiceNumber(): string {
  const year = new Date().getFullYear();
  let seq = getFromStorage<number>(KEYS.INVOICE_SEQ, 1);
  const sales = getSales();
  const existingInvoices = new Set(sales.map((s) => s.invoiceNumber));

  let candidate = `VD-${year}-${String(seq).padStart(4, '0')}`;
  while (existingInvoices.has(candidate)) {
    seq++;
    candidate = `VD-${year}-${String(seq).padStart(4, '0')}`;
  }

  setToStorage(KEYS.INVOICE_SEQ, seq + 1);
  return candidate;
}

// Create new sale
export function createSale(saleData: Omit<Sale, 'id' | 'invoiceNumber' | 'createdAt' | 'status'>): {
  success: boolean;
  sale?: Sale;
  error?: string;
} {
  // 1. Verify seller limit
  const limitCheck = checkSellerLimit(saleData.sellerId, saleData.sellerRole, saleData.total);
  if (!limitCheck.allowed) {
    return { success: false, error: limitCheck.error };
  }

  // 2. Check stock availability for all items
  const products = getProducts();
  for (const item of saleData.items) {
    const prod = products.find((p) => p.id === item.productId);
    if (!prod) {
      return { success: false, error: `Produto não encontrado: ${item.productName}` };
    }
    if (prod.stock < item.quantity) {
      return {
        success: false,
        error: `Estoque insuficiente para "${prod.name}". Disponível: ${prod.stock}, Solicitado: ${item.quantity}`,
      };
    }
  }

  // 3. Deduct stock automatically
  for (const item of saleData.items) {
    const prod = products.find((p) => p.id === item.productId);
    if (prod) {
      prod.stock -= item.quantity;
      prod.updatedAt = new Date().toISOString();
    }
  }
  setToStorage(KEYS.PRODUCTS, products);

  // 4. Record sale with collision-safe unique id
  const newSale: Sale = {
    ...saleData,
    id: `sale-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    invoiceNumber: getNextInvoiceNumber(),
    status: 'CONCLUIDA',
    createdAt: new Date().toISOString(),
    syncedToSupabase: false,
    sincronizado: false,
  };

  const sales = getSales();
  sales.unshift(newSale);
  setToStorage(KEYS.SALES, sales);

  // 5. Queue for Supabase sync & broadcast to all tabs / devices
  addToSyncQueue('vendas', 'INSERT', newSale);
  broadcastLocalChange('all', { sale: newSale, stockDeducted: true });

  return { success: true, sale: newSale };
}

export function saveSale(sale: Sale): void {
  const sales = getSales();
  const index = sales.findIndex((s) => s.id === sale.id);
  if (index >= 0) {
    sales[index] = sale;
    addToSyncQueue('vendas', 'UPDATE', sale);
  } else {
    sales.unshift(sale);
    addToSyncQueue('vendas', 'INSERT', sale);
  }
  setToStorage(KEYS.SALES, sales);
  broadcastLocalChange('vendas', sale);
}

// Cancellation logic based on permissions
export function canCancelSale(
  sale: Sale,
  user: User
): { canCancel: boolean; reason?: string } {
  if (sale.status === 'CANCELADA') {
    return { canCancel: false, reason: 'Esta venda já foi cancelada anteriormente.' };
  }

  if (user.role === 'ADMINISTRADOR' || user.role === 'GERENTE') {
    const saleTime = new Date(sale.createdAt).getTime();
    const nowTime = Date.now();
    const diffInMinutes = (nowTime - saleTime) / (1000 * 60);

    if (diffInMinutes <= 60) {
      return { canCancel: true };
    } else {
      const minutesPassed = Math.round(diffInMinutes);
      return {
        canCancel: false,
        reason: `Cancelamento não autorizado: Tanto Administradores quanto Gerentes só podem cancelar vendas efetuadas em até 1 hora (60 minutos) da emissão. Esta venda ocorreu há ${minutesPassed} minutos.`,
      };
    }
  }

  return {
    canCancel: false,
    reason: 'Vendedores não têm permissão para cancelar vendas. Solicite a um Gerente ou Administrador.',
  };
}

// Cancel sale: restores stock and updates sale status
export function cancelSale(
  saleId: string,
  user: User,
  cancellationReason: string
): { success: boolean; error?: string } {
  const sales = getSales();
  const sale = sales.find((s) => s.id === saleId);
  if (!sale) return { success: false, error: 'Venda não encontrada.' };

  const check = canCancelSale(sale, user);
  if (!check.canCancel) {
    return { success: false, error: check.reason };
  }

  // Restore inventory
  const products = getProducts();
  for (const item of sale.items) {
    const prod = products.find((p) => p.id === item.productId);
    if (prod) {
      prod.stock += item.quantity;
      prod.updatedAt = new Date().toISOString();
    }
  }
  setToStorage(KEYS.PRODUCTS, products);

  // Update sale status
  sale.status = 'CANCELADA';
  sale.cancelledAt = new Date().toISOString();
  sale.cancelledBy = `${user.name} (${user.role})`;
  sale.cancellationReason = cancellationReason || 'Cancelamento aprovado';
  sale.syncedToSupabase = false;
  sale.sincronizado = false;

  setToStorage(KEYS.SALES, sales);
  addToSyncQueue('cancelamentos', 'UPDATE', {
    id: sale.id,
    status: 'CANCELADA',
    cancelledAt: sale.cancelledAt,
    cancelledBy: sale.cancelledBy,
    cancellationReason: sale.cancellationReason,
  });

  broadcastLocalChange('all', { saleCancelled: sale });

  return { success: true };
}

// Expenses & Losses
export function getExpenses(): Expense[] {
  return getFromStorage<Expense[]>(KEYS.EXPENSES, INITIAL_EXPENSES);
}

export function addExpense(expense: Omit<Expense, 'id' | 'createdAt' | 'syncedToSupabase'>): Expense {
  const newExp: Expense = {
    ...expense,
    id: `exp-${Date.now()}`,
    createdAt: new Date().toISOString(),
    syncedToSupabase: false,
  };
  const list = getExpenses();
  list.unshift(newExp);
  setToStorage(KEYS.EXPENSES, list);
  addToSyncQueue('despesas', 'INSERT', newExp);
  broadcastLocalChange('despesas', newExp);
  return newExp;
}

export function updateExpense(expense: Expense): void {
  const list = getExpenses();
  const index = list.findIndex((e) => e.id === expense.id);
  if (index >= 0) {
    list[index] = expense;
    setToStorage(KEYS.EXPENSES, list);
    addToSyncQueue('despesas', 'UPDATE', expense);
    broadcastLocalChange('despesas', expense);
  }
}

export function deleteExpense(expenseId: string): void {
  const list = getExpenses();
  const filtered = list.filter((e) => e.id !== expenseId);
  setToStorage(KEYS.EXPENSES, filtered);
  addToSyncQueue('despesas', 'DELETE', { id: expenseId });
  broadcastLocalChange('despesas', { id: expenseId, deleted: true });
}

// Sync Queue for Offline-First Architecture
export function getSyncQueue(): SyncQueueItem[] {
  return getFromStorage<SyncQueueItem[]>(KEYS.SYNC_QUEUE, []);
}

export function addToSyncQueue(
  table: 'vendas' | 'produtos' | 'despesas' | 'cancelamentos',
  action: 'INSERT' | 'UPDATE' | 'DELETE',
  data: any
): void {
  const queue = getSyncQueue();
  queue.push({
    id: `sync-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    table,
    action,
    data,
    createdAt: new Date().toISOString(),
    attempts: 0,
  });
  setToStorage(KEYS.SYNC_QUEUE, queue);
}

export function removeSyncQueueItem(id: string): void {
  const queue = getSyncQueue();
  const filtered = queue.filter((item) => item.id !== id);
  setToStorage(KEYS.SYNC_QUEUE, filtered);
}

export function removeSyncQueueItemsForSale(saleId: string): void {
  const queue = getSyncQueue();
  const filtered = queue.filter(
    (item) => !(item.table === 'vendas' && (item.data?.id === saleId || item.data === saleId))
  );
  if (filtered.length !== queue.length) {
    setToStorage(KEYS.SYNC_QUEUE, filtered);
  }
}

export function clearSyncQueue(): void {
  setToStorage(KEYS.SYNC_QUEUE, []);
}

// Unsynced Sales Helper (pega vendas locais com sincronizado = false)
export function getUnsyncedSales(): Sale[] {
  const sales = getSales();
  return sales.filter(
    (s) => s.syncedToSupabase === false || s.sincronizado === false || (!s.syncedToSupabase && !s.sincronizado)
  );
}

export function markSalesAsSynced(saleIds: string[]): void {
  if (!saleIds || saleIds.length === 0) return;
  const sales = getSales();
  let changed = false;
  for (const s of sales) {
    if (saleIds.includes(s.id)) {
      s.syncedToSupabase = true;
      s.sincronizado = true;
      changed = true;
    }
  }
  if (changed) {
    setToStorage(KEYS.SALES, sales);
  }
}

// Supabase Connection Settings
export interface SupabaseConfig {
  url: string;
  anonKey: string;
  autoSync: boolean;
  lastSyncTime?: string;
}

export function getSupabaseConfig(): SupabaseConfig {
  const envUrl = ((import.meta as any).env?.VITE_SUPABASE_URL || '').trim();
  const envKey = ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '').trim();
  const saved = getFromStorage<SupabaseConfig>(KEYS.SUPABASE_CONFIG, {
    url: envUrl,
    anonKey: envKey,
    autoSync: true,
  });
  return {
    ...saved,
    url: saved.url || envUrl,
    anonKey: saved.anonKey || envKey,
    autoSync: saved.autoSync !== undefined ? saved.autoSync : true,
  };
}

export function saveSupabaseConfig(config: SupabaseConfig): void {
  setToStorage(KEYS.SUPABASE_CONFIG, config);
}
