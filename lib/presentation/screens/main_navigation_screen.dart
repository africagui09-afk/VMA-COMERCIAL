import 'package:flutter/material.dart';
import '../../core/auth/rbac_guard.dart';
import '../../core/auth/session_manager.dart';
import '../../core/auth/user_role.dart';
import 'dashboard_screen.dart';
import 'estoque_screen.dart';
import 'pdv_screen.dart';

/// Tela de Navegação Principal do KwanzaPOS com Seletor Rápido de Perfil RBAC
class MainNavigationScreen extends StatefulWidget {
  const MainNavigationScreen({Key? key}) : super(key: key);

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  final SessionManager _sessionManager = SessionManager();
  int _indiceAbaAtual = 0;

  @override
  void initState() {
    super.initState();
    // Inicia por padrão com um perfil de Gerente para visualização completa
    if (!_sessionManager.estaAutenticado) {
      _sessionManager.alternarPerfilRapido(UserRole.gerente);
    }
    _sessionManager.addListener(_aoMudarSessao);
  }

  @override
  void dispose() {
    _sessionManager.removeListener(_aoMudarSessao);
    super.dispose();
  }

  void _aoMudarSessao() {
    if (mounted) {
      // Se mudou para Vendedor e estava em tela bloqueada, volta para o PDV
      if (_sessionManager.cargoAtual == UserRole.vendedor && _indiceAbaAtual != 0) {
        setState(() => _indiceAbaAtual = 0);
      } else {
        setState(() {});
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final cargoAtual = _sessionManager.cargoAtual;
    final isVendedor = cargoAtual == UserRole.vendedor;

    // Lista de telas disponíveis com base no RBAC Guard
    final List<Widget> telas = [
      const PdvScreen(),
      const EstoqueScreen(),
      const DashboardScreen(),
    ];

    return Scaffold(
      backgroundColor: const Color(0xFF0B0F17),
      body: Row(
        children: [
          // Barra Lateral de Navegação (NavigationRail) para Telas Médias e Largas
          NavigationRail(
            backgroundColor: const Color(0xFF111622),
            selectedIndex: _indiceAbaAtual,
            onDestinationSelected: (int index) {
              if (isVendedor && index != 0) {
                _mostrarAlertaAcessoNegado();
                return;
              }
              setState(() => _indiceAbaAtual = index);
            },
            labelType: NavigationRailLabelType.all,
            leading: Column(
              children: [
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: const Color(0xFF059669), borderRadius: BorderRadius.circular(10)),
                  child: const Icon(Icons.point_of_sale, color: Colors.white, size: 24),
                ),
                const SizedBox(height: 6),
                const Text('KwanzaPOS', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                const SizedBox(height: 20),
              ],
            ),
            trailing: Expanded(
              child: Align(
                alignment: Alignment.bottomCenter,
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 16.0),
                  child: PopupMenuButton<UserRole>(
                    tooltip: 'Alternar Perfil RBAC',
                    color: const Color(0xFF161C27),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: Color(0xFF273349))),
                    onSelected: (UserRole novoCargo) {
                      _sessionManager.alternarPerfilRapido(novoCargo);
                    },
                    itemBuilder: (context) => [
                      _buildItemMenuCargo(UserRole.vendedor, 'Vendedor (PDV Único / Teto 900k)'),
                      _buildItemMenuCargo(UserRole.gerente, 'Gerente (Estoque & Trava 1h)'),
                      _buildItemMenuCargo(UserRole.administrador, 'Administrador (Acesso Total)'),
                    ],
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                      decoration: BoxDecoration(
                        color: const Color(0xFF161C27),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFF334155)),
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.badge_outlined, size: 18, color: _getCorCargo(cargoAtual)),
                          const SizedBox(height: 4),
                          Text(cargoAtual.valorBanco, style: TextStyle(color: _getCorCargo(cargoAtual), fontSize: 9, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
            destinations: [
              const NavigationRailDestination(
                icon: Icon(Icons.shopping_bag_outlined),
                selectedIcon: Icon(Icons.shopping_bag, color: Color(0xFF34D399)),
                label: Text('PDV Caixa', style: TextStyle(fontSize: 11)),
              ),
              NavigationRailDestination(
                icon: Icon(isVendedor ? Icons.lock_outline : Icons.inventory_2_outlined),
                selectedIcon: const Icon(Icons.inventory_2, color: Color(0xFF60A5FA)),
                label: Text(isVendedor ? 'Estoque (Bloq)' : 'Estoque', style: TextStyle(fontSize: 11, color: isVendedor ? const Color(0xFF64748B) : null)),
              ),
              NavigationRailDestination(
                icon: Icon(isVendedor ? Icons.lock_outline : Icons.analytics_outlined),
                selectedIcon: const Icon(Icons.analytics, color: Color(0xFF34D399)),
                label: Text(isVendedor ? 'Painel (Bloq)' : 'Dashboard', style: TextStyle(fontSize: 11, color: isVendedor ? const Color(0xFF64748B) : null)),
              ),
            ],
          ),

          // Divisor Vertical
          Container(width: 1, color: const Color(0xFF1E293B)),

          // Tela Ativa
          Expanded(
            child: IndexedStack(
              index: _indiceAbaAtual,
              children: telas,
            ),
          ),
        ],
      ),
      // Barra Inferior para telas compactas
      bottomNavigationBar: MediaQuery.of(context).size.width < 600
          ? BottomNavigationBar(
              backgroundColor: const Color(0xFF111622),
              selectedItemColor: const Color(0xFF34D399),
              unselectedItemColor: const Color(0xFF64748B),
              currentIndex: _indiceAbaAtual,
              onTap: (index) {
                if (isVendedor && index != 0) {
                  _mostrarAlertaAcessoNegado();
                  return;
                }
                setState(() => _indiceAbaAtual = index);
              },
              items: [
                const BottomNavigationBarItem(icon: Icon(Icons.point_of_sale), label: 'PDV'),
                BottomNavigationBarItem(
                  icon: Icon(isVendedor ? Icons.lock_outline : Icons.inventory_2),
                  label: isVendedor ? 'Estoque (Bloq)' : 'Estoque',
                ),
                BottomNavigationBarItem(
                  icon: Icon(isVendedor ? Icons.lock_outline : Icons.analytics),
                  label: isVendedor ? 'Painel (Bloq)' : 'Dashboard',
                ),
              ],
            )
          : null,
    );
  }

  PopupMenuItem<UserRole> _buildItemMenuCargo(UserRole cargo, String titulo) {
    final ativo = _sessionManager.cargoAtual == cargo;
    return PopupMenuItem<UserRole>(
      value: cargo,
      child: Row(
        children: [
          Icon(ativo ? Icons.radio_button_checked : Icons.radio_button_off, color: _getCorCargo(cargo), size: 16),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              titulo,
              style: TextStyle(
                color: ativo ? Colors.white : const Color(0xFFCBD5E1),
                fontSize: 11,
                fontWeight: ativo ? FontWeight.bold : FontWeight.normal,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Color _getCorCargo(UserRole cargo) {
    switch (cargo) {
      case UserRole.vendedor:
        return const Color(0xFFF59E0B);
      case UserRole.gerente:
        return const Color(0xFF3B82F6);
      case UserRole.administrador:
        return const Color(0xFF10B981);
    }
  }

  void _mostrarAlertaAcessoNegado() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Acesso Bloqueado: O perfil VENDEDOR possui acesso exclusivo à Frente de Caixa.'),
        backgroundColor: Color(0xFFEF4444),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}
