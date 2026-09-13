import 'package:isar/isar.dart';

part 'despesa_model.g.dart';

@collection
class DespesaModel {
  Id id = Isar.autoIncrement;

  @Index(unique: true, replace: true)
  late String supabaseId; // UUID v4 em String

  @Index()
  late String descricao;

  late String categoria; // 'FIXA' | 'VARIAVEL' | 'SALARIO' | 'PERDA'

  late double valor; // Em Kwanza (Kz) com precisão estrita

  late DateTime data;

  late String registradoPor;

  // Requisitos Obrigatórios Offline-First
  late bool sincronizado;
  late DateTime atualizadoEm;
  late DateTime criadoEm;

  DespesaModel();

  /// Construtor de fábrica para lançamento local offline imediato
  factory DespesaModel.criarLocal({
    required String supabaseId,
    required String descricao,
    required String categoria,
    required double valor,
    required DateTime data,
    required String registradoPor,
  }) {
    final now = DateTime.now().toUtc();
    return DespesaModel()
      ..supabaseId = supabaseId
      ..descricao = descricao
      ..categoria = categoria
      ..valor = double.parse(valor.toStringAsFixed(2))
      ..data = data.toUtc()
      ..registradoPor = registradoPor
      ..sincronizado = false
      ..atualizadoEm = now
      ..criadoEm = now;
  }

  /// Construtor a partir do JSON da tabela public.despesas no Supabase
  factory DespesaModel.fromSupabaseJson(Map<String, dynamic> json) {
    return DespesaModel()
      ..supabaseId = json['id']?.toString() ?? ''
      ..descricao = json['description']?.toString() ?? json['descricao']?.toString() ?? ''
      ..categoria = json['category']?.toString() ?? json['categoria']?.toString() ?? 'VARIAVEL'
      ..valor = _toDouble(json['amount'] ?? json['valor'])
      ..data = json['date'] != null
          ? DateTime.tryParse(json['date'].toString())?.toUtc() ?? DateTime.now().toUtc()
          : DateTime.now().toUtc()
      ..registradoPor = json['registeredBy']?.toString() ?? json['registradoPor']?.toString() ?? 'Operador'
      ..sincronizado = true
      ..atualizadoEm = json['updatedAt'] != null
          ? DateTime.tryParse(json['updatedAt'].toString())?.toUtc() ?? DateTime.now().toUtc()
          : DateTime.now().toUtc()
      ..criadoEm = json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString())?.toUtc() ?? DateTime.now().toUtc()
          : DateTime.now().toUtc();
  }

  /// Converte para o schema da tabela public.despesas no Supabase
  Map<String, dynamic> toSupabaseJson() {
    return {
      'id': supabaseId,
      'description': descricao,
      'category': categoria,
      'amount': double.parse(valor.toStringAsFixed(2)),
      'date': data.toUtc().toIso8601String().split('T')[0], // Formato YYYY-MM-DD
      'registeredBy': registradoPor,
      'updatedAt': atualizadoEm.toUtc().toIso8601String(),
      'createdAt': criadoEm.toUtc().toIso8601String(),
    };
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
