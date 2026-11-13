import prisma from './prisma';
import bcrypt from 'bcryptjs';

export interface AuthSession {
  userId: string;
  email: string;
  displayName: string;
  roles: string[];
  memberId?: string;
  memberCode?: string;
}

// In-memory or header-based token helper for modular monolith
export async function authenticateUser(email: string, passwordPlain: string): Promise<AuthSession | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      userRoles: {
        include: { role: true },
      },
      member: true,
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

  return {
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    roles: user.userRoles.map((ur) => ur.role.code),
    memberId: user.member?.id,
    memberCode: user.member?.memberCode,
  };
}

export function hasRole(session: AuthSession, allowedRoles: string[]): boolean {
  return session.roles.some((r) => allowedRoles.includes(r));
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
