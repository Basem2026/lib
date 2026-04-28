import { QRCodeSVG as QRCode } from 'qrcode.react';
import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { formatDate, formatDateTime } from '@/lib/utils';

/**
 * ReceiptPrintView - component مستقل للطباعة
 * يعرض في DOM ثابت خارج الـ Dialog
 * يستخدم @media print للطباعة
 */

export interface ReceiptData {
  type: 'employee' | 'customer' | 'thermal' | 'barcode';
  transactionId: string;
  customerName: string;
  customerIdNumber?: string;
  customerPhone?: string;
  cardNumber?: string;
  cardExpiry?: string;
  cardCVV?: string;
  accountNumber?: string;
  iban1?: string;
  iban2?: string;
  accountPhone?: string;
  passportNumber?: string;
  passportExpiry?: string;
  purchasePrice?: number;
  delegate?: string;
  delegateShare?: number;
  documentsReceived?: { passport: boolean; pin: boolean; card: boolean };
}

interface ReceiptPrintViewProps {
  data: ReceiptData | null;
}

export function ReceiptPrintView({ data }: ReceiptPrintViewProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);

  // توليد الباركود
  useEffect(() => {
    if (data && data.type === 'barcode' && barcodeRef.current && data.cardNumber) {
      try {
        JsBarcode(barcodeRef.current, `${data.transactionId}-${data.cardNumber}`, {
          format: 'CODE128',
          width: 2,
          height: 60,
          displayValue: true,
          fontSize: 14,
          margin: 10,
        });
      } catch (error) {
        console.error('خطأ في توليد الباركود:', error);
      }
    }
  }, [data]);

  if (!data) return null;

  const renderDocuments = () => {
    if (!data.documentsReceived) return 'لم يتم استلام أي مستندات';
    const docs = [];
    if (data.documentsReceived.passport) docs.push('✅ جواز');
    if (data.documentsReceived.pin) docs.push('✅ شفرة');
    if (data.documentsReceived.card) docs.push('✅ بطاقة');
    return docs.join(' | ') || 'لم يتم استلام أي مستندات';
  };

  return (
    <div id="print-area" className="bg-white">
      {/* إيصال الموظف / الإيصال الداخلي */}
      {data.type === 'employee' && (
        <div className="p-6 max-w-[800px] mx-auto">
          <div className="text-center mb-4 pb-4 border-b-3 border-blue-500">
            <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663215657361/bjCunNzkJAZLbySx.png" alt="الشركة" className="h-16 mx-auto mb-2" />
            <h3 className="font-bold text-2xl text-blue-900">📋 إيصال الموظف</h3>
            <p className="text-sm text-blue-700 mt-1">(الإيصال الداخلي)</p>
          </div>

          <div className="text-sm space-y-3">
            {/* بيانات الزبون */}
            <div className="space-y-2">
              <p><span className="font-bold">الاسم:</span> {data.customerName}</p>
              <p><span className="font-bold">الرقم الوطني:</span> {data.customerIdNumber}</p>
              <p><span className="font-bold">رقم الجواز:</span> {data.passportNumber || '-'}</p>
              <p><span className="font-bold">تاريخ انتهاء الجواز:</span> {data.passportExpiry || '-'}</p>
            </div>

            {/* بيانات البنك */}
            <div className="border-t-2 border-blue-300 pt-3 mt-3 space-y-2">
              <p><span className="font-bold">رقم الحساب (333):</span> {data.accountNumber}</p>
              {data.iban1 && <p><span className="font-bold">IBAN (333):</span> {data.iban1}</p>}
              {data.iban2 && <p><span className="font-bold">IBAN (555):</span> {data.iban2}</p>}
              <p><span className="font-bold">الهاتف:</span> {data.accountPhone}</p>
              <p><span className="font-bold">الهاتف الشخصي:</span> {data.customerPhone}</p>
            </div>

            {/* بيانات البطاقة */}
            <div className="border-t-2 border-blue-300 pt-3 mt-3 space-y-2">
              <p><span className="font-bold">رقم البطاقة:</span> {data.cardNumber}</p>
              <p><span className="font-bold">تاريخ الصلاحية:</span> {data.cardExpiry || '-'}</p>
              <p><span className="font-bold">الرمز السري:</span> {data.cardCVV}</p>
            </div>

            {/* بيانات الشراء */}
            <div className="border-t-2 border-blue-300 pt-3 mt-3 space-y-2">
              <p><span className="font-bold">ثمن الشراء:</span> {data.purchasePrice} د.ل</p>
              <p><span className="font-bold">المندوب:</span> {data.delegate}</p>
              <p><span className="font-bold">حصة المندوب:</span> {data.delegateShare} د.ل</p>
              <p className="font-bold text-lg bg-yellow-100 p-2 rounded border-2 border-yellow-400">
                الإجمالي: {((data.purchasePrice || 0) + (data.delegateShare || 0)).toFixed(2)} د.ل
              </p>
            </div>

            {/* المستندات */}
            <div className="border-t-2 border-blue-300 pt-3 mt-3">
              <p><span className="font-bold">المستندات:</span> {renderDocuments()}</p>
            </div>

            {/* التاريخ والوقت */}
            <div className="border-t-2 border-blue-300 pt-3 mt-3 text-center text-xs text-blue-700">
              <p>{formatDateTime(new Date())}</p>
            </div>
          </div>
        </div>
      )}

      {/* إيصال الزبون */}
      {data.type === 'customer' && (
        <div className="p-6 max-w-[800px] mx-auto">
          <div className="text-center mb-4 pb-4 border-b-3 border-green-500">
            <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663215657361/bjCunNzkJAZLbySx.png" alt="الشركة" className="h-16 mx-auto mb-2" />
            <h3 className="font-bold text-2xl text-green-900">🎫 إيصال الزبون</h3>
            <p className="text-sm text-green-700 mt-1">(نسخة الزبون)</p>
          </div>

          <div className="text-sm space-y-3">
            {/* بيانات الزبون */}
            <div className="space-y-2">
              <p><span className="font-bold">الاسم:</span> {data.customerName}</p>
              <p><span className="font-bold">رقم المعاملة:</span> {data.transactionId}</p>
              <p><span className="font-bold">الرقم الوطني:</span> {data.customerIdNumber || '-'}</p>
              <p><span className="font-bold">رقم الجواز:</span> {data.passportNumber || '-'}</p>
            </div>

            {/* بيانات البنك */}
            {(data.accountNumber || data.iban1 || data.iban2 || data.accountPhone) && (
              <div className="border-t-2 border-green-300 pt-3 mt-3 space-y-2">
                {data.accountNumber && <p><span className="font-bold">رقم الحساب:</span> {data.accountNumber}</p>}
                {data.iban1 && <p><span className="font-bold">IBAN (333):</span> {data.iban1}</p>}
                {data.iban2 && <p><span className="font-bold">IBAN (555):</span> {data.iban2}</p>}
                {data.accountPhone && <p><span className="font-bold">هاتف الحساب:</span> {data.accountPhone}</p>}
              </div>
            )}

            {/* بيانات البطاقة */}
            <div className="border-t-2 border-green-300 pt-3 mt-3 space-y-2">
              <p><span className="font-bold">رقم البطاقة:</span> {data.cardNumber}</p>
              <p><span className="font-bold">تاريخ الصلاحية:</span> {data.cardExpiry || '-'}</p>
              {data.cardCVV && <p><span className="font-bold">الرمز السري:</span> {data.cardCVV}</p>}
            </div>

            {/* بيانات الشراء */}
            {(data.purchasePrice || data.delegate || data.delegateShare) && (
              <div className="border-t-2 border-green-300 pt-3 mt-3 space-y-2">
                {data.purchasePrice && <p><span className="font-bold">ثمن الشراء:</span> {data.purchasePrice} د.ل</p>}
                {data.delegate && <p><span className="font-bold">المندوب:</span> {data.delegate}</p>}
                {data.delegateShare && <p><span className="font-bold">حصة المندوب:</span> {data.delegateShare} د.ل</p>}
              </div>
            )}

            {/* QR Code */}
            <div className="border-t-2 border-green-300 pt-3 mt-3 text-center">
              <QRCode
                value={`TXN:${data.transactionId}|CARD:${data.cardNumber}|NAME:${data.customerName}`}
                size={120}
                level="M"
              />
              <p className="text-xs text-green-700 mt-2">امسح الكود للتحقق</p>
            </div>

            {/* التاريخ والوقت */}
            <div className="border-t-2 border-green-300 pt-3 mt-3 text-center text-xs text-green-700">
              <p>{formatDateTime(new Date())}</p>
              <p className="mt-2">📞 0920563695 | صبراته - ليبيا</p>
            </div>
          </div>
        </div>
      )}

      {/* الملصق الحراري */}
      {data.type === 'thermal' && (
        <div className="p-4 max-w-[400px] mx-auto">
          <div className="text-center mb-3">
            <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663215657361/bjCunNzkJAZLbySx.png" alt="الشركة" className="h-12 mx-auto mb-2" />
            <h3 className="font-bold text-lg">ملصق حراري</h3>
          </div>

          <div className="text-xs space-y-2">
            <p><span className="font-bold">الاسم:</span> {data.customerName}</p>
            <p><span className="font-bold">رقم المعاملة:</span> {data.transactionId}</p>
            <p><span className="font-bold">رقم البطاقة:</span> {data.cardNumber}</p>

            {/* QR Code */}
            <div className="text-center my-2">
              <QRCode
                value={`TXN:${data.transactionId}|CARD:${data.cardNumber}|NAME:${data.customerName}`}
                size={80}
                level="M"
              />
            </div>

            <p className="text-center text-xs">📞 0920563695</p>
          </div>
        </div>
      )}

      {/* باركود الزبون */}
      {data.type === 'barcode' && (
        <div className="p-6 max-w-[800px] mx-auto">
          <div className="text-center mb-4">
            <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663215657361/bjCunNzkJAZLbySx.png" alt="الشركة" className="h-16 mx-auto mb-2" />
            <h3 className="font-bold text-2xl">باركود الزبون</h3>
          </div>

          <div className="text-center space-y-4">
            <div>
              <p className="font-bold text-lg mb-2">{data.customerName}</p>
              <p className="text-sm text-gray-600">رقم المعاملة: {data.transactionId}</p>
              <p className="text-sm text-gray-600">رقم البطاقة: {data.cardNumber}</p>
            </div>

            {/* Barcode */}
            <div className="flex justify-center my-4">
              <svg ref={barcodeRef}></svg>
            </div>

            <div className="text-xs text-gray-500">
              <p>{formatDate(new Date())}</p>
              <p>📞 0920563695 | صبراته - ليبيا</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
