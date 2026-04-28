import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { delegateCommissions, delegates } from "../../drizzle/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

export const delegateCommissionsRouter = router({
  // Get all commissions with optional filters
  list: publicProcedure
    .input(
      z.object({
        delegateId: z.string().optional(),
        status: z.enum(["pending", "paid", "all"]).optional().default("all"),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const filters = [];

      if (input?.delegateId) {
        filters.push(eq(delegateCommissions.delegateId, input.delegateId));
      }

      if (input?.status && input.status !== "all") {
        filters.push(eq(delegateCommissions.status, input.status));
      }

      if (input?.startDate) {
        filters.push(gte(delegateCommissions.createdAt, new Date(input.startDate)));
      }

      if (input?.endDate) {
        filters.push(lte(delegateCommissions.createdAt, new Date(input.endDate)));
      }

      const results = await db
        .select()
        .from(delegateCommissions)
        .where(filters.length > 0 ? and(...filters) : undefined)
        .orderBy(desc(delegateCommissions.createdAt));

      return results;
    }),

  // Get commissions grouped by delegate
  getByDelegate: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    
    // Get all delegates
    const allDelegates = await db.select().from(delegates);
    
    // Get commission stats for each delegate
    const results = await Promise.all(
      allDelegates.map(async (delegate) => {
        const commissions = await db
          .select()
          .from(delegateCommissions)
          .where(eq(delegateCommissions.delegateId, delegate.id))
          .orderBy(desc(delegateCommissions.createdAt));

        const totalPending = commissions
          .filter(c => c.status === "pending")
          .reduce((sum, c) => sum + parseFloat(c.amount), 0);

        const totalPaid = commissions
          .filter(c => c.status === "paid")
          .reduce((sum, c) => sum + parseFloat(c.amount), 0);

        const totalAmount = totalPending + totalPaid;
        const averageCommission = commissions.length > 0 ? totalAmount / commissions.length : 0;

        return {
          delegate: {
            id: delegate.id,
            fullName: delegate.fullName,
            phone: delegate.phone,
            address: delegate.address,
            status: delegate.status,
          },
          stats: {
            totalCustomers: commissions.length,
            totalAmount: totalAmount.toFixed(2),
            totalPending: totalPending.toFixed(2),
            totalPaid: totalPaid.toFixed(2),
            averageCommission: averageCommission.toFixed(2),
          },
          commissions: commissions.map(c => ({
            ...c,
            amount: parseFloat(c.amount),
          })),
        };
      })
    );

    return results;
  }),

  // Create a new commission
  create: publicProcedure
    .input(
      z.object({
        delegateId: z.string(),
        customerId: z.string(),
        customerName: z.string(),
        bankName: z.string(),
        amount: z.number(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const id = nanoid();

      await db.insert(delegateCommissions).values({
        id,
        delegateId: input.delegateId,
        customerId: input.customerId,
        customerName: input.customerName,
        bankName: input.bankName,
        amount: input.amount.toString(),
        status: "pending",
        notes: input.notes,
      });

      // Update delegate's total commissions
      await db
        .update(delegates)
        .set({
          totalCommissions: sql`${delegates.totalCommissions} + ${input.amount}`,
          totalCustomers: sql`${delegates.totalCustomers} + 1`,
        })
        .where(eq(delegates.id, input.delegateId));

      return { success: true, id };
    }),

  // Update commission status
  updateStatus: publicProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["pending", "paid"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(delegateCommissions)
        .set({
          status: input.status,
          paidAt: input.status === "paid" ? new Date() : null,
          notes: input.notes,
        })
        .where(eq(delegateCommissions.id, input.id));

      return { success: true };
    }),

  // Delete a commission
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get commission details before deleting
      const commission = await db
        .select()
        .from(delegateCommissions)
        .where(eq(delegateCommissions.id, input.id))
        .limit(1);

      if (commission.length === 0) {
        throw new Error("Commission not found");
      }

      const commissionData = commission[0];

      // Delete the commission
      await db
        .delete(delegateCommissions)
        .where(eq(delegateCommissions.id, input.id));

      // Update delegate's total commissions
      await db
        .update(delegates)
        .set({
          totalCommissions: sql`${delegates.totalCommissions} - ${commissionData.amount}`,
          totalCustomers: sql`${delegates.totalCustomers} - 1`,
        })
        .where(eq(delegates.id, commissionData.delegateId));

      return { success: true };
    }),
});
