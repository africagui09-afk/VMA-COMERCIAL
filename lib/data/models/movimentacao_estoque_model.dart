import 'package:isar/isar.dart';

part 'movimentacao_estoque_model.g.dart';

@collection
class MovimentacaoEstoqueModel {
  Id id = Isar.autoIncrement;

  @Index(unique: true, replace: true)
  late String supabaseId; // UUID v4 em String

  @Index()
  late String produtoId; // UUID do produto referenciado

  late String tipo; // 'ENTRADA' | 'SAIDA' | 'AJUSTE' | 'VENDA' | 'CANCELAMENTO'

  late int quantidade;

  late int estoqueAnterior;

  late int estoqueResultante;

  String? motivo;

  late String responsavelId;

  late String responsavelNome;

  // Requisitos Obrigatórios Offline-First
  late bool sincronizado;
  late DateTime atualizadoEm;
  late DateTime criadoEm;

  MovimentacaoEstoqueModel();

  /// Construtor de fábrica nativo para gravação imediata local offline
  /// Executa baixa ou entrada instantânea no estoque local do PDV mesmo sem internet.
  factory MovimentacaoEstoqueModel.criarLocal({
    required String supabaseId,
    required String produtoId,
    required String tipo,
    required int quantidade,
    required int estoqueAnterior,
    required String responsavelId,
    required String responsavelNome,
    String? motivo,
  }) {
    final now = DateTime.now().toUtc();
    final resultante = tipo == 'ENTRADA' || tipo == 'CANCELAMENTO'
        ? (estoqueAnterior + quantidade)
        : (estoqueAnterior - quantidade).clamp(0, 999999);

    return MovimentacaoEstoqueModel()
      ..supabaseId = supabaseId
      ..produtoId = produtoId
      ..tipo = tipo
      ..quantidade = quantidade
      ..estoqueAnterior = estoqueAnterior
      ..estoqueResultante = resultante
      ..responsavelId = responsavelId
      ..responsavelNome = responsavelNome
      ..motivo = motivo
      ..sincronizado = false // Fila de sincronização ativa
      ..atualizadoEm = now
      ..criadoEm = now;
  }

  /// Construtor a partir do JSON do Supabase (public.movimentacoes_estoque)
  factory MovimentacaoEstoqueModel.fromSupabaseJson(Map<String, dynamic> json) {
    return MovimentacaoEstoqueModel()
      ..supabaseId = json['id']?.toString() ?? ''
      ..produtoId = json['productId']?.toString() ?? json['produtoId']?.toString() ?? ''
      ..tipo = json['type']?.toString() ?? json['tipo']?.toString() ?? 'AJUSTE'
      ..quantidade = (json['quantity'] ?? json['quantidade'] as num?)?.toInt() ?? 0
      ..estoqueAnterior = (json['previousStock'] ?? json['estoqueAnterior'] as num?)?.toInt() ?? 0
      ..estoqueResultante = (json['resultingStock'] ?? json['estoqueResultante'] as num?)?.toInt() ?? 0
      ..motivo = json['reason']?.toString() ?? json['motivo']?.toString()
      ..responsavelId = json['userId']?.toString() ?? json['responsavelId']?.toString() ?? ''
      ..responsavelNome = json['userName']?.toString() ?? json['responsavelNome']?.toString() ?? ''
      ..sincronizado = true
      ..atualizadoEm = json['updatedAt'] != null
          ? DateTime.tryParse(json['updatedAt'].toString())?.toUtc() ?? DateTime.now().toUtc()
          : DateTime.now().toUtc()
      ..criadoEm = json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString())?.toUtc() ?? DateTime.now().toUtc()
          : DateTime.now().toUtc();
  }

  /// Converte para o schema de banco de dados do Supabase
  Map<String, dynamic> toSupabaseJson() {
    return {
      'id': supabaseId,
      'productId': produtoId,
      'type': tipo,
      'quantity': quantidade,
      'previousStock': estoqueAnterior,
      'resultingStock': estoqueResultante,
      'reason': motivo,
      'userId': responsavelId,
      'userName': responsavelNome,
      'updatedAt': atualizadoEm.toUtc().toIso8601String(),
      'createdAt': criadoEm.toUtc().toIso8601String(),
    };
  }
}
