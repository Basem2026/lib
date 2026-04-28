import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { nanoid } from "nanoid";
import { getDb } from "../db";
import { unifiedAccount, unifiedTransactions, auditLogs } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Unified Account Router - معالجات الحساب الموحد
 * يجمع كل الإيرادات والمصروفات لحساب الربح الموحد
 */

export const unifiedRouter = router({
  /**
   * الحصول على الحساب الموحد
   */
  getAccount: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    const accounts = await db.select().from(unifiedAccount);
    
    // إذا لم يوجد حساب، إنشاؤه
    if (accounts.length === 0) {
      const accountId = nanoid();
      
      await db.insert(unifiedAccount).values({
        id: accountId,
        accountType: "main",
        balanceLYD: "0",
        balanceUSD: "0",
        balanceUSDT: "0",
        totalRevenueLYD: "0",
        totalRevenueUSD: "0",
        totalRevenueUSDT: "0",
        totalExpensesLYD: "0",
        totalExpensesUSD: "0",
        totalExpensesUSDT: "0",
      });
      
      return (await db.select().from(unifiedAccount))[0];
    }
    
    return accounts[0];
  }),

  /**
   * إضافة إيراد إلى الحساب الموحد
   */
  addRevenue: publicProcedure
    .input(
      z.object({
        category: z.string(),
        amount: z.number().positive(),
        currency: z.enum(["LYD", "USD", "USDT"]),
        description: z.string().min(1),
        relatedEntityType: z.string().optional(),
        relatedEntityId: z.string().optional(),
        processedBy: z.string(),
        processedByName: z.string(),
        notes: z.string().optional(),
        metadata: z.any().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { category, amount, currency, description, relatedEntityType, relatedEntityId, processedBy, processedByName, notes, metadata } = input;

      // الحصول على الحساب الموحد
      const [account] = await db.select().from(unifiedAccount);
      if (!account) throw new Error("الحساب الموحد غير موجود");

      // تحديث الأرصدة
      const balanceField = `balance${currency}` as keyof typeof account;
      const revenueField = `totalRevenue${currency}` as keyof typeof account;
      
      const currentBalance = parseFloat(String(account[balanceField] || 0));
      const currentRevenue = parseFloat(String(account[revenueField] || 0));
      
      const newBalance = currentBalance + amount;
      const newRevenue = currentRevenue + amount;

      await db
        .update(unifiedAccount)
        .set({
          [balanceField]: String(newBalance),
          [revenueField]: String(newRevenue),
        })
        .where(eq(unifiedAccount.id, account.id));

      // تسجيل المعاملة
      const transactionId = nanoid();
      await db.insert(unifiedTransactions).values({
        id: transactionId,
        transactionType: "revenue",
        category,
        amount: String(amount),
        currency,
        description,
        relatedEntityType: relatedEntityType || null,
        relatedEntityId: relatedEntityId || null,
        processedBy,
        processedByName,
        notes: notes || null,
        metadata: metadata || null,
      });

      // تسجيل في audit log
      await db.insert(auditLogs).values({
        id: nanoid(),
        action: "create",
        entityType: "treasury",
        entityId: transactionId,
        userId: processedBy,
        userName: processedByName,
        details: {
          description: `قام ${processedByName} بتسجيل إيراد ${amount.toLocaleString('ar-LY')} ${currency} - فئة: ${category}${description ? ` (${description})` : ''}`,
          after: {
            type: "unified_revenue",
            category,
            amount,
            currency,
            description,
          },
        },
      });

      return { success: true, transactionId, newBalance };
    }),

  /**
   * إضافة مصروف إلى الحساب الموحد
   */
  addExpense: publicProcedure
    .input(
      z.object({
        category: z.string(),
        amount: z.number().positive(),
        currency: z.enum(["LYD", "USD", "USDT"]),
        description: z.string().min(1),
        relatedEntityType: z.string().optional(),
        relatedEntityId: z.string().optional(),
        processedBy: z.string(),
        processedByName: z.string(),
        notes: z.string().optional(),
        metadata: z.any().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { category, amount, currency, description, relatedEntityType, relatedEntityId, processedBy, processedByName, notes, metadata } = input;

      // الحصول على الحساب الموحد
      const [account] = await db.select().from(unifiedAccount);
      if (!account) throw new Error("الحساب الموحد غير موجود");

      // التحقق من الرصيد
      const balanceField = `balance${currency}` as keyof typeof account;
      const expenseField = `totalExpenses${currency}` as keyof typeof account;
      
      const currentBalance = parseFloat(String(account[balanceField] || 0));
      const currentExpenses = parseFloat(String(account[expenseField] || 0));

      if (currentBalance < amount) {
        throw new Error(`الرصيد غير كافٍ. الرصيد الحالي: ${currentBalance} ${currency}`);
      }

      // تحديث الأرصدة
      const newBalance = currentBalance - amount;
      const newExpenses = currentExpenses + amount;

      await db
        .update(unifiedAccount)
        .set({
          [balanceField]: String(newBalance),
          [expenseField]: String(newExpenses),
        })
        .where(eq(unifiedAccount.id, account.id));

      // تسجيل المعاملة
      const transactionId = nanoid();
      await db.insert(unifiedTransactions).values({
        id: transactionId,
        transactionType: "expense",
        category,
        amount: String(amount),
        currency,
        description,
        relatedEntityType: relatedEntityType || null,
        relatedEntityId: relatedEntityId || null,
        processedBy,
        processedByName,
        notes: notes || null,
        metadata: metadata || null,
      });

      // تسجيل في audit log
      await db.insert(auditLogs).values({
        id: nanoid(),
        action: "create",
        entityType: "treasury",
        entityId: transactionId,
        userId: processedBy,
        userName: processedByName,
        details: {
          description: `قام ${processedByName} بتسجيل مصروف ${amount.toLocaleString('ar-LY')} ${currency} - فئة: ${category}${description ? ` (${description})` : ''}`,
          after: {
            type: "unified_expense",
            category,
            amount,
            currency,
            description,
          },
        },
      });

      return { success: true, transactionId, newBalance };
    }),

  /**
   * الحصول على سجل المعاملات
   */
  getTransactions: publicProcedure
    .input(
      z.object({
        limit: z.number().optional().default(100),
        type: z.enum(["revenue", "expense"]).optional(),
        category: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { limit, type, category } = input;

      let query = db.select().from(unifiedTransactions);

      // تطبيق الفلاتر
      const conditions = [];
      if (type) {
        conditions.push(eq(unifiedTransactions.transactionType, type));
      }
      if (category) {
        conditions.push(eq(unifiedTransactions.category, category));
      }

      if (conditions.length > 0) {
        query = query.where(conditions[0]) as any;
      }

      const transactions = await query.limit(limit);

      return transactions;
    }),

  /**
   * الحصول على إحصائيات الحساب الموحد
   */
  getStats: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    const [account] = await db.select().from(unifiedAccount);
    if (!account) throw new Error("الحساب الموحد غير موجود");

    // حساب الأرباح
    const profitLYD = parseFloat(account.totalRevenueLYD) - parseFloat(account.totalExpensesLYD);
    const profitUSD = parseFloat(account.totalRevenueUSD) - parseFloat(account.totalExpensesUSD);
    const profitUSDT = parseFloat(account.totalRevenueUSDT) - parseFloat(account.totalExpensesUSDT);

    return {
      balances: {
        LYD: parseFloat(account.balanceLYD),
        USD: parseFloat(account.balanceUSD),
        USDT: parseFloat(account.balanceUSDT),
      },
      revenues: {
        LYD: parseFloat(account.totalRevenueLYD),
        USD: parseFloat(account.totalRevenueUSD),
        USDT: parseFloat(account.totalRevenueUSDT),
      },
      expenses: {
        LYD: parseFloat(account.totalExpensesLYD),
        USD: parseFloat(account.totalExpensesUSD),
        USDT: parseFloat(account.totalExpensesUSDT),
      },
      profits: {
        LYD: profitLYD,
        USD: profitUSD,
        USDT: profitUSDT,
      },
      lastUpdated: account.lastUpdated,
    };
  }),
});
