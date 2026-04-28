import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { nanoid } from "nanoid";
import { getDb } from "../db";
import {
  capitalAccount as capitalAccounts,
  intermediaryAccount,
  treasuryAccounts,
  accountTransactions,
  auditLogs,
  dailyOperations,
  expenses,
  salaries,
} from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { buildTreasuryLog } from "../logMessages";

/**
 * Accounts Router - معالجات الحسابات المحاسبية
 * يدير رأس المال، الحساب الوسطي، وحسابات الخزينة
 */

export const accountsRouter = router({
  /**
   * الحصول على حساب رأس المال
   */
  getCapitalAccount: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const accounts = await db.select().from(capitalAccounts);

    // إذا لم يوجد حساب، إنشاؤه
    if (accounts.length === 0) {
      const accountId = nanoid();

      await db.insert(capitalAccounts).values({
        id: accountId,
        accountName: "رأس المال",
        totalCapitalLYD: "0",
        totalCapitalUSD: "0",
        totalCapitalUSDT: "0",
        createdBy: "system",
      });

      return (await db.select().from(capitalAccounts))[0];
    }

    return accounts[0];
  }),

  /**
   * الحصول على الحساب الوسطي
   */
  getIntermediaryAccount: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const accounts = await db.select().from(intermediaryAccount);

    // إذا لم يوجد حساب، إنشاؤه
    if (accounts.length === 0) {
      const accountId = nanoid();

      await db.insert(intermediaryAccount).values({
        id: accountId,
        accountName: "الحساب الوسطي",
        balanceLYD: "0",
        balanceUSD: "0",
        balanceUSDT: "0",
        isLocked: false,
        createdBy: "system",
      });

      return (await db.select().from(intermediaryAccount))[0];
    }

    return accounts[0];
  }),

  /**
   * الحصول على جميع حسابات الخزينة
   */
  getTreasuryAccounts: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const accounts = await db.select().from(treasuryAccounts).where(eq(treasuryAccounts.isActive, true));

    return accounts;
  }),

  /**
   * إنشاء حساب خزينة جديد
   */
  createTreasuryAccount: publicProcedure
    .input(
      z.object({
        accountType: z.enum(["cash", "usdt", "bank"]),
        accountName: z.string().min(1),
        bankName: z.string().optional(),
        accountHolder: z.string().optional(),
        accountNumber: z.string().optional(),
        createdBy: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const accountId = nanoid();

      await db.insert(treasuryAccounts).values({
        id: accountId,
        accountType: input.accountType,
        accountName: input.accountName,
        balanceLYD: "0",
        balanceUSD: "0",
        balanceUSDT: "0",
        bankName: input.bankName || null,
        accountHolder: input.accountHolder || null,
        accountNumber: input.accountNumber || null,
        isActive: true,
        createdBy: input.createdBy,
      });

      return { success: true, accountId };
    }),

  /**
   * إدخال رأس المال (القيد الافتتاحي)
   * Debit → الحساب الوسطي
   * Credit → حساب رأس المال
   */
  depositCapital: publicProcedure
    .input(
      z.object({
        amountLYD: z.number().min(0).default(0),
        amountUSD: z.number().min(0).default(0),
        amountUSDT: z.number().min(0).default(0),
        description: z.string().min(1),
        processedBy: z.string(),
        processedByName: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { amountLYD, amountUSD, amountUSDT, description, processedBy, processedByName } = input;

      // الحصول على الحسابات
      const [capital] = await db.select().from(capitalAccounts);
      const [intermediary] = await db.select().from(intermediaryAccount);

      if (!capital || !intermediary) {
        throw new Error("الحسابات غير موجودة");
      }

      // التحقق من أن الحساب الوسطي غير مقفول
      if (intermediary.isLocked) {
        throw new Error("الحساب الوسطي مقفول. لا يمكن إضافة رأس مال جديد.");
      }

      // تحديث رأس المال
      if (amountLYD > 0) {
        const newCapitalLYD = parseFloat(capital.totalCapitalLYD) + amountLYD;
        await db
          .update(capitalAccounts)
          .set({ totalCapitalLYD: String(newCapitalLYD) })
          .where(eq(capitalAccounts.id, capital.id));
      }

      if (amountUSD > 0) {
        const newCapitalUSD = parseFloat(capital.totalCapitalUSD) + amountUSD;
        await db
          .update(capitalAccounts)
          .set({ totalCapitalUSD: String(newCapitalUSD) })
          .where(eq(capitalAccounts.id, capital.id));
      }

      if (amountUSDT > 0) {
        const newCapitalUSDT = parseFloat(capital.totalCapitalUSDT) + amountUSDT;
        await db
          .update(capitalAccounts)
          .set({ totalCapitalUSDT: String(newCapitalUSDT) })
          .where(eq(capitalAccounts.id, capital.id));
      }

      // تحديث الحساب الوسطي
      if (amountLYD > 0) {
        const newBalanceLYD = parseFloat(intermediary.balanceLYD) + amountLYD;
        await db
          .update(intermediaryAccount)
          .set({ balanceLYD: String(newBalanceLYD) })
          .where(eq(intermediaryAccount.id, intermediary.id));
      }

      if (amountUSD > 0) {
        const newBalanceUSD = parseFloat(intermediary.balanceUSD) + amountUSD;
        await db
          .update(intermediaryAccount)
          .set({ balanceUSD: String(newBalanceUSD) })
          .where(eq(intermediaryAccount.id, intermediary.id));
      }

      if (amountUSDT > 0) {
        const newBalanceUSDT = parseFloat(intermediary.balanceUSDT) + amountUSDT;
        await db
          .update(intermediaryAccount)
          .set({ balanceUSDT: String(newBalanceUSDT) })
          .where(eq(intermediaryAccount.id, intermediary.id));
      }

      // تسجيل المعاملة
      const transactionId = nanoid();
      await db.insert(accountTransactions).values({
        id: transactionId,
        transactionType: "capital_to_intermediary",
        fromAccountType: "capital",
        fromAccountId: capital.id,
        toAccountType: "intermediary",
        toAccountId: intermediary.id,
        amountLYD: amountLYD.toFixed(2),
        amountUSD: amountUSD.toFixed(2),
        amountUSDT: amountUSDT.toFixed(2),
        description,
        processedBy,
        processedByName,
      });

      // تسجيل في audit log
      const amounts = [amountLYD > 0 ? `${amountLYD.toLocaleString('ar-LY')} دينار` : '', amountUSD > 0 ? `${amountUSD.toLocaleString('ar-LY')} دولار` : '', amountUSDT > 0 ? `${amountUSDT.toLocaleString('ar-LY')} USDT` : ''].filter(Boolean).join(' + ');
      await db.insert(auditLogs).values({
        id: nanoid(),
        action: "create",
        entityType: "treasury",
        entityId: transactionId,
        userId: processedBy,
        userName: processedByName,
        details: {
          description: `قام ${processedByName} بإيداع رأس مال بمبلغ ${amounts}${description ? ` - ${description}` : ''}`,
          after: {
            type: "capital_deposit",
            amountLYD,
            amountUSD,
            amountUSDT,
            description,
          },
        },
      });

      return { success: true, transactionId };
    }),

  /**
   * توزيع من الحساب الوسطي إلى حسابات الخزينة
   * Debit → حساب الخزينة
   * Credit → الحساب الوسطي
   */
  distributeToTreasury: publicProcedure
    .input(
      z.object({
        treasuryAccountId: z.string(),
        amountLYD: z.number().min(0).default(0),
        amountUSD: z.number().min(0).default(0),
        amountUSDT: z.number().min(0).default(0),
        description: z.string().min(1),
        processedBy: z.string(),
        processedByName: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { treasuryAccountId, amountLYD, amountUSD, amountUSDT, description, processedBy, processedByName } = input;

      // الحصول على الحسابات
      const [intermediary] = await db.select().from(intermediaryAccount);
      const [treasury] = await db.select().from(treasuryAccounts).where(eq(treasuryAccounts.id, treasuryAccountId));

      if (!intermediary || !treasury) {
        throw new Error("الحسابات غير موجودة");
      }

      // التحقق من أن الحساب الوسطي غير مقفول
      if (intermediary.isLocked) {
        throw new Error("الحساب الوسطي مقفول. لا يمكن التوزيع.");
      }

      // التحقق من الرصيد
      if (amountLYD > parseFloat(intermediary.balanceLYD)) {
        throw new Error(`الرصيد غير كافٍ في الحساب الوسطي (دينار). الرصيد الحالي: ${intermediary.balanceLYD}`);
      }

      if (amountUSD > parseFloat(intermediary.balanceUSD)) {
        throw new Error(`الرصيد غير كافٍ في الحساب الوسطي (دولار). الرصيد الحالي: ${intermediary.balanceUSD}`);
      }

      if (amountUSDT > parseFloat(intermediary.balanceUSDT)) {
        throw new Error(`الرصيد غير كافٍ في الحساب الوسطي (USDT). الرصيد الحالي: ${intermediary.balanceUSDT}`);
      }

      // خصم من الحساب الوسطي
      if (amountLYD > 0) {
        const newBalanceLYD = parseFloat(intermediary.balanceLYD) - amountLYD;
        await db
          .update(intermediaryAccount)
          .set({ balanceLYD: String(newBalanceLYD) })
          .where(eq(intermediaryAccount.id, intermediary.id));
      }

      if (amountUSD > 0) {
        const newBalanceUSD = parseFloat(intermediary.balanceUSD) - amountUSD;
        await db
          .update(intermediaryAccount)
          .set({ balanceUSD: String(newBalanceUSD) })
          .where(eq(intermediaryAccount.id, intermediary.id));
      }

      if (amountUSDT > 0) {
        const newBalanceUSDT = parseFloat(intermediary.balanceUSDT) - amountUSDT;
        await db
          .update(intermediaryAccount)
          .set({ balanceUSDT: String(newBalanceUSDT) })
          .where(eq(intermediaryAccount.id, intermediary.id));
      }

      // إضافة إلى حساب الخزينة
      if (amountLYD > 0) {
        const newBalanceLYD = parseFloat(treasury.balanceLYD) + amountLYD;
        await db
          .update(treasuryAccounts)
          .set({ balanceLYD: String(newBalanceLYD) })
          .where(eq(treasuryAccounts.id, treasury.id));
      }

      if (amountUSD > 0) {
        const newBalanceUSD = parseFloat(treasury.balanceUSD) + amountUSD;
        await db
          .update(treasuryAccounts)
          .set({ balanceUSD: String(newBalanceUSD) })
          .where(eq(treasuryAccounts.id, treasury.id));
      }

      if (amountUSDT > 0) {
        const newBalanceUSDT = parseFloat(treasury.balanceUSDT) + amountUSDT;
        await db
          .update(treasuryAccounts)
          .set({ balanceUSDT: String(newBalanceUSDT) })
          .where(eq(treasuryAccounts.id, treasury.id));
      }

      // تسجيل المعاملة
      const transactionId = nanoid();
      await db.insert(accountTransactions).values({
        id: transactionId,
        transactionType: "intermediary_to_treasury",
        fromAccountType: "intermediary",
        fromAccountId: intermediary.id,
        toAccountType: "treasury",
        toAccountId: treasury.id,
        amountLYD: amountLYD.toFixed(2),
        amountUSD: amountUSD.toFixed(2),
        amountUSDT: amountUSDT.toFixed(2),
        description,
        processedBy,
        processedByName,
      });

      // تسجيل في audit log
      const distAmounts = [amountLYD > 0 ? `${amountLYD.toLocaleString('ar-LY')} دينار` : '', amountUSD > 0 ? `${amountUSD.toLocaleString('ar-LY')} دولار` : '', amountUSDT > 0 ? `${amountUSDT.toLocaleString('ar-LY')} USDT` : ''].filter(Boolean).join(' + ');
      await db.insert(auditLogs).values({
        id: nanoid(),
        action: "create",
        entityType: "treasury",
        entityId: transactionId,
        userId: processedBy,
        userName: processedByName,
        details: {
          description: `قام ${processedByName} بتوزيع ${distAmounts} إلى خزينة ${treasury.accountName}${description ? ` - ${description}` : ''}`,
          after: {
            type: "intermediary_to_treasury",
            treasuryAccountName: treasury.accountName,
            amountLYD,
            amountUSD,
            amountUSDT,
            description,
          },
        },
      });

      return { success: true, transactionId };
    }),

  /**
   * قفل الحساب الوسطي (بعد التوزيع)
   */
  lockIntermediaryAccount: publicProcedure
    .input(
      z.object({
        processedBy: z.string(),
        processedByName: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [intermediary] = await db.select().from(intermediaryAccount);

      if (!intermediary) {
        throw new Error("الحساب الوسطي غير موجود");
      }

      // قفل الحساب
      await db
        .update(intermediaryAccount)
        .set({ isLocked: true })
        .where(eq(intermediaryAccount.id, intermediary.id));

      // تسجيل في audit log
      await db.insert(auditLogs).values({
        id: nanoid(),
        action: "update",
        entityType: "treasury",
        entityId: intermediary.id,
        userId: input.processedBy,
        userName: input.processedByName,
        details: {
          description: `قام ${input.processedByName} بقفل الحساب الوسطي`,
          before: { isLocked: false },
          after: { isLocked: true },
        },
      });

      return { success: true };
    }),

  /**
   * فتح الحساب الوسطي (لإضافة رأس مال جديد)
   */
  unlockIntermediaryAccount: publicProcedure
    .input(
      z.object({
        processedBy: z.string(),
        processedByName: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [intermediary] = await db.select().from(intermediaryAccount);

      if (!intermediary) {
        throw new Error("الحساب الوسطي غير موجود");
      }

      // فتح الحساب
      await db
        .update(intermediaryAccount)
        .set({ isLocked: false })
        .where(eq(intermediaryAccount.id, intermediary.id));

      // تسجيل في audit log
      await db.insert(auditLogs).values({
        id: nanoid(),
        action: "update",
        entityType: "treasury",
        entityId: intermediary.id,
        userId: input.processedBy,
        userName: input.processedByName,
        details: {
          description: `قام ${input.processedByName} بفتح الحساب الوسطي`,
          before: { isLocked: true },
          after: { isLocked: false },
        },
      });

      return { success: true };
    }),

  /**
   * إيداع في حساب خزينة
   */
  depositToTreasury: publicProcedure
    .input(
      z.object({
        treasuryAccountId: z.string(),
        amountLYD: z.number(),
        amountUSD: z.number(),
        amountUSDT: z.number(),
        description: z.string(),
        processedBy: z.string(),
        processedByName: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [account] = await db
        .select()
        .from(treasuryAccounts)
        .where(eq(treasuryAccounts.id, input.treasuryAccountId));

      if (!account) {
        throw new Error("الحساب غير موجود");
      }

      // تحديث الرصيد
      const newBalanceLYD = (parseFloat(account.balanceLYD) + input.amountLYD).toFixed(2);
      const newBalanceUSD = (parseFloat(account.balanceUSD) + input.amountUSD).toFixed(2);
      const newBalanceUSDT = (parseFloat(account.balanceUSDT) + input.amountUSDT).toFixed(2);

      await db
        .update(treasuryAccounts)
        .set({
          balanceLYD: newBalanceLYD,
          balanceUSD: newBalanceUSD,
          balanceUSDT: newBalanceUSDT,
        })
        .where(eq(treasuryAccounts.id, input.treasuryAccountId));

      // تسجيل المعاملة
      await db.insert(accountTransactions).values({
        id: nanoid(),
        transactionType: "adjustment",
        fromAccountType: null,
        fromAccountId: null,
        toAccountType: "treasury",
        toAccountId: input.treasuryAccountId,
        amountLYD: input.amountLYD.toFixed(2),
        amountUSD: input.amountUSD.toFixed(2),
        amountUSDT: input.amountUSDT.toFixed(2),
        description: input.description,
        processedBy: input.processedBy,
        processedByName: input.processedByName,
      });

      return { success: true };
    }),

  /**
   * سحب من حساب خزينة
   */
  withdrawFromTreasury: publicProcedure
    .input(
      z.object({
        treasuryAccountId: z.string(),
        amountLYD: z.number(),
        amountUSD: z.number(),
        amountUSDT: z.number(),
        description: z.string(),
        processedBy: z.string(),
        processedByName: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [account] = await db
        .select()
        .from(treasuryAccounts)
        .where(eq(treasuryAccounts.id, input.treasuryAccountId));

      if (!account) {
        throw new Error("الحساب غير موجود");
      }

      // التحقق من الرصيد
      if (parseFloat(account.balanceLYD) < input.amountLYD) {
        throw new Error("الرصيد غير كافٍ (دينار ليبي)");
      }
      if (parseFloat(account.balanceUSD) < input.amountUSD) {
        throw new Error("الرصيد غير كافٍ (دولار أمريكي)");
      }
      if (parseFloat(account.balanceUSDT) < input.amountUSDT) {
        throw new Error("الرصيد غير كافٍ (USDT)");
      }

      // تحديث الرصيد
      const newBalanceLYD = (parseFloat(account.balanceLYD) - input.amountLYD).toFixed(2);
      const newBalanceUSD = (parseFloat(account.balanceUSD) - input.amountUSD).toFixed(2);
      const newBalanceUSDT = (parseFloat(account.balanceUSDT) - input.amountUSDT).toFixed(2);

      await db
        .update(treasuryAccounts)
        .set({
          balanceLYD: newBalanceLYD,
          balanceUSD: newBalanceUSD,
          balanceUSDT: newBalanceUSDT,
        })
        .where(eq(treasuryAccounts.id, input.treasuryAccountId));

      // تسجيل المعاملة
      await db.insert(accountTransactions).values({
        id: nanoid(),
        transactionType: "adjustment",
        fromAccountType: "treasury",
        fromAccountId: input.treasuryAccountId,
        toAccountType: null,
        toAccountId: null,
        amountLYD: input.amountLYD.toFixed(2),
        amountUSD: input.amountUSD.toFixed(2),
        amountUSDT: input.amountUSDT.toFixed(2),
        description: input.description,
        processedBy: input.processedBy,
        processedByName: input.processedByName,
      });

      return { success: true };
    }),

  /**
   * تحويل بين حسابات الخزينة
   */
  transferBetweenTreasury: publicProcedure
    .input(
      z.object({
        fromAccountId: z.string(),
        toAccountId: z.string(),
        amountLYD: z.number(),
        amountUSD: z.number(),
        amountUSDT: z.number(),
        description: z.string(),
        processedBy: z.string(),
        processedByName: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [fromAccount] = await db
        .select()
        .from(treasuryAccounts)
        .where(eq(treasuryAccounts.id, input.fromAccountId));

      const [toAccount] = await db
        .select()
        .from(treasuryAccounts)
        .where(eq(treasuryAccounts.id, input.toAccountId));

      if (!fromAccount || !toAccount) {
        throw new Error("أحد الحسابات غير موجود");
      }

      // التحقق من الرصيد
      if (parseFloat(fromAccount.balanceLYD) < input.amountLYD) {
        throw new Error("الرصيد غير كافٍ (دينار ليبي)");
      }
      if (parseFloat(fromAccount.balanceUSD) < input.amountUSD) {
        throw new Error("الرصيد غير كافٍ (دولار أمريكي)");
      }
      if (parseFloat(fromAccount.balanceUSDT) < input.amountUSDT) {
        throw new Error("الرصيد غير كافٍ (USDT)");
      }

      // تحديث الرصيد (خصم من الحساب المصدر)
      const newFromBalanceLYD = (parseFloat(fromAccount.balanceLYD) - input.amountLYD).toFixed(2);
      const newFromBalanceUSD = (parseFloat(fromAccount.balanceUSD) - input.amountUSD).toFixed(2);
      const newFromBalanceUSDT = (parseFloat(fromAccount.balanceUSDT) - input.amountUSDT).toFixed(2);

      await db
        .update(treasuryAccounts)
        .set({
          balanceLYD: newFromBalanceLYD,
          balanceUSD: newFromBalanceUSD,
          balanceUSDT: newFromBalanceUSDT,
        })
        .where(eq(treasuryAccounts.id, input.fromAccountId));

      // تحديث الرصيد (إضافة إلى الحساب الهدف)
      const newToBalanceLYD = (parseFloat(toAccount.balanceLYD) + input.amountLYD).toFixed(2);
      const newToBalanceUSD = (parseFloat(toAccount.balanceUSD) + input.amountUSD).toFixed(2);
      const newToBalanceUSDT = (parseFloat(toAccount.balanceUSDT) + input.amountUSDT).toFixed(2);

      await db
        .update(treasuryAccounts)
        .set({
          balanceLYD: newToBalanceLYD,
          balanceUSD: newToBalanceUSD,
          balanceUSDT: newToBalanceUSDT,
        })
        .where(eq(treasuryAccounts.id, input.toAccountId));

      // تسجيل المعاملة
      await db.insert(accountTransactions).values({
        id: nanoid(),
        transactionType: "treasury_to_treasury",
        fromAccountType: "treasury",
        fromAccountId: input.fromAccountId,
        toAccountType: "treasury",
        toAccountId: input.toAccountId,
        amountLYD: input.amountLYD.toFixed(2),
        amountUSD: input.amountUSD.toFixed(2),
        amountUSDT: input.amountUSDT.toFixed(2),
        description: input.description,
        processedBy: input.processedBy,
        processedByName: input.processedByName,
      });

      return { success: true };
    }),

  /**
   * الحصول على سجل المعاملات
   */
  getTransactions: publicProcedure
    .input(
      z.object({
        limit: z.number().optional().default(100),
        transactionType: z
          .enum([
            "capital_to_intermediary",
            "intermediary_to_treasury",
            "treasury_to_treasury",
            "operation_revenue",
            "operation_expense",
            "expense",
            "salary",
            "adjustment",
          ])
          .optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { limit, transactionType } = input;

      let query = db.select().from(accountTransactions);

      if (transactionType) {
        query = query.where(eq(accountTransactions.transactionType, transactionType)) as any;
      }

      const transactions = await query.limit(limit);

      return transactions;
    }),

  /**
   * إغلاق اليوم - إنشاء تقرير شامل
   */
  closeDayReport: publicProcedure
    .input(
      z.object({
        reportDate: z.string(),
        processedBy: z.string(),
        processedByName: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // جلب جميع البيانات
      const [capitalAccount] = await db.select().from(capitalAccounts);
      const [intermediaryAcct] = await db.select().from(intermediaryAccount);
      const treasuryAccountsList = await db.select().from(treasuryAccounts);
      const operations = await db.select().from(dailyOperations);
      const expensesList = await db.select().from(expenses);
      const salariesList = await db.select().from(salaries);

      // حساب الإحصائيات
      const report = {
        reportDate: input.reportDate,
        capitalAccount: {
          balanceLYD: capitalAccount?.totalCapitalLYD || "0",
          balanceUSD: capitalAccount?.totalCapitalUSD || "0",
          balanceUSDT: capitalAccount?.totalCapitalUSDT || "0",
        },
        intermediaryAccount: {
          balanceLYD: intermediaryAcct?.balanceLYD || "0",
          balanceUSD: intermediaryAcct?.balanceUSD || "0",
          balanceUSDT: intermediaryAcct?.balanceUSDT || "0",
        },
        treasuryAccounts: treasuryAccountsList.map((acc) => ({
          accountName: acc.accountName,
          accountType: acc.accountType,
          balanceLYD: acc.balanceLYD,
          balanceUSD: acc.balanceUSD,
          balanceUSDT: acc.balanceUSDT,
        })),
        operations: {
          count: operations.length,
          totalProfit: operations
            .reduce((sum, op) => sum + parseFloat(op.profit || "0"), 0)
            .toFixed(2),
        },
        expenses: {
          count: expensesList.length,
          totalAmountLYD: expensesList
            .filter(exp => exp.currency === "LYD")
            .reduce((sum, exp) => sum + parseFloat(exp.amount || "0"), 0)
            .toFixed(2),
          totalAmountUSD: expensesList
            .filter(exp => exp.currency === "USD")
            .reduce((sum, exp) => sum + parseFloat(exp.amount || "0"), 0)
            .toFixed(2),
          totalAmountUSDT: expensesList
            .filter(exp => exp.currency === "USDT")
            .reduce((sum, exp) => sum + parseFloat(exp.amount || "0"), 0)
            .toFixed(2),
        },
        salaries: {
          count: salariesList.length,
          totalAmountLYD: salariesList
            .filter(sal => sal.currency === "LYD")
            .reduce((sum, sal) => sum + parseFloat(sal.totalSalary || "0"), 0)
            .toFixed(2),
          totalAmountUSD: salariesList
            .filter(sal => sal.currency === "USD")
            .reduce((sum, sal) => sum + parseFloat(sal.totalSalary || "0"), 0)
            .toFixed(2),
          totalAmountUSDT: salariesList
            .filter(sal => sal.currency === "USDT")
            .reduce((sum, sal) => sum + parseFloat(sal.totalSalary || "0"), 0)
            .toFixed(2),
        },
        processedBy: input.processedBy,
        processedByName: input.processedByName,
      };

      return report;
    }),
});