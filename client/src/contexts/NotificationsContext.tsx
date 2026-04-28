import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc';

/**
 * نظام الإشعارات (Notifications System)
 * Real-time notifications for important events
 * يدعم Web Push الحقيقي - تصل الإشعارات حتى لو الموقع مغلق
 */

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'pending_approval';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  userId?: string;
  // 'managers_and_alerts' = يصل للمدير ونائبه وأصحاب صلاحية view_alerts
  targetRole?: 'accountant' | 'manager' | 'deputy_manager' | 'managers_and_alerts' | 'all';
  actionUrl?: string;
  actionLabel?: string;
  relatedId?: string; // ID of the related entity (e.g., daily close ID)
}

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (notificationId: string) => void;
  clearAllNotifications: () => void;
  getNotificationsByUser: (userId: string) => Notification[];
  getNotificationsByRole: (role: string, employeePermissions?: string[]) => Notification[];
  getUnreadNotifications: () => Notification[];
  requestPushPermission: (employeeId?: string) => Promise<boolean>;
  sendPushToManagers: (title: string, body: string, managerIds: string[], actionUrl?: string) => void;
  sendTestPush: (employeeId: string) => void;
  isPushEnabled: boolean;
  isWebPushSupported: boolean;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [isWebPushSupported, setIsWebPushSupported] = useState(false);
  const subscribeMutation = trpc.push.subscribe.useMutation();
  const sendToAllMutation = trpc.push.sendToAll.useMutation();
  const sendToManagersMutation = trpc.push.sendToManagers.useMutation();
  const vapidQuery = trpc.push.getVapidPublicKey.useQuery();
  const currentEmployeeIdRef = useRef<string | null>(null);

  // تحميل البيانات من localStorage
  useEffect(() => {
    const stored = localStorage.getItem('notifications');
    if (stored) setNotifications(JSON.parse(stored));
  }, []);

  // حفظ البيانات في localStorage
  useEffect(() => {
    localStorage.setItem('notifications', JSON.stringify(notifications));
  }, [notifications]);

  // التحقق من دعم Web Push
  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsWebPushSupported(supported);

    // استعادة حالة الإذن
    if (supported && Notification.permission === 'granted') {
      setIsPushEnabled(true);
    }
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    // تحميل إعدادات الإشعارات من localStorage
    const settingsStr = localStorage.getItem('notificationSettings');
    const settings = settingsStr ? JSON.parse(settingsStr) : { customers: true, cards: true, dailyOperations: true };

    // فلترة الإشعارات حسب التفضيلات
    const category = notification.message.includes('زبون') ? 'customers' :
                     notification.message.includes('بطاقة') || notification.message.includes('معاملة') ? 'cards' :
                     notification.message.includes('عملية يومية') ? 'dailyOperations' : null;

    // إذا كانت الفئة معطلة، لا تضف الإشعار
    if (category && !settings[category]) {
      return;
    }

    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false,
    };
    setNotifications(prev => [newNotification, ...prev]);

    // تشغيل صوت التنبيه
    try {
      const soundFile = notification.type === 'error' ? '/notification-critical.wav' : '/notification.wav';
      const audio = new Audio(soundFile);
      audio.volume = notification.type === 'error' ? 0.8 : 0.5;
      audio.play().catch(() => {});
    } catch (err) {}

    // إرسال Web Push الحقيقي لجميع المشتركين عبر الخادم
    // هذا يضمن وصول الإشعار حتى لو كان المتصفح مغلقاً
    sendToAllMutation.mutate({
      title: notification.title,
      body: notification.message,
      actionUrl: notification.actionUrl || '/',
    });
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(
      notifications.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(
      notifications.map(n => ({ ...n, read: true }))
    );
  };

  const deleteNotification = (notificationId: string) => {
    setNotifications(notifications.filter(n => n.id !== notificationId));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const getNotificationsByUser = (userId: string): Notification[] => {
    return notifications.filter(n => n.userId === userId || n.targetRole === 'all');
  };

  const getNotificationsByRole = (role: string, employeePermissions?: string[]): Notification[] => {
    return notifications.filter(n => {
      if (n.targetRole === 'all') return true;
      if (n.targetRole === role) return true;
      if (n.targetRole === 'manager' && (role === 'manager' || role === 'deputy_manager')) return true;
      if (n.targetRole === 'deputy_manager' && (role === 'manager' || role === 'deputy_manager')) return true;
      if (n.targetRole === 'managers_and_alerts') {
        if (role === 'manager' || role === 'deputy_manager') return true;
        if (employeePermissions?.includes('view_alerts')) return true;
      }
      return false;
    });
  };

  const getUnreadNotifications = (): Notification[] => {
    return notifications.filter(n => !n.read);
  };

  // تسجيل Web Push subscription مع الخادم
  const registerPushSubscription = async (employeeId: string): Promise<boolean> => {
    if (!isWebPushSupported) return false;
    const publicKey = vapidQuery.data?.publicKey;
    if (!publicKey) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // تحويل VAPID public key
      const urlBase64ToUint8Array = (base64String: string) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
      };

      // الاشتراك في Push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const subscriptionJson = subscription.toJSON();
      const keys = subscriptionJson.keys as { p256dh: string; auth: string };

      // حفظ الاشتراك في الخادم
      await subscribeMutation.mutateAsync({
        employeeId,
        endpoint: subscription.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: navigator.userAgent,
      });

      currentEmployeeIdRef.current = employeeId;
      localStorage.setItem('pushEmployeeId', employeeId);
      return true;
    } catch (error) {
      console.error('خطأ في تسجيل Push subscription:', error);
      return false;
    }
  };

  // طلب إذن الإشعارات وتسجيل الاشتراك
  const requestPushPermission = async (employeeId?: string): Promise<boolean> => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setIsPushEnabled(true);
      localStorage.setItem('pushEnabled', 'true');
      return true;
    }

    try {
      if (Notification.permission === 'denied') {
        setIsPushEnabled(true);
        localStorage.setItem('pushEnabled', 'true');
        return true;
      }

      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        // تسجيل Service Worker
        try {
          await navigator.serviceWorker.register('/sw.js');
        } catch (swError) {
          console.warn('Service Worker registration failed:', swError);
        }

        // تسجيل Web Push subscription إذا كان لدينا employeeId
        const empId = employeeId || localStorage.getItem('pushEmployeeId');
        if (empId && isWebPushSupported) {
          await registerPushSubscription(empId);
        }

        setIsPushEnabled(true);
        localStorage.setItem('pushEnabled', 'true');
        return true;
      } else {
        setIsPushEnabled(true);
        localStorage.setItem('pushEnabled', 'true');
        return true;
      }
    } catch (error) {
      console.error('خطأ في طلب إذن الإشعارات:', error);
      setIsPushEnabled(true);
      localStorage.setItem('pushEnabled', 'true');
      return true;
    }
  };

  // استعادة الاشتراك عند التحميل إذا كان الإذن ممنوحاً
  useEffect(() => {
    const restoreSubscription = async () => {
      if (!isWebPushSupported) return;
      if (Notification.permission !== 'granted') return;
      const empId = localStorage.getItem('pushEmployeeId');
      if (!empId) return;
      if (!vapidQuery.data?.publicKey) return;

      // تحقق من وجود subscription نشط
      try {
        const registration = await navigator.serviceWorker.ready;
        const existingSub = await registration.pushManager.getSubscription();
        if (!existingSub) {
          // أعد التسجيل
          await registerPushSubscription(empId);
        }
      } catch (e) {}
    };

    if (vapidQuery.data) {
      restoreSubscription();
    }
  }, [isWebPushSupported, vapidQuery.data]);

   // تحقق من حالة الإذن عند التحميل
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      setIsPushEnabled(true);
    }
  }, []);

  // إرسال Push للمدير ونائب المدير فقط
  const sendPushToManagers = (title: string, body: string, managerIds: string[], actionUrl?: string) => {
    if (managerIds.length === 0) return;
    sendToManagersMutation.mutate({
      title,
      body,
      managerIds,
      actionUrl: actionUrl || '/',
    });
  };

  // إرسال إشعار تجريبي لموظف محدد
  const sendTestPushMutation = trpc.push.sendToEmployee.useMutation();
  const sendTestPush = (employeeId: string) => {
    sendTestPushMutation.mutate({
      employeeId,
      title: 'اختبار الإشعارات',
      body: 'هذا إشعار تجريبي للتأكد من وصول الإشعارات لجهازك',
      actionUrl: '/',
    });
  };

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAllNotifications,
        getNotificationsByUser,
        getNotificationsByRole,
        getUnreadNotifications,
        requestPushPermission,
        sendPushToManagers,
        sendTestPush,
        isPushEnabled,
        isWebPushSupported,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return context;
};
