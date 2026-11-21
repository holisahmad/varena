import prisma from './prisma';
import bcrypt from 'bcryptjs';
import { getTokenFromRequest, verifySessionToken, type AuthSession } from './jwt';

// Re-export AuthSession from jwt.ts for backward compatibility
export type { AuthSession };

// In-memory or header-based token helper for modular monolith
export async function authenticateUser(email: string, passwordPlain: string): Promise<AuthSession | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      userRoles: {
        include: { role: true },
      },
      member: {
        include: {
          sponsorRel: {
            include: { sponsor: true },
          },
        },
      },
    },
  });

  if (!user || user.status !== 'ACTIVE') {
    return null;
  }

  const match = await bcrypt.compare(passwordPlain, user.passwordHash);
  if (!match) {
    return null;
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const isAgent = Boolean(
    user.member?.isAgent ||
    ['MASTER_AGENT', 'REGIONAL_AGENT'].includes(user.member?.agentType || '') ||
    ['MASTER', 'MOBILE'].includes(user.member?.stockistType || '')
  );

  return {
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    roles: user.userRoles.map((ur) => ur.role.code),
    memberId: user.member?.id,
    memberCode: user.member?.memberCode,
    isAgent,
    agentStatus: user.member?.agentStatus || (isAgent ? 'ACTIVE' : undefined),
    agentCity: user.member?.agentCity || user.member?.stockistCity || undefined,
    sponsorCode: user.member?.sponsorRel?.sponsor?.memberCode || undefined,
    sponsorName: user.member?.sponsorRel?.sponsor?.displayName || user.member?.sponsorRel?.sponsor?.legalName || undefined,
  };
}

export const CORPORATE_ADMIN_ROLES = [
  'OWNER',
  'OPERATIONS',
  'ADMIN_1',
  'ADMIN_2',
  'KOPERASI',
  'AUDITOR',
];

export async function getCorporateUser(
  userId?: string | null,
  userEmail?: string | null
) {
  const conditions: Array<{ id?: string; email?: string }> = [];
  if (userId) {
    conditions.push({ id: userId });
    conditions.push({ email: userId });
  }
  if (userEmail) {
    conditions.push({ email: userEmail });
    conditions.push({ id: userEmail });
  }
  if (conditions.length === 0) return null;

  const user = await prisma.user.findFirst({
    where: { OR: conditions },
    include: { userRoles: { include: { role: true } } },
  });
  if (!user || user.status !== 'ACTIVE') return null;
  const isCorporate = user.userRoles.some((ur) => CORPORATE_ADMIN_ROLES.includes(ur.role.code));
  if (!isCorporate) return null;
  return user;
}

export async function verifyCorporateAdmin(
  userId?: string | null,
  userEmail?: string | null
): Promise<boolean> {
  const user = await getCorporateUser(userId, userEmail);
  return Boolean(user);
}

export async function getMemberByUserId(userId: string) {
  return prisma.member.findUnique({
    where: { userId },
    include: {
      sponsorRel: { include: { sponsor: true } },
      placementRel: { include: { parent: true } },
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// JWT-based authentication helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get authenticated user from JWT token in request (Authorization header or cookie).
 * Returns null if not authenticated or token invalid/expired.
 */
export async function getAuthenticatedUser(req: Request): Promise<AuthSession | null> {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Get corporate admin user from JWT (must have a corporate role).
 * Returns the AuthSession if valid + corporate role, else null.
 */
export async function getCorporateUserFromJWT(req: Request): Promise<AuthSession | null> {
  const session = await getAuthenticatedUser(req);
  if (!session) return null;
  const isCorporate = session.roles.some((r) => CORPORATE_ADMIN_ROLES.includes(r));
  if (!isCorporate) return null;
  return session;
}

/**
 * Get member session from JWT.
 * Returns the AuthSession if valid + has memberId, else null.
 */
export async function getMemberFromJWT(req: Request): Promise<AuthSession | null> {
  const session = await getAuthenticatedUser(req);
  if (!session || !session.memberId) return null;
  return session;
}

