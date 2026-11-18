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

export const CORPORATE_ADMIN_ROLES = [
  'OWNER',
  'OPERATIONS',
  'ADMIN_1',
  'ADMIN_2',
  'KOPERASI',
  'AUDITOR',
];

export async function verifyCorporateAdmin(userId?: string | null): Promise<boolean> {
  if (!userId) return false;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { userRoles: { include: { role: true } } },
  });
  if (!user || user.status !== 'ACTIVE') return false;
  return user.userRoles.some((ur) => CORPORATE_ADMIN_ROLES.includes(ur.role.code));
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

