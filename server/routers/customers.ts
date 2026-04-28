import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { customers, auditLogs, delegateCommissions, delegates, treasuryAccounts, treasuryRecords } from "../../drizzle/schema";
import { nanoid } from "nanoid";
import { notifyOwner } from "../_core/notification";
import { eq, sql } from "drizzle-orm";
import { broadcastSync } from "../sync";
import { buildCustomerLog, extractChanges, CUSTOMER_FIELD_LABELS } from "../logMessages";

export const customersRouter = router({
  getAll: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return await db.select().from(customers);
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select().from(customers).where(eq(customers.id, input.id)).limit(1);
      return result[0] || null;
    }),

  create: publicProcedure
    .input(z.any())
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const insertData: any = {
        ...input,
        purchasePrice: input.purchasePrice?.toString() || null,
        delegateShare: input.delegateShare?.toString() || null,
        totalPrice: input.totalPrice?.toString() || null,
        totalBalance: input.totalBalance?.toString() || "0",
        registrationDate: new Date(),
        updatedAt: new Date(),
      };
      await db.insert(customers).values(insertData);
      
      // ربط مع الخزينة - خصم التكلفة الإجمالية من كاش دينار
      if (input.totalPrice && parseFloat(input.totalPrice) > 0) {
        const totalCost = parseFloat(input.totalPrice);
        
        // 1. تحديث treasuryAccounts
        const [cashAccount] = await db.select().from(treasuryAccounts).where(eq(treasuryAccounts.id, 'cash_lyd')).limit(1);
        if (cashAccount) {
          const newBalance = (parseFloat(cashAccount.balanceLYD || '0') - totalCost).toFixed(2);
          await db.update(treasuryAccounts).set({ balanceLYD: newBalance }).where(eq(treasuryAccounts.id, 'cash_lyd'));
        }
        
        // 2. تسجيل في treasury_records
        await db.insert(treasuryRecords).values({
          id: nanoid(),
          type: 'withdrawal',
          amount: totalCost.toFixed(2),
          currency: 'LYD',
          description: `إضافة زبون - ${input.name} - تكلفة إجمالية`,
          reference: `CUST-${input.id}`,
          processedBy: input.createdBy || 'system',
          data: { customerId: input.id, customerName: input.name },
        });
      }
      
      // تسجيل عمولة المندوب إذا كان موجوداً
      if (input.delegateId && input.delegateShare && parseFloat(input.delegateShare) > 0) {
        await db.insert(delegateCommissions).values({
          id: nanoid(),
          delegateId: input.delegateId,
          customerId: input.id,
          customerName: input.name,
          bankName: input.bankName || 'غير محدد',
          amount: input.delegateShare.toString(),
          status: 'pending',
        });
        
        // تحديث إحصائيات المندوب
        await db.update(delegates)
          .set({
            totalCommissions: sql`${delegates.totalCommissions} + ${input.delegateShare}`,
            totalCustomers: sql`${delegates.totalCustomers} + 1`,
          })
          .where(eq(delegates.id, input.delegateId));
      }
      
      // تسجيل في Audit Trail بنص عربي مقروء
      const description = buildCustomerLog('create', input.name, input.createdByName || 'النظام');
      await db.insert(auditLogs).values({
        id: nanoid(),
        action: 'create',
        entityType: 'customer',
        entityId: input.id,
        userId: input.createdBy || 'system',
        userName: input.createdByName || 'النظام',
        timestamp: new Date(),
        details: {
          description,
          after: {
            name: input.name,
            phone: input.phone,
            idNumber: input.idNumber,
            totalPrice: input.totalPrice,
          },
        },
      });
      
      // إرسال إشعار للمدير
      await notifyOwner({
        title: 'إضافة زبون جديد',
        content: description,
      });

      // إرسال حدث المزامنة لجميع المتصلين
      broadcastSync({
        type: 'customer_created',
        entityId: input.id,
        entityType: 'customer',
        data: { name: input.name },
        timestamp: Date.now(),
        triggeredBy: input.createdBy,
      });
      
      return { success: true };
    }),

  update: publicProcedure
    .input(z.object({
      id: z.string(),
      updates: z.any(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const updateData: any = { ...input.updates, updatedAt: new Date() };
      
      // تحويل الحقول الرقمية
      if (updateData.purchasePrice !== undefined) updateData.purchasePrice = updateData.purchasePrice?.toString();
      if (updateData.delegateShare !== undefined) updateData.delegateShare = updateData.delegateShare?.toString();
      if (updateData.totalPrice !== undefined) updateData.totalPrice = updateData.totalPrice?.toString();
      if (updateData.totalBalance !== undefined) updateData.totalBalance = updateData.totalBalance?.toString();
      
      // جلب البيانات القديمة
      const oldData = await db.select().from(customers).where(eq(customers.id, input.id)).limit(1);
      const oldCustomer = oldData[0];
      
      await db.update(customers).set(updateData).where(eq(customers.id, input.id));
      
      // استخراج التغييرات الفعلية
      const changes = oldCustomer
        ? extractChanges(oldCustomer as any, updateData, CUSTOMER_FIELD_LABELS)
        : [];
      
      // بناء نص السجل العربي
      const description = buildCustomerLog(
        'update',
        oldCustomer?.name || input.id,
        input.updates.updatedByName || 'النظام',
        changes
      );
      
      // تسجيل في Audit Trail بنص عربي مقروء
      await db.insert(auditLogs).values({
        id: nanoid(),
        action: 'update',
        entityType: 'customer',
        entityId: input.id,
        userId: input.updates.updatedBy || 'system',
        userName: input.updates.updatedByName || 'النظام',
        timestamp: new Date(),
        details: {
          description,
          before: oldCustomer ? {
            name: oldCustomer.name,
            phone: oldCustomer.phone,
            operationStatus: oldCustomer.operationStatus,
          } : undefined,
          after: {
            name: updateData.name,
            phone: updateData.phone,
            operationStatus: updateData.operationStatus,
          },
          changes: changes.map(c => ({
            fieldLabel: c.fieldLabel,
            oldValue: c.oldValue,
            newValue: c.newValue,
          })),
        },
      });
      
      // إرسال حدث المزامنة
      broadcastSync({
        type: 'customer_updated',
        entityId: input.id,
        entityType: 'customer',
        timestamp: Date.now(),
        triggeredBy: input.updates.updatedBy,
      });

      return { success: true };
    }),

  delete: publicProcedure
    .input(z.object({
      id: z.string(),
      deletedBy: z.string().optional(),
      deletedByName: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      // جلب البيانات قبل الحذف
      const customerData = await db.select().from(customers).where(eq(customers.id, input.id)).limit(1);
      
      await db.delete(customers).where(eq(customers.id, input.id));
      
      // تسجيل في Audit Trail بنص عربي مقروء
      if (customerData[0]) {
        const description = buildCustomerLog(
          'delete',
          customerData[0].name,
          input.deletedByName || 'النظام'
        );
        await db.insert(auditLogs).values({
          id: nanoid(),
          action: 'delete',
          entityType: 'customer',
          entityId: input.id,
          userId: input.deletedBy || 'system',
          userName: input.deletedByName || 'النظام',
          timestamp: new Date(),
          details: {
            description,
            before: {
              name: customerData[0].name,
              phone: customerData[0].phone,
              idNumber: customerData[0].idNumber,
              operationStatus: customerData[0].operationStatus,
            },
          },
        });
      }
      
      // إرسال حدث المزامنة
      broadcastSync({
        type: 'customer_deleted',
        entityId: input.id,
        entityType: 'customer',
        timestamp: Date.now(),
      });

      return { success: true };
    }),
});
