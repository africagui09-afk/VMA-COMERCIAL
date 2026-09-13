import 'package:isar/isar.dart';

part 'usuario_model.g.dart';

@collection
class UsuarioModel {
  Id id = Isar.autoIncrement;

  @Index(unique: true, replace: true)
  late String supabaseId;

  late String nome;

  @Index(unique: true)
  late String email;

  late String cargo; // 'VENDEDOR' | 'GERENTE' | 'ADMINISTRADOR'

  late double limiteDiario; // Padrão 900.000 Kz para Vendedores

  late bool ativo;

  // Controle Offline-First
  late bool sincronizado;
  late DateTime atualizadoEm;
  DateTime? criadoEm;

  UsuarioModel();

  /// Criação local de novo usuário
  factory UsuarioModel.criarLocal({
    required String supabaseId,
    required String nome,
    required String email,
    required String cargo,
    double limiteDiario = 900000.0,
    bool ativo = true,
  }) {
    final now = DateTime.now().toUtc();
    return UsuarioModel()
      ..supabaseId = supabaseId
      ..nome = nome
      ..email = email
      ..cargo = cargo
      ..limiteDiario = limiteDiario
      ..ativo = ativo
      ..sincronizado = false
      ..atualizadoEm = now
      ..criadoEm = now;
  }

  /// Mapeamento a partir do JSON do Supabase
  factory UsuarioModel.fromSupabaseJson(Map<String, dynamic> json) {
    return UsuarioModel()
      ..supabaseId = json['id']?.toString() ?? ''
      ..nome = json['nome']?.toString() ?? json['name']?.toString() ?? ''
      ..email = json['email']?.toString() ?? ''
      ..cargo = json['cargo']?.toString() ?? json['role']?.toString() ?? 'VENDEDOR'
      ..limiteDiario = _toDouble(json['limiteDiario'] ?? json['dailyLimit'] ?? 900000.0)
      ..ativo = json['ativo'] as bool? ?? json['active'] as bool? ?? true
      ..sincronizado = true
      ..atualizadoEm = json['atualizadoEm'] != null
          ? DateTime.tryParse(json['atualizadoEm'].toString())?.toUtc() ?? DateTime.now().toUtc()
          : DateTime.now().toUtc()
      ..criadoEm = json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString())?.toUtc()
          : null;
  }

  /// Conversão para o formato das tabelas do Supabase
  Map<String, dynamic> toSupabaseJson() {
    return {
      'id': supabaseId,
      'nome': nome,
      'email': email,
      'cargo': cargo,
      'limiteDiario': double.parse(limiteDiario.toStringAsFixed(2)),
      'ativo': ativo,
      'atualizadoEm': atualizadoEm.toUtc().toIso8601String(),
      'createdAt': (criadoEm ?? atualizadoEm).toUtc().toIso8601String(),
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
