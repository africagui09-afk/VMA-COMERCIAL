export type ChangeEntity = 'produtos' | 'vendas' | 'despesas' | 'fiado' | 'all';

let broadcastBus: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastBus = new BroadcastChannel('kwanzapos_realtime_bus');
  } catch {
    broadcastBus = null;
  }
}

/**
 * Notifica instantaneamente todas as outras abas/janelas abertas no mesmo navegador
 * que houve uma baixa ou alteração de dados.
 */
export function broadcastLocalChange(entity: ChangeEntity = 'all', payload?: any): void {
  if (broadcastBus) {
    try {
      broadcastBus.postMessage({
        type: 'KWANZA_DATA_CHANGED',
        entity,
        payload,
        timestamp: Date.now(),
      });
    } catch {
      // safe fallback
    }
  }

  // Notifica também ouvintes locais na mesma aba/janela
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent('kwanza_local_change', {
          detail: { entity, payload, timestamp: Date.now() },
        })
      );
    } catch {
      // safe fallback
    }
  }
}

export function getBroadcastBus(): BroadcastChannel | null {
  return broadcastBus;
}
