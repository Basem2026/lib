import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DailyOperation } from '@/types/operations';
import { toast } from 'sonner';
import { useLogs } from '@/contexts/LogsContext';

type OperationType = 'card_withdrawal' | 'transfer' | 'money_exchange' | 'dollar_buy' | 'dollar_sell' | 'dollar_card_withdrawal' | 'expenses' | 'salaries';

interface DynamicOperationFormProps {
  onSubmit: (operation: DailyOperation) => void;
  onCancel: () => void;
  userName: string;
}

/**
 * نموذج ديناميكي للعمليات
 * Dynamic Form - يتغير حسب نوع العملية المختار
 * - حقول مختلفة لكل نوع عملية
 * - حسابات تلقائية (الربح، المسلم، السعر المرجعي)
 * - Validation ديناميكي
 * - تخزين ذكي (الحقول غير المستخدمة = 0)
 */

export default function DynamicOperationForm({ onSubmit, onCancel, userName }: DynamicOperationFormProps) {
  const { addAuditTrail } = useLogs();
  const [operationType, setOperationType] = useState<OperationType>('card_withdrawal');
  const [formData, setFormData] = useState({
    operationName: '',
    receivedLYD: 0,
    receivedUSD: 0,
    percentage: 0,
    machinePercentage: 0,
    companyPercentage: 0,
    referencePrice: 0,
    bankAccount: '',
    notes: '',
    transferType: 'from', // نحوّل منه / نستلم عليه
    serviceType: '', // نوع الخدمة في صيرفة الأمان
    marketPrice: 0, // سعر السوق لسحب بطاقات الدولار
    laterSalePrice: 0, // سعر بيع لاحق
  });

  const [calculatedValues, setCalculatedValues] = useState({
    totalPercentage: 0,
    givenLYD: 0,
    givenUSD: 0,
    profit: 0,
    salePrice: 0,
  });

  // حساب القيم تلقائياً عند تغيير البيانات
  useEffect(() => {
    calculateValues();
  }, [operationType, formData]);

  const calculateValues = () => {
    let calculated = {
      totalPercentage: 0,
      givenLYD: 0,
      givenUSD: 0,
      profit: 0,
      salePrice: 0,
    };

    switch (operationType) {
      case 'card_withdrawal':
        // سحب بطاقة: المسلّم = المستلم × (1 − النسبة)
        calculated.givenLYD = formData.receivedLYD * (1 - (formData.percentage || 0) / 100);
        calculated.profit = formData.receivedLYD - calculated.givenLYD;
        break;

      case 'transfer':
        // تحويلات: نفس المنطق
        calculated.givenLYD = formData.receivedLYD * (1 - (formData.percentage || 0) / 100);
        calculated.profit = formData.receivedLYD - calculated.givenLYD;
        break;

      case 'money_exchange':
        // صيرفة الأمان: نفس المنطق
        calculated.givenLYD = formData.receivedLYD * (1 - (formData.percentage || 0) / 100);
        calculated.profit = formData.receivedLYD - calculated.givenLYD;
        break;

      case 'dollar_buy':
        // شراء دولار: السعر المرجعي = دينار ÷ دولار، الربح = 0
        if (formData.receivedUSD > 0) {
          calculated.salePrice = formData.receivedLYD / formData.receivedUSD;
        }
        calculated.profit = 0;
        break;

      case 'dollar_sell':
        // بيع دولار: سعر البيع = دينار ÷ دولار، الربح = (سعر البيع − السعر المرجعي) × كمية الدولار
        if (formData.receivedUSD > 0) {
          calculated.salePrice = formData.receivedLYD / formData.receivedUSD;
          calculated.profit = (calculated.salePrice - (formData.referencePrice || 0)) * formData.receivedUSD;
        }
        break;

      case 'dollar_card_withdrawal':
        // سحب بطاقات دولار: النسبة الإجمالية = ماكينة + شركة
        calculated.totalPercentage = (formData.machinePercentage || 0) + (formData.companyPercentage || 0);
        // الربح = (سعر السوق − النسبة الإجمالية) × كمية الدولار
        calculated.profit = (formData.marketPrice - calculated.totalPercentage) * formData.receivedUSD;
        break;

      case 'expenses':
      case 'salaries':
        // المصاريف والرواتب: الربح = 0
        calculated.profit = 0;
        break;
    }

    setCalculatedValues(calculated);
  };

  const validateForm = (): boolean => {
    if (!formData.operationName.trim()) {
      toast.error('الرجاء إدخال اسم العملية');
      return false;
    }

    switch (operationType) {
      case 'card_withdrawal':
      case 'transfer':
      case 'money_exchange':
        if (formData.receivedLYD <= 0) {
          toast.error('الرجاء إدخال قيمة مستلمة صحيحة');
          return false;
        }
        break;

      case 'dollar_buy':
      case 'dollar_sell':
        if (formData.receivedLYD <= 0 || formData.receivedUSD <= 0) {
          toast.error('الرجاء إدخال القيم المستلمة بالدينار والدولار');
          return false;
        }
        if (operationType === 'dollar_sell' && !formData.referencePrice) {
          toast.error('الرجاء إدخال السعر المرجعي');
          return false;
        }
        break;

      case 'dollar_card_withdrawal':
        if (formData.receivedUSD <= 0) {
          toast.error('الرجاء إدخال قيمة الدولار المسحوبة');
          return false;
        }
        if (formData.marketPrice <= 0) {
          toast.error('الرجاء إدخال سعر السوق');
          return false;
        }
        break;

      case 'expenses':
      case 'salaries':
        if (formData.receivedLYD <= 0) {
          toast.error('الرجاء إدخال المبلغ');
          return false;
        }
        break;
    }

    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const operationNumber = String(Math.floor(Math.random() * 10000)).padStart(4, '0');

    // حفظ ذكي: الحقول غير المستخدمة = 0
    const operation: DailyOperation = {
      id: Date.now().toString(),
      operationNumber,
      date: new Date(),
      operationName: formData.operationName,
      operationType: operationType as any,
      
      // القيم المستلمة
      receivedLYD: formData.receivedLYD || 0,
      receivedUSD: formData.receivedUSD || 0,
      
      // النسب
      percentage: formData.percentage || 0,
      machinePercentage: formData.machinePercentage || 0,
      companyPercentage: formData.companyPercentage || 0,
      totalPercentage: calculatedValues.totalPercentage || 0,
      
      // القيم المسلمة
      givenLYD: calculatedValues.givenLYD || 0,
      givenUSD: calculatedValues.givenUSD || 0,
      
      // الربح والسعر
      profit: calculatedValues.profit || 0,
      referencePrice: formData.referencePrice || calculatedValues.salePrice || 0,
      
      // طريقة الدفع
      paymentMethod: 'cash' as const, // قيمة افتراضية (سيتم تحديثها لاحقاً)
      bankAccount: formData.bankAccount || '',
      
      // معلومات إضافية
      description: formData.operationName,
      status: 'completed',
      processedBy: userName,
      timestamp: new Date(),
      updatedAt: new Date(),
    };

    // تسجيل العملية في Logs
    addAuditTrail({
      action: 'add_operation',
      entityType: 'operation',
      entityId: operation.id,
      userId: 'current_user',
      userName: userName,
      details: {
        after: {
          operationType: operationType,
          operationName: formData.operationName,
          receivedLYD: formData.receivedLYD,
          profit: calculatedValues.profit,
        },
        description: `تم إضافة عملية جديدة: ${formData.operationName}`,
      },
      status: 'success',
    });

    onSubmit(operation);
  };

  // حقول مشتركة
  const commonFields = (
    <>
      <div>
        <Label className="text-right block mb-2">اسم العملية</Label>
        <Input
          placeholder="أدخل اسم العملية"
          value={formData.operationName}
          onChange={(e) => setFormData({ ...formData, operationName: e.target.value })}
        />
      </div>
      <div>
        <Label className="text-right block mb-2">الحساب البنكي</Label>
        <Input
          placeholder="اختر الحساب البنكي"
          value={formData.bankAccount}
          onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
        />
      </div>
    </>
  );

  return (
    <Card className="w-full">
      <CardHeader className="bg-blue-50 border-b-2 border-blue-200">
        <CardTitle>إضافة عملية جديدة - نموذج ديناميكي</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {/* اختيار نوع العملية */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
          <Label className="text-right block mb-2 font-bold text-lg">نوع العملية</Label>
          <Select value={operationType} onValueChange={(value: any) => setOperationType(value)}>
            <SelectTrigger className="text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="card_withdrawal">سحب بطاقة / LYPay / OnePay / إيفاء / رسائل</SelectItem>
              <SelectItem value="transfer">تحويلات / إيداعات</SelectItem>
              <SelectItem value="money_exchange">صيرفة الأمان</SelectItem>
              <SelectItem value="dollar_buy">شراء دولار / USDT</SelectItem>
              <SelectItem value="dollar_sell">بيع دولار / USDT</SelectItem>
              <SelectItem value="dollar_card_withdrawal">سحب بطاقات الدولار</SelectItem>
              <SelectItem value="expenses">مصاريف</SelectItem>
              <SelectItem value="salaries">رواتب</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* حقول ديناميكية حسب نوع العملية */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {/* سحب بطاقة / تحويلات / صيرفة */}
          {['card_withdrawal', 'transfer', 'money_exchange'].includes(operationType) && (
            <>
              <div>
                <Label className="text-right block mb-2">القيمة المستلمة (دينار)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={formData.receivedLYD || ''}
                  onChange={(e) => setFormData({ ...formData, receivedLYD: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label className="text-right block mb-2">النسبة %</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={formData.percentage || ''}
                  onChange={(e) => setFormData({ ...formData, percentage: parseFloat(e.target.value) || 0 })}
                />
              </div>
              {operationType === 'money_exchange' && (
                <div>
                  <Label className="text-right block mb-2">نوع الخدمة</Label>
                  <Select value={formData.serviceType} onValueChange={(value) => setFormData({ ...formData, serviceType: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر نوع الخدمة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open_account">فتح حساب</SelectItem>
                      <SelectItem value="activate">تفعيل</SelectItem>
                      <SelectItem value="withdrawal">سحب</SelectItem>
                      <SelectItem value="other">أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {operationType === 'transfer' && (
                <div>
                  <Label className="text-right block mb-2">نوع التحويل</Label>
                  <Select value={formData.transferType} onValueChange={(value) => setFormData({ ...formData, transferType: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="from">نحوّل منه</SelectItem>
                      <SelectItem value="to">نستلم عليه</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

            </>
          )}

          {/* شراء دولار */}
          {operationType === 'dollar_buy' && (
            <>
              <div>
                <Label className="text-right block mb-2">مسلّم (دينار)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={formData.receivedLYD || ''}
                  onChange={(e) => setFormData({ ...formData, receivedLYD: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label className="text-right block mb-2">مستلم (دولار / USDT)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={formData.receivedUSD || ''}
                  onChange={(e) => setFormData({ ...formData, receivedUSD: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </>
          )}

          {/* بيع دولار */}
          {operationType === 'dollar_sell' && (
            <>
              <div>
                <Label className="text-right block mb-2">مسلّم (دولار / USDT)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={formData.receivedUSD || ''}
                  onChange={(e) => setFormData({ ...formData, receivedUSD: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label className="text-right block mb-2">مستلم (دينار)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={formData.receivedLYD || ''}
                  onChange={(e) => setFormData({ ...formData, receivedLYD: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label className="text-right block mb-2">السعر المرجعي</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={formData.referencePrice || ''}
                  onChange={(e) => setFormData({ ...formData, referencePrice: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </>
          )}

          {/* سحب بطاقات الدولار */}
          {operationType === 'dollar_card_withdrawal' && (
            <>
              <div>
                <Label className="text-right block mb-2">دولار مستلم (قيمة السحب)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={formData.receivedUSD || ''}
                  onChange={(e) => setFormData({ ...formData, receivedUSD: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label className="text-right block mb-2">نسبة الماكينة %</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={formData.machinePercentage || ''}
                  onChange={(e) => setFormData({ ...formData, machinePercentage: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label className="text-right block mb-2">نسبة الشركة %</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={formData.companyPercentage || ''}
                  onChange={(e) => setFormData({ ...formData, companyPercentage: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label className="text-right block mb-2">سعر السوق</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={formData.marketPrice || ''}
                  onChange={(e) => setFormData({ ...formData, marketPrice: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label className="text-right block mb-2">سعر بيع لاحق (اختياري)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={formData.laterSalePrice || ''}
                  onChange={(e) => setFormData({ ...formData, laterSalePrice: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </>
          )}

          {/* المصاريف والرواتب */}
          {['expenses', 'salaries'].includes(operationType) && (
            <>
              <div>
                <Label className="text-right block mb-2">المبلغ</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={formData.receivedLYD || ''}
                  onChange={(e) => setFormData({ ...formData, receivedLYD: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </>
          )}

          {/* حقول مشتركة */}
          {commonFields}
        </div>

        {/* عرض القيم المحسوبة */}
        <div className="mb-6 p-4 bg-green-50 rounded-lg border-2 border-green-200">
          <h3 className="font-bold mb-3 text-right">القيم المحسوبة تلقائياً:</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {calculatedValues.givenLYD > 0 && (
              <div className="text-right">
                <p className="text-gray-600">المسلّم (د.ل)</p>
                <p className="font-bold text-lg">{calculatedValues.givenLYD.toFixed(2)}</p>
              </div>
            )}
            {calculatedValues.totalPercentage > 0 && (
              <div className="text-right">
                <p className="text-gray-600">النسبة الإجمالية</p>
                <p className="font-bold text-lg">{calculatedValues.totalPercentage.toFixed(2)}%</p>
              </div>
            )}
            <div className="text-right">
              <p className="text-gray-600">الربح</p>
              <p className={`font-bold text-lg ${calculatedValues.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {calculatedValues.profit.toFixed(2)}
              </p>
            </div>
            {calculatedValues.salePrice > 0 && (
              <div className="text-right">
                <p className="text-gray-600">السعر</p>
                <p className="font-bold text-lg">{calculatedValues.salePrice.toFixed(4)}</p>
              </div>
            )}
          </div>
        </div>

        {/* الأزرار */}
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onCancel}>إلغاء</Button>
          <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700">حفظ العملية</Button>
        </div>
      </CardContent>
    </Card>
  );
}
