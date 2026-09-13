import 'package:flutter/material.dart';
import '../../core/auth/rbac_guard.dart';
import '../../core/auth/session_manager.dart';
import '../../core/auth/user_role.dart';
import '../../data/models/movimentacao_estoque_model.dart';
import '../../data/models/produto_model.dart';

/// Tela de Controle de Estoque com Alerta Visual Pulsante em Vermelho e RBAC Restrito (Gerente e Admin)
class EstoqueScreen extends StatefulWidget {
  const EstoqueScreen({Key? key}) : super(key: key);

  @override
  State<EstoqueScreen> createState() => _EstoqueScreenState();
}

class _EstoqueScreenState extends State<EstoqueScreen> with SingleTickerProviderStateMixin {
  final SessionManager _sessionManager = SessionManager();
  final TextEditingController _buscaController = TextEditingController();

  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  List<ProdutoModel> _produtos = [];
  List<ProdutoModel> _produtosFiltrados = [];
  String _filtroStatus = 'TODOS'; // 'TODOS' | 'CRITICO' | 'NORMAL'
  bool _somenteCriticos = false;

  @override
  void initState() {
    super.initState();

    // Configuração do efeito de pulsação visual para estoque crítico
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 0.35, end: 1.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    _carregarEstoque();
    _buscaController.addListener(_aplicarFiltros);
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _buscaController.dispose();
    super.dispose();
  }

  void _carregarEstoque() {
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
        estoqueAtual: 7,
        estoqueMinimo: 10, // CRÍTICO
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
        estoqueAtual: 3,
        estoqueMinimo: 8, // CRÍTICO
        unidade: 'lata',
      ),
      ProdutoModel.criarLocal(
        supabaseId: 'prod-006',
        nome: 'Massa Esparguete 500g',
        codigoBarras: '560123456794',
        categoria: 'Alimentos',
        precoVenda: 850.0,
        precoCusto: 620.0,
        estoqueAtual: 2,
        estoqueMinimo: 15, // CRÍTICO
        unidade: 'pct',
      ),
      ProdutoModel.criarLocal(
        supabaseId: 'prod-007',
        nome: 'Sabão Azul em Barra 1Kg',
        codigoBarras: '560123456795',
        categoria: 'Higiene',
        precoVenda: 1400.0,
        precoCusto: 1000.0,
        estoqueAtual: 0,
        estoqueMinimo: 5, // ESGOTADO
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
    _aplicarFiltros();
  }

  void _aplicarFiltros() {
    final query = _buscaController.text.trim().toLowerCase();
    setState(() {
      _produtosFiltrados = _produtos.where((p) {
        final matchesBusca = p.nome.toLowerCase().contains(query) ||
            (p.codigoBarras != null && p.codigoBarras!.contains(query)) ||
            p.categoria.toLowerCase().contains(query);

        final isCritico = p.estoqueAtual <= p.estoqueMinimo;

        if (_filtroStatus == 'CRITICO' || _somenteCriticos) {
          return matchesBusca && isCritico;
        } else if (_filtroStatus == 'NORMAL') {
          return matchesBusca && !isCritico;
        }

        return matchesBusca;
      }).toList();
    });
  }

  void _abrirModalAjusteEstoque(ProdutoModel produto) {
    final TextEditingController qtdController = TextEditingController();
    final TextEditingController motivoController = TextEditingController();
    String tipoAjuste = 'ENTRADA'; // 'ENTRADA' | 'SAIDA' | 'AJUSTE'

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) {
          return AlertDialog(
            backgroundColor: const Color(0xFF161C27),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: const BorderSide(color: Color(0xFF273349))),
            title: Row(
              children: [
                const Icon(Icons.inventory_2_outlined, color: Color(0xFF34D399), size: 22),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Movimentar: ${produto.nome}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Estoque Atual: ${produto.estoqueAtual} ${produto.unidade} (Mínimo: ${produto.estoqueMinimo})',
                      style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                  const SizedBox(height: 16),

                  // Tipo de Movimentação
                  Row(
                    children: [
                      _buildTipoBotao(tipoAjuste, 'ENTRADA', 'Entrada (+)', Icons.add_circle, Colors.emerald, () {
                        setModalState(() => tipoAjuste = 'ENTRADA');
                      }),
                      const SizedBox(width: 8),
                      _buildTipoBotao(tipoAjuste, 'SAIDA', 'Saída (-)', Icons.remove_circle, Colors.amber, () {
                        setModalState(() => tipoAjuste = 'SAIDA');
                      }),
                      const SizedBox(width: 8),
                      _buildTipoBotao(tipoAjuste, 'AJUSTE', 'Balanço', Icons.tune, Colors.blueAccent, () {
                        setModalState(() => tipoAjuste = 'AJUSTE');
                      }),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Quantidade
                  TextField(
                    controller: qtdController,
                    keyboardType: TextInputType.number,
                    style: const TextStyle(color: Colors.white, fontSize: 13),
                    decoration: InputDecoration(
                      labelText: tipoAjuste == 'AJUSTE' ? 'Nova Quantidade Absoluta' : 'Quantidade',
                      labelStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                      filled: true,
                      fillColor: const Color(0xFF111622),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF273349))),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    ),
                  ),
                  const SizedBox(height: 10),

                  // Motivo / Observação
                  TextField(
                    controller: motivoController,
                    style: const TextStyle(color: Colors.white, fontSize: 13),
                    decoration: InputDecoration(
                      labelText: 'Motivo (Ex: Reposição, Avaria, Inventário)',
                      labelStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                      filled: true,
                      fillColor: const Color(0xFF111622),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF273349))),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    ),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Cancelar', style: TextStyle(color: Color(0xFF94A3B8))),
              ),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF059669),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                onPressed: () {
                  final qtd = int.tryParse(qtdController.text.trim()) ?? 0;
                  if (qtd <= 0 && tipoAjuste != 'AJUSTE') {
                    return;
                  }

                  final anterior = produto.estoqueAtual;
                  int novoEstoque = anterior;

                  if (tipoAjuste == 'ENTRADA') {
                    novoEstoque += qtd;
                  } else if (tipoAjuste == 'SAIDA') {
                    novoEstoque = (novoEstoque - qtd).clamp(0, 999999);
                  } else {
                    novoEstoque = qtd;
                  }

                  // Grava a movimentação localmente com sincronizado = false
                  final user = _sessionManager.usuarioAtual;
                  MovimentacaoEstoqueModel.criarLocal(
                    supabaseId: 'mov-${DateTime.now().millisecondsSinceEpoch}',
                    produtoId: produto.supabaseId,
                    tipo: tipoAjuste,
                    quantidade: qtd,
                    estoqueAnterior: anterior,
                    responsavelId: user?.supabaseId ?? 'usr-gerente',
                    responsavelNome: user?.nome ?? 'Gerente',
                    motivo: motivoController.text.trim().isEmpty ? null : motivoController.text.trim(),
                  );

                  setState(() {
                    produto.estoqueAtual = novoEstoque;
                    produto.atualizadoEm = DateTime.now().toUtc();
                    _aplicarFiltros();
                  });

                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Estoque de "${produto.nome}" atualizado para $novoEstoque ${produto.unidade}.'),
                      backgroundColor: const Color(0xFF10B981),
                    ),
                  );
                },
                child: const Text('Confirmar Ajuste'),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildTipoBotao(String selecionado, String id, String rotulo, IconData icone, Color cor, VoidCallback onTap) {
    final ativo = selecionado == id;
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: ativo ? cor.withOpacity(0.2) : const Color(0xFF111622),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: ativo ? cor : const Color(0xFF273349)),
          ),
          child: Column(
            children: [
              Icon(icone, size: 16, color: ativo ? cor : const Color(0xFF94A3B8)),
              const SizedBox(height: 2),
              Text(rotulo, style: TextStyle(color: ativo ? Colors.white : const Color(0xFF94A3B8), fontSize: 10, fontWeight: FontWeight.bold)),
            ],
          ),
        ),
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
    // 1. RBAC Guard: Restrição de Acesso estrita para Gerente e Administrador
    final podeAcessar = _sessionManager.podeGerenciarEstoque;
    if (!podeAcessar) {
      return _buildAcessoNegadoVendedor();
    }

    final itensCriticos = _produtos.where((p) => p.estoqueAtual <= p.estoqueMinimo).toList();

    return Scaffold(
      backgroundColor: const Color(0xFF0B0F17),
      appBar: AppBar(
        backgroundColor: const Color(0xFF111622),
        elevation: 0,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(color: const Color(0xFF3B82F6), borderRadius: BorderRadius.circular(8)),
              child: const Icon(Icons.inventory_2, color: Colors.white, size: 20),
            ),
            const SizedBox(width: 10),
            const Text('Controle de Estoque', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(4)),
              child: const Text('RBAC Gerente/Admin', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Banner de Alerta Crítico (se houver itens abaixo do mínimo)
            if (itensCriticos.isNotEmpty)
              AnimatedBuilder(
                animation: _pulseAnimation,
                builder: (context, child) {
                  return Container(
                    margin: const EdgeInsets.only(bottom: 16),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF7F1D1D).withOpacity(0.35 + (_pulseAnimation.value * 0.25)),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: Color.lerp(const Color(0xFFEF4444), const Color(0xFFFF6B6B), _pulseAnimation.value)!,
                        width: 1.5,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFFEF4444).withOpacity(_pulseAnimation.value * 0.3),
                          blurRadius: 10,
                          spreadRadius: 1,
                        )
                      ],
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.warning_amber_rounded,
                            color: Color.lerp(const Color(0xFFF87171), Colors.white, _pulseAnimation.value), size: 28),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${itensCriticos.length} ${itensCriticos.length == 1 ? "Produto está" : "Produtos estão"} com Estoque Crítico!',
                                style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(height: 2),
                              const Text('Itens abaixo do estoque mínimo de segurança. Reposição imediata recomendada.',
                                  style: TextStyle(color: Color(0xFFFCA5A5), fontSize: 11)),
                            ],
                          ),
                        ),
                        TextButton(
                          onPressed: () {
                            setState(() {
                              _somenteCriticos = !_somenteCriticos;
                              _filtroStatus = _somenteCriticos ? 'CRITICO' : 'TODOS';
                              _aplicarFiltros();
                            });
                          },
                          style: TextButton.styleFrom(
                            backgroundColor: const Color(0xFFEF4444).withOpacity(0.8),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          ),
                          child: Text(_somenteCriticos ? 'Ver Todos' : 'Filtrar Críticos', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                  );
                },
              ),

            // Barra de Busca e Filtros
            Row(
              children: [
                Expanded(
                  child: Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFF161C27),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFF273349)),
                    ),
                    child: TextField(
                      controller: _buscaController,
                      style: const TextStyle(color: Colors.white, fontSize: 13),
                      decoration: const InputDecoration(
                        hintText: 'Buscar por nome, categoria ou código...',
                        hintStyle: TextStyle(color: Color(0xFF64748B), fontSize: 12),
                        prefixIcon: Icon(Icons.search, color: Color(0xFF3B82F6), size: 18),
                        border: InputBorder.none,
                        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                _buildFiltroTab('TODOS', 'Todos (${_produtos.length})'),
                const SizedBox(width: 6),
                _buildFiltroTab('CRITICO', 'Críticos (${itensCriticos.length})', isCriticoBadge: true),
              ],
            ),
            const SizedBox(height: 14),

            // Tabela / Lista de Produtos com Alerta Pulsante Individual
            Expanded(
              child: _produtosFiltrados.isEmpty
                  ? const Center(
                      child: Text('Nenhum produto correspondente.', style: TextStyle(color: Color(0xFF64748B), fontSize: 13)),
                    )
                  : ListView.separated(
                      itemCount: _produtosFiltrados.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (context, index) {
                        final p = _produtosFiltrados[index];
                        final isCritico = p.estoqueAtual <= p.estoqueMinimo;
                        final isEsgotado = p.estoqueAtual <= 0;

                        if (isCritico) {
                          return AnimatedBuilder(
                            animation: _pulseAnimation,
                            builder: (context, child) {
                              return Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF161C27),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: isEsgotado
                                        ? const Color(0xFFEF4444).withOpacity(_pulseAnimation.value)
                                        : const Color(0xFFF59E0B).withOpacity(_pulseAnimation.value),
                                    width: 1.5,
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: (isEsgotado ? const Color(0xFFEF4444) : const Color(0xFFF59E0B))
                                          .withOpacity(_pulseAnimation.value * 0.18),
                                      blurRadius: 8,
                                    ),
                                  ],
                                ),
                                child: _buildLinhaProduto(p, isCritico, isEsgotado),
                              );
                            },
                          );
                        }

                        return Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFF161C27),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFF273349)),
                          ),
                          child: _buildLinhaProduto(p, false, false),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLinhaProduto(ProdutoModel p, bool isCritico, bool isEsgotado) {
    return Row(
      children: [
        // Ícone de Status do Estoque
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: isEsgotado
                ? const Color(0xFFEF4444).withOpacity(0.15)
                : isCritico
                    ? const Color(0xFFF59E0B).withOpacity(0.15)
                    : const Color(0xFF10B981).withOpacity(0.15),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(
            isEsgotado
                ? Icons.error_outline
                : isCritico
                    ? Icons.warning_amber_rounded
                    : Icons.check_circle_outline,
            color: isEsgotado
                ? const Color(0xFFEF4444)
                : isCritico
                    ? const Color(0xFFF59E0B)
                    : const Color(0xFF10B981),
            size: 22,
          ),
        ),
        const SizedBox(width: 12),

        // Dados do Produto
        Expanded(
          flex: 4,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(p.nome,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
              const SizedBox(height: 2),
              Row(
                children: [
                  Text(p.categoria, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                  if (p.codigoBarras != null) ...[
                    const Text(' • ', style: TextStyle(color: Color(0xFF475569))),
                    Text(p.codigoBarras!, style: const TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                  ],
                ],
              ),
            ],
          ),
        ),

        // Indicador de Estoque Atual vs Mínimo
        Expanded(
          flex: 3,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    '${p.estoqueAtual} ${p.unidade}',
                    style: TextStyle(
                      color: isEsgotado
                          ? const Color(0xFFEF4444)
                          : isCritico
                              ? const Color(0xFFF59E0B)
                              : Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              Text(
                'Mínimo: ${p.estoqueMinimo} ${p.unidade}',
                style: const TextStyle(color: Color(0xFF64748B), fontSize: 10),
              ),
            ],
          ),
        ),
        const SizedBox(width: 14),

        // Preço de Custo (Visível apenas para Gerente/Admin pelo RBAC)
        if (_sessionManager.podeVerPrecoCusto)
          Expanded(
            flex: 3,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(_formatarKz(p.precoVenda), style: const TextStyle(color: Color(0xFF34D399), fontSize: 12, fontWeight: FontWeight.bold)),
                Text('Custo: ${_formatarKz(p.precoCusto)}', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10)),
              ],
            ),
          ),

        const SizedBox(width: 8),

        // Botão de Ajuste
        ElevatedButton.icon(
          onPressed: () => _abrirModalAjusteEstoque(p),
          icon: const Icon(Icons.tune, size: 14),
          label: const Text('Ajustar', style: TextStyle(fontSize: 11)),
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF1E293B),
            foregroundColor: const Color(0xFF38BDF8),
            side: const BorderSide(color: Color(0xFF334155)),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          ),
        ),
      ],
    );
  }

  Widget _buildFiltroTab(String id, String label, {bool isCriticoBadge = false}) {
    final ativo = _filtroStatus == id;
    return InkWell(
      onTap: () {
        setState(() {
          _filtroStatus = id;
          _somenteCriticos = id == 'CRITICO';
          _aplicarFiltros();
        });
      },
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: ativo
              ? (isCriticoBadge ? const Color(0xFFEF4444).withOpacity(0.25) : const Color(0xFF059669).withOpacity(0.25))
              : const Color(0xFF161C27),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: ativo
                ? (isCriticoBadge ? const Color(0xFFEF4444) : const Color(0xFF10B981))
                : const Color(0xFF273349),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: ativo ? Colors.white : const Color(0xFF94A3B8),
            fontSize: 11,
            fontWeight: ativo ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ),
    );
  }

  Widget _buildAcessoNegadoVendedor() {
    return Scaffold(
      backgroundColor: const Color(0xFF0B0F17),
      body: Center(
        child: Container(
          maxWidth: 420,
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: const Color(0xFF161C27),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFEF4444)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: const [
              Icon(Icons.lock_outline, color: Color(0xFFEF4444), size: 48),
              SizedBox(height: 14),
              Text(
                'Acesso Restrito pelo RBAC Guard',
                style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 8),
              Text(
                'O perfil VENDEDOR possui acesso exclusivo à Frente de Caixa (PDV). Os relatórios e alterações de estoque são restritos a Gerentes e Administradores.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12, height: 1.5),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
