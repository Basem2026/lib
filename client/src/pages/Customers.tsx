import { useCustomers } from '@/contexts/CustomersContext';
import { useEmployees } from '@/contexts/EmployeesContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useAuth } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useMemo } from 'react';
import { Plus, Search, Eye, Trash2, EyeOff, Scan } from 'lucide-react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import { AddCustomerDialog } from '@/components/AddCustomerDialog';
import UnifiedBarcodeScanner from '@/components/UnifiedBarcodeScanner';

// دالة للحصول على صورة البطاقة حسب المصرف
const getBankCardImage = (bankId: string) => {
  const bankImages: Record<string, string> = {
    'aman': '/images/aman_bank_card.png',
    'nab': 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663215657361/SxjmkSWFrBpXPfMW.png',
    'atib': 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663215657361/EjQUlYgXhXpRyUyn.png',
    'jumhouria': 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663215657361/TGTlIwUrRzGjrUMe.png',
    'united': 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663215657361/XoTNOZthZcYAGprL.png',
    'ncb': 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663215657361/xGpllGYkrpBQjKRj.png',
    'yaqeen': 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663215657361/ZOEYakMyLnxFWydE.png',
    'sahary': 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663215657361/uHfstOWaIoRNqZnp.png',
    'andalus': 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663215657361/ayvDJGZBeLRLiXWc.jpeg',
    'wahda': 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663215657361/MUChnLOIArvdnGDI.png',
    'libbank': 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663215657361/BjLzpqMziSaHWfIC.png',
    'nuran': 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663215657361/HlNzNsaDdJJKDpWg.png',
    'bcd': 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663215657361/WwLynAczbqLKMNUg.png',
    'alwaha': 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663215657361/ScXPjRRxmGTqfGCL.png',
  };
  return bankImages[bankId] || bankImages['aman'];
};

// دالة للحصول على اسم المصرف بالعربي والإنجليزي
const getBankName = (bankId: string) => {
  const bankNames: Record<string, { ar: string; en: string }> = {
    'aman': { ar: 'مصرف الأمان', en: 'AMAN BANK' },
    'nab': { ar: 'مصرف شمال أفريقيا', en: 'NORTH AFRICA BANK' },
    'atib': { ar: 'مصرف السرايا', en: 'AL SARAYA BANK' },
    'jumhouria': { ar: 'مصرف الجمهورية', en: 'JUMHOURIA BANK' },
    'united': { ar: 'المصرف المتحد', en: 'UNITED BANK' },
    'ncb': { ar: 'المصرف التجاري الوطني', en: 'NATIONAL COMMERCIAL BANK' },
    'yaqeen': { ar: 'مصرف اليقين', en: 'AL YAQEEN BANK' },
    'sahary': { ar: 'مصرف الصحاري', en: 'SAHARY BANK' },
    'andalus': { ar: 'مصرف الأندلس', en: 'AL ANDALUS BANK' },
    'wahda': { ar: 'مصرف الوحدة', en: 'WAHDA BANK' },
    'libbank': { ar: 'المصرف الليبي الإسلامي', en: 'LIBYAN ISLAMIC BANK' },
    'nuran': { ar: 'مصرف النوران', en: 'NURAN BANK' },
    'bcd': { ar: 'مصرف التجارة والتنمية', en: 'BANK OF COMMERCE & DEVELOPMENT' },
    'alwaha': { ar: 'مصرف الواحة', en: 'AL WAHA BANK' },
  };
  return bankNames[bankId] || bankNames['aman'];
};

export default function Customers() {
  const customersCtx = useCustomers();
  const { employees } = useEmployees();
  const { hasPermission } = usePermissions();
  const { user } = useAuth();
  const { sendPushToManagers } = useNotifications();
  const getManagerIds = () =>
    employees
      .filter(e => (e.jobTitle === 'manager' || e.jobTitle === 'deputy_manager') && e.status === 'active')
      .map(e => e.id);
  const [, setLocation] = useLocation();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDelegate, setFilterDelegate] = useState('all');
  const [filterCardStatus, setFilterCardStatus] = useState('all');
  const [showAddCustomerDialog, setShowAddCustomerDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('customers');
  const [visibleCVV, setVisibleCVV] = useState<string | null>(null);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  
  // فلاتر متقدمة
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterBank, setFilterBank] = useState('all');
  const [filterCardExpiry, setFilterCardExpiry] = useState('all');
  const [filterPassportExpiry, setFilterPassportExpiry] = useState('all');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

  // قائمة المندوبين الفريدة
  const { data: delegates = [] } = trpc.delegates.list.useQuery();
  const uniqueDelegates = useMemo(() => {
    return delegates.map((d: any) => ({ id: d.id, name: d.name }));
  }, [delegates]);

  // دوال مساعدة للتحقق من الصلاحية
  const getCardExpiryStatus = (expiryDate: string | undefined) => {
    if (!expiryDate) return 'unknown';
    const [month, year] = expiryDate.split('/');
    const expiry = new Date(2000 + parseInt(year), parseInt(month) - 1);
    const today = new Date();
    const daysUntilExpiry = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry < 90) return 'expiring_soon';
    return 'valid';
  };

  const getPassportExpiryStatus = (expiryDate: string | undefined) => {
    if (!expiryDate) return 'unknown';
    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry < 90) return 'expiring_soon';
    return 'valid';
  };

  const filteredCustomers = useMemo(() => {
    return customersCtx.customers.filter(c => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = !query || 
        c.name.toLowerCase().includes(query) || 
        c.phone.includes(query) ||
        (c.transactionNumber && c.transactionNumber.toLowerCase().includes(query)) ||
        (c.iban1 && c.iban1.toLowerCase().includes(query)) ||
        (c.iban2 && c.iban2.toLowerCase().includes(query)) ||
        (c.accountPhone && c.accountPhone.includes(query)) ||
        (c.personalPhone && c.personalPhone.includes(query)) ||
        (c.cardNumber && c.cardNumber.includes(query)) ||
        (c.passportNumber && c.passportNumber.toLowerCase().includes(query));
      // فلترة حسب الحالة (متعددة الخيارات أو واحدة)
      const matchesStatus = selectedStatuses.length > 0 
        ? selectedStatuses.includes(c.operationStatus) 
        : (filterStatus === 'all' || c.operationStatus === filterStatus);
      
      const matchesDelegate = filterDelegate === 'all' || c.delegateId === filterDelegate;
      
      // فلترة حسب نطاق التاريخ
      const matchesDateRange = !filterDateFrom && !filterDateTo || (
        new Date(c.registrationDate) >= new Date(filterDateFrom) &&
        new Date(c.registrationDate) <= new Date(filterDateTo)
      );
      
      // فلترة حسب المصرف
      const matchesBank = filterBank === 'all' || c.bankId === filterBank;
      
      // فلترة حسب صلاحية البطاقة
      const cardStatus = getCardExpiryStatus(c.cardExpiry);
      const matchesCardExpiry = filterCardExpiry === 'all' || cardStatus === filterCardExpiry;
      
      // فلترة حسب صلاحية الجواز
      const passportStatus = getPassportExpiryStatus(c.passportExpiry);
      const matchesPassportExpiry = filterPassportExpiry === 'all' || passportStatus === filterPassportExpiry;
      
      return matchesSearch && matchesStatus && matchesDelegate && matchesDateRange && matchesBank && matchesCardExpiry && matchesPassportExpiry;
    });
  }, [customersCtx.customers, searchQuery, filterStatus, filterDelegate, filterDateFrom, filterDateTo, filterBank, filterCardExpiry, filterPassportExpiry, selectedStatuses]);

  // إحصائيات عامة لكل الزباين
  const globalStats = useMemo(() => {
    // 1. قيمة المشتريات الإجمالي - يجمع السعر الإجمالي لكل البطاقات
    const totalPurchases = customersCtx.customers.reduce((sum, c) => {
      return sum + (c.purchasePrice || 0) + (c.delegateShare || 0);
    }, 0);

    // 2. عدد البطاقات الكلي - عدد الزبائن الكلي
    const totalCards = customersCtx.customers.length;

    // 3. إجمالي الإيداعات بالدينار - القيمة المودعة التي لم تُسحب بعد
    const totalDeposits = customersCtx.customers.reduce((sum, c) => {
      // فقط البطاقات المودعة ولم يتم سحبها بعد
      if (c.operationStatus === 'deposited' || c.operationStatus === 'awaiting_execution' || c.operationStatus === 'executed') {
        return sum + (c.purchasePrice || 0) + (c.delegateShare || 0);
      }
      return sum;
    }, 0);

    // 4. الرصيد الحالي بالدولار - إجمالي الرصيد بعد التنفيذ
    const currentBalanceUSD = customersCtx.customers.reduce((sum, c) => {
      // فقط البطاقات المنفذة وما بعدها
      if (c.operationStatus === 'executed' || c.operationStatus === 'partial_withdrawal' || c.operationStatus === 'full_withdrawal') {
        return sum + (c.totalBalance || 0);
      }
      return sum;
    }, 0);

    // 5. البطاقات المسحوبة - جاهزة للاستلام
    const readyForPickup = customersCtx.customers.filter(c => c.operationStatus === 'ready_for_pickup').length;

    // 6. البطاقات التي تحتوي على متبقي - تم السحب مع وجود متبقي
    const partialWithdrawal = customersCtx.customers.filter(c => c.operationStatus === 'partial_withdrawal').length;

    // 7. البطاقات المسحوبة اليوم - تم السحب بالكامل
    const fullWithdrawal = customersCtx.customers.filter(c => c.operationStatus === 'full_withdrawal').length;

    // 8. البطاقات المستلمة - حالة المستندات مستلمة بالكامل
    const documentsReceived = customersCtx.customers.filter(c => c.documentStatus === 'all_delivered').length;

    // 9. بطاقات ملغية
    const cancelled = customersCtx.customers.filter(c => c.operationStatus === 'cancelled').length;

    return {
      totalPurchases,
      totalCards,
      totalDeposits,
      currentBalanceUSD,
      readyForPickup,
      partialWithdrawal,
      fullWithdrawal,
      documentsReceived,
      cancelled,
    };
  }, [customersCtx.customers]);

  const stats = useMemo(() => {
    const cardsByStatus = {
      active: customersCtx.cards.filter(c => c.status === 'active').length,
      inactive: customersCtx.cards.filter(c => c.status === 'inactive').length,
      blocked: customersCtx.cards.filter(c => c.status === 'blocked').length,
    };
    const operationsByStatus = {
      completed: customersCtx.customers.filter(c => c.operationStatus === 'executed' || c.operationStatus === 'full_withdrawal').length,
      pending: customersCtx.customers.filter(c => c.operationStatus === 'awaiting_execution' || c.operationStatus === 'awaiting_match').length,
    };
    return {
      totalCustomers: customersCtx.customers.length,
      totalCards: customersCtx.cards.length,
      cardsByStatus,
      operationsByStatus,
    };
  }, [customersCtx.customers, customersCtx.cards]);

  const handleDeleteCustomer = (id: string) => {
    const customer = customersCtx.customers.find(c => c.id === id);
    if (confirm('هل أنت متأكد من حذف هذا الزبون؟')) {
      customersCtx.removeCustomer(id);
      toast.success('تم حذف الزبون بنجاح!');
      // إرسال Web Push للمدير ونائبه
      sendPushToManagers(
        '⚠️ حذف زبون',
        `الموظف: ${user?.fullName || 'admin'} | الزبون: ${customer?.name || id} | رقم المعاملة: ${customer?.transactionNumber || id}`,
        getManagerIds(),
        '/customers'
      );
    }
  };

  const handleBarcodeScan = (code: string) => {
    // البحث عن الزبون بواسطة:
    // 1. رقم المعاملة (Transaction Number) - Format: 000001
    // 2. رقم البطاقة (Card Number)
    // 3. رقم المعاملة + رقم البطاقة - Format: 000001-1234567890123456
    
    let customer = customersCtx.customers.find(c => c.transactionNumber === code);
    
    // إذا لم يتم العثور، جرب البحث برقم البطاقة
    if (!customer) {
      customer = customersCtx.customers.find(c => c.cardNumber === code);
    }
    
    // إذا كان الباركود يحتوي على رقم المعاملة + رقم البطاقة
    if (!customer && code.includes('-')) {
      const parts = code.split('-');
      if (parts.length >= 2) {
        const trxNumber = parts[0]; // 000001
        customer = customersCtx.customers.find(c => c.transactionNumber === trxNumber);
      }
    }

    if (customer) {
      toast.success(`تم العثور على: ${customer.name}`);
      setLocation(`/customers/${customer.id}`);
      setShowBarcodeScanner(false);
    } else {
      toast.error('لم يتم العثور على زبون بهذا الرمز');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">الزباين والبطاقات</h1>
          <p className="text-slate-600 mt-1">إدارة الزباين والبطاقات البنكية</p>
        </div>
        <Button onClick={() => setLocation('/dashboard')} variant="outline" size="sm">
          ← العودة
        </Button>
      </div>

      {/* لوحة الإحصائيات العامة */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-purple-600">قيمة المشتريات الإجمالي</p>
            <p className="text-3xl font-bold text-purple-900 mt-2">{globalStats.totalPurchases.toFixed(2)} د.ل</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-indigo-600">عدد البطاقات الكلي</p>
            <p className="text-3xl font-bold text-indigo-900 mt-2">{globalStats.totalCards}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-teal-600">إجمالي الإيداعات</p>
            <p className="text-3xl font-bold text-teal-900 mt-2">{globalStats.totalDeposits.toFixed(2)} د.ل</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-amber-600">الرصيد الحالي بالدولار</p>
            <p className="text-3xl font-bold text-amber-900 mt-2">${globalStats.currentBalanceUSD.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* لوحة الإحصائيات التفصيلية */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-blue-600">البطاقات المسحوبة</p>
            <p className="text-3xl font-bold text-blue-900 mt-2">{globalStats.readyForPickup}</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-green-600">بطاقات تحتوي على متبقي</p>
            <p className="text-3xl font-bold text-green-900 mt-2">{globalStats.partialWithdrawal}</p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-yellow-600">بطاقات مسحوبة اليوم</p>
            <p className="text-3xl font-bold text-yellow-900 mt-2">{globalStats.fullWithdrawal}</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-purple-600">بطاقات مستلمة</p>
            <p className="text-3xl font-bold text-purple-900 mt-2">{globalStats.documentsReceived}</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-red-600">بطاقات ملغية</p>
            <p className="text-3xl font-bold text-red-900 mt-2">{globalStats.cancelled}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
        <div className="flex-1 relative">
          <Search className="absolute right-3 top-3 text-slate-400 w-5 h-5" />
          <Input
            placeholder="ابحث: الاسم، رقم المعاملة، رقم الهاتف، رقم الحساب، رقم البطاقة، رقم الجواز..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-auto md:min-w-[180px]"
        >
          <option value="all">جميع الحالات</option>
          <option value="purchased">تم الشراء</option>
          <option value="awaiting_match">في إنتظار المطابقة</option>
          <option value="matched">تمت المطابقة</option>
          <option value="not_matched">غير مطابق</option>
          <option value="reserved">تم الحجز</option>
          <option value="deposited">تم الإيداع</option>
          <option value="awaiting_execution">في انتظار التنفيذ</option>
          <option value="executed">تم التنفيذ</option>
          <option value="partial_withdrawal">تم السحب مع وجود متبقي</option>
          <option value="full_withdrawal">تم السحب بالكامل</option>
          <option value="ready_for_pickup">جاهزة للاستلام</option>
          <option value="cancelled">ملغية</option>
        </select>
        <select
          value={filterDelegate}
          onChange={(e) => setFilterDelegate(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-auto md:min-w-[180px]"
        >
          <option value="all">جميع المندوبين</option>
          {uniqueDelegates.map((delegate: any) => (
            <option key={delegate.id} value={delegate.id}>{delegate.fullName}</option>
          ))}
        </select>
        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} 
            variant="outline"
            className="border-purple-500 text-purple-600 hover:bg-purple-50 flex-1 md:flex-none"
          >
            🔍 فلاتر متقدمة
          </Button>
          <Button 
            onClick={() => setShowBarcodeScanner(true)} 
            variant="outline"
            className="border-blue-500 text-blue-600 hover:bg-blue-50 flex-1 md:flex-none"
          >
            <Scan className="w-4 h-4 ml-2" />
            مسح باركود
          </Button>
          {hasPermission('add_customer') && (
            <Button onClick={() => setShowAddCustomerDialog(true)} className="bg-green-600 hover:bg-green-700 flex-1 md:flex-none">
              <Plus className="w-4 h-4 ml-2" />
              إضافة زبون
            </Button>
          )}
        </div>
      </div>

      {/* لوحة الفلاتر المتقدمة */}
      {showAdvancedFilters && (
        <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200 mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* فلترة حسب نطاق التاريخ */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">من التاريخ</label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">إلى التاريخ</label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              
              {/* فلترة حسب المصرف */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">المصرف</label>
                <select
                  value={filterBank}
                  onChange={(e) => setFilterBank(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">جميع المصارف</option>
                  <option value="aman">مصرف الأمان</option>
                  <option value="nab">مصرف شمال أفريقيا</option>
                  <option value="atib">مصرف السرايا</option>
                  <option value="jumhouria">مصرف الجمهورية</option>
                  <option value="united">المصرف المتحدة</option>
                  <option value="ncb">المصرف التجاري الوطني</option>
                  <option value="yaqeen">مصرف اليقين</option>
                  <option value="sahary">مصرف الصحاري</option>
                  <option value="andalus">مصرف الأندلس</option>
                  <option value="wahda">مصرف الوحدة</option>
                  <option value="libbank">المصرف الليبي الإسلامي</option>
                  <option value="nuran">مصرف النوران</option>
                  <option value="bcd">مصرف التجارة والتنمية</option>
                  <option value="alwaha">مصرف الواحة</option>
                </select>
              </div>
              
              {/* فلترة حسب صلاحية البطاقة */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">صلاحية البطاقة</label>
                <select
                  value={filterCardExpiry}
                  onChange={(e) => setFilterCardExpiry(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">الكل</option>
                  <option value="valid">سارية</option>
                  <option value="expiring_soon">قريبة الانتهاء</option>
                  <option value="expired">منتهية</option>
                </select>
              </div>
              
              {/* فلترة حسب صلاحية الجواز */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">صلاحية الجواز</label>
                <select
                  value={filterPassportExpiry}
                  onChange={(e) => setFilterPassportExpiry(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">الكل</option>
                  <option value="valid">ساري</option>
                  <option value="expiring_soon">قريب الانتهاء</option>
                  <option value="expired">منتهي</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-2 mt-4 flex-wrap">
              <Button
                onClick={() => {
                  setFilterDateFrom('');
                  setFilterDateTo('');
                  setFilterBank('all');
                  setFilterCardExpiry('all');
                  setFilterPassportExpiry('all');
                  setSelectedStatuses([]);
                  setFilterStatus('all');
                }}
                variant="outline"
                className="border-red-500 text-red-600 hover:bg-red-50"
              >
                مسح الفلاتر
              </Button>
              <div className="text-sm text-slate-600 flex items-center">
                عدد النتائج: <span className="font-bold text-purple-600 ml-2">{filteredCustomers.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="customers">الزباين {filteredCustomers.length}</TabsTrigger>
          <TabsTrigger value="cards">البطاقات {customersCtx.customers.length}</TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="space-y-4">
          {filteredCustomers.length === 0 ? (
            <Card className="text-center py-12">
              <p className="text-slate-500">لا توجد زباين</p>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 border-b-2 border-slate-300">
                  <tr>
                    <th className="px-4 py-3 text-center font-semibold text-slate-700">رقم المعاملة</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-700">الاسم</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-700">حالة العملية</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-700">حالة المستندات</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-700">ثمن الشراء (الإجمالي)</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-700">المندوب</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-700">المستندات</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-700">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="px-4 py-3 text-center">
                        <span className="font-mono text-blue-600 font-semibold">{customer.transactionNumber || 'N/A'}</span>
                      </td>
                      <td className="px-4 py-3 text-center">{customer.name}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          customer.operationStatus === 'executed' || customer.operationStatus === 'full_withdrawal'
                            ? 'bg-green-100 text-green-800'
                            : customer.operationStatus === 'awaiting_execution' || customer.operationStatus === 'awaiting_match'
                              ? 'bg-yellow-100 text-yellow-800'
                              : customer.operationStatus === 'not_matched'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800'
                        }`}>
                          {customer.operationStatus === 'purchased' ? 'تم الشراء' :
                           customer.operationStatus === 'awaiting_match' ? 'في إنتظار المطابقة' :
                           customer.operationStatus === 'matched' ? 'تمت المطابقة' :
                           customer.operationStatus === 'not_matched' ? 'غير مطابق' :
                           customer.operationStatus === 'reserved' ? 'تم الحجز' :
                           customer.operationStatus === 'deposited' ? 'تم الإيداع' :
                           customer.operationStatus === 'awaiting_execution' ? 'في انتظار التنفيذ' :
                           customer.operationStatus === 'executed' ? 'تم التنفيذ' :
                           customer.operationStatus === 'partial_withdrawal' ? 'تم السحب مع وجود متبقي' :
                           customer.operationStatus === 'full_withdrawal' ? 'تم السحب بالكامل' :
                           'جاهزة للاستلام'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          customer.documentStatus === 'all_delivered'
                            ? 'bg-green-100 text-green-800'
                            : customer.documentStatus === 'cannot_deliver'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {customer.documentStatus === 'cannot_deliver' ? 'لا يمكن التسليم' :
                           customer.documentStatus === 'passport_delivered' ? 'تم تسليم جواز السفر' :
                           customer.documentStatus === 'pin_delivered' ? 'تم تسليم الشفرة' :
                           customer.documentStatus === 'card_delivered' ? 'تم تسليم البطاقة' :
                           customer.documentStatus === 'card_pin_delivered' ? 'تم تسليم البطاقة والشفرة' :
                           customer.documentStatus === 'passport_card_delivered' ? 'تم تسليم الجواز والبطاقة' :
                           customer.documentStatus === 'passport_pin_delivered' ? 'تم تسليم الجواز والشفرة' :
                           'تم تسليم كامل المستندات'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-semibold">{((customer.purchasePrice || 0) + (customer.delegateShare || 0))} د.ل</td>
                      <td className="px-4 py-3 text-center">{customer.delegateId || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex gap-2 justify-center items-center">
                          {customer.documents?.includes('جواز سفر') && (
                            <div className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              جواز
                            </div>
                          )}
                          {customer.documents?.includes('شفرة') && (
                            <div className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                              شفرة
                            </div>
                          )}
                          {customer.documents?.includes('بطاقة') && (
                            <div className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                              بطاقة
                            </div>
                          )}
                          {(!customer.documents || customer.documents.length === 0) && (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex gap-2 justify-center">
                          <Button size="sm" variant="outline" onClick={() => setLocation(`/customers/${customer.id}`)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          {hasPermission('delete_customer') && (
                            <Button size="sm" variant="outline" onClick={() => handleDeleteCustomer(customer.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="cards" className="space-y-4">
          {filteredCustomers.length === 0 ? (
            <Card className="text-center py-12">
              <p className="text-slate-500">لا توجد بطاقات</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCustomers.map((customer) => {
                const totalPurchase = (customer.purchasePrice || 0) + (customer.delegateShare || 0);
                
                return (
                  <div key={customer.id} className="relative">
                    <div 
                      className="rounded-2xl p-6 text-white shadow-2xl h-56 flex flex-col justify-between relative overflow-hidden bg-cover bg-center"
                      style={{
                        backgroundImage: `url(${getBankCardImage(customer.bankId || 'aman')})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}
                    >
                      <div className="absolute inset-0 bg-black opacity-20"></div>

                      <div className="flex justify-between items-start relative z-20">
                        <div>
                          <p className="text-xs opacity-90">رقم البطاقة</p>
                          <p className="text-xl font-mono font-bold tracking-wider">
                            {customer.cardNumber?.slice(-4).padStart(16, '*')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs opacity-90">{getBankName(customer.bankId || 'aman').ar}</p>
                          <p className="text-sm font-bold">{getBankName(customer.bankId || 'aman').en}</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-end relative z-20">
                        <div>
                          <p className="text-xs opacity-90">صاحب البطاقة</p>
                          <p className="text-sm font-semibold">{customer.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs opacity-90">الصلاحية</p>
                          <p className="text-sm font-mono">
                            {customer.cardExpiry 
                              ? (typeof customer.cardExpiry === 'string' && customer.cardExpiry.match(/^\d{1,2}\/\d{2,4}$/) 
                                  ? customer.cardExpiry 
                                  : (typeof customer.cardExpiry === 'string' ? customer.cardExpiry : formatDate(customer.cardExpiry)))
                              : '**/**'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 bg-white rounded-lg p-4 shadow-md border border-slate-200 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 font-medium">ثمن الشراء الإجمالي:</span>
                        <span className="text-lg font-bold text-purple-600">{totalPurchase.toFixed(2)} د.ل</span>
                      </div>
                      {customer.delegateId && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 font-medium">المندوب:</span>
                          <span className="text-sm font-semibold text-blue-600">{customer.delegateId}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 font-medium">رصيد الدولار:</span>
                        <span className="text-lg font-bold text-green-600">${customer.totalBalance || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 font-medium">الحالة:</span>
                        <span className="text-sm font-semibold text-orange-600">
                          {customer.operationStatus === 'purchased' ? 'تم الشراء' : 
                           customer.operationStatus === 'awaiting_match' ? 'في إنتظار المطابقة' :
                           customer.operationStatus === 'matched' ? 'تمت المطابقة' :
                           customer.operationStatus === 'not_matched' ? 'غير مطابق' :
                           customer.operationStatus === 'deposited' ? 'تم الإيداع' :
                           customer.operationStatus === 'awaiting_execution' ? 'في إنتظار التنفيذ' :
                           customer.operationStatus === 'executed' ? 'تم التنفيذ' :
                           customer.operationStatus === 'ready_for_pickup' ? 'جاهزة للاستلام' :
                           customer.operationStatus === 'partial_withdrawal' ? 'تم السحب مع وجود متبقي' :
                           customer.operationStatus === 'full_withdrawal' ? 'تم السحب بالكامل' :
                           customer.operationStatus === 'cancelled' ? 'ملغية' : customer.operationStatus}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 font-medium">الرمز السري (PIN):</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold">
                            {visibleCVV === customer.id ? customer.cardPin || '-' : '****'}
                          </span>
                          <button
                            onClick={() => setVisibleCVV(visibleCVV === customer.id ? null : customer.id)}
                            className="p-1 hover:bg-slate-100 rounded transition"
                          >
                            {visibleCVV === customer.id ? (
                              <EyeOff className="w-4 h-4 text-slate-600" />
                            ) : (
                              <Eye className="w-4 h-4 text-slate-600" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AddCustomerDialog 
        open={showAddCustomerDialog} 
        onOpenChange={setShowAddCustomerDialog}
      />

      {/* مكون مسح الباركود */}
      {showBarcodeScanner && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">مسح باركود للبحث عن زبون</h3>
            <p className="text-sm text-slate-600 mb-4">
              امسح رقم المعاملة (000001) أو رقم البطاقة
            </p>
            <UnifiedBarcodeScanner onScan={handleBarcodeScan} />
            <Button 
              variant="outline" 
              onClick={() => setShowBarcodeScanner(false)}
              className="w-full mt-4"
            >
              إلغاء
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
