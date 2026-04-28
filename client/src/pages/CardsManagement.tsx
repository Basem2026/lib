import { useCards } from '@/contexts/CardsContext';
import { useLogs } from '@/contexts/LogsContext';
// import { useTreasury } from '@/contexts/TreasuryContext'; // تم حذف TreasuryContext القديم
import { useAuth } from '@/contexts/AuthContext';
import { useAccounts } from '@/contexts/AccountsContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useEmployees } from '@/contexts/EmployeesContext';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { Settings, DollarSign, TrendingUp, Wallet, ArrowLeft, RefreshCw, Download, Scan, Eye, Edit, Trash2, CreditCard, Repeat, FileText, Search, Archive } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/usePermissions';
import type { Card as CardType, FinancialStatus, DocumentStatus } from '@/types/cards';

/**
 * صفحة إدارة البطاقات - نظام شامل لبطاقات الأغراض الشخصية
 * يستخدم CardsContext مع نوع Card المفصل من cards.ts
 * 
 * الميزات:
 * - عرض جميع البطاقات مع تفاصيل كاملة
 * - حساب الربح الصحيح حسب الحالة المالية
 * - تحديث الحالة المالية والوثائقية
 * - تسجيل جميع العمليات في LogsContext
 * - ربط مع TreasuryContext للعمليات المالية
 */
export default function CardsManagement() {
  const cardsCtx = useCards();
  const logsCtx = useLogs();
  // const treasuryCtx = useTreasury(); // تم حذف TreasuryContext القديم
  const authCtx = useAuth();
  const accountsCtx = useAccounts();
  const { hasPermission } = usePermissions();
  const { sendPushToManagers } = useNotifications();
  const { employees } = useEmployees();
  const getManagerIds = () =>
    employees
      .filter(e => (e.jobTitle === 'manager' || e.jobTitle === 'deputy_manager') && e.status === 'active')
      .map(e => e.id);
  const [, setLocation] = useLocation();
  
  // Backend mutations
  const recordDepositMutation = trpc.treasury.recordDeposit.useMutation();
  const recordSaleMutation = trpc.treasury.recordSale.useMutation();
  
  // البطاقات المحذوفة
  const { data: deletedCards = [], refetch: refetchDeleted } = trpc.cards.getDeleted.useQuery();
  const { data: allTreasuryAccounts = [] } = trpc.treasury.getAllAccounts.useQuery();
  
  // States for "View Details" Dialog
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  // States for "Change Financial Status" Dialog
  const [selectedCardForStatus, setSelectedCardForStatus] = useState<CardType | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newFinancialStatus, setNewFinancialStatus] = useState<FinancialStatus>('تم الشراء');
  const [statusReason, setStatusReason] = useState('');
  const [depositPaymentMethod, setDepositPaymentMethod] = useState<'cash' | 'bank'>('cash');
  const [depositBankAccount, setDepositBankAccount] = useState<string>('');
  
  // States for Withdrawal/Sale
  const [saleMethod, setSaleMethod] = useState<'cash' | 'bank' | 'mixed'>('cash');
  const [cashAmount, setCashAmount] = useState<string>(''); // مبلغ الكاش بالدينار
  const [bankAmount, setBankAmount] = useState<string>(''); // مبلغ المصرفي بالدينار
  const [saleBankAccount, setSaleBankAccount] = useState<string>(''); // رقم الحساب البنكي

  // States for "Change Document Status" Dialog
  const [selectedCardForDocs, setSelectedCardForDocs] = useState<CardType | null>(null);
  const [showDocsDialog, setShowDocsDialog] = useState(false);
  const [newDocumentStatus, setNewDocumentStatus] = useState<DocumentStatus>('المعاملة ليست جاهزة للاستلام');
  const [docsReason, setDocsReason] = useState('');

  // States for "Bulk Document Status Change" Dialog
  const [showBulkDocsDialog, setShowBulkDocsDialog] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [bulkDocumentStatus, setBulkDocumentStatus] = useState<DocumentStatus>('المعاملة ليست جاهزة للاستلام');
  const [bulkDocsReason, setBulkDocsReason] = useState('');
  
  // State for Financial Status Filter
  const [statusFilter, setStatusFilter] = useState<FinancialStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filtered cards based on status filter AND search query
  const filteredCards = cardsCtx.cards.filter(card => {
    const matchesStatus = statusFilter === 'all' || card.financialStatus === statusFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q ||
      card.name?.toLowerCase().includes(q) ||
      card.cardNumber?.toLowerCase().includes(q) ||
      card.transactionId?.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  // States for Delete Card Dialog
  const [selectedCardForDelete, setSelectedCardForDelete] = useState<CardType | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // States for Exchange Company Dialog
  const [selectedCardForExchange, setSelectedCardForExchange] = useState<CardType | null>(null);
  const [showExchangeDialog, setShowExchangeDialog] = useState(false);
  const [exchangeCompanyName, setExchangeCompanyName] = useState('');
  const [exchangeCompanyPhone, setExchangeCompanyPhone] = useState('');
  const [exchangeRate, setExchangeRate] = useState('');

  // حساب الإحصائيات
  const stats = {
    totalCards: cardsCtx.getTotalCards(),
    totalBalance: cardsCtx.cards.reduce((sum, card) => {
      // حساب الرصيد المتبقي في البطاقة (بالدولار)
      if (card.financialStatus === 'تم الإيداع الدولار في البطاقة' || 
          card.financialStatus === 'متبقي رصيد في البطاقة') {
        return sum + card.remainingInCard;
      }
      return sum;
    }, 0),
    totalProfit: cardsCtx.getTotalProfit(),
    withdrawnCards: cardsCtx.getCardsByStatus('تم السحب بالكامل').length,
  };

  /**
   * حساب الربح الصحيح حسب الحالة المالية
   * 
   * القواعد:
   * 1. قبل التنفيذ (تم الشراء → تم التنفيذ): لا يوجد ربح
   * 2. بعد التنفيذ (تم الإيداع الدولار): ربح محتمل = (رصيد × سعر البيع) - إيداع - شراء
   * 3. بعد السحب الأول: الربح الأول فقط
   * 4. بعد السحب الثاني: الربح الإجمالي (أول + ثاني)
   * 5. تم السحب بالكامل: الربح الإجمالي النهائي
   */
  const calculateProfit = (card: CardType): number => {
    const status = card.financialStatus;
    
    // قبل التنفيذ: لا يوجد ربح
    if (status === 'تم الشراء' || 
        status === 'في انتظار المطابقة' || 
        status === 'تمت المطابقة' || 
        status === 'غير مطابق' || 
        status === 'تم الحجز دون اختيار شركة الصرافة' || 
        status === 'تم اختيار شركة الصرافة' || 
        status === 'تم الإيداع' || 
        status === 'تم التنفيذ') {
      return 0;
    }
    
    // بعد إيداع الدولار: ربح محتمل
    if (status === 'تم الإيداع الدولار في البطاقة') {
      // الربح المحتمل = (رصيد الدولار × سعر البيع) - الإيداع - الشراء
      const potentialValue = card.cardDollarValue * card.sellDollarPrice;
      const profit = potentialValue - card.depositAmount - card.totalPurchasePrice;
      return profit > 0 ? profit : 0;
    }
    
    // بعد السحب الأول: الربح الأول فقط
    if (status === 'تم السحب') {
      return card.firstProfit || 0;
    }
    
    // بعد السحب الثاني أو متبقي رصيد: الربح الإجمالي
    if (status === 'متبقي رصيد في البطاقة') {
      return card.totalProfit || 0;
    }
    
    // تم السحب بالكامل: الربح الإجمالي النهائي
    if (status === 'تم السحب بالكامل') {
      return card.totalProfit || 0;
    }
    
    return 0;
  };

  // ====== View Details Functions ======
  const handleOpenDetailsDialog = (card: CardType) => {
    setSelectedCard(card);
    setShowDetailsDialog(true);
  };

  // ====== Change Financial Status Functions ======
  const handleOpenStatusDialog = (card: CardType) => {
    setSelectedCardForStatus(card);
    setNewFinancialStatus(card.financialStatus);
    setStatusReason('');
    setShowStatusDialog(true);
  };

  const handleSaveFinancialStatus = async () => {
    if (!selectedCardForStatus || !authCtx.user) return;

    const oldStatus = selectedCardForStatus.financialStatus;
    
    if (newFinancialStatus === oldStatus) {
      toast.error('الحالة الجديدة مطابقة للحالة الحالية');
      return;
    }

    // تحديث الحالة المالية
    cardsCtx.updateFinancialStatus(
      selectedCardForStatus.transactionId,
      newFinancialStatus,
      authCtx.user.fullName || 'غير محدد',
      statusReason || undefined,
      depositPaymentMethod,
      depositBankAccount || undefined
    );

    // ربط تلقائي مع الخزينة (نظام مبسط)
    try {
      // شراء بطاقة: ينقص كاش دينار
      if (newFinancialStatus === 'تم الشراء') {
        accountsCtx.addTransaction({
          type: 'withdrawal',
          accountType: 'cash_lyd',
          amount: selectedCardForStatus.totalPurchasePrice,
          currency: 'LYD',
          description: `شراء بطاقة ${selectedCardForStatus.transactionId}`,
          reference: selectedCardForStatus.transactionId,
          date: new Date(),
          createdBy: authCtx.user.fullName || 'غير محدد',
        });
      }
      
      // إيداع: ينقص حسب طريقة الدفع (كاش أو مصرفي)
      if (newFinancialStatus === 'تم الإيداع') {
        const accountType = depositPaymentMethod === 'bank' ? 'bank_lyd' : 'cash_lyd';
        const description = depositPaymentMethod === 'bank' 
          ? `إيداع مصرفي في بطاقة ${selectedCardForStatus.transactionId} - حساب: ${depositBankAccount}`
          : `إيداع كاش في بطاقة ${selectedCardForStatus.transactionId}`;
        
        // تسجيل في localStorage
        accountsCtx.addTransaction({
          type: 'withdrawal',
          accountType,
          amount: selectedCardForStatus.depositAmount,
          currency: 'LYD',
          description,
          reference: selectedCardForStatus.transactionId,
          date: new Date(),
          createdBy: authCtx.user.fullName || 'غير محدد',
        });
        
        // تسجيل في Backend
        await recordDepositMutation.mutateAsync({
          customerId: selectedCardForStatus.transactionId,
          customerName: selectedCardForStatus.name,
          depositAmount: selectedCardForStatus.depositAmount,
          paymentMethod: depositPaymentMethod,
          bankAccountId: depositBankAccount || undefined,
          processedBy: authCtx.user.id || 'unknown',
          processedByName: authCtx.user.fullName || 'غير محدد',
        });
      }
      
      // سحب أول: يزيد حسب طريقة البيع
      if (newFinancialStatus === 'تم السحب') {
        const cashAmt = parseFloat(cashAmount) || 0;
        const bankAmt = parseFloat(bankAmount) || 0;
        
        // تسجيل في localStorage
        if (cashAmt > 0) {
          accountsCtx.addTransaction({
            type: 'deposit',
            accountType: 'cash_lyd',
            amount: cashAmt,
            currency: 'LYD',
            description: `بيع كاش من بطاقة ${selectedCardForStatus.transactionId}`,
            reference: selectedCardForStatus.transactionId,
            date: new Date(),
            createdBy: authCtx.user.fullName || 'غير محدد',
          });
        }
        
        if (bankAmt > 0) {
          accountsCtx.addTransaction({
            type: 'deposit',
            accountType: 'bank_lyd',
            amount: bankAmt,
            currency: 'LYD',
            description: `بيع مصرفي من بطاقة ${selectedCardForStatus.transactionId} - حساب: ${saleBankAccount}`,
            reference: selectedCardForStatus.transactionId,
            date: new Date(),
            createdBy: authCtx.user.fullName || 'غير محدد',
          });
        }
        
        // تسجيل في Backend
        const saleType = (cashAmt > 0 && bankAmt > 0) ? 'mixed' : (cashAmt > 0 ? 'cash' : 'bank');
        await recordSaleMutation.mutateAsync({
          customerId: selectedCardForStatus.transactionId,
          customerName: selectedCardForStatus.name,
          saleType,
          cashAmount: cashAmt,
          bankAmount: bankAmt,
          bankAccountId: saleBankAccount || undefined,
          processedBy: authCtx.user.id || 'unknown',
          processedByName: authCtx.user.fullName || 'غير محدد',
        });
      
        
        // إضافة الربح إلى حساب التوزيع
        if (selectedCardForStatus.firstProfit > 0) {
          accountsCtx.addTransaction({
            type: 'deposit',
            accountType: 'distribution',
            amount: selectedCardForStatus.firstProfit,
            currency: 'LYD',
            description: `ربح من بطاقة ${selectedCardForStatus.transactionId}`,
            reference: selectedCardForStatus.transactionId,
            date: new Date(),
            createdBy: authCtx.user.fullName || 'غير محدد',
          });
        }
      }
      
      // سحب ثاني: يزيد حسب طريقة البيع
      if (newFinancialStatus === 'متبقي رصيد في البطاقة') {
        const cashAmt = parseFloat(cashAmount) || 0;
        const bankAmt = parseFloat(bankAmount) || 0;
        
        // تسجيل في localStorage
        if (cashAmt > 0) {
          accountsCtx.addTransaction({
            type: 'deposit',
            accountType: 'cash_lyd',
            amount: cashAmt,
            currency: 'LYD',
            description: `بيع كاش (سحب ثاني) من بطاقة ${selectedCardForStatus.transactionId}`,
            reference: selectedCardForStatus.transactionId,
            date: new Date(),
            createdBy: authCtx.user.fullName || 'غير محدد',
          });
        }
        
        if (bankAmt > 0) {
          accountsCtx.addTransaction({
            type: 'deposit',
            accountType: 'bank_lyd',
            amount: bankAmt,
            currency: 'LYD',
            description: `بيع مصرفي (سحب ثاني) من بطاقة ${selectedCardForStatus.transactionId} - حساب: ${saleBankAccount}`,
            reference: selectedCardForStatus.transactionId,
            date: new Date(),
            createdBy: authCtx.user.fullName || 'غير محدد',
          });
        }
        
        // تسجيل في Backend
        const saleType = (cashAmt > 0 && bankAmt > 0) ? 'mixed' : (cashAmt > 0 ? 'cash' : 'bank');
        await recordSaleMutation.mutateAsync({
          customerId: selectedCardForStatus.transactionId,
          customerName: selectedCardForStatus.name,
          saleType,
          cashAmount: cashAmt,
          bankAmount: bankAmt,
          bankAccountId: saleBankAccount || undefined,
          processedBy: authCtx.user.id || 'unknown',
          processedByName: authCtx.user.fullName || 'غير محدد',
        });
        
        // إضافة الربح إلى حساب التوزيع
        if (selectedCardForStatus.secondProfit > 0) {
          accountsCtx.addTransaction({
            type: 'deposit',
            accountType: 'distribution',
            amount: selectedCardForStatus.secondProfit,
            currency: 'LYD',
            description: `ربح ثاني من بطاقة ${selectedCardForStatus.transactionId}`,
            reference: selectedCardForStatus.transactionId,
            date: new Date(),
            createdBy: authCtx.user.fullName || 'غير محدد',
          });
        }
      }
      
      // سحب كامل: يزيد حسب طريقة البيع
      if (newFinancialStatus === 'تم السحب بالكامل') {
        const cashAmt = parseFloat(cashAmount) || 0;
        const bankAmt = parseFloat(bankAmount) || 0;
        
        // تسجيل في localStorage
        if (cashAmt > 0) {
          accountsCtx.addTransaction({
            type: 'deposit',
            accountType: 'cash_lyd',
            amount: cashAmt,
            currency: 'LYD',
            description: `بيع كاش (سحب كامل) من بطاقة ${selectedCardForStatus.transactionId}`,
            reference: selectedCardForStatus.transactionId,
            date: new Date(),
            createdBy: authCtx.user.fullName || 'غير محدد',
          });
        }
        
        if (bankAmt > 0) {
          accountsCtx.addTransaction({
            type: 'deposit',
            accountType: 'bank_lyd',
            amount: bankAmt,
            currency: 'LYD',
            description: `بيع مصرفي (سحب كامل) من بطاقة ${selectedCardForStatus.transactionId} - حساب: ${saleBankAccount}`,
            reference: selectedCardForStatus.transactionId,
            date: new Date(),
            createdBy: authCtx.user.fullName || 'غير محدد',
          });
        }
        
        // تسجيل في Backend
        const saleType = (cashAmt > 0 && bankAmt > 0) ? 'mixed' : (cashAmt > 0 ? 'cash' : 'bank');
        await recordSaleMutation.mutateAsync({
          customerId: selectedCardForStatus.transactionId,
          customerName: selectedCardForStatus.name,
          saleType,
          cashAmount: cashAmt,
          bankAmount: bankAmt,
          bankAccountId: saleBankAccount || undefined,
          processedBy: authCtx.user.id || 'unknown',
          processedByName: authCtx.user.fullName || 'غير محدد',
        });
        
        // إضافة الربح الإجمالي إلى حساب التوزيع
        if (selectedCardForStatus.totalProfit > 0) {
          accountsCtx.addTransaction({
            type: 'deposit',
            accountType: 'distribution',
            amount: selectedCardForStatus.totalProfit,
            currency: 'LYD',
            description: `ربح إجمالي من بطاقة ${selectedCardForStatus.transactionId}`,
            reference: selectedCardForStatus.transactionId,
            date: new Date(),
            createdBy: authCtx.user.fullName || 'غير محدد',
          });
        }
      }
    } catch {
      toast.error('خطأ في ربط العملية بالخزينة');
    }

    // تسجيل في LogsContext
    logsCtx.addAuditTrail({
      action: 'edit_card',
      entityType: 'card',
      entityId: selectedCardForStatus.transactionId,
      userId: authCtx.user.id,
      userName: authCtx.user.fullName || 'غير محدد',
      details: {
        before: { financialStatus: oldStatus },
        after: { financialStatus: newFinancialStatus },
        description: `تغيير الحالة المالية من "${oldStatus}" إلى "${newFinancialStatus}"`,
        reason: statusReason || undefined,
      },
      status: 'success',
    });

    toast.success('تم تحديث الحالة المالية وربطها بالخزينة بنجاح');
    // إرسال Web Push للمدير ونائبه
    sendPushToManagers(
      '💳 تحديث حالة بطاقة',
      `الموظف: ${authCtx.user?.fullName || 'admin'} | الزبون: ${selectedCardForStatus?.name} | من: ${oldStatus} ← إلى: ${newFinancialStatus}`,
      getManagerIds(),
      '/cards'
    );
    setShowStatusDialog(false);
  };

  // ====== Exchange Company Selection Functions ======
  const handleOpenExchangeDialog = (card: CardType) => {
    setSelectedCardForExchange(card);
    setExchangeCompanyName('');
    setExchangeCompanyPhone('');
    setExchangeRate('');
    setShowExchangeDialog(true);
  };

  const handleSaveExchangeCompany = () => {
    if (!selectedCardForExchange || !authCtx.user) return;
    
    if (!exchangeCompanyName.trim()) {
      toast.error('يرجى إدخال اسم شركة الصرافة');
      return;
    }
    
    if (!exchangeCompanyPhone.trim()) {
      toast.error('يرجى إدخال رقم هاتف شركة الصرافة');
      return;
    }
    
    if (!exchangeRate.trim()) {
      toast.error('يرجى إدخال سعر الصرف');
      return;
    }

    const oldStatus = selectedCardForExchange.financialStatus;
    const newStatus = 'تم اختيار شركة الصرافة';
    
    cardsCtx.updateCard(selectedCardForExchange.transactionId, {
      financialStatus: newStatus,
      exchangeCompanyName,
      exchangeCompanyPhone,
      exchangeRate: parseFloat(exchangeRate),
    });

    logsCtx.addAuditTrail({
      action: 'edit_card',
      entityType: 'card',
      entityId: selectedCardForExchange.transactionId,
      userId: authCtx.user.id,
      userName: authCtx.user.fullName || 'غير محدد',
      details: {
        before: { financialStatus: oldStatus },
        after: { 
          financialStatus: newStatus,
          exchangeCompanyName,
          exchangeCompanyPhone,
          exchangeRate: parseFloat(exchangeRate),
        },
        description: `تم اختيار شركة صرافة: ${exchangeCompanyName} - سعر الصرف: ${exchangeRate}`,
      },
      status: 'success',
    });

    toast.success('تم حفظ بيانات شركة الصرافة بنجاح');
    setShowExchangeDialog(false);
  };

  // ====== Change Document Status Functions ======
  const handleOpenDocsDialog = (card: CardType) => {
    setSelectedCardForDocs(card);
    setNewDocumentStatus(card.documentStatus);
    setDocsReason('');
    setShowDocsDialog(true);
  };

  const handleSaveDocumentStatus = () => {
    if (!selectedCardForDocs || !authCtx.user) return;

    const oldStatus = selectedCardForDocs.documentStatus;
    
    if (newDocumentStatus === oldStatus) {
      toast.error('الحالة الجديدة مطابقة للحالة الحالية');
      return;
    }

    // تحديث الحالة الوثائقية
    cardsCtx.updateDocumentStatus(
      selectedCardForDocs.transactionId,
      newDocumentStatus,
      authCtx.user.fullName || 'غير محدد',
      docsReason || undefined
    );

    // تسجيل في LogsContext
    logsCtx.addAuditTrail({
      action: 'edit_card',
      entityType: 'card',
      entityId: selectedCardForDocs.transactionId,
      userId: authCtx.user.id,
      userName: authCtx.user.fullName || 'غير محدد',
      details: {
        before: { documentStatus: oldStatus },
        after: { documentStatus: newDocumentStatus },
        description: `تغيير حالة المستندات من "${oldStatus}" إلى "${newDocumentStatus}"`,
        reason: docsReason || undefined,
      },
      status: 'success',
    });

    toast.success('تم تحديث حالة المستندات بنجاح');
    setShowDocsDialog(false);
  };

  // ====== Helper Functions ======
  const getFinancialStatusColor = (status: FinancialStatus): string => {
    const colorMap: Record<FinancialStatus, string> = {
      'تم الشراء': 'bg-gray-100 text-gray-800',
      'في انتظار المطابقة': 'bg-yellow-100 text-yellow-800',
      'تمت المطابقة': 'bg-green-100 text-green-800',
      'غير مطابق': 'bg-red-100 text-red-800',
      'تم الحجز دون اختيار شركة الصرافة': 'bg-cyan-100 text-cyan-800',
      'تم اختيار شركة الصرافة': 'bg-sky-100 text-sky-800',
      'تم الإيداع': 'bg-blue-100 text-blue-800',
      'تم التنفيذ': 'bg-indigo-100 text-indigo-800',
      'تم الإيداع الدولار في البطاقة': 'bg-purple-100 text-purple-800',
      'تم السحب': 'bg-teal-100 text-teal-800',
      'متبقي رصيد في البطاقة': 'bg-orange-100 text-orange-800',
      'تم السحب بالكامل': 'bg-emerald-100 text-emerald-800',
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  const getDocumentStatusColor = (status: DocumentStatus): string => {
    const colorMap: Record<DocumentStatus, string> = {
      'المعاملة ليست جاهزة للاستلام': 'bg-gray-100 text-gray-800',
      'جاهزة للاستلام': 'bg-blue-100 text-blue-800',
      'تم الاستلام بالكامل': 'bg-green-100 text-green-800',
      'متبقي جواز': 'bg-yellow-100 text-yellow-800',
      'متبقي شفرة': 'bg-yellow-100 text-yellow-800',
      'متبقي بطاقة': 'bg-yellow-100 text-yellow-800',
      'متبقي جواز + بطاقة': 'bg-orange-100 text-orange-800',
      'متبقي جواز + شفرة': 'bg-orange-100 text-orange-800',
      'متبقي شفرة + بطاقة': 'bg-orange-100 text-orange-800',
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            onClick={() => setLocation('/dashboard')}
            className="mb-2"
          >
            <ArrowLeft className="ml-2 h-4 w-4" />
            العودة للوحة التحكم
          </Button>
          <h1 className="text-3xl font-bold text-slate-800">إدارة البطاقات</h1>
          <p className="text-slate-600 mt-1">نظام شامل لبطاقات الأغراض الشخصية</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="ml-2 h-4 w-4" />
            تحديث
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium opacity-90">إجمالي البطاقات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{stats.totalCards}</div>
              <Wallet className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium opacity-90">الرصيد المتبقي (دولار)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">${stats.totalBalance.toFixed(2)}</div>
              <DollarSign className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium opacity-90">إجمالي الأرباح</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{stats.totalProfit.toFixed(2)} د.ل</div>
              <TrendingUp className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium opacity-90">البطاقات المسحوبة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{stats.withdrawnCards}</div>
              <Settings className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* أزرار العمليات السريعة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Button
          onClick={() => setLocation('/bulk-withdrawal')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white h-16 text-lg"
        >
          <Download className="ml-2 h-5 w-5" />
          سحب جماعي
        </Button>

        <Button
          onClick={() => setLocation('/withdraw-held')}
          className="bg-green-600 hover:bg-green-700 text-white h-16 text-lg"
        >
          <Repeat className="ml-2 h-5 w-5" />
          سحب المتبقي
        </Button>

        <Button
          onClick={() => setLocation('/bulk-status-change')}
          className="bg-yellow-600 hover:bg-yellow-700 text-white h-16 text-lg"
        >
          <RefreshCw className="ml-2 h-5 w-5" />
          تغيير الحالة
        </Button>

        <Button
          onClick={() => setShowBulkDocsDialog(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white h-16 text-lg"
        >
          <FileText className="ml-2 h-5 w-5" />
          تغيير حالة المستندات
        </Button>
      </div>

      {/* Cards Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle>جميع البطاقات {(statusFilter !== 'all' || searchQuery) && <span className="text-sm font-normal text-slate-500">({filteredCards.length} بطاقة)</span>}</CardTitle>
              {/* Search Box */}
              <div className="relative w-full md:w-72">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="بحث بالاسم أو رقم البطاقة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-9 text-right"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-slate-600 font-medium">تصفية حسب الحالة:</span>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as FinancialStatus | 'all')}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات ({cardsCtx.cards.length})</SelectItem>
                  <SelectItem value="تم الشراء">تم الشراء ({cardsCtx.cards.filter(c => c.financialStatus === 'تم الشراء').length})</SelectItem>
                  <SelectItem value="في انتظار المطابقة">في انتظار المطابقة ({cardsCtx.cards.filter(c => c.financialStatus === 'في انتظار المطابقة').length})</SelectItem>
                  <SelectItem value="تمت المطابقة">تمت المطابقة ({cardsCtx.cards.filter(c => c.financialStatus === 'تمت المطابقة').length})</SelectItem>
                  <SelectItem value="غير مطابق">غير مطابق ({cardsCtx.cards.filter(c => c.financialStatus === 'غير مطابق').length})</SelectItem>
                  <SelectItem value="تم الحجز دون اختيار شركة الصرافة">تم الحجز دون اختيار شركة ({cardsCtx.cards.filter(c => c.financialStatus === 'تم الحجز دون اختيار شركة الصرافة').length})</SelectItem>
                  <SelectItem value="تم اختيار شركة الصرافة">تم اختيار شركة الصرافة ({cardsCtx.cards.filter(c => c.financialStatus === 'تم اختيار شركة الصرافة').length})</SelectItem>
                  <SelectItem value="تم الإيداع">تم الإيداع ({cardsCtx.cards.filter(c => c.financialStatus === 'تم الإيداع').length})</SelectItem>
                  <SelectItem value="تم التنفيذ">تم التنفيذ ({cardsCtx.cards.filter(c => c.financialStatus === 'تم التنفيذ').length})</SelectItem>
                  <SelectItem value="تم الإيداع الدولار في البطاقة">تم الإيداع الدولار ({cardsCtx.cards.filter(c => c.financialStatus === 'تم الإيداع الدولار في البطاقة').length})</SelectItem>
                  <SelectItem value="تم السحب">تم السحب ({cardsCtx.cards.filter(c => c.financialStatus === 'تم السحب').length})</SelectItem>
                  <SelectItem value="متبقي رصيد في البطاقة">متبقي رصيد في البطاقة ({cardsCtx.cards.filter(c => c.financialStatus === 'متبقي رصيد في البطاقة').length})</SelectItem>
                  <SelectItem value="تم السحب بالكامل">تم السحب بالكامل ({cardsCtx.cards.filter(c => c.financialStatus === 'تم السحب بالكامل').length})</SelectItem>
                </SelectContent>
              </Select>
              {(statusFilter !== 'all' || searchQuery) && (
                <Button variant="ghost" size="sm" onClick={() => { setStatusFilter('all'); setSearchQuery(''); }} className="text-slate-500 hover:text-slate-700">
                  إعادة تعيين الكل
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {cardsCtx.cards.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="h-16 w-16 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 text-lg">لا توجد بطاقات مسجلة</p>
            </div>
          ) : filteredCards.length === 0 ? (
            <div className="text-center py-12">
              <Search className="h-16 w-16 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 text-lg">لا توجد نتائج تطابق البحث</p>
              <p className="text-slate-400 text-sm mt-1">جرب تغيير كلمة البحث أو اختيار حالة مختلفة</p>
              <Button variant="outline" className="mt-4" onClick={() => { setStatusFilter('all'); setSearchQuery(''); }}>إعادة تعيين الفلتر</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-right p-3 font-semibold text-slate-700">رقم المعاملة</th>
                    <th className="text-right p-3 font-semibold text-slate-700">الاسم</th>
                    <th className="text-right p-3 font-semibold text-slate-700">رقم البطاقة</th>
                    <th className="text-right p-3 font-semibold text-slate-700">الحالة المالية</th>
                    <th className="text-right p-3 font-semibold text-slate-700">حالة المستندات</th>
                    <th className="text-right p-3 font-semibold text-slate-700">الربح</th>
                    <th className="text-right p-3 font-semibold text-slate-700">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCards.map((card) => {
                    const profit = calculateProfit(card);
                    
                    return (
                      <tr key={card.transactionId} className="border-b hover:bg-slate-50">
                        <td className="p-3 font-mono text-sm">{card.transactionId}</td>
                        <td className="p-3">{card.name}</td>
                        <td className="p-3 font-mono text-sm">{card.cardNumber}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getFinancialStatusColor(card.financialStatus)}`}>
                            {card.financialStatus}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDocumentStatusColor(card.documentStatus)}`}>
                            {card.documentStatus}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-green-600">
                          {profit.toFixed(2)} د.ل
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenDetailsDialog(card)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {hasPermission('edit_card') && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenStatusDialog(card)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {card.financialStatus === 'تم الحجز دون اختيار شركة الصرافة' && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleOpenExchangeDialog(card)}
                                className="bg-sky-600 hover:bg-sky-700"
                              >
                                بنك
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenDocsDialog(card)}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                            {hasPermission('delete_card') && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700"
                                onClick={() => {
                                  setSelectedCardForDelete(card);
                                  setShowDeleteDialog(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deleted Cards Section */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-red-500" />
            <CardTitle className="text-red-700">البطاقات المحذوفة <span className="text-sm font-normal text-slate-500">({deletedCards.length})</span></CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {deletedCards.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Archive className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>لا توجد بطاقات محذوفة</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead>
                  <tr className="border-b bg-red-50">
                    <th className="px-4 py-3 text-right">رقم المعاملة</th>
                    <th className="px-4 py-3 text-right">الاسم</th>
                    <th className="px-4 py-3 text-right">رقم البطاقة</th>
                    <th className="px-4 py-3 text-right">الحالة المالية</th>
                    <th className="px-4 py-3 text-right">تاريخ الحذف</th>
                    <th className="px-4 py-3 text-right">حذف بواسطة</th>
                  </tr>
                </thead>
                <tbody>
                  {deletedCards.map((card) => (
                    <tr key={card.transactionId} className="border-b hover:bg-red-50/50">
                      <td className="px-4 py-3 font-mono text-slate-600">{card.transactionId}</td>
                      <td className="px-4 py-3 font-medium">{card.name}</td>
                      <td className="px-4 py-3 font-mono">{card.cardNumber}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">{card.financialStatus}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {card.deletedAt ? new Date(card.deletedAt).toLocaleString('ar-LY') : '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{card.deletedByName || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedCard && (
            <>
              <DialogHeader>
                <DialogTitle>تفاصيل البطاقة - {selectedCard.name}</DialogTitle>
                <DialogDescription>
                  رقم المعاملة: {selectedCard.transactionId}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* بيانات الزبون */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-slate-700">بيانات الزبون</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <div>
                      <Label className="text-slate-600">الاسم</Label>
                      <p className="font-medium">{selectedCard.name}</p>
                    </div>
                    <div>
                      <Label className="text-slate-600">الرقم الوطني</Label>
                      <p className="font-mono">{selectedCard.nationalId}</p>
                    </div>
                    <div>
                      <Label className="text-slate-600">رقم الجواز</Label>
                      <p className="font-mono">{selectedCard.passportNumber}</p>
                    </div>
                    <div>
                      <Label className="text-slate-600">انتهاء الجواز</Label>
                      <p>{selectedCard.passportExpiry}</p>
                    </div>
                    <div>
                      <Label className="text-slate-600">رقم الحساب</Label>
                      <p className="font-mono">{selectedCard.accountNumber}</p>
                    </div>
                    <div>
                      <Label className="text-slate-600">الهاتف الشخصي</Label>
                      <p className="font-mono">{selectedCard.personalPhone}</p>
                    </div>
                  </div>
                </div>

                {/* بيانات البطاقة */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-slate-700">بيانات البطاقة</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-slate-600">رقم البطاقة</Label>
                      <p className="font-mono">{selectedCard.cardNumber}</p>
                    </div>
                    <div>
                      <Label className="text-slate-600">تاريخ الصلاحية</Label>
                      <p>{selectedCard.cardExpiry}</p>
                    </div>
                    <div>
                      <Label className="text-slate-600">الرمز السري</Label>
                      <p className="font-mono">{selectedCard.cardPin}</p>
                    </div>
                  </div>
                </div>

                {/* بيانات الشراء */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-slate-700">بيانات الشراء</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-slate-600">ثمن الشراء</Label>
                      <p className="font-semibold">{selectedCard.purchasePrice.toFixed(2)} د.ل</p>
                    </div>
                    <div>
                      <Label className="text-slate-600">المندوب</Label>
                      <p>{selectedCard.delegate}</p>
                    </div>
                    <div>
                      <Label className="text-slate-600">حصة المندوب</Label>
                      <p className="font-semibold">{selectedCard.delegateShare.toFixed(2)} د.ل</p>
                    </div>
                    <div>
                      <Label className="text-slate-600">الثمن الإجمالي</Label>
                      <p className="font-semibold text-lg">{selectedCard.totalPurchasePrice.toFixed(2)} د.ل</p>
                    </div>
                  </div>
                </div>

                {/* بيانات الإيداع */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-slate-700">بيانات الإيداع والتنفيذ</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-slate-600">قيمة الإيداع</Label>
                      <p className="font-semibold">{selectedCard.depositAmount.toFixed(2)} د.ل</p>
                    </div>
                    <div>
                      <Label className="text-slate-600">قيمة الدولار في البطاقة</Label>
                      <p className="font-semibold">${selectedCard.cardDollarValue.toFixed(2)}</p>
                    </div>
                    <div>
                      <Label className="text-slate-600">سعر دولار البيع</Label>
                      <p className="font-semibold">{selectedCard.sellDollarPrice.toFixed(2)} د.ل</p>
                    </div>
                  </div>
                </div>

                {/* بيانات الأرباح */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-slate-700">بيانات الأرباح</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-slate-600">الربح الأول</Label>
                      <p className="font-semibold text-green-600">{selectedCard.firstProfit.toFixed(2)} د.ل</p>
                    </div>
                    <div>
                      <Label className="text-slate-600">الربح الثاني</Label>
                      <p className="font-semibold text-green-600">{selectedCard.secondProfit.toFixed(2)} د.ل</p>
                    </div>
                    <div>
                      <Label className="text-slate-600">الربح الإجمالي</Label>
                      <p className="font-semibold text-green-600 text-lg">{selectedCard.totalProfit.toFixed(2)} د.ل</p>
                    </div>
                  </div>
                </div>

                {/* الحالات */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-slate-700">الحالات</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <div>
                      <Label className="text-slate-600">الحالة المالية</Label>
                      <p>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getFinancialStatusColor(selectedCard.financialStatus)}`}>
                          {selectedCard.financialStatus}
                        </span>
                      </p>
                    </div>
                    <div>
                      <Label className="text-slate-600">حالة المستندات</Label>
                      <p>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDocumentStatusColor(selectedCard.documentStatus)}`}>
                          {selectedCard.documentStatus}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* المستندات المستلمة */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-slate-700">المستندات المستلمة</h3>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={selectedCard.documentsReceived.passport} disabled />
                      <Label>جواز السفر</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={selectedCard.documentsReceived.pin} disabled />
                      <Label>الشفرة</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={selectedCard.documentsReceived.card} disabled />
                      <Label>البطاقة</Label>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Change Financial Status Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          {selectedCardForStatus && (
            <>
              <DialogHeader>
                <DialogTitle>تغيير الحالة المالية</DialogTitle>
                <DialogDescription>
                  البطاقة: {selectedCardForStatus.name} ({selectedCardForStatus.transactionId})
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label>الحالة الحالية</Label>
                  <p className="mt-1">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getFinancialStatusColor(selectedCardForStatus.financialStatus)}`}>
                      {selectedCardForStatus.financialStatus}
                    </span>
                  </p>
                </div>

                <div>
                  <Label htmlFor="newFinancialStatus">الحالة الجديدة</Label>
                  <Select value={newFinancialStatus} onValueChange={(value) => setNewFinancialStatus(value as FinancialStatus)}>
                    <SelectTrigger id="newFinancialStatus">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="تم الشراء">تم الشراء</SelectItem>
                      <SelectItem value="في انتظار المطابقة">في انتظار المطابقة</SelectItem>
                      <SelectItem value="تمت المطابقة">تمت المطابقة</SelectItem>
                      <SelectItem value="غير مطابق">غير مطابق</SelectItem>
                      <SelectItem value="تم الحجز دون اختيار شركة الصرافة">تم الحجز دون اختيار شركة الصرافة</SelectItem>
                      <SelectItem value="تم اختيار شركة الصرافة">تم اختيار شركة الصرافة</SelectItem>
                      <SelectItem value="تم الإيداع">تم الإيداع</SelectItem>
                      <SelectItem value="تم التنفيذ">تم التنفيذ</SelectItem>
                      <SelectItem value="تم الإيداع الدولار في البطاقة">تم الإيداع الدولار في البطاقة</SelectItem>
                      <SelectItem value="تم السحب">تم السحب</SelectItem>
                      <SelectItem value="متبقي رصيد في البطاقة">متبقي رصيد في البطاقة</SelectItem>
                      <SelectItem value="تم السحب بالكامل">تم السحب بالكامل</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* حقول الإيداع - تظهر فقط عند اختيار "تم الإيداع" */}
                {newFinancialStatus === 'تم الإيداع' && (
                  <>
                    <div>
                      <Label htmlFor="depositPaymentMethod">طريقة الدفع</Label>
                      <Select value={depositPaymentMethod} onValueChange={(value) => setDepositPaymentMethod(value as 'cash' | 'bank')}>
                        <SelectTrigger id="depositPaymentMethod">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">كاش دينار</SelectItem>
                          <SelectItem value="bank">مصرفي دينار</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {depositPaymentMethod === 'bank' && (
                      <div>
                        <Label htmlFor="depositBankAccount">الحساب البنكي</Label>
                        <Input
                          id="depositBankAccount"
                          value={depositBankAccount}
                          onChange={(e) => setDepositBankAccount(e.target.value)}
                          placeholder="أدخل رقم الحساب البنكي..."
                        />
                      </div>
                    )}
                  </>
                )}

                {/* حقول بيع الدولار */}
                {(newFinancialStatus === 'تم السحب' || newFinancialStatus === 'متبقي رصيد في البطاقة' || newFinancialStatus === 'تم السحب بالكامل') && (
                  <>
                    <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
                      <h4 className="font-bold text-amber-900 mb-3">💵 بيع الدولار</h4>
                      
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="saleMethod">طريقة البيع</Label>
                          <Select value={saleMethod} onValueChange={(value) => setSaleMethod(value as 'cash' | 'bank' | 'mixed')}>
                            <SelectTrigger id="saleMethod">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">كاش فقط</SelectItem>
                              <SelectItem value="bank">مصرفي فقط</SelectItem>
                              <SelectItem value="mixed">مختلط (كاش + مصرفي)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {(saleMethod === 'cash' || saleMethod === 'mixed') && (
                          <div>
                            <Label htmlFor="cashAmount">مبلغ الكاش (دينار)</Label>
                            <Input
                              id="cashAmount"
                              type="number"
                              value={cashAmount}
                              onChange={(e) => setCashAmount(e.target.value)}
                              placeholder="أدخل مبلغ الكاش..."
                            />
                          </div>
                        )}

                        {(saleMethod === 'bank' || saleMethod === 'mixed') && (
                          <>
                            <div>
                              <Label htmlFor="bankAmount">مبلغ المصرفي (دينار)</Label>
                              <Input
                                id="bankAmount"
                                type="number"
                                value={bankAmount}
                                onChange={(e) => setBankAmount(e.target.value)}
                                placeholder="أدخل مبلغ المصرفي..."
                              />
                            </div>
                            <div>
                              <Label htmlFor="saleBankAccount">رقم الحساب البنكي</Label>
                              <Input
                                id="saleBankAccount"
                                value={saleBankAccount}
                                onChange={(e) => setSaleBankAccount(e.target.value)}
                                placeholder="أدخل رقم الحساب..."
                              />
                            </div>
                          </>
                        )}

                        <div className="bg-white rounded p-2 text-sm">
                          <p className="text-gray-600">📊 الإجمالي: <span className="font-bold text-gray-900">{((parseFloat(cashAmount) || 0) + (parseFloat(bankAmount) || 0)).toFixed(2)} د.ل</span></p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <Label htmlFor="statusReason">السبب (اختياري)</Label>
                  <Textarea
                    id="statusReason"
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    placeholder="أدخل سبب التغيير..."
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
                  إلغاء
                </Button>
                <Button onClick={handleSaveFinancialStatus}>
                  حفظ التغييرات
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Change Document Status Dialog */}
      <Dialog open={showDocsDialog} onOpenChange={setShowDocsDialog}>
        <DialogContent>
          {selectedCardForDocs && (
            <>
              <DialogHeader>
                <DialogTitle>تغيير حالة المستندات</DialogTitle>
                <DialogDescription>
                  البطاقة: {selectedCardForDocs.name} ({selectedCardForDocs.transactionId})
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label>الحالة الحالية</Label>
                  <p className="mt-1">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDocumentStatusColor(selectedCardForDocs.documentStatus)}`}>
                      {selectedCardForDocs.documentStatus}
                    </span>
                  </p>
                </div>

                <div>
                  <Label htmlFor="newDocumentStatus">الحالة الجديدة</Label>
                  <Select value={newDocumentStatus} onValueChange={(value) => setNewDocumentStatus(value as DocumentStatus)}>
                    <SelectTrigger id="newDocumentStatus">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="المعاملة ليست جاهزة للاستلام">المعاملة ليست جاهزة للاستلام</SelectItem>
                      <SelectItem value="جاهزة للاستلام">جاهزة للاستلام</SelectItem>
                      <SelectItem value="تم الاستلام بالكامل">تم الاستلام بالكامل</SelectItem>
                      <SelectItem value="متبقي جواز">متبقي جواز</SelectItem>
                      <SelectItem value="متبقي شفرة">متبقي شفرة</SelectItem>
                      <SelectItem value="متبقي بطاقة">متبقي بطاقة</SelectItem>
                      <SelectItem value="متبقي جواز + بطاقة">متبقي جواز + بطاقة</SelectItem>
                      <SelectItem value="متبقي جواز + شفرة">متبقي جواز + شفرة</SelectItem>
                      <SelectItem value="متبقي شفرة + بطاقة">متبقي شفرة + بطاقة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="docsReason">السبب (اختياري)</Label>
                  <Textarea
                    id="docsReason"
                    value={docsReason}
                    onChange={(e) => setDocsReason(e.target.value)}
                    placeholder="أدخل سبب التغيير..."
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDocsDialog(false)}>
                  إلغاء
                </Button>
                <Button onClick={handleSaveDocumentStatus}>
                  حفظ التغييرات
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Select Exchange Company Dialog */}
      <Dialog open={showExchangeDialog} onOpenChange={setShowExchangeDialog}>
        <DialogContent>
          {selectedCardForExchange && (
            <>
              <DialogHeader>
                <DialogTitle>اختيار شركة الصرافة</DialogTitle>
                <DialogDescription>
                  البطاقة: {selectedCardForExchange.name} ({selectedCardForExchange.transactionId})
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="exchangeCompanyName">اسم شركة الصرافة</Label>
                  <Input
                    id="exchangeCompanyName"
                    value={exchangeCompanyName}
                    onChange={(e) => setExchangeCompanyName(e.target.value)}
                    placeholder="مثال: شركة النيل للصرافة"
                  />
                </div>

                <div>
                  <Label htmlFor="exchangeCompanyPhone">رقم هاتف الشركة</Label>
                  <Input
                    id="exchangeCompanyPhone"
                    value={exchangeCompanyPhone}
                    onChange={(e) => setExchangeCompanyPhone(e.target.value)}
                    placeholder="مثال: 0921234567"
                  />
                </div>

                <div>
                  <Label htmlFor="exchangeRate">سعر الصرف</Label>
                  <Input
                    id="exchangeRate"
                    type="number"
                    step="0.01"
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(e.target.value)}
                    placeholder="مثال: 4.85"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowExchangeDialog(false)}>
                  إلغاء
                </Button>
                <Button onClick={handleSaveExchangeCompany}>
                  حفظ البيانات
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Document Status Change Dialog */}
      <Dialog open={showBulkDocsDialog} onOpenChange={setShowBulkDocsDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تغيير حالة المستندات لبطاقات متعددة</DialogTitle>
            <DialogDescription>
              اختر البطاقات التي تريد تغيير حالة مستنداتها
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* قائمة البطاقات مع checkboxes */}
            <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
              <div className="space-y-2">
                {cardsCtx.cards.map((card) => (
                  <div key={card.transactionId} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded">
                    <input
                      type="checkbox"
                      checked={selectedCardIds.includes(card.transactionId)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCardIds([...selectedCardIds, card.transactionId]);
                        } else {
                          setSelectedCardIds(selectedCardIds.filter(id => id !== card.transactionId));
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{card.name}</p>
                      <p className="text-sm text-slate-500">
                        {card.transactionId} - {card.cardNumber}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDocumentStatusColor(card.documentStatus)}`}>
                      {card.documentStatus}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* عدد البطاقات المختارة */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                تم اختيار <span className="font-bold">{selectedCardIds.length}</span> بطاقة
              </p>
            </div>

            {/* الحالة الجديدة */}
            <div>
              <Label htmlFor="bulkDocumentStatus">الحالة الجديدة</Label>
              <Select value={bulkDocumentStatus} onValueChange={(value) => setBulkDocumentStatus(value as DocumentStatus)}>
                <SelectTrigger id="bulkDocumentStatus">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="المعاملة ليست جاهزة للاستلام">المعاملة ليست جاهزة للاستلام</SelectItem>
                  <SelectItem value="جاهزة للاستلام">جاهزة للاستلام</SelectItem>
                  <SelectItem value="تم الاستلام بالكامل">تم الاستلام بالكامل</SelectItem>
                  <SelectItem value="متبقي جواز">متبقي جواز</SelectItem>
                  <SelectItem value="متبقي شفرة">متبقي شفرة</SelectItem>
                  <SelectItem value="متبقي بطاقة">متبقي بطاقة</SelectItem>
                  <SelectItem value="متبقي جواز + بطاقة">متبقي جواز + بطاقة</SelectItem>
                  <SelectItem value="متبقي جواز + شفرة">متبقي جواز + شفرة</SelectItem>
                  <SelectItem value="متبقي شفرة + بطاقة">متبقي شفرة + بطاقة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* السبب */}
            <div>
              <Label htmlFor="bulkDocsReason">السبب (اختياري)</Label>
              <Textarea
                id="bulkDocsReason"
                value={bulkDocsReason}
                onChange={(e) => setBulkDocsReason(e.target.value)}
                placeholder="أدخل سبب التغيير..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowBulkDocsDialog(false);
              setSelectedCardIds([]);
              setBulkDocsReason('');
            }}>
              إلغاء
            </Button>
            <Button 
              onClick={() => {
                if (selectedCardIds.length === 0) {
                  toast.error('يرجى اختيار بطاقة واحدة على الأقل');
                  return;
                }

                // تحديث حالة المستندات لجميع البطاقات المختارة
                selectedCardIds.forEach(transactionId => {
                  const card = cardsCtx.cards.find(c => c.transactionId === transactionId);
                  if (!card) return;

                  const oldStatus = card.documentStatus;
                  cardsCtx.updateCard(transactionId, {
                    documentStatus: bulkDocumentStatus,
                  });

                  // تسجيل العملية في LogsContext
                  if (authCtx.user) {
                    logsCtx.addAuditTrail({
                      action: 'edit_card',
                      entityType: 'card',
                      entityId: transactionId,
                      userId: authCtx.user.id,
                      userName: authCtx.user.fullName || 'غير محدد',
                      details: {
                        before: { documentStatus: oldStatus },
                        after: { documentStatus: bulkDocumentStatus },
                        description: `تغيير حالة المستندات من "${oldStatus}" إلى "${bulkDocumentStatus}" (جماعي)`,
                        reason: bulkDocsReason || undefined,
                      },
                      status: 'success',
                    });
                  }
                });

                toast.success(`تم تحديث حالة المستندات لـ ${selectedCardIds.length} بطاقة`);
                setShowBulkDocsDialog(false);
                setSelectedCardIds([]);
                setBulkDocsReason('');
              }}
              disabled={selectedCardIds.length === 0}
            >
              حفظ التغييرات ({selectedCardIds.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Card Confirmation Dialog */}
      {selectedCardForDelete && (
        <Dialog open={showDeleteDialog} onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setShowDeleteDialog(false);
            setSelectedCardForDelete(null);
          }
        }}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-red-700 flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                تأكيد حذف البطاقة
              </DialogTitle>
              <DialogDescription>
                هذا الإجراء سيحذف البطاقة ويُرجع المبالغ المالية تلقائياً
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* معلومات البطاقة */}
              <div className="bg-slate-50 rounded-lg p-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">الاسم:</span>
                  <span className="font-medium">{selectedCardForDelete.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">رقم المعاملة:</span>
                  <span className="font-mono">{selectedCardForDelete.transactionId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">الحالة المالية:</span>
                  <span className="font-medium">{selectedCardForDelete.financialStatus}</span>
                </div>
              </div>

              {/* المبالغ التي ستُرجع */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <h4 className="font-semibold text-amber-800 mb-2 text-sm">💰 المبالغ التي ستُرجع للخزينة:</h4>
                <div className="space-y-2 text-sm">
                  {/* تكلفة الشراء الإجمالية */}
                  {(selectedCardForDelete.totalPurchasePrice || 0) > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-amber-700">تكلفة الشراء الإجمالية:</span>
                      <span className="font-bold text-amber-900">
                        {(selectedCardForDelete.totalPurchasePrice || 0).toFixed(2)} د.ل
                      </span>
                    </div>
                  )}

                  {/* مبلغ الإيداع - فقط إذا كانت الحالة تم الإيداع أو أبعد */}
                  {(() => {
                    const depositStatuses = ['تم الإيداع', 'تم الحجز دون اختيار شركة الصرافة', 'تم اختيار شركة الصرافة', 'تمت المطابقة', 'في انتظار المطابقة', 'غير مطابق', 'تم التنفيذ'];
                    const depositAmount = selectedCardForDelete.depositAmount || 0;
                    const hasDeposit = depositAmount > 0 && depositStatuses.includes(selectedCardForDelete.financialStatus);
                    if (!hasDeposit) return null;

                    // تحديد اسم مصدر الإيداع
                    const card = selectedCardForDelete as any;
                    let depositSourceName = 'كاش دينار';
                    if (card.paymentMethod === 'bank' && card.treasuryAccountId) {
                      const account = allTreasuryAccounts.find((a: any) => a.id === card.treasuryAccountId);
                      depositSourceName = account ? `${account.bankName || account.accountName} - ${account.accountNumber || ''}`.trim().replace(/\s*-\s*$/, '') : 'حساب بنكي';
                    }

                    return (
                      <div className="flex justify-between items-center">
                        <span className="text-amber-700">مبلغ الإيداع ({depositSourceName}):</span>
                        <span className="font-bold text-amber-900">
                          {depositAmount.toFixed(2)} د.ل
                        </span>
                      </div>
                    );
                  })()}

                  {/* الإجمالي */}
                  {(() => {
                    const depositStatuses = ['تم الإيداع', 'تم الحجز دون اختيار شركة الصرافة', 'تم اختيار شركة الصرافة', 'تمت المطابقة', 'في انتظار المطابقة', 'غير مطابق', 'تم التنفيذ'];
                    const depositAmount = selectedCardForDelete.depositAmount || 0;
                    const hasDeposit = depositAmount > 0 && depositStatuses.includes(selectedCardForDelete.financialStatus);
                    const purchaseCost = selectedCardForDelete.totalPurchasePrice || 0;
                    const totalRefund = purchaseCost + (hasDeposit ? depositAmount : 0);

                    if (!hasDeposit) return null; // لا داعي للإجمالي إذا كان مبلغ واحد فقط

                    return (
                      <div className="flex justify-between items-center border-t border-amber-300 pt-2 mt-1">
                        <span className="font-semibold text-amber-800">الإجمالي المُرجَع:</span>
                        <span className="font-bold text-lg text-amber-900">
                          {totalRefund.toFixed(2)} د.ل
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <p className="text-sm text-red-600 font-medium text-center">
                ⚠️ لا يمكن التراجع عن هذا الإجراء
              </p>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteDialog(false);
                  setSelectedCardForDelete(null);
                }}
                disabled={isDeleting}
              >
                إلغاء
              </Button>
              <Button
                variant="destructive"
                disabled={isDeleting}
                onClick={async () => {
                  if (!selectedCardForDelete || !authCtx.user) return;
                  setIsDeleting(true);
                  try {
                    await cardsCtx.deleteCard(selectedCardForDelete.transactionId);
                    await refetchDeleted();
                    toast.success(`تم حذف بطاقة ${selectedCardForDelete.name} وإرجاع المبالغ للخزينة`);
                    // إرسال Web Push للمدير ونائبه
                    sendPushToManagers(
                      '⚠️ حذف بطاقة',
                      `الموظف: ${authCtx.user?.fullName || 'admin'} | الزبون: ${selectedCardForDelete.name} | رقم المعاملة: ${selectedCardForDelete.transactionId} | تكلفة الشراء: ${selectedCardForDelete.totalPurchasePrice} د.ل`,
                      getManagerIds(),
                      '/cards'
                    );
                    setShowDeleteDialog(false);
                    setSelectedCardForDelete(null);
                  } catch (err: any) {
                    toast.error(err?.message || 'حدث خطأ أثناء الحذف');
                  } finally {
                    setIsDeleting(false);
                  }
                }}
              >
                {isDeleting ? 'جارٍ الحذف...' : 'تأكيد الحذف'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
