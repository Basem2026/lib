import { z } from "zod";
import webpush from "web-push";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { pushSubscriptions } from "../../drizzle/schema";
import { eq, inArray } from "drizzle-orm";
import { ENV } from "../_core/env";

// إعداد VAPID keys
if (ENV.vapidPublicKey && ENV.vapidPrivateKey) {
  webpush.setVapidDetails(
    "mailto:admin@libya-financial.ly",
    ENV.vapidPublicKey,
    ENV.vapidPrivateKey
  );
}

type PushSub = typeof pushSubscriptions.$inferSelect;

async function sendPushToSubs(subs: PushSub[], payload: string): Promise<{ sent: number; failed: number }> {
  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
    )
  );

  // حذف الاشتراكات المنتهية
  const db = await getDb();
  if (db) {
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === "rejected") {
        const err = result.reason as { statusCode?: number };
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, subs[i].endpoint));
        }
      }
    }
  }

  return {
    sent: results.filter((r) => r.status === "fulfilled").length,
    failed: results.filter((r) => r.status === "rejected").length,
  };
}

export const pushNotificationsRouter = router({
  // الحصول على VAPID public key
  getVapidPublicKey: publicProcedure.query(() => {
    return { publicKey: ENV.vapidPublicKey || "" };
  }),

  // تسجيل اشتراك جديد
  subscribe: publicProcedure
    .input(
      z.object({
        employeeId: z.string(),
        endpoint: z.string(),
        p256dh: z.string(),
        auth: z.string(),
        userAgent: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };

      // حذف الاشتراكات القديمة لنفس الـ endpoint
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, input.endpoint));

      // إضافة الاشتراك الجديد
      await db.insert(pushSubscriptions).values({
        employeeId: input.employeeId,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        userAgent: input.userAgent,
      });

      return { success: true };
    }),

  // إلغاء الاشتراك
  unsubscribe: publicProcedure
    .input(z.object({ endpoint: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, input.endpoint));
      return { success: true };
    }),

  // إرسال إشعار لموظف محدد
  sendToEmployee: publicProcedure
    .input(
      z.object({
        employeeId: z.string(),
        title: z.string(),
        body: z.string(),
        actionUrl: z.string().optional(),
        icon: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { sent: 0, failed: 0 };

      const subs = await db
        .select()
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.employeeId, input.employeeId));

      const payload = JSON.stringify({
        title: input.title,
        body: input.body,
        actionUrl: input.actionUrl || "/",
        icon: input.icon || "/favicon.png",
      });

      return await sendPushToSubs(subs, payload);
    }),

  // إرسال إشعار للمدير ونائب المدير فقط
  sendToManagers: publicProcedure
    .input(
      z.object({
        title: z.string(),
        body: z.string(),
        actionUrl: z.string().optional(),
        icon: z.string().optional(),
        // قائمة employeeIds للمدراء (تُحدَّد من الـ frontend)
        managerIds: z.array(z.string()),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { sent: 0, failed: 0, total: 0 };

      if (input.managerIds.length === 0) return { sent: 0, failed: 0, total: 0 };

      const subs = await db
        .select()
        .from(pushSubscriptions)
        .where(inArray(pushSubscriptions.employeeId, input.managerIds));

      const payload = JSON.stringify({
        title: input.title,
        body: input.body,
        actionUrl: input.actionUrl || "/",
        icon: input.icon || "/favicon.png",
      });

      const result = await sendPushToSubs(subs, payload);
      return { ...result, total: subs.length };
    }),

  // إرسال إشعار لجميع الموظفين
  sendToAll: publicProcedure
    .input(
      z.object({
        title: z.string(),
        body: z.string(),
        actionUrl: z.string().optional(),
        icon: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { sent: 0, failed: 0, total: 0 };

      const subs = await db.select().from(pushSubscriptions);

      const payload = JSON.stringify({
        title: input.title,
        body: input.body,
        actionUrl: input.actionUrl || "/",
        icon: input.icon || "/favicon.png",
      });

      const result = await sendPushToSubs(subs, payload);
      return { ...result, total: subs.length };
    }),
});
