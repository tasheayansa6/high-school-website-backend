function assertValidApiBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/$/, '');

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(
      `Invalid VITE_API_BASE_URL "${value}". Expected an absolute URL such as http://localhost:5000/api/v1.`,
    );
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`VITE_API_BASE_URL must use http or https (received ${parsed.protocol}).`);
  }

  if (!parsed.pathname.includes('/api/v1')) {
    console.warn(
      `[env] VITE_API_BASE_URL (${trimmed}) does not include "/api/v1". Verify this matches the Express mount path.`,
    );
  }

  return trimmed;
}

function readApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL;
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return assertValidApiBaseUrl(raw);
  }

  // Local backend default — verified PORT defaults to 5000 in backend/src/config/env.js
  return assertValidApiBaseUrl('http://localhost:5000/api/v1');
}

/**
 * Centralized frontend environment access.
 * Only `VITE_*` values are available in the browser; never put secrets here.
 */
export const env = {
  apiBaseUrl: readApiBaseUrl(),
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  mode: import.meta.env.MODE,
} as const;
