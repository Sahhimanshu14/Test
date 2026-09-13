/**
 * Sensitive Data Log Redaction Utility
 * Prevents credential, token, and session cookie leakage in application logs and telemetry.
 */

const SENSITIVE_KEYS = new Set([
  'password',
  'currentpassword',
  'newpassword',
  'passwordhash',
  'token',
  'refreshtoken',
  'accesstoken',
  'verificationtoken',
  'resetpasswordtoken',
  'authorization',
  'cookie',
  'set-cookie',
  'secret',
  'apikey',
  'api_key',
  'jwt_access_secret',
  'jwt_refresh_secret',
]);

const JWT_PATTERN = /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g;
const BEARER_PATTERN = /Bearer\s+([a-zA-Z0-9._\-]+)/gi;
const COOKIE_AUTH_PATTERN = /cdsprep_refresh_token=([a-zA-Z0-9._\-]+)/gi;

/**
 * Sanitizes a string message by redacting JWTs, Bearer headers, and cookies.
 */
export function sanitizeLogString(message: string): string {
  if (!message || typeof message !== 'string') return message;

  return message
    .replace(BEARER_PATTERN, 'Bearer [REDACTED_TOKEN]')
    .replace(JWT_PATTERN, '[REDACTED_JWT]')
    .replace(COOKIE_AUTH_PATTERN, 'cdsprep_refresh_token=[REDACTED_COOKIE]');
}

/**
 * Deeply redacts sensitive fields from objects or arrays prior to logging.
 */
export function sanitizeLogData(data: unknown, depth = 0): unknown {
  if (depth > 6) return '[MAX_DEPTH]';
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    return sanitizeLogString(data);
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLogData(item, depth + 1));
  }

  if (typeof data === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (SENSITIVE_KEYS.has(lowerKey) || lowerKey.includes('password') || lowerKey.includes('secret')) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeLogData(value, depth + 1);
      } else if (typeof value === 'string') {
        sanitized[key] = sanitizeLogString(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  return data;
}
