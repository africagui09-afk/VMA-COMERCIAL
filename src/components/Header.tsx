import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Cloud,
  CloudOff,
  Database,
  Download,
  Layers,
  LayoutDashboard,
  Lock,
  LogOut,
  Moon,
  Package,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Sun,
  UserCheck,
  UserCog,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { User } from '../types';
import { formatKz, getRoleBadgeInfo } from '../lib/formatters';
import { getProducts, getSellerDailyTotal, getSyncQueue, getUnsyncedSales, SELLER_DAILY_LIMIT } from '../lib/storage';
import { batchSyncSalesToSupabase, forceImmediateBatchSync } from '../lib/supabase';

interface HeaderProps {
  currentUser: User;
  activeView: 'pdv' | 'estoque' | 'dashboard' | 'vendas';
  onNavigate: (view: 'pdv' | 'estoque' | 'dashboard' | 'vendas') => void;
  onOpenLogin: () => void;
  onOpenSupabaseModal: () => void;
  onExportPDF: () => void;
  stockAlertCount: number;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenUserManagement?: () => void;
  onLogout: () => void;
  onAccessDenied: (viewName: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  activeView,
  onNavigate,
  onOpenLogin,
  onOpenSupabaseModal,
  onExportPDF,
  stockAlertCount,
  theme,
  onToggleTheme,
  onOpenUserManagement,
  onLogout,
  onAccessDenied,
}) => {
  const isLight = theme === 'light';
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncCount, setSyncCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [dailySales, setDailySales] = useState<number>(0);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const updateStats = () => {
      const queueCount = getSyncQueue().length;
      const unsyncedSalesCount = getUnsyncedSales().length;
      setSyncCount(Math.max(queueCount, unsyncedSalesCount));
      if (currentUser.role === 'VENDEDOR') {
        setDailySales(getSellerDailyTotal(currentUser.id));
      }
    };

    const triggerSync = async () => {
      setIsSyncing(true);
      try {
        await batchSyncSalesToSupabase();
      } catch (err) {
        console.warn('Sincronização em lote background falhou:', err);
      } finally {
        setIsSyncing(false);
        updateStats();
      }
    };

    // Force immediate execution of batch background sync
    triggerSync();

    const interval = setInterval(() => {
      updateStats();
    }, 2000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [currentUser]);

  const handleQuickSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await forceImmediateBatchSync();
    } finally {
      setIsSyncing(false);
      const queueCount = getSyncQueue().length;
      const unsyncedSalesCount = getUnsyncedSales().length;
      setSyncCount(Math.max(queueCount, unsyncedSalesCount));
    }
  };

  const roleInfo = getRoleBadgeInfo(currentUser.role);
  const sellerLimitPercentage = Math.min(100, Math.round((dailySales / SELLER_DAILY_LIMIT) * 100));

  const handleTabClick = (view: 'pdv' | 'estoque' | 'dashboard' | 'vendas', viewLabel: string) => {
    if (view === 'pdv') {
      onNavigate('pdv');
      return;
    }

    if (currentUser.role === 'VENDEDOR') {
      // Physically block seller clicks and show access denied modal
      onAccessDenied(viewLabel);
      return;
    }

    if (view === 'dashboard' && currentUser.role !== 'ADMINISTRADOR') {
      onAccessDenied(viewLabel);
      return;
    }

    onNavigate(view);
  };

  return (
    <header
      className={`sticky top-0 z-40 border-b shadow-lg transition-colors duration-200 ${
        isLight
          ? 'bg-white border-slate-200 text-slate-900 shadow-slate-200/50'
          : 'bg-[#0e131b] border-zinc-800 text-zinc-100 shadow-black/40'
      }`}
    >
      {/* Top status & information bar */}
      <div
        className={`max-w-7xl mx-auto px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-xs border-b ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0a0d14] border-zinc-800/60'
        }`}
      >
        {/* Left: Online Status & Sync Queue */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            type="button"
            onClick={onOpenSupabaseModal}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all ${
              isOnline
                ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-400 hover:bg-emerald-900/40'
                : 'bg-amber-950/40 border-amber-700/60 text-amber-400 hover:bg-amber-900/40'
            }`}
            title="Clique para configurar o Supabase e sincronização"
          >
            {isOnline ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span className="font-semibold">{isOnline ? 'Online' : 'Modo Offline'}</span>
            <span className="text-[10px] text-zinc-400 opacity-80">(Supabase)</span>
          </button>

          {/* Sync status with green light indicator */}
          <button
            type="button"
            onClick={handleQuickSync}
            disabled={isSyncing}
            id="btn-sync-supabase-header"
            className={`flex items-center gap-2 px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
              isSyncing
                ? 'bg-zinc-800/80 border-emerald-600/50 text-emerald-300'
                : syncCount > 0
                ? 'bg-amber-950/40 border-amber-600/60 text-amber-300 hover:bg-amber-900/40'
                : 'bg-emerald-950/30 border-emerald-700/50 text-emerald-400 hover:bg-emerald-900/30'
            }`}
            title={
              syncCount > 0
                ? 'Vendas pendentes de sincronização. Clique para forçar a sincronização em lote agora!'
                : 'Todas as vendas locais sincronizadas com a nuvem Supabase.'
            }
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-400' : 'text-emerald-400'}`} />
            {isSyncing ? (
              <span className="flex items-center gap-1.5 text-xs text-emerald-300">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>Sincronizando lote...</span>
              </span>
            ) : syncCount > 0 ? (
              <span className="flex items-center gap-1.5 text-xs text-amber-300 font-bold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-80"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                <span>{syncCount} pendente{syncCount > 1 ? 's' : ''}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-sm shadow-emerald-500/80"></span>
                </span>
                <span>Dados Sincronizados</span>
              </span>
            )}
          </button>
        </div>

        {/* Center: Vendedor Daily Limit Meter (900.000 Kz) */}
        {currentUser.role === 'VENDEDOR' ? (
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-lg border ${
              isLight ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-zinc-900/90 border-zinc-700/60'
            }`}
          >
            <span className="text-zinc-500 hidden sm:inline">Limite Diário:</span>
            <span className="font-bold text-emerald-600">{formatKz(dailySales)}</span>
            <span className="text-zinc-500">/ 900.000 Kz</span>
            <div className="w-16 sm:w-24 h-2 bg-zinc-700/50 rounded-full overflow-hidden ml-1">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  sellerLimitPercentage >= 90
                    ? 'bg-rose-500'
                    : sellerLimitPercentage >= 70
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${sellerLimitPercentage}%` }}
              />
            </div>
            <span className="text-[10px] font-semibold text-zinc-500">{sellerLimitPercentage}%</span>
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-2 text-zinc-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>
              Sessão ativa: <strong className={isLight ? 'text-slate-800' : 'text-zinc-200'}>{roleInfo.label}</strong>
            </span>
          </div>
        )}

        {/* Right: Theme Toggle, User Management (Admin), Profile & Logout */}
        <div className="flex items-center gap-2">
          {/* Dual Theme Toggle (Sun / Moon) */}
          <button
            type="button"
            onClick={onToggleTheme}
            id="btn-toggle-theme"
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isLight
                ? 'bg-slate-100 border-slate-300 text-amber-600 hover:bg-slate-200'
                : 'bg-zinc-900 border-zinc-700 text-amber-400 hover:bg-zinc-800'
            }`}
            title={isLight ? 'Alternar para Tema Escuro' : 'Alternar para Tema Claro'}
          >
            {isLight ? <Moon className="w-4 h-4 text-slate-700" /> : <Sun className="w-4 h-4 text-amber-400" />}
          </button>

          {/* User Management for Administrator */}
          {currentUser.role === 'ADMINISTRADOR' && onOpenUserManagement && (
            <button
              type="button"
              onClick={onOpenUserManagement}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all text-xs font-semibold ${
                isLight
                  ? 'bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100'
                  : 'bg-purple-950/40 border-purple-800 text-purple-300 hover:bg-purple-900/50'
              }`}
              title="Gestão de Usuários e Alteração de Credenciais"
            >
              <UserCog className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Gestão Usuários</span>
            </button>
          )}

          {/* User Profile display */}
          <div
            className={`flex items-center gap-2 px-2.5 py-1 rounded-xl border ${
              isLight ? 'bg-slate-100 border-slate-300' : 'bg-zinc-900 border-zinc-700'
            }`}
          >
            <div className="w-5 h-5 rounded-full bg-emerald-600/30 text-emerald-500 flex items-center justify-center font-bold text-xs">
              {currentUser.name.charAt(0)}
            </div>
            <span className="font-medium truncate max-w-[100px] sm:max-w-[130px] text-xs">
              {currentUser.name}
            </span>
            <span
              className={`text-[9px] uppercase font-black px-1.5 py-0.2 rounded border ${roleInfo.bg} ${roleInfo.color} ${roleInfo.border}`}
            >
              {currentUser.role}
            </span>
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={onLogout}
            id="btn-logout"
            className="p-1.5 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-all cursor-pointer"
            title="Encerrar Sessão (Logout)"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main navigation row */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        {/* Brand & Prominent "Voltar" Button */}
        <div className="flex items-center gap-3">
          {activeView !== 'pdv' ? (
            <button
              type="button"
              id="btn-voltar-principal"
              onClick={() => onNavigate('pdv')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-semibold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
              title="Voltar para a Frente de Caixa"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar ao PDV</span>
            </button>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-zinc-950 font-black shadow-md shadow-emerald-500/20">
                <ShoppingCart className="w-5 h-5 text-zinc-950" />
              </div>
              <div>
                <h1
                  className={`text-base sm:text-lg font-black tracking-tight flex items-center gap-1.5 ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`}
                >
                  Kwanza<span className="text-emerald-600">POS</span>
                  <span
                    className={`text-[10px] font-normal px-1.5 py-0.2 rounded border ${
                      isLight ? 'bg-slate-100 border-slate-300 text-slate-600' : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                    }`}
                  >
                    VMA Comercial
                  </span>
                </h1>
                <p className={`text-[11px] hidden sm:block ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                  Saurimo, Angola • Frente de Caixa
                </p>
              </div>
            </div>
          )}
        </div>

        {/* View Navigation Tabs with Physical Auth Guards */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {/* PDV Tab (Allowed for all) */}
          <button
            type="button"
            id="tab-pdv"
            onClick={() => handleTabClick('pdv', 'Frente de Caixa')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeView === 'pdv'
                ? 'bg-emerald-600/20 text-emerald-500 border border-emerald-500/50 shadow-sm font-bold'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/70'
            }`}
          >
            <ShoppingCart className="w-4 h-4 text-emerald-500" />
            <span>Frente de Caixa</span>
          </button>

          {/* Estoque Tab - Guarded: Vendedor blocked with alert */}
          <button
            type="button"
            id="tab-estoque"
            onClick={() => handleTabClick('estoque', 'Estoque')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all relative cursor-pointer ${
              activeView === 'estoque'
                ? 'bg-emerald-600/20 text-emerald-500 border border-emerald-500/50 shadow-sm font-bold'
                : currentUser.role === 'VENDEDOR'
                ? isLight
                  ? 'text-slate-400 hover:text-rose-500 opacity-80'
                  : 'text-zinc-500 hover:text-rose-400 opacity-80'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/70'
            }`}
            title={currentUser.role === 'VENDEDOR' ? 'Bloqueado para Vendedor' : 'Gestão de Estoque'}
          >
            {currentUser.role === 'VENDEDOR' ? (
              <Lock className="w-3.5 h-3.5 text-rose-500" />
            ) : (
              <Package className="w-4 h-4 text-blue-500" />
            )}
            <span>Estoque</span>
            {stockAlertCount > 0 && currentUser.role !== 'VENDEDOR' && (
              <span
                className="bg-rose-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full border border-rose-400 animate-pulse"
                title={`${stockAlertCount} produtos abaixo do estoque mínimo!`}
              >
                {stockAlertCount}
              </span>
            )}
          </button>

          {/* Vendas / Histórico Tab - Guarded: Vendedor blocked with alert */}
          <button
            type="button"
            id="tab-vendas"
            onClick={() => handleTabClick('vendas', 'Histórico & Vendas')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeView === 'vendas'
                ? 'bg-emerald-600/20 text-emerald-500 border border-emerald-500/50 shadow-sm font-bold'
                : currentUser.role === 'VENDEDOR'
                ? isLight
                  ? 'text-slate-400 hover:text-rose-500 opacity-80'
                  : 'text-zinc-500 hover:text-rose-400 opacity-80'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/70'
            }`}
            title={currentUser.role === 'VENDEDOR' ? 'Bloqueado para Vendedor' : 'Histórico de Vendas'}
          >
            {currentUser.role === 'VENDEDOR' ? (
              <Lock className="w-3.5 h-3.5 text-rose-500" />
            ) : (
              <RotateCcw className="w-4 h-4 text-emerald-500" />
            )}
            <span className="hidden sm:inline">Histórico & Vendas</span>
            <span className="sm:hidden">Vendas</span>
          </button>

          {/* Dashboard Tab - Guarded: Only ADMINISTRADOR */}
          <button
            type="button"
            id="tab-dashboard"
            onClick={() => handleTabClick('dashboard', 'Painel Analítico')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeView === 'dashboard'
                ? 'bg-emerald-600/20 text-emerald-500 border border-emerald-500/50 shadow-sm font-bold'
                : currentUser.role !== 'ADMINISTRADOR'
                ? isLight
                  ? 'text-slate-400 hover:text-rose-500 opacity-80'
                  : 'text-zinc-500 hover:text-rose-400 opacity-80'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/70'
            }`}
            title={currentUser.role !== 'ADMINISTRADOR' ? 'Exclusivo para Administrador' : 'Painel Analítico'}
          >
            {currentUser.role !== 'ADMINISTRADOR' ? (
              <Lock className="w-3.5 h-3.5 text-rose-500" />
            ) : (
              <LayoutDashboard className="w-4 h-4 text-purple-500" />
            )}
            <span>Painel Analítico</span>
          </button>

          {/* PDF Report Export Quick Button */}
          {currentUser.role !== 'VENDEDOR' && (
            <button
              type="button"
              id="btn-export-pdf-header"
              onClick={onExportPDF}
              className={`hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ml-1 cursor-pointer ${
                isLight
                  ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
              }`}
              title="Gerar e imprimir relatório formal em formato A4"
            >
              <span>Relatório A4</span>
            </button>
          )}
        </nav>
      </div>
    </header>
  );
};
