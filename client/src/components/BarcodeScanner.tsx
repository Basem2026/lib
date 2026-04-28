import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, FlipHorizontal, Flashlight, X } from 'lucide-react';
import { toast } from 'sonner';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

type FacingMode = 'environment' | 'user';

export default function BarcodeScanner({ onScan, isOpen, onClose }: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [facingMode, setFacingMode] = useState<FacingMode>('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const containerId = useRef(`qr-reader-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => setHasMultipleCameras(devices.length > 1))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopScanning();
      return;
    }
    const timer = setTimeout(() => startScanning(), 400);
    return () => {
      clearTimeout(timer);
    };
  }, [isOpen, facingMode]);

  useEffect(() => {
    return () => { stopScanning(); };
  }, []);

  const startScanning = async () => {
    await stopScanning();
    const element = document.getElementById(containerId.current);
    if (!element) return;

    try {
      const scanner = new Html5Qrcode(containerId.current, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
        ],
        verbose: false,
      });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode },
        { fps: 15, qrbox: { width: 260, height: 180 }, aspectRatio: 1.5 },
        (decodedText) => {
          onScan(decodedText);
          toast.success(`تم المسح: ${decodedText}`);
          stopScanning();
          onClose();
        },
        () => {}
      );

      // محاولة الحصول على track للفلاش
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode } }
        });
        const track = stream.getVideoTracks()[0];
        if (track) {
          const capabilities = track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };
          if (capabilities.torch) {
            trackRef.current = track;
            setTorchSupported(true);
          } else {
            track.stop();
          }
        }
      } catch {
        // الفلاش غير مدعوم
      }

      setIsScanning(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('permission') || msg.includes('Permission') || msg.includes('NotAllowed')) {
        toast.error('يرجى السماح بالوصول إلى الكاميرا من إعدادات المتصفح');
      } else if (msg.includes('NotFound') || msg.includes('not found')) {
        toast.error('لم يتم العثور على كاميرا');
      } else {
        toast.error('فشل تشغيل الكاميرا. حاول مرة أخرى.');
      }
    }
  };

  const stopScanning = async () => {
    // إيقاف الفلاش أولاً
    if (trackRef.current) {
      try {
        await (trackRef.current as MediaStreamTrack & { applyConstraints: (c: object) => Promise<void> })
          .applyConstraints({ advanced: [{ torch: false }] } as object);
        trackRef.current.stop();
      } catch {}
      trackRef.current = null;
      setTorchOn(false);
      setTorchSupported(false);
    }

    if (scannerRef.current) {
      try {
        if (isScanning) await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
      setIsScanning(false);
    }
  };

  const toggleTorch = async () => {
    if (!trackRef.current) return;
    const next = !torchOn;
    try {
      await (trackRef.current as MediaStreamTrack & { applyConstraints: (c: object) => Promise<void> })
        .applyConstraints({ advanced: [{ torch: next }] } as object);
      setTorchOn(next);
    } catch {
      toast.error('الفلاش غير مدعوم على هذا الجهاز');
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const handleClose = () => {
    stopScanning();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-2xl">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            مسح الباركود / QR
          </DialogTitle>
          <DialogDescription>
            وجّه الكاميرا نحو الباركود أو رمز QR
          </DialogDescription>
        </DialogHeader>

        <div className="relative bg-black" style={{ minHeight: '300px' }}>
          {/* منطقة المسح */}
          <div
            id={containerId.current}
            className="w-full"
            style={{ minHeight: '300px' }}
          />

          {/* الإطار التوجيهي overlay */}
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {/* تعتيم الخلفية */}
              <div className="absolute inset-0 bg-black/40" />

              {/* الإطار الشفاف في المنتصف */}
              <div
                className="relative z-10 border-0"
                style={{ width: '260px', height: '180px' }}
              >
                {/* زوايا الإطار */}
                <span className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-yellow-400 rounded-tl-md" />
                <span className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-yellow-400 rounded-tr-md" />
                <span className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-yellow-400 rounded-bl-md" />
                <span className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-yellow-400 rounded-br-md" />

                {/* خط المسح المتحرك */}
                <div
                  className="absolute left-2 right-2 h-0.5 bg-yellow-400 opacity-80 animate-scan-line"
                  style={{ top: '50%' }}
                />
              </div>

              {/* نص توجيهي */}
              <p className="absolute bottom-4 left-0 right-0 text-center text-white text-xs opacity-80">
                ضع الباركود داخل الإطار
              </p>
            </div>
          )}
        </div>

        {/* أزرار التحكم */}
        <div className="flex gap-2 px-4 py-3 bg-background">
          {torchSupported && (
            <Button
              variant={torchOn ? 'default' : 'outline'}
              size="icon"
              onClick={toggleTorch}
              title={torchOn ? 'إيقاف الفلاش' : 'تشغيل الفلاش'}
            >
              <Flashlight className="w-4 h-4" />
            </Button>
          )}

          {hasMultipleCameras && (
            <Button
              variant="outline"
              size="icon"
              onClick={toggleCamera}
              disabled={!isScanning}
              title={facingMode === 'environment' ? 'التبديل للأمامية' : 'التبديل للخلفية'}
            >
              <FlipHorizontal className="w-4 h-4" />
            </Button>
          )}

          <Button variant="outline" className="flex-1" onClick={handleClose}>
            <X className="w-4 h-4 ml-2" />
            إلغاء
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
