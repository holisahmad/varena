import prisma from './prisma';

export interface UplineNode {
  level: number;
  memberId: string;
  memberCode: string;
  displayName: string;
  memberStatus: string;
}

/**
 * Traverse placement upline up to maxLevels (default 10)
 * Uses iterative adjacency lookup with cycle protection
 */
export async function getPlacementUplines(startMemberId: string, maxLevels = 10): Promise<UplineNode[]> {
  const uplines: UplineNode[] = [];
  const visited = new Set<string>([startMemberId]);
  let currentMemberId = startMemberId;

  for (let level = 1; level <= maxLevels; level++) {
    const placement = await prisma.placementRelationship.findUnique({
      where: { memberId: currentMemberId },
      include: {
        parent: true,
      },
    });

    if (!placement || !placement.parentMemberId) {
      break;
    }

    const parentId = placement.parentMemberId;
    if (visited.has(parentId)) {
      console.error(`Cycle detected in placement tree at member ${parentId}`);
      break;
    }

    visited.add(parentId);
    uplines.push({
      level,
      memberId: parentId,
      memberCode: placement.parent.memberCode,
      displayName: placement.parent.displayName,
      memberStatus: placement.parent.memberStatus,
    });

    currentMemberId = parentId;
  }

  return uplines;
}

/**
 * Get direct sponsor of a member
 */
export async function getDirectSponsor(memberId: string) {
  const rel = await prisma.sponsorRelationship.findUnique({
    where: { memberId },
    include: {
      sponsor: true,
    },
  });
  return rel?.sponsor || null;
}

/**
 * Check if targetParentId is a descendant of memberId (cycle detection)
 */
export async function isDescendant(memberId: string, targetParentId: string): Promise<boolean> {
  let currentId = targetParentId;
  const visited = new Set<string>();

  while (currentId) {
    if (currentId === memberId) {
      return true;
    }
    if (visited.has(currentId)) {
      break;
    }
    visited.add(currentId);

    const rel = await prisma.placementRelationship.findUnique({
      where: { memberId: currentId },
    });

    if (!rel || !rel.parentMemberId) {
      break;
    }
    currentId = rel.parentMemberId;
  }

  return false;
}

/**
 * Transfer placement with validation & audit trail
 */
export async function transferPlacement({
  memberId,
  newParentId,
  actorUserId,
  reason,
}: {
  memberId: string;
  newParentId: string;
  actorUserId: string;
  reason: string;
}) {
  if (memberId === newParentId) {
    throw new Error('Member cannot be their own placement parent.');
  }

  const willCreateCycle = await isDescendant(memberId, newParentId);
  if (willCreateCycle) {
    throw new Error('Invalid placement: Node cannot be placed under its own downline (cycle detected).');
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.placementRelationship.findUnique({
      where: { memberId },
    });

    const oldParentId = existing?.parentMemberId || null;

    // Record placement history
    await tx.placementHistory.create({
      data: {
        memberId,
        oldParentId,
        newParentId,
        reason,
        requestedBy: actorUserId,
        approvedBy: actorUserId,
      },
    });

    // Update active placement relationship
    const updated = await tx.placementRelationship.upsert({
      where: { memberId },
      update: {
        parentMemberId: newParentId,
        approvedBy: actorUserId,
      },
      create: {
        memberId,
        parentMemberId: newParentId,
        createdBy: actorUserId,
        approvedBy: actorUserId,
      },
    });

    // Audit log
    await tx.auditLog.create({
      data: {
        actorUserId,
        action: 'PLACEMENT_TRANSFER',
        entityType: 'MEMBER',
        entityId: memberId,
        beforeJson: JSON.stringify({ oldParentId }),
        afterJson: JSON.stringify({ newParentId }),
        reason,
      },
    });

    return updated;
  });
}

