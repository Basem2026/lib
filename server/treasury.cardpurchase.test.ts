import { describe, it, expect, beforeAll } from 'vitest';
import { getDb } from './db';
import { accountTransactions } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Treasury - Card Purchase', () => {
  beforeAll(async () => {
    // تنظيف البيانات القديمة
    const db = await getDb();
    if (db) {
      await db.delete(accountTransactions);
    }
  });

  it('should record card purchase and decrease cash', async () => {
    const db = await getDb();
    expect(db).toBeTruthy();
    if (!db) return;

    const { nanoid } = await import('nanoid');

    // تسجيل شراء بطاقة بـ 1000 د.ل
    const transaction = {
      id: nanoid(),
      transactionType: 'operation_expense' as const,
      fromAccountType: 'treasury' as const,
      fromAccountId: 'cash_lyd',
      toAccountType: null,
      toAccountId: null,
      amountLYD: '-1000.00',
      amountUSD: '0.00',
      amountUSDT: '0.00',
      description: 'شراء بطاقة للزبون: علي مصطفى زهمول (000001)',
      processedBy: '1',
      processedByName: 'محمد مصطفى زهمول',
    };

    await db.insert(accountTransactions).values(transaction);

    // التحقق من تسجيل العملية
    const result = await db
      .select()
      .from(accountTransactions)
      .where(eq(accountTransactions.id, transaction.id));

    expect(result).toHaveLength(1);
    expect(result[0].fromAccountId).toBe('cash_lyd');
    expect(result[0].amountLYD).toBe('-1000.00');
    expect(result[0].description).toContain('شراء بطاقة');
  });

  it('should calculate correct cash balance after card purchase', async () => {
    const db = await getDb();
    expect(db).toBeTruthy();
    if (!db) return;

    // جلب جميع معاملات الكاش
    const transactions = await db
      .select()
      .from(accountTransactions)
      .where(eq(accountTransactions.fromAccountId, 'cash_lyd'));

    // حساب الرصيد
    const balance = transactions.reduce((sum, t) => {
      return sum + parseFloat(t.amountLYD);
    }, 0);

    // يجب أن يكون الرصيد -1000 (نقص بسبب الشراء)
    expect(balance).toBe(-1000);
  });
});
