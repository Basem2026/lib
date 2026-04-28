import { useLocation, useParams } from 'wouter';
import { SuccessDialog } from '@/components/SuccessDialog';
import { BarcodePrintDialog } from '@/components/BarcodePrintDialog';
import { ReceiptPrintView, ReceiptData } from '@/components/ReceiptPrintView';
import { useCustomers } from '@/contexts/CustomersContext';
import { useCards } from '@/contexts/CardsContext';
import { useRBAC } from '@/hooks/useRBAC';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Printer, Trash2, Clock, CheckCircle2, FileText } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { BankCard } from '@/components/BankCard';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function CustomerDetails() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { customers, cards, removeCustomer } = useCustomers();
  const cardsCtx = useCards();
  const { checkPermission } = useRBAC();
  const canDeleteCustomer = checkPermission('delete_customer');
  const [showReceipts, setShowReceipts] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBarcodePrint, setShowBarcodePrint] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [expandedTimelines, setExpandedTimelines] = useState<Record<string, boolean>>({});
  
  const customerId = params.id;
  const customer = customers.find(c => c.id === customerId);
  const customerCard = cards.find(c => c.customerId === customerId);
  const customerCards = cards.filter(c => c.customerId === customerId);

  // بطاقات الأغراض الشخصية المرتبطة بالزبون عبر الرقم الوطني
  const personalCards = customer?.idNumber 
    ? cardsCtx.getCardsByCustomer(customer.idNumber)
    : [];

  // دمج كل سجلات التاريخ من جميع البطاقات في تايم لاين واحد مرتب
  const allStatusHistory = personalCards.flatMap(card => [
    ...(card.financialStatusHistory || []).map(h => ({
      ...h,
      type: 'financial' as const,
      cardTransactionId: card.transactionId,
      cardName: card.name,
    })),
    ...(card.documentStatusHistory || []).map(h => ({
      ...h,
      type: 'document' as const,
      cardTransactionId: card.transactionId,
      cardName: card.name,
    })),
  ]).sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());

  if (!customer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          <Button variant="outline" onClick={() => setLocation('/customers')}>
            <ArrowRight className="w-4 h-4 ml-2" />
            العودة
          </Button>
          <Card className="mt-6">
            <CardContent className="p-12 text-center">
              <p className="text-slate-500">الزبون غير موجود</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  // حساب الإحصائيات الديناميكية
  const totalPurchaseValue = (customer.purchasePrice || 0) + (customer.delegateShare || 0);
  const totalCards = customerCards.length;
  const totalDeposits = customerCards.reduce((sum, card) => {
    if (card.status === 'active') {
      return sum + card.balance;
    }
    return sum;
  }, 0);
  const totalWithdrawals = customerCards.reduce((sum, card) => {
    if (card.status === 'inactive' || card.status === 'blocked') {
      return sum + card.balance;
    }
    return sum;
  }, 0);
  const currentBalance = totalDeposits - totalWithdrawals;
  
  // عدد البطاقات حسب الحالات
  const cardsByStatus = {
    active: customerCards.filter(c => c.status === 'active').length,
    inactive: customerCards.filter(c => c.status === 'inactive').length,
    expired: customerCards.filter(c => c.status === 'expired').length,
    blocked: customerCards.filter(c => c.status === 'blocked').length,
  };



  // تحويل حالة العملية إلى نص عربي
  const getOperationStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'purchased': 'تم الشراء',
      'awaiting_match': 'في إنتظار المطابقة',
      'matched': 'تمت المطابقة',
      'not_matched': 'غير مطابق',
      'reserved': 'تم الحجز',
      'deposited': 'تم الإيداع',
      'awaiting_execution': 'في انتظار التنفيذ',
      'executed': 'تم التنفيذ',
      'partial_withdrawal': 'تم السحب مع وجود متبقي',
      'full_withdrawal': 'تم السحب بالكامل',
      'ready_for_pickup': 'جاهزة للاستلام',
      'cancelled': 'ملغية',
    };
    return statusMap[status] || status;
  };

  // تحويل حالة المستندات إلى نص عربي
  const getDocumentStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'cannot_deliver': 'لا يمكن التسليم',
      'passport_delivered': 'تم تسليم جواز السفر',
      'pin_delivered': 'تم تسليم الشفرة',
      'card_delivered': 'تم تسليم البطاقة',
      'card_pin_delivered': 'تم تسليم البطاقة والشفرة',
      'passport_card_delivered': 'تم تسليم الجواز والبطاقة',
      'passport_pin_delivered': 'تم تسليم الجواز والشفرة',
      'all_delivered': 'تم تسليم كامل المستندات',
    };
    return statusMap[status] || status;
  };

  // دالة حذف الزبون
  const handleDeleteCustomer = () => {
    removeCustomer(customer.id);
    toast.success('تم حذف الزبون بنجاح');
    setLocation('/customers');
  };

  // دالة طباعة الإيصالات
  const handlePrintReceipt = (type: 'purchase' | 'deposit' | 'withdrawal') => {
    const receiptNames = {
      purchase: 'إيصال الشراء',
      deposit: 'إيصال الإيداع',
      withdrawal: 'إيصال السحب',
    };
    toast.info(`جاري طباعة ${receiptNames[type]}...`);
    // سيتم تطبيق الطباعة الفعلية لاحقاً
  };

  return (
    <>
      {/* منطقة الطباعة المخفية */}
      <div className="print-only-host" aria-hidden="true">
        <ReceiptPrintView data={receiptData} />
      </div>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setLocation('/customers')}>
              <ArrowRight className="w-4 h-4 ml-2" />
              العودة
            </Button>
            {canDeleteCustomer && (
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteDialog(true)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            >
              <Trash2 className="w-4 h-4 ml-2" />
              حذف الزبون
            </Button>
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-800">تفاصيل الزبون</h1>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* البطاقة البنكية الافتراضية - ديناميكية حسب المصرف */}
          <BankCard
            cardNumber={customer.cardNumber || '****************'}
            cardholderName={customer.name}
            expiryDate={customer.cardExpiry 
              ? (typeof customer.cardExpiry === 'string' && customer.cardExpiry.match(/^\d{1,2}\/\d{2,4}$/) 
                  ? customer.cardExpiry 
                  : (typeof customer.cardExpiry === 'string' ? customer.cardExpiry : formatDate(customer.cardExpiry)))
              : '**/**'}
            cvv="***"
            bankId={customer.bankId || 'aman'}
            isFlipped={false}
          />

          {/* معلومات الزبون الأساسية */}
          <Card>
            <CardHeader>
              <CardTitle>معلومات الزبون</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">الاسم (مطابق الجواز)</p>
                  <p className="font-semibold">{customer.name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">الرقم الوطني</p>
                  <p className="font-semibold">{customer.idNumber || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">رقم الجواز</p>
                  <p className="font-semibold">{customer.passportNumber || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">تاريخ انتهاء الجواز</p>
                  <p className="font-semibold">
                    {formatDate(customer.passportExpiry)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">رقم الحساب (333)</p>
                  <p className="font-semibold">{customer.accountNumber || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">IBAN (333)</p>
                  <p className="font-semibold font-mono text-xs">{customer.iban1 || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">IBAN (555)</p>
                  <p className="font-semibold font-mono text-xs">{customer.iban2 || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">رقم هاتف الحساب</p>
                  <p className="font-semibold">{customer.accountPhone || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">رقم الهاتف الشخصي</p>
                  <p className="font-semibold">{customer.personalPhone || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">رقم البطاقة</p>
                  <p className="font-semibold font-mono">{customer.cardNumber || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">تاريخ انتهاء البطاقة</p>
                  <p className="font-semibold">
                    {customer.cardExpiry 
                      ? (typeof customer.cardExpiry === 'string' && customer.cardExpiry.match(/^\d{1,2}\/\d{2,4}$/) 
                          ? customer.cardExpiry 
                          : (typeof customer.cardExpiry === 'string' ? customer.cardExpiry : formatDate(customer.cardExpiry)))
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">الشفرة (PIN)</p>
                  <p className="font-semibold font-mono">{customer.cardPin || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">ثمن الشراء (الزبون)</p>
                  <p className="font-semibold text-green-600">{customer.purchasePrice || 0} د.ل</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">حصة المندوب</p>
                  <p className="font-semibold text-blue-600">{customer.delegateShare || 0} د.ل</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">المندوب</p>
                  <p className="font-semibold">{customer.delegateId || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">تاريخ التسجيل</p>
                  <p className="font-semibold">
                    {formatDate(customer.registrationDate)}
                  </p>
                </div>
              </div>

              {/* المستندات المستلمة */}
              <div className="pt-4 border-t">
                <p className="text-sm text-slate-500 mb-2">المستندات المستلمة</p>
                <div className="flex gap-3">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                    customer.documents?.includes('جواز سفر') 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    <span className="text-sm font-medium">جواز سفر</span>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                    customer.documents?.includes('شفرة') 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    <span className="text-sm font-medium">شفرة</span>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                    customer.documents?.includes('بطاقة') 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    <span className="text-sm font-medium">بطاقة</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Timeline - سجل تغييرات الحالة بالتابات */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              سجل تغييرات الحالة
              {allStatusHistory.length > 0 && (
                <span className="text-sm font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {allStatusHistory.length} تغيير
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" dir="rtl">
              <TabsList className="mb-4 w-full">
                <TabsTrigger value="all" className="flex-1">
                  الكل
                  {allStatusHistory.length > 0 && (
                    <span className="mr-1.5 text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">
                      {allStatusHistory.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="financial" className="flex-1">
                  الحالة المالية
                  {allStatusHistory.filter(h => h.type === 'financial').length > 0 && (
                    <span className="mr-1.5 text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">
                      {allStatusHistory.filter(h => h.type === 'financial').length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="document" className="flex-1">
                  حالة المستندات
                  {allStatusHistory.filter(h => h.type === 'document').length > 0 && (
                    <span className="mr-1.5 text-xs bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full">
                      {allStatusHistory.filter(h => h.type === 'document').length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              {(['all', 'financial', 'document'] as const).map(tabValue => {
                const filtered = tabValue === 'all'
                  ? allStatusHistory
                  : allStatusHistory.filter(h => h.type === tabValue);
                const accentColor = tabValue === 'financial' ? 'indigo' : tabValue === 'document' ? 'amber' : 'blue';
                return (
                  <TabsContent key={tabValue} value={tabValue}>
                    {filtered.length === 0 ? (
                      <div className="text-center py-8">
                        <Clock className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                        <p className="text-slate-500">لا توجد تغييرات مسجلة بعد</p>
                        <p className="text-slate-400 text-sm mt-1">ستظهر التغييرات هنا عند تحديث الحالة</p>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="absolute right-[18px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 via-slate-200 to-transparent"></div>
                        <div className="space-y-4">
                          {filtered.map((entry, index) => {
                            const isFinancial = entry.type === 'financial';
                            const entryDate = new Date(entry.changedAt);
                            const isFirst = index === 0;
                            return (
                              <div key={index} className="relative flex gap-4 items-start">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white z-10 flex-shrink-0 shadow-sm ${
                                  isFirst
                                    ? `bg-${accentColor}-500 ring-4 ring-${accentColor}-100`
                                    : isFinancial
                                      ? 'bg-indigo-400'
                                      : 'bg-amber-400'
                                }`}>
                                  {isFinancial
                                    ? <CheckCircle2 className="w-4 h-4" />
                                    : <FileText className="w-4 h-4" />
                                  }
                                </div>
                                <div className={`flex-1 rounded-lg p-3 border ${
                                  isFirst
                                    ? `bg-${accentColor}-50 border-${accentColor}-200`
                                    : 'bg-white border-slate-200'
                                }`}>
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                    <div>
                                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full mb-1 inline-block ${
                                        isFinancial
                                          ? 'bg-indigo-100 text-indigo-700'
                                          : 'bg-amber-100 text-amber-700'
                                      }`}>
                                        {isFinancial ? 'حالة مالية' : 'حالة مستندات'}
                                      </span>
                                      <p className="font-semibold text-slate-800">{entry.status}</p>
                                      {entry.reason && (
                                        <p className="text-sm text-slate-500 mt-0.5">السبب: {entry.reason}</p>
                                      )}
                                      <p className="text-xs text-slate-400 mt-0.5">رقم المعاملة: {entry.cardTransactionId}</p>
                                    </div>
                                    <div className="text-left sm:text-right flex-shrink-0">
                                      <p className="text-sm font-medium text-slate-700">
                                        {entryDate.toLocaleDateString('ar-LY', { year: 'numeric', month: 'short', day: 'numeric' })}
                                      </p>
                                      <p className="text-xs text-slate-500">
                                        {entryDate.toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' })}
                                      </p>
                                      <p className="text-xs text-slate-400">بواسطة: {entry.changedBy}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>

        {/* أزرار الطباعة */}
        <Card>
          <CardHeader>
            <CardTitle>الطباعة والإيصالات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setShowBarcodePrint(true)}
              >
                <Printer className="w-4 h-4" />
                طباعة باركود
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setShowReceipts(true)}
              >
                <Printer className="w-4 h-4" />
                طباعة الإيصالات
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>

      {/* Dialog الإيصالات */}
      {customer && (
        <SuccessDialog
          open={showReceipts}
          onOpenChange={setShowReceipts}
          customer={customer}
          card={customerCard ? {
            ...customerCard,
            purchasePrice: customer.purchasePrice,
            delegateShare: customer.delegateShare,
          } : {
            id: customer.id,
            customerId: customer.id,
            cardNumber: customer.cardNumber || '',
            expiryDate: customer.cardExpiry || '',
            cvv: customer.cardPin || '',
            issuedDate: new Date(customer.registrationDate),
            status: 'active' as const,
            updatedAt: new Date(customer.updatedAt),
            purchasePrice: customer.purchasePrice,
            delegateShare: customer.delegateShare,
            cardType: 'debit' as const,
            cardBrand: 'visa' as const,
            holderName: customer.name,
            balance: 0,
            currency: 'USD' as const,
            dailyLimit: 0,
            monthlyLimit: 0,
            usedDaily: 0,
            usedMonthly: 0,
            createdBy: 'system',
          }}
          transactionId={customer.id}
          delegate={customer.delegateId}
          accountNumber={customer.accountNumber}
          iban1={customer.iban1}
          iban2={customer.iban2}
          accountPhone={customer.accountPhone}
          passportNumber={customer.passportNumber}
          passportExpiry={customer.passportExpiry ? formatDate(customer.passportExpiry) : ''}
          documentsReceived={{
            passport: true,
            pin: true,
            card: true,
          }}
          onReceiptDataChange={setReceiptData}
        />
      )}

      {/* نافذة طباعة الباركود */}
      {customer && customerCard && (
        <BarcodePrintDialog
          open={showBarcodePrint}
          onOpenChange={setShowBarcodePrint}
          transactionNumber={customer.transactionNumber || ''}
          cardNumber={customerCard.cardNumber}
          customerName={customer.name}
          onBarcodeDataChange={setReceiptData}
        />
      )}

      {/* نافذة تأكيد الحذف */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف الزبون</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف الزبون <strong>{customer.name}</strong>؟
              <br />
              سيتم حذف جميع البيانات المرتبطة بهذا الزبون بشكل نهائي ولا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCustomer}
              className="bg-red-600 hover:bg-red-700"
            >
              حذف الزبون
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
