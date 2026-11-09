type AuthUnauthorizedListener = () => void;

const unauthorizedListeners = new Set<AuthUnauthorizedListener>();

/** Subscribe to global 401 handling (expired/revoked/missing token). */
export function onAuthUnauthorized(listener: AuthUnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

export function emitAuthUnauthorized(): void {
  for (const listener of unauthorizedListeners) {
    listener();
  }
}
