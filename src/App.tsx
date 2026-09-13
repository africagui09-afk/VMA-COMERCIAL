import React, { useState, useEffect } from 'react';
import { usuarioLogado, verificarPermissaoRota, getCurrentSession, logoutUser } from './lib/auth';
import { Login } from './components/Login';
import { LoginModal } from './components/LoginModal';
import { buscarClientePorNome, processarVendaFiado, ClienteFiado, getClientesLocais, registrarPagamentoFiado } from './lib/fiadoService';
import { StockManagement } from './components/StockManagement';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { SalesHistory } from './components/SalesHistory';
import { ExpensesManagement } from './components/ExpensesManagement';
import { PDFReportModal } from './components/PDFReportModal';
import { getExpenses, getProducts, getSales, initStorage, createSale, saveSale } from './lib/storage';
import { printThermalReceipt } from './lib/thermalPrinter';
import { subscribeToRealtimeSync, broadcastLocalChange } from './lib/realtimeSync';
import { Expense, Product, Sale, User } from './types';
import { formatKz } from './lib/formatters';
import { Printer, CheckCircle, Search, Tag, X, RefreshCw, FileText, AlertCircle } from 'lucide-react';

export default function App() {
  const [autenticado, setAutenticado] = useState<boolean>(() => {
    initStorage();
    return !!getCurrentSession();
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const session = getCurrentSession();
    return session ? session.user : null;
  });

  // 1. TEMA ESCURO (FUNDO INICIAL): Reponha o fundo escuro original em ardósia profunda (bg-slate-900)
  const [temaEscuro, setTemaEscuro] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const salvo = localStorage.getItem('kwanzapos_tema_escuro');
      if (salvo !== null) return salvo === 'true';
    }
    return true; // Tema escuro inicial por padrão
  });

  const toggleTema = () => {
    setTemaEscuro((prev) => {
      const proximo = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('kwanzapos_tema_escuro', String(proximo));
      }
      return proximo;
    });
  };

  const [abaAtual, setAbaAtual] = useState<string>('pdv');
  const [modalFiadoAberto, setModalFiadoAberto] = useState<boolean>(false);
  const [modalTrocarOperadorAberto, setModalTrocarOperadorAberto] = useState<boolean>(false);
  const [bloqueioSegurancaMensagem, setBloqueioSegurancaMensagem] = useState<string | null>(null);
  const [pesquisaCliente, setPesquisaCliente] = useState<string>('');
  const [clientesEncontrados, setClientesEncontrados] = useState<ClienteFiado[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteFiado | null>(null);
  const [avisoCredito, setAvisoCredito] = useState<string>('');

  // Estados de feedback e relatórios
  const [toastMensagem, setToastMensagem] = useState<string | null>(null);
  const [modalPDFRelatorioAberto, setModalPDFRelatorioAberto] = useState<boolean>(false);
  const [termoPesquisaPDV, setTermoPesquisaPDV] = useState<string>('');
  const [categoriaSelecionadaPDV, setCategoriaSelecionadaPDV] = useState<string>('TODAS');

  const mostrarToast = (msg: string) => {
    setToastMensagem(msg);
    setTimeout(() => {
      setToastMensagem(null);
    }, 4000);
  };

  // Estados dos dados do sistema
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Carregar dados
  const refreshData = () => {
    setProducts(getProducts());
    setSales(getSales());
    setExpenses(getExpenses());
  };

  useEffect(() => {
    initStorage();
    refreshData();

    // Sincronização em tempo real reativa (BroadcastChannel entre abas + Supabase)
    const unsubscribe = subscribeToRealtimeSync(() => {
      refreshData();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Lista de produtos para exibição na frente de caixa
  const produtosExibicao = products.length > 0
    ? products
    : [
        { id: '1', name: 'Cerveja Cuca Lata 330ml', price: 650, costPrice: 450, stock: 85, minStock: 25, barcode: '5601234001', category: 'Bebidas', unit: 'lata', updatedAt: new Date().toISOString() },
        { id: '2', name: 'Refrigerante Blue Polpa 330ml', price: 500, costPrice: 320, stock: 60, minStock: 20, barcode: '5601234002', category: 'Bebidas', unit: 'lata', updatedAt: new Date().toISOString() },
        { id: '3', name: 'Bolacha Maria Campina', price: 450, costPrice: 280, stock: 45, minStock: 15, barcode: '5601234003', category: 'Alimentação', unit: 'pct', updatedAt: new Date().toISOString() },
      ];

  // Filtro dinâmico da Frente de Caixa por Nome, Código de Barras e Categoria
  const produtosExibicaoFiltrados = produtosExibicao.filter((p) => {
    const nome = (p.name || (p as any).nome || '').toLowerCase();
    const barcode = (p.barcode || '').toLowerCase();
    const busca = termoPesquisaPDV.toLowerCase().trim();
    const matchBusca = !busca || nome.includes(busca) || barcode.includes(busca);
    const matchCat = categoriaSelecionadaPDV === 'TODAS' || p.category === categoriaSelecionadaPDV;
    return matchBusca && matchCat;
  });

  const [carrinho, setCarrinho] = useState<any[]>([]);
  const totalVenda = carrinho.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);

  const adicionarAoCarrinho = (prod: any) => {
    const nome = prod.name || prod.nome;
    const preco = prod.price !== undefined ? prod.price : prod.preco;
    setCarrinho((prev) => {
      const ex = prev.find((i) => i.id === prod.id);
      return ex
        ? prev.map((i) => (i.id === prod.id ? { ...i, quantidade: i.quantidade + 1 } : i))
        : [...prev, { id: prod.id, nome, preco, quantidade: 1, costPrice: prod.costPrice || 0 }];
    });
  };

  const navegarParaAba = (novaAba: string) => {
    let rotaAlvo = novaAba;
    if (rotaAlvo === 'dashboard analítico' || rotaAlvo === 'dashboard') {
      rotaAlvo = 'painel analítico';
    }
    if (verificarPermissaoRota(rotaAlvo)) {
      setAbaAtual(rotaAlvo);
    } else {
      alert(`Acesso Restrito: Seu perfil (${usuarioLogado.cargo}) não tem permissão para aceder à aba selecionada.`);
    }
  };

  useEffect(() => {
    if (pesquisaCliente.trim()) {
      buscarClientePorNome(pesquisaCliente).then(setClientesEncontrados);
    } else {
      setClientesEncontrados([]);
    }
  }, [pesquisaCliente]);

  useEffect(() => {
    if (clienteSelecionado) {
      const total = Number(clienteSelecionado.saldo_devedor) + totalVenda;
      setAvisoCredito(total > Number(clienteSelecionado.limite_credito) ? '❌ Limite de Crédito Excedido!' : '');
    } else {
      setAvisoCredito('');
    }
  }, [clienteSelecionado, totalVenda]);

  const confirmarVendaFiado = async () => {
    if (!clienteSelecionado || avisoCredito) return;
    const res = await processarVendaFiado(clienteSelecionado.id, totalVenda, carrinho);
    alert(res.mensagem);
    if (res.sucesso) {
      setModalFiadoAberto(false);
      setCarrinho([]);
      setClienteSelecionado(null);
      setPesquisaCliente('');
      broadcastLocalChange('vendas');
      refreshData();
    }
  };

  /**
   * FLUXO DE FECHAMENTO DE VENDA E DUPLAS OPÇÕES (FRENTE DE CAIXA)
   * Opção A (comImpressao = true): Grava na BD/Storage, subtrai estoque, dispara impressão térmica ESC/POS
   * Opção B (comImpressao = false): Grava diretamente na base de dados, subtrai estoque e fecha silenciosamente
   */
  const handleFinalizarVenda = (comImpressao: boolean) => {
    if (!carrinho.length) {
      mostrarToast('⚠️ Carrinho vazio! Adicione produtos antes de finalizar.');
      return;
    }

    const salePayload = {
      items: carrinho.map((item) => ({
        productId: item.id,
        productName: item.nome,
        quantity: item.quantidade,
        unitPrice: item.preco,
        costPrice: item.costPrice || (item.preco * 0.7),
        discount: 0,
        total: item.preco * item.quantidade,
      })),
      subtotal: totalVenda,
      discountTotal: 0,
      total: totalVenda,
      totalCost: carrinho.reduce((acc, i) => acc + ((i.costPrice || i.preco * 0.7) * i.quantidade), 0),
      payments: [{ method: 'DINHEIRO' as const, amount: totalVenda }],
      amountReceived: totalVenda,
      change: 0,
      sellerId: currentUser?.id || 'usr-admin-victor',
      sellerName: currentUser?.name || usuarioLogado.nome,
      sellerRole: currentUser?.role || usuarioLogado.cargo,
      customerName: 'Consumidor Final',
    };

    // Executa a criação da venda e atualização automática de estoque
    const res = createSale(salePayload);
    if (!res.success || !res.sale) {
      alert(`Não foi possível finalizar a venda: ${res.error || 'Erro desconhecido'}`);
      return;
    }

    // 1. Notifica em tempo real (todas as abas e instâncias conectadas)
    broadcastLocalChange('vendas');

    // 2. Atualiza estado da aplicação
    refreshData();
    setCarrinho([]);

    // 3. Executa Opção A (Com Impressão) ou Opção B (Silencioso)
    if (comImpressao) {
      printThermalReceipt(res.sale, { paperWidth: '80mm' });
      mostrarToast(`✅ Venda ${res.sale.invoiceNumber} finalizada e enviada para impressão!`);
    } else {
      mostrarToast(`✅ Venda ${res.sale.invoiceNumber} concluída com sucesso no banco de dados!`);
    }
  };

  const emitirFacturaSimplificada = () => {
    handleFinalizarVenda(true);
  };

  const handleLogout = () => {
    logoutUser();
    setAutenticado(false);
    setCurrentUser(null);
    setAbaAtual('pdv');
  };

  if (!autenticado) {
    return (
      <Login
        theme={temaEscuro ? 'dark' : 'light'}
        lockoutMessage={bloqueioSegurancaMensagem}
        onLoginSucesso={(user) => {
          setBloqueioSegurancaMensagem(null);
          setAutenticado(true);
          if (user) setCurrentUser(user);
          refreshData();
        }}
        onLoginSuccess={(user) => {
          setBloqueioSegurancaMensagem(null);
          setAutenticado(true);
          if (user) setCurrentUser(user);
          refreshData();
        }}
      />
    );
  }

  const cargoExibicao = currentUser?.role || usuarioLogado?.cargo || 'ADMINISTRADOR';
  const nomeExibicao = currentUser?.name || usuarioLogado?.nome || 'Victor Abreu';

  return (
    <div
      className={`min-h-screen font-sans transition-colors duration-200 ${
        temaEscuro ? 'bg-slate-900 text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* CABEÇALHO COM CONTRASTE REVISADO */}
      <header
        className={`px-6 py-4 flex justify-between items-center border-b transition-colors ${
          temaEscuro
            ? 'bg-slate-800 border-slate-700 text-slate-100'
            : 'bg-white border-slate-200 shadow-sm text-slate-900'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl font-black text-emerald-500 tracking-wider">KwanzaPOS</span>
          <button
            type="button"
            onClick={() => setModalTrocarOperadorAberto(true)}
            title="Alterar operador (requer validação estrita por senha)"
            className={`text-xs px-2.5 py-0.5 rounded font-bold uppercase transition-all hover:scale-105 cursor-pointer flex items-center gap-1.5 ${
              temaEscuro ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'
            }`}
          >
            <span>{cargoExibicao}</span>
            <span className="text-[10px] opacity-70">🔒</span>
          </button>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setModalTrocarOperadorAberto(true)}
            className={`text-sm font-medium transition-colors hover:underline cursor-pointer flex items-center gap-1.5 ${
              temaEscuro ? 'text-slate-200' : 'text-slate-900'
            }`}
            title="Trocar operador do sistema (requer senha de validação)"
          >
            <span>Olá, <strong className="text-emerald-500">{nomeExibicao}</strong></span>
            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
              Trocar
            </span>
          </button>
          <button
            onClick={toggleTema}
            className={`px-3.5 py-1.5 rounded-lg border font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm ${
              temaEscuro
                ? 'bg-slate-700 hover:bg-slate-600 text-slate-100 border-slate-600'
                : 'bg-slate-200 hover:bg-slate-300 text-slate-900 border-slate-300'
            }`}
          >
            {temaEscuro ? '☀️ Modo Claro' : '🌙 Modo Escuro'}
          </button>
          <button
            onClick={handleLogout}
            className={`px-3 py-1.5 rounded-lg border font-bold text-xs transition-colors cursor-pointer ${
              temaEscuro
                ? 'bg-rose-950/40 text-rose-400 hover:bg-rose-900/60 border-rose-800/60'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200'
            }`}
          >
            Sair
          </button>
        </div>
      </header>

      {/* ROLAGEM HORIZONTAL DAS ABAS - UNIFORMIZAÇÃO DE NOMES */}
      <nav
        className={`flex border-b text-sm font-bold overflow-x-auto whitespace-nowrap scrollbar-none transition-colors ${
          temaEscuro
            ? 'bg-slate-800 border-slate-700'
            : 'bg-white border-slate-200 shadow-sm'
        }`}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {['Frente de Caixa', 'Estoque', 'Histórico & Vendas', 'Gestão de Despesas', 'Painel Analítico', 'Gestão de Fiados'].map((aba) => {
          const viewMapeada =
            aba === 'Frente de Caixa'
              ? 'pdv'
              : aba === 'Gestão de Despesas'
              ? 'despesas'
              : aba === 'Painel Analítico'
              ? 'painel analítico'
              : aba.toLowerCase();
          if (cargoExibicao === 'VENDEDOR' && viewMapeada !== 'pdv') return null;
          const ativo = abaAtual === viewMapeada;
          return (
            <button
              key={aba}
              onClick={() => navegarParaAba(viewMapeada)}
              className={`inline-block px-6 py-4 border-b-2 transition-all cursor-pointer ${
                ativo
                  ? 'border-emerald-500 text-emerald-500 font-black'
                  : temaEscuro
                  ? 'border-transparent text-slate-300 hover:text-slate-100'
                  : 'border-transparent text-slate-600 hover:text-slate-950 font-bold'
              }`}
            >
              {aba}
            </button>
          );
        })}
      </nav>

      {/* CONTEÚDO PRINCIPAL COM CONTRASTE REVISADO */}
      <main className="p-6">
        {abaAtual === 'pdv' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            <div className="lg:col-span-2 space-y-4">
              {cargoExibicao !== 'VENDEDOR' && (
                <div className="grid grid-cols-2 gap-4">
                  <div
                    className={`p-4 rounded-xl border transition-colors ${
                      temaEscuro ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
                    }`}
                  >
                    <span
                      className={`text-xs font-bold uppercase ${
                        temaEscuro ? 'text-slate-400' : 'text-slate-600'
                      }`}
                    >
                      Custos de Manutenção
                    </span>
                    <div className="text-xl font-black text-rose-500 mt-1">145.000 Kz</div>
                  </div>
                  <div
                    className={`p-4 rounded-xl border transition-colors ${
                      temaEscuro ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
                    }`}
                  >
                    <span
                      className={`text-xs font-bold uppercase ${
                        temaEscuro ? 'text-slate-400' : 'text-slate-600'
                      }`}
                    >
                      Lucros Operacionais
                    </span>
                    <div className="text-xl font-black text-emerald-500 mt-1">320.500 Kz</div>
                  </div>
                </div>
              )}

              {/* BARRA DE PESQUISA E CATEGORIAS DA FRENTE DE CAIXA */}
              <div
                className={`p-3.5 rounded-xl border flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between sticky top-2 z-10 shadow-sm transition-colors ${
                  temaEscuro
                    ? 'bg-slate-800/95 border-slate-700 backdrop-blur'
                    : 'bg-white/95 border-slate-200 backdrop-blur'
                }`}
              >
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    id="pdv-search-input"
                    value={termoPesquisaPDV}
                    onChange={(e) => setTermoPesquisaPDV(e.target.value)}
                    placeholder="Pesquisar produto ou código de barras (leitor ótico)..."
                    className={`w-full pl-10 pr-8 py-2.5 rounded-xl text-xs font-medium border outline-none transition-all ${
                      temaEscuro
                        ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-emerald-500'
                        : 'bg-slate-50 border-slate-300 text-slate-950 placeholder:text-slate-400 focus:border-emerald-500'
                    }`}
                  />
                  {termoPesquisaPDV && (
                    <button
                      type="button"
                      onClick={() => setTermoPesquisaPDV('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Chips de categorias */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                  {['TODAS', 'Bebidas', 'Alimentação', 'Mercearia', 'Limpeza'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoriaSelecionadaPDV(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                        categoriaSelecionadaPDV === cat
                          ? 'bg-emerald-500 text-slate-950 shadow-sm'
                          : temaEscuro
                          ? 'bg-slate-900 text-slate-300 hover:bg-slate-700'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* GRADE DE PRODUTOS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {produtosExibicaoFiltrados.length === 0 ? (
                  <div
                    className={`col-span-full p-8 text-center rounded-xl border ${
                      temaEscuro ? 'bg-slate-800/50 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    Nenhum produto encontrado para &quot;{termoPesquisaPDV}&quot;.
                  </div>
                ) : (
                  produtosExibicaoFiltrados.map((p) => {
                    const nome = p.name || (p as any).nome;
                    const preco = p.price !== undefined ? p.price : (p as any).preco;
                    const estoqueBaixo = p.stock <= (p.minStock || 10);
                    return (
                      <div
                        key={p.id}
                        onClick={() => adicionarAoCarrinho(p)}
                        className={`p-4 rounded-xl border cursor-pointer hover:shadow-md transition-all flex flex-col justify-between ${
                          temaEscuro
                            ? 'bg-slate-800 border-slate-700 hover:border-slate-600 text-slate-100'
                            : 'bg-white border-slate-200 shadow-sm hover:border-slate-300 text-slate-950'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h3
                              className={`font-bold text-base leading-snug ${
                                temaEscuro ? 'text-slate-100' : 'text-slate-950'
                              }`}
                            >
                              {nome}
                            </h3>
                            {estoqueBaixo && (
                              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 shrink-0">
                                Estoque Mínimo
                              </span>
                            )}
                          </div>
                          <span
                            className={`text-xs uppercase tracking-wider block mt-1 ${
                              temaEscuro ? 'text-slate-400' : 'text-slate-600 font-semibold'
                            }`}
                          >
                            {p.category || 'Geral'} • {p.stock} {p.unit || 'un'} disp.
                          </span>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <div className="text-lg font-black text-emerald-500">
                            {preco.toLocaleString('pt-AO')} Kz
                          </div>
                          <span
                            className={`text-xs font-bold px-2.5 py-1 rounded transition-colors ${
                              temaEscuro
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                            }`}
                          >
                            + Adicionar
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* PAINEL DO CARRINHO */}
            <div className="lg:col-span-1">
              <div
                className={`p-6 rounded-2xl border transition-colors ${
                  temaEscuro
                    ? 'bg-slate-800 border-slate-700 text-slate-100'
                    : 'bg-white border-slate-200 shadow-sm text-slate-950'
                }`}
              >
                <h2 className="text-lg font-black mb-4 flex items-center justify-between">
                  <span className={temaEscuro ? 'text-slate-100' : 'text-slate-950'}>Carrinho de Compras</span>
                  {carrinho.length > 0 && (
                    <button
                      onClick={() => setCarrinho([])}
                      className="text-xs text-rose-500 hover:text-rose-600 font-bold cursor-pointer transition-colors"
                    >
                      Limpar
                    </button>
                  )}
                </h2>

                <div
                  className={`space-y-2 max-h-56 overflow-y-auto my-4 divide-y ${
                    temaEscuro ? 'divide-slate-700' : 'divide-slate-200'
                  }`}
                >
                  {carrinho.length === 0 ? (
                    <p className={`text-sm py-6 text-center ${temaEscuro ? 'text-slate-400' : 'text-slate-600'}`}>
                      Nenhum produto adicionado ao carrinho.
                    </p>
                  ) : (
                    carrinho.map((item) => (
                      <div key={item.id} className="text-sm flex justify-between items-center py-2">
                        <div>
                          <div className={`font-bold ${temaEscuro ? 'text-slate-100' : 'text-slate-950'}`}>
                            {item.nome}
                          </div>
                          <div
                            className={`text-xs ${temaEscuro ? 'text-slate-400' : 'text-slate-600 font-medium'}`}
                          >
                            {item.quantidade} × {item.preco.toLocaleString('pt-AO')} Kz
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              setCarrinho((prev) =>
                                prev.map((i) => (i.id === item.id ? { ...i, quantidade: Math.max(1, i.quantidade - 1) } : i))
                              )
                            }
                            className={`w-6 h-6 rounded font-bold text-xs flex items-center justify-center transition-colors cursor-pointer ${
                              temaEscuro
                                ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                                : 'bg-slate-200 hover:bg-slate-300 text-slate-950'
                            }`}
                          >
                            -
                          </button>
                          <span
                            className={`font-black min-w-[20px] text-center ${
                              temaEscuro ? 'text-slate-100' : 'text-slate-950'
                            }`}
                          >
                            {item.quantidade}
                          </span>
                          <button
                            onClick={() =>
                              setCarrinho((prev) =>
                                prev.map((i) => (i.id === item.id ? { ...i, quantidade: i.quantidade + 1 } : i))
                              )
                            }
                            className={`w-6 h-6 rounded font-bold text-xs flex items-center justify-center transition-colors cursor-pointer ${
                              temaEscuro
                                ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                                : 'bg-slate-200 hover:bg-slate-300 text-slate-950'
                            }`}
                          >
                            +
                          </button>
                          <span className={`font-bold ml-2 ${temaEscuro ? 'text-slate-100' : 'text-slate-950'}`}>
                            {(item.preco * item.quantidade).toLocaleString('pt-AO')} Kz
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className={`border-t pt-4 space-y-3 ${temaEscuro ? 'border-slate-700' : 'border-slate-200'}`}>
                  <div className="flex justify-between font-black text-lg">
                    <span className={temaEscuro ? 'text-slate-100' : 'text-slate-950'}>Total Geral:</span>
                    <span className="text-emerald-500 font-black">{totalVenda.toLocaleString('pt-AO')} Kz</span>
                  </div>

                  {/* FLUXO DE FECHAMENTO DE VENDA E DUPLAS OPÇÕES (FRENTE DE CAIXA) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Opção A: Com Impressão */}
                    <button
                      type="button"
                      id="btn-finalizar-imprimir"
                      onClick={() => handleFinalizarVenda(true)}
                      disabled={carrinho.length === 0}
                      className="w-full py-3 px-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black text-xs rounded-xl cursor-pointer transition-colors shadow-sm flex items-center justify-center gap-1.5"
                      title="Finaliza a venda, grava na BD e imprime a fatura térmica (80mm/58mm)"
                    >
                      <Printer className="w-4 h-4 shrink-0" />
                      <span>Finalizar e Imprimir</span>
                    </button>

                    {/* Opção B: Sem Impressão (Silencioso) */}
                    <button
                      type="button"
                      id="btn-finalizar-silencioso"
                      onClick={() => handleFinalizarVenda(false)}
                      disabled={carrinho.length === 0}
                      className={`w-full py-3 px-2 border font-bold text-xs rounded-xl cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 ${
                        temaEscuro
                          ? 'bg-slate-700 hover:bg-slate-600 text-slate-100 border-slate-600'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-300'
                      }`}
                      title="Registra a venda no banco de dados e conclui sem abrir janela de impressão"
                    >
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>OK / Finalizar Silencioso</span>
                    </button>
                  </div>

                  <button
                    onClick={() => setModalFiadoAberto(true)}
                    disabled={carrinho.length === 0}
                    className={`w-full py-3 border font-bold rounded-xl cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      temaEscuro
                        ? 'border-amber-500/50 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300'
                        : 'border-amber-400 bg-amber-50 hover:bg-amber-100 text-amber-950'
                    }`}
                  >
                    🤝 Vender no Fiado (Conta Corrente)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA: ESTOQUE */}
        {abaAtual === 'estoque' && (
          <StockManagement
            currentUser={currentUser || { id: 'admin', name: nomeExibicao, email: usuarioLogado.email, role: cargoExibicao as any }}
            products={products}
            onRefreshData={refreshData}
            onBackToPDV={() => setAbaAtual('pdv')}
            onExportPDF={() => setModalPDFRelatorioAberto(true)}
            theme={temaEscuro ? 'dark' : 'light'}
          />
        )}

        {/* ABA: HISTÓRICO & VENDAS */}
        {abaAtual === 'histórico & vendas' && (
          <SalesHistory
            currentUser={currentUser || { id: 'admin', name: nomeExibicao, email: usuarioLogado.email, role: cargoExibicao as any }}
            sales={sales}
            onRefreshData={refreshData}
            onBackToPDV={() => setAbaAtual('pdv')}
            theme={temaEscuro ? 'dark' : 'light'}
          />
        )}

        {/* ABA: GESTÃO DE DESPESAS */}
        {abaAtual === 'despesas' && (
          <ExpensesManagement
            currentUser={currentUser || { id: 'admin', name: nomeExibicao, email: usuarioLogado.email, role: cargoExibicao as any }}
            expenses={expenses}
            onRefreshData={refreshData}
            onBackToPDV={() => setAbaAtual('pdv')}
            theme={temaEscuro ? 'dark' : 'light'}
          />
        )}

        {/* ABA: PAINEL ANALÍTICO (UNIFICADO DESKTOP & MOBILE) */}
        {(abaAtual === 'painel analítico' || abaAtual === 'dashboard analítico' || abaAtual === 'dashboard') && (
          <AnalyticsDashboard
            currentUser={currentUser || { id: 'admin', name: nomeExibicao, email: usuarioLogado.email, role: cargoExibicao as any }}
            sales={sales}
            products={products}
            expenses={expenses}
            onRefreshData={refreshData}
            onBackToPDV={() => setAbaAtual('pdv')}
            onExportPDF={() => setModalPDFRelatorioAberto(true)}
            theme={temaEscuro ? 'dark' : 'light'}
          />
        )}

        {/* ABA: GESTÃO DE FIADOS */}
        {abaAtual === 'gestão de fiados' && (
          <div className="max-w-6xl mx-auto space-y-6">
            <div
              className={`border rounded-2xl p-6 transition-colors ${
                temaEscuro ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div
                className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b ${
                  temaEscuro ? 'border-slate-700' : 'border-slate-200'
                }`}
              >
                <div>
                  <h2 className={`text-xl font-black ${temaEscuro ? 'text-slate-100' : 'text-slate-950'}`}>
                    Gestão de Fiados e Contas Correntes
                  </h2>
                  <p className={`text-xs ${temaEscuro ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>
                    Acompanhamento e liquidação de dívidas dos clientes de Saurimo
                  </p>
                </div>
                <button
                  onClick={() => {
                    setAbaAtual('pdv');
                    setModalFiadoAberto(true);
                  }}
                  className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-xl cursor-pointer transition-colors shadow-sm"
                >
                  + Nova Venda a Fiado
                </button>
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead
                    className={`uppercase font-black text-[10px] tracking-wider ${
                      temaEscuro ? 'bg-slate-900/60 text-slate-300' : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    <tr>
                      <th className="p-3">Cliente</th>
                      <th className="p-3">NIF</th>
                      <th className="p-3">Contacto</th>
                      <th className="p-3">Limite de Crédito</th>
                      <th className="p-3">Saldo Devedor</th>
                      <th className="p-3">Estado</th>
                      <th className="p-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${temaEscuro ? 'divide-slate-700' : 'divide-slate-200'}`}>
                    {getClientesLocais().map((cli) => (
                      <tr
                        key={cli.id}
                        className={`transition-colors ${
                          temaEscuro ? 'hover:bg-slate-700/40 text-slate-200' : 'hover:bg-slate-50 text-slate-900'
                        }`}
                      >
                        <td className={`p-3 font-bold ${temaEscuro ? 'text-slate-100' : 'text-slate-950'}`}>
                          {cli.nome}
                        </td>
                        <td className={`p-3 ${temaEscuro ? 'text-slate-300' : 'text-slate-700'}`}>
                          {cli.nif || 'Consumidor'}
                        </td>
                        <td className={`p-3 ${temaEscuro ? 'text-slate-300' : 'text-slate-700'}`}>
                          {cli.telefone}
                        </td>
                        <td className={`p-3 font-semibold ${temaEscuro ? 'text-slate-200' : 'text-slate-900'}`}>
                          {formatKz(cli.limite_credito)}
                        </td>
                        <td className="p-3 font-black text-amber-400">{formatKz(cli.saldo_devedor)}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              cli.status === 'ATIVO'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {cli.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={async () => {
                              const valorStr = prompt(
                                `Amortizar dívida de "${cli.nome}" (Dívida Atual: ${formatKz(cli.saldo_devedor)}):`,
                                '10000'
                              );
                              if (valorStr && Number(valorStr) > 0) {
                                const res = await registrarPagamentoFiado(cli.id, Number(valorStr), 'DINHEIRO', nomeExibicao);
                                if (res.success) {
                                  alert(`✅ Pagamento de ${formatKz(Number(valorStr))} registrado com sucesso!`);
                                  refreshData();
                                } else {
                                  alert(res.erro || 'Erro ao registrar pagamento.');
                                }
                              }
                            }}
                            className={`px-3 py-1.5 rounded font-bold text-[11px] cursor-pointer transition-colors ${
                              temaEscuro
                                ? 'bg-slate-700 hover:bg-slate-600 text-slate-100 border border-slate-600'
                                : 'bg-slate-200 hover:bg-slate-300 text-slate-900 border border-slate-300'
                            }`}
                          >
                            Amortizar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL DE VENDA EM FIADO COM CONTRASTE REVISADO */}
      {modalFiadoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div
            className={`w-full max-w-md p-6 rounded-2xl shadow-2xl space-y-4 border transition-colors ${
              temaEscuro ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-950'
            }`}
          >
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-amber-400">Venda em Fiado (Conta Corrente)</h3>
              <button
                onClick={() => {
                  setModalFiadoAberto(false);
                  setClienteSelecionado(null);
                  setPesquisaCliente('');
                }}
                className={`text-xs font-bold p-1 cursor-pointer transition-colors ${
                  temaEscuro ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-950'
                }`}
              >
                ✕
              </button>
            </div>

            <div>
              <label
                className={`block text-xs font-bold mb-1.5 ${
                  temaEscuro ? 'text-slate-300' : 'text-slate-800'
                }`}
              >
                Pesquisar Cliente
              </label>
              <input
                type="text"
                value={pesquisaCliente}
                onChange={(e) => setPesquisaCliente(e.target.value)}
                className={`w-full p-2.5 border rounded-lg text-xs outline-none transition-all ${
                  temaEscuro
                    ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-amber-400'
                    : 'bg-slate-50 border-slate-300 text-slate-950 placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500'
                }`}
                placeholder="Pesquise por nome, NIF ou telefone..."
              />
            </div>

            {/* Lista de clientes encontrados para selecionar */}
            {!clienteSelecionado && clientesEncontrados.length > 0 && (
              <div
                className={`max-h-40 overflow-y-auto space-y-1.5 border rounded-lg p-2 ${
                  temaEscuro ? 'bg-slate-900/80 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <p
                  className={`text-[10px] font-semibold uppercase tracking-wider ${
                    temaEscuro ? 'text-slate-400' : 'text-slate-600'
                  }`}
                >
                  Selecione o Cliente:
                </p>
                {clientesEncontrados.map((cli) => (
                  <button
                    key={cli.id}
                    type="button"
                    onClick={() => {
                      setClienteSelecionado(cli);
                      setPesquisaCliente(cli.nome);
                    }}
                    className={`w-full text-left p-2 rounded-lg transition-colors flex justify-between items-center cursor-pointer ${
                      temaEscuro
                        ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-100'
                        : 'bg-white hover:bg-slate-100 border border-slate-200 text-slate-950'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs">{cli.nome}</div>
                      <div className={`text-[10px] ${temaEscuro ? 'text-slate-400' : 'text-slate-600'}`}>
                        NIF: {cli.nif || 'Consumidor'} • Tel: {cli.telefone}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-[10px] ${temaEscuro ? 'text-slate-400' : 'text-slate-600'}`}>
                        Dívida:
                      </div>
                      <div className="text-xs font-bold text-amber-400">
                        {Number(cli.saldo_devedor).toLocaleString('pt-AO')} Kz
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {clienteSelecionado && (
              <div
                className={`p-3.5 border rounded-xl text-xs space-y-2 ${
                  temaEscuro ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span
                      className={`text-[10px] uppercase font-bold ${
                        temaEscuro ? 'text-slate-400' : 'text-slate-600'
                      }`}
                    >
                      Cliente Selecionado:
                    </span>
                    <div className="text-emerald-500 font-bold text-sm">{clienteSelecionado.nome}</div>
                    <div className={`text-[10px] ${temaEscuro ? 'text-slate-400' : 'text-slate-600'}`}>
                      NIF: {clienteSelecionado.nif || 'Consumidor'} • Tel: {clienteSelecionado.telefone}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setClienteSelecionado(null);
                      setPesquisaCliente('');
                    }}
                    className={`text-[11px] px-2.5 py-1 rounded font-bold cursor-pointer transition-colors ${
                      temaEscuro
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                    }`}
                  >
                    Trocar
                  </button>
                </div>

                <div
                  className={`grid grid-cols-2 gap-2 pt-2 border-t ${
                    temaEscuro ? 'border-slate-800' : 'border-slate-200'
                  }`}
                >
                  <div>
                    <span className={`text-[10px] ${temaEscuro ? 'text-slate-400' : 'text-slate-600'}`}>
                      Limite de Crédito:
                    </span>
                    <div className={`font-bold ${temaEscuro ? 'text-slate-100' : 'text-slate-950'}`}>
                      {Number(clienteSelecionado.limite_credito).toLocaleString('pt-AO')} Kz
                    </div>
                  </div>
                  <div>
                    <span className={`text-[10px] ${temaEscuro ? 'text-slate-400' : 'text-slate-600'}`}>
                      Saldo Devedor Atual:
                    </span>
                    <div className="font-bold text-amber-400">
                      {Number(clienteSelecionado.saldo_devedor).toLocaleString('pt-AO')} Kz
                    </div>
                  </div>
                  <div>
                    <span className={`text-[10px] ${temaEscuro ? 'text-slate-400' : 'text-slate-600'}`}>
                      Valor Desta Venda:
                    </span>
                    <div className="font-bold text-emerald-500">{totalVenda.toLocaleString('pt-AO')} Kz</div>
                  </div>
                  <div>
                    <span className={`text-[10px] ${temaEscuro ? 'text-slate-400' : 'text-slate-600'}`}>
                      Saldo Projetado:
                    </span>
                    <div
                      className={`font-bold ${
                        Number(clienteSelecionado.saldo_devedor) + totalVenda >
                        Number(clienteSelecionado.limite_credito)
                          ? 'text-rose-500'
                          : temaEscuro
                          ? 'text-slate-200'
                          : 'text-slate-900'
                      }`}
                    >
                      {(Number(clienteSelecionado.saldo_devedor) + totalVenda).toLocaleString('pt-AO')} Kz
                    </div>
                  </div>
                </div>

                {avisoCredito && (
                  <div className="p-2 rounded bg-rose-500/15 border border-rose-500/40 text-rose-500 font-bold text-xs flex items-center gap-1.5">
                    {avisoCredito}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setModalFiadoAberto(false);
                  setClienteSelecionado(null);
                  setPesquisaCliente('');
                }}
                className={`px-4 py-2 font-bold rounded-lg text-xs cursor-pointer transition-colors ${
                  temaEscuro
                    ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarVendaFiado}
                disabled={!clienteSelecionado || !!avisoCredito || totalVenda <= 0}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg text-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-sm"
              >
                Confirmar Fiado
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE RELATÓRIO EXECUTIVO EM PDF */}
      {modalPDFRelatorioAberto && (
        <PDFReportModal
          currentUser={currentUser || { id: 'admin', name: nomeExibicao, email: usuarioLogado.email, role: cargoExibicao as any }}
          sales={sales}
          products={products}
          expenses={expenses}
          onClose={() => setModalPDFRelatorioAberto(false)}
        />
      )}

      {/* MODAL DE TROCA DE OPERADOR COM VALIDAÇÃO ESTRITA DE SENHA */}
      {modalTrocarOperadorAberto && (
        <LoginModal
          isOpen={modalTrocarOperadorAberto}
          currentRole={cargoExibicao}
          onClose={() => setModalTrocarOperadorAberto(false)}
          onSwitchSuccess={(user) => {
            setCurrentUser(user);
            setBloqueioSegurancaMensagem(null);
            mostrarToast(`✅ Operador alterado com sucesso para ${user.name} (${user.role})`);
            refreshData();
            setModalTrocarOperadorAberto(false);
          }}
          onLockout={(reason) => {
            setModalTrocarOperadorAberto(false);
            setBloqueioSegurancaMensagem(reason);
            handleLogout();
          }}
        />
      )}

      {/* TOAST NOTIFICATION FLUTUANTE (FEEDBACK EM TEMPO REAL) */}
      {toastMensagem && (
        <div
          id="toast-kwanza-pos"
          className="fixed bottom-6 right-6 z-50 px-5 py-3.5 bg-slate-900/95 border border-emerald-500 text-emerald-400 rounded-2xl shadow-2xl font-bold text-xs sm:text-sm flex items-center gap-3 backdrop-blur animate-in fade-in slide-in-from-bottom duration-200"
        >
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-slate-100">{toastMensagem}</span>
        </div>
      )}
    </div>
  );
}
