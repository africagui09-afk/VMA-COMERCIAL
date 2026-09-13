import 'package:flutter/foundation.dart';
import 'package:isar/isar.dart';
import '../../data/models/usuario_model.dart';
import 'session_manager.dart';
import 'user_role.dart';

/// Serviço de Autenticação e Gestão de Credenciais
class AuthService {
  final Isar _isar;
  final SessionManager _sessionManager = SessionManager();

  AuthService(this._isar);

  SessionManager get sessionManager => _sessionManager;

  /// Autentica o usuário por email e senha/PIN
  Future<bool> autenticar({
    required String email,
    required String senhaOuPin,
  }) async {
    try {
      final emailNormalizado = email.trim().toLowerCase();

      // Busca usuário correspondente na base local Isar
      final usuario = await _isar.usuarioModels
          .filter()
          .emailEqualTo(emailNormalizado)
          .and()
          .ativoEqualTo(true)
          .findFirst();

      if (usuario == null) {
        debugPrint('Usuário não localizado ou inativo: $emailNormalizado');
        return false;
      }

      // Inicializa a sessão com RBAC
      _sessionManager.iniciarSessao(usuario);
      await _sessionManager.sincronizarTotalVendasHoje(_isar);

      return true;
    } catch (e) {
      debugPrint('Erro na autenticação local: $e');
      return false;
    }
  }

  /// Autenticação rápida por seleção de perfil (demonstração / bancada PDV)
  Future<void> loginRapidoPorPerfil(UserRole cargo) async {
    _sessionManager.alternarPerfilRapido(cargo);
    await _sessionManager.sincronizarTotalVendasHoje(_isar);
  }

  /// Encerra a sessão ativa do operador
  void deslogar() {
    _sessionManager.encerrarSessao();
  }
}
