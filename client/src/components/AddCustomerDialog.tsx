import { useAuth } from '@/contexts/AuthContext';
import { useCustomers } from '@/contexts/CustomersContext';
import { useEmployees } from '@/contexts/EmployeesContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useLogs } from '@/contexts/LogsContext';
import { useAccounts } from '@/contexts/AccountsContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Customer, Card as BankCard } from '@/types/customers';
import { useState } from 'react';
import { SuccessDialog } from './SuccessDialog';
import { CardOCRScanner } from './CardOCRScanner';
import { useExternalBarcodeScanner } from '@/hooks/useExternalBarcodeScanner';
import { Camera, AlertTriangle } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { isExpiringWithin90Days, getDaysRemaining } from '@/hooks/useExpiringAlerts';

interface AddCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddCustomerDialog({ open, onOpenChange }: AddCustomerDialogProps) {
  const { user } = useAuth();
  const { addCustomer, addCard, customers } = useCustomers();
  const { employees } = useEmployees();
  const { sendPushToManagers } = useNotifications();
  const getManagerIds = () =>
    employees
      .filter(e => (e.jobTitle === 'manager' || e.jobTitle === 'deputy_manager') && e.status === 'active')
      .map(e => e.id);
  const { data: delegates = [] } = trpc.delegates.list.useQuery();
  const { addAuditTrail: addAuditTrailFunc } = useLogs();
  const { addTransaction } = useAccounts();
  const recordCardPurchaseMutation = trpc.treasury.recordCardPurchase.useMutation();
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const [showOCRScanner, setShowOCRScanner] = useState(false);

  // استماع تلقائي لقارئ الباركود الخارجي (USB Scanner)
  useExternalBarcodeScanner(
    (barcode) => {
      // استخراج رقم البطاقة من الباركود
      if (barcode.includes('-')) {
        const parts = barcode.split('-');
        if (parts.length >= 3) {
          const cardNumber = parts[2];
          setNewCard(prev => ({ ...prev, cardNumber }));
          toast.success(`تم إدخال رقم البطاقة: ${cardNumber}`);
        }
      } else if (barcode.length === 16 && /^\d+$/.test(barcode)) {
        // إذا كان الباركود رقم بطاقة فقط (16 رقم)
        setNewCard(prev => ({ ...prev, cardNumber: barcode }));
        toast.success(`تم إدخال رقم البطاقة: ${barcode}`);
      }
    },
    open // تفعيل فقط عندما تكون النافذة مفتوحة
  );

  const [newCard, setNewCard] = useState({
    // بيانات الزبون
    name: '',
    nationalId: '',
    passportNumber: '',
    passportExpiry: '',
    // حقول تاريخ انتهاء الجواز المنفصلة
    passportDay: '',
    passportMonth: '',
    passportYear: '',
    // بيانات البنك
    accountNumber: '',
    iban1: '',
    iban2: '',
    accountPhone: '',
    personalPhone: '',
    // بيانات البطاقة
    cardNumber: '',
    cardExpiry: '',
    // حقول تاريخ انتهاء البطاقة المنفصلة
    cardMonth: '',
    cardYear: '',
    cardPin: '',
    bankId: 'aman', // المصرف الافتراضي
    // بيانات الشراء
    purchasePrice: '',
    delegate: '',
    delegateShare: '',
    documentsReceived: { passport: false, pin: false, card: false },
  });

  // توليد رقم معاملة فريد لا يتكرر أبداً
  // الصيغة: YYYYMMDD-HHMMSS-XXXX
  // مثال: 20260315-144523-A3F7
  const getNextTransactionNumber = () => {
    const now = new Date();
    const date = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('');
    const time = [
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0'),
    ].join('');
    // 4 أحرف عشوائية (hex) لضمان عدم التكرار حتى في نفس الثانية
    const random = Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
    return `${date}-${time}-${random}`;
  };

  // دالة استقبال رقم البطاقة من OCR
  const handleCardNumberDetected = (cardNumber: string) => {
    setNewCard(prev => ({ ...prev, cardNumber }));
    toast.success(`تم استخراج رقم البطاقة: ${cardNumber}`);
  };

  const handleAddCard = async () => {
    if (!newCard.name || !newCard.nationalId) {
      toast.error('الرجاء ملء الحقول المطلوبة (الاسم والرقم الوطني)');
      return;
    }

    // دمج تاريخ انتهاء الجواز من الحقول المنفصلة
    let passportExpiryDate = '';
    if (newCard.passportDay && newCard.passportMonth && newCard.passportYear) {
      const day = newCard.passportDay.padStart(2, '0');
      const month = newCard.passportMonth.padStart(2, '0');
      passportExpiryDate = `${month}/${day}/${newCard.passportYear}`;
    }

    // دمج تاريخ انتهاء البطاقة من الحقول المنفصلة
    let cardExpiryDate = '';
    if (newCard.cardMonth && newCard.cardYear) {
      const month = newCard.cardMonth.padStart(2, '0');
      const year = newCard.cardYear.length === 2 ? newCard.cardYear : newCard.cardYear.slice(-2);
      cardExpiryDate = `${month}/${year}`;
    }

    const purchasePrice = parseFloat(newCard.purchasePrice) || 0;
    const delegateShare = parseFloat(newCard.delegateShare) || 0;
    const totalPrice = purchasePrice + delegateShare;
    const transactionId = getNextTransactionNumber();

    // بناء قائمة المستندات المختارة
    const selectedDocuments: string[] = [];
    if (newCard.documentsReceived.passport) selectedDocuments.push('جواز سفر');
    if (newCard.documentsReceived.pin) selectedDocuments.push('شفرة');
    if (newCard.documentsReceived.card) selectedDocuments.push('بطاقة');

    const newCustomer: Customer = {
      id: transactionId,
      transactionNumber: transactionId,
      // بيانات الزبون
      name: newCard.name,
      phone: newCard.personalPhone || newCard.accountPhone || '',
      email: undefined,
      idNumber: newCard.nationalId,
      idType: 'national_id',
      address: undefined,
      city: undefined,
      passportNumber: newCard.passportNumber,
      passportExpiry: passportExpiryDate,
      // بيانات البنك
      accountNumber: newCard.accountNumber,
      iban1: newCard.iban1,
      iban2: newCard.iban2,
      accountPhone: newCard.accountPhone,
      personalPhone: newCard.personalPhone,
      // بيانات البطاقة
      cardNumber: newCard.cardNumber,
      cardExpiry: cardExpiryDate,
      cardPin: newCard.cardPin,
      bankId: newCard.bankId,
      // بيانات الشراء
      purchasePrice: purchasePrice,
      delegateId: newCard.delegate || undefined,
      delegateShare: delegateShare,
      totalPrice: totalPrice,
      // المستندات
      documentsReceived: newCard.documentsReceived,
      documents: selectedDocuments,
      // بيانات عامة
      registrationDate: new Date(),
      operationStatus: 'purchased',
      documentStatus: 'cannot_deliver',
      totalBalance: 0,
      totalTransactions: 0,
      createdBy: user?.fullName || 'admin',
      updatedAt: new Date(),
    };

    addCustomer(newCustomer);

    // تسجيل العملية في Logs
    addAuditTrailFunc({
      action: 'create',
      entityType: 'customer',
      entityId: newCustomer.id,
      userId: user?.id?.toString() || 'unknown',
      userName: user?.fullName || 'admin',
      details: {
        after: {
          name: newCustomer.name,
          phone: newCustomer.phone,
          idNumber: newCustomer.idNumber,
          documents: selectedDocuments,
        },
        description: `تم إضافة زبون جديد: ${newCustomer.name}`,
      },
      status: 'success',
    });

    let createdCard: any = null;
    if (newCard.cardNumber) {
      const newBankCard: BankCard = {
        id: Date.now().toString(),
        customerId: newCustomer.id,
        cardNumber: newCard.cardNumber,
        cardType: 'debit',
        cardBrand: 'mastercard',
        holderName: newCard.name,
        expiryDate: cardExpiryDate || '',
        cvv: newCard.cardPin,
        balance: totalPrice || 0,
        currency: 'LYD',
        issuedDate: new Date(),
        status: 'active',
        dailyLimit: 5000,
        monthlyLimit: 50000,
        usedDaily: 0,
        usedMonthly: 0,
        createdBy: user?.fullName || 'admin',
        updatedAt: new Date(),
      };

      addCard(newBankCard);
      createdCard = newBankCard;
    }

    // ربط بالخزينة - تسجيل شراء البطاقة
    if (purchasePrice > 0) {
      try {
        // تسجيل في Backend
        const result = await recordCardPurchaseMutation.mutateAsync({
          customerId: newCustomer.id,
          customerName: newCustomer.name,
          purchasePrice,
          processedBy: String(user?.id || '1'),
          processedByName: user?.fullName || 'admin',
        });
        
        // تسجيل في localStorage لتحديث الرصيد المعروض
        addTransaction({
          type: 'withdrawal',
          accountType: 'cash_lyd',
          amount: purchasePrice,
          currency: 'LYD',
          description: `شراء بطاقة للزبون: ${newCustomer.name} (${newCustomer.id})`,
          reference: `CARD-${Date.now()}`,
          date: new Date(),
          createdBy: user?.fullName || 'admin',
        });
        
        toast.success(`تم تسجيل شراء البطاقة: ${purchasePrice} د.ل`);
      } catch {
        toast.error('تم إضافة الزبون لكن فشل تسجيل الخزينة');
      }
    } else {
    }

    // إظهار إشعار النجاح
    toast.success(`تم إضافة الزبون بنجاح – رقم الزبون/المعاملة: ${transactionId}`, {
      duration: 15000,
    });

    // إرسال Web Push للمدير ونائبه
    sendPushToManagers(
      '✅ إضافة زبون جديد',
      `الموظف: ${user?.fullName || 'admin'} | الزبون: ${newCard.name} | رقم المعاملة: ${transactionId} | ثمن الشراء: ${totalPrice || 0} د.ل`,
      getManagerIds(),
      '/customers'
    );
    // إرسال إشعار للمدير (بدون انتظار)
    fetch('/api/trpc/system.notifyOwner', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: '✅ تم إضافة زبون جديد',
        content: `الموظف: ${user?.fullName || 'admin'}\nالزبون: ${newCard.name}\nالرقم الوطني: ${newCard.nationalId}\nرقم المعاملة: ${transactionId}\nثمن الشراء: ${totalPrice || 0} د.ل`,
      }),
    }).catch(() => {});

    // إرسال إشعار محلي بصوت وشعار
    import('@/lib/notificationManager').then(({ notificationManager }) => {
      notificationManager.showNotification(
        '✅ تم إضافة زبون جديد',
        {
          body: `الموظف: ${user?.fullName || 'admin'}\nالزبون: ${newCard.name}\nرقم المعاملة: ${transactionId}`,
          sound: true,
        }
      );
    });

    setSuccessData({
      customer: newCustomer,
      card: createdCard,
      purchasePrice,
      delegateShare,
      totalPrice,
      transactionId,
      delegate: newCard.delegate,
      accountNumber: newCard.accountNumber,
      iban1: newCard.iban1,
      iban2: newCard.iban2,
      accountPhone: newCard.accountPhone,
      passportNumber: newCard.passportNumber,
      passportExpiry: passportExpiryDate,
      documentsReceived: newCard.documentsReceived,
    });

    setShowSuccess(true);
  };

  const handleCloseSuccess = () => {
    setShowSuccess(false);
    onOpenChange(false);
    setNewCard({
      name: '',
      nationalId: '',
      passportNumber: '',
      passportExpiry: '',
      passportDay: '',
      passportMonth: '',
      passportYear: '',
      accountNumber: '',
      iban1: '',
      iban2: '',
      accountPhone: '',
      personalPhone: '',
      cardNumber: '',
      cardExpiry: '',
      cardMonth: '',
      cardYear: '',
      cardPin: '',
      bankId: 'aman',
      purchasePrice: '',
      delegate: '',
      delegateShare: '',
      documentsReceived: { passport: false, pin: false, card: false },
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إضافة زبون / شراء بطاقة</DialogTitle>
            <DialogDescription>أدخل بيانات الزبون والبطاقة والبنك بشكل صحيح</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* بيانات الزبون */}
            <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
              <h3 className="font-bold text-lg text-right mb-4 text-blue-900">📋 بيانات الزبون</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-right block mb-2 font-semibold">الاسم (مطابق الجواز) *</Label>
                  <Input
                    placeholder="Enter name"
                    value={newCard.name}
                    onChange={(e) => setNewCard({ ...newCard, name: e.target.value })}
                    className="border-2 border-blue-300"
                  />
                </div>
                <div>
                  <Label className="text-right block mb-2 font-semibold">الرقم الوطني *</Label>
                  <Input
                    placeholder="123456789"
                    value={newCard.nationalId}
                    onChange={(e) => setNewCard({ ...newCard, nationalId: e.target.value })}
                    className="border-2 border-blue-300"
                  />
                </div>
                <div>
                  <Label className="text-right block mb-2 font-semibold">رقم الجواز</Label>
                  <Input
                    placeholder="AB123456"
                    value={newCard.passportNumber}
                    onChange={(e) => setNewCard({ ...newCard, passportNumber: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-right block mb-2 font-semibold">تاريخ انتهاء الجواز</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Input
                      placeholder="اليوم (01-31)"
                      value={newCard.passportDay}
                      onChange={(e) => setNewCard({ ...newCard, passportDay: e.target.value })}
                      maxLength={2}
                    />
                    <Input
                      placeholder="الشهر (01-12)"
                      value={newCard.passportMonth}
                      onChange={(e) => setNewCard({ ...newCard, passportMonth: e.target.value })}
                      maxLength={2}
                    />
                    <Input
                      placeholder="السنة (2030)"
                      value={newCard.passportYear}
                      onChange={(e) => setNewCard({ ...newCard, passportYear: e.target.value })}
                      maxLength={4}
                    />
                  </div>
                  {/* تحذير الصلاحية القريبة للجواز */}
                  {newCard.passportYear && newCard.passportMonth && newCard.passportDay && (() => {
                    const passportDate = new Date(parseInt(newCard.passportYear), parseInt(newCard.passportMonth) - 1, parseInt(newCard.passportDay));
                    const daysRemaining = getDaysRemaining(passportDate.getTime(), 'passport');
                    if (daysRemaining <= 90 && daysRemaining > 0) {
                      return (
                        <div className="mt-2 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded flex gap-2">
                          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                          <div className="text-sm text-yellow-800">
                            <p className="font-semibold">⚠️ تحذير: جواز السفر ينتهي قريباً</p>
                            <p>المتبقي: {daysRemaining} يوم فقط</p>
                          </div>
                        </div>
                      );
                    } else if (daysRemaining <= 0) {
                      return (
                        <div className="mt-2 p-3 bg-red-50 border-l-4 border-red-400 rounded flex gap-2">
                          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <div className="text-sm text-red-800">
                            <p className="font-semibold">🔴 خطر: جواز السفر منتهي الصلاحية</p>
                            <p>يجب تجديده فوراً</p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            </div>

            {/* بيانات البنك */}
            <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
              <h3 className="font-bold text-lg text-right mb-4 text-green-900">🏦 بيانات البنك</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-right block mb-2 font-semibold">رقم الحساب (333) *</Label>
                  <Input
                    placeholder="123456789"
                    value={newCard.accountNumber}
                    onChange={(e) => setNewCard({ ...newCard, accountNumber: e.target.value })}
                    className="border-2 border-green-300"
                  />
                </div>
                <div>
                  <Label className="text-right block mb-2 font-semibold">IBAN (333) - اختياري</Label>
                  <Input
                    placeholder="LY94AHLI000000000000000000000"
                    value={newCard.iban1}
                    onChange={(e) => setNewCard({ ...newCard, iban1: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-right block mb-2 font-semibold">IBAN (555) - اختياري</Label>
                  <Input
                    placeholder="LY94AHLI000000000000000000000"
                    value={newCard.iban2}
                    onChange={(e) => setNewCard({ ...newCard, iban2: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-right block mb-2 font-semibold">رقم هاتف الحساب</Label>
                  <Input
                    placeholder="0921234567"
                    value={newCard.accountPhone}
                    onChange={(e) => setNewCard({ ...newCard, accountPhone: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-right block mb-2 font-semibold">رقم شخصي</Label>
                  <Input
                    placeholder="0925555555"
                    value={newCard.personalPhone}
                    onChange={(e) => setNewCard({ ...newCard, personalPhone: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* بيانات البطاقة */}
            <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200">
              <h3 className="font-bold text-lg text-right mb-4 text-purple-900">💳 بيانات البطاقة</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-right block mb-2 font-semibold">رقم البطاقة</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="5412345678901234"
                      value={newCard.cardNumber}
                      onChange={(e) => setNewCard({ ...newCard, cardNumber: e.target.value })}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setShowOCRScanner(true)}
                      title="تصوير البطاقة"
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-right block mb-2 font-semibold">تاريخ الصلاحية</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="الشهر (01-12)"
                      value={newCard.cardMonth}
                      onChange={(e) => setNewCard({ ...newCard, cardMonth: e.target.value })}
                      maxLength={2}
                    />
                    <Input
                      placeholder="السنة (26)"
                      value={newCard.cardYear}
                      onChange={(e) => setNewCard({ ...newCard, cardYear: e.target.value })}
                      maxLength={2}
                    />
                  </div>
                  {/* تحذير الصلاحية القريبة للبطاقة */}
                  {newCard.cardYear && newCard.cardMonth && (() => {
                    const rawYear = parseInt(newCard.cardYear);
                    const fullYear = rawYear < 100 ? 2000 + rawYear : rawYear;
                    const cardDate = new Date(fullYear, parseInt(newCard.cardMonth) - 1 + 1, 0);
                    const daysRemaining = getDaysRemaining(cardDate.getTime(), 'card');
                    if (daysRemaining <= 90 && daysRemaining > 0) {
                      return (
                        <div className="mt-2 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded flex gap-2">
                          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                          <div className="text-sm text-yellow-800">
                            <p className="font-semibold">⚠️ تحذير: البطاقة تنتهي قريباً</p>
                            <p>المتبقي: {daysRemaining} يوم فقط</p>
                          </div>
                        </div>
                      );
                    } else if (daysRemaining <= 0) {
                      return (
                        <div className="mt-2 p-3 bg-red-50 border-l-4 border-red-400 rounded flex gap-2">
                          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <div className="text-sm text-red-800">
                            <p className="font-semibold">🔴 خطر: البطاقة منتهية الصلاحية</p>
                            <p>يجب استبدالها فوراً</p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
                <div className="col-span-2">
                  <Label className="text-right block mb-2 font-semibold">الرمز السري (PIN) - ⚠️ سيتم إخفاؤه في الإيصالات</Label>
                  <Input
                    placeholder="1234"
                    type="password"
                    value={newCard.cardPin}
                    onChange={(e) => setNewCard({ ...newCard, cardPin: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* بيانات الشراء */}
            <div className="bg-orange-50 p-4 rounded-lg border-2 border-orange-200">
              <h3 className="font-bold text-lg text-right mb-4 text-orange-900">💰 بيانات الشراء</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-right block mb-2 font-semibold">ثمن الشراء (الزبون) *</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="1000"
                    value={newCard.purchasePrice}
                    onChange={(e) => setNewCard({ ...newCard, purchasePrice: e.target.value })}
                    className="border-2 border-orange-300"
                  />
                </div>
                <div>
                  <Label className="text-right block mb-2 font-semibold">المصرف</Label>
                  <Select value={newCard.bankId} onValueChange={(value) => setNewCard({ ...newCard, bankId: value })}>
                    <SelectTrigger className="border-2 border-orange-300">
                      <SelectValue placeholder="اختر المصرف" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aman">مصرف الأمان</SelectItem>
                      <SelectItem value="nab">مصرف شمال أفريقيا (NAB)</SelectItem>
                      <SelectItem value="atib">مصرف السرايا (ATIB)</SelectItem>
                      <SelectItem value="jumhouria">مصرف الجمهورية (Jumhouria Bank)</SelectItem>
                      <SelectItem value="united">المصرف المتحد (The United Bank)</SelectItem>
                      <SelectItem value="ncb">المصرف التجاري الوطني (NCB)</SelectItem>
                      <SelectItem value="yaqeen">مصرف اليقين (Yaqeen Bank)</SelectItem>
                      <SelectItem value="sahara">مصرف الصحاري (Sahara Bank)</SelectItem>
                      <SelectItem value="andalus">مصرف الأندلس (Andalus Bank)</SelectItem>
                      <SelectItem value="wahda">مصرف الوحدة (Wahda Bank)</SelectItem>
                      <SelectItem value="libbank">المصرف الليبي الإسلامي (Libyan Islamic Bank)</SelectItem>
                      <SelectItem value="nuran">مصرف النوران (Nuran Bank)</SelectItem>
                      <SelectItem value="bcd">مصرف التجارة والتنمية (Bank of Commerce & Development)</SelectItem>
                      <SelectItem value="alwaha">مصرف الواحة (Al Waha Bank)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-right block mb-2 font-semibold">اختر المندوب (اختياري)</Label>
                  <Select value={newCard.delegate} onValueChange={(value) => setNewCard({ ...newCard, delegate: value })}>
                    <SelectTrigger className="border-2 border-orange-300">
                      <SelectValue placeholder="اختر مندوب (اختياري)" />
                    </SelectTrigger>
                    <SelectContent>
                      {delegates.map((delegate: any) => (
                        <SelectItem key={delegate.id} value={delegate.id}>
                          {delegate.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-right block mb-2 font-semibold">حصة المندوب</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={newCard.delegateShare}
                    onChange={(e) => setNewCard({ ...newCard, delegateShare: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-right block mb-2 font-semibold">ثمن الشراء الإجمالي</Label>
                  <div className="p-3 bg-white border-2 border-orange-400 rounded font-bold text-lg text-orange-700">
                    {(parseFloat(newCard.purchasePrice) || 0) + (parseFloat(newCard.delegateShare) || 0)} د.ل
                  </div>
                </div>
              </div>
            </div>

            {/* المستندات / الاستلام */}
            <div className="bg-red-50 p-4 rounded-lg border-2 border-red-200">
              <h3 className="font-bold text-lg text-right mb-4 text-red-900">📄 المستندات / الاستلام</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-2 justify-end p-2 bg-white rounded border border-red-200">
                  <Label htmlFor="passport" className="font-semibold">جواز</Label>
                  <Checkbox
                    id="passport"
                    checked={newCard.documentsReceived.passport}
                    onCheckedChange={(checked) =>
                      setNewCard({
                        ...newCard,
                        documentsReceived: { ...newCard.documentsReceived, passport: checked as boolean },
                      })
                    }
                  />
                </div>
                <div className="flex items-center space-x-2 justify-end p-2 bg-white rounded border border-red-200">
                  <Label htmlFor="pin" className="font-semibold">شفرة</Label>
                  <Checkbox
                    id="pin"
                    checked={newCard.documentsReceived.pin}
                    onCheckedChange={(checked) =>
                      setNewCard({
                        ...newCard,
                        documentsReceived: { ...newCard.documentsReceived, pin: checked as boolean },
                      })
                    }
                  />
                </div>
                <div className="flex items-center space-x-2 justify-end p-2 bg-white rounded border border-red-200">
                  <Label htmlFor="card" className="font-semibold">بطاقة</Label>
                  <Checkbox
                    id="card"
                    checked={newCard.documentsReceived.card}
                    onCheckedChange={(checked) =>
                      setNewCard({
                        ...newCard,
                        documentsReceived: { ...newCard.documentsReceived, card: checked as boolean },
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end mt-6 border-t pt-6">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button onClick={handleAddCard} className="bg-green-600 hover:bg-green-700 gap-2">
              ✅ إضافة الزبون
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* مكون تصوير البطاقة واستخراج الرقم */}
      <CardOCRScanner
        open={showOCRScanner}
        onOpenChange={setShowOCRScanner}
        onCardNumberDetected={handleCardNumberDetected}
      />

      {successData && (
        <SuccessDialog
          open={showSuccess}
          onOpenChange={(open) => {
            if (!open) {
              handleCloseSuccess();
            } else {
              setShowSuccess(open);
            }
          }}
          customer={successData.customer}
          card={{
            ...successData.card,
            purchasePrice: successData.purchasePrice,
            delegateShare: successData.delegateShare,
          }}
          transactionId={successData.transactionId}
          delegate={successData.delegate}
          accountNumber={successData.accountNumber}
          iban1={successData.iban1}
          iban2={successData.iban2}
          accountPhone={successData.accountPhone}
          passportNumber={successData.passportNumber}
          passportExpiry={successData.passportExpiry}
          documentsReceived={successData.documentsReceived}
        />
      )}
    </>
  );
}
