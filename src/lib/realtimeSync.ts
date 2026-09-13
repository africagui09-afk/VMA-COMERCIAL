import { getSupabaseClient } from './supabase';
import {
  getProducts,
  getSales,
  getExpenses,
  saveProduct,
  deleteProduct,
  saveSale,
  getFromStorage,
  setToStorage,
  KEYS,
} from './storage';
import {
  getClientesLocais,
  saveClientesLocais,
  getHistoricoLocais,
  saveHistoricoLocais,
  ClienteFiado,
  HistoricoFiado,
} from './fiadoService';
import { Expense, Product, Sale } from '../types';
import { broadcastLocalChange, getBroadcastBus, type ChangeEntity } from './realtimeBus';

export { broadcastLocalChange, type ChangeEntity };

/**
 * Reconcilia dados remotos do Supabase com o LocalStorage local,
 * garantindo consistência 100% em tempo real entre Desktop, Tablet e Telemóvel.
 */
export async function pullAndMergeRemoteData(): Promise<{
  produtos: number;
  despesas: number;
  fiados: number;
  vendas: number;
}> {
  const client = getSupabaseClient();
  const summary = { produtos: 0, despesas: 0, fiados: 0, vendas: 0 };

  if (!client || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return summary;
  }

  try {
    // 1. Reconcilia Produtos
    const { data: remoteProducts, error: prodErr } = await client.from('produtos').select('*');
    if (!prodErr && Array.isArray(remoteProducts) && remoteProducts.length > 0) {
      const localProducts = getProducts();
      const mergedMap = new Map<string, Product>();

      localProducts.forEach((p) => mergedMap.set(p.id, p));

      remoteProducts.forEach((r: any) => {
        const remoteProd: Product = {
          id: String(r.id),
          name: r.name || 'Sem nome',
          barcode: r.barcode || '',
          category: r.category || 'Geral',
          price: Number(r.price) || 0,
          costPrice: Number(r.costPrice) || 0,
          stock: Number(r.stock) || 0,
          minStock: Number(r.minStock) || 5,
          unit: r.unit || 'un',
          imageUrl: r.imageUrl || undefined,
          updatedAt: r.updatedAt || new Date().toISOString(),
        };

        const existing = mergedMap.get(remoteProd.id);
        if (!existing || new Date(remoteProd.updatedAt) >= new Date(existing.updatedAt)) {
          mergedMap.set(remoteProd.id, remoteProd);
        }
      });

      const updatedList = Array.from(mergedMap.values());
      setToStorage(KEYS.PRODUCTS, updatedList);
      summary.produtos = updatedList.length;
    }

    // 2. Reconcilia Despesas
    const { data: remoteExpenses, error: expErr } = await client.from('despesas').select('*');
    if (!expErr && Array.isArray(remoteExpenses) && remoteExpenses.length > 0) {
      const localExpenses = getExpenses();
      const mergedExp = new Map<string, Expense>();

      localExpenses.forEach((e) => mergedExp.set(e.id, e));

      remoteExpenses.forEach((r: any) => {
        const exp: Expense = {
          id: String(r.id),
          description: r.description || '',
          type: r.type || 'FIXA',
          category: r.category || 'Outros',
          amount: Number(r.amount) || 0,
          dueDate: r.dueDate || r.date,
          date: r.date || new Date().toISOString().split('T')[0],
          status: r.status || 'PAGO',
          registeredBy: r.registeredBy || 'Sistema',
          notes: r.notes || undefined,
          createdAt: r.createdAt || r.created_at || new Date().toISOString(),
        };
        mergedExp.set(exp.id, exp);
      });

      const updatedExpList = Array.from(mergedExp.values());
      setToStorage(KEYS.EXPENSES, updatedExpList);
      summary.despesas = updatedExpList.length;
    }

    // 3. Reconcilia Clientes de Fiado e Histórico
    const { data: remoteFiado, error: fiadoErr } = await client.from('clientes_fiado').select('*');
    if (!fiadoErr && Array.isArray(remoteFiado) && remoteFiado.length > 0) {
      const localClients = getClientesLocais();
      const clientMap = new Map<string, ClienteFiado>();

      localClients.forEach((c) => clientMap.set(c.id, c));

      remoteFiado.forEach((r: any) => {
        const cli: ClienteFiado = {
          id: String(r.id),
          nome: r.nome || '',
          telefone: r.telefone || '',
          nif: r.nif || '',
          endereco: r.endereco || '',
          limite_credito: Number(r.limite_credito) || 0,
          saldo_devedor: Number(r.saldo_devedor) || 0,
          status: r.status || 'ATIVO',
          criado_em: r.criado_em || r.created_at || new Date().toISOString(),
          atualizado_em: r.atualizado_em || r.updated_at || new Date().toISOString(),
        };
        const existing = clientMap.get(cli.id);
        if (!existing || new Date(cli.atualizado_em) >= new Date(existing.atualizado_em)) {
          clientMap.set(cli.id, cli);
        }
      });

      saveClientesLocais(Array.from(clientMap.values()));
      summary.fiados = clientMap.size;
    }

    // 4. Reconcilia Vendas
    const { data: remoteSales, error: salesErr } = await client
      .from('vendas')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(100);

    if (!salesErr && Array.isArray(remoteSales) && remoteSales.length > 0) {
      const localSales = getSales();
      const salesMap = new Map<string, Sale>();

      localSales.forEach((s) => salesMap.set(s.id, s));

      remoteSales.forEach((r: any) => {
        const sale: Sale = {
          id: String(r.id),
          invoiceNumber: r.invoiceNumber || '',
          items: Array.isArray(r.items) ? r.items : [],
          subtotal: Number(r.subtotal) || 0,
          discountTotal: Number(r.discountTotal) || 0,
          total: Number(r.total) || 0,
          totalCost: Number(r.totalCost) || 0,
          payments: Array.isArray(r.payments) ? r.payments : [],
          amountReceived: r.amountReceived !== null ? Number(r.amountReceived) : undefined,
          change: Number(r.change) || 0,
          sellerId: r.sellerId || '',
          sellerName: r.sellerName || '',
          sellerRole: r.sellerRole || 'VENDEDOR',
          customerName: r.customerName || undefined,
          customerNif: r.customerNif || undefined,
          notes: r.notes || undefined,
          status: r.status || 'CONCLUIDA',
          cancelledAt: r.cancelledAt || undefined,
          cancelledBy: r.cancelledBy || undefined,
          cancellationReason: r.cancellationReason || undefined,
          createdAt: r.createdAt || new Date().toISOString(),
          syncedToSupabase: true,
          sincronizado: true,
        };
        salesMap.set(sale.id, sale);
      });

      const updatedSales = Array.from(salesMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setToStorage(KEYS.SALES, updatedSales);
      summary.vendas = updatedSales.length;
    }
  } catch (err) {
    console.warn('Erro ao reconciliar dados com Supabase:', err);
  }

  return summary;
}

/**
 * Inicializa os ouvintes em tempo real:
 * 1. Supabase Realtime (WebSockets via postgres_changes) para sincronização instantânea
 *    entre Desktop, Tablet e Mobile (Estoque, Despesas, Fiado, Vendas).
 * 2. BroadcastChannel para comunicação instantânea entre abas no mesmo navegador.
 * 3. Storage Event para compatibilidade retroativa offline.
 */
export function subscribeToRealtimeSync(onDataChange: (entity: ChangeEntity) => void): () => void {
  // 1. Ouvinte do BroadcastChannel local
  const bus = getBroadcastBus();
  const handleBroadcast = (event: MessageEvent) => {
    if (event.data && event.data.type === 'KWANZA_DATA_CHANGED') {
      onDataChange(event.data.entity || 'all');
    }
  };

  if (bus) {
    bus.addEventListener('message', handleBroadcast);
  }

  // 2. Ouvinte de eventos de storage (fallback entre abas)
  const handleStorage = (event: StorageEvent) => {
    if (event.key && event.key.startsWith('kwanzapos_')) {
      onDataChange('all');
    }
  };
  window.addEventListener('storage', handleStorage);

  // 3. Ouvinte do Supabase Realtime (Nuvem Multi-dispositivo)
  const supabase = getSupabaseClient();
  let supabaseChannel: any = null;

  if (supabase) {
    try {
      supabaseChannel = supabase
        .channel('kwanza_realtime_full_replication')
        // Ouvinte de PRODUTOS (Estoque instantâneo)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'produtos' },
          (payload: any) => {
            try {
              if (payload.new && payload.new.id) {
                const updatedProd: Product = {
                  id: String(payload.new.id),
                  name: payload.new.name || 'Sem nome',
                  barcode: payload.new.barcode || '',
                  category: payload.new.category || 'Geral',
                  price: Number(payload.new.price) || 0,
                  costPrice: Number(payload.new.costPrice) || 0,
                  stock: Number(payload.new.stock) || 0,
                  minStock: Number(payload.new.minStock) || 5,
                  unit: payload.new.unit || 'un',
                  imageUrl: payload.new.imageUrl || undefined,
                  updatedAt: payload.new.updatedAt || new Date().toISOString(),
                };
                saveProduct(updatedProd);
              } else if (payload.eventType === 'DELETE' && payload.old?.id) {
                deleteProduct(String(payload.old.id));
              }
            } catch (err) {
              console.warn('Erro ao processar alteração em tempo real de produto:', err);
            }
            onDataChange('produtos');
          }
        )
        // Ouvinte de VENDAS (Frente de Caixa em tempo real)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'vendas' },
          (payload: any) => {
            try {
              if (payload.new && payload.new.id) {
                const sale: Sale = {
                  id: String(payload.new.id),
                  invoiceNumber: payload.new.invoiceNumber || '',
                  items: Array.isArray(payload.new.items) ? payload.new.items : [],
                  subtotal: Number(payload.new.subtotal) || 0,
                  discountTotal: Number(payload.new.discountTotal) || 0,
                  total: Number(payload.new.total) || 0,
                  totalCost: Number(payload.new.totalCost) || 0,
                  payments: Array.isArray(payload.new.payments) ? payload.new.payments : [],
                  amountReceived: payload.new.amountReceived !== null ? Number(payload.new.amountReceived) : undefined,
                  change: Number(payload.new.change) || 0,
                  sellerId: payload.new.sellerId || '',
                  sellerName: payload.new.sellerName || '',
                  sellerRole: payload.new.sellerRole || 'VENDEDOR',
                  customerName: payload.new.customerName || undefined,
                  customerNif: payload.new.customerNif || undefined,
                  notes: payload.new.notes || undefined,
                  status: payload.new.status || 'CONCLUIDA',
                  cancelledAt: payload.new.cancelledAt || undefined,
                  cancelledBy: payload.new.cancelledBy || undefined,
                  cancellationReason: payload.new.cancellationReason || undefined,
                  createdAt: payload.new.createdAt || new Date().toISOString(),
                  syncedToSupabase: true,
                  sincronizado: true,
                };
                saveSale(sale);
              }
            } catch (err) {
              console.warn('Erro ao processar alteração em tempo real de venda:', err);
            }
            onDataChange('vendas');
          }
        )
        // Ouvinte de DESPESAS
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'despesas' },
          (payload: any) => {
            try {
              const localExpenses = getExpenses();
              if (payload.new && payload.new.id) {
                const exp: Expense = {
                  id: String(payload.new.id),
                  description: payload.new.description || '',
                  type: payload.new.type || 'FIXA',
                  category: payload.new.category || 'Outros',
                  amount: Number(payload.new.amount) || 0,
                  dueDate: payload.new.dueDate || payload.new.date,
                  date: payload.new.date || new Date().toISOString().split('T')[0],
                  status: payload.new.status || 'PAGO',
                  registeredBy: payload.new.registeredBy || 'Sistema',
                  notes: payload.new.notes || undefined,
                  createdAt: payload.new.createdAt || payload.new.created_at || new Date().toISOString(),
                };
                const idx = localExpenses.findIndex((e) => e.id === exp.id);
                if (idx >= 0) {
                  localExpenses[idx] = exp;
                } else {
                  localExpenses.unshift(exp);
                }
                setToStorage(KEYS.EXPENSES, localExpenses);
              } else if (payload.eventType === 'DELETE' && payload.old?.id) {
                const filtered = localExpenses.filter((e) => e.id !== String(payload.old.id));
                setToStorage(KEYS.EXPENSES, filtered);
              }
            } catch (err) {
              console.warn('Erro ao processar alteração em tempo real de despesas:', err);
            }
            onDataChange('despesas');
          }
        )
        // Ouvinte de CLIENTES FIADO
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'clientes_fiado' },
          (payload: any) => {
            try {
              if (payload.new && payload.new.id) {
                const clients = getClientesLocais();
                const idx = clients.findIndex((c) => c.id === String(payload.new.id));
                const updatedClient: ClienteFiado = {
                  id: String(payload.new.id),
                  nome: payload.new.nome || '',
                  telefone: payload.new.telefone || '',
                  nif: payload.new.nif || '',
                  endereco: payload.new.endereco || '',
                  limite_credito: Number(payload.new.limite_credito) || 0,
                  saldo_devedor: Number(payload.new.saldo_devedor) || 0,
                  status: payload.new.status || 'ATIVO',
                  criado_em: payload.new.criado_em || payload.new.created_at || new Date().toISOString(),
                  atualizado_em: payload.new.atualizado_em || payload.new.updated_at || new Date().toISOString(),
                };
                if (idx >= 0) {
                  clients[idx] = updatedClient;
                } else {
                  clients.push(updatedClient);
                }
                saveClientesLocais(clients);
              }
            } catch (err) {
              console.warn('Erro ao processar alteração em tempo real de fiados:', err);
            }
            onDataChange('fiado');
          }
        )
        // Ouvinte de HISTÓRICO FIADO
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'historico_fiado' },
          (payload: any) => {
            try {
              if (payload.new && payload.new.id) {
                const historico = getHistoricoLocais();
                const exists = historico.some((h) => h.id === String(payload.new.id));
                if (!exists) {
                  const hItem: HistoricoFiado = {
                    id: String(payload.new.id),
                    cliente_id: String(payload.new.cliente_id),
                    cliente_nome: payload.new.cliente_nome || '',
                    venda_id: payload.new.venda_id || undefined,
                    invoice_number: payload.new.invoice_number || undefined,
                    tipo: payload.new.tipo || 'COMPRA_FIADO',
                    valor: Number(payload.new.valor) || 0,
                    saldo_anterior: Number(payload.new.saldo_anterior) || 0,
                    saldo_posterior: Number(payload.new.saldo_posterior) || 0,
                    data: payload.new.data || new Date().toISOString(),
                    registrado_por: payload.new.registrado_por || '',
                    observacoes: payload.new.observacoes || undefined,
                  };
                  historico.unshift(hItem);
                  saveHistoricoLocais(historico);
                }
              }
            } catch (err) {
              console.warn('Erro ao processar novo histórico de fiado:', err);
            }
            onDataChange('fiado');
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('Realtime Supabase não pôde ser ativado:', err);
    }
  }

  // Executa uma sincronização/reconciliação inicial assim que ativa
  pullAndMergeRemoteData().then((stats) => {
    if (stats.produtos > 0 || stats.despesas > 0 || stats.fiados > 0 || stats.vendas > 0) {
      onDataChange('all');
    }
  });

  // Retorna função de limpeza
  return () => {
    if (bus) {
      bus.removeEventListener('message', handleBroadcast);
    }
    window.removeEventListener('storage', handleStorage);
    if (supabase && supabaseChannel) {
      try {
        supabase.removeChannel(supabaseChannel);
      } catch {
        // ignore
      }
    }
  };
}
