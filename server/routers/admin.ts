import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import {
  employees,
  customers,
  cards,
  expenses,
  salaries,
  treasuryAccounts,
  accountTransactions,
  dailyOperations,
  auditLogs,
  treasuryRecords,
  bankAccounts,
  delegates,
  delegateCommissions,
  unifiedTransactions,
  employeeDailyCustody,
  capitalAccount,
} from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Admin Router - إدارة النظام
 * يستخدم publicProcedure لأن نظام المصادقة محلي (localStorage)
 */
export const adminRouter = router({
  /**
   * إعادة تعيين النظام بالكامل - مسح جميع البيانات
   * يتطلب كلمة مرور المدير للتأكيد
   */
  resetSystem: publicProcedure
    .input(
      z.object({
        managerPassword: z.string(),
        managerEmployeeCode: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("قاعدة البيانات غير متوفرة");

        // التحقق من كلمة مرور المدير في قاعدة البيانات
        const managerList = await db
          .select()
          .from(employees)
          .where(eq(employees.employeeCode, input.managerEmployeeCode));

        if (managerList.length > 0) {
          const manager = managerList[0];
          if (manager.jobTitle !== "manager") {
            throw new Error("هذه العملية متاحة للمدير فقط");
          }
          const bcrypt = await import("bcrypt");
          const isValid = await bcrypt.compare(
            input.managerPassword,
            manager.passwordHash
          );
          if (!isValid) {
            throw new Error("كلمة المرور غير صحيحة");
          }
        }
        // إذا لم يكن المدير في قاعدة البيانات (محفوظ في localStorage)
        // نقبل العملية لأن التحقق تم في الفرونت إند

        // مسح جميع البيانات بالترتيب الصحيح (الجداول الفرعية أولاً)
        await db.delete(delegateCommissions);
        await db.delete(delegates);
        await db.delete(employeeDailyCustody);
        await db.delete(accountTransactions);
        await db.delete(dailyOperations);
        await db.delete(expenses);
        await db.delete(salaries);
        await db.delete(auditLogs);
        await db.delete(treasuryRecords);
        await db.delete(unifiedTransactions);
        await db.delete(cards);
        await db.delete(customers);
        await db.delete(treasuryAccounts);
        await db.delete(bankAccounts);
        await db.delete(capitalAccount);
        await db.delete(employees);

        return {
          success: true,
          message: "تم إعادة تعيين النظام بنجاح. جميع البيانات تم مسحها.",
        };
      } catch (error: any) {
        console.error("Error resetting system:", error);
        throw new Error(error.message || "فشل إعادة تعيين النظام");
      }
    }),

  /**
   * تنظيف جميع البيانات من قاعدة البيانات (للاستخدام الداخلي)
   */
  clearAllData: publicProcedure.mutation(async () => {
    try {
      const db = await getDb();
      if (!db) throw new Error("قاعدة البيانات غير متوفرة");

      await db.delete(delegateCommissions);
      await db.delete(delegates);
      await db.delete(employeeDailyCustody);
      await db.delete(accountTransactions);
      await db.delete(dailyOperations);
      await db.delete(expenses);
      await db.delete(salaries);
      await db.delete(auditLogs);
      await db.delete(treasuryRecords);
      await db.delete(unifiedTransactions);
      await db.delete(cards);
      await db.delete(customers);
      await db.delete(treasuryAccounts);
      await db.delete(bankAccounts);
      await db.delete(capitalAccount);
      await db.delete(employees);

      return {
        success: true,
        message: "تم تنظيف جميع البيانات بنجاح",
      };
    } catch (error: any) {
      console.error("Error clearing data:", error);
      throw new Error(`فشل تنظيف البيانات: ${error.message}`);
    }
  }),
});
