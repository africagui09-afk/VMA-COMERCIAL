import React, { useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Cloud,
  CloudOff,
  Copy,
  Database,
  ExternalLink,
  Info,
  Key,
  RefreshCw,
  Server,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import {
  clearSyncQueue,
  getSupabaseConfig,
  getSyncQueue,
  getUnsyncedSales,
  saveSupabaseConfig,
} from '../lib/storage';
import { batchSyncSalesToSupabase, SUPABASE_SQL_SCHEMA } from '../lib/supabase';
import { SyncQueueItem } from '../types';

interface SupabaseModalProps {
  onClose: () => void;
  onRefreshData: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ onClose, onRefreshData }) => {
  const [config, setConfig] = useState(getSupabaseConfig());
  const [queue, setQueue] = useState<SyncQueueItem[]>(getSyncQueue());
  const [unsyncedCount, setUnsyncedCount] = useState<number>(getUnsyncedSales().length);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    setQueue(getSyncQueue());
    setUnsyncedCount(getUnsyncedSales().length);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseConfig(config);
    setSyncStatusMsg('Configurações do Supabase salvas com sucesso!');
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncStatusMsg(null);
    try {
      const result = await batchSyncSalesToSupabase();
      setQueue(getSyncQueue());
      setUnsyncedCount(getUnsyncedSales().length);
      setSyncStatusMsg(result.message);
      onRefreshData();
    } catch (err: any) {
      setSyncStatusMsg(`Erro na sincronização: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#111620] border border-zinc-700 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-[#0e131b] border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">
              Arquitetura Híbrida: Offline-First & Supabase Sync
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5 text-xs">
          {/* Status Banner */}
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isOnline
                    ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-700'
                    : 'bg-amber-950/60 text-amber-400 border border-amber-700'
                }`}
              >
                {isOnline ? <Wifi className="w-5 h-5 animate-pulse" /> : <WifiOff className="w-5 h-5" />}
              </div>
              <div>
                <div className="font-bold text-sm text-white">
                  {isOnline ? 'Conexão com a Internet Ativa' : 'Dispositivo em Modo Offline'}
                </div>
                <div className="text-zinc-400 text-[11px] mt-0.5">
                  {isOnline
                    ? 'Pronto para sincronizar automaticamente com a nuvem Supabase.'
                    : 'Todas as operações e vendas continuam a ser gravadas localmente.'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncing}
              className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
            </button>
          </div>

          {/* Sync status feedback */}
          {syncStatusMsg && (
            <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-700/80 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{syncStatusMsg}</span>
            </div>
          )}

          {/* Pending Queue section */}
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-300 flex items-center gap-2">
                <Server className="w-4 h-4 text-zinc-400" />
                <span>Fila Local de Sincronização</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-emerald-400 font-bold text-[11px]">
                {Math.max(queue.length, unsyncedCount)} pendência{Math.max(queue.length, unsyncedCount) === 1 ? '' : 's'}
              </span>
            </div>
            <p className="text-zinc-400 text-[11px]">
              Quando você realiza vendas, cadastra produtos ou despesas offline, as ações são enfileiradas localmente com segurança para sincronização posterior.
            </p>

            {queue.length > 0 && (
              <div className="max-h-28 overflow-y-auto space-y-1 pt-2">
                {queue.slice(0, 5).map((item) => (
                  <div key={item.id} className="p-1.5 rounded bg-zinc-950 text-[10px] text-zinc-400 flex justify-between">
                    <span className="font-mono text-emerald-400">{item.action} {item.table}</span>
                    <span>{new Date(item.createdAt).toLocaleTimeString()}</span>
                  </div>
                ))}
                {queue.length > 5 && (
                  <div className="text-center text-[10px] text-zinc-500">
                    + {queue.length - 5} outros itens na fila
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Supabase Credentials Form */}
          <form onSubmit={handleSaveCredentials} className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-200 flex items-center gap-2">
                <Cloud className="w-4 h-4 text-emerald-400" />
                <span>Credenciais do Supabase (Opcional)</span>
              </span>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">Supabase Project URL:</label>
              <input
                type="text"
                value={config.url}
                onChange={(e) => setConfig({ ...config, url: e.target.value.trim() })}
                placeholder="https://xyzcompany.supabase.co"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">Supabase Anon Public API Key:</label>
              <input
                type="password"
                value={config.anonKey}
                onChange={(e) => setConfig({ ...config, anonKey: e.target.value.trim() })}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={handleCopySql}
                className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 text-xs font-semibold"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedSql ? '✓ Script SQL Copiado!' : 'Copiar Script SQL das Tabelas'}</span>
              </button>

              <button
                type="submit"
                className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg font-bold"
              >
                Salvar Credenciais
              </button>
            </div>
          </form>
        </div>

        <div className="p-4 bg-[#0e131b] border-t border-zinc-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
