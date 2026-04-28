import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export interface ExpiryActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName: string;
  itemType: 'card' | 'passport';
  expiryDate: string;
  daysRemaining: number;
  onConfirm: (action: string, notes: string) => void;
}

const ACTIONS = {
  card: [
    { value: 'renewed', label: 'تم تجديد البطاقة' },
    { value: 'replaced', label: 'تم استبدال البطاقة' },
    { value: 'cancelled', label: 'تم إلغاء البطاقة' },
    { value: 'pending', label: 'قيد الانتظار' },
  ],
  passport: [
    { value: 'renewed', label: 'تم تجديد الجواز' },
    { value: 'replaced', label: 'تم استبدال الجواز' },
    { value: 'expired', label: 'انتهت صلاحيته' },
    { value: 'pending', label: 'قيد الانتظار' },
  ],
};

export function ExpiryActionDialog({
  open,
  onOpenChange,
  customerName,
  itemType,
  expiryDate,
  daysRemaining,
  onConfirm,
}: ExpiryActionDialogProps) {
  const [selectedAction, setSelectedAction] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!selectedAction) {
      alert('يرجى اختيار إجراء');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(selectedAction, notes);
      setSelectedAction('');
      setNotes('');
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const itemTypeLabel = itemType === 'card' ? 'البطاقة' : 'جواز السفر';
  const urgencyColor = daysRemaining <= 30 ? 'text-red-600' : 'text-yellow-600';
  const urgencyBgColor = daysRemaining <= 30 ? 'bg-red-50' : 'bg-yellow-50';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className={`w-5 h-5 ${urgencyColor}`} />
            تأكيد الإجراء المتخذ
          </DialogTitle>
          <DialogDescription>
            تأكيد الإجراء الذي تم اتخاذه بخصوص {itemTypeLabel} قريبة الانتهاء
          </DialogDescription>
        </DialogHeader>

        <div className={`p-4 rounded-lg border ${urgencyBgColor} border-current`}>
          <div className="space-y-2">
            <p className="font-semibold text-sm">
              {itemTypeLabel} - {customerName}
            </p>
            <p className={`text-sm ${urgencyColor}`}>
              تنتهي الصلاحية في <span className="font-bold">{daysRemaining}</span> يوم
            </p>
            <p className="text-xs text-gray-600">
              تاريخ الانتهاء: {expiryDate}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="action" className="text-sm font-medium">
              الإجراء المتخذ *
            </Label>
            <Select value={selectedAction} onValueChange={setSelectedAction}>
              <SelectTrigger id="action" className="mt-2">
                <SelectValue placeholder="اختر الإجراء المتخذ" />
              </SelectTrigger>
              <SelectContent>
                {ACTIONS[itemType].map((action) => (
                  <SelectItem key={action.value} value={action.value}>
                    {action.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes" className="text-sm font-medium">
              ملاحظات إضافية (اختياري)
            </Label>
            <Textarea
              id="notes"
              placeholder="أضف أي ملاحظات تتعلق بهذا الإجراء..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-2 min-h-20"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedAction || isSubmitting}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⏳</span>
                جاري التأكيد...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                تأكيد الإجراء
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
