/**
 * نظام المزامنة الفورية بين الأجهزة
 * يستخدم Server-Sent Events (SSE) لإرسال تحديثات فورية لجميع المتصلين
 */
import { Request, Response } from "express";

// قائمة المتصلين النشطين
const clients = new Map<string, Response>();

// عداد للاتصالات
let connectionCounter = 0;

/**
 * إضافة متصل جديد إلى قائمة SSE
 */
export function addSSEClient(req: Request, res: Response): string {
  const clientId = `client_${++connectionCounter}_${Date.now()}`;

  // إعداد رؤوس SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Accel-Buffering", "no");

  // إرسال رسالة ترحيب
  res.write(`data: ${JSON.stringify({ type: "connected", clientId })}\n\n`);

  // حفظ الاتصال
  clients.set(clientId, res);

  console.log(`[SSE] Client connected: ${clientId}. Total clients: ${clients.size}`);

  // تنظيف عند انقطاع الاتصال
  req.on("close", () => {
    clients.delete(clientId);
    console.log(`[SSE] Client disconnected: ${clientId}. Total clients: ${clients.size}`);
  });

  req.on("error", () => {
    clients.delete(clientId);
  });

  return clientId;
}

/**
 * أنواع الأحداث التي يمكن إرسالها
 */
export type SyncEventType =
  | "customer_created"
  | "customer_updated"
  | "customer_deleted"
  | "card_created"
  | "card_updated"
  | "card_deleted"
  | "card_status_changed"
  | "document_status_changed"
  | "notification_created"
  | "data_refresh";

export interface SyncEvent {
  type: SyncEventType;
  entityId?: string;
  entityType?: string;
  data?: Record<string, unknown>;
  timestamp: number;
  triggeredBy?: string;
}

/**
 * إرسال حدث مزامنة لجميع المتصلين
 */
export function broadcastSync(event: SyncEvent): void {
  const message = JSON.stringify(event);
  const deadClients: string[] = [];

  clients.forEach((res, clientId) => {
    try {
      res.write(`data: ${message}\n\n`);
    } catch {
      deadClients.push(clientId);
    }
  });

  // إزالة الاتصالات المنتهية
  deadClients.forEach(id => clients.delete(id));

  if (clients.size > 0) {
    console.log(`[SSE] Broadcast "${event.type}" to ${clients.size} clients`);
  }
}

/**
 * الحصول على عدد المتصلين النشطين
 */
export function getActiveClientsCount(): number {
  return clients.size;
}

/**
 * إرسال نبضة حياة كل 30 ثانية لمنع انتهاء الاتصال
 */
setInterval(() => {
  if (clients.size > 0) {
    clients.forEach((res, clientId) => {
      try {
        res.write(`: heartbeat\n\n`);
      } catch {
        clients.delete(clientId);
      }
    });
  }
}, 30000);
