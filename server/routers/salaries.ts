import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { salaries, treasuryAccounts, accountTransactions, auditLogs } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

export const salariesRouter = router({
  // Get all salaries
  getAll: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return await db.select().from(salaries).orderBy(desc(salaries.createdAt));
  }),

  // Get salary by ID
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select().from(salaries).where(eq(salaries.id, input.id)).limit(1);
      return result[0] || null;
    }),

  // Create salary
  create: publicProcedure
    .input(
      z.object({
        employeeId: z.string(),
        employeeName: z.string(),
        baseSalary: z.number(),
        bonuses: z.number().default(0),
        deductions: z.number().default(0),
        totalSalary: z.number(),
        currency: z.enum(["LYD", "USD", "USDT"]).default("LYD"),
        salaryMonth: z.string(), // YYYY-MM
        paymentMethod: z.enum(["cash", "bank"]).default("cash"),
        treasuryAccountId: z.string().optional(),
        paymentDate: z.string(),
        notes: z.string().optional(),
        createdBy: z.string(),
        createdByName: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const salaryId = nanoid();

      // إنشاء الراتب
      await db.insert(salaries).values({
        id: salaryId,
        employeeId: input.employeeId,
        employeeName: input.employeeName,
        baseSalary: input.baseSalary.toFixed(2),
        bonuses: input.bonuses.toFixed(2),
        deductions: input.deductions.toFixed(2),
        totalSalary: input.totalSalary.toFixed(2),
        currency: input.currency,
        salaryMonth: input.salaryMonth,
        paymentMethod: input.paymentMethod,
        treasuryAccountId: input.treasuryAccountId || null,
        paymentDate: input.paymentDate,
        notes: input.notes || null,
        createdBy: input.createdBy,
        createdByName: input.createdByName,
      });

      // ربط مع حساب الخزينة (خصم الراتب)
      if (input.treasuryAccountId && input.totalSalary > 0) {
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
            newBalanceLYD = (parseFloat(treasuryAccount.balanceLYD) - input.totalSalary).toFixed(2);
          } else if (input.currency === "USD") {
            newBalanceUSD = (parseFloat(treasuryAccount.balanceUSD) - input.totalSalary).toFixed(2);
          } else if (input.currency === "USDT") {
            newBalanceUSDT = (parseFloat(treasuryAccount.balanceUSDT) - input.totalSalary).toFixed(2);
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
            transactionType: "salary",
            fromAccountType: "treasury",
            fromAccountId: input.treasuryAccountId,
            toAccountType: null,
            toAccountId: null,
            amountLYD: input.currency === "LYD" ? input.totalSalary.toFixed(2) : "0",
            amountUSD: input.currency === "USD" ? input.totalSalary.toFixed(2) : "0",
            amountUSDT: input.currency === "USDT" ? input.totalSalary.toFixed(2) : "0",
            description: `راتب ${input.salaryMonth}: ${input.employeeName}`,
            relatedEntityType: "salary",
            relatedEntityId: salaryId,
            processedBy: input.createdBy,
            processedByName: input.createdByName,
          });
        }
      }

      // تسجيل في Audit Trail
      await db.insert(auditLogs).values({
        id: nanoid(),
        action: 'create',
        entityType: 'salary',
        entityId: salaryId,
        userId: input.createdBy,
        userName: input.createdByName,
        details: {
          description: `قام ${input.createdByName} بصرف راتب شهر ${input.salaryMonth} للموظف ${input.employeeName} بمبلغ ${input.totalSalary.toLocaleString('ar-LY')} ${input.currency}`,
          after: {
            employeeId: input.employeeId,
            employeeName: input.employeeName,
            totalSalary: input.totalSalary,
            currency: input.currency,
            salaryMonth: input.salaryMonth,
          },
        },
      });

      return { success: true, id: salaryId };
    }),

  // Delete salary
  delete: publicProcedure
    .input(z.object({ 
      id: z.string(),
      deletedBy: z.string(),
      deletedByName: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // قراءة الراتب قبل الحذف
      const [salary] = await db.select().from(salaries).where(eq(salaries.id, input.id));

      await db.delete(salaries).where(eq(salaries.id, input.id));

      // تسجيل في Audit Trail
      if (salary) {
        await db.insert(auditLogs).values({
          id: nanoid(),
          action: 'delete',
          entityType: 'salary',
          entityId: input.id,
          userId: input.deletedBy,
          userName: input.deletedByName,
          details: {
            description: `قام ${input.deletedByName} بحذف راتب شهر ${salary.salaryMonth} للموظف ${salary.employeeName} بمبلغ ${salary.totalSalary} ${salary.currency}`,
            before: salary,
          },
        });
      }

      return { success: true };
    }),
});
