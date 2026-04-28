/**
 * ThermalLabelPreview
 * معاينة حقيقية للملصق الحراري داخل التطبيق قبل الطباعة
 * التنسيق الرسمي:
 *   1. شعار الشركة + اسم الشركة + رقم الهاتف
 *   2. ─────────────────
 *   3. رقم المعاملة
 *   4. QR Code + Barcode CODE128
 *   5. ─────────────────
 *   6. اسم صاحب المعاملة
 */

import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import JsBarcode from 'jsbarcode';
import { THERMAL_SIZES, ThermalSize, ThermalSizeOption } from './ThermalPrintWindow';
import { openThermalPrintWindow } from './ThermalPrintWindow';
import { Button } from '@/components/ui/button';
import { Printer, ZoomIn, ZoomOut } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface ThermalLabelPreviewProps {
  transactionId: string;
  customerName: string;
  cardNumber?: string;
  date?: string;
}

const LOGO_URL =
  'https://files.manuscdn.com/user_upload_by_module/session_file/310519663215657361/bjCunNzkJAZLbySx.png';

// DPI افتراضي للشاشة: 96px/inch = 3.7795px/mm
const PX_PER_MM = 3.7795;

export function ThermalLabelPreview({
  transactionId,
  customerName,
  cardNumber,
  date,
}: ThermalLabelPreviewProps) {
  const [selectedSize, setSelectedSize] = useState<ThermalSize>('58x40');
  const [zoom, setZoom] = useState(2.5); // تكبير للعرض على الشاشة
  const barcodeRef = useRef<SVGSVGElement>(null);

  const sizeOpt: ThermalSizeOption =
    THERMAL_SIZES.find((s) => s.value === selectedSize) ?? THERMAL_SIZES[0];

  const W = sizeOpt.width;   // mm
  const H = sizeOpt.height;  // mm

  // حسابات التنسيق حسب المقاس
  const isVerySmall = W <= 30 || H <= 30;
  const isSmall     = W <= 50 || H <= 42;
  const isNarrow    = W < H;

  const fontBase = isVerySmall ? 4   : isSmall ? 5   : 6.5;
  const fontMd   = isVerySmall ? 5   : isSmall ? 6   : 8;
  const fontLg   = isVerySmall ? 5.5 : isSmall ? 7   : 9.5;
  const fontXl   = isVerySmall ? 6   : isSmall ? 7.5 : 11;

  const showLogo    = W >= 38 && H >= 28;
  const showPhone   = H >= 34;
  const showBothCodes = W >= 50 && H >= 40;

  // حجم QR بالـ mm
  const qrMm = showBothCodes
    ? (isNarrow ? Math.min(W - 4, 42) : Math.min(H - 22, 32))
    : Math.min(W - 4, H - 20, 52);

  const bcWidthMm  = showBothCodes
    ? (isNarrow ? W - 4 : Math.min(W - qrMm - 6, 40))
    : W - 4;
  const bcHeightMm = isVerySmall ? 7 : isSmall ? 9 : 12;

  // بيانات QR: JSON مضغوط
  const qrData = JSON.stringify({
    txn: transactionId,
    name: customerName,
    date: date ?? formatDate(new Date()),
  });

  // توليد باركود CODE128 عبر JsBarcode
  useEffect(() => {
    if (!barcodeRef.current) return;
    try {
      JsBarcode(barcodeRef.current, transactionId, {
        format: 'CODE128',
        width: 1.2,
        height: Math.round(bcHeightMm * PX_PER_MM * zoom * 0.75),
        displayValue: true,
        fontSize: Math.max(6, Math.round(fontBase * zoom * 0.9)),
        margin: 2,
        background: '#ffffff',
        lineColor: '#000000',
        fontOptions: 'bold',
        font: 'monospace',
      });
    } catch {
      // تجاهل الأخطاء إذا كان النص غير متوافق
    }
  }, [transactionId, selectedSize, zoom, bcHeightMm, fontBase]);

  const pxW = Math.round(W * PX_PER_MM * zoom);
  const pxH = Math.round(H * PX_PER_MM * zoom);
  const pad = Math.round(1.5 * PX_PER_MM * zoom);

  return (
    <div className="space-y-4">
      {/* ── اختيار المقاس ── */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-orange-800 text-center">اختر مقاس الملصق</p>
        {['طابعات POS', 'ملصقات مستطيلة', 'ملصقات ضيقة', 'ملصقات صغيرة'].map((cat) => (
          <div key={cat}>
            <p className="text-[10px] text-gray-400 font-semibold mb-1 border-b pb-0.5">{cat}</p>
            <div className="grid grid-cols-3 gap-1">
              {THERMAL_SIZES.filter((s) => s.category === cat).map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSelectedSize(s.value)}
                  className={`text-[10px] py-1 px-1.5 rounded border font-mono transition-all ${
                    selectedSize === s.value
                      ? 'bg-orange-600 text-white border-orange-600 font-bold'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-orange-400'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── أدوات التكبير ── */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => setZoom((z) => Math.max(1.5, +(z - 0.5).toFixed(1)))}
          className="p-1 rounded border hover:bg-gray-100"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-xs text-gray-500 w-12 text-center">{zoom}×</span>
        <button
          onClick={() => setZoom((z) => Math.min(5, +(z + 0.5).toFixed(1)))}
          className="p-1 rounded border hover:bg-gray-100"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>

      {/* ── معاينة الملصق ── */}
      <div className="flex justify-center">
        <div
          className="border-2 border-dashed border-orange-300 rounded-lg p-2 bg-orange-50 overflow-auto"
          style={{ maxWidth: '100%' }}
        >
          {/* الملصق الفعلي */}
          <div
            id="thermal-label-preview"
            style={{
              width: pxW,
              height: pxH,
              padding: pad,
              background: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'stretch',
              overflow: 'hidden',
              border: '0.5px solid #ccc',
              boxSizing: 'border-box',
              fontFamily: 'Arial, Tahoma, sans-serif',
              direction: 'rtl',
            }}
          >
            {/* 1. الرأس: شعار + اسم الشركة */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: pad * 0.5, flexShrink: 0 }}>
              <div style={{ flex: 1, textAlign: 'right' }}>
                <div style={{ fontWeight: 900, fontSize: fontXl * zoom * 0.75, color: '#000', lineHeight: 1.2 }}>
                  شركة ليبيا
                </div>
                {!isVerySmall && (
                  <div style={{ fontWeight: 900, fontSize: fontLg * zoom * 0.75, color: '#000', lineHeight: 1.2 }}>
                    للخدمات المالية
                  </div>
                )}
                {showPhone && (
                  <div style={{ fontSize: fontBase * zoom * 0.75, color: '#444', marginTop: 1 }}>
                    0920563695
                  </div>
                )}
              </div>
              {showLogo && (
                <img
                  src={LOGO_URL}
                  alt="شعار"
                  style={{
                    width: Math.round((isVerySmall ? 8 : isSmall ? 11 : 14) * PX_PER_MM * zoom * 0.75),
                    height: Math.round((isVerySmall ? 8 : isSmall ? 11 : 14) * PX_PER_MM * zoom * 0.75),
                    objectFit: 'contain',
                    flexShrink: 0,
                  }}
                />
              )}
            </div>

            {/* فاصل */}
            <hr style={{ border: 'none', borderTop: `${Math.max(1, zoom * 0.3)}px solid #000`, margin: `${pad * 0.3}px 0`, flexShrink: 0 }} />

            {/* 2. رقم المعاملة */}
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: fontBase * zoom * 0.75, color: '#555', lineHeight: 1 }}>رقم المعاملة</div>
              <div style={{
                fontWeight: 900,
                fontSize: fontMd * zoom * 0.75,
                fontFamily: "'Courier New', monospace",
                color: '#000',
                lineHeight: 1.3,
                wordBreak: 'break-all',
              }}>
                {transactionId}
              </div>
            </div>

            {/* 3. QR + باركود */}
            <div style={{
              display: 'flex',
              flexDirection: showBothCodes ? (isNarrow ? 'column' : 'row') : 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: pad * 0.5,
              flex: 1,
              overflow: 'hidden',
            }}>
              {/* QR Code */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <QRCodeSVG
                  value={qrData}
                  size={Math.round(qrMm * PX_PER_MM * zoom * 0.75)}
                  level="H"
                  bgColor="#ffffff"
                  fgColor="#000000"
                  includeMargin={false}
                />
                <span style={{ fontSize: fontBase * zoom * 0.7, color: '#444', fontWeight: 'bold' }}>QR</span>
              </div>

              {/* باركود CODE128 */}
              {showBothCodes && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <svg ref={barcodeRef} />
                  <span style={{ fontSize: fontBase * zoom * 0.7, color: '#444', fontWeight: 'bold' }}>Barcode</span>
                </div>
              )}
            </div>

            {/* فاصل */}
            <hr style={{ border: 'none', borderTop: `${Math.max(1, zoom * 0.3)}px solid #000`, margin: `${pad * 0.3}px 0`, flexShrink: 0 }} />

            {/* 4. اسم صاحب المعاملة */}
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{ fontWeight: 900, fontSize: fontMd * zoom * 0.75, color: '#000', lineHeight: 1.2 }}>
                {customerName}
              </div>
              {date && (
                <div style={{ fontSize: fontBase * zoom * 0.75, color: '#555' }}>{date}</div>
              )}
            </div>
          </div>

          {/* تسمية المقاس */}
          <p className="text-center text-[10px] text-gray-400 mt-1">
            {sizeOpt.label} — معاينة بتكبير {zoom}×
          </p>
        </div>
      </div>

      {/* ── زر الطباعة ── */}
      <Button
        size="lg"
        onClick={async () => {
          await openThermalPrintWindow(
            {
              transactionId,
              customerName,
              cardNumber,
              date: date ?? formatDate(new Date()),
            },
            sizeOpt
          );
        }}
        className="w-full gap-2 bg-orange-600 hover:bg-orange-700 text-base font-semibold"
      >
        <Printer className="w-5 h-5" />
        طباعة الملصق ({sizeOpt.label})
      </Button>
    </div>
  );
}
