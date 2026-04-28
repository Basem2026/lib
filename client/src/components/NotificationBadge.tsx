import { useAutoNotifications } from '@/hooks/useAutoNotifications';
import { usePermissions } from '@/hooks/usePermissions';
import { AlertTriangle } from 'lucide-react';

/**
 * يظهر فقط للمستخدمين الذين لديهم صلاحية view_alerts
 * (المدير ونائب المدير افتراضياً، ويمكن منحها لأي موظف آخر)
 */
export function NotificationBadge() {
  const { hasPermission } = usePermissions();
  const { hasNotifications, criticalCount } = useAutoNotifications();

  // إخفاء التنبيهات عن غير المخولين
  if (!hasPermission('view_alerts')) {
    return null;
  }

  if (!hasNotifications) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-3">
      <div className="bg-red-500 text-white rounded-full p-3 shadow-lg animate-pulse flex items-center gap-2">
        <AlertTriangle className="w-5 h-5" />
        <span className="font-bold text-sm">{criticalCount} تنبيه حرج</span>
      </div>
    </div>
  );
}
