import prisma from './prisma';

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

  return prisma.$transaction(runOnTx, { maxWait: 15000, timeout: 30000 });
}

/**
 * Get accurate wallet balance for a member derived from Ledger
 */
export async function getMemberWallet(memberCode: string) {
  const accountCode = `ACC-MBR-${memberCode}`;
  const account = await prisma.ledgerAccount.findUnique({
    where: { accountCode },
    include: {
      entries: {
        include: { transaction: true },
        orderBy: { createdAt: 'desc' },
        take: 30,
      },
    },
  });

  if (!account) {
    return {
      availableBalance: 0,
      accountCode,
      statement: [],
    };
  }

  return {
    availableBalance: account.balance,
    accountCode: account.accountCode,
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
