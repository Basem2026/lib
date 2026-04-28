import { useEffect, useRef } from 'react';

/**
 * Hook للاستماع لقارئ الباركود الخارجي (USB Scanner)
 * يعمل تلقائياً بدون الحاجة لزر مسح
 * 
 * @param onScan - دالة تُستدعى عند قراءة الباركود
 * @param enabled - تفعيل/تعطيل الاستماع (افتراضي: true)
 * @param minLength - الحد الأدنى لطول الباركود (افتراضي: 3)
 * @param timeout - الوقت الأقصى بين الأحرف بالميلي ثانية (افتراضي: 100ms)
 */
export function useExternalBarcodeScanner(
  onScan: (barcode: string) => void,
  enabled: boolean = true,
  minLength: number = 3,
  timeout: number = 100
) {
  const barcodeBuffer = useRef<string>('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      // تجاهل إذا كان المستخدم يكتب في حقل input أو textarea
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // تجاهل المفاتيح الخاصة (Ctrl, Alt, Shift, إلخ)
      if (
        event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        event.key === 'Shift' ||
        event.key === 'Control' ||
        event.key === 'Alt' ||
        event.key === 'Meta'
      ) {
        return;
      }

      // إذا ضغط Enter، نعتبر أن الباركود اكتمل
      if (event.key === 'Enter') {
        event.preventDefault();
        if (barcodeBuffer.current.length >= minLength) {
          const barcode = barcodeBuffer.current.trim();
          onScan(barcode);
          barcodeBuffer.current = '';
        }
        return;
      }

      // إضافة الحرف إلى البافر
      if (event.key.length === 1) {
        barcodeBuffer.current += event.key;

        // إعادة تعيين المؤقت
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        // إذا انتهى الوقت، نعتبر أن القراءة اكتملت
        timeoutRef.current = setTimeout(() => {
          if (barcodeBuffer.current.length >= minLength) {
            const barcode = barcodeBuffer.current.trim();
            onScan(barcode);
          }
          barcodeBuffer.current = '';
        }, timeout);
      }
    };

    // إضافة المستمع
    window.addEventListener('keypress', handleKeyPress);

    // تنظيف
    return () => {
      window.removeEventListener('keypress', handleKeyPress);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, minLength, timeout, onScan]);
}
