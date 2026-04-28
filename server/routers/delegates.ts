import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { delegates, auditLogs } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export const delegatesRouter = router({
  /**
   * Get all delegates
   */
  list: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const allDelegates = await db.select().from(delegates);
    return allDelegates;
  }),

  /**
   * Create a new delegate
   */
  create: publicProcedure
    .input(
      z.object({
        fullName: z.string().min(1),
        phone: z.string().min(1),
        address: z.string().optional(),
        notes: z.string().optional(),
        createdBy: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const id = nanoid();
      await db.insert(delegates).values({
        id,
        fullName: input.fullName,
        phone: input.phone,
        address: input.address,
        notes: input.notes,
        createdBy: input.createdBy,
      });
      
      // تسجيل في السجلات
      await db.insert(auditLogs).values({
        id: nanoid(),
        action: 'create',
        entityType: 'system',
        entityId: id,
        userId: input.createdBy,
        userName: input.createdBy,
        details: { metadata: `إضافة مندوب: ${input.fullName} - ${input.phone}` },
      });
      
      return { success: true, id };
    }),

  /**
   * Update a delegate
   */
  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        fullName: z.string().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        status: z.enum(["active", "disabled"]).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...updateData } = input;
      const updateValues: any = {};
      
      if (updateData.fullName) updateValues.fullName = updateData.fullName;
      if (updateData.phone) updateValues.phone = updateData.phone;
      if (updateData.address !== undefined) updateValues.address = updateData.address;
      if (updateData.status) updateValues.status = updateData.status;
      if (updateData.notes !== undefined) updateValues.notes = updateData.notes;

      await db.update(delegates).set(updateValues).where(eq(delegates.id, id));
      
      // تسجيل في السجلات
      const delegate = await db.select().from(delegates).where(eq(delegates.id, id)).limit(1);
      if (delegate[0]) {
        await db.insert(auditLogs).values({
          id: nanoid(),
          action: 'update',
          entityType: 'system',
          entityId: id,
          userId: 'system',
          userName: 'النظام',
          details: { metadata: `تعديل مندوب: ${delegate[0].fullName}` },
        });
      }
      
      return { success: true };
    }),

  /**
   * Delete a delegate
   */
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      // الحصول على بيانات المندوب قبل الحذف
      const delegate = await db.select().from(delegates).where(eq(delegates.id, input.id)).limit(1);
      
      await db.delete(delegates).where(eq(delegates.id, input.id));
      
      // تسجيل في السجلات
      if (delegate[0]) {
        await db.insert(auditLogs).values({
          id: nanoid(),
          action: 'delete',
          entityType: 'system',
          entityId: input.id,
          userId: 'system',
          userName: 'النظام',
          details: { metadata: `حذف مندوب: ${delegate[0].fullName} - ${delegate[0].phone}` },
        });
      }
      
      return { success: true };
    }),

  /**
   * Get a single delegate by ID
   */
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [delegate] = await db
        .select()
        .from(delegates)
        .where(eq(delegates.id, input.id));
      return delegate;
    }),
});
