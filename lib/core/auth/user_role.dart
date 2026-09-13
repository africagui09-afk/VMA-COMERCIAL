/// Níveis de acesso e perfis de usuário do sistema KwanzaPOS
enum UserRole {
  vendedor,
  gerente,
  administrador;

  String get valorBanco {
    switch (this) {
      case UserRole.vendedor:
        return 'VENDEDOR';
      case UserRole.gerente:
        return 'GERENTE';
      case UserRole.administrador:
        return 'ADMINISTRADOR';
    }
  }

  String get rotuloExibicao {
    switch (this) {
      case UserRole.vendedor:
        return 'Vendedor de Caixa';
      case UserRole.gerente:
        return 'Gerente Operacional';
      case UserRole.administrador:
        return 'Administrador Geral';
    }
  }

  static UserRole aPartirDeTexto(String? texto) {
    if (texto == null) return UserRole.vendedor;
    final normalizado = texto.trim().toUpperCase();
    if (normalizado.contains('ADMIN')) return UserRole.administrador;
    if (normalizado.contains('GERENTE')) return UserRole.gerente;
    return UserRole.vendedor;
  }
}
