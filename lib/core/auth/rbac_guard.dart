import '../../data/models/usuario_model.dart';
import 'user_role.dart';

/// Módulos e telas disponíveis no sistema KwanzaPOS
enum AppModuloTela {
  frenteDeCaixa,     // PDV (Apenas Vendedor, Gerente, Admin)
  controleEstoque,   // Apenas Gerente e Administrador
  dashboardAnalitico,// Apenas Administrador e Gerente
  historicoVendas,   // Vendedor (suas próprias vendas), Gerente e Admin (todas)
  configuracoes,     // Apenas Administrador
}

/// Resultado detalhado da validação do teto diário de vendas
class LimiteDiarioResult {
  final bool permitido;
  final double totalHoje;
  final double limiteDiario;
  final double saldoRestante;
  final String? mensagemErro;

  const LimiteDiarioResult({
    required this.permitido,
    required this.totalHoje,
    required this.limiteDiario,
    required this.saldoRestante,
    this.mensagemErro,
  });

  bool get limiteAtingido => saldoRestante <= 0.0;
}

/// Resultado detalhado da validação de cancelamento de vendas
class PermissaoCancelamentoResult {
  final bool permitido;
  final String? motivoRecusa;
  final Duration? tempoDecorrido;

  const PermissaoCancelamentoResult({
    required this.permitido,
    this.motivoRecusa,
    this.tempoDecorrido,
  });
}

/// Mecanismo Central de Controle de Acesso Local (RBAC Guard)
class RbacGuard {
  /// Limite padrão fixado por regra de negócio para o Vendedor (900.000 Kz)
  static const double limiteDiarioVendedor = 900000.0;

  /// Janela temporal máxima permitida para Gerentes cancelarem vendas (1 hora)
  static const Duration janelaCancelamentoGerente = Duration(hours: 1);

  // ==========================================
  // REGRAS PARA VENDEDOR
  // ==========================================

  /// VENDEDOR: Acesso exclusivo à Frente de Caixa (PDV).
  /// Bloqueio de navegação para Controle de Estoque, Dashboards e Configurações.
  static bool podeAcessarModulo(UsuarioModel? usuario, AppModuloTela modulo) {
    if (usuario == null) return false;
    final role = UserRole.aPartirDeTexto(usuario.cargo);

    switch (role) {
      case UserRole.vendedor:
        // Vendedor tem acesso restrito exclusivamente à Frente de Caixa
        return modulo == AppModuloTela.frenteDeCaixa;
      case UserRole.gerente:
        // Gerente pode acessar PDV, Estoque e Histórico de Vendas
        return modulo == AppModuloTela.frenteDeCaixa ||
            modulo == AppModuloTela.controleEstoque ||
            modulo == AppModuloTela.historicoVendas ||
            modulo == AppModuloTela.dashboardAnalitico;
      case UserRole.administrador:
        // Administrador tem liberação total, absoluta e irrestrita
        return true;
    }
  }

  /// VENDEDOR: Bloqueio absoluto de leitura de preços de custo
  static bool podeVerPrecoCusto(UsuarioModel? usuario) {
    if (usuario == null) return false;
    final role = UserRole.aPartirDeTexto(usuario.cargo);
    return role == UserRole.administrador || role == UserRole.gerente;
  }

  /// VENDEDOR: Bloqueio absoluto de leitura de margens de lucro líquido ou bruto
  static bool podeVerMargemLucro(UsuarioModel? usuario) {
    if (usuario == null) return false;
    final role = UserRole.aPartirDeTexto(usuario.cargo);
    return role == UserRole.administrador || role == UserRole.gerente;
  }

  /// VENDEDOR: Bloqueio absoluto de relatórios de estoque geral e financeiro
  static bool podeAcessarRelatoriosGerais(UsuarioModel? usuario) {
    if (usuario == null) return false;
    final role = UserRole.aPartirDeTexto(usuario.cargo);
    return role == UserRole.administrador || role == UserRole.gerente;
  }

  /// Valida o limite diário de 900.000 Kz do Vendedor
  /// Impede novas vendas caso o teto seja atingido ou ultrapassado.
  static LimiteDiarioResult validarLimiteDiario({
    required UsuarioModel usuario,
    required double totalVendasHoje,
    required double valorNovaVenda,
  }) {
    final role = UserRole.aPartirDeTexto(usuario.cargo);

    // Gerente e Administrador não possuem teto de vendas
    if (role != UserRole.vendedor) {
      return LimiteDiarioResult(
        permitido: true,
        totalHoje: totalVendasHoje,
        limiteDiario: double.infinity,
        saldoRestante: double.infinity,
      );
    }

    final limite = usuario.limiteDiario > 0 ? usuario.limiteDiario : limiteDiarioVendedor;
    final projetado = totalVendasHoje + valorNovaVenda;
    final saldo = (limite - totalVendasHoje).clamp(0.0, double.infinity);

    if (totalVendasHoje >= limite) {
      return LimiteDiarioResult(
        permitido: false,
        totalHoje: totalVendasHoje,
        limiteDiario: limite,
        saldoRestante: 0.0,
        mensagemErro:
            'Bloqueio de Vendas: Limite diário de 900.000 Kz atingido para este operador. Novos registros estão bloqueados até o dia seguinte.',
      );
    }

    if (projetado > limite) {
      return LimiteDiarioResult(
        permitido: false,
        totalHoje: totalVendasHoje,
        limiteDiario: limite,
        saldoRestante: saldo,
        mensagemErro:
            'Limite Diário Excedido: Esta venda de ${valorNovaVenda.toStringAsFixed(2)} Kz ultrapassa o limite restante de ${saldo.toStringAsFixed(2)} Kz (Total hoje: ${totalVendasHoje.toStringAsFixed(2)} Kz de ${limite.toStringAsFixed(2)} Kz).',
      );
    }

    return LimiteDiarioResult(
      permitido: true,
      totalHoje: totalVendasHoje,
      limiteDiario: limite,
      saldoRestante: (limite - projetado).clamp(0.0, double.infinity),
    );
  }

  // ==========================================
  // REGRAS PARA GERENTE
  // ==========================================

  /// GERENTE: Permissão de cadastro, entrada, saída e ajuste de estoque
  static bool podeGerenciarEstoque(UsuarioModel? usuario) {
    if (usuario == null) return false;
    final role = UserRole.aPartirDeTexto(usuario.cargo);
    return role == UserRole.administrador || role == UserRole.gerente;
  }

  /// GERENTE: Trava estrita temporal que só autoriza o cancelamento de uma venda
  /// se o tempo decorrido for estritamente menor que 1 hora (< 60 minutos).
  static PermissaoCancelamentoResult validarCancelamentoVenda({
    required UsuarioModel usuario,
    required DateTime dataVenda,
    DateTime? momentoAtual,
  }) {
    final role = UserRole.aPartirDeTexto(usuario.cargo);
    final agora = momentoAtual?.toUtc() ?? DateTime.now().toUtc();
    final diferenca = agora.difference(dataVenda.toUtc());

    // 1. VENDEDOR: Nunca pode cancelar vendas
    if (role == UserRole.vendedor) {
      return const PermissaoCancelamentoResult(
        permitido: false,
        motivoRecusa:
            'Acesso Negado: Vendedores não possuem permissão para cancelar ou estornar vendas. Solicite a autorização de um Gerente ou Administrador.',
      );
    }

    // 2. ADMINISTRADOR: Liberação total e irrestrita (inclusive após 1 hora)
    if (role == UserRole.administrador) {
      return PermissaoCancelamentoResult(
        permitido: true,
        tempoDecorrido: diferenca,
      );
    }

    // 3. GERENTE: Trava estrita de 1 hora
    if (role == UserRole.gerente) {
      if (diferenca > janelaCancelamentoGerente) {
        final minutosDecorridos = diferenca.inMinutes;
        return PermissaoCancelamentoResult(
          permitido: false,
          tempoDecorrido: diferenca,
          motivoRecusa:
              'Trava de Segurança: A venda foi realizada há $minutosDecorridos minutos (superior ao limite de 1 hora). O perfil Gerente não tem autorização para cancelá-la após 60 minutos. Apenas um Administrador pode efetuar este cancelamento.',
        );
      }

      return PermissaoCancelamentoResult(
        permitido: true,
        tempoDecorrido: diferenca,
      );
    }

    return const PermissaoCancelamentoResult(
      permitido: false,
      motivoRecusa: 'Usuário sem permissões válidas para esta operação.',
    );
  }

  // ==========================================
  // REGRAS PARA ADMINISTRADOR
  // ==========================================

  /// ADMINISTRADOR: Exclusão total, reset do banco local e purga de tabelas
  static bool podePurgarDados(UsuarioModel? usuario) {
    if (usuario == null) return false;
    final role = UserRole.aPartirDeTexto(usuario.cargo);
    return role == UserRole.administrador;
  }

  /// ADMINISTRADOR: Modificação de configurações e credenciais de nuvem
  static bool podeAlterarConfiguracoesGlobais(UsuarioModel? usuario) {
    if (usuario == null) return false;
    final role = UserRole.aPartirDeTexto(usuario.cargo);
    return role == UserRole.administrador;
  }
}
