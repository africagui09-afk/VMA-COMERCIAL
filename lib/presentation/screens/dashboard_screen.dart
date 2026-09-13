import 'package:flutter/material.dart';
import '../../core/auth/session_manager.dart';
import '../../data/models/despesa_model.dart';
import '../../data/models/produto_model.dart';
import '../../data/services/printing/printing.dart';

/// Tela de Dashboard Analítico Financeiro com Resumo de Vendas, Custos, Lucro Líquido e Gestão de Despesas
class DashboardScreen extends StatefulWidget {
  const DashboardScreen({Key? key}) : super(key: key);

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final SessionManager _sessionManager = SessionManager();

  final TextEditingController _descDespesaController = TextEditingController();
  final TextEditingController _valorDespesaController = TextEditingController();
  String _categoriaDespesa = 'VARIAVEL'; // 'FIXA' | 'VARIAVEL' | 'SALARIO' | 'PERDA'
  bool _salvandoDespesa = false;

  // Métricas financeiras consolidadas (demonstração e cálculo reativo)
  double _totalVendido = 485900.0;
  double _totalCusto = 328400.0;
  List<DespesaModel> _despesas = [];

  @override
  void initState() {
    super.initState();
    _carregarDespesasIniciais();
  }

  @override
  void dispose() {
    _descDespesaController.dispose();
    _valorDespesaController.dispose();
    super.dispose();
  }

  void _carregarDespesasIniciais() {
    final now = DateTime.now().toUtc();
    _despesas = [
      DespesaModel.criarLocal(
        supabaseId: 'desp-001',
        descricao: 'Energia Elétrica (ENDE) - Mensal',
        categoria: 'FIXA',
        valor: 35000.0,
        data: now.subtract(const Duration(days: 2)),
        registradoPor: 'Gerente Operacional',
      ),
      DespesaModel.criarLocal(
        supabaseId: 'desp-002',
        descricao: 'Sacos Plásticos e Bobinas Térmicas',
        categoria: 'VARIAVEL',
        valor: 12500.0,
        data: now.subtract(const Duration(days: 1)),
        registradoPor: 'Gerente Operacional',
      ),
      DespesaModel.criarLocal(
        supabaseId: 'desp-003',
        descricao: 'Água Canalizada (EPAL)',
        categoria: 'FIXA',
        valor: 8500.0,
        data: now.subtract(const Duration(hours: 12)),
        registradoPor: 'Administrador Geral',
      ),
      DespesaModel.criarLocal(
        supabaseId: 'desp-004',
        descricao: 'Avaria em 2 latas de leite (Vencimento)',
        categoria: 'PERDA',
        valor: 7800.0,
        data: now.subtract(const Duration(hours: 4)),
        registradoPor: 'Gerente Operacional',
      ),
    ];
  }

  double get _totalDespesas => _despesas.fold(0.0, (acc, item) => acc + item.valor);
  double get _lucroBruto => _totalVendido - _totalCusto;
  double get _lucroLiquido => _lucroBruto - _totalDespesas;
  double get _margemLucroLiquida => _totalVendido > 0 ? (_lucroLiquido / _totalVendido * 100) : 0.0;

  void _adicionarDespesa() {
    final desc = _descDespesaController.text.trim();
    final valor = double.tryParse(_valorDespesaController.text.replaceAll(',', '.')) ?? 0.0;

    if (desc.isEmpty) {
      _mostrarSnackBar('Informe a descrição da despesa.', isError: true);
      return;
    }
    if (valor <= 0) {
      _mostrarSnackBar('Informe um valor válido maior que zero.', isError: true);
      return;
    }

    setState(() => _salvandoDespesa = true);

    try {
      final user = _sessionManager.usuarioAtual;
      final novaDespesa = DespesaModel.criarLocal(
        supabaseId: 'desp-${DateTime.now().millisecondsSinceEpoch}',
        descricao: desc,
        categoria: _categoriaDespesa,
        valor: valor,
        data: DateTime.now().toUtc(),
        registradoPor: user?.nome ?? 'Gerente',
      );

      setState(() {
        _despesas.insert(0, novaDespesa);
        _descDespesaController.clear();
        _valorDespesaController.clear();
        _categoriaDespesa = 'VARIAVEL';
      });

      _mostrarSnackBar('Despesa de ${_formatarKz(valor)} registrada com sucesso!');
    } finally {
      setState(() => _salvandoDespesa = false);
    }
  }

  void _removerDespesa(int index) {
    final removida = _despesas[index];
    setState(() {
      _despesas.removeAt(index);
    });
    _mostrarSnackBar('Despesa "${removida.descricao}" removida.');
  }

  void _mostrarSnackBar(String msg, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg, style: const TextStyle(fontWeight: FontWeight.w600, color: Colors.white)),
        backgroundColor: isError ? const Color(0xFFEF4444) : const Color(0xFF10B981),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  String _formatarKz(double valor) {
    final partes = valor.toStringAsFixed(2).split('.');
    final inteiro = partes[0].replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]}.');
    return '$inteiro,${partes[1]} Kz';
  }

  Future<void> _exportarRelatorioPDF() async {
    try {
      final user = _sessionManager.usuarioAtual;
      final responsavel = '${user?.nome ?? "Gerente Operacional"} (${_sessionManager.cargoAtual.valorBanco})';

      // Dados de demonstração do catálogo para compor a tabela de inventário do relatório
      final produtos = [
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
          estoqueMinimo: 10,
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
          supabaseId: 'prod-005',
          nome: 'Leite em Pó Integral Ninho 400g',
          codigoBarras: '560123456793',
          categoria: 'Lacticínios',
          precoVenda: 4850.0,
          precoCusto: 3900.0,
          estoqueAtual: 3,
          estoqueMinimo: 8,
          unidade: 'lata',
        ),
      ];

      final pdfBytes = await PdfReportService.gerarRelatorioPDF(
        totalVendido: _totalVendido,
        totalCusto: _totalCusto,
        totalDespesas: _totalDespesas,
        lucroLiquido: _lucroLiquido,
        despesas: _despesas,
        produtos: produtos,
        emitidoPor: responsavel,
      );

      await PdfReportService.exibirPreviewPDF(
        context,
        pdfBytes,
        'Relatorio_Gerencial_VMA_Comercial.pdf',
      );
    } catch (e) {
      _mostrarSnackBar('Erro ao gerar relatório PDF: $e', isError: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    // 1. RBAC Guard: Restrição para Vendedor (Apenas Gerente e Administrador podem ver relatórios financeiros)
    final podeVer = _sessionManager.podeAcessarRelatorios;
    if (!podeVer) {
      return _buildAcessoNegadoVendedor();
    }

    return Scaffold(
      backgroundColor: const Color(0xFF0B0F17),
      appBar: AppBar(
        backgroundColor: const Color(0xFF111622),
        elevation: 0,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(color: const Color(0xFF059669), borderRadius: BorderRadius.circular(8)),
              child: const Icon(Icons.analytics_outlined, color: Colors.white, size: 20),
            ),
            const SizedBox(width: 10),
            const Text('Dashboard Analítico', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(4)),
              child: const Text('Financeiro & DRE', style: TextStyle(color: Color(0xFF34D399), fontSize: 10, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12.0),
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF059669),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              icon: const Icon(Icons.picture_as_pdf, size: 16),
              label: const Text('Exportar PDF A4', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
              onPressed: _exportarRelatorioPDF,
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Linha com os 4 Blocos de Resumo Financeiro
            LayoutBuilder(
              builder: (context, constraints) {
                final isWide = constraints.maxWidth >= 720;
                return GridView.count(
                  crossAxisCount: isWide ? 4 : 2,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  childAspectRatio: isWide ? 1.6 : 1.35,
                  children: [
                    _buildCartaoResumo(
                      titulo: 'Total Vendido',
                      valor: _totalVendido,
                      icone: Icons.point_of_sale,
                      corIcone: const Color(0xFF10B981),
                      corFundoIcone: const Color(0xFF064E3B).withOpacity(0.4),
                      subtitulo: 'Receita Bruta Acumulada',
                    ),
                    _buildCartaoResumo(
                      titulo: 'Total Custo',
                      valor: _totalCusto,
                      icone: Icons.inventory_2_outlined,
                      corIcone: const Color(0xFF60A5FA),
                      corFundoIcone: const Color(0xFF1E3A8A).withOpacity(0.4),
                      subtitulo: 'CMV (Custo Mercadorias)',
                    ),
                    _buildCartaoResumo(
                      titulo: 'Despesas Totais',
                      valor: _totalDespesas,
                      icone: Icons.money_off_csred_outlined,
                      corIcone: const Color(0xFFF87171),
                      corFundoIcone: const Color(0xFF7F1D1D).withOpacity(0.4),
                      subtitulo: '${_despesas.length} lançamentos hoje',
                    ),
                    _buildCartaoResumo(
                      titulo: 'Lucro Líquido Real',
                      valor: _lucroLiquido,
                      icone: Icons.account_balance_wallet,
                      corIcone: _lucroLiquido >= 0 ? const Color(0xFF34D399) : const Color(0xFFEF4444),
                      corFundoIcone: const Color(0xFF064E3B).withOpacity(0.4),
                      subtitulo: 'Margem Líquida: ${_margemLucroLiquida.toStringAsFixed(1)}%',
                      destacado: true,
                    ),
                  ],
                );
              },
            ),
            const SizedBox(height: 20),

            // Divisão em 2 Painéis: Registrar Despesa à esquerda e Extrato à direita
            LayoutBuilder(
              builder: (context, constraints) {
                final isWide = constraints.maxWidth >= 850;
                if (isWide) {
                  return Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Formulário de Nova Despesa (Flex 4)
                      Expanded(
                        flex: 4,
                        child: _buildPainelFormularioDespesa(),
                      ),
                      const SizedBox(width: 16),
                      // Tabela de Despesas Lançadas (Flex 6)
                      Expanded(
                        flex: 6,
                        child: _buildPainelExtratoDespesas(),
                      ),
                    ],
                  );
                } else {
                  return Column(
                    children: [
                      _buildPainelFormularioDespesa(),
                      const SizedBox(height: 16),
                      _buildPainelExtratoDespesas(),
                    ],
                  );
                }
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCartaoResumo({
    required String titulo,
    required double valor,
    required IconData icone,
    required Color corIcone,
    required Color corFundoIcone,
    required String subtitulo,
    bool destacado = false,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF161C27),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: destacado ? const Color(0xFF059669) : const Color(0xFF273349),
          width: destacado ? 1.5 : 1.0,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(titulo, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontWeight: FontWeight.bold)),
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(color: corFundoIcone, borderRadius: BorderRadius.circular(8)),
                child: Icon(icone, color: corIcone, size: 16),
              ),
            ],
          ),
          Text(
            _formatarKz(valor),
            style: TextStyle(
              color: destacado ? const Color(0xFF34D399) : Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          Text(subtitulo, style: const TextStyle(color: Color(0xFF64748B), fontSize: 10)),
        ],
      ),
    );
  }

  Widget _buildPainelFormularioDespesa() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF161C27),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF273349)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: const [
              Icon(Icons.post_add, color: Color(0xFF38BDF8), size: 20),
              SizedBox(width: 8),
              Text('Lançar Nova Despesa', style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 12),

          // Descrição
          TextField(
            controller: _descDespesaController,
            style: const TextStyle(color: Colors.white, fontSize: 13),
            decoration: InputDecoration(
              labelText: 'Descrição da Despesa',
              labelStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
              hintText: 'Ex: Conta de Luz, Combustível, Avaria',
              hintStyle: const TextStyle(color: Color(0xFF475569), fontSize: 11),
              filled: true,
              fillColor: const Color(0xFF111622),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            ),
          ),
          const SizedBox(height: 10),

          // Categoria
          Row(
            children: [
              _buildOpcaoCategoria('FIXA', 'Fixa (Luz/Água)'),
              const SizedBox(width: 6),
              _buildOpcaoCategoria('VARIAVEL', 'Variável'),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              _buildOpcaoCategoria('SALARIO', 'Salário/Adiant.'),
              const SizedBox(width: 6),
              _buildOpcaoCategoria('PERDA', 'Quebra/Perda'),
            ],
          ),
          const SizedBox(height: 10),

          // Valor em Kwanza
          TextField(
            controller: _valorDespesaController,
            keyboardType: TextInputType.number,
            style: const TextStyle(color: Colors.white, fontSize: 13),
            decoration: InputDecoration(
              labelText: 'Valor da Despesa (Kz)',
              labelStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
              hintText: 'Ex: 15.000',
              hintStyle: const TextStyle(color: Color(0xFF475569), fontSize: 11),
              filled: true,
              fillColor: const Color(0xFF111622),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            ),
          ),
          const SizedBox(height: 14),

          // Botão Gravar
          SizedBox(
            width: double.infinity,
            height: 42,
            child: ElevatedButton.icon(
              onPressed: _salvandoDespesa ? null : _adicionarDespesa,
              icon: const Icon(Icons.check, size: 16),
              label: const Text('Registrar Despesa Local', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF059669),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOpcaoCategoria(String id, String label) {
    final selecionada = _categoriaDespesa == id;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _categoriaDespesa = id),
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: selecionada ? const Color(0xFF064E3B) : const Color(0xFF111622),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: selecionada ? const Color(0xFF10B981) : const Color(0xFF273349),
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              color: selecionada ? Colors.white : const Color(0xFF94A3B8),
              fontSize: 10,
              fontWeight: selecionada ? FontWeight.bold : FontWeight.normal,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPainelExtratoDespesas() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF161C27),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF273349)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: const [
                  Icon(Icons.receipt_long, color: Color(0xFFF87171), size: 20),
                  SizedBox(width: 8),
                  Text('Despesas Operacionais Recentes', style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
                ],
              ),
              Text(
                'Total: ${_formatarKz(_totalDespesas)}',
                style: const TextStyle(color: Color(0xFFF87171), fontSize: 13, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 12),

          _despesas.isEmpty
              ? const Padding(
                  padding: EdgeInsets.symmetric(vertical: 24),
                  child: Center(
                    child: Text('Nenhuma despesa registrada hoje.', style: TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                  ),
                )
              : ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _despesas.length,
                  separatorBuilder: (_, __) => const Divider(color: Color(0xFF1E293B), height: 1),
                  itemBuilder: (context, index) {
                    final d = _despesas[index];
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8.0),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFF1E293B),
                              borderRadius: BorderRadius.circular(4),
                              border: Border.all(color: const Color(0xFF334155)),
                            ),
                            child: Text(d.categoria, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 9, fontWeight: FontWeight.bold)),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(d.descricao,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
                                Text('Por: ${d.registradoPor}', style: const TextStyle(color: Color(0xFF64748B), fontSize: 10)),
                              ],
                            ),
                          ),
                          Text(
                            _formatarKz(d.valor),
                            style: const TextStyle(color: Color(0xFFF87171), fontSize: 12, fontWeight: FontWeight.bold),
                          ),
                          IconButton(
                            icon: const Icon(Icons.close, color: Color(0xFF64748B), size: 16),
                            onPressed: () => _removerDespesa(index),
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(),
                          ),
                        ],
                      ),
                    );
                  },
                ),
        ],
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
              Icon(Icons.shield_outlined, color: Color(0xFFEF4444), size: 48),
              SizedBox(height: 14),
              Text(
                'Acesso Bloqueado pelo RBAC Guard',
                style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 8),
              Text(
                'Os relatórios analíticos, margens de lucro e despesas financeiras estão bloqueados para o perfil VENDEDOR. O acesso é exclusivo a Gerentes e Administradores.',
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
