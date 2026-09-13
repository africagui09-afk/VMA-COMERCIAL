import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Barcode,
  CheckCircle2,
  ChevronDown,
  Clock,
  CreditCard,
  DollarSign,
  Minus,
  Package,
  Plus,
  Printer,
  Receipt,
  RotateCcw,
  Search,
  ShoppingCart,
  Trash2,
  TrendingUp,
  User as UserIcon,
  Users,
  X,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CartItem, PaymentMethod, Product, Sale, User } from '../types';
import { formatDateTime, formatKz, getPaymentMethodName } from '../lib/formatters';
import {
  checkSellerLimit,
  createSale,
  getSellerDailyTotal,
  resetStorageToDefault,
  SELLER_DAILY_LIMIT,
} from '../lib/storage';
import { FiadoModal } from './FiadoModal';
import { ClienteFiado, registrarVendaFiado, validarLimiteFiado } from '../lib/fiadoService';

interface PDVProps {
  currentUser: User;
  products: Product[];
  onRefreshData: () => void;
  theme?: 'dark' | 'light';
}

export const PDV: React.FC<PDVProps> = ({
  currentUser,
  products,
  onRefreshData,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountTotal, setDiscountTotal] = useState<number>(0);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerNif, setCustomerNif] = useState<string>('');
  const [mobileCartOpen, setMobileCartOpen] = useState<boolean>(false);
  const [cartNotification, setCartNotification] = useState<string | null>(null);

  // Checkout modal
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('MULTICAIXA');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Fiado Modal
  const [isFiadoModalOpen, setIsFiadoModalOpen] = useState<boolean>(false);

  // Completed sale receipt modal
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

  // Categories list
  const categories = useMemo(() => {
    const list = Array.from(new Set(products.map((p) => p.category))).filter(Boolean);
    return ['TODOS', ...list];
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCategory = selectedCategory === 'TODOS' || p.category === selectedCategory;
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      return matchCategory && matchSearch;
    });
  }, [products, selectedCategory, searchTerm]);

  // Calculations
  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  }, [cart]);

  const cartTotal = useMemo(() => {
    return Math.max(0, cartSubtotal - discountTotal);
  }, [cartSubtotal, discountTotal]);

  const totalItemsCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  // Seller daily limit verification (900.000 Kz)
  const sellerLimitInfo = useMemo(() => {
    const currentTotal = getSellerDailyTotal(currentUser.id);
    const limit = SELLER_DAILY_LIMIT;
    const remaining = Math.max(0, limit - currentTotal);
    const isExceeded = currentTotal + cartTotal > limit;
    return { currentTotal, limit, remaining, isExceeded };
  }, [currentUser, cartTotal, completedSale]);

  const showNotification = (msg: string) => {
    setCartNotification(msg);
    setTimeout(() => setCartNotification(null), 3000);
  };

  // Cart actions
  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      showNotification(`O produto "${product.name}" encontra-se esgotado.`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          showNotification(
            `Quantidade máxima em estoque (${product.stock} ${product.unit}) atingida.`
          );
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        return [...prev, { product, quantity: 1, discount: 0 }];
      }
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty > item.product.stock) {
              showNotification(
                `Estoque máximo disponível: ${item.product.stock} ${item.product.unit}.`
              );
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountTotal(0);
    setCheckoutError(null);
  };

  // Open checkout
  const handleOpenCheckout = () => {
    if (cart.length === 0) return;

    // Check seller limit for Vendedor (900.000 Kz)
    if (currentUser.role === 'VENDEDOR') {
      const check = checkSellerLimit(currentUser.id, currentUser.role, cartTotal);
      if (!check.allowed) {
        setCheckoutError(check.error || 'Limite diário de 900.000 Kz excedido.');
        setIsCheckoutOpen(true);
        return;
      }
    }

    setCheckoutError(null);
    setCashReceived(String(cartTotal));
    setIsCheckoutOpen(true);
  };

  // Finish standard sale
  const handleFinishSale = () => {
    setCheckoutError(null);
    const numericCash = parseFloat(cashReceived) || 0;

    if (paymentMethod === 'DINHEIRO' && numericCash < cartTotal) {
      setCheckoutError(
        `Valor recebido (${formatKz(numericCash)}) é inferior ao total da venda (${formatKz(
          cartTotal
        )}).`
      );
      return;
    }

    if (paymentMethod === 'FIADO') {
      // Open Fiado customer selection modal
      setIsCheckoutOpen(false);
      setIsFiadoModalOpen(true);
      return;
    }

    const change = paymentMethod === 'DINHEIRO' ? Math.max(0, numericCash - cartTotal) : 0;
    const totalCost = cart.reduce((sum, item) => sum + item.product.costPrice * item.quantity, 0);

    const saleResult = createSale({
      items: cart.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: item.product.price,
        costPrice: item.product.costPrice,
        discount: item.discount,
        total: item.product.price * item.quantity - item.discount,
      })),
      subtotal: cartSubtotal,
      discountTotal,
      total: cartTotal,
      totalCost,
      payments: [
        {
          method: paymentMethod,
          amount: cartTotal,
        },
      ],
      amountReceived: paymentMethod === 'DINHEIRO' ? numericCash : cartTotal,
      change,
      sellerId: currentUser.id,
      sellerName: currentUser.name,
      sellerRole: currentUser.role,
      customerName: customerName.trim() || 'Consumidor Final',
      customerNif: customerNif.trim() || '999999999',
    });

    if (!saleResult.success || !saleResult.sale) {
      setCheckoutError(saleResult.error || 'Erro ao processar venda.');
      return;
    }

    // Success! Trigger celebration confetti
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#10b981', '#059669', '#34d399', '#f59e0b'],
      });
    } catch {
      // safe
    }

    setCompletedSale(saleResult.sale);
    setIsCheckoutOpen(false);
    clearCart();
    onRefreshData();
  };

  // Complete sale via Fiado module
  const handleConfirmFiado = async (cliente: ClienteFiado) => {
    const validacao = validarLimiteFiado(cliente, cartTotal);
    if (!validacao.permitido) {
      showNotification(validacao.erro || 'Venda a fiado bloqueada: limite excedido.');
      return;
    }

    const totalCost = cart.reduce((sum, item) => sum + item.product.costPrice * item.quantity, 0);

    const saleResult = createSale({
      items: cart.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: item.product.price,
        costPrice: item.product.costPrice,
        discount: item.discount,
        total: item.product.price * item.quantity - item.discount,
      })),
      subtotal: cartSubtotal,
      discountTotal,
      total: cartTotal,
      totalCost,
      payments: [
        {
          method: 'FIADO',
          amount: cartTotal,
        },
      ],
      amountReceived: 0,
      change: 0,
      sellerId: currentUser.id,
      sellerName: currentUser.name,
      sellerRole: currentUser.role,
      customerName: cliente.nome,
      customerNif: cliente.nif,
      clienteFiadoId: cliente.id,
      clienteFiadoNome: cliente.nome,
      notes: `Venda a Fiado • Limite: ${formatKz(cliente.limite_credito)}`,
    });

    if (!saleResult.success || !saleResult.sale) {
      showNotification(saleResult.error || 'Falha ao registrar venda a fiado.');
      return;
    }

    // Atualiza saldo do cliente e historico_fiado
    await registrarVendaFiado(
      cliente.id,
      saleResult.sale.id,
      saleResult.sale.invoiceNumber,
      cartTotal,
      currentUser.name
    );

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#f59e0b', '#d97706', '#10b981'],
      });
    } catch {
      // safe
    }

    setCompletedSale(saleResult.sale);
    setIsFiadoModalOpen(false);
    clearCart();
    onRefreshData();
  };

  // Real thermal print trigger
  const handlePrintReceipt = () => {
    window.print();
  };

  const calculatedChange = useMemo(() => {
    if (paymentMethod !== 'DINHEIRO') return 0;
    const received = parseFloat(cashReceived) || 0;
    return Math.max(0, received - cartTotal);
  }, [cashReceived, cartTotal, paymentMethod]);

  const canViewFinancialMetrics = currentUser.role !== 'VENDEDOR';

  return (
    <div
      className={`flex-1 flex flex-col lg:flex-row overflow-hidden transition-colors duration-200 ${
        isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#0a0d14] text-zinc-100'
      }`}
    >
      {/* Toast notification */}
      {cartNotification && (
        <div className="fixed top-16 right-4 z-50 p-3 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-2xl animate-bounce flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{cartNotification}</span>
        </div>
      )}

      {/* LEFT: PRODUCTS CATALOG & SEARCH */}
      <div className="flex-1 flex flex-col overflow-hidden p-3 sm:p-5">
        {/* Search & Category Header */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between mb-4">
          {/* Search Input with barcode shortcut icon */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar produto por nome, código de barras ou categoria..."
              className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 shadow-sm'
                  : 'bg-[#111620] border-zinc-800 text-zinc-100 placeholder:text-zinc-500'
              }`}
            />
            {searchTerm ? (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <Barcode className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            )}
          </div>

          {/* Quick Counter Info */}
          <div
            className={`text-xs px-3 py-2 rounded-xl border flex items-center gap-2 shrink-0 ${
              isLight
                ? 'bg-white border-slate-200 text-slate-600 shadow-sm'
                : 'bg-[#111620] border-zinc-800 text-zinc-400'
            }`}
          >
            <Package className="w-3.5 h-3.5 text-emerald-500" />
            <span>{filteredProducts.length} itens disponíveis</span>
          </div>
        </div>

        {/* Categories Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-md'
                    : isLight
                    ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm'
                    : 'bg-[#111620] border border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:text-white'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto pr-1">
          {filteredProducts.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-zinc-500 text-xs">
              <Package className="w-10 h-10 mb-2 opacity-40 text-zinc-400" />
              <p>Nenhum produto encontrado para "{searchTerm}".</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3.5">
              {filteredProducts.map((product) => {
                // Strictly only out of stock if stock <= 0
                const isOutOfStock = product.stock <= 0;
                const isLowStock = !isOutOfStock && product.stock <= product.minStock;
                const inCartItem = cart.find((c) => c.product.id === product.id);

                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => !isOutOfStock && addToCart(product)}
                    disabled={isOutOfStock}
                    className={`relative text-left p-3.5 rounded-2xl border flex flex-col justify-between transition-all duration-150 group cursor-pointer ${
                      isOutOfStock
                        ? isLight
                          ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed'
                          : 'bg-zinc-950/40 border-zinc-800/80 opacity-50 cursor-not-allowed'
                        : isLowStock
                        ? isLight
                          ? 'bg-amber-50/50 border-amber-300 hover:border-amber-400 shadow-sm active:scale-[0.98]'
                          : 'bg-[#181512] border-amber-800/60 hover:border-amber-500 hover:bg-[#201915] active:scale-[0.98]'
                        : inCartItem
                        ? isLight
                          ? 'bg-emerald-50/60 border-emerald-400 shadow-sm active:scale-[0.98]'
                          : 'bg-[#0f1b16] border-emerald-600/70 hover:border-emerald-400 shadow-sm active:scale-[0.98]'
                        : isLight
                        ? 'bg-white border-slate-200 hover:border-emerald-500 hover:bg-slate-50/80 shadow-sm active:scale-[0.98]'
                        : 'bg-[#111620] border-zinc-800 hover:border-emerald-600/50 hover:bg-[#141b26] active:scale-[0.98]'
                    }`}
                  >
                    {/* In cart indicator pill */}
                    {inCartItem && (
                      <span className="absolute -top-2 -right-2 bg-emerald-500 text-zinc-950 text-[11px] font-black w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                        {inCartItem.quantity}
                      </span>
                    )}

                    {/* Stock Alert Badge */}
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold truncate">
                        {product.category}
                      </span>
                      {isOutOfStock ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-600 text-white shadow-sm">
                          Esgotado
                        </span>
                      ) : isLowStock ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 border border-amber-500/40 flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5 text-amber-500" />
                          <span>Restam {product.stock}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/30">
                          {product.stock} {product.unit}
                        </span>
                      )}
                    </div>

                    {/* Product Name */}
                    <h3
                      className={`text-xs sm:text-sm font-semibold line-clamp-2 mb-2 group-hover:text-emerald-500 transition-colors ${
                        isLight ? 'text-slate-900' : 'text-zinc-100'
                      }`}
                    >
                      {product.name}
                    </h3>

                    {/* Product Price in Kz (Cost hidden for Vendedores!) */}
                    <div className="mt-auto pt-2 border-t border-zinc-800/40 flex items-baseline justify-between">
                      <span className="text-sm sm:text-base font-black text-emerald-600 tracking-tight">
                        {formatKz(product.price)}
                      </span>
                      <span className="text-[10px] text-zinc-400">/{product.unit}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MOBILE FLOATING CART BAR */}
      <div
        className={`lg:hidden p-3 border-t flex items-center justify-between gap-3 ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#0e131b] border-zinc-800'
        }`}
      >
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-600/20 text-emerald-600 flex items-center justify-center font-bold">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-zinc-400">
              {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'itens'}
            </div>
            <div className="text-sm font-bold text-emerald-600">{formatKz(cartTotal)}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileCartOpen(!mobileCartOpen)}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
          >
            {mobileCartOpen ? 'Ver Produtos' : 'Abrir Carrinho'}
          </button>
          <button
            type="button"
            disabled={cart.length === 0}
            onClick={handleOpenCheckout}
            className="px-4 py-2 bg-emerald-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md hover:bg-emerald-500"
          >
            Cobrar {formatKz(cartTotal)}
          </button>
        </div>
      </div>

      {/* RIGHT: SHOPPING CART PANEL */}
      <div
        className={`w-full lg:w-[420px] flex flex-col flex-shrink-0 z-30 lg:static fixed inset-x-0 bottom-0 top-[60px] lg:top-auto transition-transform duration-200 border-l ${
          mobileCartOpen ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'
        } ${
          isLight
            ? 'bg-white border-slate-200 text-slate-900 shadow-xl'
            : 'bg-[#0e131b] border-zinc-800 text-zinc-100 shadow-2xl'
        }`}
      >
        {/* Cart Header */}
        <div
          className={`p-3.5 sm:p-4 border-b flex items-center justify-between ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0d121a] border-zinc-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-emerald-500" />
            <h2 className="text-sm sm:text-base font-bold">Carrinho da Venda</h2>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 text-xs font-bold border border-emerald-500/30">
              {totalItemsCount}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-xs text-zinc-400 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
                title="Limpar todos os produtos"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Limpar</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setMobileCartOpen(false)}
              className="lg:hidden p-1 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Customer input bar */}
        <div
          className={`px-3.5 sm:px-4 py-2 border-b flex items-center gap-2 text-xs ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-950/60 border-zinc-800'
          }`}
        >
          <UserIcon className="w-3.5 h-3.5 text-zinc-400" />
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Cliente (Opcional - Padrão: Consumidor Final)"
            className="flex-1 bg-transparent placeholder-zinc-400 focus:outline-none text-xs"
          />
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-2">
          {cart.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-zinc-400 text-xs text-center p-4">
              <ShoppingCart className="w-10 h-10 mb-2 opacity-30 text-zinc-400" />
              <p className="font-semibold">O carrinho está vazio</p>
              <p className="text-[11px] text-zinc-400 mt-1">
                Toque nos produtos ao lado para iniciar a venda
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product.id}
                className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#111620] border-zinc-800'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold truncate">{item.product.name}</h4>
                  <div className="text-[11px] text-zinc-400 flex items-center gap-2 mt-0.5">
                    <span className="text-emerald-500 font-bold">{formatKz(item.product.price)}</span>
                    <span>× {item.quantity}</span>
                    <span className="font-semibold text-zinc-500">
                      = {formatKz(item.product.price * item.quantity)}
                    </span>
                  </div>
                </div>

                {/* Stepper buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.product.id, -1)}
                    className="w-7 h-7 rounded-lg border bg-zinc-800/60 hover:bg-zinc-700 text-zinc-200 flex items-center justify-center transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-7 text-center text-xs font-bold font-mono">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.product.id, 1)}
                    className="w-7 h-7 rounded-lg border bg-zinc-800/60 hover:bg-zinc-700 text-zinc-200 flex items-center justify-center transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.product.id)}
                    className="w-7 h-7 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center ml-1 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Summary & Checkout Action */}
        <div
          className={`p-4 border-t space-y-3 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0d121a] border-zinc-800'
          }`}
        >
          {/* Subtotal / Discount / Total */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-zinc-400">
              <span>Subtotal:</span>
              <span>{formatKz(cartSubtotal)}</span>
            </div>
            {discountTotal > 0 && (
              <div className="flex justify-between text-zinc-400">
                <span>Desconto Aplicado:</span>
                <span className="text-emerald-500">-{formatKz(discountTotal)}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline pt-2 border-t border-zinc-800/60">
              <span className="font-bold text-sm">TOTAL A COBRAR:</span>
              <span className="font-black text-xl text-emerald-600">{formatKz(cartTotal)}</span>
            </div>
          </div>

          {/* Action Buttons: Standard Cobrar + Direct FIADO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {/* FIADO Button */}
            <button
              type="button"
              disabled={cart.length === 0}
              onClick={() => {
                if (cart.length > 0) {
                  setIsFiadoModalOpen(true);
                }
              }}
              className="py-3 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
              title="Venda a Fiado (Conta Corrente com Validação Estrita de Limite)"
            >
              <Clock className="w-4 h-4" />
              <span>Venda a FIADO</span>
            </button>

            {/* Standard Checkout Button */}
            <button
              type="button"
              id="btn-abrir-checkout"
              disabled={cart.length === 0}
              onClick={handleOpenCheckout}
              className="py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-700/20 active:scale-95 transition-all cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              <span>Cobrar {formatKz(cartTotal)}</span>
            </button>
          </div>
        </div>
      </div>

      {/* CHECKOUT MODAL */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div
            className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
              isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#111620] border-zinc-800 text-zinc-100'
            }`}
          >
            {/* Modal Header */}
            <div
              className={`p-4 border-b flex items-center justify-between ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0d131d] border-zinc-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold text-sm sm:text-base">Finalizar Venda • Frente de Caixa</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
              {/* Total Display */}
              <div
                className={`p-4 rounded-xl border text-center ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/90 border-zinc-800'
                }`}
              >
                <div className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">
                  Valor Total da Venda
                </div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">
                  {formatKz(cartTotal)}
                </div>
                <div className="text-xs text-zinc-400 mt-1">
                  {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'itens'} no carrinho
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <label className="block text-xs font-semibold mb-2">Forma de Pagamento</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {(
                    ['MULTICAIXA', 'DINHEIRO', 'TRANSFERENCIA', 'FIADO', 'MISTO'] as PaymentMethod[]
                  ).map((method) => {
                    const active = paymentMethod === method;
                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() => {
                          setPaymentMethod(method);
                          if (method === 'DINHEIRO') {
                            setCashReceived(String(cartTotal));
                          }
                        }}
                        className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 text-xs font-bold cursor-pointer ${
                          active
                            ? method === 'FIADO'
                              ? 'bg-amber-600 text-white border-amber-400 shadow-md'
                              : 'bg-emerald-600 text-white border-emerald-400 shadow-md'
                            : isLight
                            ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                        }`}
                      >
                        {method === 'MULTICAIXA' && <CreditCard className="w-4 h-4" />}
                        {method === 'DINHEIRO' && <DollarSign className="w-4 h-4" />}
                        {method === 'TRANSFERENCIA' && <RotateCcw className="w-4 h-4" />}
                        {method === 'FIADO' && <Clock className="w-4 h-4 text-amber-300" />}
                        {method === 'MISTO' && <Receipt className="w-4 h-4" />}
                        <span className="text-[11px]">
                          {method === 'MULTICAIXA'
                            ? 'TPA'
                            : method === 'DINHEIRO'
                            ? 'Dinheiro'
                            : method === 'TRANSFERENCIA'
                            ? 'Transf.'
                            : method === 'FIADO'
                            ? 'FIADO'
                            : 'Misto'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Fiado note */}
              {paymentMethod === 'FIADO' && (
                <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-400 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    <span>Conta Corrente de Fiado Selecionada</span>
                  </div>
                  <p className="text-[11px] text-zinc-300">
                    Ao prosseguir, você escolherá a ficha do cliente na tabela{' '}
                    <code className="text-amber-300 font-mono">clientes_fiado</code> com validação
                    estrita de limite de crédito.
                  </p>
                </div>
              )}

              {/* Cash specific: Received and Change */}
              {paymentMethod === 'DINHEIRO' && (
                <div
                  className={`p-4 rounded-xl border space-y-3 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/60 border-zinc-800'
                  }`}
                >
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">
                      Valor Recebido do Cliente (Kz):
                    </label>
                    <input
                      type="number"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-700 rounded-lg text-lg font-bold text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Fast Bills shortcuts */}
                  <div className="flex flex-wrap gap-1.5">
                    {[cartTotal, cartTotal + 1000, cartTotal + 2000, 5000, 10000, 20000]
                      .filter((v, idx, arr) => v >= cartTotal && arr.indexOf(v) === idx)
                      .slice(0, 5)
                      .map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setCashReceived(String(val))}
                          className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold"
                        >
                          +{formatKz(val)}
                        </button>
                      ))}
                  </div>

                  {/* Calculated Change */}
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                    <span className="text-sm font-semibold">Troco a Devolver:</span>
                    <span className="text-lg font-black text-amber-500">
                      {formatKz(calculatedChange)}
                    </span>
                  </div>
                </div>
              )}

              {/* Customer Details */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block font-medium text-zinc-400 mb-1">Nome do Cliente:</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Consumidor Final"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-400 mb-1">NIF do Cliente:</label>
                  <input
                    type="text"
                    value={customerNif}
                    onChange={(e) => setCustomerNif(e.target.value)}
                    placeholder="000000000"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Error in modal */}
              {checkoutError && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{checkoutError}</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div
              className={`p-4 border-t flex items-center justify-between gap-3 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0d131d] border-zinc-800'
              }`}
            >
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold"
              >
                Cancelar
              </button>

              <button
                type="button"
                id="btn-finalizar-venda"
                onClick={handleFinishSale}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {paymentMethod === 'FIADO' ? 'Selecionar Cliente Fiado' : 'Finalizar & Imprimir'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FIADO MODAL */}
      <FiadoModal
        isOpen={isFiadoModalOpen}
        totalVenda={cartTotal}
        onClose={() => setIsFiadoModalOpen(false)}
        onConfirmFiado={handleConfirmFiado}
        theme={theme}
      />

      {/* COMPLETED SALE MODAL WITH 80MM THERMAL RECEIPT */}
      {completedSale && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#111620] border border-zinc-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col my-auto max-h-[95vh]">
            {/* Modal Header */}
            <div className="p-4 bg-[#0d131d] border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-sm">Venda Concluída com Sucesso!</h3>
              </div>
              <button
                type="button"
                onClick={() => setCompletedSale(null)}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 80mm THERMAL RECEIPT CUPOM */}
            <div className="p-5 overflow-y-auto bg-zinc-950 flex justify-center">
              <div
                id="receipt-print-area"
                className="bg-white text-zinc-950 p-4 sm:p-5 rounded font-mono text-[11px] shadow-lg space-y-3 w-full max-w-[80mm] leading-tight"
              >
                {/* Header conforming to VMA Comercial Lda standard */}
                <div className="text-center border-b border-zinc-400 pb-3 space-y-0.5">
                  <h2 className="text-base font-black uppercase tracking-tight">VMA Comercial Lda</h2>
                  <p className="text-[10px] text-zinc-700 font-semibold">Localização: Saurimo, Angola</p>
                  <p className="text-[10px] text-zinc-700">Contacto: 924046450</p>
                  <p className="text-[10px] text-zinc-700 font-bold">NIF: 000000000</p>
                  <div className="mt-1.5 pt-1 border-t border-dashed border-zinc-300 text-[10px] font-bold">
                    FACTURA SIMPLIFICADA
                  </div>
                  <div className="text-xs font-black text-zinc-900 tracking-wider">
                    {completedSale.invoiceNumber}
                  </div>
                </div>

                {/* Metadata */}
                <div className="text-[10px] space-y-0.5 border-b border-dashed border-zinc-300 pb-2">
                  <div className="flex justify-between">
                    <span>Data/Hora:</span>
                    <span>{formatDateTime(completedSale.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Operador:</span>
                    <span>{completedSale.sellerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cliente:</span>
                    <span className="font-bold truncate max-w-[140px] text-right">
                      {completedSale.customerName || 'Consumidor Final'}
                    </span>
                  </div>
                  {completedSale.customerNif && (
                    <div className="flex justify-between">
                      <span>NIF Cliente:</span>
                      <span>{completedSale.customerNif}</span>
                    </div>
                  )}
                  {completedSale.clienteFiadoNome && (
                    <div className="flex justify-between font-bold text-amber-800 bg-amber-100 px-1 rounded mt-0.5">
                      <span>Conta Corrente:</span>
                      <span>FIADO (REGISTRADO)</span>
                    </div>
                  )}
                </div>

                {/* Items */}
                <div className="space-y-1 border-b border-zinc-400 pb-2">
                  <div className="flex justify-between font-bold text-[10px] border-b border-zinc-300 pb-1">
                    <span>Item</span>
                    <span>Qtd × P.Unit</span>
                    <span>Total</span>
                  </div>
                  {completedSale.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-[10px]">
                      <span className="truncate max-w-[120px]">{item.productName}</span>
                      <span>
                        {item.quantity} × {formatKz(item.unitPrice)}
                      </span>
                      <span className="font-bold">{formatKz(item.total)}</span>
                    </div>
                  ))}
                </div>

                {/* Financial Totals */}
                <div className="space-y-1 text-[11px] border-b border-zinc-400 pb-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatKz(completedSale.subtotal)}</span>
                  </div>
                  {completedSale.discountTotal > 0 && (
                    <div className="flex justify-between text-zinc-700">
                      <span>Desconto:</span>
                      <span>-{formatKz(completedSale.discountTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-sm pt-1 border-t border-zinc-400">
                    <span>TOTAL PAGO:</span>
                    <span>{formatKz(completedSale.total)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-700">
                    <span>Forma Pagamento:</span>
                    <span className="font-bold">
                      {getPaymentMethodName(completedSale.payments[0]?.method || 'DINHEIRO')}
                    </span>
                  </div>
                  {completedSale.change > 0 && (
                    <div className="flex justify-between font-bold text-xs text-zinc-900">
                      <span>Troco:</span>
                      <span>{formatKz(completedSale.change)}</span>
                    </div>
                  )}
                </div>

                {/* Footer disclaimer */}
                <div className="text-center text-[9px] text-zinc-500 pt-1 space-y-0.5">
                  <p>Processado por Software Certificado de Faturação</p>
                  <p>KwanzaPOS • VMA Comercial Lda (Saurimo)</p>
                  <p className="font-bold text-zinc-700">Obrigado pela sua preferência!</p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-[#0d131d] border-t border-zinc-800 flex items-center justify-between gap-2">
              <button
                type="button"
                id="btn-imprimir-talao"
                onClick={handlePrintReceipt}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Talão (80mm)</span>
              </button>
              <button
                type="button"
                id="btn-nova-venda"
                onClick={() => setCompletedSale(null)}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer"
              >
                <span>Nova Venda</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
