import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { auditLogs } from "../../drizzle/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";

const ACTION_ENUM = z.enum([
  "create", "update", "delete", "print", "close_day",
  "approve_close", "reject_close", "permission_change",
  "login", "logout", "bulk_status_change", "bulk_withdrawal",
  "withdraw_pending", "card_sale_cash", "card_sale_bank"
]);

const ENTITY_TYPE_ENUM = z.enum([
  "customer", "card", "operation", "expense", "salary",
  "employee", "daily_close", "treasury", "system", "settings"
]);

export const auditLogsRouter = router({
  // Get all audit logs with filters
  getAll: publicProcedure
    .input(
      z.object({
        entityType: ENTITY_TYPE_ENUM.optional(),
        action: ACTION_ENUM.optional(),
        userId: z.string().optional(),
        startDate: z.string().optional(), // YYYY-MM-DD
        endDate: z.string().optional(), // YYYY-MM-DD
        limit: z.number().default(100),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      let query = db.select().from(auditLogs);

      // Apply filters
      const conditions = [];
      if (input.entityType) {
        conditions.push(eq(auditLogs.entityType, input.entityType));
      }
      if (input.action) {
        conditions.push(eq(auditLogs.action, input.action));
      }
      if (input.userId) {
        conditions.push(eq(auditLogs.userId, input.userId));
      }
      if (input.startDate) {
        conditions.push(gte(auditLogs.timestamp, new Date(input.startDate)));
      }
      if (input.endDate) {
        const endDate = new Date(input.endDate);
        endDate.setHours(23, 59, 59, 999);
        conditions.push(lte(auditLogs.timestamp, endDate));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      return await query.orderBy(desc(auditLogs.timestamp)).limit(input.limit);
    }),

  // Get audit logs by entity
  getByEntity: publicProcedure
    .input(
      z.object({
        entityType: ENTITY_TYPE_ENUM,
        entityId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      return await db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.entityType, input.entityType),
            eq(auditLogs.entityId, input.entityId)
          )
        )
        .orderBy(desc(auditLogs.timestamp));
    }),

  // Get audit log by ID
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select().from(auditLogs).where(eq(auditLogs.id, input.id)).limit(1);
      return result[0] || null;
    }),

  // Get unique users
  getUniqueUsers: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const logs = await db.select().from(auditLogs);
    
    // Extract unique users
    const uniqueUsersMap = new Map<string, { userId: string; userName: string }>();
    logs.forEach((log) => {
      if (!uniqueUsersMap.has(log.userId)) {
        uniqueUsersMap.set(log.userId, {
          userId: log.userId,
          userName: log.userName,
        });
      }
    });

    return Array.from(uniqueUsersMap.values());
  }),

  // Get statistics
  getStats: publicProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const conditions = [];
      if (input.startDate) {
        conditions.push(gte(auditLogs.timestamp, new Date(input.startDate)));
      }
      if (input.endDate) {
        const endDate = new Date(input.endDate);
        endDate.setHours(23, 59, 59, 999);
        conditions.push(lte(auditLogs.timestamp, endDate));
      }

      let query = db.select().from(auditLogs);
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const logs = await query;

      // Calculate statistics
      const stats = {
        total: logs.length,
        byAction: {} as Record<string, number>,
        byEntityType: {} as Record<string, number>,
        byUser: {} as Record<string, number>,
      };

      logs.forEach((log) => {
        stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
        stats.byEntityType[log.entityType] = (stats.byEntityType[log.entityType] || 0) + 1;
        stats.byUser[log.userName] = (stats.byUser[log.userName] || 0) + 1;
      });

      return stats;
    }),

  // Add single log (from frontend)
  addLog: publicProcedure
    .input(
      z.object({
        id: z.string(),
        action: ACTION_ENUM,
        entityType: ENTITY_TYPE_ENUM,
        entityId: z.string().optional(),
        userId: z.string(),
        userName: z.string(),
        timestamp: z.number(),
        details: z.any().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      try {
        await db.insert(auditLogs).values({
          id: input.id,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId || null,
          userId: input.userId,
          userName: input.userName,
          timestamp: new Date(input.timestamp),
          details: input.details || null,
        });
        return { success: true };
      } catch (e) {
        // Duplicate key - already exists
        return { success: false };
      }
    }),

  // Bulk insert logs (migration from localStorage)
  bulkInsert: publicProcedure
    .input(
      z.object({
        logs: z.array(
          z.object({
            id: z.string(),
            action: ACTION_ENUM,
            entityType: ENTITY_TYPE_ENUM,
            entityId: z.string().optional(),
            userId: z.string(),
            userName: z.string(),
            timestamp: z.number(),
            details: z.any().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db || input.logs.length === 0) return { success: true, inserted: 0 };
      let inserted = 0;
      // Insert in batches of 50
      const batchSize = 50;
      for (let i = 0; i < input.logs.length; i += batchSize) {
        const batch = input.logs.slice(i, i + batchSize);
        try {
          await (db.insert(auditLogs) as any).ignore().values(
            batch.map(log => ({
              id: log.id,
              action: log.action,
              entityType: log.entityType,
              entityId: log.entityId || null,
              userId: log.userId,
              userName: log.userName,
              timestamp: new Date(log.timestamp),
              details: log.details || null,
            }))
          );
          inserted += batch.length;
        } catch (e) {
          // Skip on error
        }
      }
      return { success: true, inserted };
    }),

  // Clear all audit logs
  clearAll: publicProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) return { success: false };
    await db.delete(auditLogs);
    return { success: true };
  }),

  // Clear logs by entity types (management or employee)
  clearByType: publicProcedure
    .input(
      z.object({
        entityTypes: z.array(z.string()),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      for (const entityType of input.entityTypes) {
        await db.delete(auditLogs).where(eq(auditLogs.entityType, entityType as any));
      }
      return { success: true };
    }),
});
