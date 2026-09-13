/**
 * Formatting utilities for Kwanza (Kz) and dates in Angola locale
 */

export function formatKz(amount: number, showDecimals: boolean = false): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    amount = 0;
  }
  
  const options: Intl.NumberFormatOptions = {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  };

  const formatted = new Intl.NumberFormat('pt-AO', options).format(amount);
  return `${formatted} Kz`;
}

export function formatDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('pt-AO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return isoString;
  }
}

export function formatDateShort(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('pt-AO', {
      day: '2-digit',
      month: 'short',
    }).format(date);
  } catch {
    return isoString;
  }
}

export function getPaymentMethodName(method: string): string {
  switch (method) {
    case 'DINHEIRO':
      return 'Numerário (Dinheiro)';
    case 'MULTICAIXA':
      return 'Multicaixa (TPA / Express)';
    case 'TRANSFERENCIA':
      return 'Transferência Bancária';
    case 'MISTO':
      return 'Pagamento Misto';
    case 'FIADO':
      return 'Venda a Fiado (Conta Corrente)';
    default:
      return method;
  }
}

export function getRoleBadgeInfo(role: string): { label: string; color: string; bg: string; border: string } {
  switch (role) {
    case 'VENDEDOR':
      return {
        label: 'Vendedor',
        color: 'text-blue-400',
        bg: 'bg-blue-950/60',
        border: 'border-blue-700/50',
      };
    case 'GERENTE':
      return {
        label: 'Gerente',
        color: 'text-amber-400',
        bg: 'bg-amber-950/60',
        border: 'border-amber-700/50',
      };
    case 'ADMINISTRADOR':
      return {
        label: 'Administrador',
        color: 'text-emerald-400',
        bg: 'bg-emerald-950/60',
        border: 'border-emerald-700/50',
      };
    default:
      return {
        label: role,
        color: 'text-zinc-400',
        bg: 'bg-zinc-800',
        border: 'border-zinc-700',
      };
  }
}

export function getExpenseCategoryLabel(category: string): { label: string; color: string; bg: string; border: string } {
  switch (category) {
    case 'FIXA':
      return {
        label: 'Despesa Fixa',
        color: 'text-blue-400',
        bg: 'bg-blue-950/60',
        border: 'border-blue-700/50',
      };
    case 'VARIAVEL':
      return {
        label: 'Despesa Variável',
        color: 'text-amber-400',
        bg: 'bg-amber-950/60',
        border: 'border-amber-700/50',
      };
    case 'SALARIO':
      return {
        label: 'Salário & Equipa',
        color: 'text-purple-400',
        bg: 'bg-purple-950/60',
        border: 'border-purple-700/50',
      };
    case 'PERDA':
      return {
        label: 'Perda / Avaria',
        color: 'text-rose-400',
        bg: 'bg-rose-950/60',
        border: 'border-rose-700/50',
      };
    default:
      return {
        label: category,
        color: 'text-zinc-300',
        bg: 'bg-zinc-800',
        border: 'border-zinc-700',
      };
  }
}
