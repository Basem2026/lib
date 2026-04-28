import React, { useState } from "react";
import { useCustomers } from "@/contexts/CustomersContext";
import { useLogs } from "@/contexts/LogsContext";
import { useAuth } from "@/contexts/AuthContext";
import { useFinancial } from "@/contexts/FinancialContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Plus, ScanBarcode, DollarSign, TrendingUp } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import BarcodeScanner from "@/components/BarcodeScanner";

interface CardInWithdrawal {
  cardNumber: string;
  customerName: string;
  customerId: string; // معرف الزبون
  balance: number; // الرصيد الأصلي
  withdrawnAmount: number; // القيمة المسحوبة
  percentage: number; // النسبة %
  amountAfterPercentage: number; // المبلغ بعد النسبة
  heldAmount: number; // المتبقي المحتجز
  receivedAmount: number; // القيمة المستلمة فعلياً
  machine: string; // المكينة
  saleType: "cash" | "bank" | "split"; // نوع البيع
  cashAmount?: number; // مبلغ الكاش (للبطاقات المقسمة)
  bankAmount?: number; // مبلغ المصرف (للبطاقات المقسمة)
  exchangeRate: number; // سعر الصرف
  amountInLYD: number; // القيمة بالدينار
  profit: number; // الربح
  purchasePrice: number; // ثمن الشراء الإجمالي
  depositBalance: number; // رصيد الإيداع
}

export default function BulkWithdrawal() {
  const [, setLocation] = useLocation();
  const { customers, getCustomer, updateCustomer, addTransaction } = useCustomers();
  const { addAuditTrail } = useLogs();
  const { user } = useAuth();
  const financialCtx = useFinancial();

  // المرحلة 1: إضافة البطاقات
  const [cardInput, setCardInput] = useState("");
  const [addedCards, setAddedCards] = useState<CardInWithdrawal[]>([]);
  const [showScanner, setShowScanner] = useState(false);

  // المرحلة 2: نافذة السحب
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [withdrawPercentage, setWithdrawPercentage] = useState("5");
  const [heldAmount, setHeldAmount] = useState("0");
  const [machine, setMachine] = useState("");

  // المرحلة 3: نافذة البيع
  const [showSaleDialog, setShowSaleDialog] = useState(false);
  const [cashCardCount, setCashCardCount] = useState(0);
  const [cashExchangeRate, setCashExchangeRate] = useState("6.8");
  const [bankExchangeRate, setBankExchangeRate] = useState("6.7");
  const [bankAccount, setBankAccount] = useState("");

  // حالة الحسابات المصرفية (يمكن جلبها من context لاحقاً)
  const bankAccounts = ["حساب 1 - البنك الأهلي", "حساب 2 - مصرف الجمهورية", "حساب 3 - مصرف الأمان"];

  // دالة إضافة بطاقة
  const handleAddCard = () => {
    if (!cardInput.trim()) {
      toast.error("الرجاء إدخال رقم البطاقة");
      return;
    }

    // البحث عن الزبون بهذا الرقم
    const customer = customers.find((c) => c.cardNumber === cardInput.trim());
    if (!customer) {
      toast.error("البطاقة غير موجودة في النظام");
      return;
    }

    // التحقق من عدم تكرار البطاقة
    if (addedCards.some((c) => c.cardNumber === cardInput.trim())) {
      toast.error("البطاقة مضافة مسبقاً");
      return;
    }

    // التحقق من وجود رصيد
    if (!customer.totalBalance || customer.totalBalance <= 0) {
      toast.error("البطاقة ليس لها رصيد متاح");
      return;
    }

    // إضافة البطاقة بدون حساب (سيتم الحساب عند الضغط على زر "سحب")
    const newCard: CardInWithdrawal = {
      cardNumber: customer.cardNumber || "",
      customerName: customer.name,
      customerId: customer.id,
      balance: customer.totalBalance || 0,
      withdrawnAmount: 0,
      percentage: 0,
      amountAfterPercentage: 0,
      heldAmount: 0,
      receivedAmount: 0,
      machine: "",
      saleType: "cash",
      exchangeRate: 0,
      amountInLYD: 0,
      profit: 0,
      purchasePrice: (customer.purchasePrice || 0) + (customer.delegateShare || 0),
      depositBalance: 0, // سيتم حسابه من المعاملات لاحقاً
    };

    setAddedCards([...addedCards, newCard]);
    setCardInput("");
    toast.success("تم إضافة البطاقة بنجاح");
  };

  // دالة حذف بطاقة
  const handleRemoveCard = (cardNumber: string) => {
    setAddedCards(addedCards.filter((c) => c.cardNumber !== cardNumber));
    toast.success("تم حذف البطاقة");
  };

  // دالة فتح نافذة السحب
  const handleOpenWithdrawDialog = () => {
    if (addedCards.length === 0) {
      toast.error("الرجاء إضافة بطاقات أولاً");
      return;
    }
    setShowWithdrawDialog(true);
  };

  // دالة تطبيق السحب
  const handleApplyWithdraw = () => {
    const percentage = parseFloat(withdrawPercentage) || 0;
    const held = parseFloat(heldAmount) || 0;

    if (!machine.trim()) {
      toast.error("الرجاء إدخال اسم المكينة");
      return;
    }

    if (percentage < 0 || percentage > 100) {
      toast.error("النسبة يجب أن تكون بين 0 و 100");
      return;
    }

    // حساب القيمة المستلمة لكل بطاقة
    const updatedCards = addedCards.map((card) => {
      const withdrawnAmount = card.balance; // نسحب كامل الرصيد
      // المعادلة الصحيحة: (الرصيد - النسبة%) - المتبقي
      const afterPercentage = card.balance - (card.balance * percentage / 100);
      const receivedAmount = afterPercentage - held;

      return {
        ...card,
        withdrawnAmount,
        percentage,
        heldAmount: held,
        receivedAmount,
        machine,
      };
    });

    setAddedCards(updatedCards);
    setShowWithdrawDialog(false);
    toast.success("تم حساب السحب بنجاح");
  };

  // حساب الإجماليات
  const totalReceived = addedCards.reduce((sum, card) => sum + card.receivedAmount, 0);

  // دالة فتح نافذة البيع
  const handleOpenSaleDialog = () => {
    if (addedCards.length === 0 || totalReceived === 0) {
      toast.error("الرجاء إجراء عملية السحب أولاً");
      return;
    }
    setCashCardCount(0); // إعادة تعيين
    setShowSaleDialog(true);
  };

  // حساب توزيع البطاقات
  const cashCards = addedCards.slice(0, cashCardCount);
  const bankCards = addedCards.slice(cashCardCount);
  const cashTotal = cashCards.reduce((sum, card) => sum + card.receivedAmount, 0);
  const bankTotal = bankCards.reduce((sum, card) => sum + card.receivedAmount, 0);

  // دالة تطبيق البيع
  const handleApplySale = () => {
    const cashRate = parseFloat(cashExchangeRate) || 0;
    const bankRate = parseFloat(bankExchangeRate) || 0;

    if (cashCardCount > 0 && cashRate <= 0) {
      toast.error("الرجاء إدخال سعر صرف الكاش");
      return;
    }

    if (bankCards.length > 0 && bankRate <= 0) {
      toast.error("الرجاء إدخال سعر صرف المصرف");
      return;
    }

    if (bankCards.length > 0 && !bankAccount) {
      toast.error("الرجاء اختيار الحساب البنكي");
      return;
    }

    // حساب الربح لكل بطاقة
    const updatedCards = addedCards.map((card, index) => {
      let saleType: "cash" | "bank" = "cash";
      let exchangeRate = cashRate;
      let amountInLYD = 0;

      if (index < cashCardCount) {
        // بطاقة كاش
        saleType = "cash";
        exchangeRate = cashRate;
        amountInLYD = card.receivedAmount * cashRate;
      } else {
        // بطاقة مصرف
        saleType = "bank";
        exchangeRate = bankRate;
        amountInLYD = card.receivedAmount * bankRate;
      }

      // المعادلة الصحيحة: الربح = القيمة بالدينار - قيمة الإيداع - قيمة الشراء الإجمالية
      const profit = amountInLYD - card.depositBalance - card.purchasePrice;

      return {
        ...card,
        saleType,
        exchangeRate,
        amountInLYD,
        profit,
      };
    });

    setAddedCards(updatedCards);
    setShowSaleDialog(false);
    toast.success("تم حساب البيع والربح بنجاح");
  };

  // حساب الإجماليات النهائية
  const totalCashLYD = addedCards
    .filter((c) => c.saleType === "cash")
    .reduce((sum, card) => sum + card.amountInLYD, 0);
  const totalBankLYD = addedCards
    .filter((c) => c.saleType === "bank")
    .reduce((sum, card) => sum + card.amountInLYD, 0);
  const totalProfit = addedCards.reduce((sum, card) => sum + card.profit, 0);

  // استدعاء procedure من Backend
  const bulkWithdrawalMutation = trpc.cards.bulkWithdrawal.useMutation();

  // دالة حفظ العمليات
  const handleSaveWithdrawal = async () => {
    if (addedCards.length === 0) {
      toast.error("لا توجد بطاقات لحفظها");
      return;
    }

    if (totalReceived === 0) {
      toast.error("يجب إتمام عملية السحب أولاً");
      return;
    }

    if (totalCashLYD === 0 && totalBankLYD === 0) {
      toast.error("يجب إتمام عملية البيع أولاً");
      return;
    }

    // استدعاء Backend لحفظ العمليات
    try {
      // تحويل البطاقات للفورمات المطلوب (تقسيم split إلى cash و bank)
      const cardsForBackend = addedCards.flatMap(card => {
        if (card.saleType === 'split') {
          // تقسيم البطاقة إلى معاملتين
          return [
            {
              cardNumber: card.cardNumber,
              customerId: card.customerId,
              withdrawnAmount: card.withdrawnAmount,
              receivedAmount: card.cashAmount || 0,
              heldAmount: card.heldAmount,
              percentage: card.percentage,
              machine: card.machine,
              saleType: 'cash' as const,
              exchangeRate: card.exchangeRate,
              amountInLYD: (card.cashAmount || 0) * card.exchangeRate,
              profit: card.profit * ((card.cashAmount || 0) / card.receivedAmount),
              depositBalance: card.depositBalance,
              purchasePrice: card.purchasePrice,
            },
            {
              cardNumber: card.cardNumber,
              customerId: card.customerId,
              withdrawnAmount: card.withdrawnAmount,
              receivedAmount: card.bankAmount || 0,
              heldAmount: card.heldAmount,
              percentage: card.percentage,
              machine: card.machine,
              saleType: 'bank' as const,
              exchangeRate: card.exchangeRate,
              amountInLYD: (card.bankAmount || 0) * card.exchangeRate,
              profit: card.profit * ((card.bankAmount || 0) / card.receivedAmount),
              depositBalance: card.depositBalance,
              purchasePrice: card.purchasePrice,
            },
          ];
        }
        return [{
          cardNumber: card.cardNumber,
          customerId: card.customerId,
          withdrawnAmount: card.withdrawnAmount,
          receivedAmount: card.receivedAmount,
          heldAmount: card.heldAmount,
          percentage: card.percentage,
          machine: card.machine,
          saleType: card.saleType as 'cash' | 'bank',
          exchangeRate: card.exchangeRate,
          amountInLYD: card.amountInLYD,
          profit: card.profit,
          depositBalance: card.depositBalance,
          purchasePrice: card.purchasePrice,
        }];
      });

      await bulkWithdrawalMutation.mutateAsync({
        cards: cardsForBackend,
        bankAccountId: bankAccount || undefined,
        createdBy: user?.id?.toString() || 'system',
        createdByName: user?.fullName || 'النظام',
      });

      toast.success(`تم ربط ${addedCards.length} عملية بالخزينة بنجاح`);
    } catch (error) {
      toast.error('فشل ربط العمليات بالخزينة');
      return;
    }

    // حفظ العمليات لكل بطاقة في Frontend
    addedCards.forEach((card) => {
      const customer = getCustomer(card.cardNumber);
      if (!customer) return;

      // حفظ الحالة القديمة للتسجيل
      const oldStatus = customer.operationStatus;
      const oldBalance = customer.totalBalance;

      // تحديث حالة البطاقة
      const newStatus = card.heldAmount > 0 ? 'partial_withdrawal' : 'full_withdrawal';
      
      // حفظ معلومات المتبقي في notes لاستخدامها لاحقاً
      const heldInfo = card.heldAmount > 0 
        ? `|متبقي محتجز: ${card.heldAmount.toFixed(2)}$ في مكينة ${card.machine}|`
        : '';
      
      const updatedNotes = (customer.notes || '') + heldInfo;

      // حساب الرصيد المتبقي بعد السحب
      // إذا سحب كامل: totalBalance = 0
      // إذا فيه متبقي: totalBalance = heldAmount
      const newTotalBalance = card.heldAmount; // الرصيد المتبقي فقط

      updateCustomer(customer.id, {
        operationStatus: newStatus,
        totalBalance: newTotalBalance, // ينسحب الرصيد ويبقى المتبقي فقط
        notes: updatedNotes,
        accumulatedProfit: card.profit, // حفظ الربح من السحب الأول
        updatedAt: new Date(),
      });

      // تسجيل عملية السحب
      addTransaction({
        id: `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        customerId: customer.id,
        type: 'withdrawal',
        amount: card.receivedAmount,
        currency: 'USD',
        description: `سحب عبر ${card.machine} - نسبة ${card.percentage}% - متبقي ${card.heldAmount}$`,
        status: 'completed',
        timestamp: new Date(),
        notes: `بيع ${card.saleType === 'cash' ? 'كاش' : 'مصرف'} - سعر الصرف: ${card.exchangeRate} - الربح: ${card.profit.toFixed(2)} د.ل`,
        processedBy: 'النظام',
      });

      // تسجيل العملية في Audit Trail
      addAuditTrail({
        action: 'bulk_withdrawal',
        entityType: 'card',
        entityId: customer.id,
        userId: user?.id?.toString() || 'system',
        userName: user?.fullName || 'النظام',
        status: 'success',
        details: {
          before: {
            status: oldStatus,
            balance: oldBalance,
          },
          after: {
            status: newStatus,
            balance: card.heldAmount,
          },
          description: `سحب بطاقة ${card.cardNumber} - المبلغ المسحوب: ${card.withdrawnAmount}$ - المستلم: ${card.receivedAmount}$ - النسبة: ${card.percentage}% - المتبقي: ${card.heldAmount}$ - المكينة: ${card.machine}`,
        },
      });

      // تسجيل عملية البيع
      addAuditTrail({
        action: card.saleType === 'cash' ? 'card_sale_cash' : 'card_sale_bank',
        entityType: 'card',
        entityId: customer.id,
        userId: user?.id?.toString() || 'system',
        userName: user?.fullName || 'النظام',
        status: 'success',
        details: {
          description: `بيع بطاقة ${card.cardNumber} - ${card.saleType === 'cash' ? 'كاش' : 'مصرف'} - المبلغ بالدولار: ${card.receivedAmount}$ - سعر الصرف: ${card.exchangeRate} - المبلغ بالدينار: ${card.amountInLYD.toFixed(2)} د.ل - الربح: ${card.profit.toFixed(2)} د.ل${card.saleType === 'bank' ? ` - الحساب: ${bankAccount}` : ''}`,
        },
      });
    });

    // تحديث المالية: تحديث أرصدة البطاقات
    if (financialCtx) {
      // تحديث رصيد الكاش للبطاقات (القيمة الكاملة بالدينار)
      if (totalCashLYD > 0) {
        financialCtx.updateCardsCashBalance(totalCashLYD);
      }
      
      // تحديث رصيد المصرف للبطاقات (القيمة الكاملة بالدينار)
      if (totalBankLYD > 0 && bankAccount) {
        financialCtx.updateCardsBankBalance(bankAccount, totalBankLYD);
      }
    }

    toast.success(`تم حفظ ${addedCards.length} عملية سحب بنجاح`);
    
    // إعادة تعيين النموذج
    setAddedCards([]);
    setCardInput('');
    setWithdrawPercentage('5');
    setHeldAmount('');
    setMachine('');
    setCashCardCount(0);
    setCashExchangeRate('');
    setBankExchangeRate('');
    setBankAccount('');
    
    // العودة لصفحة إدارة البطاقات
    setTimeout(() => setLocation('/cards'), 1500);
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/cards")}
            className="mb-4 text-amber-600 hover:text-amber-700"
          >
            <ArrowRight className="ml-2 h-4 w-4" />
            العودة
          </Button>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">سحب البطاقات الجماعي</h1>
          <p className="text-gray-600">سحب وبيع مجموعة من البطاقات دفعة واحدة مع حساب الربح</p>
        </div>

        {/* إضافة بطاقات */}
        <Card className="mb-6 bg-white border-2 border-amber-400 shadow-lg">
          <CardHeader>
            <CardTitle className="text-gray-900">إضافة بطاقات</CardTitle>
            <CardDescription className="text-gray-600">
              أدخل رقم البطاقة أو امسح الباركود لإضافة بطاقات
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <div className="flex-1">
                <Label htmlFor="cardNumber" className="text-gray-700">
                  رقم البطاقة
                </Label>
                <Input
                  id="cardNumber"
                  placeholder="أدخل رقم البطاقة أو امسح الباركود"
                  value={cardInput}
                  onChange={(e) => setCardInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddCard();
                  }}
                  className="bg-white border-gray-300 text-gray-900"
                />
              </div>
              <Button onClick={handleAddCard} className="mt-6 bg-amber-600 hover:bg-amber-700">
                <Plus className="ml-2 h-4 w-4" />
                إضافة
              </Button>
              <Button
                variant="outline"
                className="mt-6 border-amber-500 text-gray-700"
                onClick={() => setShowScanner(true)}
              >
                <ScanBarcode className="ml-2 h-4 w-4" />
                مسح
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* جدول البطاقات */}
        {addedCards.length > 0 && (
          <Card className="mb-6 bg-white border-2 border-amber-400 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-gray-900">البطاقات المحددة ({addedCards.length})</CardTitle>
                  {totalReceived > 0 && (
                    <CardDescription className="text-amber-400 font-semibold mt-2">
                      إجمالي القيمة المستلمة: {totalReceived.toFixed(2)} $
                    </CardDescription>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={handleOpenWithdrawDialog}
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={totalReceived > 0}
                  >
                    <DollarSign className="ml-2 h-4 w-4" />
                    سحب
                  </Button>
                  <Button
                    onClick={handleOpenSaleDialog}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={totalReceived === 0}
                  >
                    <TrendingUp className="ml-2 h-4 w-4" />
                    البيع
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-amber-600">
                      <TableHead className="text-gray-700">رقم البطاقة</TableHead>
                      <TableHead className="text-gray-700">اسم الزبون</TableHead>
                      <TableHead className="text-gray-700">الرصيد</TableHead>
                      {totalReceived > 0 && (
                        <>
                          <TableHead className="text-gray-700">النسبة</TableHead>
                          <TableHead className="text-gray-700">المتبقي</TableHead>
                          <TableHead className="text-gray-700">القيمة المستلمة</TableHead>
                          <TableHead className="text-gray-700">المكينة</TableHead>
                        </>
                      )}
                      {totalCashLYD > 0 || totalBankLYD > 0 ? (
                        <>
                          <TableHead className="text-gray-700">نوع البيع</TableHead>
                          <TableHead className="text-gray-700">القيمة بالدينار</TableHead>
                          <TableHead className="text-gray-700">الربح</TableHead>
                        </>
                      ) : null}
                      <TableHead className="text-gray-700">إجراء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {addedCards.map((card) => (
                      <TableRow key={card.cardNumber} className="border-amber-600">
                        <TableCell className="text-gray-700 font-mono">{card.cardNumber}</TableCell>
                        <TableCell className="text-gray-900">{card.customerName}</TableCell>
                        <TableCell className="text-amber-400">{card.balance.toFixed(2)} $</TableCell>
                        {totalReceived > 0 && (
                          <>
                            <TableCell className="text-gray-700">{card.percentage}%</TableCell>
                            <TableCell className="text-gray-700">{card.heldAmount.toFixed(2)} $</TableCell>
                            <TableCell className="text-green-400 font-semibold">
                              {card.receivedAmount.toFixed(2)} $
                            </TableCell>
                            <TableCell className="text-gray-700">{card.machine}</TableCell>
                          </>
                        )}
                        {totalCashLYD > 0 || totalBankLYD > 0 ? (
                          <>
                            <TableCell className="text-gray-700">
                              {card.saleType === "cash" ? "كاش" : "مصرف"}
                            </TableCell>
                            <TableCell className="text-blue-400">{card.amountInLYD.toFixed(2)} د.ل</TableCell>
                            <TableCell
                              className={card.profit >= 0 ? "text-green-400 font-semibold" : "text-red-400 font-semibold"}
                            >
                              {card.profit.toFixed(2)} د.ل
                            </TableCell>
                          </>
                        ) : null}
                        <TableCell>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRemoveCard(card.cardNumber)}
                          >
                            حذف
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* الإجماليات */}
              {(totalCashLYD > 0 || totalBankLYD > 0) && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-amber-50 border-amber-500">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm text-gray-700">إجمالي الكاش</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-blue-400">{totalCashLYD.toFixed(2)} د.ل</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-amber-50 border-amber-500">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm text-gray-700">إجمالي المصرف</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-blue-400">{totalBankLYD.toFixed(2)} د.ل</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-amber-50 border-amber-500">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm text-gray-700">إجمالي الربح</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p
                        className={`text-2xl font-bold ${totalProfit >= 0 ? "text-green-400" : "text-red-400"}`}
                      >
                        {totalProfit.toFixed(2)} د.ل
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* زر الحفظ */}
              {(totalCashLYD > 0 || totalBankLYD > 0) && (
                <div className="mt-6 flex justify-center">
                  <Button
                    onClick={handleSaveWithdrawal}
                    className="bg-green-600 hover:bg-green-700 text-lg px-8 py-6"
                    size="lg"
                  >
                    حفظ العمليات وتحديث الحالات
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* نافذة السحب */}
        <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
          <DialogContent className="bg-white border-2 border-amber-500">
            <DialogHeader>
              <DialogTitle>معلومات السحب</DialogTitle>
              <DialogDescription className="text-gray-600">
                أدخل النسبة والمتبقي المحتجز واسم المكينة
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="percentage" className="text-gray-700">
                  النسبة (%)
                </Label>
                <Input
                  id="percentage"
                  type="number"
                  placeholder="5"
                  value={withdrawPercentage}
                  onChange={(e) => setWithdrawPercentage(e.target.value)}
                  className="bg-white border-gray-300 text-gray-900"
                />
              </div>
              <div>
                <Label htmlFor="heldAmount" className="text-gray-700">
                  المتبقي المحتجز ($) - اختياري
                </Label>
                <Input
                  id="heldAmount"
                  type="number"
                  placeholder="0"
                  value={heldAmount}
                  onChange={(e) => setHeldAmount(e.target.value)}
                  className="bg-white border-gray-300 text-gray-900"
                />
              </div>
              <div>
                <Label htmlFor="machine" className="text-gray-700">
                  اسم المكينة
                </Label>
                <Input
                  id="machine"
                  placeholder="مثلاً: دبي، الأمان"
                  value={machine}
                  onChange={(e) => setMachine(e.target.value)}
                  className="bg-white border-gray-300 text-gray-900"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setShowWithdrawDialog(false)}>
                  إلغاء
                </Button>
                <Button onClick={handleApplyWithdraw} className="bg-blue-600 hover:bg-blue-700">
                  تطبيق
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* نافذة البيع */}
        <Dialog open={showSaleDialog} onOpenChange={setShowSaleDialog}>
          <DialogContent className="bg-white border-2 border-amber-500 max-w-2xl">
            <DialogHeader>
              <DialogTitle>توزيع البيع</DialogTitle>
              <DialogDescription className="text-gray-600">
                حدد عدد البطاقات لكل نوع بيع وأدخل سعر الصرف
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* تحديد عدد البطاقات */}
              <div>
                <Label htmlFor="cashCardCount" className="text-gray-700">
                  عدد بطاقات الكاش (من {addedCards.length})
                </Label>
                <Input
                  id="cashCardCount"
                  type="number"
                  min="0"
                  max={addedCards.length}
                  value={cashCardCount}
                  onChange={(e) => setCashCardCount(Math.min(addedCards.length, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="bg-white border-gray-300 text-gray-900"
                />
                <p className="text-sm text-gray-600 mt-1">
                  عدد بطاقات المصرف: {addedCards.length - cashCardCount}
                </p>
              </div>

              {/* معلومات الكاش */}
              {cashCardCount > 0 && (
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-500">
                  <h3 className="text-lg font-semibold text-amber-400 mb-3">الكاش</h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-gray-700">القيمة بالدولار</Label>
                      <p className="text-xl font-bold text-gray-900">{cashTotal.toFixed(2)} $</p>
                    </div>
                    <div>
                      <Label htmlFor="cashExchangeRate" className="text-gray-700">
                        سعر الصرف
                      </Label>
                      <Input
                        id="cashExchangeRate"
                        type="number"
                        step="0.1"
                        placeholder="6.8"
                        value={cashExchangeRate}
                        onChange={(e) => setCashExchangeRate(e.target.value)}
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700">القيمة بالدينار</Label>
                      <p className="text-xl font-bold text-blue-400">
                        {(cashTotal * parseFloat(cashExchangeRate || "0")).toFixed(2)} د.ل
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* معلومات المصرف */}
              {bankCards.length > 0 && (
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-500">
                  <h3 className="text-lg font-semibold text-green-400 mb-3">المصرف</h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-gray-700">القيمة بالدولار</Label>
                      <p className="text-xl font-bold text-gray-900">{bankTotal.toFixed(2)} $</p>
                    </div>
                    <div>
                      <Label htmlFor="bankExchangeRate" className="text-gray-700">
                        سعر الصرف
                      </Label>
                      <Input
                        id="bankExchangeRate"
                        type="number"
                        step="0.1"
                        placeholder="6.7"
                        value={bankExchangeRate}
                        onChange={(e) => setBankExchangeRate(e.target.value)}
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bankAccount" className="text-gray-700">
                        الحساب البنكي
                      </Label>
                      <Select value={bankAccount} onValueChange={setBankAccount}>
                        <SelectTrigger className="bg-white border-amber-500 text-gray-900">
                          <SelectValue placeholder="اختر الحساب" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-amber-500">
                          {bankAccounts.map((account) => (
                            <SelectItem key={account} value={account} className="text-gray-900">
                              {account}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-gray-700">القيمة بالدينار</Label>
                      <p className="text-xl font-bold text-blue-400">
                        {(bankTotal * parseFloat(bankExchangeRate || "0")).toFixed(2)} د.ل
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* التحقق */}
              <div className="p-4 bg-amber-900/20 border border-amber-600 rounded-lg">
                <p className="text-amber-400 font-semibold">
                  ✅ إجمالي البيع: {(cashTotal + bankTotal).toFixed(2)} $ = {totalReceived.toFixed(2)} $
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setShowSaleDialog(false)}>
                  إلغاء
                </Button>
                <Button onClick={handleApplySale} className="bg-green-600 hover:bg-green-700">
                  تطبيق
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Barcode Scanner */}
      <BarcodeScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={(cardNumber) => {
          setCardInput(cardNumber);
          // إضافة البطاقة تلقائياً بعد المسح
          setTimeout(() => {
            const customer = customers.find((c) => c.cardNumber === cardNumber.trim());
            if (customer) {
              handleAddCard();
            }
          }, 100);
        }}
      />
    </div>
  );
}
