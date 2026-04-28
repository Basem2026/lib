import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { companySettings, auditLogs } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { storagePut } from "../storage";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";

/**
 * router إعدادات الشركة
 * يتيح للمدير فقط تخصيص بيانات الشركة (الاسم، الشعار، بيانات التواصل)
 * هذا يجعل النظام قابلاً للبيع لأي شركة وتخصيصه بالكامل
 */

// مساعد للتحقق من صلاحية المدير
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "هذه العملية متاحة للمدير فقط",
    });
  }
  return next({ ctx });
});

export const companySettingsRouter = router({
  /**
   * جلب إعدادات الشركة (متاح للجميع المسجلين)
   */
  get: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const rows = await db
      .select()
      .from(companySettings)
      .where(eq(companySettings.id, "default"))
      .limit(1);

    if (rows.length === 0) {
      // إنشاء سجل افتراضي إذا لم يكن موجوداً
      await db.insert(companySettings).values({
        id: "default",
        companyName: "شركة ليبيا للخدمات المالية",
        slogan: "حلول مالية احترافية موثوقة وآمنة",
        phone: "0920563695",
        address: "صبراته - ليبيا",
        city: "صبراته",
        country: "ليبيا",
      });
      const newRows = await db
        .select()
        .from(companySettings)
        .where(eq(companySettings.id, "default"))
        .limit(1);
      return newRows[0];
    }

    return rows[0];
  }),

  /**
   * تحديث إعدادات الشركة (للمدير فقط)
   */
  update: adminProcedure
    .input(
      z.object({
        companyName: z.string().min(1).max(200).optional(),
        companyNameEn: z.string().max(200).optional().nullable(),
        slogan: z.string().max(500).optional().nullable(),
        phone: z.string().max(50).optional().nullable(),
        phone2: z.string().max(50).optional().nullable(),
        email: z.string().email().max(255).optional().nullable(),
        website: z.string().url().max(255).optional().nullable(),
        address: z.string().max(500).optional().nullable(),
        city: z.string().max(100).optional().nullable(),
        country: z.string().max(100).optional().nullable(),
        licenseNumber: z.string().max(100).optional().nullable(),
        taxNumber: z.string().max(100).optional().nullable(),
        currency: z.string().max(10).optional(),
        currencySymbol: z.string().max(10).optional(),
        primaryColor: z.string().max(20).optional(),
        accentColor: z.string().max(20).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // تحويل الحقول الفارغة إلى null
      const updates: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(input)) {
        if (value !== undefined) {
          updates[key] = value === "" ? null : value;
        }
      }

      await db
        .update(companySettings)
        .set(updates)
        .where(eq(companySettings.id, "default"));

      // تسجيل عملية تحديث الإعدادات
      const uName = ctx.user?.name || 'المدير';
      await db.insert(auditLogs).values({
        id: nanoid(),
        userId: String(ctx.user?.id || 'system'),
        userName: uName,
        action: 'update',
        entityType: 'settings',
        entityId: 'company',
        details: {
          description: `قام ${uName} بتحديث إعدادات الشركة`,
        },
        timestamp: new Date(),
      });

      const rows = await db
        .select()
        .from(companySettings)
        .where(eq(companySettings.id, "default"))
        .limit(1);

      return rows[0];
    }),

  /**
   * رفع شعار الشركة (للمدير فقط)
   * يقبل base64 encoded image
   */
  uploadLogo: adminProcedure
    .input(
      z.object({
        imageBase64: z.string(),
        mimeType: z.enum(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const { imageBase64, mimeType } = input;

      // تحويل base64 إلى Buffer
      const buffer = Buffer.from(imageBase64, "base64");

      // التحقق من الحجم (max 2MB)
      if (buffer.length > 2 * 1024 * 1024) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "حجم الشعار يجب أن يكون أقل من 2 ميجابايت",
        });
      }

      // رفع الملف إلى S3
      const ext = mimeType.split("/")[1].replace("svg+xml", "svg");
      const fileKey = `company-logos/logo-${nanoid(8)}.${ext}`;
      const { url } = await storagePut(fileKey, buffer, mimeType);

      // تحديث رابط الشعار في قاعدة البيانات
      await db
        .update(companySettings)
        .set({ logoUrl: url })
        .where(eq(companySettings.id, "default"));

      return { logoUrl: url };
    }),
});
