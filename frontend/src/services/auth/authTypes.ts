/** Public admin profile from login /me — matches backend `toPublicAdmin`. */
export interface AdminUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  lastLoginAt: string | null;
  /** Portal identity — always `admin` (never internal RBAC role names). */
  actor: 'admin';
  permissions: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResult {
  accessToken: string;
  tokenType: string;
  expiresIn: string;
  admin: AdminUser;
}

export interface MeResult {
  admin: AdminUser;
}
