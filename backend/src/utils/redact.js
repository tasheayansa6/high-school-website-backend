/**
 * Safe redaction helpers for logs and monitoring. Never reverseable.
 */

const SENSITIVE_QUERY_KEYS =
  /([?&](?:token|access_token|refresh_token|password|secret|authorization)=)[^&]*/gi;

const SENSITIVE_HEADER_NAMES = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'proxy-authorization',
]);

function redactUrl(urlPath) {
  if (!urlPath || typeof urlPath !== 'string') {
    return urlPath;
  }
  return urlPath.replace(SENSITIVE_QUERY_KEYS, '$1[REDACTED]');
}

function redactHeaders(headers) {
  if (!headers || typeof headers !== 'object') {
    return undefined;
  }
  const out = {};
  for (const [key, value] of Object.entries(headers)) {
    if (SENSITIVE_HEADER_NAMES.has(String(key).toLowerCase())) {
      out[key] = '[REDACTED]';
    } else {
      out[key] = value;
    }
  }
  return out;
}

function containsSensitiveKey(key) {
  return /password|passwd|secret|token|authorization|cookie|database_url|smtp_pass|access_key/i.test(
    String(key || '')
  );
}

module.exports = {
  redactUrl,
  redactHeaders,
  containsSensitiveKey,
  SENSITIVE_HEADER_NAMES,
};
