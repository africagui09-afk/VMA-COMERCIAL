import 'package:flutter/foundation.dart';
import 'package:isar/isar.dart';
import '../../data/models/usuario_model.dart';
import '../../data/models/venda_model.dart';
import 'rbac_guard.dart';
import 'user_role.dart';

/// Gerenciador de Sessão e Autenticação Local com RBAC Guard
class SessionManager extends ChangeNotifier {
  static final SessionManager _instancia = SessionManager._interno();
  factory SessionManager() => _instancia;
  SessionManager._interno();

  UsuarioModel? _usuarioAtual;
  double _totalVendasHoje = 0.0;
  bool _carregando = false;

  UsuarioModel? get usuarioAtual => _usuarioAtual;
  bool get estaAutenticado => _usuarioAtual != null;
  bool get carregando => _carregando;
  double get totalVendasHoje => _totalVendasHoje;

  UserRole get cargoAtual => _usuarioAtual != null
      ? UserRole.aPartirDeTexto(_usuarioAtual!.cargo)
      : UserRole.vendedor;

  /// Autentica o usuário na sessão local
  void iniciarSessao(UsuarioModel usuario) {
    _usuarioAtual = usuario;
    notifyListeners();
  }

  /// Encerra a sessão local ativa
  void encerrarSessao() {
    _usuarioAtual = null;
    _totalVendasHoje = 0.0;
    notifyListeners();
  }

  /// Alterna rapidamente de perfil (ideal para testes de bancada e modo demonstração)
  void alternarPerfilRapido(UserRole novoCargo) {
    final now = DateTime.now().toUtc();
    final usuarioMock = UsuarioModel()
      ..supabaseId = 'user-mock-${novoCargo.valorBanco.toLowerCase()}'
      ..nome = '${novoCargo.rotuloExibicao} Demo'
      ..email = '${novoCargo.valorBanco.toLowerCase()}@kwanzapos.ao'
      ..cargo = novoCargo.valorBanco
      ..limiteDiario = novoCargo == UserRole.vendedor ? 900000.0 : double.infinity
      ..ativo = true
      ..sincronizado = true
      ..atualizadoEm = now
      ..criadoEm = now;

    iniciarSessao(usuarioMock);
  }

  // =======================================================
  // CÁLCULO E CONTROLE DO LIMITE DIÁRIO DO VENDEDOR
  // =======================================================

  /// Calcula a soma exata das vendas concluídas pelo usuário no dia atual no banco Isar
  Future<double> sincronizarTotalVendasHoje(Isar isar) async {
    if (_usuarioAtual == null) {
      _totalVendasHoje = 0.0;
      notifyListeners();
      return 0.0;
    }

    final agora = DateTime.now();
    final inicioDoDia = DateTime(agora.year, agora.month, agora.day).toUtc();
    final fimDoDia = inicioDoDia.add(const Duration(days: 1));

    try {
      // Consulta local rápida das vendas concluídas do operador hoje
      final vendasDoDia = await isar.vendaModels
          .filter()
          .vendedorIdEqualTo(_usuarioAtual!.supabaseId)
          .statusEqualTo('CONCLUIDA')
          .criadoEmBetween(inicioDoDia, fimDoDia)
          .findAll();

      double soma = 0.0;
      for (final v in vendasDoDia) {
        soma += v.total;
      }

      _totalVendasHoje = double.parse(soma.toStringAsFixed(2));
      notifyListeners();
      return _totalVendasHoje;
    } catch (e) {
      debugPrint('Erro ao calcular total de vendas do dia: $e');
      return _totalVendasHoje;
    }
  }

  /// Verifica se o vendedor atual pode registrar uma nova venda
  /// Bloqueia e impede novos registros se o limite de 900.000 Kz for atingido
  LimiteDiarioResult verificarPermissaoNovaVenda(double valorVenda) {
    if (_usuarioAtual == null) {
      return const LimiteDiarioResult(
        permitido: false,
        totalHoje: 0.0,
        limiteDiario: 0.0,
        saldoRestante: 0.0,
        mensagemErro: 'Operador não autenticado no PDV.',
      );
    }

    return RbacGuard.validarLimiteDiario(
      usuario: _usuarioAtual!,
      totalVendasHoje: _totalVendasHoje,
      valorNovaVenda: valorVenda,
    );
  }

  // =======================================================
  // VALIDAÇÃO DE RESTRIÇÕES DE ACESSO (VENDEDOR / GERENTE / ADMIN)
  // =======================================================

  /// Valida se o operador atual tem permissão para navegar até o módulo/tela
  bool podeAcessarModulo(AppModuloTela modulo) => RbacGuard.podeAcessarModulo(_usuarioAtual, modulo);

  /// VENDEDOR: Bloqueio absoluto de preço de custo
  bool get podeVerPrecoCusto => RbacGuard.podeVerPrecoCusto(_usuarioAtual);

  /// VENDEDOR: Bloqueio absoluto de margem de lucro
  bool get podeVerMargemLucro => RbacGuard.podeVerMargemLucro(_usuarioAtual);

  /// VENDEDOR: Bloqueio absoluto de relatórios gerais de estoque e financeiro
  bool get podeAcessarRelatorios => RbacGuard.podeAcessarRelatoriosGerais(_usuarioAtual);

  /// GERENTE: Permissão para cadastrar e gerenciar estoque
  bool get podeGerenciarEstoque => RbacGuard.podeGerenciarEstoque(_usuarioAtual);

  /// GERENTE / ADMIN: Valida o cancelamento com a trava estrita de 1 hora para Gerente
  PermissaoCancelamentoResult validarCancelamento(VendaModel venda) {
    if (_usuarioAtual == null) {
      return const PermissaoCancelamentoResult(
        permitido: false,
        motivoRecusa: 'Usuário não autenticado no sistema.',
      );
    }

    return RbacGuard.validarCancelamentoVenda(
      usuario: _usuarioAtual!,
      dataVenda: venda.criadoEm,
    );
  }

  /// ADMINISTRADOR: Liberação total para purgar e resetar dados locais
  bool get podePurgarDados => RbacGuard.podePurgarDados(_usuarioAtual);

  /// ADMINISTRADOR: Acesso a configurações e credenciais
  bool get podeAcessarConfiguracoes => RbacGuard.podeAlterarConfiguracoesGlobais(_usuarioAtual);
}
