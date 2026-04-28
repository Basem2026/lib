import { useMemo } from 'react';
import { differenceInDays, parseISO } from 'date-fns';
import { useCustomers } from '@/contexts/CustomersContext';

export interface ExpiringAlert {
  id: string;
  customerId: string;
  customerName: string;
  type: 'card' | 'passport';
  expiryDate: string;
  daysRemaining: number;
  urgency: 'critical' | 'warning' | 'info'; // critical: 0-30 days, warning: 30-90 days, info: 90+ days
  message: string;
  actionRequired: boolean;
}

const ALERT_THRESHOLD_DAYS = 90; // 3 months
const CRITICAL_THRESHOLD_DAYS = 30; // 1 month

export function useExpiringAlerts() {
  const { customers, cards } = useCustomers();

  const expiringAlerts = useMemo(() => {
    const alerts: ExpiringAlert[] = [];
    const now = new Date();

    // فحص البطاقات
    customers.forEach((customer) => {
      if (customer.cardExpiry) {
        try {
          // تحويل MM/YY إلى تاريخ كامل
          const [month, year] = customer.cardExpiry.split('/');
          const fullYear = parseInt(year) < 100 ? 2000 + parseInt(year) : parseInt(year);
          const lastDayOfMonth = new Date(fullYear, parseInt(month), 0);

          const daysRemaining = differenceInDays(lastDayOfMonth, now);

          if (daysRemaining <= ALERT_THRESHOLD_DAYS) {
            let urgency: 'critical' | 'warning' | 'info' = 'info';
            if (daysRemaining <= CRITICAL_THRESHOLD_DAYS) {
              urgency = 'critical';
            } else if (daysRemaining <= ALERT_THRESHOLD_DAYS) {
              urgency = 'warning';
            }

            alerts.push({
              id: `card-${customer.id}`,
              customerId: customer.id,
              customerName: customer.name,
              type: 'card',
              expiryDate: customer.cardExpiry,
              daysRemaining,
              urgency,
              message: `بطاقة ${customer.name} تنتهي صلاحيتها في ${daysRemaining} يوم`,
              actionRequired: daysRemaining <= ALERT_THRESHOLD_DAYS,
            });
          }
        } catch (error) {
          console.error('خطأ في تحليل تاريخ البطاقة:', error);
        }
      }

      // فحص جواز السفر
      if (customer.passportExpiry) {
        try {
          const expiryDate = parseISO(customer.passportExpiry);
          const daysRemaining = differenceInDays(expiryDate, now);

          if (daysRemaining <= ALERT_THRESHOLD_DAYS) {
            let urgency: 'critical' | 'warning' | 'info' = 'info';
            if (daysRemaining <= CRITICAL_THRESHOLD_DAYS) {
              urgency = 'critical';
            } else if (daysRemaining <= ALERT_THRESHOLD_DAYS) {
              urgency = 'warning';
            }

            alerts.push({
              id: `passport-${customer.id}`,
              customerId: customer.id,
              customerName: customer.name,
              type: 'passport',
              expiryDate: customer.passportExpiry,
              daysRemaining,
              urgency,
              message: `جواز سفر ${customer.name} ينتهي في ${daysRemaining} يوم`,
              actionRequired: daysRemaining <= ALERT_THRESHOLD_DAYS,
            });
          }
        } catch (error) {
          console.error('خطأ في تحليل تاريخ جواز السفر:', error);
        }
      }
    });

    // ترتيب التنبيهات حسب الأولوية (الأكثر استعجالاً أولاً)
    return alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [customers]);

  const criticalAlerts = useMemo(
    () => expiringAlerts.filter((a) => a.urgency === 'critical'),
    [expiringAlerts]
  );

  const warningAlerts = useMemo(
    () => expiringAlerts.filter((a) => a.urgency === 'warning'),
    [expiringAlerts]
  );

  const infoAlerts = useMemo(
    () => expiringAlerts.filter((a) => a.urgency === 'info'),
    [expiringAlerts]
  );

  return {
    expiringAlerts,
    criticalAlerts,
    warningAlerts,
    infoAlerts,
    totalAlerts: expiringAlerts.length,
    hasAlerts: expiringAlerts.length > 0,
  };
}

// دالة مساعدة للتحقق من قرب انتهاء الصلاحية
export function isExpiringWithin90Days(expiryDate: string | undefined, type: 'card' | 'passport'): boolean {
  if (!expiryDate) return false;

  try {
    const now = new Date();
    let dateToCheck: Date;

    if (type === 'card') {
      // تحويل MM/YY إلى تاريخ كامل
      const [month, year] = expiryDate.split('/');
      const fullYear = parseInt(year) < 100 ? 2000 + parseInt(year) : parseInt(year);
      dateToCheck = new Date(fullYear, parseInt(month), 0);
    } else {
      dateToCheck = parseISO(expiryDate);
    }

    const daysRemaining = differenceInDays(dateToCheck, now);
    return daysRemaining <= ALERT_THRESHOLD_DAYS && daysRemaining > 0;
  } catch (error) {
    return false;
  }
}

// دالة مساعدة لحساب الأيام المتبقية
export function getDaysRemaining(expiryDate: string | number | undefined, type?: 'card' | 'passport'): number {
  if (!expiryDate) return -1;

  try {
    const now = new Date();
    let dateToCheck: Date;

    // إذا كان المدخل timestamp (رقم)
    if (typeof expiryDate === 'number') {
      dateToCheck = new Date(expiryDate);
    } else if (type === 'card') {
      const [month, year] = expiryDate.split('/');
      const fullYear = parseInt(year) < 100 ? 2000 + parseInt(year) : parseInt(year);
      dateToCheck = new Date(fullYear, parseInt(month), 0);
    } else {
      // إذا لم يتم تحديد نوع، نحاول parseISO
      dateToCheck = parseISO(expiryDate);
    }

    // استخدام differenceInDays من date-fns للحصول على نتيجة دقيقة
    return differenceInDays(dateToCheck, now);
  } catch (error) {
    console.error('خطأ في حساب الأيام المتبقية:', error);
    return -1;
  }
}
