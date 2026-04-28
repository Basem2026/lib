import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { Printer, Download } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface BarcodePrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionNumber: string;
  cardNumber: string;
  customerName: string;
  onBarcodeDataChange?: (data: any) => void;
}

export function BarcodePrintDialog({
  open,
  onOpenChange,
  transactionNumber,
  cardNumber,
  customerName,
  onBarcodeDataChange,
}: BarcodePrintDialogProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);
  const barcodeValue = `${transactionNumber}-${cardNumber}`;

  useEffect(() => {
    if (open && barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, barcodeValue, {
          format: 'CODE128',
          width: 2,
          height: 80,
          displayValue: true,
          fontSize: 14,
          margin: 10,
        });
      } catch (error) {
        console.error('Error generating barcode:', error);
      }
    }
  }, [open, barcodeValue]);

  const handlePrint = () => {
    // تحديث بيانات الباركود للطباعة
    if (onBarcodeDataChange) {
      onBarcodeDataChange({
        type: 'barcode',
        transactionId: transactionNumber,
        customerName,
        cardNumber,
      });
    }

    // الطباعة بعد تحديث DOM
    requestAnimationFrame(() => {
      window.print();
    });
  };

  // دالة قديمة للتوافق (سيتم حذفها لاحقاً)
  const handlePrint_OLD = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>طباعة باركود - ${transactionNumber}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 20px;
            direction: rtl;
          }
          .barcode-card {
            max-width: 400px;
            margin: 0 auto;
            border: 2px solid #1E2E3D;
            border-radius: 12px;
            padding: 24px;
            background: white;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 16px;
            border-bottom: 2px solid #C9A34D;
          }
          .company-name {
            font-size: 20px;
            font-weight: bold;
            color: #1E2E3D;
            margin-bottom: 4px;
          }
          .subtitle {
            font-size: 12px;
            color: #6E7C87;
          }
          .info-section {
            margin: 16px 0;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #E5E7EB;
          }
          .info-label {
            font-weight: 600;
            color: #1E2E3D;
          }
          .info-value {
            color: #6E7C87;
          }
          .barcode-container {
            text-align: center;
            margin: 24px 0;
            padding: 16px;
            background: #F9FBFD;
            border-radius: 8px;
          }
          .barcode-container svg {
            max-width: 100%;
            height: auto;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            padding-top: 16px;
            border-top: 2px solid #C9A34D;
            font-size: 11px;
            color: #6E7C87;
          }
          @media print {
            body {
              padding: 0;
            }
            .barcode-card {
              border: none;
              box-shadow: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="barcode-card">
          <div class="header">
            <div class="company-name">شركة ليبيا للخدمات المالية</div>
            <div class="subtitle">بطاقة معلومات الزبون</div>
          </div>
          
          <div class="info-section">
            <div class="info-row">
              <span class="info-label">رقم المعاملة:</span>
              <span class="info-value">${transactionNumber}</span>
            </div>
            <div class="info-row">
              <span class="info-label">اسم الزبون:</span>
              <span class="info-value">${customerName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">رقم البطاقة:</span>
              <span class="info-value">${cardNumber}</span>
            </div>
          </div>

          <div class="barcode-container">
            ${barcodeRef.current?.outerHTML || ''}
          </div>

          <div class="footer">
            تاريخ الطباعة: ${formatDate(new Date())} | صبراته - ليبيا | 📞 0920563695
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const handleDownload = () => {
    if (!barcodeRef.current) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const svgData = new XMLSerializer().serializeToString(barcodeRef.current);
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const link = document.createElement('a');
        link.download = `barcode-${transactionNumber}.png`;
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(url);
      });
    };

    img.src = url;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-right">طباعة باركود الزبون</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* معلومات الزبون */}
          <div className="bg-slate-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-semibold">رقم المعاملة:</span>
              <span className="text-slate-600">{transactionNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-semibold">اسم الزبون:</span>
              <span className="text-slate-600">{customerName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-semibold">رقم البطاقة:</span>
              <span className="text-slate-600">{cardNumber}</span>
            </div>
          </div>

          {/* الباركود */}
          <div className="bg-white p-4 rounded-lg border-2 border-slate-200 flex justify-center">
            <svg ref={barcodeRef}></svg>
          </div>

          {/* أزرار الإجراءات */}
          <div className="flex gap-2">
            <Button onClick={handlePrint} className="flex-1 gap-2">
              <Printer className="w-4 h-4" />
              طباعة
            </Button>
            <Button onClick={handleDownload} variant="outline" className="flex-1 gap-2">
              <Download className="w-4 h-4" />
              تحميل
            </Button>
          </div>

          <Button onClick={() => onOpenChange(false)} variant="outline" className="w-full">
            إغلاق
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
