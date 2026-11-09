/**
 * Optional frontend error reporting (Sentry).
 * No-ops unless VITE_SENTRY_DSN is set at build time.
 * Never send Authorization headers or request bodies.
 */

import * as Sentry from '@sentry/react';

let initialized = false;

export function initFrontendMonitoring(): void {
  if (initialized) return;
  initialized = true;

  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (typeof dsn !== 'string' || !dsn.trim()) {
    return;
  }

  try {
    Sentry.init({
      dsn: dsn.trim(),
      environment: import.meta.env.VITE_SENTRY_ENVIRONMENT ?? import.meta.env.MODE,
      release: import.meta.env.VITE_SENTRY_RELEASE ?? undefined,
      tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0),
      beforeSend(event) {
        if (event.request?.headers) {
          for (const key of Object.keys(event.request.headers)) {
            if (/authorization|cookie|set-cookie/i.test(key)) {
              event.request.headers[key] = '[REDACTED]';
            }
          }
        }
        return event;
      },
    });
  } catch {
    // Monitoring must never break the UI.
  }
}

export function reportClientError(error: unknown, context?: Record<string, string>): void {
  try {
    if (!import.meta.env.VITE_SENTRY_DSN) {
      return;
    }
    Sentry.withScope((scope) => {
      if (context) {
        for (const [key, value] of Object.entries(context)) {
          scope.setTag(key, value);
        }
      }
      Sentry.captureException(error);
    });
  } catch {
    // ignore
  }
}
