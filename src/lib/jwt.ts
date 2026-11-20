/**
 * JWT Token Utilities — VARENA Platform
 * Uses jose library for HMAC-SHA256 JWT (HS256)
 * Token is stored in HttpOnly cookie "varena_session" and/or Authorization header
 */
import { SignJWT, jwtVerify } from 'jose';

export interface AuthSession {
  userId: string;
  email: string;
  displayName: string;
  roles: string[];
  memberId?: string;
  memberCode?: string;
  isAgent?: boolean;
  agentStatus?: string;
  agentCity?: string;
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || 'varena-fallback-dev-secret-change-in-production';
  return new TextEncoder().encode(secret);
}

/**
 * Sign a JWT token for a session (24h expiry)
 */
export async function signSessionToken(session: AuthSession): Promise<string> {
  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(getSecret());
}

/**
 * Verify a JWT token and return the decoded session, or null if invalid/expired
 */
export async function verifySessionToken(token: string): Promise<AuthSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as AuthSession;
  } catch {
    return null;
  }
}

/**
 * Extract JWT token from request:
 * 1. Authorization header: "Bearer <token>"
 * 2. Cookie: "varena_session=<token>"
 */
export function getTokenFromRequest(req: Request): string | null {
  // 1. Try Authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // 2. Try Cookie
  const cookie = req.headers.get('cookie');
  if (cookie) {
    const match = cookie.match(/varena_session=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }

  return null;
}

/**
 * Build Set-Cookie header value for session token
 */
export function buildSessionCookie(token: string): string {
  const isProd = process.env.NODE_ENV === 'production';
  const parts = [
    `varena_session=${encodeURIComponent(token)}`,
    'HttpOnly',
    'Path=/',
    'Max-Age=86400', // 24 hours
    'SameSite=Strict',
  ];
  if (isProd) parts.push('Secure');
  return parts.join('; ');
}

/**
 * Build Set-Cookie header to clear session
 */
export function clearSessionCookie(): string {
  return 'varena_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict';
}
