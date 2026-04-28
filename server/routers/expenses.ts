import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { expenses, treasuryAccounts, accountTransactions, auditLogs } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

export const expensesRouter = router({
  // Get all expenses
  getAll: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return await db.select().from(expenses).orderBy(desc(expenses.createdAt));
  }),

  // Get expense by ID
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select().from(expenses).where(eq(expenses.id, input.id)).limit(1);
      return result[0] || null;
    }),

  // Create expense
  create: publicProcedure
    .input(
      z.object({
        expenseType: z.enum(["rent", "utilities", "maintenance", "supplies", "transportation", "communication", "other"]),
        description: z.string(),
        amount: z.number(),
        currency: z.enum(["LYD", "USD", "USDT"]).default("LYD"),
        paymentMethod: z.enum(["cash", "bank"]).default("cash"),
        treasuryAccountId: z.string().optional(),
        expenseDate: z.string(),
        notes: z.string().optional(),
        createdBy: z.string(),
        createdByName: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const expenseId = nanoid();

      // إنشاء المصروف
      await db.insert(expenses).values({
        id: expenseId,
        expenseType: input.expenseType,
        description: input.description,
        amount: input.amount.toFixed(2),
        currency: input.currency,
        paymentMethod: input.paymentMethod,
        treasuryAccountId: input.treasuryAccountId || null,
        expenseDate: input.expenseDate,
        notes: input.notes || null,
        createdBy: input.createdBy,
        createdByName: input.createdByName,
      });

      // ربط مع حساب الخزينة (خصم المصروف)
      if (input.treasuryAccountId && input.amount > 0) {
        const [treasuryAccount] = await db
          .select()
          .from(treasuryAccounts)
          .where(eq(treasuryAccounts.id, input.treasuryAccountId));

        if (treasuryAccount) {
          // خصم من الرصيد حسب العملة
          let newBalanceLYD = treasuryAccount.balanceLYD;
          let newBalanceUSD = treasuryAccount.balanceUSD;
          let newBalanceUSDT = treasuryAccount.balanceUSDT;

          if (input.currency === "LYD") {
            newBalanceLYD = (parseFloat(treasuryAccount.balanceLYD) - input.amount).toFixed(2);
          } else if (input.currency === "USD") {
            newBalanceUSD = (parseFloat(treasuryAccount.balanceUSD) - input.amount).toFixed(2);
          } else if (input.currency === "USDT") {
            newBalanceUSDT = (parseFloat(treasuryAccount.balanceUSDT) - input.amount).toFixed(2);
          }

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
            transactionType: "expense",
            fromAccountType: "treasury",
            fromAccountId: input.treasuryAccountId,
            toAccountType: null,
            toAccountId: null,
            amountLYD: input.currency === "LYD" ? input.amount.toFixed(2) : "0",
            amountUSD: input.currency === "USD" ? input.amount.toFixed(2) : "0",
            amountUSDT: input.currency === "USDT" ? input.amount.toFixed(2) : "0",
            description: `مصروف: ${input.description}`,
            relatedEntityType: "expense",
            relatedEntityId: expenseId,
            processedBy: input.createdBy,
            processedByName: input.createdByName,
          });
        }
      }

      // تسجيل في Audit Trail
      const expenseTypeLabels: Record<string, string> = { rent: 'إيجار', utilities: 'خدمات', maintenance: 'صيانة', supplies: 'لوازم', transportation: 'مواصلات', communication: 'اتصالات', other: 'أخرى' };
      await db.insert(auditLogs).values({
        id: nanoid(),
        action: 'create',
        entityType: 'expense',
        entityId: expenseId,
        userId: input.createdBy,
        userName: input.createdByName,
        details: {
          description: `قام ${input.createdByName} بتسجيل مصروف ${expenseTypeLabels[input.expenseType] || input.expenseType} بمبلغ ${input.amount.toLocaleString('ar-LY')} ${input.currency}${input.description ? ` - ${input.description}` : ''}`,
          after: {
            expenseType: input.expenseType,
            description: input.description,
            amount: input.amount,
            currency: input.currency,
            paymentMethod: input.paymentMethod,
          },
        },
      });
      return { success: true, id: expenseId };
    }),

  // Delete expense
  delete: publicProcedure
    .input(z.object({ 
      id: z.string(),
      deletedBy: z.string(),
      deletedByName: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // قراءة المصروف قبل الحذف
      const [expense] = await db.select().from(expenses).where(eq(expenses.id, input.id));

      await db.delete(expenses).where(eq(expenses.id, input.id));

       // تسجيل في Audit Trail
      if (expense) {
        const delExpenseLabels: Record<string, string> = { rent: 'إيجار', utilities: 'خدمات', maintenance: 'صيانة', supplies: 'لوازم', transportation: 'مواصلات', communication: 'اتصالات', other: 'أخرى' };
        await db.insert(auditLogs).values({
          id: nanoid(),
          action: 'delete',
          entityType: 'expense',
          entityId: input.id,
          userId: input.deletedBy,
          userName: input.deletedByName,
          details: {
            description: `قام ${input.deletedByName} بحذف مصروف ${delExpenseLabels[expense.expenseType] || expense.expenseType} بمبلغ ${expense.amount} ${expense.currency}`,
            before: expense,
          },
        });
      }
      return { success: true };
    }),
});
