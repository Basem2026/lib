import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { employeeDailyCustody, dailyOperations } from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * Custody Router - إدارة العهدة اليومية للموظفين
 */
export const custodyRouter = router({
  /**
   * فتح عهدة يومية جديدة
   */
  openDailyCustody: publicProcedure
    .input(
      z.object({
        employeeId: z.string(),
        employeeName: z.string(),
        custodyDate: z.string(), // YYYY-MM-DD
        initialBalanceLYDCash: z.number().default(0),
        initialBalanceLYDBank: z.number().default(0),
        initialBalanceUSDCash: z.number().default(0),
        initialBalanceUSDT: z.number().default(0),
        createdBy: z.string(),
        createdByName: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // التحقق من عدم وجود عهدة مفتوحة لنفس الموظف في نفس اليوم
      const existing = await db
        .select()
        .from(employeeDailyCustody)
        .where(
          and(
            eq(employeeDailyCustody.employeeId, input.employeeId),
            eq(employeeDailyCustody.custodyDate, input.custodyDate),
            eq(employeeDailyCustody.status, "open")
          )
        );

      if (existing.length > 0) {
        throw new Error("يوجد عهدة مفتوحة بالفعل لهذا الموظف في هذا اليوم");
      }

      const custodyId = nanoid();

      await db.insert(employeeDailyCustody).values({
        id: custodyId,
        employeeId: input.employeeId,
        employeeName: input.employeeName,
        custodyDate: input.custodyDate,
        initialBalanceLYDCash: input.initialBalanceLYDCash.toFixed(2),
        initialBalanceLYDBank: input.initialBalanceLYDBank.toFixed(2),
        initialBalanceUSDCash: input.initialBalanceUSDCash.toFixed(2),
        initialBalanceUSDT: input.initialBalanceUSDT.toFixed(2),
        currentBalanceLYDCash: input.initialBalanceLYDCash.toFixed(2),
        currentBalanceLYDBank: input.initialBalanceLYDBank.toFixed(2),
        currentBalanceUSDCash: input.initialBalanceUSDCash.toFixed(2),
        currentBalanceUSDT: input.initialBalanceUSDT.toFixed(2),
        totalDailyProfit: "0",
        status: "open",
        createdBy: input.createdBy,
        createdByName: input.createdByName,
      });

      return { success: true, id: custodyId };
    }),

  /**
   * الحصول على العهدة المفتوحة للموظف
   */
  getOpenCustody: publicProcedure
    .input(
      z.object({
        employeeId: z.string(),
        custodyDate: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const result = await db
        .select()
        .from(employeeDailyCustody)
        .where(
          and(
            eq(employeeDailyCustody.employeeId, input.employeeId),
            eq(employeeDailyCustody.custodyDate, input.custodyDate),
            eq(employeeDailyCustody.status, "open")
          )
        )
        .limit(1);

      return result[0] || null;
    }),

  /**
   * الحصول على جميع العهد (مفتوحة ومقفولة)
   */
  getAllCustodies: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    return await db
      .select()
      .from(employeeDailyCustody)
      .orderBy(desc(employeeDailyCustody.createdAt));
  }),

  /**
   * إغلاق العهدة اليومية
   */
  closeDailyCustody: publicProcedure
    .input(
      z.object({
        custodyId: z.string(),
        managerNotes: z.string().optional(),
        closedBy: z.string(),
        closedByName: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // الحصول على العهدة
      const [custody] = await db
        .select()
        .from(employeeDailyCustody)
        .where(eq(employeeDailyCustody.id, input.custodyId));

      if (!custody) {
        throw new Error("العهدة غير موجودة");
      }

      if (custody.status === "closed") {
        throw new Error("العهدة مقفولة بالفعل");
      }

      // حساب إجمالي الأرباح من العمليات
      const operations = await db
        .select()
        .from(dailyOperations)
        .where(
          and(
            eq(dailyOperations.createdBy, custody.employeeId),
            sql`DATE(${dailyOperations.createdAt}) = ${custody.custodyDate}`
          )
        );

      const totalProfit = operations.reduce(
        (sum, op) => sum + parseFloat(op.profit || "0"),
        0
      );

      // إغلاق العهدة
      await db
        .update(employeeDailyCustody)
        .set({
          status: "closed",
          totalDailyProfit: totalProfit.toFixed(2),
          managerNotes: input.managerNotes || null,
          closedAt: new Date(),
          closedBy: input.closedBy,
          closedByName: input.closedByName,
        })
        .where(eq(employeeDailyCustody.id, input.custodyId));

      return {
        success: true,
        finalBalances: {
          lydCash: parseFloat(custody.currentBalanceLYDCash || "0"),
          lydBank: parseFloat(custody.currentBalanceLYDBank || "0"),
          usdCash: parseFloat(custody.currentBalanceUSDCash || "0"),
          usdt: parseFloat(custody.currentBalanceUSDT || "0"),
        },
        totalProfit,
      };
    }),

  /**
   * تحديث أرصدة العهدة (يُستدعى تلقائياً عند إضافة عملية)
   */
  updateCustodyBalances: publicProcedure
    .input(
      z.object({
        custodyId: z.string(),
        lydCashChange: z.number().default(0),
        lydBankChange: z.number().default(0),
        usdCashChange: z.number().default(0),
        usdtChange: z.number().default(0),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [custody] = await db
        .select()
        .from(employeeDailyCustody)
        .where(eq(employeeDailyCustody.id, input.custodyId));

      if (!custody) {
        throw new Error("العهدة غير موجودة");
      }

      const newBalances = {
        currentBalanceLYDCash: (
          parseFloat(custody.currentBalanceLYDCash || "0") + input.lydCashChange
        ).toFixed(2),
        currentBalanceLYDBank: (
          parseFloat(custody.currentBalanceLYDBank || "0") + input.lydBankChange
        ).toFixed(2),
        currentBalanceUSDCash: (
          parseFloat(custody.currentBalanceUSDCash || "0") + input.usdCashChange
        ).toFixed(2),
        currentBalanceUSDT: (
          parseFloat(custody.currentBalanceUSDT || "0") + input.usdtChange
        ).toFixed(2),
      };

      await db
        .update(employeeDailyCustody)
        .set(newBalances)
        .where(eq(employeeDailyCustody.id, input.custodyId));

      return { success: true, newBalances };
    }),
});
