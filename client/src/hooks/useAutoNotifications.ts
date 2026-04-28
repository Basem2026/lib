import { useEffect, useRef } from 'react';
import { useExpiringAlerts } from './useExpiringAlerts';
import { useNotifications } from '@/contexts/NotificationsContext';

export function useAutoNotifications() {
  const { expiringAlerts, criticalAlerts } = useExpiringAlerts();
  const { addNotification, notifications } = useNotifications();
  const notifiedAlertsRef = useRef<Set<string>>(new Set());
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // تسجيل Service Worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js').catch((error) => {
        console.error('[useAutoNotifications] Service Worker registration failed:', error);
      });
    }
  }, []);

  // طلب إذن الإشعارات
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch((error) => {
        console.error('[useAutoNotifications] Permission request failed:', error);
      });
    }
  }, []);

  // إرسال الإشعارات التلقائية عند تغيير التنبيهات
  useEffect(() => {
    const checkAndNotify = () => {
      criticalAlerts.forEach((alert) => {
        const alertId = `expiry-${alert.type}-${alert.customerId}`;

        // تجنب الإشعارات المكررة (نتحقق من الـ ref والإشعارات الموجودة)
        const alreadyNotified = notifiedAlertsRef.current.has(alertId);
        const alreadyInNotifications = notifications.some(n => n.relatedId === alertId);

        if (!alreadyNotified && !alreadyInNotifications) {
          notifiedAlertsRef.current.add(alertId);

          const typeLabel = alert.type === 'card' ? 'بطاقة' : 'جواز سفر';
          const urgencyLabel = alert.daysRemaining <= 0 ? 'منتهية الصلاحية' :
                               alert.daysRemaining <= 7 ? 'تنتهي هذا الأسبوع' :
                               alert.daysRemaining <= 30 ? `تنتهي خلال ${alert.daysRemaining} يوم` :
                               `تنتهي خلال ${alert.daysRemaining} يوم`;

          // إضافة إلى NotificationsContext (قائمة الإشعارات داخل التطبيق)
          addNotification({
            type: alert.daysRemaining <= 7 ? 'error' : 'warning',
            title: `⚠️ تنبيه: ${typeLabel} قريب${alert.type === 'passport' ? '' : 'ة'} الانتهاء`,
            message: `${alert.customerName} - ${typeLabel} ${urgencyLabel}`,
            targetRole: 'managers_and_alerts',
            actionUrl: `/customers/${alert.customerId}`,
            actionLabel: 'عرض الزبون',
            relatedId: alertId,
          });

          // إرسال إشعار Push للمتصفح أيضاً (إذا كان الإذن ممنوحاً)
          if ('Notification' in window && Notification.permission === 'granted') {
            const title = `⚠️ تنبيه ${typeLabel} قريب${alert.type === 'passport' ? '' : 'ة'} الانتهاء`;
            const options = {
              body: `${alert.customerName} - ${alert.daysRemaining} يوم متبقي`,
              icon: '/logo.png',
              tag: alertId,
              requireInteraction: true,
              vibrate: [200, 100, 200],
            };

            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
              navigator.serviceWorker.controller.postMessage({
                type: 'SHOW_NOTIFICATION',
                title,
                options,
              });
            } else {
              try {
                new Notification(title, options);
              } catch (e) {
                console.error('[useAutoNotifications] Error showing notification:', e);
              }
            }

            // تشغيل صوت تنبيه
            playNotificationSound(alert.daysRemaining <= 7);
          }
        }
      });
    };

    // التحقق الأولي عند تغيير التنبيهات
    checkAndNotify();

    // التحقق الدوري كل 5 دقائق (لتجنب الإشعارات المتكررة)
    pollingIntervalRef.current = setInterval(checkAndNotify, 5 * 60 * 1000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [criticalAlerts]); // يعمل عند تغيير criticalAlerts فقط

  return {
    hasNotifications: expiringAlerts.length > 0,
    criticalCount: criticalAlerts.length,
    expiringAlerts,
    criticalAlerts,
  };
}

// دالة تشغيل صوت التنبيه
function playNotificationSound(isCritical = false) {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    if (isCritical) {
      // صوت حرج: نبضتان متتاليتان بتردد أعلى
      oscillator.frequency.value = 1000;
      oscillator.type = 'square';
      gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);

      // نبضة ثانية
      setTimeout(() => {
        try {
          const ctx2 = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc2 = ctx2.createOscillator();
          const gain2 = ctx2.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx2.destination);
          osc2.frequency.value = 1200;
          osc2.type = 'square';
          gain2.gain.setValueAtTime(0.4, ctx2.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.01, ctx2.currentTime + 0.15);
          osc2.start(ctx2.currentTime);
          osc2.stop(ctx2.currentTime + 0.15);
        } catch (e) {}
      }, 200);
    } else {
      // صوت عادي: نبضة واحدة
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    }
  } catch (error) {
    console.error('[useAutoNotifications] Error playing sound:', error);
  }
}
