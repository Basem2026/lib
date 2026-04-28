/**
 * CardOCRScanner - مسح رقم البطاقة بالكاميرا
 *
 * يستخدم jsQR لمسح QR Code والباركود، متوافق مع iOS Safari وجميع المتصفحات.
 * يدعم أيضاً الإدخال اليدوي كبديل.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Camera, FlipHorizontal, Loader2, X, ScanLine } from 'lucide-react';
import { toast } from 'sonner';
import jsQR from 'jsqr';

interface CardOCRScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCardNumberDetected: (cardNumber: string) => void;
}

type FacingMode = 'environment' | 'user';
type Stage = 'start' | 'camera' | 'manual';

export function CardOCRScanner({ open, onOpenChange, onCardNumberDetected }: CardOCRScannerProps) {
  const [stage, setStage] = useState<Stage>('start');
  const [facingMode, setFacingMode] = useState<FacingMode>('environment');
  const [manualInput, setManualInput] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // ===== تنظيف الكاميرا =====
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  }, []);

  // ===== مسح الإطارات بـ jsQR =====
  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    if (code && code.data) {
      // استخراج الأرقام من النتيجة
      const digits = code.data.replace(/\D/g, '');
      if (digits.length >= 13) {
        const cardNumber = digits.substring(0, 16);
        stopCamera();
        onCardNumberDetected(cardNumber);
        toast.success(`تم قراءة رقم البطاقة: ${cardNumber}`);
        handleClose();
        return;
      }
    }

    animFrameRef.current = requestAnimationFrame(scanFrame);
  }, [stopCamera, onCardNumberDetected]);

  // ===== فتح الكاميرا =====
  const startCamera = useCallback(async (mode: FacingMode = 'environment') => {
    stopCamera();
    setCameraError(null);
    setFacingMode(mode);
    setStage('camera');
    setIsScanning(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // iOS Safari يحتاج playsInline ويجب الانتظار حتى يكون جاهزاً
        await videoRef.current.play();
        // بدء المسح بعد بدء التشغيل
        animFrameRef.current = requestAnimationFrame(scanFrame);
      }
    } catch (err: unknown) {
      const error = err as { name?: string; message?: string };
      let msg = 'فشل في فتح الكاميرا';
      if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
        msg = 'لم يتم السماح بالوصول للكاميرا. يرجى السماح من إعدادات المتصفح.';
      } else if (error?.name === 'NotFoundError') {
        msg = 'لا توجد كاميرا متاحة على هذا الجهاز.';
      } else if (error?.name === 'NotReadableError') {
        msg = 'الكاميرا مستخدمة من تطبيق آخر. يرجى إغلاقه والمحاولة مجدداً.';
      } else if (error?.message) {
        msg = `خطأ: ${error.message}`;
      }
      setCameraError(msg);
      setIsScanning(false);
      toast.error(msg);
    }
  }, [stopCamera, scanFrame]);

  // ===== تنظيف عند إغلاق الـ Dialog =====
  useEffect(() => {
    if (!open) {
      stopCamera();
      setStage('start');
      setManualInput('');
      setCameraError(null);
    }
  }, [open, stopCamera]);

  const handleClose = useCallback(() => {
    stopCamera();
    setStage('start');
    setManualInput('');
    setCameraError(null);
    onOpenChange(false);
  }, [stopCamera, onOpenChange]);

  const toggleCamera = useCallback(() => {
    const next: FacingMode = facingMode === 'environment' ? 'user' : 'environment';
    startCamera(next);
  }, [facingMode, startCamera]);

  const handleManualSubmit = () => {
    const digits = manualInput.replace(/\D/g, '');
    if (digits.length >= 13) {
      onCardNumberDetected(digits.substring(0, 16));
      toast.success(`تم إدخال رقم البطاقة: ${digits.substring(0, 16)}`);
      handleClose();
    } else {
      toast.error('رقم البطاقة يجب أن يكون 13-16 رقم على الأقل');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm p-0 overflow-hidden rounded-2xl" dir="rtl">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle>مسح رقم البطاقة</DialogTitle>
          <DialogDescription>
            وجّه الكاميرا نحو QR Code أو باركود البطاقة
          </DialogDescription>
        </DialogHeader>

        {/* ===== شاشة البداية ===== */}
        {stage === 'start' && (
          <div className="px-4 pb-5 space-y-3">
            <Button
              onClick={() => startCamera('environment')}
              className="w-full gap-2 py-6 text-base"
              style={{ backgroundColor: '#1E2E3D' }}
            >
              <Camera className="h-5 w-5" />
              فتح الكاميرا الخلفية
            </Button>
            <Button
              variant="outline"
              onClick={() => setStage('manual')}
              className="w-full gap-2"
            >
              <ScanLine className="h-4 w-4" />
              إدخال الرقم يدوياً
            </Button>
          </div>
        )}

        {/* ===== شاشة الكاميرا ===== */}
        {stage === 'camera' && (
          <>
            {/* عنصر video مع canvas مخفي */}
            <div className="relative bg-black" style={{ minHeight: '260px' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full"
                style={{ minHeight: '260px', objectFit: 'cover', display: 'block' }}
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* إطار التوجيه */}
              {!cameraError && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="relative" style={{ width: '220px', height: '140px' }}>
                    {/* زوايا الإطار */}
                    <span className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-yellow-400 rounded-tl-lg" />
                    <span className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-yellow-400 rounded-tr-lg" />
                    <span className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-yellow-400 rounded-bl-lg" />
                    <span className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-yellow-400 rounded-br-lg" />
                    {/* خط المسح */}
                    <div className="absolute inset-x-2 top-1/2 h-0.5 bg-yellow-400 opacity-80 animate-pulse" />
                  </div>
                </div>
              )}

              {/* مؤشر المسح */}
              {isScanning && !cameraError && (
                <div className="absolute top-3 right-3 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  مسح...
                </div>
              )}

              {/* رسالة الخطأ */}
              {cameraError && (
                <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center gap-3 p-4 text-center">
                  <p className="text-white text-sm">{cameraError}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-white border-white"
                    onClick={() => startCamera(facingMode)}
                  >
                    إعادة المحاولة
                  </Button>
                </div>
              )}
            </div>

            {/* أزرار التحكم */}
            <div className="flex gap-2 px-4 py-3">
              <Button
                variant="outline"
                size="icon"
                onClick={toggleCamera}
                title={facingMode === 'environment' ? 'التبديل للأمامية' : 'التبديل للخلفية'}
              >
                <FlipHorizontal className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-2 text-sm"
                onClick={() => {
                  stopCamera();
                  setStage('manual');
                }}
              >
                <ScanLine className="h-4 w-4" />
                إدخال يدوي
              </Button>
              <Button variant="outline" size="icon" onClick={() => { stopCamera(); setStage('start'); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 text-center pb-3">
              {facingMode === 'environment' ? '📷 الكاميرا الخلفية' : '🤳 الكاميرا الأمامية'}
            </p>
          </>
        )}

        {/* ===== الإدخال اليدوي ===== */}
        {stage === 'manual' && (
          <div className="px-4 pb-5 space-y-3">
            <p className="text-sm text-gray-600 text-center">أدخل رقم البطاقة (13-16 رقم)</p>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="مثال: 5412345678901234"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value.replace(/\D/g, ''))}
              maxLength={16}
              className="w-full border-2 border-gray-300 rounded-lg px-3 py-3 text-center text-xl font-mono focus:outline-none focus:border-blue-500 tracking-widest"
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                onClick={handleManualSubmit}
                className="flex-1"
                style={{ backgroundColor: '#1E2E3D' }}
                disabled={manualInput.length < 13}
              >
                تأكيد الرقم
              </Button>
              <Button
                variant="outline"
                onClick={() => { setManualInput(''); setStage('start'); }}
              >
                رجوع
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
