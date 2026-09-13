import { getSupabaseClient } from './supabase';
import { broadcastLocalChange } from './realtimeBus';

export interface ClienteFiado {
  id: string;
  nome: string;
  telefone: string;
  nif: string;
  endereco: string;
  limite_credito: number; // Em Kwanzas (Kz)
  saldo_devedor: number;  // Saldo atual devedor em Kz
  status: 'ATIVO' | 'BLOQUEADO';
  criado_em: string;
  atualizado_em: string;
}

export interface HistoricoFiado {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  venda_id?: string;
  invoice_number?: string;
  tipo: 'COMPRA_FIADO' | 'PAGAMENTO';
  valor: number;
  saldo_anterior: number;
  saldo_posterior: number;
  data: string;
  registrado_por: string;
  observacoes?: string;
}

const STORAGE_KEYS = {
  CLIENTES: 'kwanzapos_clientes_fiado_v2',
  HISTORICO: 'kwanzapos_historico_fiado_v2',
};

// Clientes iniciais reais de Saurimo para contas correntes a fiado
const CLIENTES_INICIAIS: ClienteFiado[] = [
  {
    id: 'cli-001',
    nome: 'Padaria Saurimo Lda',
    telefone: '924 111 222',
    nif: '5001239010',
    endereco: 'Rua Principal do Comércio, Saurimo',
    limite_credito: 450000,
    saldo_devedor: 120000,
    status: 'ATIVO',
    criado_em: '2026-01-10T10:00:00.000Z',
    atualizado_em: '2026-01-10T10:00:00.000Z',
  },
  {
    id: 'cli-002',
    nome: 'Comercial do Chicapa & Filhos',
    telefone: '931 445 667',
    nif: '5002448123',
    endereco: 'Avenida 4 de Fevereiro, Saurimo',
    limite_credito: 600000,
    saldo_devedor: 215000,
    status: 'ATIVO',
    criado_em: '2026-01-12T11:30:00.000Z',
    atualizado_em: '2026-01-12T11:30:00.000Z',
  },
  {
    id: 'cli-003',
    nome: 'Oficina Central da Lunda Sul',
    telefone: '922 998 123',
    nif: '5003991204',
    endereco: 'Bairro Txizainga II, Saurimo',
    limite_credito: 300000,
    saldo_devedor: 45000,
    status: 'ATIVO',
    criado_em: '2026-01-15T09:15:00.000Z',
    atualizado_em: '2026-01-15T09:15:00.000Z',
  },
  {
    id: 'cli-004',
    nome: 'Cantina Estrela do Txizainga',
    telefone: '940 776 554',
    nif: '5005882319',
    endereco: 'Mercado Municipal de Saurimo',
    limite_credito: 250000,
    saldo_devedor: 240000, // Saldo quase no limite -> Para validação estrita
    status: 'ATIVO',
    criado_em: '2026-01-18T14:20:00.000Z',
    atualizado_em: '2026-01-18T14:20:00.000Z',
  },
];

const HISTORICO_INICIAL: HistoricoFiado[] = [
  {
    id: 'hist-001',
    cliente_id: 'cli-001',
    cliente_nome: 'Padaria Saurimo Lda',
    tipo: 'COMPRA_FIADO',
    valor: 120000,
    saldo_anterior: 0,
    saldo_posterior: 120000,
    data: '2026-02-15T11:00:00.000Z',
    registrado_por: 'Mauro Jorge (Gerente)',
    observacoes: 'Compra a prazo autorizada pela Gerência',
  },
];

/**
 * Retorna todos os clientes de fiado (tenta Supabase se online, senão local)
 */
export async function getClientesFiadoAsync(): Promise<ClienteFiado[]> {
  const client = getSupabaseClient();
  if (client && navigator.onLine) {
    try {
      const { data, error } = await client
        .from('clientes_fiado')
        .select('*')
        .order('nome', { ascending: true });

      if (!error && data && data.length > 0) {
        const mapped: ClienteFiado[] = data.map((d: any) => ({
          id: String(d.id),
          nome: d.nome || '',
          telefone: d.telefone || '',
          nif: d.nif || '',
          endereco: d.endereco || '',
          limite_credito: Number(d.limite_credito) || 0,
          saldo_devedor: Number(d.saldo_devedor) || 0,
          status: d.status || 'ATIVO',
          criado_em: d.criado_em || d.created_at || new Date().toISOString(),
          atualizado_em: d.atualizado_em || d.updated_at || new Date().toISOString(),
        }));
        saveClientesLocais(mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('Erro ao consultar clientes_fiado no Supabase:', err);
    }
  }
  return getClientesLocais();
}

/**
 * Lê clientes do localStorage
 */
export function getClientesLocais(): ClienteFiado[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CLIENTES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.CLIENTES, JSON.stringify(CLIENTES_INICIAIS));
      return CLIENTES_INICIAIS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEYS.CLIENTES, JSON.stringify(CLIENTES_INICIAIS));
      return CLIENTES_INICIAIS;
    }
    return parsed;
  } catch {
    return CLIENTES_INICIAIS;
  }
}

export function saveClientesLocais(clientes: ClienteFiado[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CLIENTES, JSON.stringify(clientes));
  } catch (err) {
    console.error('Erro ao guardar clientes locais:', err);
  }
}

/**
 * Busca clientes em tempo real por nome ou NIF
 */
export function buscarClientes(termo: string): ClienteFiado[] {
  const todos = getClientesLocais();
  if (!termo || !termo.trim()) return todos;
  const q = termo.trim().toLowerCase();
  return todos.filter(
    (c) =>
      c.nome.toLowerCase().includes(q) ||
      c.nif.toLowerCase().includes(q) ||
      c.telefone.toLowerCase().includes(q)
  );
}

/**
 * Validação estrita de limite de crédito para Fiado:
 * Se (saldo_devedor + total_da_venda) > limite_credito, bloqueia!
 */
export function validarLimiteFiado(
  cliente: ClienteFiado,
  totalVenda: number
): {
  permitido: boolean;
  saldoAtual: number;
  limiteCredito: number;
  saldoProjetado: number;
  disponivel: number;
  excedente: number;
  erro?: string;
} {
  const saldoAtual = Number(cliente.saldo_devedor) || 0;
  const limiteCredito = Number(cliente.limite_credito) || 0;
  const saldoProjetado = saldoAtual + totalVenda;
  const disponivel = Math.max(0, limiteCredito - saldoAtual);
  const excedente = Math.max(0, saldoProjetado - limiteCredito);

  if (cliente.status !== 'ATIVO') {
    return {
      permitido: false,
      saldoAtual,
      limiteCredito,
      saldoProjetado,
      disponivel: 0,
      excedente,
      erro: `Cliente "${cliente.nome}" está com a conta BLOQUEADA pela administração. Venda a fiado não permitida.`,
    };
  }

  if (saldoProjetado > limiteCredito) {
    return {
      permitido: false,
      saldoAtual,
      limiteCredito,
      saldoProjetado,
      disponivel,
      excedente,
      erro: `Limite de Crédito Excedido! Saldo devedor atual (${saldoAtual.toLocaleString('pt-AO')} Kz) + Nova Venda (${totalVenda.toLocaleString('pt-AO')} Kz) = ${saldoProjetado.toLocaleString('pt-AO')} Kz ultrapassa o limite contratado de ${limiteCredito.toLocaleString('pt-AO')} Kz (Excedente: ${excedente.toLocaleString('pt-AO')} Kz).`,
    };
  }

  return {
    permitido: true,
    saldoAtual,
    limiteCredito,
    saldoProjetado,
    disponivel,
    excedente: 0,
  };
}

/**
 * Conclui a venda a Fiado:
 * 1. Atualiza o saldo devedor do cliente na tabela clientes_fiado
 * 2. Registra a transação na tabela historico_fiado
 */
export async function registrarVendaFiado(
  clienteId: string,
  vendaId: string,
  invoiceNumber: string,
  totalVenda: number,
  operadorNome: string
): Promise<{ success: boolean; clienteAtualizado?: ClienteFiado; erro?: string }> {
  const clientes = getClientesLocais();
  const cliente = clientes.find((c) => c.id === clienteId);

  if (!cliente) {
    return { success: false, erro: 'Cliente de fiado não localizado.' };
  }

  const validacao = validarLimiteFiado(cliente, totalVenda);
  if (!validacao.permitido) {
    return { success: false, erro: validacao.erro };
  }

  const saldoAnterior = cliente.saldo_devedor;
  const saldoPosterior = saldoAnterior + totalVenda;

  // Atualizar cliente
  cliente.saldo_devedor = saldoPosterior;
  cliente.atualizado_em = new Date().toISOString();
  saveClientesLocais(clientes);

  // Criar registro no histórico
  const novoRegistro: HistoricoFiado = {
    id: `hf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    cliente_id: cliente.id,
    cliente_nome: cliente.nome,
    venda_id: vendaId,
    invoice_number: invoiceNumber,
    tipo: 'COMPRA_FIADO',
    valor: totalVenda,
    saldo_anterior: saldoAnterior,
    saldo_posterior: saldoPosterior,
    data: new Date().toISOString(),
    registrado_por: operadorNome,
    observacoes: `Venda a prazo Ref. ${invoiceNumber}`,
  };

  const historico = getHistoricoLocais();
  historico.unshift(novoRegistro);
  saveHistoricoLocais(historico);

  // Sincronizar com Supabase se online
  const client = getSupabaseClient();
  if (client && navigator.onLine) {
    try {
      await client
        .from('clientes_fiado')
        .update({
          saldo_devedor: saldoPosterior,
          atualizado_em: cliente.atualizado_em,
        })
        .eq('id', cliente.id);

      await client
        .from('historico_fiado')
        .insert({
          id: novoRegistro.id,
          cliente_id: novoRegistro.cliente_id,
          venda_id: novoRegistro.venda_id,
          tipo: novoRegistro.tipo,
          valor: novoRegistro.valor,
          saldo_anterior: novoRegistro.saldo_anterior,
          saldo_posterior: novoRegistro.saldo_posterior,
          data: novoRegistro.data,
          registrado_por: novoRegistro.registrado_por,
          observacoes: novoRegistro.observacoes,
        });
    } catch (err) {
      console.warn('Erro ao sincronizar venda a fiado com Supabase:', err);
    }
  }

  broadcastLocalChange('fiado', { tipo: 'VENDA_FIADO', clienteId, totalVenda });
  return { success: true, clienteAtualizado: cliente };
}

/**
 * Liquidação / Pagamento de dívida de Fiado
 */
export async function registrarPagamentoFiado(
  clienteId: string,
  valorPago: number,
  metodo: string,
  operadorNome: string
): Promise<{ success: boolean; clienteAtualizado?: ClienteFiado; erro?: string }> {
  if (valorPago <= 0) {
    return { success: false, erro: 'Informe um valor válido para pagamento.' };
  }

  const clientes = getClientesLocais();
  const cliente = clientes.find((c) => c.id === clienteId);

  if (!cliente) {
    return { success: false, erro: 'Cliente não encontrado.' };
  }

  const saldoAnterior = cliente.saldo_devedor;
  const saldoPosterior = Math.max(0, saldoAnterior - valorPago);

  cliente.saldo_devedor = saldoPosterior;
  cliente.atualizado_em = new Date().toISOString();
  saveClientesLocais(clientes);

  const novoRegistro: HistoricoFiado = {
    id: `hf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    cliente_id: cliente.id,
    cliente_nome: cliente.nome,
    tipo: 'PAGAMENTO',
    valor: valorPago,
    saldo_anterior: saldoAnterior,
    saldo_posterior: saldoPosterior,
    data: new Date().toISOString(),
    registrado_por: operadorNome,
    observacoes: `Amortização de dívida via ${metodo}`,
  };

  const historico = getHistoricoLocais();
  historico.unshift(novoRegistro);
  saveHistoricoLocais(historico);

  // Sincronizar com Supabase se online
  const client = getSupabaseClient();
  if (client && navigator.onLine) {
    try {
      await client
        .from('clientes_fiado')
        .update({
          saldo_devedor: saldoPosterior,
          atualizado_em: cliente.atualizado_em,
        })
        .eq('id', cliente.id);

      await client
        .from('historico_fiado')
        .insert({
          id: novoRegistro.id,
          cliente_id: novoRegistro.cliente_id,
          tipo: novoRegistro.tipo,
          valor: novoRegistro.valor,
          saldo_anterior: novoRegistro.saldo_anterior,
          saldo_posterior: novoRegistro.saldo_posterior,
          data: novoRegistro.data,
          registrado_por: novoRegistro.registrado_por,
          observacoes: novoRegistro.observacoes,
        });
    } catch (err) {
      console.warn('Erro ao sincronizar pagamento no Supabase:', err);
    }
  }

  broadcastLocalChange('fiado', { tipo: 'PAGAMENTO_FIADO', clienteId, valorPago });
  return { success: true, clienteAtualizado: cliente };
}

export function getHistoricoLocais(): HistoricoFiado[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HISTORICO);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.HISTORICO, JSON.stringify(HISTORICO_INICIAL));
      return HISTORICO_INICIAL;
    }
    return JSON.parse(raw);
  } catch {
    return HISTORICO_INICIAL;
  }
}

export function saveHistoricoLocais(hist: HistoricoFiado[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.HISTORICO, JSON.stringify(hist));
  } catch (err) {
    console.error('Erro ao guardar histórico:', err);
  }
}

/**
 * Busca clientes por nome de forma assíncrona
 */
export async function buscarClientePorNome(nome: string): Promise<ClienteFiado[]> {
  const lista = await getClientesFiadoAsync();
  if (!nome || !nome.trim()) return lista;
  const q = nome.trim().toLowerCase();
  return lista.filter(
    (c) =>
      c.nome.toLowerCase().includes(q) ||
      c.nif.toLowerCase().includes(q) ||
      c.telefone.toLowerCase().includes(q)
  );
}

/**
 * Processa a venda a prazo (fiado) validando limite de crédito e registrando transação
 */
export async function processarVendaFiado(
  clienteId: string,
  totalVenda: number,
  _itens: any[] = []
): Promise<{ sucesso: boolean; mensagem: string }> {
  const invoiceNumber = `VD-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const sessionRaw = localStorage.getItem('kwanzapos_auth_session_v2');
  let operador = 'Victor Abreu';
  try {
    if (sessionRaw) {
      const parsed = JSON.parse(sessionRaw);
      if (parsed?.user?.name) operador = parsed.user.name;
    }
  } catch {
    // fallback
  }

  const res = await registrarVendaFiado(
    clienteId,
    `venda-${Date.now()}`,
    invoiceNumber,
    totalVenda,
    operador
  );

  if (!res.success) {
    return { sucesso: false, mensagem: res.erro || 'Não foi possível concluir a venda a fiado.' };
  }

  return {
    sucesso: true,
    mensagem: `✅ Venda a Fiado concluída com sucesso! Documento: ${invoiceNumber}. Saldo atualizado do cliente.`,
  };
}

