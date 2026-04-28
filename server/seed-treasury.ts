/**
 * Seed script للحسابات الأساسية في الخزينة
 * يتم تشغيله مرة واحدة عند أول تشغيل للنظام
 */

import { getDb } from "./db";
import { treasuryAccounts } from "../drizzle/schema";
import { nanoid } from "nanoid";

export async function seedTreasuryAccounts() {
  console.log("🌱 Starting treasury accounts seed...");

  const db = await getDb();
  if (!db) {
    console.warn("[Seed] Database not available. Skipping seed.");
    return;
  }

  // التحقق من وجود حسابات مسبقاً
  const existing = await db.select().from(treasuryAccounts);
  if (existing.length > 0) {
    console.log("✅ Treasury accounts already exist. Skipping seed.");
    return;
  }

  // إنشاء الحسابات الأساسية
  const accounts = [
    // 1. رأس المال
    {
      id: nanoid(),
      accountType: "capital" as const,
      accountName: "رأس المال",
      balanceLYD: "0",
      balanceUSD: "0",
      balanceUSDT: "0",
      isActive: true,
      createdBy: "system",
    },
    // 2. حساب التوزيع
    {
      id: nanoid(),
      accountType: "distribution" as const,
      accountName: "حساب التوزيع",
      balanceLYD: "0",
      balanceUSD: "0",
      balanceUSDT: "0",
      isActive: true,
      createdBy: "system",
    },
    // 3. الأرباح
    {
      id: nanoid(),
      accountType: "profits" as const,
      accountName: "الأرباح",
      balanceLYD: "0",
      balanceUSD: "0",
      balanceUSDT: "0",
      isActive: true,
      createdBy: "system",
    },
    // 4. كاش دينار
    {
      id: nanoid(),
      accountType: "cash" as const,
      accountName: "كاش دينار",
      balanceLYD: "0",
      balanceUSD: "0",
      balanceUSDT: "0",
      isActive: true,
      createdBy: "system",
    },
    // 5. كاش دولار
    {
      id: nanoid(),
      accountType: "cash" as const,
      accountName: "كاش دولار",
      balanceLYD: "0",
      balanceUSD: "0",
      balanceUSDT: "0",
      isActive: true,
      createdBy: "system",
    },
    // 6. USDT
    {
      id: nanoid(),
      accountType: "usdt" as const,
      accountName: "USDT",
      balanceLYD: "0",
      balanceUSD: "0",
      balanceUSDT: "0",
      isActive: true,
      createdBy: "system",
    },
    // 7. مصرف الأمان - دينار
    {
      id: nanoid(),
      accountType: "bank" as const,
      accountName: "مصرف الأمان - دينار",
      balanceLYD: "0",
      balanceUSD: "0",
      balanceUSDT: "0",
      bankName: "مصرف الأمان",
      accountHolder: "شركة ليبيا للخدمات المالية",
      accountNumber: "",
      isActive: true,
      createdBy: "system",
    },
    // 8. مصرف الأمان - دولار
    {
      id: nanoid(),
      accountType: "bank" as const,
      accountName: "مصرف الأمان - دولار",
      balanceLYD: "0",
      balanceUSD: "0",
      balanceUSDT: "0",
      bankName: "مصرف الأمان",
      accountHolder: "شركة ليبيا للخدمات المالية",
      accountNumber: "",
      isActive: true,
      createdBy: "system",
    },
  ];

  // إدراج الحسابات
  await db.insert(treasuryAccounts).values(accounts);

  console.log("✅ Treasury accounts seeded successfully!");
  console.log(`   Created ${accounts.length} accounts`);
}
