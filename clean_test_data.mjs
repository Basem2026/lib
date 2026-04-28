import { getDb } from "./server/db.ts";

const db = await getDb();
if (!db) {
  console.log("Database not available");
  process.exit(1);
}

const { accountTransactions } = await import("./drizzle/schema.ts");

// حذف جميع المعاملات الاختبارية
await db.delete(accountTransactions);

console.log("✅ تم حذف جميع المعاملات الاختبارية");

process.exit(0);
