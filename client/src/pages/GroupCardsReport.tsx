/**
 * GroupCardsReport - تقرير مجموعة البطاقات
 *
 * يتيح مسح عدة بطاقات بالكاميرا (QR) أو جهاز الباركود (USB/Bluetooth)
 * ويعرض جدولاً بآخر حالة مالية لكل بطاقة
 * مع إمكانية الطباعة وتصدير PDF
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Camera,
  Keyboard,
  Trash2,
  Printer,
  FileDown,
  ArrowRight,
  ScanLine,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  ClipboardList,
} from "lucide-react";
import { useCards } from "@/contexts/CardsContext";
import type { FinancialStatus } from "@/types/cards";
import jsQR from "jsqr";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

// ألوان الحالات المالية الـ 12
const STATUS_COLORS: Record<string, string> = {
  "تم الشراء": "bg-gray-100 text-gray-700",
  "في انتظار المطابقة": "bg-yellow-100 text-yellow-800",
  "تمت المطابقة": "bg-blue-100 text-blue-800",
  "غير مطابق": "bg-red-100 text-red-800",
  "تم الحجز دون اختيار شركة الصرافة": "bg-orange-100 text-orange-800",
  "تم اختيار شركة الصرافة": "bg-purple-100 text-purple-800",
  "تم الإيداع": "bg-indigo-100 text-indigo-800",
  "تم التنفيذ": "bg-cyan-100 text-cyan-800",
  "تم الإيداع الدولار في البطاقة": "bg-teal-100 text-teal-800",
  "تم السحب": "bg-lime-100 text-lime-800",
  "متبقي رصيد في البطاقة": "bg-amber-100 text-amber-800",
  "تم السحب بالكامل": "bg-green-100 text-green-800",
};

// استخراج رقم المعاملة من نص مُمسوح
function extractTransactionId(raw: string): string | null {
  if (!raw || raw.trim().length === 0) return null;
  const text = raw.trim();
  try {
    const parsed = JSON.parse(text);
    if (parsed.txn) return parsed.txn;
    if (parsed.transactionId) return parsed.transactionId;
    if (parsed.id) return parsed.id;
  } catch {}
  const txnPattern = /\b(\d{8}-\d{6}-[A-F0-9]{4})\b/i;
  const match = text.match(txnPattern);
  if (match) return match[1];
  const numPattern = /\b(\d{6,})\b/;
  const numMatch = text.match(numPattern);
  if (numMatch) return numMatch[1];
  if (text.length <= 30) return text;
  return null;
}

interface ScannedCard {
  transactionId: string;
  name: string;
  financialStatus: FinancialStatus;
  scannedAt: Date;
}

type ScanMode = "camera" | "keyboard";
type ScanStatus = "idle" | "scanning" | "found" | "not_found" | "duplicate";

export default function GroupCardsReport() {
  const [, navigate] = useLocation();
  const { cards } = useCards();

  const [scannedCards, setScannedCards] = useState<ScannedCard[]>([]);
  const [mode, setMode] = useState<ScanMode>("camera");
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [keyboardBuffer, setKeyboardBuffer] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const keyboardTimerRef = useRef<NodeJS.Timeout | null>(null);
  const keyboardInputRef = useRef<HTMLInputElement>(null);
  const lastScannedRef = useRef<string | null>(null);
  const scanCooldownRef = useRef(false);

  // ===== معالجة نتيجة المسح =====
  const handleScanResult = useCallback(
    (raw: string) => {
      if (scanCooldownRef.current) return;
      const txnId = extractTransactionId(raw);
      if (!txnId) {
        setScanStatus("not_found");
        setStatusMsg("لم يتم التعرف على رقم معاملة صالح");
        return;
      }
      if (lastScannedRef.current === txnId) return;

      // البحث في البطاقات
      const card = cards.find(
        (c: any) => (c.transactionId || "").trim().toUpperCase() === txnId.trim().toUpperCase()
      );

      if (!card) {
        setScanStatus("not_found");
        setStatusMsg(`لم يتم العثور على معاملة: ${txnId}`);
        lastScannedRef.current = txnId;
        scanCooldownRef.current = true;
        setTimeout(() => {
          scanCooldownRef.current = false;
          lastScannedRef.current = null;
          setScanStatus("scanning");
        }, 2000);
        return;
      }

      // التحقق من التكرار
      const isDuplicate = scannedCards.some((s) => s.transactionId === (card as any).transactionId);
      if (isDuplicate) {
        setScanStatus("duplicate");
        setStatusMsg(`البطاقة ${card.name} مضافة مسبقاً`);
        lastScannedRef.current = txnId;
        scanCooldownRef.current = true;
        setTimeout(() => {
          scanCooldownRef.current = false;
          lastScannedRef.current = null;
          setScanStatus("scanning");
        }, 2000);
        return;
      }

      // إضافة البطاقة
      const newCard: ScannedCard = {
        transactionId: (card as any).transactionId,
        name: (card as any).name,
        financialStatus: (card as any).financialStatus as FinancialStatus,
        scannedAt: new Date(),
      };
      setScannedCards((prev) => [...prev, newCard]);
      setScanStatus("found");
      setStatusMsg(card.name);
      lastScannedRef.current = txnId;
      scanCooldownRef.current = true;
      toast.success(`تمت إضافة: ${(card as any).name}`);
      setTimeout(() => {
        scanCooldownRef.current = false;
        lastScannedRef.current = null;
        setScanStatus("scanning");
      }, 1500);
    },
    [cards, scannedCards]
  );

  // ===== الكاميرا =====
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setScanStatus("idle");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setScanStatus("scanning");
        scanFrame();
      }
    } catch (err: unknown) {
      const error = err as Error;
      if (error.name === "NotAllowedError") {
        setCameraError("تم رفض إذن الكاميرا. يرجى السماح بالوصول من إعدادات المتصفح.");
      } else if (error.name === "NotFoundError") {
        setCameraError("لم يتم العثور على كاميرا. استخدم قارئ الباركود.");
      } else {
        setCameraError("تعذر تشغيل الكاميرا.");
      }
      setScanStatus("idle");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanStatus("idle");
  }, []);

  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });
    if (code?.data) {
      handleScanResult(code.data);
    }
    animFrameRef.current = requestAnimationFrame(scanFrame);
  }, [handleScanResult]);

  useEffect(() => {
    if (mode === "camera") {
      startCamera();
    } else {
      stopCamera();
      setTimeout(() => keyboardInputRef.current?.focus(), 100);
    }
    return () => stopCamera();
  }, [mode]);

  // ===== قارئ USB/Bluetooth =====
  const handleKeyboardInput = useCallback(
    (value: string) => {
      setKeyboardBuffer(value);
      if (keyboardTimerRef.current) clearTimeout(keyboardTimerRef.current);
      keyboardTimerRef.current = setTimeout(() => {
        if (value.trim()) {
          handleScanResult(value.trim());
          setKeyboardBuffer("");
        }
      }, 300);
    },
    [handleScanResult]
  );

  const handleKeyboardKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        if (keyboardTimerRef.current) clearTimeout(keyboardTimerRef.current);
        const val = keyboardBuffer.trim();
        if (val) {
          handleScanResult(val);
          setKeyboardBuffer("");
        }
      }
    },
    [keyboardBuffer, handleScanResult]
  );

  // ===== حذف بطاقة =====
  const removeCard = (transactionId: string) => {
    setScannedCards((prev) => prev.filter((c) => c.transactionId !== transactionId));
  };

  // ===== طباعة =====
  const handlePrint = () => {
    window.print();
  };

  // ===== تصدير CSV =====
  const handleExportCSV = () => {
    const header = "رقم المعاملة,اسم الزبون,آخر حالة مالية,وقت المسح\n";
    const rows = scannedCards
      .map(
        (c) =>
          `${c.transactionId},"${c.name}","${c.financialStatus}","${formatDate(c.scannedAt)}"`
      )
      .join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `تقرير_مجموعة_البطاقات_${new Date().toLocaleDateString("ar")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* ===== Header ===== */}
      <div
        className="text-white py-4 px-4 flex items-center gap-3 print:hidden"
        style={{ backgroundColor: "#1E2E3D" }}
      >
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/10"
          onClick={() => navigate("/cards")}
        >
          <ArrowRight className="w-4 h-4" />
        </Button>
        <ClipboardList className="w-5 h-5" style={{ color: "#C9A34D" }} />
        <h1 className="text-lg font-bold">تقرير مجموعة البطاقات</h1>
        <Badge
          className="mr-auto text-white"
          style={{ backgroundColor: "#C9A34D", color: "#1E2E3D" }}
        >
          {scannedCards.length} بطاقة
        </Badge>
      </div>

      <div className="p-4 space-y-4 max-w-4xl mx-auto">
        {/* ===== قسم المسح ===== */}
        <Card className="print:hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <ScanLine className="w-5 h-5" style={{ color: "#C9A34D" }} />
                مسح البطاقات
              </CardTitle>
              {/* أزرار تبديل الوضع */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={mode === "camera" ? "default" : "outline"}
                  onClick={() => setMode("camera")}
                  className={mode === "camera" ? "text-white" : ""}
                  style={mode === "camera" ? { backgroundColor: "#1E2E3D" } : {}}
                >
                  <Camera className="w-4 h-4 ml-1" />
                  كاميرا
                </Button>
                <Button
                  size="sm"
                  variant={mode === "keyboard" ? "default" : "outline"}
                  onClick={() => setMode("keyboard")}
                  className={mode === "keyboard" ? "text-white" : ""}
                  style={mode === "keyboard" ? { backgroundColor: "#1E2E3D" } : {}}
                >
                  <Keyboard className="w-4 h-4 ml-1" />
                  جهاز
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* ===== وضع الكاميرا ===== */}
            {mode === "camera" && (
              <div className="space-y-3">
                <div className="relative w-full rounded-lg overflow-hidden bg-black" style={{ aspectRatio: "4/3", maxHeight: "280px" }}>
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                  />
                  {/* إطار المسح */}
                  {scanStatus === "scanning" && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div
                        className="w-48 h-48 border-2 rounded-lg relative"
                        style={{ borderColor: "#C9A34D" }}
                      >
                        <div
                          className="absolute inset-x-0 h-0.5 animate-pulse top-1/2"
                          style={{ backgroundColor: "#C9A34D" }}
                        />
                      </div>
                    </div>
                  )}
                  {/* حالة النجاح */}
                  {scanStatus === "found" && (
                    <div className="absolute inset-0 bg-green-500/80 flex flex-col items-center justify-center gap-2">
                      <CheckCircle2 className="w-12 h-12 text-white" />
                      <p className="text-white font-bold text-sm">{statusMsg}</p>
                    </div>
                  )}
                  {/* حالة التكرار */}
                  {scanStatus === "duplicate" && (
                    <div className="absolute inset-0 bg-yellow-500/80 flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="w-12 h-12 text-white" />
                      <p className="text-white font-bold text-sm">{statusMsg}</p>
                    </div>
                  )}
                  {/* حالة عدم الوجود */}
                  {scanStatus === "not_found" && (
                    <div className="absolute inset-0 bg-red-500/80 flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="w-12 h-12 text-white" />
                      <p className="text-white font-bold text-sm">{statusMsg}</p>
                    </div>
                  )}
                  {/* خطأ الكاميرا */}
                  {cameraError && (
                    <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center gap-3 p-4">
                      <AlertCircle className="w-10 h-10 text-red-400" />
                      <p className="text-white text-sm text-center">{cameraError}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-white border-white"
                        onClick={() => setMode("keyboard")}
                      >
                        استخدم قارئ الجهاز
                      </Button>
                    </div>
                  )}
                </div>
                <canvas ref={canvasRef} className="hidden" />
                <p className="text-xs text-center text-muted-foreground">
                  وجّه الكاميرا نحو QR Code الموجود على الملصق
                </p>
              </div>
            )}

            {/* ===== وضع قارئ الجهاز ===== */}
            {mode === "keyboard" && (
              <div className="space-y-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <Keyboard className="w-10 h-10 text-blue-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-blue-800">
                    وجّه قارئ الباركود نحو الملصق
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    القارئ سيُدخل الرقم تلقائياً
                  </p>
                </div>
                <input
                  ref={keyboardInputRef}
                  type="text"
                  value={keyboardBuffer}
                  onChange={(e) => handleKeyboardInput(e.target.value)}
                  onKeyDown={handleKeyboardKeyDown}
                  className="w-full border rounded-lg px-3 py-2 text-center font-mono text-lg tracking-widest focus:outline-none focus:ring-2"
                  style={{ direction: "ltr" }}
                  placeholder="في انتظار المسح..."
                  autoComplete="off"
                />
                {/* حالة المسح */}
                {scanStatus === "found" && (
                  <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg p-3">
                    <CheckCircle2 className="w-5 h-5" />
                    <p className="text-sm font-semibold">تمت الإضافة: {statusMsg}</p>
                  </div>
                )}
                {scanStatus === "not_found" && (
                  <div className="flex items-center gap-2 text-red-700 bg-red-50 rounded-lg p-3">
                    <AlertCircle className="w-5 h-5" />
                    <p className="text-sm">{statusMsg}</p>
                  </div>
                )}
                {scanStatus === "duplicate" && (
                  <div className="flex items-center gap-2 text-yellow-700 bg-yellow-50 rounded-lg p-3">
                    <AlertCircle className="w-5 h-5" />
                    <p className="text-sm">{statusMsg}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ===== جدول البطاقات ===== */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="w-5 h-5" style={{ color: "#C9A34D" }} />
                التقرير ({scannedCards.length} بطاقة)
              </CardTitle>
              {scannedCards.length > 0 && (
                <div className="flex gap-2 print:hidden">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExportCSV}
                    className="text-xs"
                  >
                    <FileDown className="w-3 h-3 ml-1" />
                    تصدير CSV
                  </Button>
                  <Button
                    size="sm"
                    onClick={handlePrint}
                    className="text-xs text-white"
                    style={{ backgroundColor: "#1E2E3D" }}
                  >
                    <Printer className="w-3 h-3 ml-1" />
                    طباعة
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {scannedCards.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ScanLine className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">لم يتم مسح أي بطاقة بعد</p>
                <p className="text-xs mt-1">ابدأ بمسح QR Code للبطاقات</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right w-8">#</TableHead>
                      <TableHead className="text-right">رقم المعاملة</TableHead>
                      <TableHead className="text-right">اسم الزبون</TableHead>
                      <TableHead className="text-right">آخر حالة مالية</TableHead>
                      <TableHead className="text-right print:hidden">حذف</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scannedCards.map((card, index) => (
                      <TableRow key={card.transactionId}>
                        <TableCell className="text-muted-foreground text-sm">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-mono text-xs" dir="ltr">
                          {card.transactionId}
                        </TableCell>
                        <TableCell className="font-medium text-sm">{card.name}</TableCell>
                        <TableCell>
                          <Badge
                            className={`text-xs ${STATUS_COLORS[card.financialStatus] || "bg-gray-100 text-gray-700"}`}
                          >
                            {card.financialStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="print:hidden">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                            onClick={() => removeCard(card.transactionId)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ===== ملخص الحالات ===== */}
        {scannedCards.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">ملخص الحالات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(
                  scannedCards.reduce(
                    (acc, card) => {
                      acc[card.financialStatus] = (acc[card.financialStatus] || 0) + 1;
                      return acc;
                    },
                    {} as Record<string, number>
                  )
                ).map(([status, count]) => (
                  <div
                    key={status}
                    className={`rounded-lg p-3 flex items-center justify-between ${STATUS_COLORS[status] || "bg-gray-100 text-gray-700"}`}
                  >
                    <span className="text-xs font-medium">{status}</span>
                    <span className="text-lg font-bold">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ===== أنماط الطباعة ===== */}
      <style>{`
        @media print {
          body { direction: rtl; font-family: Arial, sans-serif; }
          .print\\:hidden { display: none !important; }
          @page { margin: 1cm; }
        }
      `}</style>
    </div>
  );
}
