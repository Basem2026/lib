import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { auditLogs } from "../../drizzle/schema";

export const logsRouter = router({
  getAll: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return await db.select().from(auditLogs);
  }),

  create: publicProcedure
    .input(z.any())
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const insertData: any = {
        ...input,
        timestamp: new Date(),
      };
      await db.insert(auditLogs).values(insertData);
      return { success: true };
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { eq } = await import("drizzle-orm");
      await db.delete(auditLogs)
        .where(eq(auditLogs.id, input.id));
      return { success: true };
    }),
});
