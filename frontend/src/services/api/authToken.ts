/**
 * JWT access-token storage for admin Bearer auth.
 *
 * Backend contract (see `backend/docs/AUTH.md`):
 * - No HttpOnly cookie auth.
 * - No refresh-token endpoint.
 * - Access JWT expires per `JWT_EXPIRES_IN` (default 8h).
 * - Logout increments `tokenVersion` so prior JWTs are rejected.
 *
 * Strategy:
 * 1. Keep the token in memory for the current JS runtime.
 * 2. Mirror to `sessionStorage` so a soft page reload in the same tab can
 *    restore the session and re-verify via `GET /admin/auth/me`.
 * 3. Do not use `localStorage` / remember-me. Persistent cross-session storage
 *    without HttpOnly cookies increases XSS token theft risk and is not
 *    backed by a refresh flow.
 *
 * Never log token values.
 */

const SESSION_KEY = 'aa_access_token';

let memoryToken: string | null = null;

export function getAccessToken(): string | null {
  if (memoryToken) {
    return memoryToken;
  }
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const stored = window.sessionStorage.getItem(SESSION_KEY);
    memoryToken = stored;
    return stored;
  } catch {
    return null;
  }
}

export function setAccessToken(token: string | null): void {
  memoryToken = token;
  if (typeof window === 'undefined') {
    return;
  }
  try {
    if (token) {
      window.sessionStorage.setItem(SESSION_KEY, token);
    } else {
      window.sessionStorage.removeItem(SESSION_KEY);
    }
  } catch {
    /* ignore storage failures */
  }
}

export function clearAccessToken(): void {
  setAccessToken(null);
}
