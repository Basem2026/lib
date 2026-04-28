import React from 'react';
import { useCustomers } from '@/contexts/CustomersContext';
import { useLogs } from '@/contexts/LogsContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useState } from 'react';
import { ArrowLeft, Plus, Trash2, RefreshCw, ScanLine } from 'lucide-react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import type { Card as CardType, Customer } from '@/types/customers';
import BarcodeScanner from '@/components/BarcodeScanner';
import { trpc } from '@/lib/trpc';

interface CardInQueue {
  card: CardType;
  customer: Customer;
  newStatus: string;
  depositAmount?: number;
  finalBalance?: number;
  paymentMethod?: 'cash' | 'bank';
  currency?: 'LYD' | 'USD';
  bankAccountId?: string;
}

export default function BulkStatusChange() {
  const customersCtx = useCustomers();
  const { addAuditTrail } = useLogs();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  const [cardNumberInput, setCardNumberInput] = useState('');
  const [cardsQueue, setCardsQueue] = useState<CardInQueue[]>([]);
  const [globalStatus, setGlobalStatus] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  
  // حالات النافذة المنبثقة
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkNewStatus, setBulkNewStatus] = useState('');
  const [bulkDepositAmount, setBulkDepositAmount] = useState('');
  const [bulkFinalBalance, setBulkFinalBalance] = useState('');
  const [bulkPaymentMethod, setBulkPaymentMethod] = useState('cash');
  const [bulkCurrency, setBulkCurrency] = useState<'LYD' | 'USD'>('LYD');
  const [bulkBankAccountId, setBulkBankAccountId] = useState('');
  
  // جلب الحسابات البنكية من trpc
  const { data: allAccounts = [] } = trpc.treasury.getAllAccounts.useQuery();
  const bankAccounts = allAccounts.filter((acc: any) => acc.accountType === 'bank_account');
  
  // Mutation لتسجيل الإيداع
  const recordDepositMutation = trpc.treasury.recordDeposit.useMutation();

  // إضافة بطاقة إلى القائمة
  const handleAddCard = () => {
    if (!cardNumberInput.trim()) {
      toast.error('الرجاء إدخال رقم البطاقة');
      return;
    }

    // البحث عن البطاقة
    const card = customersCtx.cards.find(c => c.cardNumber === cardNumberInput.trim());
    if (!card) {
      toast.error('البطاقة غير موجودة');
      return;
    }

    // التحقق من عدم التكرار
    if (cardsQueue.some(item => item.card.id === card.id)) {
      toast.error('البطاقة موجودة بالفعل في القائمة');
      return;
    }

    const customer = customersCtx.getCustomer(card.customerId);
    if (!customer) {
      toast.error('الزبون غير موجود');
      return;
    }

    setCardsQueue([...cardsQueue, {
      card,
      customer,
      newStatus: customer.operationStatus,
      depositAmount: undefined,
      finalBalance: undefined,
    }]);

    setCardNumberInput('');
    toast.success(`تمت إضافة بطاقة ${customer.name}`);
  };

  // حذف بطاقة من القائمة
  const handleRemoveCard = (cardId: string) => {
    setCardsQueue(cardsQueue.filter(item => item.card.id !== cardId));
  };

  // تحديث حالة بطاقة معينة
  const handleUpdateCardStatus = (cardId: string, newStatus: string) => {
    setCardsQueue(cardsQueue.map(item => 
      item.card.id === cardId ? { ...item, newStatus } : item
    ));
  };

  // تحديث رصيد الإيداع
  const handleUpdateDepositAmount = (cardId: string, amount: string) => {
    const numAmount = parseFloat(amount);
    setCardsQueue(cardsQueue.map(item => 
      item.card.id === cardId ? { ...item, depositAmount: isNaN(numAmount) ? undefined : numAmount } : item
    ));
  };

  // تحديث الرصيد النهائي
  const handleUpdateFinalBalance = (cardId: string, amount: string) => {
    const numAmount = parseFloat(amount);
    setCardsQueue(cardsQueue.map(item => 
      item.card.id === cardId ? { ...item, finalBalance: isNaN(numAmount) ? undefined : numAmount } : item
    ));
  };

  // تحديث طريقة الدفع
  const handleUpdatePaymentMethod = (cardId: string, paymentMethod: 'cash' | 'bank') => {
    setCardsQueue(cardsQueue.map(item => 
      item.card.id === cardId ? { ...item, paymentMethod, bankAccountId: paymentMethod === 'cash' ? undefined : item.bankAccountId } : item
    ));
  };

  // تحديث الحساب البنكي
  const handleUpdateBankAccount = (cardId: string, bankAccountId: string) => {
    setCardsQueue(cardsQueue.map(item => 
      item.card.id === cardId ? { ...item, bankAccountId } : item
    ));
  };

  // تحديث العملة
  const handleUpdateCurrency = (cardId: string, currency: 'LYD' | 'USD') => {
    setCardsQueue(cardsQueue.map(item => 
      item.card.id === cardId ? { ...item, currency } : item
    ));
  };

  // فتح نافذة تغيير الحالة الجماعية
  const handleOpenBulkDialog = () => {
    if (cardsQueue.length === 0) {
      toast.error('لا توجد بطاقات في القائمة');
      return;
    }
    setShowBulkDialog(true);
    setBulkNewStatus('');
    setBulkDepositAmount('');
    setBulkFinalBalance('');
  };

  // تطبيق الحالة على الجميع من النافذة
  const handleApplyBulkStatus = () => {
    if (!bulkNewStatus) {
      toast.error('الرجاء اختيار حالة');
      return;
    }

    // التحقق من القيم المطلوبة
    if (bulkNewStatus === 'deposited') {
      if (!bulkDepositAmount) {
        toast.error('الرجاء إدخال رصيد الإيداع');
        return;
      }
      if (!bulkPaymentMethod) {
        toast.error('الرجاء اختيار طريقة الدفع');
        return;
      }
      if (bulkPaymentMethod === 'bank' && !bulkBankAccountId) {
        toast.error('الرجاء اختيار الحساب البنكي');
        return;
      }
    }
    if (bulkNewStatus === 'executed' && !bulkFinalBalance) {
      toast.error('الرجاء إدخال الرصيد النهائي');
      return;
    }

    const depositNum = parseFloat(bulkDepositAmount);
    const finalNum = parseFloat(bulkFinalBalance);

    setCardsQueue(cardsQueue.map(item => ({
      ...item,
      newStatus: bulkNewStatus,
      depositAmount: bulkNewStatus === 'deposited' ? depositNum : item.depositAmount,
      finalBalance: bulkNewStatus === 'executed' ? finalNum : item.finalBalance,
      paymentMethod: bulkNewStatus === 'deposited' ? (bulkPaymentMethod as 'cash' | 'bank') : item.paymentMethod,
      currency: bulkNewStatus === 'deposited' && bulkPaymentMethod === 'cash' ? bulkCurrency : item.currency,
      bankAccountId: bulkNewStatus === 'deposited' && bulkPaymentMethod === 'bank' ? bulkBankAccountId : item.bankAccountId,
    })));

    toast.success('تم تطبيق الحالة على جميع البطاقات');
    setShowBulkDialog(false);
  };

  // تطبيق الحالة على الجميع (القديم)
  const handleApplyGlobalStatus = () => {
    if (!globalStatus) {
      toast.error('الرجاء اختيار حالة');
      return;
    }
    setCardsQueue(cardsQueue.map(item => ({ ...item, newStatus: globalStatus })));
    toast.success('تم تطبيق الحالة على جميع البطاقات');
  };

  // حفظ التغييرات
  const handleSaveAll = () => {
    if (cardsQueue.length === 0) {
      toast.error('لا توجد بطاقات في القائمة');
      return;
    }

    let successCount = 0;
    cardsQueue.forEach(item => {
      // حفظ الحالة القديمة للتسجيل
      const oldStatus = item.customer.operationStatus;
      const oldBalance = item.card.balance;

      // تحديث حالة العملية
      if (item.newStatus !== item.customer.operationStatus) {
        customersCtx.updateCustomer(item.customer.id, { operationStatus: item.newStatus as any });
        successCount++;

        // تسجيل العملية في Audit Trail
        addAuditTrail({
          action: 'bulk_status_change',
          entityType: 'card',
          entityId: item.customer.id,
          userId: user?.id?.toString() || 'system',
          userName: user?.fullName || 'النظام',
          status: 'success',
          details: {
            before: {
              status: oldStatus,
              balance: oldBalance,
            },
            after: {
              status: item.newStatus,
              balance: item.finalBalance || item.depositAmount || oldBalance,
            },
            description: `تغيير حالة بطاقة ${item.card.cardNumber} من "${getOperationStatusText(oldStatus)}" إلى "${getOperationStatusText(item.newStatus)}"${item.depositAmount ? ` - رصيد الإيداع: ${item.depositAmount} د.ل` : ''}${item.finalBalance ? ` - الرصيد النهائي: ${item.finalBalance}$` : ''}`,
          },
        });
      }

      // تحديث رصيد الإيداع وتسجيل المعاملة في الخزينة
      if (item.newStatus === 'deposited' && item.depositAmount !== undefined) {
        customersCtx.updateCard(item.card.id, { balance: item.depositAmount });
        
        // تسجيل الإيداع في الخزينة (نقص من الكاش أو البنك)
        recordDepositMutation.mutate({
          customerId: item.customer.id,
          customerName: item.customer.name,
          depositAmount: item.depositAmount,
          paymentMethod: item.paymentMethod || 'cash',
          currency: item.paymentMethod === 'cash' ? (item.currency || 'LYD') : undefined,
          bankAccountId: item.paymentMethod === 'bank' ? item.bankAccountId : undefined,
          processedBy: user?.id?.toString() || 'system',
          processedByName: user?.fullName || 'النظام',
        });
      }

      // تحديث الرصيد النهائي
      if (item.newStatus === 'executed' && item.finalBalance !== undefined) {
        customersCtx.updateCard(item.card.id, { balance: item.finalBalance });
      }
    });

    toast.success(`تم تحديث ${successCount} بطاقة بنجاح`);
    setCardsQueue([]);
  };

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
    };
    return statusMap[status] || status;
  };

  return (
    <div className="min-h-screen bg-white p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">تغيير الحالات الجماعي</h1>
          <p className="text-gray-600 mt-1">تحديث حالات مجموعة من البطاقات دفعة واحدة</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setLocation('/cards')}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          العودة
        </Button>
      </div>

      {/* Input Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>إضافة بطاقات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label>رقم البطاقة</Label>
                <Input
                  placeholder="أدخل رقم البطاقة أو امسح الباركود"
                  value={cardNumberInput}
                  onChange={(e) => setCardNumberInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddCard();
                    }
                  }}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={handleAddCard} className="gap-2">
                  <Plus className="w-4 h-4" />
                  إضافة
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => setShowScanner(true)}>
                  <ScanLine className="w-4 h-4" />
                  مسح
                </Button>
              </div>
            </div>

            {/* Global Status Selector */}
            {cardsQueue.length > 0 && (
              <div className="flex gap-2 items-end pt-4 border-t">
                <div className="flex-1">
                  <Label>تطبيق حالة على الجميع</Label>
                  <Select value={globalStatus} onValueChange={setGlobalStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الحالة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="purchased">تم الشراء</SelectItem>
                      <SelectItem value="awaiting_match">في إنتظار المطابقة</SelectItem>
                      <SelectItem value="matched">تمت المطابقة</SelectItem>
                      <SelectItem value="not_matched">غير مطابق</SelectItem>
                      <SelectItem value="reserved">تم الحجز</SelectItem>
                      <SelectItem value="deposited">تم الإيداع</SelectItem>
                      <SelectItem value="awaiting_execution">في انتظار التنفيذ</SelectItem>
                      <SelectItem value="executed">تم التنفيذ</SelectItem>
                      <SelectItem value="partial_withdrawal">تم السحب مع وجود متبقي</SelectItem>
                      <SelectItem value="full_withdrawal">تم السحب بالكامل</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleApplyGlobalStatus} variant="secondary">
                  تطبيق
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cards Queue Table */}
      {cardsQueue.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>البطاقات المحددة ({cardsQueue.length})</CardTitle>
              <div className="flex gap-2">
                <Button onClick={handleOpenBulkDialog} variant="secondary" className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  تغيير الحالة للجميع
                </Button>
                <Button onClick={handleSaveAll} className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  حفظ التغييرات
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-right p-3 font-semibold text-gray-700">اسم الزبون</th>
                    <th className="text-right p-3 font-semibold text-gray-700">رقم البطاقة</th>
                    <th className="text-right p-3 font-semibold text-gray-700">الحالة الحالية</th>
                    <th className="text-right p-3 font-semibold text-gray-700">الحالة الجديدة</th>
                    <th className="text-right p-3 font-semibold text-gray-700">رصيد الإيداع</th>
                    <th className="text-right p-3 font-semibold text-gray-700">طريقة الدفع</th>
                    <th className="text-right p-3 font-semibold text-gray-700">العملة</th>
                    <th className="text-right p-3 font-semibold text-gray-700">الحساب البنكي</th>
                    <th className="text-right p-3 font-semibold text-gray-700">الرصيد النهائي</th>
                    <th className="text-center p-3 font-semibold text-gray-700">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {cardsQueue.map((item) => (
                    <tr key={item.card.id} className="border-b hover:bg-amber-50">
                      <td className="p-3">{item.customer.name}</td>
                      <td className="p-3">{item.card.cardNumber}</td>
                      <td className="p-3">
                        <span className="inline-block px-2 py-1 text-xs rounded-full bg-amber-100 text-gray-700">
                          {getOperationStatusText(item.customer.operationStatus)}
                        </span>
                      </td>
                      <td className="p-3">
                        <Select 
                          value={item.newStatus} 
                          onValueChange={(val) => handleUpdateCardStatus(item.card.id, val)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="purchased">تم الشراء</SelectItem>
                            <SelectItem value="awaiting_match">في إنتظار المطابقة</SelectItem>
                            <SelectItem value="matched">تمت المطابقة</SelectItem>
                            <SelectItem value="not_matched">غير مطابق</SelectItem>
                            <SelectItem value="reserved">تم الحجز</SelectItem>
                            <SelectItem value="deposited">تم الإيداع</SelectItem>
                            <SelectItem value="awaiting_execution">في انتظار التنفيذ</SelectItem>
                            <SelectItem value="executed">تم التنفيذ</SelectItem>
                            <SelectItem value="partial_withdrawal">تم السحب مع وجود متبقي</SelectItem>
                            <SelectItem value="full_withdrawal">تم السحب بالكامل</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-3">
                        {item.newStatus === 'deposited' && (
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={item.depositAmount || ''}
                            onChange={(e) => handleUpdateDepositAmount(item.card.id, e.target.value)}
                            className="w-32"
                          />
                        )}
                      </td>
                      <td className="p-3">
                        {item.newStatus === 'deposited' && (
                          <Select
                            value={item.paymentMethod || 'cash'}
                            onValueChange={(val) => handleUpdatePaymentMethod(item.card.id, val as 'cash' | 'bank')}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">كاش</SelectItem>
                              <SelectItem value="bank">مصرفي</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </td>
                      <td className="p-3">
                        {item.newStatus === 'deposited' && item.paymentMethod === 'cash' && (
                          <Select
                            value={item.currency || 'LYD'}
                            onValueChange={(val) => handleUpdateCurrency(item.card.id, val as 'LYD' | 'USD')}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="LYD">دينار</SelectItem>
                              <SelectItem value="USD">دولار</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </td>
                      <td className="p-3">
                        {item.newStatus === 'deposited' && item.paymentMethod === 'bank' && (
                          <Select
                            value={item.bankAccountId || ''}
                            onValueChange={(val) => handleUpdateBankAccount(item.card.id, val)}
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="اختر الحساب" />
                            </SelectTrigger>
                            <SelectContent>
                              {bankAccounts.map((acc: any) => (
                                <SelectItem key={acc.id} value={acc.id}>
                                  {acc.bankName} - {acc.accountNumber}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </td>
                      <td className="p-3">
                        {item.newStatus === 'executed' && (
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={item.finalBalance || ''}
                            onChange={(e) => handleUpdateFinalBalance(item.card.id, e.target.value)}
                            className="w-32"
                          />
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveCard(item.card.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {cardsQueue.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <RefreshCw className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">لا توجد بطاقات في القائمة</p>
              <p className="text-sm mt-1">أدخل رقم البطاقة أو امسح الباركود لإضافة بطاقات</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* نافذة تغيير الحالة الجماعية */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تغيير الحالة لجميع البطاقات</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>الحالة الجديدة</Label>
              <Select value={bulkNewStatus} onValueChange={setBulkNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="purchased">تم الشراء</SelectItem>
                  <SelectItem value="awaiting_match">في إنتظار المطابقة</SelectItem>
                  <SelectItem value="matched">تمت المطابقة</SelectItem>
                  <SelectItem value="not_matched">غير مطابق</SelectItem>
                  <SelectItem value="reserved">تم الحجز</SelectItem>
                  <SelectItem value="deposited">تم الإيداع</SelectItem>
                  <SelectItem value="awaiting_execution">في انتظار التنفيذ</SelectItem>
                  <SelectItem value="executed">تم التنفيذ</SelectItem>
                  <SelectItem value="partial_withdrawal">تم السحب مع وجود متبقي</SelectItem>
                  <SelectItem value="full_withdrawal">تم السحب بالكامل</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {bulkNewStatus === 'deposited' && (
              <>
                <div>
                  <Label>رصيد الإيداع (د.ل)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={bulkDepositAmount}
                    onChange={(e) => setBulkDepositAmount(e.target.value)}
                  />
                </div>
                <div>
                  <Label>طريقة الدفع</Label>
                  <Select value={bulkPaymentMethod} onValueChange={setBulkPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر طريقة الدفع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">كاش</SelectItem>
                      <SelectItem value="bank">مصرفي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {bulkPaymentMethod === 'cash' && (
                  <div>
                    <Label>العملة</Label>
                    <Select value={bulkCurrency} onValueChange={(val) => setBulkCurrency(val as 'LYD' | 'USD')}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر العملة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LYD">دينار</SelectItem>
                        <SelectItem value="USD">دولار</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {bulkPaymentMethod === 'bank' && (
                  <div>
                    <Label>الحساب البنكي</Label>
                    <Select value={bulkBankAccountId} onValueChange={setBulkBankAccountId}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الحساب البنكي" />
                      </SelectTrigger>
                      <SelectContent>
                        {bankAccounts.map((acc: any) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.bankName} - {acc.accountNumber}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            {bulkNewStatus === 'executed' && (
              <div>
                <Label>الرصيد النهائي ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={bulkFinalBalance}
                  onChange={(e) => setBulkFinalBalance(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
              إلغاء
            </Button>
            <Button onClick={handleApplyBulkStatus}>
              تطبيق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Barcode Scanner */}
      <BarcodeScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={(cardNumber) => {
          setCardNumberInput(cardNumber);
          // إضافة البطاقة تلقائياً بعد المسح
          setTimeout(() => {
            handleAddCard();
          }, 100);
        }}
      />
    </div>
  );
}
