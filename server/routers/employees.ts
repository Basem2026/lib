import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { employees, auditLogs, type InsertEmployee } from "../../drizzle/schema";
import { nanoid } from "nanoid";
import { notifyOwner } from "../_core/notification";
import { eq } from "drizzle-orm";

export const employeesRouter = router({
  // Get all employees
  getAll: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return await db.select().from(employees);
  }),

  // Get employee by ID
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select().from(employees).where(eq(employees.id, input.id)).limit(1);
      return result[0] || null;
    }),

  // Get employee by phone
  getByPhone: publicProcedure
    .input(z.object({ phone: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select().from(employees).where(eq(employees.phone, input.phone)).limit(1);
      return result[0] || null;
    }),

  // Create employee
  create: publicProcedure
    .input(z.object({
      id: z.string(),
      employeeCode: z.string(),
      phone: z.string(),
      fullName: z.string(),
      jobTitle: z.enum(["data_entry", "operations", "supervisor", "deputy_manager", "accountant", "manager"]),
      passwordHash: z.string(),
      status: z.enum(["active", "disabled"]).default("active"),
      permissions: z.array(z.string()),
      salary: z.number().optional(),
      notes: z.string().optional(),
      createdBy: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const insertData: InsertEmployee = {
        ...input,
        salary: input.salary?.toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await db.insert(employees).values(insertData);
      
      // تسجيل في Audit Trail
      await db.insert(auditLogs).values({
        id: nanoid(),
        action: 'create',
        entityType: 'employee',
        entityId: input.id,
        userId: input.createdBy,
        userName: input.createdBy, // يمكن تحسينه لاحقاً
        timestamp: new Date(),
        details: {
          after: {
            fullName: input.fullName,
            jobTitle: input.jobTitle,
            phone: input.phone,
            salary: input.salary,
          },
          metadata: {
            employeeCode: input.employeeCode,
            fullName: input.fullName,
          },
        },
      });
      
      // إرسال إشعار للمدير
      const jobTitles: Record<string, string> = {
        data_entry: 'إدخال بيانات',
        operations: 'عمليات',
        supervisor: 'مشرف',
        deputy_manager: 'نائب مدير',
        accountant: 'محاسب',
        manager: 'مدير',
      };
      
      await notifyOwner({
        title: 'إضافة موظف جديد',
        content: `تم إضافة موظف جديد: ${input.fullName} (${jobTitles[input.jobTitle] || input.jobTitle})، رقم الهاتف: ${input.phone}، الكود: ${input.employeeCode}`,
      });
      
      return { success: true };
    }),

  // Update employee
  update: publicProcedure
    .input(z.object({
      id: z.string(),
      fullName: z.string().optional(),
      jobTitle: z.enum(["data_entry", "operations", "supervisor", "deputy_manager", "accountant", "manager"]).optional(),
      passwordHash: z.string().optional(),
      status: z.enum(["active", "disabled"]).optional(),
      permissions: z.array(z.string()).optional(),
      salary: z.number().optional(),
      notes: z.string().optional(),
      updatedBy: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { id, updatedBy, ...updates } = input;
      const updateData: any = {
        ...updates,
        salary: updates.salary?.toString(),
        updatedBy,
        updatedAt: new Date(),
      };
      
      // جلب البيانات القديمة
      const oldData = await db.select().from(employees).where(eq(employees.id, id)).limit(1);
      
      await db.update(employees).set(updateData).where(eq(employees.id, id));
      
      // تسجيل في Audit Trail
      await db.insert(auditLogs).values({
        id: nanoid(),
        action: 'update',
        entityType: 'employee',
        entityId: id,
        userId: updatedBy,
        userName: updatedBy, // يمكن تحسينه لاحقاً
        timestamp: new Date(),
        details: {
          before: oldData[0] ? {
            fullName: oldData[0].fullName,
            jobTitle: oldData[0].jobTitle,
            status: oldData[0].status,
            salary: oldData[0].salary,
          } : undefined,
          after: {
            fullName: updates.fullName,
            jobTitle: updates.jobTitle,
            status: updates.status,
            salary: updates.salary,
          },
        },
      });
      
      return { success: true };
    }),

  // Delete employee
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      // جلب البيانات قبل الحذف
      const employeeData = await db.select().from(employees).where(eq(employees.id, input.id)).limit(1);
      
      await db.delete(employees).where(eq(employees.id, input.id));
      
      // تسجيل في Audit Trail
      if (employeeData[0]) {
        await db.insert(auditLogs).values({
          id: nanoid(),
          action: 'delete',
          entityType: 'employee',
          entityId: input.id,
          userId: 'system', // يجب تمرير userId من Frontend
          userName: 'النظام',
          timestamp: new Date(),
          details: {
            before: {
              fullName: employeeData[0].fullName,
              jobTitle: employeeData[0].jobTitle,
              phone: employeeData[0].phone,
              salary: employeeData[0].salary,
            },
          },
        });
      }
      
      return { success: true };
    }),

  // Login mutation
  login: publicProcedure
    .input(z.object({
      phone: z.string(),
      password: z.string(),
    }))
    .mutation(async ({ input }) => {
      const bcrypt = await import('bcrypt');
      const db = await getDb();
      if (!db) throw new Error('فشل الاتصال بقاعدة البيانات');

      // البحث عن الموظف
      const result = await db.select().from(employees).where(eq(employees.phone, input.phone)).limit(1);
      const employee = result[0];

      if (!employee) {
        throw new Error('رقم الهاتف غير مسجل');
      }

      // التحقق من حالة الموظف
      if (employee.status !== 'active') {
        throw new Error('حسابك معطل، يرجى التواصل مع المدير');
      }

      // التحقق من كلمة المرور
      const isValid = await bcrypt.compare(input.password, employee.passwordHash);
      if (!isValid) {
        throw new Error('كلمة المرور غير صحيحة');
      }

      return {
        success: true,
        employee: {
          id: employee.id,
          employeeCode: employee.employeeCode,
          phone: employee.phone,
          fullName: employee.fullName,
          jobTitle: employee.jobTitle,
          permissions: employee.permissions,
        },
      };
    }),
});
