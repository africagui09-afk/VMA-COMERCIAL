export type UserRole = 'VENDEDOR' | 'GERENTE' | 'ADMINISTRADOR';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  pin?: string;
  avatarUrl?: string;
}

export interface Product {
  id: string;
  name: string;
  barcode: string;
  category: string;
  price: number; // Sale price in Kz
  costPrice: number; // Cost price in Kz
  stock: number;
  minStock: number; // For red warning alert
  unit: string; // 'un', 'kg', 'cx', etc.
  imageUrl?: string;
  updatedAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discount: number; // discount in Kz
}

export type PaymentMethod = 'DINHEIRO' | 'MULTICAIXA' | 'TRANSFERENCIA' | 'MISTO' | 'FIADO';

export interface PaymentDetail {
  method: PaymentMethod;
  amount: number; // In Kz
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number; // In Kz
  costPrice: number; // In Kz
  discount: number; // In Kz
  total: number; // In Kz
}

export interface Sale {
  id: string;
  invoiceNumber: string; // e.g. VD-2026-0001
  items: SaleItem[];
  subtotal: number; // In Kz
  discountTotal: number; // In Kz
  total: number; // In Kz
  totalCost: number; // In Kz
  payments: PaymentDetail[];
  amountReceived: number; // For cash
  change: number; // Troco in Kz
  sellerId: string;
  sellerName: string;
  sellerRole: UserRole;
  customerName?: string;
  customerNif?: string;
  clienteFiadoId?: string;
  clienteFiadoNome?: string;
  notes?: string;
  status: 'CONCLUIDA' | 'CANCELADA';
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  createdAt: string; // ISO string
  syncedToSupabase?: boolean;
  sincronizado?: boolean;
}

export type ExpenseType = 'FIXA' | 'VARIAVEL';
export type ExpenseStatus = 'PAGO' | 'PENDENTE';
export type ExpenseCategory = 'Salários' | 'Renda' | 'Energia / ENDE' | 'Água / EPAL' | 'Internet & Comunicação' | 'Manutenção' | 'Transporte' | 'Mercadorias' | 'Outros' | 'FIXA' | 'VARIAVEL' | 'SALARIO' | 'PERDA';

export interface Expense {
  id: string;
  description: string;
  type?: ExpenseType; // 'FIXA' | 'VARIAVEL'
  category: ExpenseCategory | string;
  amount: number; // In Kz
  dueDate?: string; // Data de Vencimento
  date: string; // Data de Pagamento / Registro
  status?: ExpenseStatus; // 'PAGO' | 'PENDENTE'
  registeredBy: string;
  notes?: string;
  createdAt: string;
  syncedToSupabase?: boolean;
}

export interface DailySellerLimit {
  maxLimit: number; // 900.000 Kz
  currentTotal: number;
  remaining: number;
  percentageUsed: number;
}

export interface SyncQueueItem {
  id: string;
  table: 'vendas' | 'produtos' | 'despesas' | 'cancelamentos';
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  data: any;
  createdAt: string;
  attempts: number;
}
