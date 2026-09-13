import 'dart:typed_data';
import 'package:flutter/material.dart' hide Table, TableRow, TableCell, Border, BorderSide;
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import '../../models/despesa_model.dart';
import '../../models/produto_model.dart';
import '../../models/venda_model.dart';

/// Serviço Especializado em Geração e Exportação de Documentos e Relatórios em PDF A4 Vertical
/// Customizado com a identidade visual e institucional de:
/// - Empresa: VMA Comercial Lda
/// - Localização: Saurimo, Angola
/// - Contacto Telefónico: 924046450
/// - NIF: 000000000
class PdfReportService {
  // Dados Institucionais Obrigatórios
  static const String empresaNome = 'VMA Comercial Lda';
  static const String empresaLocalizacao = 'Saurimo, Angola';
  static const String empresaTelefone = '924046450';
  static const String empresaNif = '000000000';

  /// Gera o Relatório Analítico Financeiro & Inventário de Produtos em Formato A4 Vertical
  /// Retorna os bytes do PDF prontos para impressão ou download.
  static Future<Uint8List> gerarRelatorioPDF({
    required double totalVendido,
    required double totalCusto,
    required double totalDespesas,
    required double lucroLiquido,
    required List<DespesaModel> despesas,
    required List<ProdutoModel> produtos,
    required String emitidoPor,
  }) async {
    final pdf = pw.Document(
      title: 'Relatório Gerencial - VMA Comercial Lda',
      author: 'KwanzaPOS Software',
    );

    final double lucroBruto = totalVendido - totalCusto;
    final double margemLiquida = totalVendido > 0 ? (lucroLiquido / totalVendido * 100) : 0.0;
    final String dataEmissao = _formatarDataHora(DateTime.now());

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.symmetric(horizontal: 28, vertical: 28),
        header: (pw.Context context) => _buildCabecalhoInstitucional(dataEmissao, emitidoPor),
        footer: (pw.Context context) => _buildRodapeInstitucional(context),
        build: (pw.Context context) => [
          pw.SizedBox(height: 12),

          // Título Principal do Relatório
          pw.Center(
            child: pw.Text(
              'RELATÓRIO DE DESEMPENHO FINANCEIRO & POSIÇÃO DE ESTOQUE',
              style: pw.TextStyle(
                fontSize: 13,
                fontWeight: pw.FontWeight.bold,
                color: PdfColors.blueGrey900,
              ),
            ),
          ),
          pw.SizedBox(height: 14),

          // Seção 1: Indicadores DRE em Cartões Estruturados
          pw.Text(
            '1. DEMONSTRATIVO DE RESULTADOS (DRE CONSOLIDADO)',
            style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold, color: PdfColors.teal800),
          ),
          pw.SizedBox(height: 6),
          _buildTabelaIndicadoresDRE(
            totalVendido: totalVendido,
            totalCusto: totalCusto,
            lucroBruto: lucroBruto,
            totalDespesas: totalDespesas,
            lucroLiquido: lucroLiquido,
            margemLiquida: margemLiquida,
          ),
          pw.SizedBox(height: 16),

          // Seção 2: Despesas Operacionais Recentes
          pw.Text(
            '2. DESCRITIVO DE DESPESAS OPERACIONAIS REGISTRADAS',
            style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold, color: PdfColors.teal800),
          ),
          pw.SizedBox(height: 6),
          _buildTabelaDespesas(despesas),
          pw.SizedBox(height: 16),

          // Seção 3: Posição Atual de Estoque e Alertas
          pw.Text(
            '3. POSIÇÃO DE INVENTÁRIO & NÍVEL DE ESTOQUE',
            style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold, color: PdfColors.teal800),
          ),
          pw.SizedBox(height: 6),
          _buildTabelaProdutos(produtos),
          pw.SizedBox(height: 24),

          // Assinatura Institucional de Responsabilidade
          _buildBlocoAssinatura(),
        ],
      ),
    );

    return pdf.save();
  }

  /// Gera a Factura Simplificada / Venda a Dinheiro em folha A4 vertical
  static Future<Uint8List> gerarFacturaVendaPDF(VendaModel venda) async {
    final pdf = pw.Document(
      title: 'Factura ${venda.numeroFatura} - VMA Comercial Lda',
      author: 'KwanzaPOS Software',
    );

    final dataFormatada = _formatarDataHora(venda.criadoEm);

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(32),
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              // Cabeçalho Empresa
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(empresaNome, style: pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold, color: PdfColors.teal900)),
                      pw.Text(empresaLocalizacao, style: const pw.TextStyle(fontSize: 10, color: PdfColors.grey700)),
                      pw.Text('Telefone: $empresaTelefone', style: const pw.TextStyle(fontSize: 10, color: PdfColors.grey700)),
                      pw.Text('NIF: $empresaNif', style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold, color: PdfColors.grey800)),
                    ],
                  ),
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.end,
                    children: [
                      pw.Container(
                        padding: const pw.EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: pw.BoxDecoration(
                          color: PdfColors.teal800,
                          borderRadius: pw.BorderRadius.circular(4),
                        ),
                        child: pw.Text(
                          'FACTURA SIMPLIFICADA',
                          style: pw.TextStyle(color: PdfColors.white, fontWeight: pw.FontWeight.bold, fontSize: 11),
                        ),
                      ),
                      pw.SizedBox(height: 4),
                      pw.Text('Nº: ${venda.numeroFatura}', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 12)),
                      pw.Text('Data: $dataFormatada', style: const pw.TextStyle(fontSize: 9, color: PdfColors.grey700)),
                    ],
                  ),
                ],
              ),
              pw.Divider(thickness: 1, color: PdfColors.grey400),
              pw.SizedBox(height: 6),

              // Dados do Cliente e Operador
              pw.Row(
                children: [
                  pw.Expanded(
                    child: pw.Container(
                      padding: const pw.EdgeInsets.all(8),
                      decoration: pw.BoxDecoration(
                        border: pw.Border.all(color: PdfColors.grey300),
                        borderRadius: pw.BorderRadius.circular(4),
                      ),
                      child: pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.start,
                        children: [
                          pw.Text('EXMO.(A) SR.(A) / CLIENTE:', style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold, color: PdfColors.grey600)),
                          pw.Text(venda.clienteNome ?? 'Consumidor Final', style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold)),
                          pw.Text('NIF: ${venda.clienteNif ?? "Consumidor Final"}', style: const pw.TextStyle(fontSize: 9, color: PdfColors.grey700)),
                        ],
                      ),
                    ),
                  ),
                  pw.SizedBox(width: 12),
                  pw.Expanded(
                    child: pw.Container(
                      padding: const pw.EdgeInsets.all(8),
                      decoration: pw.BoxDecoration(
                        border: pw.Border.all(color: PdfColors.grey300),
                        borderRadius: pw.BorderRadius.circular(4),
                      ),
                      child: pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.start,
                        children: [
                          pw.Text('DADOS DA OPERAÇÃO:', style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold, color: PdfColors.grey600)),
                          pw.Text('Operador: ${venda.vendedorNome}', style: const pw.TextStyle(fontSize: 10)),
                          pw.Text('Cargo: ${venda.vendedorCargo}', style: const pw.TextStyle(fontSize: 9, color: PdfColors.grey700)),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              pw.SizedBox(height: 14),

              // Tabela de Itens
              pw.Table(
                border: pw.TableBorder.all(color: PdfColors.grey300, width: 0.5),
                columnWidths: {
                  0: const pw.FlexColumnWidth(1),
                  1: const pw.FlexColumnWidth(5),
                  2: const pw.FlexColumnWidth(1.5),
                  3: const pw.FlexColumnWidth(2),
                  4: const pw.FlexColumnWidth(1.5),
                  5: const pw.FlexColumnWidth(2.5),
                },
                children: [
                  pw.TableRow(
                    decoration: const pw.BoxDecoration(color: PdfColors.grey200),
                    children: [
                      _th('#'),
                      _th('Designação do Artigo'),
                      _th('Qtd'),
                      _th('P. Unit (Kz)'),
                      _th('Desc.'),
                      _th('Total Líquido (Kz)'),
                    ],
                  ),
                  ...venda.itens.asMap().entries.map((entry) {
                    final idx = entry.key + 1;
                    final item = entry.value;
                    return pw.TableRow(
                      decoration: pw.BoxDecoration(color: idx.isOdd ? PdfColors.white : PdfColors.grey50),
                      children: [
                        _td('$idx', align: pw.TextAlign.center),
                        _td(item.nomeProduto ?? 'Produto'),
                        _td('${item.quantidade}', align: pw.TextAlign.center),
                        _td(_formatarKz(item.precoUnitario), align: pw.TextAlign.right),
                        _td(_formatarKz(item.desconto), align: pw.TextAlign.right),
                        _td(_formatarKz(item.total), align: pw.TextAlign.right),
                      ],
                    );
                  }).toList(),
                ],
              ),
              pw.SizedBox(height: 12),

              // Bloco de Totais
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.end,
                children: [
                  pw.Container(
                    width: 250,
                    padding: const pw.EdgeInsets.all(10),
                    decoration: pw.BoxDecoration(
                      border: pw.Border.all(color: PdfColors.teal800, width: 1),
                      borderRadius: pw.BorderRadius.circular(6),
                      color: PdfColors.teal50,
                    ),
                    child: pw.Column(
                      children: [
                        _linhaTotal('Subtotal:', _formatarKz(venda.subtotal)),
                        if (venda.totalDesconto > 0)
                          _linhaTotal('Desconto Global:', '-${_formatarKz(venda.totalDesconto)}'),
                        pw.Divider(color: PdfColors.teal800, thickness: 0.5),
                        _linhaTotal(
                          'TOTAL A PAGAR:',
                          _formatarKz(venda.total),
                          isBold: true,
                          color: PdfColors.teal900,
                          fontSize: 13,
                        ),
                        pw.SizedBox(height: 4),
                        _linhaTotal('Modo Pagamento:', venda.formasPagamento.join(', ')),
                        if (venda.valorRecebido != null && venda.valorRecebido! > 0) ...[
                          _linhaTotal('Valor Recebido:', _formatarKz(venda.valorRecebido!)),
                          _linhaTotal('Troco Entregue:', _formatarKz(venda.troco)),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
              pw.Spacer(),

              // Rodapé Fiscal
              pw.Divider(thickness: 1, color: PdfColors.grey400),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('IVA - Regime de Exclusão (Não Sujeito a Imposto)', style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey700)),
                  pw.Text('Processado por Programa Validado nº 000/AGT/2026', style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey700)),
                  pw.Text('VMA Comercial Lda - Saurimo', style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold, color: PdfColors.teal900)),
                ],
              ),
            ],
          );
        },
      ),
    );

    return pdf.save();
  }

  /// Aciona a pré-visualização ou impressão do PDF no dispositivo
  static Future<void> exibirPreviewPDF(
    BuildContext context,
    Uint8List pdfBytes,
    String tituloDocumento,
  ) async {
    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async => pdfBytes,
      name: tituloDocumento,
    );
  }

  // --- Componentes Internos do Layout PDF A4 ---

  static pw.Widget _buildCabecalhoInstitucional(String dataEmissao, String emitidoPor) {
    return pw.Column(
      children: [
        pw.Row(
          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                pw.Text(
                  empresaNome,
                  style: pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold, color: PdfColors.teal900),
                ),
                pw.Text(
                  'Comércio Geral, Bens Alimentares & Utilidades',
                  style: const pw.TextStyle(fontSize: 9, color: PdfColors.grey700),
                ),
                pw.Text(
                  '$empresaLocalizacao | Telefone: $empresaTelefone',
                  style: const pw.TextStyle(fontSize: 9, color: PdfColors.grey700),
                ),
                pw.Text(
                  'NIF Institucional: $empresaNif',
                  style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold, color: PdfColors.grey800),
                ),
              ],
            ),
            pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.end,
              children: [
                pw.Container(
                  padding: const pw.EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: pw.BoxDecoration(
                    border: pw.Border.all(color: PdfColors.teal800),
                    borderRadius: pw.BorderRadius.circular(4),
                  ),
                  child: pw.Text(
                    'DOCUMENTO GERENCIAL INTERNO',
                    style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold, color: PdfColors.teal800),
                  ),
                ),
                pw.SizedBox(height: 4),
                pw.Text('Data de Emissão: $dataEmissao', style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey700)),
                pw.Text('Responsável: $emitidoPor', style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey700)),
              ],
            ),
          ],
        ),
        pw.SizedBox(height: 8),
        pw.Divider(thickness: 1.2, color: PdfColors.teal800),
      ],
    );
  }

  static pw.Widget _buildRodapeInstitucional(pw.Context context) {
    return pw.Column(
      children: [
        pw.Divider(thickness: 0.5, color: PdfColors.grey400),
        pw.Row(
          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
          children: [
            pw.Text(
              'Software KwanzaPOS - $empresaNome (Saurimo, Angola)',
              style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey600),
            ),
            pw.Text(
              'Página ${context.pageNumber} de ${context.pagesCount}',
              style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey700),
            ),
          ],
        ),
      ],
    );
  }

  static pw.Widget _buildTabelaIndicadoresDRE({
    required double totalVendido,
    required double totalCusto,
    required double lucroBruto,
    required double totalDespesas,
    required double lucroLiquido,
    required double margemLiquida,
  }) {
    return pw.Table(
      border: pw.TableBorder.all(color: PdfColors.grey300, width: 0.5),
      children: [
        pw.TableRow(
          decoration: const pw.BoxDecoration(color: PdfColors.grey200),
          children: [
            _th('Receita Bruta (Vendas)'),
            _th('Custo Mercadorias (CMV)'),
            _th('Lucro Bruto'),
            _th('Despesas Operacionais'),
            _th('Lucro Líquido Real'),
            _th('Margem Líquida (%)'),
          ],
        ),
        pw.TableRow(
          decoration: const pw.BoxDecoration(color: PdfColors.white),
          children: [
            _td(_formatarKz(totalVendido), align: pw.TextAlign.right, isBold: true),
            _td(_formatarKz(totalCusto), align: pw.TextAlign.right),
            _td(_formatarKz(lucroBruto), align: pw.TextAlign.right, color: PdfColors.blue800, isBold: true),
            _td(_formatarKz(totalDespesas), align: pw.TextAlign.right, color: PdfColors.red800),
            _td(_formatarKz(lucroLiquido), align: pw.TextAlign.right, color: PdfColors.teal800, isBold: true),
            _td('${margemLiquida.toStringAsFixed(1)} %', align: pw.TextAlign.center, isBold: true),
          ],
        ),
      ],
    );
  }

  static pw.Widget _buildTabelaDespesas(List<DespesaModel> despesas) {
    if (despesas.isEmpty) {
      return pw.Container(
        padding: const pw.EdgeInsets.all(8),
        alignment: pw.Alignment.center,
        child: pw.Text('Nenhuma despesa registrada no período.', style: const pw.TextStyle(fontSize: 9, color: PdfColors.grey600)),
      );
    }

    final double somaDespesas = despesas.fold(0.0, (acc, d) => acc + d.valor);

    return pw.Table(
      border: pw.TableBorder.all(color: PdfColors.grey300, width: 0.5),
      columnWidths: {
        0: const pw.FlexColumnWidth(2),
        1: const pw.FlexColumnWidth(4.5),
        2: const pw.FlexColumnWidth(2),
        3: const pw.FlexColumnWidth(2.5),
        4: const pw.FlexColumnWidth(2.5),
      },
      children: [
        pw.TableRow(
          decoration: const pw.BoxDecoration(color: PdfColors.grey200),
          children: [
            _th('Data'),
            _th('Descrição'),
            _th('Categoria'),
            _th('Responsável'),
            _th('Valor (Kz)'),
          ],
        ),
        ...despesas.map((d) {
          return pw.TableRow(
            children: [
              _td(_formatarDataSimples(d.data), align: pw.TextAlign.center),
              _td(d.descricao),
              _td(d.categoria, align: pw.TextAlign.center),
              _td(d.registradoPor),
              _td(_formatarKz(d.valor), align: pw.TextAlign.right),
            ],
          );
        }).toList(),
        pw.TableRow(
          decoration: const pw.BoxDecoration(color: PdfColors.grey100),
          children: [
            _td('TOTAL CONSOLIDADO', colSpan: 4, isBold: true, align: pw.TextAlign.right),
            _td(''),
            _td(''),
            _td(''),
            _td(_formatarKz(somaDespesas), isBold: true, align: pw.TextAlign.right, color: PdfColors.red900),
          ],
        ),
      ],
    );
  }

  static pw.Widget _buildTabelaProdutos(List<ProdutoModel> produtos) {
    return pw.Table(
      border: pw.TableBorder.all(color: PdfColors.grey300, width: 0.5),
      columnWidths: {
        0: const pw.FlexColumnWidth(2),
        1: const pw.FlexColumnWidth(4),
        2: const pw.FlexColumnWidth(1.5),
        3: const pw.FlexColumnWidth(1.5),
        4: const pw.FlexColumnWidth(2),
        5: const pw.FlexColumnWidth(2),
        6: const pw.FlexColumnWidth(2),
      },
      children: [
        pw.TableRow(
          decoration: const pw.BoxDecoration(color: PdfColors.grey200),
          children: [
            _th('Código/Ref.'),
            _th('Designação do Artigo'),
            _th('Estoque'),
            _th('Mínimo'),
            _th('Custo Unit.'),
            _th('Preço Venda'),
            _th('Status'),
          ],
        ),
        ...produtos.map((p) {
          final isCritico = p.estoqueAtual <= p.estoqueMinimo;
          return pw.TableRow(
            children: [
              _td(p.codigoBarras ?? p.supabaseId.substring(0, 8), align: pw.TextAlign.center),
              _td(p.nome),
              _td('${p.estoqueAtual} ${p.unidade}', align: pw.TextAlign.center, isBold: isCritico),
              _td('${p.estoqueMinimo}', align: pw.TextAlign.center),
              _td(_formatarKz(p.precoCusto), align: pw.TextAlign.right),
              _td(_formatarKz(p.precoVenda), align: pw.TextAlign.right),
              _td(
                isCritico ? 'CRÍTICO' : 'NORMAL',
                align: pw.TextAlign.center,
                isBold: true,
                color: isCritico ? PdfColors.red800 : PdfColors.teal800,
              ),
            ],
          );
        }).toList(),
      ],
    );
  }

  static pw.Widget _buildBlocoAssinatura() {
    return pw.Row(
      mainAxisAlignment: pw.MainAxisAlignment.spaceAround,
      children: [
        pw.Column(
          children: [
            pw.Container(width: 200, height: 0.8, color: PdfColors.black),
            pw.SizedBox(height: 4),
            pw.Text(empresaNome, style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold)),
            pw.Text('Gerência Geral / Assinatura e Carimbo', style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey700)),
            pw.Text(empresaLocalizacao, style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey600)),
          ],
        ),
        pw.Column(
          children: [
            pw.Container(width: 200, height: 0.8, color: PdfColors.black),
            pw.SizedBox(height: 4),
            pw.Text('Auditoria Contábil / Fiscal', style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold)),
            pw.Text('Revisão e Validação de Conformidade', style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey700)),
            pw.Text('NIF: $empresaNif', style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey600)),
          ],
        ),
      ],
    );
  }

  // --- Auxiliares de Tabela e Tipografia ---

  static pw.Widget _th(String texto) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 4, horizontal: 4),
      child: pw.Text(
        texto,
        textAlign: pw.TextAlign.center,
        style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold, color: PdfColors.blueGrey900),
      ),
    );
  }

  static pw.Widget _td(
    String texto, {
    pw.TextAlign align = pw.TextAlign.left,
    bool isBold = false,
    PdfColor color = PdfColors.black,
    int colSpan = 1,
  }) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 3.5, horizontal: 4),
      child: pw.Text(
        texto,
        textAlign: align,
        style: pw.TextStyle(
          fontSize: 8,
          fontWeight: isBold ? pw.FontWeight.bold : pw.FontWeight.normal,
          color: color,
        ),
      ),
    );
  }

  static pw.Widget _linhaTotal(
    String label,
    String valor, {
    bool isBold = false,
    PdfColor color = PdfColors.black,
    double fontSize = 9,
  }) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 1.5),
      child: pw.Row(
        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
        children: [
          pw.Text(
            label,
            style: pw.TextStyle(fontSize: fontSize, fontWeight: isBold ? pw.FontWeight.bold : pw.FontWeight.normal),
          ),
          pw.Text(
            valor,
            style: pw.TextStyle(
              fontSize: fontSize,
              fontWeight: isBold ? pw.FontWeight.bold : pw.FontWeight.normal,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  static String _formatarKz(double valor) {
    final partes = valor.toStringAsFixed(2).split('.');
    final inteiro = partes[0].replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
      (Match m) => '${m[1]}.',
    );
    return '$inteiro,${partes[1]} Kz';
  }

  static String _formatarDataHora(DateTime dt) {
    final dia = dt.day.toString().padLeft(2, '0');
    final mes = dt.month.toString().padLeft(2, '0');
    final ano = dt.year.toString();
    final hora = dt.hour.toString().padLeft(2, '0');
    final min = dt.minute.toString().padLeft(2, '0');
    return '$dia/$mes/$ano às $hora:$min';
  }

  static String _formatarDataSimples(DateTime dt) {
    final dia = dt.day.toString().padLeft(2, '0');
    final mes = dt.month.toString().padLeft(2, '0');
    final ano = dt.year.toString();
    return '$dia/$mes/$ano';
  }
}
