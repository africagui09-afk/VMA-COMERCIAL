import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Barcode,
  Edit2,
  FileDown,
  Filter,
  Minus,
  Package,
  PackageCheck,
  PackageMinus,
  PackagePlus,
  PackageX,
  Plus,
  Printer,
  Search,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react';
import { Product, User } from '../types';
import { formatKz } from '../lib/formatters';
import { adjustProductStock, deleteProduct, saveProduct } from '../lib/storage';
import { imprimirTabelaEstoque } from '../lib/domPrinter';

interface StockManagementProps {
  currentUser: User;
  products: Product[];
  onRefreshData: () => void;
  onBackToPDV: () => void;
  onExportPDF: () => void;
  theme?: 'dark' | 'light';
}

export const StockManagement: React.FC<StockManagementProps> = ({
  currentUser,
  products,
  onRefreshData,
  onBackToPDV,
  onExportPDF,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'CRITICAL' | 'OUT_OF_STOCK'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODAS');

  // Edit / Create Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form fields
  const [formName, setFormName] = useState<string>('');
  const [formBarcode, setFormBarcode] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('Mercearia');
  const [formPrice, setFormPrice] = useState<string>('');
  const [formCostPrice, setFormCostPrice] = useState<string>('');
  const [formStock, setFormStock] = useState<string>('');
  const [formMinStock, setFormMinStock] = useState<string>('10');
  const [formUnit, setFormUnit] = useState<string>('un');
  const [formError, setFormError] = useState<string | null>(null);

  // Quick adjustment modal
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(5);
  const [adjustType, setAdjustType] = useState<'IN' | 'OUT'>('IN');

  const categories = useMemo(() => {
    const list = Array.from(new Set(products.map((p) => p.category))).filter(Boolean);
    return ['TODAS', ...list];
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCategory = selectedCategory === 'TODAS' || p.category === selectedCategory;

      if (filterMode === 'CRITICAL') {
        return matchSearch && matchCategory && p.stock <= p.minStock;
      }
      if (filterMode === 'OUT_OF_STOCK') {
        return matchSearch && matchCategory && p.stock <= 0;
      }

      return matchSearch && matchCategory;
    });
  }, [products, searchTerm, selectedCategory, filterMode]);

  // Inventory Statistics
  const stats = useMemo(() => {
    const totalItems = products.length;
    const criticalCount = products.filter((p) => p.stock <= p.minStock && p.stock > 0).length;
    const outOfStockCount = products.filter((p) => p.stock <= 0).length;
    const totalCostValue = products.reduce((sum, p) => sum + p.costPrice * p.stock, 0);
    const totalSaleValue = products.reduce((sum, p) => sum + p.price * p.stock, 0);
    const estimatedPotentialProfit = Math.max(0, totalSaleValue - totalCostValue);

    return {
      totalItems,
      criticalCount,
      outOfStockCount,
      totalCostValue,
      totalSaleValue,
      estimatedPotentialProfit,
    };
  }, [products]);

  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormBarcode(String(Date.now()).slice(-8));
    setFormCategory('Mercearia');
    setFormPrice('');
    setFormCostPrice('');
    setFormStock('10');
    setFormMinStock('5');
    setFormUnit('un');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormBarcode(product.barcode);
    setFormCategory(product.category);
    setFormPrice(String(product.price));
    setFormCostPrice(String(product.costPrice));
    setFormStock(String(product.stock));
    setFormMinStock(String(product.minStock));
    setFormUnit(product.unit);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim()) {
      setFormError('O nome do produto é obrigatório.');
      return;
    }

    const price = parseFloat(formPrice);
    const costPrice = parseFloat(formCostPrice);
    const stock = parseInt(formStock, 10);
    const minStock = parseInt(formMinStock, 10);

    if (isNaN(price) || price <= 0) {
      setFormError('Informe um preço de venda válido em Kz.');
      return;
    }
    if (isNaN(costPrice) || costPrice < 0) {
      setFormError('Informe um preço de custo válido em Kz.');
      return;
    }
    if (isNaN(stock) || stock < 0) {
      setFormError('Informe uma quantidade de estoque válida.');
      return;
    }
    if (isNaN(minStock) || minStock < 0) {
      setFormError('Informe o estoque mínimo de alerta.');
      return;
    }

    const productData: Product = {
      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
      name: formName.trim(),
      barcode: formBarcode.trim() || 'SEM-CODIGO',
      category: formCategory.trim() || 'Geral',
      price,
      costPrice,
      stock,
      minStock,
      unit: formUnit.trim() || 'un',
      updatedAt: new Date().toISOString(),
    };

    saveProduct(productData);
    setIsModalOpen(false);
    onRefreshData();
  };

  const handleDeleteProduct = (product: Product) => {
    if (confirm(`Tem certeza que deseja remover o produto "${product.name}" do estoque?`)) {
      deleteProduct(product.id);
      onRefreshData();
    }
  };

  const handleQuickAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;
    const delta = adjustType === 'IN' ? adjustAmount : -adjustAmount;
    adjustProductStock(adjustingProduct.id, delta, 'Ajuste manual de estoque');
    setAdjustingProduct(null);
    onRefreshData();
  };

  return (
    <div className={`flex-1 flex flex-col overflow-y-auto ${isLight ? 'bg-slate-100 text-slate-900' : 'bg-slate-900 text-slate-100'}`}>
      {/* Top action header with visible "Voltar ao PDV" button */}
      <div className={`border-b p-3 sm:p-5 sticky top-0 z-20 transition-colors ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-800 border-slate-700'}`}>
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Back button & Title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              id="btn-voltar-estoque"
              onClick={onBackToPDV}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl active:scale-95 font-bold text-xs sm:text-sm border transition-all shadow-sm cursor-pointer ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-100 border-slate-600'
              }`}
              title="Voltar para a Frente de Caixa"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-500" />
              <span>Voltar ao PDV</span>
            </button>
            <div>
              <h1 className={`text-base sm:text-xl font-black tracking-tight flex items-center gap-2 ${isLight ? 'text-slate-950' : 'text-white'}`}>
                <Package className="w-5 h-5 text-emerald-500" />
                <span>Controle de Estoque</span>
              </h1>
              <p className={`text-xs hidden sm:block ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Gestão de inventário e alertas em vermelho para produtos críticos
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-imprimir-estoque-dom"
              onClick={() => imprimirTabelaEstoque()}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm border transition-all cursor-pointer shadow-sm active:scale-95 ${
                isLight
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-400 border-emerald-500/40'
              }`}
              title="Imprimir Tabela de Estoque via Clonagem HTML direta (sem bloqueio de PDF)"
            >
              <Printer className="w-4 h-4 text-emerald-500" />
              <span>Imprimir</span>
            </button>

            <button
              type="button"
              id="btn-exportar-pdf-estoque"
              onClick={onExportPDF}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm border transition-all cursor-pointer shadow-sm active:scale-95 ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                  : 'bg-slate-700 hover:bg-slate-600 text-emerald-400 border-emerald-500/40'
              }`}
              title="Exportar Relatório Geral de Estoque e Finanças em PDF (A4)"
            >
              <FileDown className="w-4 h-4 text-emerald-500" />
              <span className="hidden sm:inline">Exportar PDF</span>
            </button>

            {/* New Product Action Button */}
            <button
              type="button"
              id="btn-cadastrar-novo-produto"
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Produto</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-5">
        {/* KPI / Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {/* Total Items */}
          <div className={`p-4 rounded-2xl border transition-colors ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-800 border-slate-700'}`}>
            <div className={`text-xs font-bold uppercase ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Produtos Cadastrados</div>
            <div className={`text-xl sm:text-2xl font-black mt-1 ${isLight ? 'text-slate-950' : 'text-white'}`}>
              {stats.totalItems}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Total de SKUs no sistema</div>
          </div>

          {/* Red Alert Card - Below Min Stock */}
          <div
            onClick={() => setFilterMode(filterMode === 'CRITICAL' ? 'ALL' : 'CRITICAL')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
              stats.criticalCount > 0
                ? isLight
                  ? 'bg-rose-50 border-rose-400 shadow-sm'
                  : 'bg-rose-950/40 border-rose-700/80 shadow-md shadow-rose-950/20'
                : isLight
                ? 'bg-white border-slate-200 shadow-sm'
                : 'bg-slate-800 border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold flex items-center gap-1 ${isLight ? 'text-rose-700' : 'text-rose-300'}`}>
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                Alerta Estoque Crítico
              </span>
              {stats.criticalCount > 0 && (
                <span className="text-[10px] bg-rose-600 text-white font-black px-1.5 py-0.5 rounded-full">
                  Ação
                </span>
              )}
            </div>
            <div className="text-xl sm:text-2xl font-black text-rose-500 mt-1">
              {stats.criticalCount}
            </div>
            <div className={`text-[11px] mt-1 ${isLight ? 'text-rose-600 font-semibold' : 'text-rose-400/80'}`}>Abaixo do estoque mínimo</div>
          </div>

          {/* Out of Stock Card */}
          <div
            onClick={() => setFilterMode(filterMode === 'OUT_OF_STOCK' ? 'ALL' : 'OUT_OF_STOCK')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
              isLight ? 'bg-white border-slate-200 shadow-sm hover:border-slate-300' : 'bg-slate-800 border-slate-700 hover:border-slate-600'
            }`}
          >
            <div className={`text-xs font-bold flex items-center gap-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              <PackageX className="w-3.5 h-3.5 text-slate-400" />
              Itens Esgotados
            </div>
            <div className={`text-xl sm:text-2xl font-black mt-1 ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
              {stats.outOfStockCount}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Zero unidades em estoque</div>
          </div>

          {/* Total Inventory Value in Kz */}
          <div className={`p-4 rounded-2xl border transition-colors ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-800 border-slate-700'}`}>
            <div className={`text-xs font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Patrimônio em Estoque</div>
            <div className="text-lg sm:text-xl font-black text-emerald-500 mt-1">
              {formatKz(stats.totalCostValue)}
            </div>
            <div className={`text-[11px] mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Venda estimada: <strong className={isLight ? 'text-slate-900' : 'text-slate-200'}>{formatKz(stats.totalSaleValue)}</strong>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar - Fixed & Solid */}
        <div className={`p-3 sm:p-4 rounded-2xl border flex flex-col md:flex-row gap-3 items-center justify-between transition-colors ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-800 border-slate-700'
        }`}>
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome ou código..."
              className={`w-full pl-10 pr-4 py-2 border rounded-xl text-xs outline-none transition-all ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-950 focus:border-emerald-500'
                  : 'bg-slate-900 border-slate-700 text-slate-100 focus:border-emerald-500'
              }`}
            />
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto text-xs">
            <button
              type="button"
              onClick={() => setFilterMode('ALL')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                filterMode === 'ALL'
                  ? 'bg-emerald-500 text-slate-950'
                  : isLight
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Todos ({products.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('CRITICAL')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterMode === 'CRITICAL'
                  ? 'bg-rose-600 text-white shadow-md'
                  : isLight
                  ? 'bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200'
                  : 'bg-rose-950/40 text-rose-400 border border-rose-800/60 hover:bg-rose-900/40'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Estoque Crítico ({stats.criticalCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('OUT_OF_STOCK')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                filterMode === 'OUT_OF_STOCK'
                  ? 'bg-slate-600 text-white'
                  : isLight
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Esgotados ({stats.outOfStockCount})
            </button>

            {/* Category Select */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={`px-3 py-1.5 border rounded-lg text-xs outline-none cursor-pointer ${
                isLight ? 'bg-slate-50 border-slate-300 text-slate-950' : 'bg-slate-900 border-slate-700 text-slate-200'
              }`}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === 'TODAS' ? 'Todas as Categorias' : c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Products Table */}
        <div id="container-tabela-estoque" className={`rounded-2xl border overflow-hidden transition-colors ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-800 border-slate-700'}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className={`uppercase text-[10px] tracking-wider border-b ${isLight ? 'bg-slate-100 text-slate-800 border-slate-200' : 'bg-slate-900/80 text-slate-300 border-slate-700'}`}>
                <tr>
                  <th className="p-3 sm:p-4">Produto & Categoria</th>
                  <th className="p-3 sm:p-4">Código / Barcode</th>
                  <th className="p-3 sm:p-4 text-right">P. Custo</th>
                  <th className="p-3 sm:p-4 text-right">P. Venda</th>
                  <th className="p-3 sm:p-4 text-center">Status & Estoque</th>
                  <th className="p-3 sm:p-4 text-center">Ajuste Rápido</th>
                  <th className="p-3 sm:p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-slate-100' : 'divide-slate-700/60'}`}>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-zinc-500">
                      Nenhum produto encontrado com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const isBelowMinStock = p.stock <= p.minStock;
                    const isOutOfStock = p.stock <= 0;

                    return (
                      <tr
                        key={p.id}
                        className={`transition-colors ${
                          isBelowMinStock
                            ? isLight
                              ? 'bg-rose-50/80 hover:bg-rose-100/80 border-l-4 border-l-rose-500'
                              : 'bg-rose-950/25 hover:bg-rose-950/35 border-l-4 border-l-rose-600'
                            : isLight
                            ? 'hover:bg-slate-50 text-slate-900'
                            : 'hover:bg-slate-700/30 text-slate-200'
                        }`}
                      >
                        {/* Product Name & Category */}
                        <td className="p-3 sm:p-4">
                          <div className={`font-bold ${isLight ? 'text-slate-950' : 'text-slate-100'}`}>{p.name}</div>
                          <div className={`text-[10px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                            {p.category} • Unidade: {p.unit}
                          </div>
                        </td>

                        {/* Barcode */}
                        <td className={`p-3 sm:p-4 font-mono text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                          {p.barcode}
                        </td>

                        {/* Cost Price */}
                        <td className={`p-3 sm:p-4 text-right ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                          {formatKz(p.costPrice)}
                        </td>

                        {/* Sale Price */}
                        <td className="p-3 sm:p-4 text-right font-bold text-emerald-500">
                          {formatKz(p.price)}
                        </td>

                        {/* Stock & Critical Pulsing Red Alert */}
                        <td className="p-3 sm:p-4 text-center">
                          {isOutOfStock ? (
                            <div className="inline-flex flex-col items-center">
                              <div className="px-2.5 py-1 rounded-full bg-rose-600 text-white font-black text-[10px] flex items-center gap-1.5 animate-pulse shadow-md">
                                <AlertTriangle className="w-3.5 h-3.5 text-white" />
                                <span>ESGOTADO: 0 {p.unit}</span>
                              </div>
                              <span className={`text-[9px] mt-0.5 font-semibold ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>
                                Abaixo do mín. ({p.minStock} {p.unit})
                              </span>
                            </div>
                          ) : isBelowMinStock ? (
                            /* PULSING RED ALERT FOR ANY PRODUCT BELOW MINIMUM STOCK */
                            <div className="inline-flex flex-col items-center">
                              <div className="px-2.5 py-1 rounded-full bg-rose-600 text-white font-black text-[10px] flex items-center gap-1.5 animate-pulse shadow-md">
                                <AlertTriangle className="w-3.5 h-3.5 text-white" />
                                <span>CRÍTICO: {p.stock} {p.unit}</span>
                              </div>
                              <span className={`text-[9px] mt-0.5 font-semibold ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>
                                Mínimo exigido: {p.minStock} {p.unit}
                              </span>
                            </div>
                          ) : (
                            <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                              isLight
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                : 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                            }`}>
                              <PackageCheck className="w-3 h-3 text-emerald-500" />
                              <span>{p.stock} {p.unit} (Mín: {p.minStock})</span>
                            </div>
                          )}
                        </td>

                        {/* Quick adjust (+ / -) */}
                        <td className="p-3 sm:p-4 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setAdjustingProduct(p);
                              setAdjustAmount(5);
                              setAdjustType('IN');
                            }}
                            className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-colors cursor-pointer ${
                              isLight
                                ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                                : 'bg-slate-700 hover:bg-slate-600 border-slate-600 text-slate-200'
                            }`}
                          >
                            Entrada / Saída
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="p-3 sm:p-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(p)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isLight
                                  ? 'text-slate-500 hover:text-emerald-600 hover:bg-slate-100'
                                  : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-700'
                              }`}
                              title="Editar Produto"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(p)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                              title="Remover Produto"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CREATE / EDIT PRODUCT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#111620] border border-zinc-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 bg-[#0e131b] border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                {editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Name */}
              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Nome do Produto *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Cerveja Cuca Lata 330ml"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Barcode & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">Código de Barras</label>
                  <input
                    type="text"
                    value={formBarcode}
                    onChange={(e) => setFormBarcode(e.target.value)}
                    placeholder="Ex: 5601234..."
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">Categoria</label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="Ex: Bebidas, Mercearia..."
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Prices in Kz */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">Preço de Custo (Kz) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formCostPrice}
                    onChange={(e) => setFormCostPrice(e.target.value)}
                    placeholder="Ex: 450"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-emerald-400 mb-1">Preço de Venda (Kz) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="Ex: 650"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>
              </div>

              {/* Stock, Min Stock, Unit */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">Estoque Inicial *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-rose-400 mb-1">Estoque Mínimo (Alerta) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formMinStock}
                    onChange={(e) => setFormMinStock(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">Unidade</label>
                  <input
                    type="text"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    placeholder="un, lata, kg..."
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {formError && (
                <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-700 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold rounded-lg shadow-md"
                >
                  {editingProduct ? 'Atualizar Produto' : 'Gravar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK STOCK ADJUSTMENT MODAL */}
      {adjustingProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#111620] border border-zinc-700 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-sm text-white">Ajuste de Estoque</h3>
              <button
                type="button"
                onClick={() => setAdjustingProduct(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-zinc-300">
              Produto: <strong className="text-white">{adjustingProduct.name}</strong>
              <div className="text-zinc-400 mt-0.5">
                Estoque atual: <strong className="text-emerald-400">{adjustingProduct.stock} {adjustingProduct.unit}</strong>
              </div>
            </div>

            <form onSubmit={handleQuickAdjust} className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setAdjustType('IN')}
                  className={`p-2 rounded-lg font-bold border flex items-center justify-center gap-1 ${
                    adjustType === 'IN'
                      ? 'bg-emerald-600 text-white border-emerald-400'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  }`}
                >
                  <PackagePlus className="w-4 h-4" />
                  <span>Entrada (+)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType('OUT')}
                  className={`p-2 rounded-lg font-bold border flex items-center justify-center gap-1 ${
                    adjustType === 'OUT'
                      ? 'bg-rose-600 text-white border-rose-400'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  }`}
                >
                  <PackageMinus className="w-4 h-4" />
                  <span>Saída (-)</span>
                </button>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Quantidade:</label>
                <input
                  type="number"
                  min="1"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white font-bold text-base focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustingProduct(null)}
                  className="px-3 py-1.5 bg-zinc-800 text-zinc-300 rounded-lg text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs"
                >
                  Confirmar Ajuste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
