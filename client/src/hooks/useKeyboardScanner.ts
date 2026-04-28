import { useEffect, useRef, useState } from 'react';

/**
 * Hook لدعم قارئ الباركود الخارجي (USB Scanner)
 * 
 * قارئ الباركود الخارجي يعمل كـ "Keyboard Wedge":
 * - يرسل البيانات كـ keyboard events
 * - ينتهي بـ Enter key (keyCode 13)
 * - أسرع وأدق من الكاميرا
 * 
 * @param onScan - دالة يتم استدعاؤها عند مسح باركود بنجاح
 * @param enabled - تفعيل/تعطيل الماسح
 * @param minLength - الحد الأدنى لطول الباركود (افتراضي: 3)
 * @param timeout - الوقت المسموح بين الأحرف بالميلي ثانية (افتراضي: 100ms)
 */
export function useKeyboardScanner(
  onScan: (code: string) => void,
  enabled: boolean = true,
  minLength: number = 3,
  timeout: number = 100
) {
  const [isScanning, setIsScanning] = useState(false);
  const bufferRef = useRef<string>('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;

      // إذا مر وقت طويل بين الأحرف، نبدأ من جديد
      if (timeDiff > timeout) {
        bufferRef.current = '';
      }

      lastKeyTimeRef.current = currentTime;

      // Enter key = نهاية المسح
      if (event.key === 'Enter' || event.keyCode === 13) {
        event.preventDefault();
        
        const scannedCode = bufferRef.current.trim();
        
        if (scannedCode.length >= minLength) {
          setIsScanning(true);
          onScan(scannedCode);
          
          // إعادة تعيين بعد 500ms
          setTimeout(() => {
            setIsScanning(false);
          }, 500);
        }
        
        bufferRef.current = '';
        return;
      }

      // تجاهل المفاتيح الخاصة
      if (
        event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        event.key.length > 1 // مفاتيح مثل Shift, Control, إلخ
      ) {
        return;
      }

      // إضافة الحرف إلى المخزن المؤقت
      bufferRef.current += event.key;

      // مسح المخزن المؤقت بعد timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        bufferRef.current = '';
      }, timeout * 2);
    };

    // إضافة listener على مستوى document
    document.addEventListener('keypress', handleKeyPress);

    return () => {
      document.removeEventListener('keypress', handleKeyPress);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, onScan, minLength, timeout]);

  return { isScanning };
}
