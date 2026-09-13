import 'dart:convert';
import 'package:isar/isar.dart';
import 'item_venda_model.dart';

part 'venda_model.g.dart';

@collection
class VendaModel {
  Id id = Isar.autoIncrement;

  @Index(unique: true, replace: true)
  late String supabaseId; // UUID v4 em String

  @Index()
  late String numeroFatura; // Ex: VD-2026-0001

  List<ItemVendaModel> itens = [];

  late double subtotal; // Em Kwanza (Kz)

  late double totalDesconto; // Em Kwanza (Kz)

  late double total; // Em Kwanza (Kz)

  late double totalCusto; // Para apuração do Lucro Bruto

  // Lista com as modalidades de pagamento (Ex: DINHEIRO, MULTICAIXA, TRANSFERENCIA)
  List<String> formasPagamento = [];

  double? valorRecebido;

  double troco = 0.0;

  late String vendedorId;

  late String vendedorNome;

  late String vendedorCargo;

  String? clienteNome;

  String? clienteNif;

  String? observacoes;

  late String status; // 'CONCLUIDA' | 'CANCELADA'

  DateTime? canceladoEm;

  String? canceladoPor;

  String? motivoCancelamento;

  // Requisitos Obrigatórios Offline-First
  late bool sincronizado;
  late DateTime atualizadoEm;
  late DateTime criadoEm;

  VendaModel();

  /// Construtor de fábrica otimizado para gravação local imediata (Offline-First nativo)
  /// Permite criar a venda instantaneamente mesmo sem nenhuma conexão de rede ativa.
  factory VendaModel.criarLocal({
    required String supabaseId, // UUID gerado pelo cliente
    required String numeroFatura,
    required List<ItemVendaModel> itens,
    required List<String> formasPagamento,
    required String vendedorId,
    required String vendedorNome,
    required String vendedorCargo,
    double? valorRecebido,
    String? clienteNome,
    String? clienteNif,
    String? observacoes,
  }) {
    final now = DateTime.now().toUtc();

    double calcSubtotal = 0.0;
    double calcDesconto = 0.0;
    double calcTotalCusto = 0.0;

    for (final item in itens) {
      calcSubtotal += item.subtotal;
      calcDesconto += item.desconto;
      calcTotalCusto += (item.precoCusto * item.quantidade);
    }

    final calcTotal = double.parse((calcSubtotal - calcDesconto).clamp(0.0, double.infinity).toStringAsFixed(2));
    final calcTroco = (valorRecebido != null && valorRecebido > calcTotal)
        ? double.parse((valorRecebido - calcTotal).toStringAsFixed(2))
        : 0.0;

    return VendaModel()
      ..supabaseId = supabaseId
      ..numeroFatura = numeroFatura
      ..itens = itens
      ..subtotal = double.parse(calcSubtotal.toStringAsFixed(2))
      ..totalDesconto = double.parse(calcDesconto.toStringAsFixed(2))
      ..total = calcTotal
      ..totalCusto = double.parse(calcTotalCusto.toStringAsFixed(2))
      ..formasPagamento = formasPagamento
      ..valorRecebido = valorRecebido != null ? double.parse(valorRecebido.toStringAsFixed(2)) : null
      ..troco = calcTroco
      ..vendedorId = vendedorId
      ..vendedorNome = vendedorNome
      ..vendedorCargo = vendedorCargo
      ..clienteNome = clienteNome
      ..clienteNif = clienteNif
      ..observacoes = observacoes
      ..status = 'CONCLUIDA'
      ..sincronizado = false // Marcado como pendente de sync com Supabase
      ..atualizadoEm = now
      ..criadoEm = now;
  }

  /// Construtor a partir do JSON retornado pelo Supabase (tabela public.vendas)
  factory VendaModel.fromSupabaseJson(Map<String, dynamic> json) {
    List<ItemVendaModel> itensParsed = [];
    if (json['items'] != null) {
      final rawItems = json['items'];
      if (rawItems is List) {
        itensParsed = rawItems.map((e) => ItemVendaModel.fromJson(Map<String, dynamic>.from(e as Map))).toList();
      } else if (rawItems is String) {
        try {
          final decoded = jsonDecode(rawItems);
          if (decoded is List) {
            itensParsed = decoded.map((e) => ItemVendaModel.fromJson(Map<String, dynamic>.from(e as Map))).toList();
          }
        } catch (_) {}
      }
    }

    List<String> pagamentosParsed = [];
    if (json['payments'] != null) {
      final rawPay = json['payments'];
      if (rawPay is List) {
        pagamentosParsed = rawPay.map((e) {
          if (e is Map) return e['method']?.toString() ?? 'DINHEIRO';
          return e.toString();
        }).toList();
      }
    }

    return VendaModel()
      ..supabaseId = json['id']?.toString() ?? ''
      ..numeroFatura = json['invoiceNumber']?.toString() ?? json['numeroFatura']?.toString() ?? ''
      ..itens = itensParsed
      ..subtotal = _toDouble(json['subtotal'])
      ..totalDesconto = _toDouble(json['discountTotal'] ?? json['totalDesconto'])
      ..total = _toDouble(json['total'])
      ..totalCusto = _toDouble(json['totalCost'] ?? json['totalCusto'])
      ..formasPagamento = pagamentosParsed
      ..valorRecebido = json['amountReceived'] != null ? _toDouble(json['amountReceived']) : null
      ..troco = _toDouble(json['change'] ?? json['troco'])
      ..vendedorId = json['sellerId']?.toString() ?? json['vendedorId']?.toString() ?? ''
      ..vendedorNome = json['sellerName']?.toString() ?? json['vendedorNome']?.toString() ?? ''
      ..vendedorCargo = json['sellerRole']?.toString() ?? json['vendedorCargo']?.toString() ?? 'VENDEDOR'
      ..clienteNome = json['customerName']?.toString() ?? json['clienteNome']?.toString()
      ..clienteNif = json['customerNif']?.toString() ?? json['clienteNif']?.toString()
      ..observacoes = json['notes']?.toString() ?? json['observacoes']?.toString()
      ..status = json['status']?.toString() ?? 'CONCLUIDA'
      ..canceladoEm = json['cancelledAt'] != null ? DateTime.tryParse(json['cancelledAt'].toString())?.toUtc() : null
      ..canceladoPor = json['cancelledBy']?.toString()
      ..motivoCancelamento = json['cancellationReason']?.toString()
      ..sincronizado = true
      ..atualizadoEm = json['atualizadoEm'] != null
          ? DateTime.tryParse(json['atualizadoEm'].toString())?.toUtc() ?? DateTime.now().toUtc()
          : DateTime.now().toUtc()
      ..criadoEm = json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString())?.toUtc() ?? DateTime.now().toUtc()
          : DateTime.now().toUtc();
  }

  /// Converte para o schema rigoroso da tabela public.vendas no Supabase
  Map<String, dynamic> toSupabaseJson() {
    return {
      'id': supabaseId, // UUID string
      'invoiceNumber': numeroFatura,
      'items': itens.map((item) => item.toJson()).toList(),
      'subtotal': double.parse(subtotal.toStringAsFixed(2)),
      'discountTotal': double.parse(totalDesconto.toStringAsFixed(2)),
      'total': double.parse(total.toStringAsFixed(2)),
      'totalCost': double.parse(totalCusto.toStringAsFixed(2)),
      'payments': formasPagamento.map((p) => {'method': p, 'amount': total}).toList(),
      'amountReceived': valorRecebido != null ? double.parse(valorRecebido!.toStringAsFixed(2)) : null,
      'change': double.parse(troco.toStringAsFixed(2)),
      'sellerId': vendedorId,
      'sellerName': vendedorNome,
      'sellerRole': vendedorCargo,
      'customerName': clienteNome,
      'customerNif': clienteNif,
      'notes': observacoes,
      'status': status,
      'cancelledAt': canceladoEm?.toUtc().toIso8601String(),
      'cancelledBy': canceladoPor,
      'cancellationReason': motivoCancelamento,
      'createdAt': criadoEm.toUtc().toIso8601String(),
    };
  }

  /// Realiza cancelamento local da venda respeitando a janela permitida
  void cancelarVendaLocalmente({
    required String usuarioNome,
    required String motivo,
  }) {
    status = 'CANCELADA';
    canceladoEm = DateTime.now().toUtc();
    canceladoPor = usuarioNome;
    motivoCancelamento = motivo;
    sincronizado = false;
    atualizadoEm = DateTime.now().toUtc();
  }

  static double _toDouble(dynamic value) {
    if (value == null) return 0.0;
    if (value is num) return value.toDouble();
    if (value is String) {
      return double.tryParse(value.replaceAll(',', '.')) ?? 0.0;
    }
    return 0.0;
  }
}
