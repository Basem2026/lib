/**
 * اختبارات دالة استخراج رقم المعاملة من نص مُمسوح
 */
import { describe, it, expect } from "vitest";

/**
 * نسخة من extractTransactionId من ScannerDialog للاختبار
 */
function extractTransactionId(raw: string): string | null {
  if (!raw || raw.trim().length === 0) return null;
  const text = raw.trim();

  // محاولة JSON
  try {
    const parsed = JSON.parse(text);
    if (parsed.txn) return parsed.txn;
    if (parsed.transactionId) return parsed.transactionId;
    if (parsed.id) return parsed.id;
  } catch {}

  // تنسيق المعاملة: YYYYMMDD-HHMMSS-XXXX
  const txnPattern = /\b(\d{8}-\d{6}-[A-F0-9]{4})\b/i;
  const match = text.match(txnPattern);
  if (match) return match[1];

  // تنسيق قديم: أرقام فقط
  const numPattern = /\b(\d{6,})\b/;
  const numMatch = text.match(numPattern);
  if (numMatch) return numMatch[1];

  // النص كاملاً إذا كان قصيراً
  if (text.length <= 30) return text;

  return null;
}

describe("extractTransactionId", () => {
  it("يستخرج من JSON مع مفتاح txn", () => {
    const json = JSON.stringify({ txn: "20260315-144523-A3F7", name: "محمد" });
    expect(extractTransactionId(json)).toBe("20260315-144523-A3F7");
  });

  it("يستخرج من JSON مع مفتاح transactionId", () => {
    const json = JSON.stringify({ transactionId: "20260315-144523-B2C1" });
    expect(extractTransactionId(json)).toBe("20260315-144523-B2C1");
  });

  it("يستخرج من JSON مع مفتاح id", () => {
    const json = JSON.stringify({ id: "20260315-144523-D4E5" });
    expect(extractTransactionId(json)).toBe("20260315-144523-D4E5");
  });

  it("يستخرج رقم المعاملة بالتنسيق الجديد YYYYMMDD-HHMMSS-XXXX", () => {
    expect(extractTransactionId("20260315-144523-A3F7")).toBe("20260315-144523-A3F7");
  });

  it("يستخرج رقم المعاملة من نص يحتوي على بيانات إضافية", () => {
    const text = "..20260315-144523-A3F7\nBarcode";
    expect(extractTransactionId(text)).toBe("20260315-144523-A3F7");
  });

  it("يستخرج رقم قديم من 6 أرقام", () => {
    expect(extractTransactionId("000001")).toBe("000001");
  });

  it("يرجع null للنص الفارغ", () => {
    expect(extractTransactionId("")).toBeNull();
    expect(extractTransactionId("   ")).toBeNull();
  });

  it("يرجع النص كاملاً إذا كان قصيراً (≤30 حرف)", () => {
    expect(extractTransactionId("SHORT-ID-123")).toBe("SHORT-ID-123");
  });

  it("يتعامل مع حالة الأحرف الكبيرة والصغيرة في التنسيق الجديد", () => {
    expect(extractTransactionId("20260315-144523-a3f7")).toBe("20260315-144523-a3f7");
  });

  it("يرجع null للنص الطويل بدون تنسيق معروف", () => {
    const longText = "هذا نص طويل جداً لا يحتوي على رقم معاملة صالح ولا يطابق أي تنسيق معروف في النظام";
    expect(extractTransactionId(longText)).toBeNull();
  });
});
