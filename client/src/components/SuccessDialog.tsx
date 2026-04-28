import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-react';
import { Customer, Card as BankCard } from '@/types/customers';
import { useRef, useState, useEffect } from 'react';
import { QRCodeSVG as QRCode } from 'qrcode.react';
import JsBarcode from 'jsbarcode';
import { formatDate, formatDateTime } from '@/lib/utils';
import { openThermalPrintWindow, THERMAL_SIZES, ThermalSize } from '@/components/ThermalPrintWindow';

const LOGO_URL = 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663215657361/bjCunNzkJAZLbySx.png';

interface CardData extends BankCard {
  purchasePrice?: number;
  delegateShare?: number;
}

interface SuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  card: CardData | null;
  transactionId?: string;
  delegate?: string;
  accountNumber?: string;
  iban1?: string;
  iban2?: string;
  accountPhone?: string;
  passportNumber?: string;
  passportExpiry?: string;
  documentsReceived?: { passport: boolean; pin: boolean; card: boolean };
  onReceiptDataChange?: (data: any) => void;
}

// ── مكوّن الملصق الحراري المرئي ──────────────────────────────
function ThermalLabelCard({
  transactionId,
  customerName,
  cardNumber,
  sizeLabel,
  widthMm,
  heightMm,
}: {
  transactionId: string;
  customerName: string;
  cardNumber?: string;
  sizeLabel: string;
  widthMm: number;
  heightMm: number;
}) {
  const barcodeRef = useRef<SVGSVGElement>(null);
  // تكبير للعرض على الشاشة (96px/inch = 3.7795px/mm)
  const PX_PER_MM = 3.7795;
  const ZOOM = 2.2;
  const pxW = Math.round(widthMm * PX_PER_MM * ZOOM);
  const pxH = Math.round(heightMm * PX_PER_MM * ZOOM);
  const pad = Math.round(1.5 * PX_PER_MM * ZOOM);

  const isVerySmall = widthMm <= 30 || heightMm <= 30;
  const isSmall     = widthMm <= 50 || heightMm <= 42;
  const showLogo    = widthMm >= 38 && heightMm >= 28;
  const showBarcode = widthMm >= 50 && heightMm >= 38;

  const fontBase = isVerySmall ? 4   : isSmall ? 5   : 6.5;
  const fontMd   = isVerySmall ? 5   : isSmall ? 6   : 8;
  const fontLg   = isVerySmall ? 5.5 : isSmall ? 7   : 9.5;
  const qrSize   = Math.round(Math.min(widthMm - 6, heightMm - 24, 36) * PX_PER_MM * ZOOM);
  const bcH      = Math.round((isVerySmall ? 7 : isSmall ? 9 : 11) * PX_PER_MM * ZOOM * 0.6);

  const qrData = JSON.stringify({ txn: transactionId, name: customerName });

  useEffect(() => {
    if (!barcodeRef.current || !showBarcode) return;
    try {
      JsBarcode(barcodeRef.current, transactionId, {
        format: 'CODE128',
        width: 1.1,
        height: bcH,
        displayValue: true,
        fontSize: Math.max(6, Math.round(fontBase * ZOOM * 0.7)),
        margin: 2,
        background: '#ffffff',
        lineColor: '#000000',
        fontOptions: 'bold',
        font: 'monospace',
      });
    } catch { /* تجاهل */ }
  }, [transactionId, widthMm, heightMm]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      {/* الملصق */}
      <div
        style={{
          width: pxW,
          height: pxH,
          padding: pad,
          background: '#fff',
          border: '1px solid #999',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'stretch',
          overflow: 'hidden',
          fontFamily: 'Arial, Tahoma, sans-serif',
          direction: 'rtl',
        }}
      >
        {/* 1. رأس: شعار + اسم الشركة */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, flexShrink: 0 }}>
          <div style={{ flex: 1, textAlign: 'right' }}>
            <div style={{ fontWeight: 900, fontSize: fontLg * ZOOM * 0.72, color: '#000', lineHeight: 1.2 }}>
              {isVerySmall ? 'ليبيا' : 'شركة ليبيا'}
            </div>
            {!isVerySmall && (
              <div style={{ fontWeight: 700, fontSize: fontBase * ZOOM * 0.72, color: '#000', lineHeight: 1.2 }}>
                للخدمات المالية
              </div>
            )}
            {heightMm >= 34 && (
              <div style={{ fontSize: (fontBase - 1) * ZOOM * 0.72, color: '#555' }}>0920563695</div>
            )}
          </div>
          {showLogo && (
            <img
              src={LOGO_URL}
              alt="شعار"
              style={{
                width: Math.round((isVerySmall ? 8 : isSmall ? 10 : 13) * PX_PER_MM * ZOOM * 0.72),
                height: Math.round((isVerySmall ? 8 : isSmall ? 10 : 13) * PX_PER_MM * ZOOM * 0.72),
                objectFit: 'contain',
                flexShrink: 0,
              }}
            />
          )}
        </div>

        {/* فاصل */}
        <hr style={{ border: 'none', borderTop: '0.8px solid #000', margin: `${pad * 0.25}px 0`, flexShrink: 0 }} />

        {/* 2. رقم المعاملة */}
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: (fontBase - 0.5) * ZOOM * 0.72, color: '#555', lineHeight: 1 }}>رقم المعاملة</div>
          <div style={{
            fontWeight: 900,
            fontSize: fontMd * ZOOM * 0.72,
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
          flexDirection: showBarcode ? 'row' : 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: pad * 0.5,
          flex: 1,
          overflow: 'hidden',
          minHeight: 0,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <QRCode
              value={qrData}
              size={Math.max(20, qrSize)}
              level="H"
              bgColor="#ffffff"
              fgColor="#000000"
              includeMargin={false}
            />
            <span style={{ fontSize: (fontBase - 1) * ZOOM * 0.72, color: '#444', fontWeight: 'bold' }}>QR</span>
          </div>
          {showBarcode && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <svg ref={barcodeRef} />
              <span style={{ fontSize: (fontBase - 1) * ZOOM * 0.72, color: '#444', fontWeight: 'bold' }}>Barcode</span>
            </div>
          )}
        </div>

        {/* فاصل */}
        <hr style={{ border: 'none', borderTop: '0.8px solid #000', margin: `${pad * 0.25}px 0`, flexShrink: 0 }} />

        {/* 4. اسم صاحب المعاملة */}
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontWeight: 900, fontSize: fontMd * ZOOM * 0.72, color: '#000', lineHeight: 1.2 }}>
            {customerName}
          </div>
          <div style={{ fontSize: (fontBase - 0.5) * ZOOM * 0.72, color: '#555' }}>
            {formatDate(new Date())}
          </div>
        </div>
      </div>

      {/* تسمية المقاس */}
      <span style={{ fontSize: 10, color: '#888' }}>{sizeLabel}</span>
    </div>
  );
}

// ── الـ Dialog الرئيسي ────────────────────────────────────────
export function SuccessDialog({
  open,
  onOpenChange,
  customer,
  card,
  transactionId = `TXN-${Date.now()}`,
  delegate = '',
  accountNumber = '',
  iban1 = '',
  iban2 = '',
  accountPhone = '',
  passportNumber = '',
  passportExpiry = '',
  documentsReceived = { passport: false, pin: false, card: false },
  onReceiptDataChange,
}: SuccessDialogProps) {
  // المقاس المختار لكل ملصق (3 ملصقات مستقلة)
  const [size1, setSize1] = useState<ThermalSize>('58x40');
  const [size2, setSize2] = useState<ThermalSize>('58x40');
  const [size3, setSize3] = useState<ThermalSize>('100x75');

  const handlePrintReceipt = (receiptType: 'employee' | 'customer') => {
    if (onReceiptDataChange) {
      onReceiptDataChange({
        type: receiptType,
        transactionId,
        customerName: customer?.name || '',
        customerIdNumber: customer?.idNumber,
        customerPhone: customer?.phone,
        cardNumber: card?.cardNumber,
        cardExpiry: card?.expiryDate
          ? (typeof card.expiryDate === 'string' && String(card.expiryDate).match(/^\d{1,2}\/\d{2,4}$/)
              ? card.expiryDate
              : formatDate(card.expiryDate))
          : undefined,
        cardCVV: card?.cvv,
        accountNumber,
        iban1,
        iban2,
        accountPhone,
        passportNumber,
        passportExpiry,
        purchasePrice: card?.purchasePrice,
        delegate,
        delegateShare: card?.delegateShare,
        documentsReceived,
      });
    }
    requestAnimationFrame(() => { window.print(); });
  };

  const handlePrintThermal = (size: ThermalSize) => {
    const sizeOpt = THERMAL_SIZES.find(s => s.value === size)!;
    openThermalPrintWindow({
      transactionId,
      customerName: customer?.name || '',
      cardNumber: card?.cardNumber,
      date: formatDate(new Date()),
    }, sizeOpt);
  };

  const renderDocuments = () => {
    const docs = [];
    if (documentsReceived.passport) docs.push('✅ جواز');
    if (documentsReceived.pin) docs.push('✅ شفرة');
    if (documentsReceived.card) docs.push('✅ بطاقة');
    return docs.join(' | ') || 'لم يتم استلام أي مستندات';
  };

  const expiryDisplay = card?.expiryDate
    ? (typeof card.expiryDate === 'string' && String(card.expiryDate).match(/^\d{1,2}\/\d{2,4}$/)
        ? card.expiryDate
        : formatDate(card.expiryDate))
    : '-';

  // مكوّن اختيار المقاس المصغّر
  const SizeSelector = ({ value, onChange }: { value: ThermalSize; onChange: (v: ThermalSize) => void }) => (
    <div className="space-y-1">
      {['طابعات POS', 'ملصقات مستطيلة', 'ملصقات ضيقة', 'ملصقات صغيرة'].map(cat => (
        <div key={cat}>
          <p className="text-[9px] text-gray-400 font-semibold mb-0.5 border-b">{cat}</p>
          <div className="grid grid-cols-3 gap-0.5">
            {THERMAL_SIZES.filter(s => s.category === cat).map(s => (
              <button
                key={s.value}
                onClick={() => onChange(s.value)}
                className={`text-[9px] py-0.5 px-1 rounded border font-mono transition-all ${
                  value === s.value
                    ? 'bg-orange-600 text-white border-orange-600 font-bold'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-orange-400'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">✅ تم إضافة الزبون بنجاح</DialogTitle>
        </DialogHeader>

        {/* رأس مشترك */}
        <div className="text-center py-3 border-b-4 border-amber-400">
          <img src={LOGO_URL} alt="الشركة" className="h-14 mx-auto mb-2" />
          <h2 className="text-xl font-bold text-slate-800">{customer?.name || 'الزبون'}</h2>
          <p className="text-base font-semibold text-amber-700">رقم المعاملة: {transactionId}</p>
        </div>

        {/* الإيصالات الثلاثة جنباً إلى جنب */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4 px-2">

          {/* ══ الإيصال 1: إيصال الموظف (داخلي) ══ */}
          <div className="border-4 border-blue-500 rounded-xl p-4 bg-white flex flex-col gap-3">
            <div className="text-center border-b-2 border-blue-400 pb-2">
              <h3 className="font-bold text-lg text-blue-900">📋 إيصال الموظف</h3>
              <p className="text-xs text-blue-600">(الإيصال الداخلي)</p>
            </div>

            <div className="text-sm space-y-1.5 flex-1">
              <div className="text-center pb-2 border-b border-blue-200">
                <img src={LOGO_URL} alt="الشركة" className="h-10 mx-auto mb-1" />
                <p className="font-bold text-blue-900 text-sm">شركة ليبيا للخدمات المالية</p>
              </div>
              <p><span className="font-bold">الاسم:</span> {customer?.name}</p>
              <p><span className="font-bold">الرقم الوطني:</span> {customer?.idNumber}</p>
              <p><span className="font-bold">رقم الجواز:</span> {passportNumber || '-'}</p>
              <p><span className="font-bold">انتهاء الجواز:</span> {passportExpiry || '-'}</p>
              <div className="border-t border-blue-200 pt-1.5 mt-1.5 space-y-1">
                <p><span className="font-bold">رقم الحساب:</span> {accountNumber}</p>
                {iban1 && <p><span className="font-bold">IBAN (333):</span> {iban1}</p>}
                {iban2 && <p><span className="font-bold">IBAN (555):</span> {iban2}</p>}
                <p><span className="font-bold">هاتف الحساب:</span> {accountPhone}</p>
                <p><span className="font-bold">هاتف الزبون:</span> {customer?.phone}</p>
              </div>
              <div className="border-t border-blue-200 pt-1.5 mt-1.5 space-y-1">
                <p><span className="font-bold">رقم البطاقة:</span> {card?.cardNumber}</p>
                <p><span className="font-bold">الصلاحية:</span> {expiryDisplay}</p>
                <p><span className="font-bold">الرمز السري:</span> {card?.cvv}</p>
              </div>
              <div className="border-t border-blue-200 pt-1.5 mt-1.5 space-y-1">
                <p><span className="font-bold">ثمن الشراء:</span> {card?.purchasePrice} د.ل</p>
                <p><span className="font-bold">المندوب:</span> {delegate}</p>
                <p><span className="font-bold">حصة المندوب:</span> {card?.delegateShare} د.ل</p>
                <p className="font-bold bg-yellow-100 p-1 rounded border border-yellow-400 text-sm">
                  الإجمالي: {((card?.purchasePrice || 0) + (card?.delegateShare || 0)).toFixed(2)} د.ل
                </p>
              </div>
              <div className="border-t border-blue-200 pt-1.5 mt-1.5">
                <p><span className="font-bold">المستندات:</span> {renderDocuments()}</p>
              </div>
              <div className="text-center text-xs text-blue-600 border-t border-blue-200 pt-1.5 mt-1.5">
                {formatDateTime(new Date())}
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => handlePrintReceipt('employee')}
              className="w-full gap-2 bg-blue-600 hover:bg-blue-700 font-semibold"
            >
              <Printer className="w-4 h-4" />
              طباعة إيصال الموظف
            </Button>
          </div>

          {/* ══ الإيصال 2: إيصال الزبون ══ */}
          <div className="border-4 border-green-500 rounded-xl p-4 bg-white flex flex-col gap-3">
            <div className="text-center border-b-2 border-green-400 pb-2">
              <h3 className="font-bold text-lg text-green-900">🤝 إيصال الزبون</h3>
            </div>

            <div className="text-sm space-y-1.5 flex-1">
              <div className="text-center pb-2 border-b border-green-200">
                <img src={LOGO_URL} alt="الشركة" className="h-10 mx-auto mb-1" />
                <p className="font-bold text-green-900 text-sm">شركة ليبيا للخدمات المالية</p>
              </div>
              <p><span className="font-bold">الاسم:</span> {customer?.name}</p>
              <p><span className="font-bold">الرقم الوطني:</span> {customer?.idNumber}</p>
              <p><span className="font-bold">رقم الجواز:</span> {passportNumber || '-'}</p>
              <p><span className="font-bold">انتهاء الجواز:</span> {passportExpiry || '-'}</p>
              <div className="border-t border-green-200 pt-1.5 mt-1.5 space-y-1">
                <p><span className="font-bold">رقم الحساب:</span> {accountNumber}</p>
                {iban1 && <p><span className="font-bold">IBAN (333):</span> {iban1}</p>}
                {iban2 && <p><span className="font-bold">IBAN (555):</span> {iban2}</p>}
                <p><span className="font-bold">هاتف الحساب:</span> {accountPhone}</p>
                <p><span className="font-bold">هاتف الزبون:</span> {customer?.phone}</p>
              </div>
              <div className="border-t border-green-200 pt-1.5 mt-1.5 space-y-1">
                <p><span className="font-bold">رقم البطاقة:</span> ****{card?.cardNumber?.slice(-4)}</p>
                <p><span className="font-bold">الصلاحية:</span> {expiryDisplay}</p>
              </div>
              <div className="border-t border-green-200 pt-1.5 mt-1.5 space-y-1">
                <p><span className="font-bold">ثمن الشراء:</span> {card?.purchasePrice} د.ل</p>
              </div>
              <div className="border-t border-green-200 pt-1.5 mt-1.5">
                <p><span className="font-bold">المستندات:</span> {renderDocuments()}</p>
              </div>
              <div className="text-center text-xs text-green-600 border-t border-green-200 pt-1.5 mt-1.5">
                {formatDateTime(new Date())}
              </div>
              <div className="text-center border-t border-green-200 pt-1.5 mt-1.5">
                <p className="font-bold text-green-900">شكراً لتعاملك معنا</p>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => handlePrintReceipt('customer')}
              className="w-full gap-2 bg-green-600 hover:bg-green-700 font-semibold"
            >
              <Printer className="w-4 h-4" />
              طباعة إيصال الزبون
            </Button>
          </div>

          {/* ══ الإيصال 3: الملصق الحراري ══ */}
          <div className="border-4 border-orange-500 rounded-xl p-4 bg-white flex flex-col gap-3">
            <div className="text-center border-b-2 border-orange-400 pb-2">
              <h3 className="font-bold text-lg text-orange-900">🏷️ الملصق الحراري</h3>
              <p className="text-xs text-orange-600">(معاينة + طباعة)</p>
            </div>

            {/* معاينة الملصق الحقيقية */}
            <div className="flex justify-center overflow-auto bg-orange-50 rounded-lg p-2 border border-orange-200">
              <ThermalLabelCard
                transactionId={transactionId}
                customerName={customer?.name || ''}
                cardNumber={card?.cardNumber}
                sizeLabel={THERMAL_SIZES.find(s => s.value === size3)?.label || ''}
                widthMm={THERMAL_SIZES.find(s => s.value === size3)?.width || 100}
                heightMm={THERMAL_SIZES.find(s => s.value === size3)?.height || 75}
              />
            </div>

            {/* اختيار المقاس */}
            <div className="bg-orange-50 rounded-lg p-2 border border-orange-200">
              <p className="text-[10px] font-bold text-orange-800 text-center mb-1">اختر مقاس الملصق</p>
              <SizeSelector value={size3} onChange={setSize3} />
            </div>

            <Button
              size="sm"
              onClick={() => handlePrintThermal(size3)}
              className="w-full gap-2 bg-orange-600 hover:bg-orange-700 font-semibold"
            >
              <Printer className="w-4 h-4" />
              طباعة الملصق ({THERMAL_SIZES.find(s => s.value === size3)?.label})
            </Button>
          </div>
        </div>

        {/* زر الإغلاق */}
        <div className="flex justify-end gap-2 pt-3 border-t-2">
          <Button onClick={() => onOpenChange(false)} variant="outline" className="gap-2">
            <X className="w-4 h-4" />
            إغلاق
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
