/**
 * JWT access-token storage for TEACHER Bearer auth.
 *
 * Teacher JWTs use a different audience than admin JWTs, so they MUST NOT share
 * storage with `authToken.ts` (`aa_access_token`). Same strategy as admin:
 * in-memory + `sessionStorage` only (no localStorage, no refresh endpoint).
 *
 * Never log token values.
 */

const SESSION_KEY = 'aa_teacher_access_token';

let memoryToken: string | null = null;

export function getTeacherAccessToken(): string | null {
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

export function setTeacherAccessToken(token: string | null): void {
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

export function clearTeacherAccessToken(): void {
  setTeacherAccessToken(null);
}
