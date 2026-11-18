import prisma from './prisma';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory thread-safe rate limit store
const rateLimitStore = new Map<string, RateLimitRecord>();
const loginFailStore = new Map<string, { attempts: number; lockUntil: number }>();

// Periodic cleanup every 5 minutes to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      if (now > record.resetAt) {
        rateLimitStore.delete(key);
      }
    }
    for (const [key, record] of loginFailStore.entries()) {
      if (now > record.lockUntil) {
        loginFailStore.delete(key);
      }
    }
  }, 300000);
}

/**
 * Lightweight sliding window rate limiter
 * @param key unique identifier (e.g. IP or IP+route)
 * @param limit max requests allowed in the window
 * @param windowMs window size in milliseconds
 */
export function checkRateLimit(
  key: string,
  limit: number = 60,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; retryAfterSec: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  if (record.count >= limit) {
    const retryAfterSec = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  record.count += 1;
  return { allowed: true, remaining: limit - record.count, retryAfterSec: 0 };
}

/**
 * Brute-force protection for authentication endpoints
 * Limits consecutive failed logins to 5 per 15 minutes
 */
export function checkBruteForceLockout(identifier: string): { isLocked: boolean; remainingSeconds: number } {
  const now = Date.now();
  const record = loginFailStore.get(identifier);

  if (record && record.lockUntil > now) {
    const remainingSeconds = Math.ceil((record.lockUntil - now) / 1000);
    return { isLocked: true, remainingSeconds };
  }

  return { isLocked: false, remainingSeconds: 0 };
}

/**
 * Record a failed login attempt; trigger lockout after 5 fails
 */
export function recordFailedLogin(identifier: string) {
  const now = Date.now();
  const record = loginFailStore.get(identifier) || { attempts: 0, lockUntil: 0 };

  record.attempts += 1;
  if (record.attempts >= 5) {
    record.lockUntil = now + 15 * 60 * 1000; // 15 minutes lockout
  }

  loginFailStore.set(identifier, record);
}

/**
 * Clear failed login attempts upon successful login
 */
export function resetLoginAttempts(identifier: string) {
  loginFailStore.delete(identifier);
}

/**
 * Scan string payload for suspicious injection patterns
 */
export function detectSuspiciousPatterns(text: string): boolean {
  if (!text || typeof text !== 'string') return false;

  const suspiciousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /union\s+select/gi,
    /drop\s+table/gi,
    /--\s*$/gm,
    /\.\.\//g,
    /\/etc\/passwd/gi,
    /exec\s*\(/gi,
  ];

  return suspiciousPatterns.some((pattern) => pattern.test(text));
}

/**
 * Database Concurrency & ACID Retry Wrapper
 * Retries transactions that encounter deadlock or serialization failures in PostgreSQL (P2034 / 40001 / 40P01)
 */
export async function withTransactionRetry<T>(
  fn: (tx: any) => Promise<T>,
  maxRetriesOrOptions: number | { maxRetries?: number; maxWait?: number; timeout?: number } = 3,
  baseDelayMs: number = 100
): Promise<T> {
  const maxRetries = typeof maxRetriesOrOptions === 'number' ? maxRetriesOrOptions : (maxRetriesOrOptions?.maxRetries ?? 3);
  const txOptions = typeof maxRetriesOrOptions === 'object' ? maxRetriesOrOptions : {};
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await prisma.$transaction(fn, {
        maxWait: txOptions.maxWait ?? 15000,
        timeout: txOptions.timeout ?? 30000,
      });
    } catch (err: any) {
      attempt++;
      const isRetryable =
        err?.code === 'P2034' || // Prisma transaction conflict
        err?.message?.includes('deadlock') ||
        err?.message?.includes('could not serialize access') ||
        err?.message?.includes('database is locked');

      if (isRetryable && attempt < maxRetries) {
        const jitter = Math.random() * 50;
        const delay = baseDelayMs * Math.pow(2, attempt) + jitter;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Transaction failed after maximum retries.');
}
