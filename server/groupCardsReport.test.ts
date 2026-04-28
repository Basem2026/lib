/**
 * اختبارات وحدة لمنطق تقرير مجموعة البطاقات
 */
import { describe, it, expect } from "vitest";

// استخراج دالة extractTransactionId من منطقها
function extractTransactionId(raw: string): string | null {
  if (!raw || raw.trim().length === 0) return null;
  const text = raw.trim();
  try {
    const parsed = JSON.parse(text);
    if (parsed.txn) return parsed.txn;
    if (parsed.transactionId) return parsed.transactionId;
    if (parsed.id) return parsed.id;
  } catch {}
  const txnPattern = /\b(\d{8}-\d{6}-[A-F0-9]{4})\b/i;
  const match = text.match(txnPattern);
  if (match) return match[1];
  const numPattern = /\b(\d{6,})\b/;
  const numMatch = text.match(numPattern);
  if (numMatch) return numMatch[1];
  if (text.length <= 30) return text;
  return null;
}

describe("extractTransactionId", () => {
  it("يُعيد null للنص الفارغ", () => {
    expect(extractTransactionId("")).toBeNull();
    expect(extractTransactionId("   ")).toBeNull();
  });

  it("يستخرج transactionId من JSON بمفتاح txn", () => {
    const json = JSON.stringify({ txn: "TXN-001" });
    expect(extractTransactionId(json)).toBe("TXN-001");
  });

  it("يستخرج transactionId من JSON بمفتاح transactionId", () => {
    const json = JSON.stringify({ transactionId: "20250101-120000-ABCD" });
    expect(extractTransactionId(json)).toBe("20250101-120000-ABCD");
  });

  it("يستخرج transactionId من JSON بمفتاح id", () => {
    const json = JSON.stringify({ id: "CARD-123" });
    expect(extractTransactionId(json)).toBe("CARD-123");
  });

  it("يستخرج رقم المعاملة بنمط التاريخ-الوقت-HEX", () => {
    const text = "بطاقة: 20250101-120000-ABCD";
    expect(extractTransactionId(text)).toBe("20250101-120000-ABCD");
  });

  it("يستخرج رقماً من 6 أرقام فأكثر", () => {
    expect(extractTransactionId("رقم: 123456")).toBe("123456");
    expect(extractTransactionId("1234567890")).toBe("1234567890");
  });

  it("يُعيد النص كاملاً إذا كان قصيراً (≤30 حرف)", () => {
    expect(extractTransactionId("ABC-123")).toBe("ABC-123");
  });

  it("يُعيد null للنص الطويل غير المتطابق", () => {
    const longText = "هذا نص طويل جداً لا يحتوي على رقم معاملة صالح بأي شكل من الأشكال";
    expect(extractTransactionId(longText)).toBeNull();
  });
});
