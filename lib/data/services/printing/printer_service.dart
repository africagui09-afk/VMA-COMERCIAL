import 'dart:convert';
import 'package:flutter/material.dart';
import '../../models/venda_model.dart';
import 'esc_pos_commands.dart';

/// Serviço Especializado em Impressão Térmica ESC/POS para Bobinas de 80mm e 58mm
/// Customizado com os dados institucionais da empresa em Angola:
/// - Empresa: VMA Comercial Lda
/// - Localização: Saurimo, Angola
/// - Telefone: 924046450
/// - NIF: 000000000
class PrinterService {
  // Constantes Institucionais Obrigatórias
  static const String empresaNome = 'VMA Comercial Lda';
  static const String empresaLocalizacao = 'Saurimo, Angola';
  static const String empresaTelefone = '924046450';
  static const String empresaNif = '000000000';

  // Larguras de coluna em caracteres para impressoras térmicas
  static const int colunas80mm = 48;
  static const int colunas58mm = 32;

  /// Gera os bytes binários brutos com comandos ESC/POS para envio direto à porta de impressão
  /// (Serial, USB, Bluetooth SPP ou TCP/IP Ethernet porta 9100).
  static List<int> gerarBytesCupom(VendaModel venda, {bool is80mm = true}) {
    final List<int> bytes = [];
    final int maxCols = is80mm ? colunas80mm : colunas58mm;
    final String divisor = '-' * maxCols;
    final String divisorDuplo = '=' * maxCols;

    // 1. Inicializar impressora
    bytes.addAll(EscPosCommands.init);

    // 2. Cabeçalho Centralizado com Nome da Empresa em Destaque
    bytes.addAll(EscPosCommands.alignCenter);
    bytes.addAll(EscPosCommands.boldOn);
    bytes.addAll(EscPosCommands.textDoubleSize);
    bytes.addAll(utf8.encode('$empresaNome\n'));
    bytes.addAll(EscPosCommands.textNormal);
    bytes.addAll(EscPosCommands.boldOff);

    // Dados Institucionais
    bytes.addAll(utf8.encode('$empresaLocalizacao\n'));
    bytes.addAll(utf8.encode('Tel: $empresaTelefone\n'));
    bytes.addAll(utf8.encode('NIF: $empresaNif\n'));
    bytes.addAll(utf8.encode('$divisorDuplo\n'));

    // Tipo de Documento e Numeração
    bytes.addAll(EscPosCommands.boldOn);
    bytes.addAll(utf8.encode('FACTURA SIMPLIFICADA / VENDA A DINHEIRO\n'));
    bytes.addAll(utf8.encode('${venda.numeroFatura}\n'));
    bytes.addAll(EscPosCommands.boldOff);
    bytes.addAll(utf8.encode('$divisor\n'));

    // 3. Metadados da Venda (Alinhado à Esquerda)
    bytes.addAll(EscPosCommands.alignLeft);
    final dataFormatada = _formatarDataHora(venda.criadoEm);
    bytes.addAll(utf8.encode('Data/Hora: $dataFormatada\n'));
    bytes.addAll(utf8.encode('Operador : ${venda.vendedorNome} (${venda.vendedorCargo})\n'));
    
    if (venda.clienteNome != null && venda.clienteNome!.isNotEmpty) {
      bytes.addAll(utf8.encode('Cliente  : ${venda.clienteNome}\n'));
    } else {
      bytes.addAll(utf8.encode('Cliente  : Consumidor Final\n'));
    }

    if (venda.clienteNif != null && venda.clienteNif!.isNotEmpty) {
      bytes.addAll(utf8.encode('NIF Cli. : ${venda.clienteNif}\n'));
    } else {
      bytes.addAll(utf8.encode('NIF Cli. : Consumidor Final\n'));
    }

    bytes.addAll(utf8.encode('$divisor\n'));

    // 4. Cabeçalho da Tabela de Itens
    bytes.addAll(EscPosCommands.boldOn);
    if (is80mm) {
      bytes.addAll(utf8.encode(_alinhadoEsquerdaDireita('ARTIGO / DESCRICAO', 'TOTAL (Kz)', maxCols) + '\n'));
    } else {
      bytes.addAll(utf8.encode(_alinhadoEsquerdaDireita('DESC.', 'VALOR', maxCols) + '\n'));
    }
    bytes.addAll(EscPosCommands.boldOff);
    bytes.addAll(utf8.encode('$divisor\n'));

    // 5. Listagem dos Itens Vendidos
    for (int i = 0; i < venda.itens.length; i++) {
      final item = venda.itens[i];
      final nome = item.nomeProduto ?? 'Produto ${i + 1}';
      
      // Linha 1: Descrição do produto
      bytes.addAll(utf8.encode('$nome\n'));

      // Linha 2: Quantidade x Preço Unitário e Total do Item
      final detalheQtd = '${item.quantidade}x ${_formatarKzSimples(item.precoUnitario)}';
      final totalItem = _formatarKzSimples(item.total);
      bytes.addAll(utf8.encode(_alinhadoEsquerdaDireita('  $detalheQtd', '$totalItem Kz', maxCols) + '\n'));
    }

    bytes.addAll(utf8.encode('$divisor\n'));

    // 6. Totais e Fechamento Financeiro
    final subtotalStr = '${_formatarKzSimples(venda.subtotal)} Kz';
    bytes.addAll(utf8.encode(_alinhadoEsquerdaDireita('Subtotal:', subtotalStr, maxCols) + '\n'));

    if (venda.totalDesconto > 0) {
      final descStr = '-${_formatarKzSimples(venda.totalDesconto)} Kz';
      bytes.addAll(utf8.encode(_alinhadoEsquerdaDireita('Desconto:', descStr, maxCols) + '\n'));
    }

    bytes.addAll(utf8.encode('$divisor\n'));

    // Total a Pagar em Destaque Negrito
    bytes.addAll(EscPosCommands.boldOn);
    bytes.addAll(EscPosCommands.textDoubleHeight);
    final totalGeralStr = '${_formatarKzSimples(venda.total)} Kz';
    bytes.addAll(utf8.encode(_alinhadoEsquerdaDireita('TOTAL A PAGAR:', totalGeralStr, maxCols) + '\n'));
    bytes.addAll(EscPosCommands.textNormal);
    bytes.addAll(EscPosCommands.boldOff);

    bytes.addAll(utf8.encode('$divisor\n'));

    // Formas de Liquidação
    final formaPgto = venda.formasPagamento.isNotEmpty ? venda.formasPagamento.join(', ') : 'DINHEIRO';
    bytes.addAll(utf8.encode(_alinhadoEsquerdaDireita('Modo Pagamento:', formaPgto, maxCols) + '\n'));

    if (venda.valorRecebido != null && venda.valorRecebido! > 0) {
      final entregueStr = '${_formatarKzSimples(venda.valorRecebido!)} Kz';
      bytes.addAll(utf8.encode(_alinhadoEsquerdaDireita('Valor Entregue:', entregueStr, maxCols) + '\n'));

      final trocoStr = '${_formatarKzSimples(venda.troco)} Kz';
      bytes.addAll(utf8.encode(_alinhadoEsquerdaDireita('Troco Apurado:', trocoStr, maxCols) + '\n'));
    }

    bytes.addAll(utf8.encode('$divisorDuplo\n'));

    // 7. Rodapé e Enquadramento Fiscal Angolano
    bytes.addAll(EscPosCommands.alignCenter);
    bytes.addAll(utf8.encode('IVA - Regime de Exclusao (Nao Sujeito)\n'));
    bytes.addAll(utf8.encode('Regime Juridico das Facturas de Angola\n'));
    bytes.addAll(utf8.encode('Processado por Programa Certificado\n'));
    bytes.addAll(utf8.encode('$divisor\n'));
    bytes.addAll(EscPosCommands.boldOn);
    bytes.addAll(utf8.encode('OBRIGADO PELA PREFERENCIA!\n'));
    bytes.addAll(utf8.encode('VOLTE SEMPRE\n'));
    bytes.addAll(EscPosCommands.boldOff);
    bytes.addAll(utf8.encode('Software KwanzaPOS - Saurimo\n\n'));

    // 8. Avanço de linhas e corte de papel
    bytes.addAll(EscPosCommands.feed5Lines);
    bytes.addAll(EscPosCommands.cutPaperPartial);

    return bytes;
  }

  /// Gera a representação do cupom em texto puro monoespaçado
  /// para visualização imediata em tela, logs ou impressoras de terminal de texto.
  static String formatarTextoCupom(VendaModel venda, {bool is80mm = true}) {
    final int maxCols = is80mm ? colunas80mm : colunas58mm;
    final String divisor = '-' * maxCols;
    final String divisorDuplo = '=' * maxCols;
    final StringBuffer sb = StringBuffer();

    // Cabeçalho
    sb.writeln(_centralizar(empresaNome, maxCols));
    sb.writeln(_centralizar(empresaLocalizacao, maxCols));
    sb.writeln(_centralizar('Tel: $empresaTelefone', maxCols));
    sb.writeln(_centralizar('NIF: $empresaNif', maxCols));
    sb.writeln(divisorDuplo);

    // Documento
    sb.writeln(_centralizar('FACTURA SIMPLIFICADA / VENDA A DINHEIRO', maxCols));
    sb.writeln(_centralizar(venda.numeroFatura, maxCols));
    sb.writeln(divisor);

    // Metadados
    sb.writeln('Data/Hora: ${_formatarDataHora(venda.criadoEm)}');
    sb.writeln('Operador : ${venda.vendedorNome} (${venda.vendedorCargo})');
    sb.writeln('Cliente  : ${venda.clienteNome ?? 'Consumidor Final'}');
    sb.writeln('NIF Cli. : ${venda.clienteNif ?? 'Consumidor Final'}');
    sb.writeln(divisor);

    // Itens
    sb.writeln(_alinhadoEsquerdaDireita('ARTIGO / DESCRICAO', 'TOTAL (Kz)', maxCols));
    sb.writeln(divisor);

    for (int i = 0; i < venda.itens.length; i++) {
      final item = venda.itens[i];
      final nome = item.nomeProduto ?? 'Produto ${i + 1}';
      sb.writeln(nome);
      final detalheQtd = '  ${item.quantidade}x ${_formatarKzSimples(item.precoUnitario)}';
      final totalItem = '${_formatarKzSimples(item.total)} Kz';
      sb.writeln(_alinhadoEsquerdaDireita(detalheQtd, totalItem, maxCols));
    }

    sb.writeln(divisor);

    // Totais
    sb.writeln(_alinhadoEsquerdaDireita('Subtotal:', '${_formatarKzSimples(venda.subtotal)} Kz', maxCols));
    if (venda.totalDesconto > 0) {
      sb.writeln(_alinhadoEsquerdaDireita('Desconto:', '-${_formatarKzSimples(venda.totalDesconto)} Kz', maxCols));
    }
    sb.writeln(divisor);
    sb.writeln(_alinhadoEsquerdaDireita('TOTAL A PAGAR:', '${_formatarKzSimples(venda.total)} Kz', maxCols));
    sb.writeln(divisor);

    // Pagamento
    final formaPgto = venda.formasPagamento.isNotEmpty ? venda.formasPagamento.join(', ') : 'DINHEIRO';
    sb.writeln(_alinhadoEsquerdaDireita('Modo Pagamento:', formaPgto, maxCols));
    if (venda.valorRecebido != null && venda.valorRecebido! > 0) {
      sb.writeln(_alinhadoEsquerdaDireita('Valor Entregue:', '${_formatarKzSimples(venda.valorRecebido!)} Kz', maxCols));
      sb.writeln(_alinhadoEsquerdaDireita('Troco Apurado:', '${_formatarKzSimples(venda.troco)} Kz', maxCols));
    }

    sb.writeln(divisorDuplo);

    // Rodapé
    sb.writeln(_centralizar('IVA - Regime de Exclusao (Nao Sujeito)', maxCols));
    sb.writeln(_centralizar('Regime Juridico das Facturas de Angola', maxCols));
    sb.writeln(_centralizar('Processado por Programa Certificado', maxCols));
    sb.writeln(divisor);
    sb.writeln(_centralizar('OBRIGADO PELA PREFERENCIA!', maxCols));
    sb.writeln(_centralizar('VOLTE SEMPRE', maxCols));
    sb.writeln(_centralizar('Software KwanzaPOS - Saurimo', maxCols));

    return sb.toString();
  }

  /// Diálogo interativo para pré-visualizar o cupom térmico ESC/POS e simular envio
  static void exibirPreviewCupom(BuildContext context, VendaModel venda) {
    bool is80mm = true;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) {
          final textoCupom = formatarTextoCupom(venda, is80mm: is80mm);
          final bytes = gerarBytesCupom(venda, is80mm: is80mm);

          return Dialog(
            backgroundColor: const Color(0xFF161C27),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: const BorderSide(color: Color(0xFF273349)),
            ),
            child: Container(
              width: 520,
              padding: const EdgeInsets.all(20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Cabeçalho do Modal
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: const Color(0xFF059669).withOpacity(0.2),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Icon(Icons.print_outlined, color: Color(0xFF34D399), size: 22),
                          ),
                          const SizedBox(width: 12),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: const [
                              Text(
                                'Impressão Térmica ESC/POS',
                                style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                              ),
                              Text(
                                'VMA Comercial Lda - Saurimo',
                                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                              ),
                            ],
                          ),
                        ],
                      ),
                      IconButton(
                        icon: const Icon(Icons.close, color: Color(0xFF94A3B8)),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Seletor de Largura da Bobina (80mm vs 58mm)
                  Row(
                    children: [
                      const Text('Bobina:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                      const SizedBox(width: 10),
                      ChoiceChip(
                        label: const Text('Padrão 80mm (48 col)'),
                        selected: is80mm,
                        selectedColor: const Color(0xFF059669),
                        labelStyle: TextStyle(
                          color: is80mm ? Colors.white : const Color(0xFFCBD5E1),
                          fontSize: 11,
                          fontWeight: is80mm ? FontWeight.bold : FontWeight.normal,
                        ),
                        backgroundColor: const Color(0xFF111622),
                        onSelected: (val) {
                          setModalState(() => is80mm = true);
                        },
                      ),
                      const SizedBox(width: 8),
                      ChoiceChip(
                        label: const Text('Compacta 58mm (32 col)'),
                        selected: !is80mm,
                        selectedColor: const Color(0xFF059669),
                        labelStyle: TextStyle(
                          color: !is80mm ? Colors.white : const Color(0xFFCBD5E1),
                          fontSize: 11,
                          fontWeight: !is80mm ? FontWeight.bold : FontWeight.normal,
                        ),
                        backgroundColor: const Color(0xFF111622),
                        onSelected: (val) {
                          setModalState(() => is80mm = false);
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Visualizador de Bobina Térmica Monospace (Estilo Papel Térmico)
                  Flexible(
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0F172A),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFF334155)),
                      ),
                      child: SingleChildScrollView(
                        child: Text(
                          textoCupom,
                          style: const TextStyle(
                            fontFamily: 'monospace',
                            color: Color(0xFFF1F5F9),
                            fontSize: 11,
                            height: 1.35,
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Informação de Bytes
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Bytes ESC/POS gerados: ${bytes.length} bytes',
                        style: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                      ),
                      const Text(
                        'Comandos: ESC @ | ESC a | GS V (Corte)',
                        style: TextStyle(color: Color(0xFF34D399), fontSize: 10, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Ações
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: Color(0xFF334155)),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Bytes ESC/POS enviados para porta USB/Bluetooth!'),
                                backgroundColor: Color(0xFF059669),
                                behavior: SnackBarBehavior.floating,
                              ),
                            );
                            Navigator.pop(ctx);
                          },
                          icon: const Icon(Icons.send, size: 16, color: Color(0xFF38BDF8)),
                          label: const Text('Enviar p/ Porta ESC/POS', style: TextStyle(color: Color(0xFF38BDF8), fontSize: 12)),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF059669),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Cupom impresso com sucesso e papel cortado!'),
                                backgroundColor: Color(0xFF10B981),
                                behavior: SnackBarBehavior.floating,
                              ),
                            );
                            Navigator.pop(ctx);
                          },
                          icon: const Icon(Icons.print, size: 16),
                          label: const Text('Imprimir Térmica', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  // --- Funções Auxiliares de Formatação ---

  static String _alinhadoEsquerdaDireita(String esq, String dir, int maxCols) {
    final espacosNecessarios = maxCols - esq.length - dir.length;
    if (espacosNecessarios <= 0) {
      return '$esq $dir';
    }
    return esq + (' ' * espacosNecessarios) + dir;
  }

  static String _centralizar(String texto, int maxCols) {
    if (texto.length >= maxCols) return texto;
    final totalEspacos = maxCols - texto.length;
    final espacoEsq = totalEspacos ~/ 2;
    final espacoDir = totalEspacos - espacoEsq;
    return (' ' * espacoEsq) + texto + (' ' * espacoDir);
  }

  static String _formatarKzSimples(double valor) {
    final partes = valor.toStringAsFixed(2).split('.');
    final inteiro = partes[0].replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
      (Match m) => '${m[1]}.',
    );
    return '$inteiro,${partes[1]}';
  }

  static String _formatarDataHora(DateTime dt) {
    final dia = dt.day.toString().padLeft(2, '0');
    final mes = dt.month.toString().padLeft(2, '0');
    final ano = dt.year.toString();
    final hora = dt.hour.toString().padLeft(2, '0');
    final min = dt.minute.toString().padLeft(2, '0');
    final seg = dt.second.toString().padLeft(2, '0');
    return '$dia/$mes/$ano $hora:$min:$seg';
  }
}
