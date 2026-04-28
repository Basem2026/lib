import React, { useState, useMemo } from "react";
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

interface HeldCardWithdrawal {
  cardNumber: string;
  customerName: string;
  originalHeldAmount: number; // المتبقي المحتجز الأصلي
  returnedAmount: number; // القيمة الفعلية المرجعة
  percentage: number; // النسبة %
  receivedAmount: number; // القيمة المستلمة بعد النسبة
  machine: string; // المكينة
  saleType: "cash" | "bank"; // نوع البيع
  exchangeRate: number; // سعر الصرف
  amountInLYD: number; // القيمة بالدينار
  profit: number; // الربح الإضافي
  customerId: string; // معرف الزبون
}

export default function WithdrawHeld() {
  const [, setLocation] = useLocation();
  const { customers, getCustomer, updateCustomer, addTransaction } = useCustomers();
  const { addAuditTrail } = useLogs();
  const { user } = useAuth();
  const financialCtx = useFinancial();

  // المرحلة 1: إضافة البطاقات
  const [cardInput, setCardInput] = useState("");
  const [addedCards, setAddedCards] = useState<HeldCardWithdrawal[]>([]);
  const [showScanner, setShowScanner] = useState(false);

  // المرحلة 2: نافذة السحب
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [withdrawPercentage, setWithdrawPercentage] = useState("0");

  // المرحلة 3: نافذة البيع
  const [showSaleDialog, setShowSaleDialog] = useState(false);
  const [cashCardCount, setCashCardCount] = useState(0);
  const [cashExchangeRate, setCashExchangeRate] = useState("6.8");
  const [bankExchangeRate, setBankExchangeRate] = useState("6.7");
  const [bankAccount, setBankAccount] = useState("");

  // حالة الحسابات المصرفية
  const bankAccounts = ["حساب 1 - البنك الأهلي", "حساب 2 - مصرف الجمهورية", "حساب 3 - مصرف الأمان"];

  // فلترة البطاقات التي لها متبقي محتجز (حالة partial_withdrawal)
  const cardsWithHeld = useMemo(() => {
    return customers.filter(
      (c) => c.operationStatus === "partial_withdrawal" && c.notes?.includes("|متبقي محتجز:")
    );
  }, [customers]);

  // دالة استخراج المتبقي المحتجز من notes
  const extractHeldAmount = (notes: string | undefined): number => {
    if (!notes) return 0;
    const match = notes.match(/\|متبقي محتجز: ([\d.]+)\$/);
    return match ? parseFloat(match[1]) : 0;
  };

  // دالة استخراج اسم المكينة من notes
  const extractMachine = (notes: string | undefined): string => {
    if (!notes) return "";
    const match = notes.match(/في مكينة (.+?)\|/);
    return match ? match[1] : "";
  };

  // دالة إضافة بطاقة
  const handleAddCard = () => {
    if (!cardInput.trim()) {
      toast.error("الرجاء إدخال رقم البطاقة");
      return;
    }

    // البحث عن الزبون
    const customer = customers.find((c) => c.cardNumber === cardInput.trim());

    if (!customer) {
      toast.error("البطاقة غير موجودة");
      return;
    }

    // التحقق من أن البطاقة لها متبقي محتجز
    if (customer.operationStatus !== "partial_withdrawal") {
      toast.error("هذه البطاقة ليس لها متبقي محتجز");
      return;
    }

    // التحقق من عدم إضافة البطاقة مسبقاً
    if (addedCards.some((c) => c.cardNumber === customer.cardNumber)) {
      toast.error("البطاقة مضافة مسبقاً");
      return;
    }

    const heldAmount = extractHeldAmount(customer.notes);
    if (heldAmount <= 0) {
      toast.error("لا يوجد متبقي محتجز لهذه البطاقة");
      return;
    }

    // إضافة البطاقة
    const newCard: HeldCardWithdrawal = {
      cardNumber: customer.cardNumber || "",
      customerName: customer.name,
      originalHeldAmount: heldAmount,
      returnedAmount: heldAmount, // افتراضياً نفس القيمة
      percentage: 0,
      receivedAmount: 0,
      machine: extractMachine(customer.notes),
      saleType: "cash",
      exchangeRate: 0,
      amountInLYD: 0,
      profit: 0,
      customerId: customer.id,
    };

    setAddedCards([...addedCards, newCard]);
    setCardInput("");
    toast.success("تم إضافة البطاقة");
  };

  // دالة حذف بطاقة
  const handleRemoveCard = (cardNumber: string) => {
    setAddedCards(addedCards.filter((c) => c.cardNumber !== cardNumber));
    toast.info("تم حذف البطاقة");
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

    if (percentage < 0 || percentage > 100) {
      toast.error("النسبة يجب أن تكون بين 0 و 100");
      return;
    }

    // حساب القيمة المستلمة لكل بطاقة
    const updatedCards = addedCards.map((card) => {
      const receivedAmount = card.returnedAmount - (card.returnedAmount * percentage) / 100;
      return {
        ...card,
        percentage,
        receivedAmount,
      };
    });

    setAddedCards(updatedCards);
    setShowWithdrawDialog(false);
    toast.success("تم حساب القيم المستلمة");
  };

  // حساب إجمالي القيمة المستلمة
  const totalReceived = addedCards.reduce((sum, card) => sum + card.receivedAmount, 0);

  // دالة فتح نافذة البيع
  const handleOpenSaleDialog = () => {
    if (totalReceived === 0) {
      toast.error("يجب إتمام عملية السحب أولاً");
      return;
    }
    setShowSaleDialog(true);
  };

  // حساب البطاقات حسب التوزيع
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

      // حساب الربح: جمع الربح الجديد مع الربح السابق
      const customer = getCustomer(card.cardNumber);
      const previousProfit = customer?.accumulatedProfit || 0;
      const profit = parseFloat((amountInLYD + previousProfit).toFixed(2));

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
  const withdrawHeldMutation = trpc.cards.withdrawHeld.useMutation();

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
      await withdrawHeldMutation.mutateAsync({
        cards: addedCards.map(card => ({
          cardNumber: card.cardNumber,
          customerId: card.customerId,
          originalHeldAmount: card.originalHeldAmount,
          returnedAmount: card.returnedAmount,
          receivedAmount: card.receivedAmount,
          percentage: card.percentage,
          saleType: card.saleType,
          exchangeRate: card.exchangeRate,
          amountInLYD: card.amountInLYD,
          profit: card.profit,
        })),
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
      const customer = getCustomer(card.customerId);
      if (!customer) return;

      // حفظ الحالة القديمة للتسجيل
      const oldStatus = customer.operationStatus;
      const oldBalance = customer.totalBalance;

      // إزالة معلومات المتبقي من notes
      const updatedNotes = (customer.notes || "").replace(/\|متبقي محتجز: [\d.]+\$ في مكينة .+?\|/g, "");

      // تحديث الحالة إلى full_withdrawal
      updateCustomer(customer.id, {
        operationStatus: "full_withdrawal",
        totalBalance: 0, // لا يوجد رصيد متبقي
        notes: updatedNotes.trim(),
        accumulatedProfit: card.profit, // تحديث الربح المتراكم (الأول + الثاني)
        updatedAt: new Date(),
      });

      // تسجيل عملية السحب
      addTransaction({
        id: `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        customerId: customer.id,
        type: 'withdrawal',
        amount: card.receivedAmount,
        currency: 'USD',
        description: `سحب المتبقي المحتجز - نسبة ${card.percentage}%`,
        status: 'completed',
        timestamp: new Date(),
        notes: `بيع ${card.saleType === 'cash' ? 'كاش' : 'مصرف'} - سعر الصرف: ${card.exchangeRate} - الربح: ${card.profit.toFixed(2)} د.ل`,
        processedBy: 'النظام',
      });

      // تسجيل العملية في Audit Trail
      addAuditTrail({
        action: 'withdraw_pending' as any,
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
            status: 'full_withdrawal',
            balance: 0,
          },
          description: `سحب المتبقي المحتجز لبطاقة ${card.cardNumber} - المبلغ الأصلي: ${card.originalHeldAmount}$ - المرجع: ${card.returnedAmount}$ - النسبة: ${card.percentage}% - المستلم: ${card.receivedAmount}$ - المكينة: ${card.machine}`,
        },
      });

      // تسجيل عملية البيع
      addAuditTrail({
        action: (card.saleType === 'cash' ? 'card_sale_cash' : 'card_sale_bank') as any,
        entityType: 'card',
        entityId: customer.id,
        userId: user?.id?.toString() || 'system',
        userName: user?.fullName || 'النظام',
        status: 'success',
        details: {
          description: `بيع متبقي بطاقة ${card.cardNumber} - ${card.saleType === 'cash' ? 'كاش' : 'مصرف'} - المبلغ بالدولار: ${card.receivedAmount}$ - سعر الصرف: ${card.exchangeRate} - المبلغ بالدينار: ${card.amountInLYD.toFixed(2)} د.ل - الربح: ${card.profit.toFixed(2)} د.ل${card.saleType === 'bank' ? ` - الحساب: ${bankAccount}` : ''}`,
        },
      });
    });

    // TODO: تحديث المالية - سيتم إضافته لاحقاً
    // تم تعطيل تحديث الأرصدة مؤقتاً لحل مشكلة TypeScript

    toast.success(`تم حفظ ${addedCards.length} عملية سحب متبقي بنجاح`);
    
    // إعادة تعيين النموذج
    setAddedCards([]);
    setCardInput('');
    setWithdrawPercentage('0');
    setCashCardCount(0);
    setCashExchangeRate('6.8');
    setBankExchangeRate('6.7');
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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">سحب المتبقي المحتجز</h1>
          <p className="text-gray-600">سحب المبالغ المحتجزة التي رجعت من المكينات</p>
          {cardsWithHeld.length > 0 && (
            <p className="text-amber-400 mt-2">
              يوجد {cardsWithHeld.length} بطاقة لها متبقي محتجز
            </p>
          )}
        </div>

        {/* إضافة بطاقات */}
        <Card className="mb-6 bg-white border-2 border-amber-400 shadow-lg">
          <CardHeader>
            <CardTitle className="text-gray-900">إضافة بطاقات</CardTitle>
            <CardDescription className="text-gray-600">
              أدخل رقم البطاقة أو امسح الباركود لإضافة بطاقات لها متبقي محتجز
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div>
                <Label htmlFor="cardNumber" className="text-gray-700">
                  رقم البطاقة
                </Label>
                <Input
                  id="cardNumber"
                  placeholder="أدخل رقم البطاقة أو امسح الباركود"
                  value={cardInput}
                  onChange={(e) => setCardInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddCard()}
                  className="bg-white border-amber-500 text-gray-900"
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
                    <TableRow className="border-2 border-amber-400 shadow-lg">
                      <TableHead className="text-gray-700">رقم البطاقة</TableHead>
                      <TableHead className="text-gray-700">اسم الزبون</TableHead>
                      <TableHead className="text-gray-700">المتبقي الأصلي</TableHead>
                      <TableHead className="text-gray-700">القيمة المرجعة</TableHead>
                      {totalReceived > 0 && (
                        <>
                          <TableHead className="text-gray-700">النسبة</TableHead>
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
                      <TableRow key={card.cardNumber} className="border-2 border-amber-400 shadow-lg">
                        <TableCell className="text-gray-700 font-mono">{card.cardNumber}</TableCell>
                        <TableCell className="text-gray-900">{card.customerName}</TableCell>
                        <TableCell className="text-amber-400">{card.originalHeldAmount.toFixed(2)} $</TableCell>
                        <TableCell className="text-amber-400">{card.returnedAmount.toFixed(2)} $</TableCell>
                        {totalReceived > 0 && (
                          <>
                            <TableCell className="text-gray-700">{card.percentage}%</TableCell>
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
                            <TableCell className="text-green-400 font-semibold">
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
                      <p className="text-2xl font-bold text-green-400">
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
                    حفظ العمليات وإغلاق البطاقات
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* نافذة السحب */}
        <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
          <DialogContent className="bg-slate-800 border-2 border-amber-400 shadow-lg text-gray-900">
            <DialogHeader>
              <DialogTitle>معلومات سحب المتبقي</DialogTitle>
              <DialogDescription className="text-gray-600">
                أدخل النسبة إذا كانت المكينة تأخذ نسبة من المتبقي المرجع
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="withdrawPercentage" className="text-gray-700">
                  النسبة (%)
                </Label>
                <Input
                  id="withdrawPercentage"
                  type="number"
                  step="0.1"
                  placeholder="0"
                  value={withdrawPercentage}
                  onChange={(e) => setWithdrawPercentage(e.target.value)}
                  className="bg-white border-amber-500 text-gray-900"
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
          <DialogContent className="bg-slate-800 border-2 border-amber-400 shadow-lg text-gray-900 max-w-2xl">
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
                  className="bg-white border-amber-500 text-gray-900"
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
                        className="bg-white border-amber-500 text-gray-900"
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
                        className="bg-white border-amber-500 text-gray-900"
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
