import { User, UserRole } from '../types';
import { getSupabaseClient } from './supabase';

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  passwordHash?: string;
  pin?: string;
  active: boolean;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  user: User;
  token: string;
  loginAt: string;
  expiresAt: string;
}

// Chave do storage para sessão ativa
const STORAGE_KEYS = {
  SESSION: 'kwanzapos_auth_session_v2',
  PROFILES: 'kwanzapos_profiles_v2',
};

// Perfis reais da VMA Comercial Lda (Saurimo, Angola)
export const REAL_PROFILES: Profile[] = [
  {
    id: 'usr-admin-victor',
    name: 'Victor Abreu',
    email: 'victorabreu528@gmail.com',
    role: 'ADMINISTRADOR',
    pin: '2026',
    active: true,
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'usr-gerente-mauro',
    name: 'Mauro Jorge',
    email: 'mauro.jorge@vma.co.ao',
    role: 'GERENTE',
    pin: '2026',
    active: true,
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'usr-vendedor-daniel',
    name: 'Daniel Muzala',
    email: 'daniel.muzala@vma.co.ao',
    role: 'VENDEDOR',
    pin: '2026',
    active: true,
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'usr-vendedor-alberto',
    name: 'Alberto Lito',
    email: 'alberto.lito@vma.co.ao',
    role: 'VENDEDOR',
    pin: '2026',
    active: true,
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: '2026-01-01T08:00:00.000Z',
  },
];

/**
 * Gera hash criptografado SHA-256 usando Web Crypto API
 */
export async function sha256Hash(text: string): Promise<string> {
  try {
    const msgUint8 = new TextEncoder().encode(text.trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    console.warn('Fallback para hash básico:', err);
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }
}

/**
 * Obtém os perfis armazenados localmente com fallback aos reais
 */
export function getStoredProfiles(): Profile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(REAL_PROFILES));
      return REAL_PROFILES;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(REAL_PROFILES));
      return REAL_PROFILES;
    }
    return parsed;
  } catch {
    return REAL_PROFILES;
  }
}

export function saveStoredProfiles(profiles: Profile[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
  } catch (err) {
    console.error('Erro ao salvar perfis:', err);
  }
}

/**
 * Obtém a sessão de autenticação ativa
 */
export function getCurrentSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (!raw) return null;
    const session: AuthSession = JSON.parse(raw);
    // Valida expiração (24 horas)
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function getCurrentAuthUser(): User | null {
  const session = getCurrentSession();
  return session ? session.user : null;
}

/**
 * Executa o Login real com E-mail e Senha conectando ao Supabase Auth e tabela profiles
 */
export async function authenticateWithEmailPassword(
  emailInput: string,
  passwordInput: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  const email = emailInput.trim().toLowerCase();
  const password = passwordInput.trim();

  if (!email || !password) {
    return { success: false, error: 'Por favor preencha o E-mail e a Senha.' };
  }

  const client = getSupabaseClient();
  let verifiedProfile: Profile | null = null;

  // 1. Tentar autenticação via Supabase se online
  if (client && navigator.onLine) {
    try {
      const { data: authData, error: authError } = await client.auth.signInWithPassword({
        email,
        password,
      });

      if (!authError && authData.user) {
        // Buscar perfil na tabela 'profiles' do Supabase
        const { data: profileData } = await client
          .from('profiles')
          .select('*')
          .eq('email', email)
          .single();

        if (profileData) {
          verifiedProfile = {
            id: profileData.id || authData.user.id,
            name: profileData.name || profileData.nome || email.split('@')[0],
            email: profileData.email || email,
            role: (profileData.role || profileData.perfil || 'VENDEDOR') as UserRole,
            pin: profileData.pin || '2026',
            active: profileData.active !== undefined ? profileData.active : true,
            createdAt: profileData.created_at || new Date().toISOString(),
            updatedAt: profileData.updated_at || new Date().toISOString(),
          };
        }
      }
    } catch (supaErr) {
      console.warn('Tentativa no Supabase Auth falhou, acionando verificação segura local:', supaErr);
    }
  }

  // 2. Verificação local contra a lista de perfis reais autorizados
  if (!verifiedProfile) {
    const profiles = getStoredProfiles();
    const found = profiles.find((p) => p.email.toLowerCase() === email && p.active);

    if (!found) {
      return {
        success: false,
        error: `E-mail não autorizado: "${email}". Apenas usuários registrados da VMA Comercial têm acesso.`,
      };
    }

    // Regras de validação de senha offline/criptografada:
    // Aceita a senha padrão do sistema 'vma2026', 'admin123' / 'gerente123' / 'vendedor123',
    // ou o PIN cadastrado ('2026'), ou o hash criptografado se definido.
    const inputHash = await sha256Hash(password);
    const isStandardValid =
      password === 'vma2026' ||
      password === '2026' ||
      (found.role === 'ADMINISTRADOR' && (password === 'admin123' || password === 'Admin@2026')) ||
      (found.role === 'GERENTE' && (password === 'gerente123' || password === 'Gerente@2026')) ||
      (found.role === 'VENDEDOR' && (password === 'vendedor123' || password === 'Vendedor@2026')) ||
      (found.passwordHash && found.passwordHash === inputHash) ||
      (found.pin && password === found.pin);

    if (!isStandardValid) {
      return { success: false, error: 'Credencial inválida. Verifique sua senha e tente novamente.' };
    }

    verifiedProfile = found;
  }

  if (!verifiedProfile) {
    return { success: false, error: 'Falha na autenticação do operador.' };
  }

  const user: User = {
    id: verifiedProfile.id,
    name: verifiedProfile.name,
    email: verifiedProfile.email,
    role: verifiedProfile.role,
    pin: verifiedProfile.pin,
  };

  // Salva sessão válida por 24 horas
  const session: AuthSession = {
    user,
    token: `tok_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    loginAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));

  // Tenta sincronizar perfil com o Supabase se possível
  if (client && navigator.onLine) {
    try {
      await client
        .from('profiles')
        .upsert(
          {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            last_login: new Date().toISOString(),
          },
          { onConflict: 'email' }
        );
    } catch {
      // safe fallback
    }
  }

  return { success: true, user };
}

/**
 * Validação estrita para troca de usuário.
 * Qualquer tentativa com senha em branco ou incorreta é rejeitada.
 */
export async function verifyAndSwitchProfile(
  targetEmail: string,
  passwordInput: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  const email = (targetEmail || '').trim().toLowerCase();
  const password = (passwordInput || '').trim();

  if (!email) {
    return { success: false, error: 'Selecione um perfil de utilizador válido.' };
  }

  if (!password) {
    return {
      success: false,
      error: 'Palavra-passe obrigatória. O acesso foi bloqueado por segurança.',
    };
  }

  // Utiliza o validador rigoroso com suporte a Supabase e perfis criptografados
  const authResult = await authenticateWithEmailPassword(email, password);
  return authResult;
}

/**
 * Encerra a sessão do usuário e aciona bloqueio estrito
 */
export function logoutSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  } catch (err) {
    console.error('Erro ao efetuar logout:', err);
  }
}

export const logoutUser = logoutSession;

export function refreshSessionUser(): User | null {
  const session = getCurrentSession();
  return session ? session.user : null;
}

/**
 * Atualiza a credencial/senha de um usuário (exclusivo para ADMINISTRADOR)
 */
export async function updateUserCredentials(
  adminUser: User,
  targetUserId: string,
  newRole: UserRole,
  newPin?: string,
  newPassword?: string
): Promise<{ success: boolean; error?: string }> {
  if (adminUser.role !== 'ADMINISTRADOR') {
    return { success: false, error: 'Acesso Negado: Privilégio Insuficiente.' };
  }

  const profiles = getStoredProfiles();
  const index = profiles.findIndex((p) => p.id === targetUserId);

  if (index === -1) {
    return { success: false, error: 'Usuário não encontrado.' };
  }

  const updated = { ...profiles[index] };
  updated.role = newRole;
  if (newPin && newPin.trim()) {
    updated.pin = newPin.trim();
  }
  if (newPassword && newPassword.trim()) {
    updated.passwordHash = await sha256Hash(newPassword.trim());
  }
  updated.updatedAt = new Date().toISOString();

  profiles[index] = updated;
  saveStoredProfiles(profiles);

  // Sincronizar com o Supabase
  const client = getSupabaseClient();
  if (client && navigator.onLine) {
    try {
      await client.from('profiles').upsert({
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role,
        pin: updated.pin,
        updated_at: updated.updatedAt,
      });
    } catch (err) {
      console.warn('Erro ao atualizar profiles no Supabase:', err);
    }
  }

  return { success: true };
}

/**
 * Auth Guard rules
 */
export const AuthGuards = {
  canAccessPDV: (_roleOrUser: UserRole | User) => true,
  canAccessEstoque: (roleOrUser: UserRole | User) => {
    const role = typeof roleOrUser === 'string' ? roleOrUser : roleOrUser.role;
    return role === 'ADMINISTRADOR' || role === 'GERENTE';
  },
  canAccessStock: (roleOrUser: UserRole | User) => {
    const role = typeof roleOrUser === 'string' ? roleOrUser : roleOrUser.role;
    return role === 'ADMINISTRADOR' || role === 'GERENTE';
  },
  canAccessVendas: (roleOrUser: UserRole | User) => {
    const role = typeof roleOrUser === 'string' ? roleOrUser : roleOrUser.role;
    return role === 'ADMINISTRADOR' || role === 'GERENTE';
  },
  canAccessSalesHistory: (roleOrUser: UserRole | User) => {
    const role = typeof roleOrUser === 'string' ? roleOrUser : roleOrUser.role;
    return role === 'ADMINISTRADOR' || role === 'GERENTE';
  },
  canAccessDashboard: (roleOrUser: UserRole | User) => {
    const role = typeof roleOrUser === 'string' ? roleOrUser : roleOrUser.role;
    return role === 'ADMINISTRADOR';
  },
  canAccessAnalytics: (roleOrUser: UserRole | User) => {
    const role = typeof roleOrUser === 'string' ? roleOrUser : roleOrUser.role;
    return role === 'ADMINISTRADOR';
  },
  canManageUsers: (roleOrUser: UserRole | User) => {
    const role = typeof roleOrUser === 'string' ? roleOrUser : roleOrUser.role;
    return role === 'ADMINISTRADOR';
  },
  canViewCostsAndProfits: (roleOrUser: UserRole | User) => {
    const role = typeof roleOrUser === 'string' ? roleOrUser : roleOrUser.role;
    return role === 'ADMINISTRADOR' || role === 'GERENTE';
  },
  canAccessFiadoManagement: (roleOrUser: UserRole | User) => {
    const role = typeof roleOrUser === 'string' ? roleOrUser : roleOrUser.role;
    return role === 'ADMINISTRADOR' || role === 'GERENTE';
  },
  canAccessExpenses: (roleOrUser: UserRole | User) => {
    const role = typeof roleOrUser === 'string' ? roleOrUser : roleOrUser.role;
    return role === 'ADMINISTRADOR' || role === 'GERENTE';
  },
};

// Re-export supabase client instance
export { getSupabaseClient } from './supabase';
export const supabase = getSupabaseClient();

/**
 * Objeto com getters do usuário atualmente autenticado
 */
export const usuarioLogado = {
  get nome() {
    const session = getCurrentSession();
    return session?.user?.name || 'Victor Abreu';
  },
  get cargo() {
    const session = getCurrentSession();
    return session?.user?.role || 'ADMINISTRADOR';
  },
  get email() {
    const session = getCurrentSession();
    return session?.user?.email || 'victorabreu528@gmail.com';
  },
  get id() {
    const session = getCurrentSession();
    return session?.user?.id || 'usr-admin-victor';
  },
};

/**
 * Verifica permissões de rota com base no perfil do usuário
 */
export function verificarPermissaoRota(rota: string): boolean {
  const session = getCurrentSession();
  const role = session?.user?.role || usuarioLogado.cargo;
  const rotaNormalizada = (rota || '').toLowerCase().trim();

  if (role === 'VENDEDOR') {
    return rotaNormalizada === 'pdv' || rotaNormalizada === 'frente de caixa';
  }

  if (role === 'GERENTE') {
    return (
      rotaNormalizada !== 'dashboard' &&
      rotaNormalizada !== 'dashboard analítico' &&
      rotaNormalizada !== 'painel analítico' &&
      rotaNormalizada !== 'analytics'
    );
  }

  return true;
}
