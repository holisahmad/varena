/**
 * Middleware JWT Auth Helper
 * 
 * Strategy: Backward compatible migration
 * - Accept both JWT (Bearer token / cookie) AND legacy x-user-id/x-user-email headers
 * - JWT takes priority; headers as fallback (for gradual migration)
 * - Once all frontend pages send JWT, remove the header fallback
 */
import { getCorporateUser, getCorporateUserFromJWT, type AuthSession } from './auth';

/**
 * Resolve corporate admin from request.
 * Accepts JWT (priority) or legacy plain headers (fallback).
 */
export async function resolveCorporateAdmin(req: Request): Promise<AuthSession | null> {
  // 1. Try JWT first (secure)
  const jwtSession = await getCorporateUserFromJWT(req);
  if (jwtSession) return jwtSession;

  // 2. Fallback to legacy headers (backward compat — remove once frontend migrated)
  const userId = req.headers.get('x-user-id');
  const userEmail = req.headers.get('x-user-email');
  if (!userId && !userEmail) return null;

  const user = await getCorporateUser(userId, userEmail);
  if (!user) return null;

  // Map to AuthSession shape
  return {
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    roles: user.userRoles?.map((ur: any) => ur.role.code) || [],
  } as AuthSession;
}

/**
 * Resolve member from request.
 * Accepts JWT (priority) or legacy headers (fallback).
 */
export async function resolveMemberFromRequest(req: Request): Promise<AuthSession | null> {
  // 1. Try JWT first (secure)
  const { getMemberFromJWT } = await import('./auth');
  const jwtSession = await getMemberFromJWT(req);
  if (jwtSession) return jwtSession;

  return null;
}
