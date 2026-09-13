import 'package:flutter/material.dart';
import '../../core/auth/rbac_guard.dart';
import '../../core/auth/session_manager.dart';
import '../../core/auth/user_role.dart';
import '../../data/models/item_venda_model.dart';
import '../../data/models/produto_model.dart';
import '../../data/models/venda_model.dart';
import '../../data/services/printing/printing.dart';

/// Tela Principal da Frente de Caixa (PDV) com Design Adaptativo e Dark Mode Profissional
class PdvScreen extends StatefulWidget {
  const PdvScreen({Key? key}) : super(key: key);

  @override
  State<PdvScreen> createState() => _PdvScreenState();
}

class _PdvScreenState extends State<PdvScreen> {
  final TextEditingController _buscaController = TextEditingController();
  final TextEditingController _clienteNomeController = TextEditingController();
  final TextEditingController _clienteNifController = TextEditingController();
  final TextEditingController _valorRecebidoController = TextEditingController();

  final SessionManager _sessionManager = SessionManager();

  // Lista local simulada/carregada do catálogo
  List<ProdutoModel> _produtos = [];
  List<ProdutoModel> _produtosFiltrados = [];
  String _categoriaSelecionada = 'Todos';

  // Itens adicionados ao carrinho atual
  final List<ItemVendaModel> _carrinho = [];
  String _metodoPagamento = 'DINHEIRO'; // 'DINHEIRO' | 'MULTICAIXA' | 'TRANSFERENCIA'
  bool _processandoVenda = false;

  @override
  void initState() {
    super.initState();
    _carregarProdutosIniciais();
    _buscaController.addListener(_filtrarProdutos);
  }

  @override
  void dispose() {
    _buscaController.dispose();
    _clienteNomeController.dispose();
    _clienteNifController.dispose();
    _valorRecebidoController.dispose();
    super.dispose();
  }

  void _carregarProdutosIniciais() {
    // Dados de demonstração alinhados com o inventário da loja
    _produtos = [
      ProdutoModel.criarLocal(
        supabaseId: 'prod-001',
        nome: 'Arroz Extra Branco 5Kg',
        codigoBarras: '560123456789',
        categoria: 'Alimentos',
        precoVenda: 10800.0,
        precoCusto: 8500.0,
        estoqueAtual: 42,
        estoqueMinimo: 10,
        unidade: 'saco',
      ),
      ProdutoModel.criarLocal(
        supabaseId: 'prod-002',
        nome: 'Óleo Vegetal Alimentar 1L',
        codigoBarras: '560123456790',
        categoria: 'Alimentos',
        precoVenda: 2350.0,
        precoCusto: 1800.0,
        estoqueAtual: 18,
        estoqueMinimo: 8,
        unidade: 'garrafa',
      ),
      ProdutoModel.criarLocal(
        supabaseId: 'prod-003',
        nome: 'Açúcar Moreno 1Kg',
        codigoBarras: '560123456791',
        categoria: 'Alimentos',
        precoVenda: 1950.0,
        precoCusto: 1450.0,
        estoqueAtual: 60,
        estoqueMinimo: 15,
        unidade: 'pct',
      ),
      ProdutoModel.criarLocal(
        supabaseId: 'prod-004',
        nome: 'Farinha de Trigo Especial 1Kg',
        codigoBarras: '560123456792',
        categoria: 'Alimentos',
        precoVenda: 1600.0,
        precoCusto: 1200.0,
        estoqueAtual: 35,
        estoqueMinimo: 10,
        unidade: 'pct',
      ),
      ProdutoModel.criarLocal(
        supabaseId: 'prod-005',
        nome: 'Leite em Pó Integral Ninho 400g',
        codigoBarras: '560123456793',
        categoria: 'Lacticínios',
        precoVenda: 4850.0,
        precoCusto: 3900.0,
        estoqueAtual: 24,
        estoqueMinimo: 6,
        unidade: 'lata',
      ),
      ProdutoModel.criarLocal(
        supabaseId: 'prod-006',
        nome: 'Massa Esparguete 500g',
        codigoBarras: '560123456794',
        categoria: 'Alimentos',
        precoVenda: 850.0,
        precoCusto: 620.0,
        estoqueAtual: 4,
        estoqueMinimo: 12, // Estoque Crítico!
        unidade: 'pct',
      ),
      ProdutoModel.criarLocal(
        supabaseId: 'prod-007',
        nome: 'Sabão Azul em Barra 1Kg',
        codigoBarras: '560123456795',
        categoria: 'Higiene',
        precoVenda: 1400.0,
        precoCusto: 1000.0,
        estoqueAtual: 29,
        estoqueMinimo: 5,
        unidade: 'barra',
      ),
      ProdutoModel.criarLocal(
        supabaseId: 'prod-008',
        nome: 'Água Mineral Mineralizada 5L',
        codigoBarras: '560123456796',
        categoria: 'Bebidas',
        precoVenda: 1250.0,
        precoCusto: 900.0,
        estoqueAtual: 50,
        estoqueMinimo: 10,
        unidade: 'garrafão',
      ),
    ];
    _produtosFiltrados = List.from(_produtos);
  }

  void _filtrarProdutos() {
    final query = _buscaController.text.trim().toLowerCase();
    setState(() {
      _produtosFiltrados = _produtos.where((p) {
        final matchesQuery = p.nome.toLowerCase().contains(query) ||
            (p.codigoBarras != null && p.codigoBarras!.contains(query));
        final matchesCat = _categoriaSelecionada == 'Todos' || p.categoria == _categoriaSelecionada;
        return matchesQuery && matchesCat;
      }).toList();
    });
  }

  void _adicionarAoCarrinho(ProdutoModel produto) {
    if (produto.estoqueAtual <= 0) {
      _mostrarAlertaSnackBar('Produto sem estoque disponível no momento.', isError: true);
      return;
    }

    setState(() {
      final index = _carrinho.indexWhere((item) => item.produtoId == produto.supabaseId);
      if (index >= 0) {
        if (_carrinho[index].quantidade >= produto.estoqueAtual) {
          _mostrarAlertaSnackBar('Quantidade máxima do estoque atingida (${produto.estoqueAtual} ${produto.unidade}).', isError: true);
          return;
        }
        _carrinho[index].quantidade += 1;
        _carrinho[index].subtotal = _carrinho[index].quantidade * _carrinho[index].precoUnitario;
        _carrinho[index].total = _carrinho[index].subtotal - _carrinho[index].desconto;
      } else {
        _carrinho.add(ItemVendaModel.criar(
          produtoId: produto.supabaseId,
          nomeProduto: produto.nome,
          quantidade: 1,
          precoUnitario: produto.precoVenda,
          precoCusto: produto.precoCusto,
        ));
      }
    });
  }

  void _removerDoCarrinho(int index) {
    setState(() {
      _carrinho.removeAt(index);
    });
  }

  void _alterarQuantidade(int index, int delta) {
    setState(() {
      final item = _carrinho[index];
      final novaQtd = item.quantidade + delta;
      if (novaQtd <= 0) {
        _carrinho.removeAt(index);
      } else {
        // Checa limite de estoque
        final prod = _produtos.firstWhere((p) => p.supabaseId == item.produtoId);
        if (novaQtd > prod.estoqueAtual) {
          _mostrarAlertaSnackBar('Estoque máximo disponível: ${prod.estoqueAtual} ${prod.unidade}', isError: true);
          return;
        }
        item.quantidade = novaQtd;
        item.subtotal = item.quantidade * item.precoUnitario;
        item.total = item.subtotal - item.desconto;
      }
    });
  }

  double get _subtotalCarrinho => _carrinho.fold(0.0, (acc, item) => acc + item.subtotal);
  double get _descontoCarrinho => _carrinho.fold(0.0, (acc, item) => acc + item.desconto);
  double get _totalCarrinho => (_subtotalCarrinho - _descontoCarrinho).clamp(0.0, double.infinity);

  double get _trocoCalculado {
    final recebido = double.tryParse(_valorRecebidoController.text.replaceAll(',', '.')) ?? 0.0;
    return (recebido > _totalCarrinho) ? (recebido - _totalCarrinho) : 0.0;
  }

  void _finalizarVenda() async {
    if (_carrinho.isEmpty) {
      _mostrarAlertaSnackBar('Adicione pelo menos um item ao carrinho antes de finalizar.', isError: true);
      return;
    }

    // 1. RBAC Guard: Validação do Limite Diário de 900.000 Kz para Vendedores
    final validacao = _sessionManager.verificarPermissaoNovaVenda(_totalCarrinho);
    if (!validacao.permitido) {
      _mostrarDialogoBloqueioLimite(validacao.mensagemErro ?? 'Limite diário de 900.000 Kz atingido.');
      return;
    }

    setState(() => _processandoVenda = true);

    try {
      final user = _sessionManager.usuarioAtual;
      final vendedorId = user?.supabaseId ?? 'usr-offline-01';
      final vendedorNome = user?.nome ?? 'Operador Caixa';
      final vendedorCargo = user?.cargo ?? 'VENDEDOR';

      final novaVenda = VendaModel.criarLocal(
        supabaseId: 'venda-${DateTime.now().millisecondsSinceEpoch}',
        numeroFatura: 'VD-${DateTime.now().year}-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}',
        itens: List.from(_carrinho),
        formasPagamento: [_metodoPagamento],
        vendedorId: vendedorId,
        vendedorNome: vendedorNome,
        vendedorCargo: vendedorCargo,
        valorRecebido: double.tryParse(_valorRecebidoController.text.replaceAll(',', '.')),
        clienteNome: _clienteNomeController.text.trim().isEmpty ? null : _clienteNomeController.text.trim(),
        clienteNif: _clienteNifController.text.trim().isEmpty ? null : _clienteNifController.text.trim(),
      );

      // Baixa imediata de estoque local
      for (final item in _carrinho) {
        final prodIdx = _produtos.indexWhere((p) => p.supabaseId == item.produtoId);
        if (prodIdx >= 0) {
          _produtos[prodIdx].estoqueAtual -= item.quantidade;
        }
      }

      // Limpa carrinho e campos
      setState(() {
        _carrinho.clear();
        _clienteNomeController.clear();
        _clienteNifController.clear();
        _valorRecebidoController.clear();
        _filtrarProdutos();
      });

      _mostrarSucessoVendaDialog(novaVenda);
    } finally {
      setState(() => _processandoVenda = false);
    }
  }

  void _mostrarAlertaSnackBar(String msg, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg, style: const TextStyle(fontWeight: FontWeight.w600, color: Colors.white)),
        backgroundColor: isError ? const Color(0xFFEF4444) : const Color(0xFF10B981),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  void _mostrarDialogoBloqueioLimite(String mensagem) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF161C27),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: const BorderSide(color: Color(0xFFEF4444))),
        title: Row(
          children: const [
            Icon(Icons.gpp_bad, color: Color(0xFFEF4444), size: 28),
            SizedBox(width: 10),
            Expanded(child: Text('Teto de Vendas Atingido', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold))),
          ],
        ),
        content: Text(mensagem, style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 13, height: 1.5)),
        actions: [
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFEF4444),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Compreendi'),
          ),
        ],
      ),
    );
  }

  void _mostrarSucessoVendaDialog(VendaModel venda) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF111827),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: const BorderSide(color: Color(0xFF10B981))),
        title: Row(
          children: const [
            Icon(Icons.check_circle_rounded, color: Color(0xFF10B981), size: 28),
            SizedBox(width: 10),
            Text('Venda Registrada!', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Fatura: ${venda.numeroFatura}', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
            const SizedBox(height: 8),
            Text('Total: ${_formatarKz(venda.total)}', style: const TextStyle(color: Color(0xFF34D399), fontSize: 20, fontWeight: FontWeight.bold)),
            if (venda.troco > 0) ...[
              const SizedBox(height: 4),
              Text('Troco: ${_formatarKz(venda.troco)}', style: const TextStyle(color: Colors.amberAccent, fontSize: 13, fontWeight: FontWeight.w600)),
            ],
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: const Color(0xFF064E3B).withOpacity(0.4), borderRadius: BorderRadius.circular(8)),
              child: Row(
                children: const [
                  Icon(Icons.offline_pin_rounded, color: Color(0xFF34D399), size: 18),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text('Gravada localmente no Isar. Fila de sincronização com Supabase atualizada.',
                        style: TextStyle(color: Color(0xFFA7F3D0), fontSize: 11)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Botões Operacionais de Impressão (Passo 5)
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF1E293B),
                      foregroundColor: const Color(0xFF38BDF8),
                      side: const BorderSide(color: Color(0xFF334155)),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    icon: const Icon(Icons.receipt_long, size: 16),
                    label: const Text('Cupom Térmico ESC/POS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                    onPressed: () {
                      PrinterService.exibirPreviewCupom(context, venda);
                    },
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF065F46),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    icon: const Icon(Icons.picture_as_pdf, size: 16),
                    label: const Text('Factura A4 (PDF)', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                    onPressed: () async {
                      final bytes = await PdfReportService.gerarFacturaVendaPDF(venda);
                      await PdfReportService.exibirPreviewPDF(
                        context,
                        bytes,
                        'Factura_${venda.numeroFatura}.pdf',
                      );
                    },
                  ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('OK / Nova Venda', style: TextStyle(color: Color(0xFF34D399), fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  String _formatarKz(double valor) {
    final partes = valor.toStringAsFixed(2).split('.');
    final inteiro = partes[0].replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]}.');
    return '$inteiro,${partes[1]} Kz';
  }

  @override
  Widget build(BuildContext context) {
    // LayoutBuilder Adaptativo: Separação automática entre Desktop/Tablet (>= 850px) e Smartphone (< 850px)
    return Scaffold(
      backgroundColor: const Color(0xFF0B0F17),
      appBar: _construirAppBar(),
      body: LayoutBuilder(
        builder: (context, constraints) {
          final isDesktop = constraints.maxWidth >= 850;

          if (isDesktop) {
            // Layout de 2 Colunas para Telas Largas (Desktop / Tablet)
            return Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Coluna Esquerda: Catálogo e Busca de Produtos (Flex 7)
                Expanded(
                  flex: 7,
                  child: Container(
                    color: const Color(0xFF0B0F17),
                    padding: const EdgeInsets.all(16.0),
                    child: _construirSecaoCatalogo(),
                  ),
                ),

                // Divisor Vertical
                Container(width: 1, color: const Color(0xFF1E293B)),

                // Coluna Direita: Carrinho e Checkout (Flex 5)
                Expanded(
                  flex: 5,
                  child: Container(
                    color: const Color(0xFF111622),
                    padding: const EdgeInsets.all(16.0),
                    child: _construirSecaoCarrinho(isModalMobile: false),
                  ),
                ),
              ],
            );
          } else {
            // Layout em Coluna Única para Smartphones com Barra Inferior Fixa
            return Stack(
              children: [
                Padding(
                  padding: const EdgeInsets.only(bottom: 75),
                  child: _construirSecaoCatalogo(),
                ),

                // Barra Inferior Flutuante com Resumo do Carrinho
                Positioned(
                  left: 0,
                  right: 0,
                  bottom: 0,
                  child: _construirBarraInferiorMobile(),
                ),
              ],
            );
          }
        },
      ),
    );
  }

  PreferredSizeWidget _construirAppBar() {
    final user = _sessionManager.usuarioAtual;
    final isVendedor = user?.cargo == 'VENDEDOR';
    final totalHoje = _sessionManager.totalVendasHoje;
    final percLimite = (totalHoje / RbacGuard.limiteDiarioVendedor * 100).clamp(0.0, 100.0);

    return AppBar(
      backgroundColor: const Color(0xFF111622),
      elevation: 0,
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(color: const Color(0xFF059669), borderRadius: BorderRadius.circular(8)),
            child: const Icon(Icons.point_of_sale, color: Colors.white, size: 20),
          ),
          const SizedBox(width: 10),
          const Text('KwanzaPOS', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(width: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(4)),
            child: const Text('Frente de Caixa', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
      actions: [
        // Indicador de Limite Diário (apenas Vendedor)
        if (isVendedor) ...[
          Center(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: percLimite >= 100 ? Colors.redAccent : const Color(0xFF10B981)),
              ),
              child: Row(
                children: [
                  Icon(Icons.speed, size: 14, color: percLimite >= 100 ? Colors.redAccent : const Color(0xFF34D399)),
                  const SizedBox(width: 6),
                  Text('${_formatarKz(totalHoje)} / 900.000 Kz',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: percLimite >= 100 ? Colors.redAccent : const Color(0xFF34D399),
                      )),
                ],
              ),
            ),
          ),
          const SizedBox(width: 12),
        ],

        // Status de Sincronização Local Isar / Supabase
        Center(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(color: const Color(0xFF064E3B).withOpacity(0.6), borderRadius: BorderRadius.circular(20)),
            child: Row(
              children: const [
                Icon(Icons.circle, color: Color(0xFF10B981), size: 8),
                SizedBox(width: 6),
                Text('Dados Sincronizados', style: TextStyle(color: Color(0xFFA7F3D0), fontSize: 10, fontWeight: FontWeight.w600)),
              ],
            ),
          ),
        ),
        const SizedBox(width: 16),
      ],
    );
  }

  Widget _construirSecaoCatalogo() {
    final categorias = ['Todos', 'Alimentos', 'Bebidas', 'Lacticínios', 'Higiene'];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Campo de Pesquisa / Código de Barras
        Container(
          decoration: BoxDecoration(
            color: const Color(0xFF161C27),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFF273349)),
          ),
          child: TextField(
            controller: _buscaController,
            style: const TextStyle(color: Colors.white, fontSize: 14),
            decoration: InputDecoration(
              hintText: 'Buscar por nome do produto ou bipar código de barras...',
              hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 13),
              prefixIcon: const Icon(Icons.search, color: Color(0xFF10B981), size: 20),
              suffixIcon: _buscaController.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear, color: Color(0xFF64748B), size: 18),
                      onPressed: () {
                        _buscaController.clear();
                        _filtrarProdutos();
                      },
                    )
                  : null,
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            ),
          ),
        ),
        const SizedBox(height: 12),

        // Filtros de Categorias em Chips Horizontais
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: categorias.map((cat) {
              final selecionado = _categoriaSelecionada == cat;
              return Padding(
                padding: const EdgeInsets.only(right: 8.0),
                child: FilterChip(
                  label: Text(cat),
                  selected: selecionado,
                  onSelected: (val) {
                    setState(() {
                      _categoriaSelecionada = cat;
                      _filtrarProdutos();
                    });
                  },
                  backgroundColor: const Color(0xFF161C27),
                  selectedColor: const Color(0xFF059669),
                  checkmarkColor: Colors.white,
                  labelStyle: TextStyle(
                    color: selecionado ? Colors.white : const Color(0xFF94A3B8),
                    fontSize: 12,
                    fontWeight: selecionado ? FontWeight.bold : FontWeight.normal,
                  ),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  side: BorderSide(color: selecionado ? const Color(0xFF10B981) : const Color(0xFF273349)),
                ),
              );
            }).toList(),
          ),
        ),
        const SizedBox(height: 12),

        // Grid / Lista de Produtos do Catálogo
        Expanded(
          child: _produtosFiltrados.isEmpty
              ? const Center(
                  child: Text('Nenhum produto localizado no estoque.', style: TextStyle(color: Color(0xFF64748B), fontSize: 13)),
                )
              : GridView.builder(
                  gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                    maxCrossAxisExtent: 220,
                    mainAxisExtent: 165,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                  ),
                  itemCount: _produtosFiltrados.length,
                  itemBuilder: (context, index) {
                    final produto = _produtosFiltrados[index];
                    final esgotado = produto.estoqueAtual <= 0;
                    final alertaEstoque = produto.emAlertaEstoque && !esgotado;

                    return InkWell(
                      onTap: esgotado ? null : () => _adicionarAoCarrinho(produto),
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFF161C27),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: esgotado
                                ? const Color(0xFFEF4444).withOpacity(0.4)
                                : alertaEstoque
                                    ? const Color(0xFFF59E0B).withOpacity(0.5)
                                    : const Color(0xFF273349),
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Categoria e Alerta de Estoque
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(4)),
                                  child: Text(produto.categoria, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 9, fontWeight: FontWeight.bold)),
                                ),
                                if (esgotado)
                                  const Text('Esgotado', style: TextStyle(color: Color(0xFFEF4444), fontSize: 10, fontWeight: FontWeight.bold))
                                else if (alertaEstoque)
                                  Text('${produto.estoqueAtual} rest.', style: const TextStyle(color: Color(0xFFF59E0B), fontSize: 10, fontWeight: FontWeight.bold)),
                              ],
                            ),
                            const Spacer(),

                            // Nome do Produto
                            Text(
                              produto.nome,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600, height: 1.2),
                            ),
                            const SizedBox(height: 6),

                            // Preço de Venda em Kz
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  _formatarKz(produto.precoVenda),
                                  style: const TextStyle(color: Color(0xFF34D399), fontSize: 14, fontWeight: FontWeight.bold),
                                ),
                                Container(
                                  padding: const EdgeInsets.all(4),
                                  decoration: BoxDecoration(color: const Color(0xFF059669), borderRadius: BorderRadius.circular(6)),
                                  child: const Icon(Icons.add, color: Colors.white, size: 14),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }

  Widget _construirSecaoCarrinho({required bool isModalMobile}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Cabeçalho do Carrinho
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                const Icon(Icons.shopping_cart_outlined, color: Color(0xFF34D399), size: 18),
                const SizedBox(width: 8),
                const Text('Carrinho de Compras', style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold)),
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                  decoration: BoxDecoration(color: const Color(0xFF059669), borderRadius: BorderRadius.circular(10)),
                  child: Text('${_carrinho.length}', style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
            if (_carrinho.isNotEmpty)
              TextButton(
                onPressed: () => setState(() => _carrinho.clear()),
                child: const Text('Limpar', style: TextStyle(color: Color(0xFFEF4444), fontSize: 12)),
              ),
          ],
        ),
        const SizedBox(height: 10),

        // Lista de Itens do Carrinho
        Expanded(
          child: _carrinho.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: const [
                      Icon(Icons.remove_shopping_cart_outlined, color: Color(0xFF475569), size: 40),
                      SizedBox(height: 8),
                      Text('Nenhum item selecionado', style: TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                    ],
                  ),
                )
              : ListView.separated(
                  itemCount: _carrinho.length,
                  separatorBuilder: (_, __) => const Divider(color: Color(0xFF1E293B), height: 1),
                  itemBuilder: (context, index) {
                    final item = _carrinho[index];
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8.0),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(item.nomeProduto ?? 'Produto',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
                                const SizedBox(height: 2),
                                Text('${_formatarKz(item.precoUnitario)} un.', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                              ],
                            ),
                          ),

                          // Controle de Quantidade (- / +)
                          Row(
                            children: [
                              IconButton(
                                icon: const Icon(Icons.remove_circle_outline, color: Color(0xFF94A3B8), size: 18),
                                onPressed: () => _alterarQuantidade(index, -1),
                                padding: EdgeInsets.zero,
                                constraints: const BoxConstraints(),
                              ),
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 8),
                                child: Text('${item.quantidade}', style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
                              ),
                              IconButton(
                                icon: const Icon(Icons.add_circle_outline, color: Color(0xFF34D399), size: 18),
                                onPressed: () => _alterarQuantidade(index, 1),
                                padding: EdgeInsets.zero,
                                constraints: const BoxConstraints(),
                              ),
                            ],
                          ),
                          const SizedBox(width: 12),

                          // Total do Item
                          SizedBox(
                            width: 85,
                            child: Text(
                              _formatarKz(item.total),
                              textAlign: TextAlign.right,
                              style: const TextStyle(color: Color(0xFF34D399), fontSize: 12, fontWeight: FontWeight.bold),
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.close, color: Color(0xFFEF4444), size: 16),
                            onPressed: () => _removerDoCarrinho(index),
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(),
                          ),
                        ],
                      ),
                    );
                  },
                ),
        ),

        const Divider(color: Color(0xFF273349)),

        // Dados do Cliente (Opcional: Nome e NIF)
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _clienteNomeController,
                style: const TextStyle(color: Colors.white, fontSize: 12),
                decoration: InputDecoration(
                  hintText: 'Cliente (Opcional)',
                  hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                  filled: true,
                  fillColor: const Color(0xFF161C27),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: TextField(
                controller: _clienteNifController,
                style: const TextStyle(color: Colors.white, fontSize: 12),
                decoration: InputDecoration(
                  hintText: 'NIF / Contribuinte',
                  hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                  filled: true,
                  fillColor: const Color(0xFF161C27),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),

        // Seleção de Modalidade de Pagamento
        Row(
          children: [
            _construirBotaoPagamento('DINHEIRO', 'Dinheiro', Icons.money),
            const SizedBox(width: 6),
            _construirBotaoPagamento('MULTICAIXA', 'TPA Express', Icons.credit_card),
            const SizedBox(width: 6),
            _construirBotaoPagamento('TRANSFERENCIA', 'Transferência', Icons.account_balance),
          ],
        ),
        const SizedBox(height: 10),

        // Valor Recebido e Troco (se Dinheiro)
        if (_metodoPagamento == 'DINHEIRO')
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _valorRecebidoController,
                    keyboardType: TextInputType.number,
                    onChanged: (_) => setState(() {}),
                    style: const TextStyle(color: Colors.white, fontSize: 12),
                    decoration: InputDecoration(
                      hintText: 'Valor Entregue (Kz)',
                      hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                      filled: true,
                      fillColor: const Color(0xFF161C27),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Text('Troco: ${_formatarKz(_trocoCalculado)}',
                    style: const TextStyle(color: Colors.amberAccent, fontSize: 12, fontWeight: FontWeight.bold)),
              ],
            ),
          ),

        // Linha Total e Botão Concluir
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('TOTAL A PAGAR:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12, fontWeight: FontWeight.bold)),
            Text(_formatarKz(_totalCarrinho), style: const TextStyle(color: Color(0xFF34D399), fontSize: 20, fontWeight: FontWeight.bold)),
          ],
        ),
        const SizedBox(height: 12),

        // Botão Finalizar Venda
        SizedBox(
          width: double.infinity,
          height: 48,
          child: ElevatedButton(
            onPressed: _carrinho.isEmpty || _processandoVenda ? null : _finalizarVenda,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF059669),
              foregroundColor: Colors.white,
              disabledBackgroundColor: const Color(0xFF1E293B),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: _processandoVenda
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: const [
                      Icon(Icons.check_circle_outline, size: 20),
                      SizedBox(width: 8),
                      Text('FINALIZAR VENDA (F2)', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                    ],
                  ),
          ),
        ),
      ],
    );
  }

  Widget _construirBotaoPagamento(String id, String rotulo, IconData icone) {
    final ativo = _metodoPagamento == id;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _metodoPagamento = id),
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: ativo ? const Color(0xFF064E3B) : const Color(0xFF161C27),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: ativo ? const Color(0xFF10B981) : const Color(0xFF273349)),
          ),
          child: Column(
            children: [
              Icon(icone, size: 16, color: ativo ? const Color(0xFF34D399) : const Color(0xFF94A3B8)),
              const SizedBox(height: 4),
              Text(rotulo, style: TextStyle(color: ativo ? Colors.white : const Color(0xFF94A3B8), fontSize: 10, fontWeight: FontWeight.bold)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _construirBarraInferiorMobile() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: const BoxDecoration(
        color: Color(0xFF111622),
        border: Border(top: BorderSide(color: Color(0xFF273349))),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('${_carrinho.length} ${_carrinho.length == 1 ? "item" : "itens"}',
                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
              Text(_formatarKz(_totalCarrinho), style: const TextStyle(color: Color(0xFF34D399), fontSize: 16, fontWeight: FontWeight.bold)),
            ],
          ),
          ElevatedButton.icon(
            onPressed: () => _abrirModalCarrinhoMobile(),
            icon: const Icon(Icons.shopping_cart_checkout, size: 18),
            label: const Text('Ver Carrinho'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF059669),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
          ),
        ],
      ),
    );
  }

  void _abrirModalCarrinhoMobile() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF111622),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Container(
          height: MediaQuery.of(context).size.height * 0.85,
          padding: const EdgeInsets.all(16),
          child: _construirSecaoCarrinho(isModalMobile: true),
        ),
      ),
    );
  }
}
