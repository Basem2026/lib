import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useCustomers } from '@/contexts/CustomersContext';
import { useNotifications } from '@/contexts/NotificationsContext';

interface RealtimeSyncEvent {
  type: 'customer_added' | 'customer_updated' | 'customer_deleted' | 'card_added' | 'card_updated';
  data: any;
  userId: string;
  userName: string;
  timestamp: number;
}

export function useRealtimeSync() {
  const socketRef = useRef<Socket | null>(null);
  const { addCustomer, updateCustomer } = useCustomers();
  const { addNotification } = useNotifications();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // إنشاء اتصال WebSocket
  useEffect(() => {
    const connectSocket = () => {
      try {
        // الاتصال بخادم WebSocket
        socketRef.current = io(window.location.origin, {
          path: '/socket.io/',
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: maxReconnectAttempts,
          transports: ['websocket', 'polling'],
        });

        // معالج الاتصال الناجح
        socketRef.current.on('connect', () => {
          console.log('[WebSocket] تم الاتصال بنجاح');
          reconnectAttempts.current = 0;
          
          // إرسال معلومات المستخدم
          socketRef.current?.emit('user_connected', {
            userId: localStorage.getItem('userId'),
            userName: localStorage.getItem('userName'),
          });
        });

        // معالج الأحداث الفورية
        socketRef.current.on('customer_added', (event: RealtimeSyncEvent) => {
          console.log('[WebSocket] تم إضافة زبون جديد:', event.data);
          
          // عدم إضافة الزبون إذا كان من نفس المستخدم
          const currentUserId = localStorage.getItem('userId');
          if (event.userId !== currentUserId) {
            addNotification({
              type: 'success',
              title: 'زبون جديد',
              message: `تم إضافة زبون جديد من قبل ${event.userName}: ${event.data.name}`,
              targetRole: 'all',
              actionUrl: `/customers/${event.data.id}`,
              actionLabel: 'عرض التفاصيل'
            });
            
            // تشغيل صوت التنبيه
            playNotificationSound();
          }
        });

        socketRef.current.on('customer_updated', (event: RealtimeSyncEvent) => {
          console.log('[WebSocket] تم تحديث بيانات زبون:', event.data);
          
          const currentUserId = localStorage.getItem('userId');
          if (event.userId !== currentUserId) {
            addNotification({
              type: 'info',
              title: 'تحديث بيانات',
              message: `تم تحديث بيانات الزبون من قبل ${event.userName}`,
              targetRole: 'all',
              actionUrl: `/customers/${event.data.id}`,
              actionLabel: 'عرض التفاصيل'
            });
            
            playNotificationSound();
          }
        });

        socketRef.current.on('card_added', (event: RealtimeSyncEvent) => {
          console.log('[WebSocket] تم إضافة بطاقة جديدة:', event.data);
          
          const currentUserId = localStorage.getItem('userId');
          if (event.userId !== currentUserId) {
            addNotification({
              type: 'success',
              title: 'بطاقة جديدة',
              message: `تم إضافة بطاقة جديدة من قبل ${event.userName}`,
              targetRole: 'all',
              actionUrl: `/customers/${event.data.customerId}`,
              actionLabel: 'عرض التفاصيل'
            });
            
            playNotificationSound();
          }
        });

        // معالج قطع الاتصال
        socketRef.current.on('disconnect', () => {
          console.log('[WebSocket] تم قطع الاتصال');
          reconnectAttempts.current++;
          
          if (reconnectAttempts.current <= maxReconnectAttempts) {
            console.log(`[WebSocket] محاولة إعادة الاتصال ${reconnectAttempts.current}/${maxReconnectAttempts}`);
          }
        });

        // معالج الأخطاء
        socketRef.current.on('error', (error) => {
          console.error('[WebSocket] خطأ:', error);
        });

      } catch (error) {
        console.error('[WebSocket] فشل الاتصال:', error);
      }
    };

    connectSocket();

    // تنظيف الاتصال عند إلغاء المكون
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [addNotification]);

  // دالة تشغيل صوت التنبيه
  const playNotificationSound = useCallback(() => {
    try {
      // إنشاء صوت تنبيه بسيط باستخدام Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // تعيين التردد والمدة
      oscillator.frequency.value = 800; // تردد 800 Hz
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.error('[Notification Sound] فشل تشغيل الصوت:', error);
    }
  }, []);

  // دالة إرسال حدث إلى الخادم
  const emitEvent = useCallback((eventType: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(eventType, {
        type: eventType,
        data,
        userId: localStorage.getItem('userId'),
        userName: localStorage.getItem('userName'),
        timestamp: Date.now(),
      });
    }
  }, []);

  return {
    isConnected: socketRef.current?.connected || false,
    emitEvent,
  };
}
