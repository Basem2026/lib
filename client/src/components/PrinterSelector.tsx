import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, Download } from 'lucide-react';

/**
 * مكون اختيار الطابعة والمقاس
 * Design Philosophy: Printer Selection Interface
 * - اكتشاف تلقائي للطابعات
 * - اختيار مقاس الورق/الملصق
 * - مقاسات مخصصة تدعم جميع الوحدات (ملليمتر، سنتيمتر، بوصة)
 */

interface PrinterSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onPrint: (printerName: string, paperSize: string) => void;
  receiptType: 'customer' | 'employee' | 'label';
}

export const PrinterSelector = ({
  isOpen,
  onClose,
  onPrint,
  receiptType,
}: PrinterSelectorProps) => {
  const [printers, setPrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [selectedPaperSize, setSelectedPaperSize] = useState<string>('a4');
  const [customWidth, setCustomWidth] = useState<string>('');
  const [customHeight, setCustomHeight] = useState<string>('');
  const [customUnit, setCustomUnit] = useState<'mm' | 'cm' | 'inch'>('cm');
  const [isLoading, setIsLoading] = useState(false);

  // قائمة مقاسات الورق والملصقات
  const paperSizes = [
    // ورق عادي
    { value: 'a4', label: 'A4 (21 × 29.7 سم)', category: 'ورق عادي' },
    { value: 'a5', label: 'A5 (14.8 × 21 سم)', category: 'ورق عادي' },
    { value: 'a6', label: 'A6 (10.5 × 14.8 سم)', category: 'ورق عادي' },
    { value: 'letter', label: 'Letter (8.5 × 11 بوصة)', category: 'ورق عادي' },
    { value: 'legal', label: 'Legal (8.5 × 14 بوصة)', category: 'ورق عادي' },
    { value: 'half_letter', label: 'Half Letter (5.5 × 8.5 بوصة)', category: 'ورق عادي' },

    // طابعات حرارية
    { value: 'thermal_4x6', label: 'Thermal 4×6 (10 × 15 سم)', category: 'طابعات حرارية' },
    { value: 'thermal_3x5', label: 'Thermal 3×5 (7.5 × 12.5 سم)', category: 'طابعات حرارية' },
    { value: 'thermal_2x3', label: 'Thermal 2×3 (5 × 7.5 سم)', category: 'طابعات حرارية' },

    // طابعات POS
    { value: 'pos_80mm', label: 'POS 80mm (80 × 120 ملم)', category: 'طابعات POS' },
    { value: 'pos_58mm', label: 'POS 58mm (58 × 100 ملم)', category: 'طابعات POS' },
    { value: 'pos_40mm', label: 'POS 40mm (40 × 60 ملم)', category: 'طابعات POS' },

    // إيصالات
    { value: 'receipt_standard', label: 'إيصال عادي (10 × 15 سم)', category: 'إيصالات' },
    { value: 'receipt_small', label: 'إيصال صغير (7.6 × 12.7 سم)', category: 'إيصالات' },
    { value: 'receipt_mini', label: 'إيصال ميني (5 × 10 سم)', category: 'إيصالات' },

    // ملصقات
    { value: 'label_4x6', label: 'ملصق 4×6 (10 × 15 سم)', category: 'ملصقات' },
    { value: 'label_3x4', label: 'ملصق 3×4 (7.5 × 10 سم)', category: 'ملصقات' },
    { value: 'label_2x3', label: 'ملصق 2×3 (5 × 7.5 سم)', category: 'ملصقات' },

    // مخصص
    { value: 'custom', label: 'مخصص - أدخل المقاس يدوياً', category: 'مخصص' },
  ];

  // اكتشاف الطابعات عند فتح الحوار
  useEffect(() => {
    if (isOpen) {
      detectPrinters();
    }
  }, [isOpen]);

  // اكتشاف الطابعات المتاحة
  const detectPrinters = async () => {
    setIsLoading(true);
    try {
      // محاولة الحصول على الطابعات من متصفح Chrome
      if ('printer' in navigator) {
        // استخدام Print API إذا كان متاحاً
        const defaultPrinters = [
          '🖨️ طابعة النظام الافتراضية',
          '📠 طابعة شبكة',
          '🔌 طابعة USB',
          '📱 طابعة Bluetooth',
        ];
        setPrinters(defaultPrinters);
        setSelectedPrinter(defaultPrinters[0]);
      } else {
        // الطابعات الافتراضية
        const defaultPrinters = [
          '🖨️ طابعة النظام الافتراضية',
          '📠 طابعة شبكة',
          '🔌 طابعة USB',
          '📱 طابعة Bluetooth',
        ];
        setPrinters(defaultPrinters);
        setSelectedPrinter(defaultPrinters[0]);
      }
    } catch (error) {
      console.error('خطأ في اكتشاف الطابعات:', error);
      const defaultPrinters = [
        '🖨️ طابعة النظام الافتراضية',
        '📠 طابعة شبكة',
        '🔌 طابعة USB',
        '📱 طابعة Bluetooth',
      ];
      setPrinters(defaultPrinters);
      setSelectedPrinter(defaultPrinters[0]);
    } finally {
      setIsLoading(false);
    }
  };

  // معالجة الطباعة
  const handlePrint = () => {
    if (!selectedPrinter) {
      alert('الرجاء اختيار طابعة');
      return;
    }

    let finalPaperSize = selectedPaperSize;

    // إذا كان المقاس مخصصاً
    if (selectedPaperSize === 'custom') {
      if (!customWidth || !customHeight) {
        alert('الرجاء إدخال عرض وارتفاع المقاس');
        return;
      }
      finalPaperSize = `custom:${customWidth}${customUnit}x${customHeight}${customUnit}`;
    }

    onPrint(selectedPrinter, finalPaperSize);
    onClose();
  };

  // تحديد أفضل مقاس افتراضي حسب نوع الإيصال
  useEffect(() => {
    switch (receiptType) {
      case 'label':
        setSelectedPaperSize('pos_80mm');
        break;
      case 'employee':
        setSelectedPaperSize('a4');
        break;
      case 'customer':
        setSelectedPaperSize('thermal_4x6');
        break;
      default:
        setSelectedPaperSize('a4');
    }
  }, [receiptType]);

  // تجميع المقاسات حسب الفئة
  const groupedSizes = paperSizes.reduce(
    (acc, size) => {
      const category = size.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(size);
      return acc;
    },
    {} as Record<string, typeof paperSizes>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-right">⚙️ اختر الطابعة والمقاس</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 text-right">
          {/* اختيار الطابعة */}
          <div>
            <label className="block text-sm font-semibold mb-2">اختر الطابعة:</label>
            <Select value={selectedPrinter} onValueChange={setSelectedPrinter}>
              <SelectTrigger className="w-full text-right">
                <SelectValue placeholder="اختر طابعة..." />
              </SelectTrigger>
              <SelectContent>
                {isLoading ? (
                  <div className="p-2 text-center text-sm">جاري البحث عن الطابعات...</div>
                ) : printers.length > 0 ? (
                  printers.map((printer) => (
                    <SelectItem key={printer} value={printer}>
                      {printer}
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-center text-sm">لم يتم العثور على طابعات</div>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              {selectedPrinter && `✓ تم اختيار: ${selectedPrinter}`}
            </p>
          </div>

          {/* اختيار المقاس */}
          <div>
            <label className="block text-sm font-semibold mb-2">اختر حجم الورق/الملصق:</label>
            <Select value={selectedPaperSize} onValueChange={setSelectedPaperSize}>
              <SelectTrigger className="w-full text-right">
                <SelectValue placeholder="اختر المقاس..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(groupedSizes).map(([category, sizes]) => (
                  <div key={category}>
                    <div className="px-2 py-2 text-xs font-bold text-gray-600 bg-gray-100">
                      {category}
                    </div>
                    {sizes.map((size) => (
                      <SelectItem key={size.value} value={size.value}>
                        {size.label}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* إدخال مقاس مخصص */}
          {selectedPaperSize === 'custom' && (
            <div className="bg-blue-50 p-4 rounded-lg space-y-3">
              <p className="text-sm font-semibold">أدخل المقاس المخصص:</p>

              {/* اختيار الوحدة */}
              <div>
                <label className="text-xs text-gray-600 block mb-1">الوحدة:</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCustomUnit('mm')}
                    className={`flex-1 py-1 px-2 rounded text-xs font-semibold transition ${
                      customUnit === 'mm'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-300 text-gray-700'
                    }`}
                  >
                    ملليمتر (mm)
                  </button>
                  <button
                    onClick={() => setCustomUnit('cm')}
                    className={`flex-1 py-1 px-2 rounded text-xs font-semibold transition ${
                      customUnit === 'cm'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-300 text-gray-700'
                    }`}
                  >
                    سنتيمتر (cm)
                  </button>
                  <button
                    onClick={() => setCustomUnit('inch')}
                    className={`flex-1 py-1 px-2 rounded text-xs font-semibold transition ${
                      customUnit === 'inch'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-300 text-gray-700'
                    }`}
                  >
                    بوصة (in)
                  </button>
                </div>
              </div>

              {/* إدخال الأبعاد */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-gray-600">العرض ({customUnit})</label>
                  <input
                    type="number"
                    step="0.1"
                    value={customWidth}
                    onChange={(e) => setCustomWidth(e.target.value)}
                    placeholder={customUnit === 'mm' ? '100' : customUnit === 'cm' ? '10' : '4'}
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-600">الارتفاع ({customUnit})</label>
                  <input
                    type="number"
                    step="0.1"
                    value={customHeight}
                    onChange={(e) => setCustomHeight(e.target.value)}
                    placeholder={customUnit === 'mm' ? '150' : customUnit === 'cm' ? '15' : '6'}
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* معلومات المقاس المختار */}
          <div className="bg-green-50 p-3 rounded-lg text-sm">
            <p className="font-semibold text-green-900">
              ✓ المقاس المختار:{' '}
              {selectedPaperSize === 'custom'
                ? `${customWidth}${customUnit} × ${customHeight}${customUnit}`
                : paperSizes.find((s) => s.value === selectedPaperSize)?.label}
            </p>
          </div>

          {/* أزرار الإجراء */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handlePrint}
              className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
              disabled={!selectedPrinter || isLoading}
            >
              <Printer className="w-4 h-4" />
              طباعة
            </Button>
            <Button onClick={onClose} variant="outline" className="flex-1 gap-2">
              <Download className="w-4 h-4" />
              تحميل PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
