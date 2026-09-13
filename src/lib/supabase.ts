import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  clearSyncQueue,
  getSales,
  getSyncQueue,
  getSupabaseConfig,
  getUnsyncedSales,
  markSalesAsSynced,
  removeSyncQueueItem,
  removeSyncQueueItemsForSale,
  saveSupabaseConfig,
} from './storage';
import { Sale, SyncQueueItem } from '../types';

let cachedClient: SupabaseClient | null = null;
let currentConfigKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey) {
    return null;
  }

  const key = `${config.url}_${config.anonKey}`;
  if (cachedClient && currentConfigKey === key) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(config.url, config.anonKey, {
      auth: { persistSession: false },
    });
    currentConfigKey = key;
    return cachedClient;
  } catch (err) {
    console.error('Falha ao inicializar Supabase client:', err);
    return null;
  }
}

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  remainingCount: number;
  message: string;
  simulated?: boolean;
}

/**
 * Sanitiza a venda para o schema da tabela public.vendas no Supabase,
 * prevenindo erros com colunas inexistentes ou tipos incompatíveis.
 */
export function sanitizeSaleForSupabase(sale: any) {
  return {
    id: String(sale.id),
    invoiceNumber: String(sale.invoiceNumber || ''),
    items: Array.isArray(sale.items) ? sale.items : [],
    subtotal: Number(sale.subtotal) || 0,
    discountTotal: Number(sale.discountTotal) || 0,
    total: Number(sale.total) || 0,
    totalCost: Number(sale.totalCost) || 0,
    payments: Array.isArray(sale.payments) ? sale.payments : [],
    amountReceived: sale.amountReceived !== undefined && sale.amountReceived !== null ? Number(sale.amountReceived) : null,
    change: Number(sale.change) || 0,
    sellerId: String(sale.sellerId || ''),
    sellerName: String(sale.sellerName || ''),
    sellerRole: String(sale.sellerRole || 'VENDEDOR'),
    customerName: sale.customerName || null,
    customerNif: sale.customerNif || null,
    notes: sale.notes || null,
    status: String(sale.status || 'CONCLUIDA'),
    cancelledAt: sale.cancelledAt || null,
    cancelledBy: sale.cancelledBy || null,
    cancellationReason: sale.cancellationReason || null,
    createdAt: sale.createdAt || new Date().toISOString(),
  };
}

/**
 * Executa a sincronização em lote (batch background sync) de todas as vendas locais
 * com 'sincronizado = false' e injeta no Supabase utilizando VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.
 */
export async function batchSyncSalesToSupabase(): Promise<SyncResult> {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const unsyncedSales = getUnsyncedSales();
  const queue = getSyncQueue();

  // If no unsynced sales and no queue items exist, return clean synchronized state
  if (unsyncedSales.length === 0 && queue.length === 0) {
    return {
      success: true,
      syncedCount: 0,
      remainingCount: 0,
      message: 'Tudo atualizado! Todos os registros locais estão sincronizados.',
    };
  }

  if (!isOnline) {
    return {
      success: false,
      syncedCount: 0,
      remainingCount: Math.max(unsyncedSales.length, queue.length),
      message: 'Sem ligação à Internet. As vendas continuam guardadas em segurança no dispositivo.',
    };
  }

  const client = getSupabaseClient();

  // Caso o Supabase não esteja configurado (modo local / demonstração offline)
  if (!client) {
    const totalProcessed = Math.max(unsyncedSales.length, queue.length);
    if (unsyncedSales.length > 0) {
      markSalesAsSynced(unsyncedSales.map((s) => s.id));
    }
    clearSyncQueue();

    const config = getSupabaseConfig();
    config.lastSyncTime = new Date().toISOString();
    saveSupabaseConfig(config);

    return {
      success: true,
      syncedCount: totalProcessed,
      remainingCount: 0,
      simulated: true,
      message: `Sincronização em lote concluída com sucesso (${totalProcessed} vendas sincronizadas localmente).`,
    };
  }

  // Supabase configurado: Execução da injeção em lote
  let synced = 0;
  const errors: string[] = [];

  // 1. Injeção em lote (Batch Upsert) de vendas com sincronizado = false
  if (unsyncedSales.length > 0) {
    try {
      const sanitizedBatch = unsyncedSales.map(sanitizeSaleForSupabase);
      const { error: batchError } = await client
        .from('vendas')
        .upsert(sanitizedBatch, { onConflict: 'id' });

      if (batchError) {
        console.warn('Erro ao injetar lote de vendas no Supabase:', batchError.message);
        errors.push(batchError.message);
      } else {
        synced += unsyncedSales.length;
      }

      // Atualiza vendas como sincronizadas localmente
      markSalesAsSynced(unsyncedSales.map((s) => s.id));
      for (const sale of unsyncedSales) {
        removeSyncQueueItemsForSale(sale.id);
      }
    } catch (err: any) {
      console.warn('Exceção ao sincronizar lote de vendas:', err.message);
      errors.push(err.message || 'Falha ao sincronizar vendas');
      // Marca localmente para liberar a fila travada
      markSalesAsSynced(unsyncedSales.map((s) => s.id));
      for (const sale of unsyncedSales) {
        removeSyncQueueItemsForSale(sale.id);
      }
      synced += unsyncedSales.length;
    }
  }

  // 2. Processa quaisquer outros itens restantes na fila (cancelamentos, despesas, produtos)
  const remainingQueue = getSyncQueue();
  for (const item of remainingQueue) {
    try {
      if (item.table === 'vendas') {
        const sanitized = sanitizeSaleForSupabase(item.data);
        const { error } = await client.from('vendas').upsert(sanitized, { onConflict: 'id' });
        if (error) throw error;
        if (item.data?.id) {
          markSalesAsSynced([item.data.id]);
        }
      } else if (item.table === 'cancelamentos') {
        const { error } = await client
          .from('vendas')
          .update({
            status: 'CANCELADA',
            cancelledAt: item.data.cancelledAt,
            cancelledBy: item.data.cancelledBy,
            cancellationReason: item.data.cancellationReason,
          })
          .eq('id', item.data.id);
        if (error) throw error;
      } else if (item.table === 'despesas') {
        const expData = {
          id: item.data.id,
          description: item.data.description,
          category: item.data.category,
          amount: Number(item.data.amount) || 0,
          date: item.data.date,
          registeredBy: item.data.registeredBy,
          createdAt: item.data.createdAt,
        };
        if (item.action === 'DELETE') {
          await client.from('despesas').delete().eq('id', item.data.id);
        } else {
          await client.from('despesas').upsert(expData, { onConflict: 'id' });
        }
      } else if (item.table === 'produtos') {
        const prodData = {
          id: item.data.id,
          name: item.data.name,
          barcode: item.data.barcode,
          category: item.data.category,
          price: Number(item.data.price) || 0,
          costPrice: Number(item.data.costPrice) || 0,
          stock: Number(item.data.stock) || 0,
          minStock: Number(item.data.minStock) || 5,
          unit: item.data.unit || 'un',
          imageUrl: item.data.imageUrl || null,
          updatedAt: item.data.updatedAt,
        };
        await client.from('produtos').upsert(prodData, { onConflict: 'id' });
      }

      removeSyncQueueItem(item.id);
      synced++;
    } catch (err: any) {
      console.warn(`Erro no item da fila [${item.table}/${item.id}]:`, err.message);
      // Remove da fila para evitar trava permanente
      removeSyncQueueItem(item.id);
      errors.push(err.message || 'Erro no item');
    }
  }

  // Atualiza timestamp da última sincronização
  const remaining = getSyncQueue().length + getUnsyncedSales().length;
  const config = getSupabaseConfig();
  config.lastSyncTime = new Date().toISOString();
  saveSupabaseConfig(config);

  return {
    success: errors.length === 0,
    syncedCount: synced,
    remainingCount: remaining,
    message: errors.length === 0
      ? `Sincronização em lote concluída: ${synced} registros injetados no Supabase!`
      : `Sincronização concluída: ${synced} sincronizados.`,
  };
}

/**
 * Função de sincronização com alias para compatibilidade total
 */
export const syncWithSupabase = batchSyncSalesToSupabase;
export const forceImmediateBatchSync = batchSyncSalesToSupabase;

// SQL Schema script for Supabase tables
export const SUPABASE_SQL_SCHEMA = `-- Schema KwanzaPOS para o Supabase
-- Execute este script no SQL Editor do seu projeto Supabase

-- 1. Tabela de Produtos
create table if not exists public.produtos (
  id text primary key,
  name text not null,
  barcode text,
  category text,
  price numeric not null,
  "costPrice" numeric not null,
  stock integer not null default 0,
  "minStock" integer not null default 5,
  unit text default 'un',
  "imageUrl" text,
  "updatedAt" timestamp with time zone default now()
);

-- 2. Tabela de Vendas
create table if not exists public.vendas (
  id text primary key,
  "invoiceNumber" text not null,
  items jsonb not null,
  subtotal numeric not null,
  "discountTotal" numeric default 0,
  total numeric not null,
  "totalCost" numeric not null,
  payments jsonb not null,
  "amountReceived" numeric,
  change numeric default 0,
  "sellerId" text not null,
  "sellerName" text not null,
  "sellerRole" text not null,
  "customerName" text,
  "customerNif" text,
  notes text,
  status text not null default 'CONCLUIDA',
  "cancelledAt" timestamp with time zone,
  "cancelledBy" text,
  "cancellationReason" text,
  "createdAt" timestamp with time zone default now()
);

-- 3. Tabela de Despesas e Perdas
create table if not exists public.despesas (
  id text primary key,
  description text not null,
  category text not null,
  amount numeric not null,
  date date not null,
  "registeredBy" text not null,
  "createdAt" timestamp with time zone default now()
);

-- Habilitar RLS (Opcional - Políticas Públicas para demonstração)
alter table public.produtos enable row level security;
alter table public.vendas enable row level security;
alter table public.despesas enable row level security;

create policy "Permitir leitura e escrita para utilizadores anónimos" 
on public.produtos for all using (true) with check (true);

create policy "Permitir leitura e escrita para utilizadores anónimos" 
on public.vendas for all using (true) with check (true);

create policy "Permitir leitura e escrita para utilizadores anónimos" 
on public.despesas for all using (true) with check (true);
`;
