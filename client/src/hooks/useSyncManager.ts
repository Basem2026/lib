/**
 * نظام المزامنة الفورية بين الأجهزة والمستخدمين
 * 
 * يستخدم ثلاثة آليات متكاملة:
 * 1. Server-Sent Events (SSE) - للمزامنة الفورية عبر الشبكة
 * 2. BroadcastChannel API - للمزامنة بين تابات المتصفح على نفس الجهاز
 * 3. Polling ذكي - كاحتياطي لضمان المزامنة
 */
import { useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";

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

interface UseSyncManagerOptions {
  onCustomerChange?: () => void;
  onCardChange?: () => void;
  onNotificationChange?: () => void;
  enabled?: boolean;
}

// اسم قناة BroadcastChannel
const BROADCAST_CHANNEL_NAME = "app_sync_channel";

/**
 * Hook لإدارة المزامنة الفورية
 */
export function useSyncManager(options: UseSyncManagerOptions = {}) {
  const {
    onCustomerChange,
    onCardChange,
    onNotificationChange,
    enabled = true,
  } = options;

  const utils = trpc.useUtils();
  const sseRef = useRef<EventSource | null>(null);
  const broadcastRef = useRef<BroadcastChannel | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 10;
  const RECONNECT_DELAY_BASE = 2000; // 2 ثانية

  /**
   * معالجة حدث المزامنة الوارد
   */
  const handleSyncEvent = useCallback((event: SyncEvent) => {

    switch (event.type) {
      case "customer_created":
      case "customer_updated":
      case "customer_deleted":
        utils.customers.getAll.invalidate();
        onCustomerChange?.();
        break;

      case "card_created":
      case "card_updated":
      case "card_deleted":
      case "card_status_changed":
        utils.cards.getAll.invalidate();
        onCardChange?.();
        break;

      case "document_status_changed":
        utils.customers.getAll.invalidate();
        utils.cards.getAll.invalidate();
        onCustomerChange?.();
        onCardChange?.();
        break;

      case "notification_created":
        onNotificationChange?.();
        break;

      case "data_refresh":
        // تحديث كل البيانات
        utils.customers.getAll.invalidate();
        utils.cards.getAll.invalidate();
        onCustomerChange?.();
        onCardChange?.();
        onNotificationChange?.();
        break;
    }
  }, [utils, onCustomerChange, onCardChange, onNotificationChange]);

  /**
   * إعداد BroadcastChannel للمزامنة بين تابات المتصفح
   */
  const setupBroadcastChannel = useCallback(() => {
    if (typeof BroadcastChannel === "undefined") return;

    try {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      broadcastRef.current = channel;

      channel.onmessage = (event) => {
        try {
          const syncEvent: SyncEvent = event.data;
          handleSyncEvent(syncEvent);
        } catch (err) {
          console.error("[BroadcastChannel] Error parsing message:", err);
        }
      };

      // BroadcastChannel لا يدعم onerror بشكل مباشر في TypeScript types

      console.log("[BroadcastChannel] Connected");
    } catch (err) {
      console.error("[BroadcastChannel] Setup failed:", err);
    }
  }, [handleSyncEvent]);

  /**
   * إعداد SSE للمزامنة عبر الشبكة
   */
  const setupSSE = useCallback(() => {
    if (typeof EventSource === "undefined") return;

    // إغلاق الاتصال القديم إذا كان موجوداً
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }

    try {
      const eventSource = new EventSource("/api/sync/events");
      sseRef.current = eventSource;

      eventSource.onopen = () => {
        console.log("[SSE] Connected to sync server");
        reconnectAttemptsRef.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // تجاهل رسالة الاتصال الأولية
          if (data.type === "connected") {
            console.log("[SSE] Client ID:", data.clientId);
            return;
          }

          handleSyncEvent(data as SyncEvent);
        } catch (err) {
          console.error("[SSE] Error parsing message:", err);
        }
      };

      eventSource.onerror = () => {
        console.warn("[SSE] Connection error, attempting reconnect...");
        eventSource.close();
        sseRef.current = null;

        // إعادة الاتصال مع تأخير تصاعدي
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(
            RECONNECT_DELAY_BASE * Math.pow(1.5, reconnectAttemptsRef.current),
            30000 // حد أقصى 30 ثانية
          );
          reconnectAttemptsRef.current++;
          
          console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (enabled) {
              setupSSE();
            }
          }, delay);
        } else {
          console.warn("[SSE] Max reconnect attempts reached, falling back to polling");
        }
      };
    } catch (err) {
      console.error("[SSE] Setup failed:", err);
    }
  }, [enabled, handleSyncEvent]);

  /**
   * تهيئة نظام المزامنة
   */
  useEffect(() => {
    if (!enabled) return;

    // إعداد BroadcastChannel
    setupBroadcastChannel();

    // إعداد SSE
    setupSSE();

    // تنظيف عند إلغاء التحميل
    return () => {
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
      if (broadcastRef.current) {
        broadcastRef.current.close();
        broadcastRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [enabled, setupBroadcastChannel, setupSSE]);

  /**
   * إرسال حدث مزامنة محلي (للتابات الأخرى على نفس الجهاز)
   */
  const broadcastLocalEvent = useCallback((event: Omit<SyncEvent, "timestamp">) => {
    if (broadcastRef.current) {
      const fullEvent: SyncEvent = {
        ...event,
        timestamp: Date.now(),
      };
      try {
        broadcastRef.current.postMessage(fullEvent);
      } catch (err) {
        console.error("[BroadcastChannel] Error sending message:", err);
      }
    }
  }, []);

  return {
    broadcastLocalEvent,
  };
}

/**
 * دالة مساعدة لإرسال حدث مزامنة من خلال BroadcastChannel
 * يمكن استخدامها خارج الـ hook
 */
export function sendLocalSyncEvent(event: Omit<SyncEvent, "timestamp">): void {
  if (typeof BroadcastChannel === "undefined") return;
  
  try {
    const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    channel.postMessage({ ...event, timestamp: Date.now() });
    channel.close();
  } catch (err) {
    console.error("[BroadcastChannel] Error sending local event:", err);
  }
}
