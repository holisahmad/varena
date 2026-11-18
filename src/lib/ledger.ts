import prisma from './prisma';
import { withTransactionRetry } from './security';

export interface LedgerEntryItem {
  accountCode: string;
  direction: 'DEBIT' | 'CREDIT';
  amount: number; // positive IDR integer
  memo?: string;
}

export interface PostTransactionParams {
  referenceType: string;
  referenceId: string;
  transactionType?: 'STANDARD' | 'REVERSAL';
  idempotencyKey: string;
  memo: string;
  entries: LedgerEntryItem[];
}

/**
 * Double-Entry Transaction Poster
 * Strictly enforces Total DEBITS == Total CREDITS
 * ACID Transaction via Prisma (supports passing existing txClient to avoid deadlocks)
 */
export async function postLedgerTransaction(params: PostTransactionParams, txClient?: any) {
  const { referenceType, referenceId, transactionType = 'STANDARD', idempotencyKey, memo, entries } = params;

  // 1. Balance check: Sum(DEBIT) must equal Sum(CREDIT)
  let totalDebit = 0;
  let totalCredit = 0;

  for (const entry of entries) {
    if (entry.amount <= 0) {
      throw new Error(`Invalid ledger entry amount: ${entry.amount}. Must be > 0.`);
    }
    if (entry.direction === 'DEBIT') {
      totalDebit += entry.amount;
    } else if (entry.direction === 'CREDIT') {
      totalCredit += entry.amount;
    } else {
      throw new Error(`Invalid entry direction: ${entry.direction}`);
    }
  }

  if (totalDebit !== totalCredit) {
    throw new Error(`Ledger unbalanced: Total Debits (Rp${totalDebit}) != Total Credits (Rp${totalCredit}).`);
  }

  const runOnTx = async (tx: any) => {
    // 2. Check Idempotency
    const existing = await tx.ledgerTransaction.findUnique({
      where: { idempotencyKey },
      include: { entries: true },
    });

    if (existing) {
      return existing; // idempotent return
    }

    // 3. Create Transaction Header
    const transaction = await tx.ledgerTransaction.create({
      data: {
        referenceType,
        referenceId,
        transactionType,
        status: 'POSTED',
        idempotencyKey,
        memo,
      },
    });

    // 4. Create Entries and update account balance cache atomically
    for (const entry of entries) {
      const account = await tx.ledgerAccount.findUnique({
        where: { accountCode: entry.accountCode },
      });

      if (!account) {
        throw new Error(`Ledger account not found for code: ${entry.accountCode}`);
      }

      await tx.ledgerEntry.create({
        data: {
          transactionId: transaction.id,
          accountId: account.id,
          direction: entry.direction,
          amount: entry.amount,
          memo: entry.memo || memo,
        },
      });

      // Update cached balance:
      // For LIABILITY / REVENUE / EQUITY: Credit increases balance, Debit decreases balance.
      // For ASSET / EXPENSE: Debit increases balance, Credit decreases balance.
      const isCreditNormal = ['LIABILITY', 'REVENUE', 'EQUITY'].includes(account.accountType);
      const delta = entry.direction === 'CREDIT' 
        ? (isCreditNormal ? entry.amount : -entry.amount)
        : (isCreditNormal ? -entry.amount : entry.amount);

      await tx.ledgerAccount.update({
        where: { id: account.id },
        data: {
          balance: { increment: delta },
        },
      });
    }

    return transaction;
  };

  if (txClient) {
    return runOnTx(txClient);
  }

  return withTransactionRetry(runOnTx);
}

/**
 * Get accurate wallet balance for a member derived from Ledger.
 * availableBalance = ledger balance − pending withdrawal holds
 */
export async function getMemberWallet(memberCode: string) {
  const accountCode = `ACC-MBR-${memberCode}`;

  const [account, member] = await Promise.all([
    prisma.ledgerAccount.findUnique({
      where: { accountCode },
      include: {
        entries: {
          include: { transaction: true },
          orderBy: { createdAt: 'desc' },
          take: 30,
        },
      },
    }),
    prisma.member.findUnique({ where: { memberCode } }),
  ]);

  if (!account) {
    return {
      availableBalance: 0,
      ledgerBalance: 0,
      pendingHold: 0,
      accountCode,
      statement: [],
    };
  }

  // Sum all pending withdrawal requests (REQUESTED | UNDER_REVIEW)
  let pendingHold = 0;
  let withdrawals: any[] = [];
  if (member) {
    const [pending, list] = await Promise.all([
      prisma.withdrawalRequest.aggregate({
        where: {
          memberId: member.id,
          status: { in: ['REQUESTED', 'UNDER_REVIEW'] },
        },
        _sum: { amount: true },
      }),
      prisma.withdrawalRequest.findMany({
        where: { memberId: member.id },
        orderBy: { requestedAt: 'desc' },
        take: 10,
      }),
    ]);
    pendingHold = pending._sum.amount ?? 0;
    withdrawals = list;
  }

  return {
    availableBalance: Math.max(0, account.balance - pendingHold),
    ledgerBalance: account.balance,
    pendingHold,
    withdrawals,
    accountCode: account.accountCode,
    bankInfo: member ? {
      bankName: member.bankName,
      bankAccountNumber: member.bankAccountNumber,
      bankAccountHolder: member.bankAccountHolder,
      isBankLocked: !!member.bankAccountNumber,
      legalName: member.legalName,
      displayName: member.displayName,
    } : null,
    statement: account.entries.map((e) => ({
      id: e.id,
      date: e.createdAt,
      direction: e.direction,
      amount: e.amount,
      memo: e.memo,
      referenceType: e.transaction.referenceType,
      referenceId: e.transaction.referenceId,
    })),
  };
}
