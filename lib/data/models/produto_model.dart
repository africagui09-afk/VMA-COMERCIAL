import 'package:isar/isar.dart';

part 'produto_model.g.dart';

@collection
class ProdutoModel {
  Id id = Isar.autoIncrement;

  @Index(unique: true, replace: true)
  late String supabaseId;

  @Index()
  late String nome;

  @Index()
  String? codigoBarras;

  late String categoria;

  late double precoVenda; // Em Kwanza (Kz)

  late double precoCusto; // Em Kwanza (Kz)

  late int estoqueAtual;

  late int estoqueMinimo;

  late String unidade; // 'un', 'cx', 'kg', 'L', etc.

  String? imagemUrl;

  // Controle Offline-First
  late bool sincronizado;
  late DateTime atualizadoEm;
  DateTime? criadoEm;

  ProdutoModel();

  /// Construtor para cadastro local offline
  factory ProdutoModel.criarLocal({
    required String supabaseId,
    required String nome,
    String? codigoBarras,
    required String categoria,
    required double precoVenda,
    required double precoCusto,
    required int estoqueAtual,
    int estoqueMinimo = 5,
    String unidade = 'un',
    String? imagemUrl,
  }) {
    final now = DateTime.now().toUtc();
    return ProdutoModel()
      ..supabaseId = supabaseId
      ..nome = nome
      ..codigoBarras = codigoBarras
      ..categoria = categoria
      ..precoVenda = double.parse(precoVenda.toStringAsFixed(2))
      ..precoCusto = double.parse(precoCusto.toStringAsFixed(2))
      ..estoqueAtual = estoqueAtual
      ..estoqueMinimo = estoqueMinimo
      ..unidade = unidade
      ..imagemUrl = imagemUrl
      ..sincronizado = false
      ..atualizadoEm = now
      ..criadoEm = now;
  }

  /// Construtor a partir do JSON do Supabase
  factory ProdutoModel.fromSupabaseJson(Map<String, dynamic> json) {
    return ProdutoModel()
      ..supabaseId = json['id']?.toString() ?? ''
      ..nome = json['name']?.toString() ?? json['nome']?.toString() ?? ''
      ..codigoBarras = json['barcode']?.toString() ?? json['codigoBarras']?.toString()
      ..categoria = json['category']?.toString() ?? json['categoria']?.toString() ?? 'Geral'
      ..precoVenda = _toDouble(json['price'] ?? json['precoVenda'])
      ..precoCusto = _toDouble(json['costPrice'] ?? json['precoCusto'])
      ..estoqueAtual = (json['stock'] ?? json['estoqueAtual'] as num?)?.toInt() ?? 0
      ..estoqueMinimo = (json['minStock'] ?? json['estoqueMinimo'] as num?)?.toInt() ?? 5
      ..unidade = json['unit']?.toString() ?? json['unidade']?.toString() ?? 'un'
      ..imagemUrl = json['imageUrl']?.toString() ?? json['imagemUrl']?.toString()
      ..sincronizado = true
      ..atualizadoEm = json['updatedAt'] != null
          ? DateTime.tryParse(json['updatedAt'].toString())?.toUtc() ?? DateTime.now().toUtc()
          : DateTime.now().toUtc()
      ..criadoEm = json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString())?.toUtc()
          : null;
  }

  /// Converte para o JSON das tabelas do Supabase (public.produtos)
  Map<String, dynamic> toSupabaseJson() {
    return {
      'id': supabaseId,
      'name': nome,
      'barcode': codigoBarras,
      'category': categoria,
      'price': double.parse(precoVenda.toStringAsFixed(2)),
      'costPrice': double.parse(precoCusto.toStringAsFixed(2)),
      'stock': estoqueAtual,
      'minStock': estoqueMinimo,
      'unit': unidade,
      'imageUrl': imagemUrl,
      'updatedAt': atualizadoEm.toUtc().toIso8601String(),
      'createdAt': (criadoEm ?? atualizadoEm).toUtc().toIso8601String(),
    };
  }

  /// Verifica se o item atingiu o alerta de estoque crítico
  bool get emAlertaEstoque => estoqueAtual <= estoqueMinimo;

  static double _toDouble(dynamic value) {
    if (value == null) return 0.0;
    if (value is num) return value.toDouble();
    if (value is String) {
      return double.tryParse(value.replaceAll(',', '.')) ?? 0.0;
    }
    return 0.0;
  }
}
