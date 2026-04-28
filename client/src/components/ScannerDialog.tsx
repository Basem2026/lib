/**
 * ScannerDialog - مسح QR Code والباركود
 *
 * يدعم طريقتين:
 * 1. كاميرا الهاتف/الحاسوب: يفتح الكاميرا ويمسح QR Code باستمرار باستخدام jsQR
 * 2. قارئ الباركود USB/Bluetooth: يلتقط النص المُدخل تلقائياً (قارئ الباركود يعمل كلوحة مفاتيح)
 *
 * عند الكشف عن رقم معاملة صالح → ينقل مباشرة لصفحة تفاصيل المعاملة
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, Scan, Keyboard, CheckCircle2, AlertCircle, Loader2, X } from "lucide-react";
import { useLocation } from "wouter";
import jsQR from "jsqr";

interface ScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** قائمة الزبائن للبحث عن رقم المعاملة */
  customers?: Array<{ id: string; name?: string; transactionNumber?: string }>;
}

type ScanMode = "camera" | "keyboard";
type ScanStatus = "idle" | "scanning" | "found" | "not_found" | "error";

/**
 * استخراج رقم المعاملة من نص مُمسوح (QR أو Barcode)
 * يدعم:
 * - JSON: {"txn":"20260315-144523-A3F7",...}
 * - نص مباشر: 20260315-144523-A3F7
 * - باركود مباشر: 20260315-144523-A3F7
 */
function extractTransactionId(raw: string): string | null {
  if (!raw || raw.trim().length === 0) return null;
  const text = raw.trim();

  // محاولة JSON
  try {
    const parsed = JSON.parse(text);
    if (parsed.txn) return parsed.txn;
    if (parsed.transactionId) return parsed.transactionId;
    if (parsed.id) return parsed.id;
  } catch {}

  // تنسيق المعاملة: YYYYMMDD-HHMMSS-XXXX أو YYYYMMDD-HHMMSS
  const txnPattern = /\b(\d{8}-\d{6}-[A-F0-9]{4})\b/i;
  const match = text.match(txnPattern);
  if (match) return match[1];

  // تنسيق قديم: أرقام فقط
  const numPattern = /\b(\d{6,})\b/;
  const numMatch = text.match(numPattern);
  if (numMatch) return numMatch[1];

  // النص كاملاً إذا كان قصيراً
  if (text.length <= 30) return text;

  return null;
}

export default function ScannerDialog({ open, onOpenChange, customers = [] }: ScannerDialogProps) {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<ScanMode>("camera");
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [foundCustomer, setFoundCustomer] = useState<{ id: string; name?: string } | null>(null);
  const [keyboardBuffer, setKeyboardBuffer] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const keyboardTimerRef = useRef<NodeJS.Timeout | null>(null);
  const keyboardInputRef = useRef<HTMLInputElement>(null);

  // ===== البحث عن الزبون بواسطة رقم المعاملة =====
  const findCustomer = useCallback((txnId: string) => {
    if (!txnId) return null;
    const normalized = txnId.trim().toUpperCase();
    return customers.find(c => {
      const cId = (c.id || "").trim().toUpperCase();
      const cTxn = (c.transactionNumber || "").trim().toUpperCase();
      return cId === normalized || cTxn === normalized;
    }) || null;
  }, [customers]);

  // ===== معالجة النتيجة المُمسوحة =====
  const handleScanResult = useCallback((raw: string) => {
    const txnId = extractTransactionId(raw);
    if (!txnId) {
      setStatus("not_found");
      setStatusMsg("لم يتم التعرف على رقم معاملة صالح");
      return;
    }

    const customer = findCustomer(txnId);
    if (customer) {
      setStatus("found");
      setFoundCustomer(customer);
      setStatusMsg(`تم العثور على المعاملة: ${txnId}`);
      // توقف الكاميرا
      stopCamera();
      // انتقل بعد 1.2 ثانية
      setTimeout(() => {
        onOpenChange(false);
        setLocation(`/customers/${customer.id}`);
      }, 1200);
    } else {
      setStatus("not_found");
      setStatusMsg(`لم يتم العثور على معاملة بالرقم: ${txnId}`);
    }
  }, [findCustomer, setLocation, onOpenChange]);

  // ===== الكاميرا =====
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setStatus("scanning");
    setStatusMsg("جاري تشغيل الكاميرا...");

    try {
      // تفضيل الكاميرا الخلفية على الهاتف
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStatusMsg("وجّه الكاميرا نحو QR Code أو الباركود");
        scanFrame();
      }
    } catch (err: any) {
      const msg = err?.name === "NotAllowedError"
        ? "لم يتم منح إذن الكاميرا. يرجى السماح بالوصول للكاميرا."
        : err?.name === "NotFoundError"
        ? "لا توجد كاميرا متاحة على هذا الجهاز."
        : `خطأ في الكاميرا: ${err?.message || "غير معروف"}`;
      setCameraError(msg);
      setStatus("error");
      setStatusMsg(msg);
    }
  }, []);

  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    if (code && code.data) {
      handleScanResult(code.data);
      return; // لا تستمر في المسح
    }

    animFrameRef.current = requestAnimationFrame(scanFrame);
  }, [handleScanResult]);

  // ===== قارئ USB (keyboard mode) =====
  useEffect(() => {
    if (mode !== "keyboard" || !open) return;

    // التركيز على حقل الإدخال المخفي
    setTimeout(() => keyboardInputRef.current?.focus(), 100);
  }, [mode, open]);

  const handleKeyboardInput = useCallback((value: string) => {
    setKeyboardBuffer(value);
    // قارئ الباركود يُرسل Enter في النهاية، لكن نضع timer احتياطي
    if (keyboardTimerRef.current) clearTimeout(keyboardTimerRef.current);
    keyboardTimerRef.current = setTimeout(() => {
      if (value.trim().length > 3) {
        handleScanResult(value.trim());
        setKeyboardBuffer("");
      }
    }, 300);
  }, [handleScanResult]);

  const handleKeyboardKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && keyboardBuffer.trim().length > 3) {
      if (keyboardTimerRef.current) clearTimeout(keyboardTimerRef.current);
      handleScanResult(keyboardBuffer.trim());
      setKeyboardBuffer("");
    }
  }, [keyboardBuffer, handleScanResult]);

  // ===== دورة الحياة =====
  useEffect(() => {
    if (open && mode === "camera") {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [open, mode]);

  useEffect(() => {
    if (!open) {
      stopCamera();
      setStatus("idle");
      setStatusMsg("");
      setFoundCustomer(null);
      setKeyboardBuffer("");
      setCameraError(null);
    }
  }, [open, stopCamera]);

  const handleModeSwitch = (newMode: ScanMode) => {
    stopCamera();
    setStatus("idle");
    setStatusMsg("");
    setFoundCustomer(null);
    setCameraError(null);
    setKeyboardBuffer("");
    setMode(newMode);
    if (newMode === "camera") {
      setTimeout(startCamera, 100);
    }
  };

  const handleRetry = () => {
    setStatus("idle");
    setStatusMsg("");
    setFoundCustomer(null);
    setCameraError(null);
    setKeyboardBuffer("");
    if (mode === "camera") startCamera();
    else setTimeout(() => keyboardInputRef.current?.focus(), 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right">
            <Scan className="w-5 h-5 text-blue-600" />
            مسح رمز المعاملة
          </DialogTitle>
        </DialogHeader>

        {/* أزرار اختيار الوضع */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={mode === "camera" ? "default" : "outline"}
            size="sm"
            className="flex-1 gap-2"
            onClick={() => handleModeSwitch("camera")}
          >
            <Camera className="w-4 h-4" />
            كاميرا
          </Button>
          <Button
            variant={mode === "keyboard" ? "default" : "outline"}
            size="sm"
            className="flex-1 gap-2"
            onClick={() => handleModeSwitch("keyboard")}
          >
            <Keyboard className="w-4 h-4" />
            قارئ USB
          </Button>
        </div>

        {/* ===== وضع الكاميرا ===== */}
        {mode === "camera" && (
          <div className="space-y-3">
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              {/* إطار التوجيه */}
              {status === "scanning" && !cameraError && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-2 border-white/70 rounded-lg relative">
                    {/* زوايا */}
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-400 rounded-tl" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-400 rounded-tr" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-400 rounded-bl" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-400 rounded-br" />
                    {/* خط المسح المتحرك */}
                    <div className="absolute inset-x-0 h-0.5 bg-blue-400/80 animate-pulse top-1/2" />
                  </div>
                </div>
              )}
              {/* حالة النجاح */}
              {status === "found" && (
                <div className="absolute inset-0 bg-green-500/80 flex items-center justify-center">
                  <CheckCircle2 className="w-16 h-16 text-white" />
                </div>
              )}
              {/* حالة الخطأ */}
              {(status === "error" || cameraError) && (
                <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center gap-3 p-4">
                  <AlertCircle className="w-12 h-12 text-red-400" />
                  <p className="text-white text-sm text-center">{cameraError}</p>
                </div>
              )}
            </div>
            {/* canvas مخفي للمعالجة */}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}

        {/* ===== وضع قارئ USB ===== */}
        {mode === "keyboard" && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <Keyboard className="w-12 h-12 text-blue-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-blue-800">
                وجّه قارئ الباركود نحو الملصق
              </p>
              <p className="text-xs text-blue-600 mt-1">
                القارئ سيُدخل الرقم تلقائياً
              </p>
            </div>

            {/* حقل إدخال مخفي يستقبل إدخال قارئ USB */}
            <input
              ref={keyboardInputRef}
              type="text"
              value={keyboardBuffer}
              onChange={e => handleKeyboardInput(e.target.value)}
              onKeyDown={handleKeyboardKeyDown}
              className="w-full border rounded-lg px-3 py-2 text-center font-mono text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="في انتظار المسح..."
              autoComplete="off"
              dir="ltr"
            />

            {keyboardBuffer && (
              <p className="text-xs text-gray-500 text-center font-mono">{keyboardBuffer}</p>
            )}
          </div>
        )}

        {/* ===== شريط الحالة ===== */}
        <div className="mt-3">
          {status === "idle" && mode === "camera" && (
            <div className="flex items-center gap-2 text-gray-500 text-sm justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>جاري تشغيل الكاميرا...</span>
            </div>
          )}
          {status === "scanning" && !statusMsg.includes("خطأ") && (
            <div className="flex items-center gap-2 text-blue-600 text-sm justify-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span>{statusMsg || "جاري المسح..."}</span>
            </div>
          )}
          {status === "found" && foundCustomer && (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg p-3">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">تم العثور على المعاملة</p>
                {foundCustomer.name && (
                  <p className="text-xs">{foundCustomer.name}</p>
                )}
                <p className="text-xs text-green-600">جاري الانتقال لصفحة التفاصيل...</p>
              </div>
            </div>
          )}
          {status === "not_found" && (
            <div className="flex items-center gap-2 text-red-700 bg-red-50 rounded-lg p-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-sm">لم يتم العثور على المعاملة</p>
                <p className="text-xs">{statusMsg}</p>
              </div>
              <Button size="sm" variant="outline" onClick={handleRetry} className="text-xs">
                إعادة المسح
              </Button>
            </div>
          )}
          {status === "error" && (
            <div className="flex items-center gap-2 text-orange-700 bg-orange-50 rounded-lg p-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs">{statusMsg}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => handleModeSwitch("keyboard")} className="text-xs">
                استخدم قارئ USB
              </Button>
            </div>
          )}
        </div>

        {/* زر الإغلاق */}
        <Button
          variant="outline"
          className="w-full mt-2"
          onClick={() => onOpenChange(false)}
        >
          <X className="w-4 h-4 ml-2" />
          إغلاق
        </Button>
      </DialogContent>
    </Dialog>
  );
}
