import { router, publicProcedure } from '../trpc';
import { z } from 'zod';
import { getDb } from '../db';
import { treasuryAccounts, accountTransactions, bankAccounts } from '../../shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { TRPCError } from '@trpc/server';

// ========== دوال مساعدة ==========
async function getAccountBalance(accountId: string, currency: string = 'LYD') {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ balance: treasuryAccounts.balance })
    .from(treasuryAccounts)
    .where(and(
      eq(treasuryAccounts.accountId, accountId),
      eq(treasuryAccounts.currency, currency)
    ))
    .limit(1);
  return Number(result[0]?.balance) || 0;
}

async function updateAccountBalance(accountId: string, amount: number, currency: string, operation: 'add' | 'subtract') {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const current = await getAccountBalance(accountId, currency);
  const newBalance = operation === 'add' ? current + amount : current - amount;
  if (newBalance < 0) throw new Error(`Insufficient balance in account ${accountId}`);
  await db
    .update(treasuryAccounts)
    .set({ balance: String(newBalance), updatedAt: new Date() })
    .where(and(
      eq(treasuryAccounts.accountId, accountId),
      eq(treasuryAccounts.currency, currency)
    ));
  return newBalance;
}

// ========== إيداع رأس المال ==========
export const depositCapital = publicProcedure
  .input(z.object({
    amount: z.number().positive(),
    currency: z.string().default('LYD'),
    description: z.string().optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
    const userId = (ctx as any).user?.id || 'system';
    const { amount, currency, description } = input;
    const capitalAccountId = 'capital';

    const existing = await db.select().from(treasuryAccounts).where(
      and(eq(treasuryAccounts.accountId, capitalAccountId), eq(treasuryAccounts.currency, currency))
    ).limit(1);

    if (existing.length === 0) {
      await db.insert(treasuryAccounts).values({
        id: nanoid(),
        accountId: capitalAccountId,
        accountName: 'رأس المال',
        accountType: 'capital',
        currency,
        balance: '0',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    await updateAccountBalance(capitalAccountId, amount, currency, 'add');

    await db.insert(accountTransactions).values({
      id: nanoid(),
      accountId: capitalAccountId,
      accountName: 'رأس المال',
      currency,
      amount: String(amount),
      type: 'deposit',
      direction: 'credit',
      description: description || `إيداع رأس المال بمبلغ ${amount} ${currency}`,
      createdBy: userId,
      createdAt: new Date(),
    });

    return { success: true, newBalance: await getAccountBalance(capitalAccountId, currency) };
  });

// ========== التحويل من رأس المال إلى حساب التوزيع ==========
export const transferFromCapital = publicProcedure
  .input(z.object({
    amount: z.number().positive(),
    currency: z.string().default('LYD'),
    description: z.string().optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
    const userId = (ctx as any).user?.id || 'system';
    const { amount, currency, description } = input;
    const capitalId = 'capital';
    const distributionId = 'capital_distribution';

    const distExists = await db.select().from(treasuryAccounts).where(
      and(eq(treasuryAccounts.accountId, distributionId), eq(treasuryAccounts.currency, currency))
    ).limit(1);

    if (distExists.length === 0) {
      await db.insert(treasuryAccounts).values({
        id: nanoid(),
        accountId: distributionId,
        accountName: 'حساب التوزيع',
        accountType: 'distribution',
        currency,
        balance: '0',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    await updateAccountBalance(capitalId, amount, currency, 'subtract');
    await updateAccountBalance(distributionId, amount, currency, 'add');

    await db.insert(accountTransactions).values({
      id: nanoid(),
      accountId: capitalId,
      accountName: 'رأس المال',
      currency,
      amount: String(-amount),
      type: 'transfer',
      direction: 'debit',
      description: description || `تحويل من رأس المال إلى حساب التوزيع بمبلغ ${amount} ${currency}`,
      createdBy: userId,
      createdAt: new Date(),
    });

    await db.insert(accountTransactions).values({
      id: nanoid(),
      accountId: distributionId,
      accountName: 'حساب التوزيع',
      currency,
      amount: String(amount),
      type: 'transfer',
      direction: 'credit',
      description: description || `استلام تحويل من رأس المال بمبلغ ${amount} ${currency}`,
      createdBy: userId,
      createdAt: new Date(),
    });

    return { success: true };
  });

// ========== توزيع من حساب التوزيع إلى حسابات أخرى ==========
export const distribute = publicProcedure
  .input(z.object({
    fromAccountId: z.string(),
    toAccountId: z.string(),
    toAccountType: z.enum(['cash_lyd', 'cash_usd', 'usdt', 'bank_account']),
    amount: z.number().positive(),
    currency: z.string().default('LYD'),
    bankAccountId: z.string().optional(),
    description: z.string().optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
    const userId = (ctx as any).user?.id || 'system';
    const { fromAccountId, toAccountId, toAccountType, amount, currency, bankAccountId, description } = input;

    if (fromAccountId !== 'capital_distribution') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'المصدر يجب أن يكون حساب التوزيع' });
    }

    const distBalance = await getAccountBalance(fromAccountId, currency);
    if (distBalance < amount) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: `رصيد غير كافٍ في حساب التوزيع: ${distBalance} < ${amount}` });
    }

    await updateAccountBalance(fromAccountId, amount, currency, 'subtract');

    let targetAccountName = '';
    if (toAccountType === 'cash_lyd') {
      await updateAccountBalance(toAccountId, amount, currency, 'add');
      targetAccountName = 'كاش دينار';
    } else if (toAccountType === 'cash_usd') {
      await updateAccountBalance(toAccountId, amount, currency, 'add');
      targetAccountName = 'كاش دولار';
    } else if (toAccountType === 'usdt') {
      await updateAccountBalance(toAccountId, amount, currency, 'add');
      targetAccountName = 'USDT';
    } else if (toAccountType === 'bank_account' && bankAccountId) {
      const bank = await db.select().from(bankAccounts).where(eq(bankAccounts.id, bankAccountId)).limit(1);
      if (!bank.length) throw new TRPCError({ code: 'NOT_FOUND', message: 'الحساب البنكي غير موجود' });
      const newBalance = (Number(bank[0].balance) || 0) + amount;
      await db.update(bankAccounts).set({ balance: String(newBalance) }).where(eq(bankAccounts.id, bankAccountId));
      targetAccountName = bank[0].bankName;
    } else {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'بيانات الحساب المستهدف غير صحيحة' });
    }

    await db.insert(accountTransactions).values({
      id: nanoid(),
      accountId: toAccountId,
      accountName: targetAccountName,
      currency,
      amount: String(amount),
      type: 'distribution',
      direction: 'credit',
      description: description || `توزيع مبلغ ${amount} ${currency} من حساب التوزيع إلى ${targetAccountName}`,
      createdBy: userId,
      createdAt: new Date(),
    });

    return { success: true };
  });

// ========== الحصول على جميع حسابات الخزينة ==========
export const getAccounts = publicProcedure.query(async () => {
  const db = await getDb();
  if (!db) return { treasuryAccounts: [], bankAccounts: [] };
  const accounts = await db.select().from(treasuryAccounts);
  const banks = await db.select().from(bankAccounts);
  return { treasuryAccounts: accounts, bankAccounts: banks };
});

// ========== الحصول على سجل المعاملات لحساب معين ==========
export const getTransactions = publicProcedure
  .input(z.object({ accountId: z.string(), limit: z.number().default(50) }))
  .query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    const txs = await db
      .select()
      .from(accountTransactions)
      .where(eq(accountTransactions.accountId, input.accountId))
      .orderBy(desc(accountTransactions.createdAt))
      .limit(input.limit);
    return txs;
  });

// ========== router الرئيسي ==========
export const treasuryRouter = router({
  depositCapital,
  transferFromCapital,
  distribute,
  getAccounts,
  getTransactions,
});