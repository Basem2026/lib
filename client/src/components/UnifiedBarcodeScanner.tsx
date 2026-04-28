import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Keyboard, Scan } from 'lucide-react';
import { toast } from 'sonner';
import BarcodeScanner from './BarcodeScanner';
import { useKeyboardScanner } from '@/hooks/useKeyboardScanner';

interface UnifiedBarcodeScannerProps {
  onScan: (code: string) => void;
  placeholder?: string;
  buttonText?: string;
  className?: string;
}

/**
 * مكون موحد لمسح الباركود/QR
 * يدعم طريقتين:
 * 1. الكاميرا (عبر BarcodeScanner)
 * 2. قارئ الباركود الخارجي (USB Scanner)
 */
export default function UnifiedBarcodeScanner({
  onScan,
  placeholder = 'مسح الباركود...',
  buttonText = 'مسح',
  className = ''
}: UnifiedBarcodeScannerProps) {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isKeyboardMode, setIsKeyboardMode] = useState(false);
  const [scanMethod, setScanMethod] = useState<'camera' | 'keyboard'>('camera');

  // دعم قارئ الباركود الخارجي
  const { isScanning } = useKeyboardScanner(
    (code) => {
      if (isKeyboardMode) {
        toast.success(`تم المسح: ${code}`);
        onScan(code);
        setIsKeyboardMode(false);
      }
    },
    isKeyboardMode,
    3, // الحد الأدنى: 3 أحرف
    100 // timeout: 100ms
  );

  const handleCameraScan = (code: string) => {
    onScan(code);
    setIsCameraOpen(false);
  };

  const handleKeyboardMode = () => {
    setIsKeyboardMode(true);
    toast.info('جاهز للمسح! استخدم قارئ الباركود الآن...', {
      duration: 3000,
    });
    
    // إيقاف الوضع بعد 10 ثوان
    setTimeout(() => {
      if (isKeyboardMode) {
        setIsKeyboardMode(false);
        toast.error('انتهى وقت المسح');
      }
    }, 10000);
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      {/* زر مسح بالكاميرا */}
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setScanMethod('camera');
          setIsCameraOpen(true);
        }}
        className="flex-1"
      >
        <Camera className="w-4 h-4 ml-2" />
        مسح بالكاميرا
      </Button>

      {/* زر مسح بالقارئ الخارجي */}
      <Button
        type="button"
        variant={isKeyboardMode ? 'default' : 'outline'}
        onClick={handleKeyboardMode}
        disabled={isKeyboardMode}
        className="flex-1"
      >
        {isScanning ? (
          <>
            <Scan className="w-4 h-4 ml-2 animate-pulse" />
            جاري المسح...
          </>
        ) : (
          <>
            <Keyboard className="w-4 h-4 ml-2" />
            {isKeyboardMode ? 'جاهز للمسح...' : 'قارئ خارجي'}
          </>
        )}
      </Button>

      {/* نافذة الكاميرا */}
      <BarcodeScanner
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onScan={handleCameraScan}
      />
    </div>
  );
}
