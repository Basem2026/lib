import { AlertTriangle } from 'lucide-react';

export interface ExpiryWarningProps {
  type: 'card' | 'passport';
  daysRemaining: number;
  isExpiring: boolean;
}

export function ExpiryWarning({ type, daysRemaining, isExpiring }: ExpiryWarningProps) {
  if (!isExpiring || daysRemaining < 0) {
    return null;
  }

  const itemLabel = type === 'card' ? 'البطاقة' : 'جواز السفر';
  const urgency = daysRemaining <= 30 ? 'critical' : 'warning';
  const bgColor = urgency === 'critical' ? 'bg-red-100' : 'bg-yellow-100';
  const borderColor = urgency === 'critical' ? 'border-red-400' : 'border-yellow-400';
  const textColor = urgency === 'critical' ? 'text-red-700' : 'text-yellow-700';
  const iconColor = urgency === 'critical' ? 'text-red-600' : 'text-yellow-600';

  return (
    <div className={`${bgColor} border-2 ${borderColor} rounded-lg p-3 flex items-start gap-3`}>
      <AlertTriangle className={`w-5 h-5 ${iconColor} flex-shrink-0 mt-0.5`} />
      <div className={`text-sm ${textColor}`}>
        <p className="font-semibold">
          ⚠️ تنبيه: {itemLabel} قريبة الانتهاء
        </p>
        <p className="text-xs mt-1">
          {itemLabel} ستنتهي صلاحيتها في <span className="font-bold">{daysRemaining}</span> يوم فقط
        </p>
        {urgency === 'critical' && (
          <p className="text-xs mt-1 font-semibold">
            ⚠️ يجب اتخاذ إجراء فوري!
          </p>
        )}
      </div>
    </div>
  );
}
