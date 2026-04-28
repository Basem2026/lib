import React, { useState, useEffect, useCallback } from "react";
import { useAccounts } from '@/contexts/AccountsContext';
import { useCompanyBankAccounts } from '@/contexts/CompanyBankAccountsContext';
import { useAuth } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2, TrendingUp, Wallet, DollarSign, Coins, ArrowUpCircle, ArrowDownCircle, ArrowRightLeft, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

/**
 * صفحة الخزينة - نظام مبسط مع 5 تبويبات:
 * 1. الحسابات البنكية
 * 2. الأرباح
 * 3. الكاش
 * 4. USDT
 * 5. الإدارة المالية (الرئيسي)
 */

export default function TreasuryPage() {
  const { user } = useAuth();
  
  // جلب جميع الحسابات والمعاملات من Backend
  const { data: allAccountsFromDB = [] } = trpc.treasury.getAllAccounts.useQuery();
  const { data: bankAccountsFromDB = [] } = trpc.treasury.getBankAccounts.useQuery();
  const { data: transactionsFromDB = [] } = trpc.treasury.getTransactions.useQuery();

  const [activeTab, setActiveTab] = useState('management');

  // دالة للحصول على رصيد حساب معين
  const getAccountBalance = (accountId: string, currency: 'LYD' | 'USD' | 'USDT' = 'LYD') => {
    const account = allAccountsFromDB.find((a: any) => a.id === accountId);
    if (!account) return 0;
    if (currency === 'LYD') return parseFloat(account.balanceLYD || '0');
    if (currency === 'USD') return parseFloat(account.balanceUSD || '0');
    if (currency === 'USDT') return parseFloat(account.balanceUSDT || '0');
    return 0;
  };

  // حساب إجماليات الحسابات البنكية
  const bankLydTotal = getAccountBalance('bank_aman_lyd', 'LYD');
  const bankUsdTotal = getAccountBalance('bank_aman_usd', 'USD');

  // حساب أرصدة الكاش
  const cashLydBalance = getAccountBalance('cash_lyd', 'LYD');
  const cashUsdBalance = getAccountBalance('cash_usd', 'USD');
  const usdtBalance = getAccountBalance('usdt', 'USDT');

  // حساب أرصدة الإدارة
  const capitalBalance = getAccountBalance('capital', 'LYD');
  const distributionBalance = getAccountBalance('distribution', 'LYD');
  const profitsBalance = getAccountBalance('profits', 'LYD');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="container max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">الخزينة</h1>
              <p className="text-slate-600">نظام إدارة الحسابات المالية - 8 حسابات رئيسية</p>
            </div>

          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex flex-wrap w-full gap-2 justify-start p-1">
            <TabsTrigger value="management" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 flex-shrink-0">
              <Building2 className="w-4 h-4 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">الإدارة المالية</span>
            </TabsTrigger>
            <TabsTrigger value="bank" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 flex-shrink-0">
              <Building2 className="w-4 h-4 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">الحسابات البنكية</span>
            </TabsTrigger>
            <TabsTrigger value="profits" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 flex-shrink-0">
              <TrendingUp className="w-4 h-4 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">الأرباح</span>
            </TabsTrigger>
            <TabsTrigger value="cash" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 flex-shrink-0">
              <Wallet className="w-4 h-4 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">الكاش</span>
            </TabsTrigger>
            <TabsTrigger value="usdt" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 flex-shrink-0">
              <Coins className="w-4 h-4 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">USDT</span>
            </TabsTrigger>
          </TabsList>

          {/* تبويب الإدارة المالية (الرئيسي) */}
          <TabsContent value="management">
            <ManagementTab
              capitalBalance={capitalBalance}
              distributionBalance={distributionBalance}
              profitsBalance={profitsBalance}
              user={user}
              companyBankAccounts={bankAccountsFromDB}
            />
          </TabsContent>

          {/* تبويب الحسابات البنكية */}
          <TabsContent value="bank">
            <BankAccountsTab
              bankLydTotal={bankLydTotal}
              bankUsdTotal={bankUsdTotal}
              companyBankAccounts={bankAccountsFromDB}
              transactions={transactionsFromDB}
            />
          </TabsContent>

          {/* تبويب الأرباح */}
          <TabsContent value="profits">
            <ProfitsTab
              profitsBalance={profitsBalance}
              transactions={transactionsFromDB}
            />
          </TabsContent>

          {/* تبويب الكاش */}
          <TabsContent value="cash">
            <CashTab
              cashLydBalance={cashLydBalance}
              cashUsdBalance={cashUsdBalance}
              transactions={transactionsFromDB}
            />
          </TabsContent>

          {/* تبويب USDT */}
          <TabsContent value="usdt">
            <USDTTab
              usdtBalance={usdtBalance}
              transactions={transactionsFromDB}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ==================== تبويب الإدارة المالية ====================
function ManagementTab({ capitalBalance, distributionBalance, profitsBalance, user, companyBankAccounts }: any) {
  const recordTransactionMutation = trpc.treasury.recordTransaction.useMutation();
  const utils = trpc.useUtils();
  const [capitalDialogOpen, setCapitalDialogOpen] = useState(false);
  const [transferCapitalDialogOpen, setTransferCapitalDialogOpen] = useState(false);
  const [transferDistributionDialogOpen, setTransferDistributionDialogOpen] = useState(false);

  const [capitalForm, setCapitalForm] = useState({
    amount: '',
    description: '',
  });

  const [transferCapitalForm, setTransferCapitalForm] = useState({
    amount: '',
    currency: 'LYD',
    description: '',
  });

  const [distributionForm, setDistributionForm] = useState({
    cash_lyd: '',
    cash_usd: '',
    bank_lyd_account: '', // رقم الحساب البنكي دينار
    bank_lyd: '',
    bank_usd_account: '', // رقم الحساب البنكي دولار
    bank_usd: '',
    usdt: '',
    description: '',
  });

  // إيداع رأس المال - يزيد رصيد capital فقط
  const depositCapitalMutation = trpc.treasury.depositCapital.useMutation({
    onSuccess: () => {
      toast.success('تم إيداع رأس المال بنجاح');
      setCapitalDialogOpen(false);
      setCapitalForm({ amount: '', description: '' });
      // إعادة تحميل البيانات
      utils.treasury.getAllAccounts.invalidate();
      utils.treasury.getTransactions.invalidate();
    },
    onError: (error) => {
      toast.error(`خطأ: ${error.message}`);
    },
  });

  const handleDepositCapital = () => {
    const amount = parseFloat(capitalForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('الرجاء إدخال مبلغ صحيح');
      return;
    }

    depositCapitalMutation.mutate({
      amount,
      description: capitalForm.description,
      processedByName: user?.fullName || 'مجهول',
    });
  };

  // تحويل من رأس المال إلى حساب التوزيع
  const transferFromCapitalMutation = trpc.treasury.transferFromCapital.useMutation({
    onSuccess: () => {
      toast.success('تم التحويل بنجاح');
      setTransferCapitalDialogOpen(false);
      setTransferCapitalForm({ amount: '', currency: 'LYD', description: '' });
      utils.treasury.getAllAccounts.invalidate();
      utils.treasury.getTransactions.invalidate();
    },
    onError: (error) => {
      toast.error(`خطأ: ${error.message}`);
    },
  });

  const handleTransferFromCapital = () => {
    const amount = parseFloat(transferCapitalForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('الرجاء إدخال مبلغ صحيح');
      return;
    }

    transferFromCapitalMutation.mutate({
      amount,
      toAccountId: 'distribution',
      description: transferCapitalForm.description,
      processedByName: user?.fullName || 'مجهول',
    });
  };

  // توزيع من حساب التوزيع إلى جميع الحسابات
  const recordDistributionMutation = trpc.treasury.distributeFromCapital.useMutation({
    onSuccess: () => {
      toast.success('تم التوزيع بنجاح');
      setTransferDistributionDialogOpen(false);
      setDistributionForm({ cash_lyd: '', cash_usd: '', bank_lyd_account: '', bank_lyd: '', bank_usd_account: '', bank_usd: '', usdt: '', description: '' });
      utils.treasury.getAllAccounts.invalidate();
      utils.treasury.getTransactions.invalidate();
    },
    onError: (error) => {
      toast.error(`خطأ: ${error.message}`);
    },
  });

  const handleDistribute = useCallback(() => {
    const cashLyd = parseFloat(distributionForm.cash_lyd) || 0;
    const cashUsd = parseFloat(distributionForm.cash_usd) || 0;
    const bankLyd = parseFloat(distributionForm.bank_lyd) || 0;
    const bankUsd = parseFloat(distributionForm.bank_usd) || 0;
    const usdt = parseFloat(distributionForm.usdt) || 0;


    recordDistributionMutation.mutate({
      cashLYD: cashLyd,
      cashUSD: cashUsd,
      bankLYD: bankLyd,
      bankUSD: bankUsd,
      usdt,
      description: distributionForm.description,
    });
  }, [distributionForm, recordDistributionMutation]);

  return (
    <div className="space-y-6">
      {/* الأرصدة */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              رأس المال
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{capitalBalance.toLocaleString()} د.ل</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-purple-600" />
              حساب التوزيع
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-600">{distributionBalance.toLocaleString()} د.ل</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              الأرباح
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{profitsBalance.toLocaleString()} د.ل</p>
          </CardContent>
        </Card>
      </div>

      {/* العمليات */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* زر إيداع رأس المال */}
        <Dialog open={capitalDialogOpen} onOpenChange={setCapitalDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="w-full h-auto py-4 text-base sm:text-lg text-white whitespace-normal" 
              style={{ backgroundColor: '#C9A34D' }}
            >
              <div className="flex flex-col items-center gap-2 flex-wrap">
                <ArrowUpCircle className="w-8 h-8" />
                <span>إيداع رأس المال</span>
              </div>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إيداع رأس المال</DialogTitle>
              <DialogDescription>
                يزيد رصيد حساب رأس المال فقط
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>المبلغ</Label>
                <Input
                  type="number"
                  value={capitalForm.amount}
                  onChange={(e) => setCapitalForm({ ...capitalForm, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label>الوصف</Label>
                <Textarea
                  value={capitalForm.description}
                  onChange={(e) => setCapitalForm({ ...capitalForm, description: e.target.value })}
                  placeholder="وصف العملية..."
                />
              </div>
              <Button onClick={handleDepositCapital} className="w-full">
                تأكيد الإيداع
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* زر تحويل من رأس المال إلى حساب التوزيع */}
        <Dialog open={transferCapitalDialogOpen} onOpenChange={setTransferCapitalDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="w-full h-auto py-4 text-base sm:text-lg text-white whitespace-normal" 
              style={{ backgroundColor: '#1E2E3D' }}
            >
              <div className="flex flex-col items-center gap-2 flex-wrap">
                <ArrowRightLeft className="w-8 h-8" />
                <span>تحويل من رأس المال</span>
              </div>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تحويل من رأس المال إلى حساب التوزيع</DialogTitle>
              <DialogDescription>
                ينقص من رأس المال + يزيد حساب التوزيع
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>المبلغ</Label>
                <Input
                  type="number"
                  value={transferCapitalForm.amount}
                  onChange={(e) => setTransferCapitalForm({ ...transferCapitalForm, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>العملة</Label>
                <Select value={transferCapitalForm.currency} onValueChange={(v) => setTransferCapitalForm({ ...transferCapitalForm, currency: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LYD">دينار ليبي</SelectItem>
                    <SelectItem value="USD">دولار أمريكي</SelectItem>
                    <SelectItem value="USDT">USDT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>الوصف</Label>
                <Textarea
                  value={transferCapitalForm.description}
                  onChange={(e) => setTransferCapitalForm({ ...transferCapitalForm, description: e.target.value })}
                  placeholder="وصف العملية..."
                />
              </div>
              <Button onClick={handleTransferFromCapital} className="w-full">
                تأكيد التحويل
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* زر التوزيع */}
        <Dialog open={transferDistributionDialogOpen} onOpenChange={setTransferDistributionDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="w-full h-auto py-4 text-base sm:text-lg text-white whitespace-normal" 
              style={{ backgroundColor: '#2E7D32' }}
            >
              <div className="flex flex-col items-center gap-2 flex-wrap">
                <ArrowDownCircle className="w-8 h-8" />
                <span>توزيع</span>
              </div>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>توزيع من حساب التوزيع</DialogTitle>
              <DialogDescription>
                ينقص الإجمالي من حساب التوزيع + يزيد كل حساب حسب المبلغ المدخل
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* كاش دينار */}
              <div className="grid grid-cols-2 gap-4 items-center p-4 border rounded-lg">
                <Label className="text-lg font-semibold">كاش دينار</Label>
                <Input
                  type="number"
                  value={distributionForm.cash_lyd}
                  onChange={(e) => setDistributionForm({ ...distributionForm, cash_lyd: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              {/* كاش دولار */}
              <div className="grid grid-cols-2 gap-4 items-center p-4 border rounded-lg">
                <Label className="text-lg font-semibold">كاش دولار</Label>
                <Input
                  type="number"
                  value={distributionForm.cash_usd}
                  onChange={(e) => setDistributionForm({ ...distributionForm, cash_usd: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              {/* حساب بنكي دينار */}
              <div className="p-4 border rounded-lg space-y-3">
                <Label className="text-lg font-semibold">حساب بنكي دينار</Label>
                <Select 
                  value={distributionForm.bank_lyd_account} 
                  onValueChange={(v) => setDistributionForm({ ...distributionForm, bank_lyd_account: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الحساب البنكي" />
                  </SelectTrigger>
                  <SelectContent>
                    {companyBankAccounts
                      .filter((acc: any) => acc.accountType === 'bank')
                      .map((acc: any) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.bankName} - {acc.accountNumber}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  value={distributionForm.bank_lyd}
                  onChange={(e) => setDistributionForm({ ...distributionForm, bank_lyd: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              {/* حساب بنكي دولار */}
              <div className="p-4 border rounded-lg space-y-3">
                <Label className="text-lg font-semibold">حساب بنكي دولار</Label>
                <Select 
                  value={distributionForm.bank_usd_account} 
                  onValueChange={(v) => setDistributionForm({ ...distributionForm, bank_usd_account: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الحساب البنكي" />
                  </SelectTrigger>
                  <SelectContent>
                    {companyBankAccounts
                      .filter((acc: any) => acc.accountType === 'bank')
                      .map((acc: any) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.bankName} - {acc.accountNumber}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  value={distributionForm.bank_usd}
                  onChange={(e) => setDistributionForm({ ...distributionForm, bank_usd: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              {/* USDT */}
              <div className="grid grid-cols-2 gap-4 items-center p-4 border rounded-lg">
                <Label className="text-lg font-semibold">USDT</Label>
                <Input
                  type="number"
                  value={distributionForm.usdt}
                  onChange={(e) => setDistributionForm({ ...distributionForm, usdt: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              {/* الإجمالي */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold">الإجمالي:</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {(
                      (parseFloat(distributionForm.cash_lyd) || 0) +
                      (parseFloat(distributionForm.cash_usd) || 0) +
                      (parseFloat(distributionForm.bank_lyd) || 0) +
                      (parseFloat(distributionForm.bank_usd) || 0) +
                      (parseFloat(distributionForm.usdt) || 0)
                    ).toLocaleString()} د.ل
                  </span>
                </div>
                <div className="text-sm text-slate-600 mt-2">
                  الرصيد المتاح في حساب التوزيع: {distributionBalance.toLocaleString()} د.ل
                </div>
              </div>

              {/* الوصف */}
              <div>
                <Label>الوصف</Label>
                <Textarea
                  value={distributionForm.description}
                  onChange={(e) => setDistributionForm({ ...distributionForm, description: e.target.value })}
                  placeholder="وصف العملية..."
                />
              </div>

              <Button type="button" onClick={handleDistribute} className="w-full">
                تأكيد التوزيع
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// ==================== تبويب الحسابات البنكية ====================
function BankAccountsTab({ bankLydTotal, bankUsdTotal, companyBankAccounts, transactions }: any) {
  // فلترة الحسابات البنكية حسب العملة
  const lydAccounts = companyBankAccounts.filter((acc: any) => acc.currency === 'LYD');
  const usdAccounts = companyBankAccounts.filter((acc: any) => acc.currency === 'USD');

  // فلترة الحركات البنكية (من Backend)
  // نبحث عن المعاملات التي تؤثر على الحسابات البنكية
  // إما fromAccountId أو toAccountId يساوي ID حساب بنكي
  const bankAccountIds = companyBankAccounts.map((acc: any) => acc.id);
  const bankTransactions = transactions.filter((t: any) => 
    bankAccountIds.includes(t.fromAccountId) || bankAccountIds.includes(t.toAccountId)
  );

  return (
    <div className="space-y-6">
      {/* الإجماليات */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>إجمالي حسابات بنكية دينار</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{bankLydTotal.toLocaleString()} د.ل</p>
            <p className="text-sm text-slate-600 mt-2">{lydAccounts.length} حساب</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>إجمالي حسابات بنكية دولار</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">${bankUsdTotal.toLocaleString()}</p>
            <p className="text-sm text-slate-600 mt-2">{usdAccounts.length} حساب</p>
          </CardContent>
        </Card>
      </div>

      {/* قائمة الحسابات البنكية */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>الحسابات البنكية</CardTitle>
              <CardDescription>قائمة جميع الحسابات البنكية المضافة</CardDescription>
            </div>
            <AddBankAccountDialog />
          </div>
        </CardHeader>
        <CardContent>
          {companyBankAccounts.length === 0 ? (
            <p className="text-center text-slate-500 py-8">لا توجد حسابات بنكية مضافة</p>
          ) : (
            <div className="space-y-4">
              {companyBankAccounts.map((account: any) => (
                  <div key={account.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold">{account.bankName}</h4>
                      <p className="text-sm text-slate-600">رقم الحساب: {account.accountNumber}</p>
                      {account.accountName && (
                        <p className="text-sm text-slate-600">اسم الحساب: {account.accountName}</p>
                      )}
                      {account.iban && (
                        <p className="text-sm text-slate-600">IBAN: {account.iban}</p>
                      )}
                    </div>
                    <div className="text-right flex items-start gap-4">
                      <div>
                        <p className="text-lg font-bold text-blue-600">
                          {parseFloat(account.balanceLYD || '0').toLocaleString()} د.ل
                        </p>
                        {parseFloat(account.balanceUSD || '0') > 0 && (
                          <p className="text-sm font-semibold text-green-600">
                            ${parseFloat(account.balanceUSD || '0').toLocaleString()}
                          </p>
                        )}
                        <p className="text-xs text-slate-500">
                          {format(new Date(account.createdAt), 'dd/MM/yyyy', { locale: ar })}
                        </p>
                      </div>
                      <DeleteBankAccountButton accountId={account.id} bankName={account.bankName} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* سجل الحركات */}
      <Card>
        <CardHeader>
          <CardTitle>سجل الحركات البنكية</CardTitle>
          <CardDescription>جميع العمليات على الحسابات البنكية</CardDescription>
        </CardHeader>
        <CardContent>
          {bankTransactions.length === 0 ? (
            <p className="text-center text-slate-500 py-8">لا توجد حركات</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>الوصف</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>من قام بها</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bankTransactions.map((txn: any) => {
                  const amount = parseFloat(txn.amountLYD || '0') + parseFloat(txn.amountUSD || '0');
                  const isDeposit = amount > 0;
                  const currency = parseFloat(txn.amountLYD || '0') !== 0 ? 'د.ل' : '$';
                  return (
                    <TableRow key={txn.id}>
                      <TableCell>
                        {format(new Date(txn.timestamp), 'dd/MM/yyyy HH:mm', { locale: ar })}
                      </TableCell>
                      <TableCell>
                        {isDeposit ? (
                          <span className="text-green-600">إيداع</span>
                        ) : (
                          <span className="text-red-600">سحب</span>
                        )}
                      </TableCell>
                      <TableCell>{txn.description}</TableCell>
                      <TableCell className={isDeposit ? 'text-green-600' : 'text-red-600'}>
                        {isDeposit ? '+' : ''}{Math.abs(amount).toLocaleString()} {currency}
                      </TableCell>
                      <TableCell>{txn.processedByName || 'N/A'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== تبويب الأرباح ====================
function ProfitsTab({ profitsBalance, transactions }: any) {
  const profitTransactions = transactions.filter((t: any) => 
    t.fromAccountType === 'profits' || t.toAccountType === 'profits'
  );

  return (
    <div className="space-y-6">
      {/* الإجمالي */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-green-600" />
            إجمالي الأرباح
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold text-green-600">{profitsBalance.toLocaleString()} د.ل</p>
        </CardContent>
      </Card>

      {/* سجل الأرباح */}
      <Card>
        <CardHeader>
          <CardTitle>سجل الأرباح</CardTitle>
          <CardDescription>جميع الأرباح المتحققة</CardDescription>
        </CardHeader>
        <CardContent>
          {profitTransactions.length === 0 ? (
            <p className="text-center text-slate-500 py-8">لا توجد أرباح مسجلة</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>من وين</TableHead>
                  <TableHead>الوصف</TableHead>
                  <TableHead>القيمة</TableHead>
                  <TableHead>من قام بها</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profitTransactions.map((txn: any) => {
                  const amount = parseFloat(txn.amountLYD || '0');
                  return (
                    <TableRow key={txn.id}>
                      <TableCell>
                        {format(new Date(txn.timestamp), 'dd/MM/yyyy HH:mm', { locale: ar })}
                      </TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>{txn.description}</TableCell>
                      <TableCell className="text-green-600 font-semibold">
                        +{Math.abs(amount).toLocaleString()} د.ل
                      </TableCell>
                      <TableCell>{txn.processedByName || 'N/A'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== تبويب الكاش ====================
function CashTab({ cashLydBalance, cashUsdBalance, transactions }: any) {
  const cashTransactions = transactions.filter((t: any) => 
    (t.fromAccountType === 'treasury' && (t.fromAccountId === 'cash_lyd' || t.fromAccountId === 'cash_usd')) ||
    (t.toAccountType === 'treasury' && (t.toAccountId === 'cash_lyd' || t.toAccountId === 'cash_usd'))
  );

  return (
    <div className="space-y-6">
      {/* الأرصدة */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-blue-600" />
              كاش دينار
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{cashLydBalance.toLocaleString()} د.ل</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              كاش دولار
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">${cashUsdBalance.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* سجل الحركات */}
      <Card>
        <CardHeader>
          <CardTitle>سجل حركات الكاش</CardTitle>
          <CardDescription>جميع عمليات الإيداع والسحب النقدي</CardDescription>
        </CardHeader>
        <CardContent>
          {cashTransactions.length === 0 ? (
            <p className="text-center text-slate-500 py-8">لا توجد حركات</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>الحساب</TableHead>
                  <TableHead>الوصف</TableHead>
                  <TableHead>القيمة</TableHead>
                  <TableHead>من قام بها</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cashTransactions.map((txn: any) => {
                  const amountLYD = parseFloat(txn.amountLYD || '0');
                  const amountUSD = parseFloat(txn.amountUSD || '0');
                  const amount = amountLYD !== 0 ? amountLYD : amountUSD;
                  
                  // تحديد الزيادة/الخصم من transactionDirection
                  const isCredit = txn.transactionDirection === 'credit';
                  
                  const currency = amountLYD !== 0 ? 'د.ل' : '$';
                  const accountName = amountLYD !== 0 ? 'كاش دينار' : 'كاش دولار';
                  return (
                    <TableRow key={txn.id}>
                      <TableCell>
                        {format(new Date(txn.timestamp), 'dd/MM/yyyy HH:mm', { locale: ar })}
                      </TableCell>
                      <TableCell>
                        {isCredit ? (
                          <span className="text-green-600">زيادة</span>
                        ) : (
                          <span className="text-red-600">خصم</span>
                        )}
                      </TableCell>
                      <TableCell>{accountName}</TableCell>
                      <TableCell>{txn.description}</TableCell>
                      <TableCell className={isCredit ? 'text-green-600' : 'text-red-600'}>
                        {isCredit ? '+' : '-'}{Math.abs(amount).toLocaleString()} {currency}
                      </TableCell>
                      <TableCell>{txn.processedByName || 'N/A'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== تبويب USDT ====================
function USDTTab({ usdtBalance, transactions }: any) {
  const usdtTransactions = transactions.filter((t: any) => 
    (t.fromAccountType === 'treasury' && t.fromAccountId === 'usdt') ||
    (t.toAccountType === 'treasury' && t.toAccountId === 'usdt')
  );

  return (
    <div className="space-y-6">
      {/* الرصيد */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-6 h-6 text-emerald-600" />
            رصيد USDT
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold text-emerald-600">{usdtBalance.toLocaleString()} USDT</p>
        </CardContent>
      </Card>

      {/* سجل الحركات */}
      <Card>
        <CardHeader>
          <CardTitle>سجل حركات USDT</CardTitle>
          <CardDescription>جميع عمليات الإيداع والسحب</CardDescription>
        </CardHeader>
        <CardContent>
          {usdtTransactions.length === 0 ? (
            <p className="text-center text-slate-500 py-8">لا توجد حركات</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>الوصف</TableHead>
                  <TableHead>القيمة</TableHead>
                  <TableHead>من قام بها</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usdtTransactions.map((txn: any) => {
                  const amount = parseFloat(txn.amountUSDT || '0');
                  // تحديد الزيادة/الخصم من transactionDirection
                  const isCredit = txn.transactionDirection === 'credit';
                  return (
                    <TableRow key={txn.id}>
                      <TableCell>
                        {format(new Date(txn.timestamp), 'dd/MM/yyyy HH:mm', { locale: ar })}
                      </TableCell>
                      <TableCell>
                        {isCredit ? (
                          <span className="text-green-600">زيادة</span>
                        ) : (
                          <span className="text-red-600">خصم</span>
                        )}
                      </TableCell>
                      <TableCell>{txn.description}</TableCell>
                      <TableCell className={isCredit ? 'text-green-600' : 'text-red-600'}>
                        {isCredit ? '+' : '-'}{Math.abs(amount).toLocaleString()} USDT
                      </TableCell>
                      <TableCell>{txn.processedByName || 'N/A'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


// ==================== نموذج إضافة حساب بنكي ====================
function AddBankAccountDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Building2 className="w-4 h-4 ml-2" />
          إضافة حساب بنكي
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>إضافة حساب بنكي جديد</DialogTitle>
          <DialogDescription>
            أدخل معلومات الحساب البنكي
          </DialogDescription>
        </DialogHeader>
        <AddBankAccountForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function AddBankAccountForm({ onSuccess }: { onSuccess: () => void }) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const createAccountMutation = trpc.treasury.createAccount.useMutation({
    onSuccess: () => {
      utils.treasury.getBankAccounts.invalidate();
      toast.success('تم إضافة الحساب البنكي بنجاح');
      onSuccess(); // إغلاق Dialog
    },
    onError: (error) => {
      toast.error('حدث خطأ: ' + error.message);
    },
  });
  
  const [formData, setFormData] = useState({
    bankName: '',
    accountNumber: '',
    accountName: '',
    iban: '',
    currency: 'LYD' as 'LYD' | 'USD',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.bankName || !formData.accountNumber) {
      toast.error('يرجى إدخال اسم البنك ورقم الحساب');
      return;
    }

    createAccountMutation.mutate({
      accountType: "bank",
      accountName: `${formData.bankName} - ${formData.accountNumber}`,
      bankName: formData.bankName,
      accountHolder: formData.accountName || undefined,
      accountNumber: formData.accountNumber,
      balanceLYD: formData.currency === 'LYD' ? "0" : undefined,
      balanceUSD: formData.currency === 'USD' ? "0" : undefined,
      createdBy: user?.id || 'unknown',
    });
    
    // إعادة تعيين النموذج
    setFormData({
      bankName: '',
      accountNumber: '',
      accountName: '',
      iban: '',
      currency: 'LYD',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="bankName">اسم البنك *</Label>
        <Input
          id="bankName"
          value={formData.bankName}
          onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
          placeholder="مثال: مصرف الأمان"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="accountNumber">رقم الحساب *</Label>
        <Input
          id="accountNumber"
          value={formData.accountNumber}
          onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
          placeholder="مثال: 123456789"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="accountName">اسم الحساب (اختياري)</Label>
        <Input
          id="accountName"
          value={formData.accountName}
          onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
          placeholder="مثال: محمد أحمد"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="iban">IBAN (اختياري)</Label>
        <Input
          id="iban"
          value={formData.iban}
          onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
          placeholder="مثال: LY12345678901234567890"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="currency">العملة *</Label>
        <Select
          value={formData.currency}
          onValueChange={(value: 'LYD' | 'USD') => setFormData({ ...formData, currency: value })}
        >
          <SelectTrigger id="currency">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="LYD">دينار ليبي (LYD)</SelectItem>
            <SelectItem value="USD">دولار أمريكي (USD)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button 
        type="button" 
        className="w-full"
        onClick={(e) => {
          e.preventDefault();
          handleSubmit(e as any);
        }}
      >
        إضافة الحساب
      </Button>
    </form>
  );
}

// ==================== زر حذف الحساب البنكي ====================
function DeleteBankAccountButton({ accountId, bankName }: { accountId: string; bankName: string }) {
  const { deleteAccount } = useCompanyBankAccounts();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = () => {
    deleteAccount(accountId);
    toast.success(`تم حذف الحساب البنكي: ${bankName}`);
    setShowConfirm(false);
  };

  return (
    <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50">
          <Trash2 className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تأكيد الحذف</DialogTitle>
          <DialogDescription>
            هل أنت متأكد من حذف الحساب البنكي <strong>{bankName}</strong>؟
            <br />
            <span className="text-red-500 font-semibold">لا يمكن التراجع عن هذا الإجراء!</span>
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-3 justify-end mt-4">
          <Button variant="outline" onClick={() => setShowConfirm(false)}>
            إلغاء
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            حذف
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
