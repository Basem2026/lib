import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployees, JOB_TITLES } from '@/contexts/EmployeesContext';
import { useCustomers } from '@/contexts/CustomersContext';
import type { Customer } from '@/types/customers';
import { useOperations } from '@/contexts/OperationsContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LogOut, User, Users, FileText, BarChart3, Settings, Bell, Lock, Plus, CreditCard, DollarSign, TrendingUp, TrendingDown, Activity, ArrowUpRight, Wallet, Landmark, CheckCircle, FileCheck, AlertTriangle, Building2, ClipboardList, ScanLine } from 'lucide-react';
import ScannerDialog from '@/components/ScannerDialog';
import { SyncStatusIndicator } from '@/components/SyncStatusIndicator';
import { formatDate } from '@/lib/utils';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

import { useMemo } from 'react';
import { useEffect, useState } from 'react';
import { PermissionsDialog } from '@/components/PermissionsDialog';
import { useExpiringAlerts } from '@/hooks/useExpiringAlerts';
import { useNotifications } from '@/contexts/NotificationsContext';

const COLORS = ['#1E2E3D', '#C9A34D', '#6E7C87', '#3B82F6', '#10B981', '#F59E0B'];

export default function PersonalDashboard() {
  const { user, logout, hasPermission } = useAuth();
  const { employees } = useEmployees();
  const { customers, addCustomer } = useCustomers();
  const { operations, addOperation } = useOperations();
  const { cards } = useCustomers();
  // const treasuryCtx = useTreasury(); // تم حذف TreasuryContext القديم
  const treasuryCtx = { 
    transactions: [], 
    cashBalance: { amount: 0, currency: 'LYD' as const }, 
    bankAccounts: [],
    getTotalBankBalance: () => 0 // مؤقتاً
  };
  const [, navigate] = useLocation();
  const [isReady, setIsReady] = useState(false);
  const { criticalAlerts, expiringAlerts } = useExpiringAlerts();
  const { notifications } = useNotifications();
  const unreadCritical = notifications.filter(n => n.type === 'error' && !n.read).length;
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [showOperationDialog, setShowOperationDialog] = useState(false);
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [showScannerDialog, setShowScannerDialog] = useState(false);
  const [timeFilter, setTimeFilter] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [operationForm, setOperationForm] = useState({
    customerId: '',
    type: 'deposit',
    amount: '',
    description: '',
    profit: '',
  });
  const [customerForm, setCustomerForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  });

  // البحث عن بيانات الموظف الحالي
  const currentEmployee = employees.find(emp => emp.phone === user?.phone);

  useEffect(() => {
    // إذا كان هناك مستخدم وموظف، نحن جاهزون
    if (user && currentEmployee) {
      setIsReady(true);
      // عرض نافذة الأذونات بعد 3 ثواني
      setTimeout(() => {
        setShowPermissionsDialog(true);
      }, 3000);
    } else if (user && !currentEmployee) {
      // إذا كان هناك مستخدم لكن لا توجد بيانات موظف، استخدم بيانات وهمية
      setIsReady(true);
      setTimeout(() => {
        setShowPermissionsDialog(true);
      }, 3000);
    } else {
      // إذا لم يكن هناك مستخدم، أعد التوجيه إلى تسجيل الدخول
      setTimeout(() => {
        navigate('/login');
      }, 500);
    }
  }, [user, currentEmployee, navigate]);

  // استخدم بيانات الموظف أو بيانات وهمية (قبل الـ return المبكر)
  const displayEmployee = useMemo(() => currentEmployee || {
    id: user?.id.toString() || 'temp',
    employeeCode: 'TEMP-001',
    phone: user?.phone || '',
    fullName: user?.fullName || 'مستخدم',
    jobTitle: 'manager' as const,
    passwordHash: '',
    status: 'active' as const,
    permissions: [],
    createdAt: new Date(),
    createdBy: 'system',
    updatedAt: new Date(),
  }, [currentEmployee, user]);

  // دوال حساب البيانات الحقيقية حسب الفلتر الزمني
  const getFilteredTransactions = useMemo(() => {
    const now = new Date();
    const transactions = treasuryCtx.transactions;
    
    return transactions.filter((t: any) => {
      const transactionDate = new Date(t.date);
      
      switch (timeFilter) {
        case 'day':
          return transactionDate.toDateString() === now.toDateString();
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return transactionDate >= weekAgo;
        case 'month':
          return transactionDate.getMonth() === now.getMonth() && 
                 transactionDate.getFullYear() === now.getFullYear();
        case 'year':
          return transactionDate.getFullYear() === now.getFullYear();
        default:
          return true;
      }
    });
  }, [treasuryCtx.transactions, timeFilter]);

  // حساب البيانات الشهرية للرسم البياني الخطي
  const getMonthlyData = useMemo(() => {
    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const currentYear = new Date().getFullYear();
    
    return monthNames.map((month, index) => {
      const monthTransactions = treasuryCtx.transactions.filter((t: any) => {
        const date = new Date(t.date);
        return date.getMonth() === index && date.getFullYear() === currentYear;
      });
      
      const revenue = monthTransactions
        .filter((t: any) => t.type === 'income')
        .reduce((sum: number, t: any) => sum + t.amount, 0);
      
      const expenses = monthTransactions
        .filter((t: any) => t.type === 'expense')
        .reduce((sum: number, t: any) => sum + t.amount, 0);
      
      return { month, revenue, expenses };
    });
  }, [treasuryCtx.transactions]);

  // حساب الأرباح الشهرية للرسم البياني العمودي
  const getMonthlyProfits = useMemo(() => {
    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const currentYear = new Date().getFullYear();
    
    return monthNames.map((month, index) => {
      const monthTransactions = treasuryCtx.transactions.filter((t: any) => {
        const date = new Date(t.date);
        return date.getMonth() === index && date.getFullYear() === currentYear;
      });
      
      const revenue = monthTransactions
        .filter((t: any) => t.type === 'income')
        .reduce((sum: number, t: any) => sum + t.amount, 0);
      
      const expenses = monthTransactions
        .filter((t: any) => t.type === 'expense')
        .reduce((sum: number, t: any) => sum + t.amount, 0);
      
      const profit = revenue - expenses;
      
      return { month, profit };
    });
  }, [treasuryCtx.transactions]);

  // حساب توزيع المصروفات الحقيقية
  const getExpensesDistribution = useMemo(() => {
    const expenseTransactions = getFilteredTransactions.filter((t: any) => t.type === 'expense');
    
    // تجميع المصروفات حسب الفئة (من description)
    const categories: { [key: string]: number } = {};
    expenseTransactions.forEach((t: any) => {
      // استخراج الفئة من description أو استخدام "أخرى"
      const category = t.description.includes('رواتب') ? 'رواتب' :
                      t.description.includes('إيجار') ? 'إيجار' :
                      t.description.includes('إداري') ? 'مصاريف إدارية' :
                      t.description.includes('تسويق') ? 'تسويق' : 'أخرى';
      categories[category] = (categories[category] || 0) + t.amount;
    });
    
    // تحويل إلى مصفوفة
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [getFilteredTransactions]);

  if (!isReady || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-lg md:text-2xl font-bold text-slate-900 mb-4">جاري التحميل...</h1>
        </div>
      </div>
    );
  }

  const role = displayEmployee.jobTitle;

  // تحديد الصلاحيات والخيارات المتاحة حسب الدور
  const getAvailableOptions = () => {
    const options = [];

    // موظف الإدخال - يرى فقط زر إضافة زبون
    if (role === 'data_entry') {
      options.push({
        icon: Users,
        title: 'إضافة زبون',
        description: 'إضافة زبون جديد',
        path: '/data-entry',
        color: 'bg-indigo-500',
      });
      return options;
    }

    // الخيارات المشتركة (للموظفين الآخرين)
    options.push({
      icon: Users,
      title: 'الزبائن',
      description: 'إدارة الزبائن والعملاء',
      path: '/customers',
      color: 'bg-blue-500',
    });

    // إدارة البطاقات - للجميع ماعدا مشرف المكتب
    if (role !== 'supervisor') {
      options.push({
        icon: CreditCard,
        title: 'إدارة البطاقات',
        description: 'تغيير الحالات وإدخال الأرصدة',
        path: '/cards',
        color: 'bg-indigo-500',
      });
      options.push({
        icon: ClipboardList,
        title: 'تقرير مجموعة البطاقات',
        description: 'مسح QR لعدة بطاقات وعرض حالاتها المالية',
        path: '/group-cards-report',
        color: 'bg-violet-500',
      });
    }

    options.push({
      icon: Wallet,
      title: 'إدارة العهدة',
      description: 'نظام العهدة للموظفين',
      path: '/custody',
      color: 'bg-amber-500',
    });

    // الخزينة - للجميع ماعدا مشرف المكتب
    if (role !== 'supervisor') {
      options.push({
        icon: Landmark,
        title: 'الخزينة',
        description: 'إدارة الحسابات البنكية والإيرادات والمصروفات',
        path: '/treasury',
        color: 'bg-emerald-500',
      });
    }

    options.push({
      icon: Activity,
      title: 'العمليات اليومية',
      description: 'إدارة العمليات اليومية (6 أنواع) - مع ربط الخزينة',
      path: '/daily-operations-v2',
      color: 'bg-cyan-500',
    });

    options.push({
      icon: TrendingDown,
      title: 'المصروفات',
      description: 'إدارة المصروفات اليومية - مع ربط الخزينة',
      path: '/expenses-v2',
      color: 'bg-red-500',
    });

    options.push({
      icon: TrendingUp,
      title: 'الرواتب',
      description: 'إدارة رواتب الموظفين - مع ربط الخزينة',
      path: '/salaries',
      color: 'bg-orange-500',
    });

    options.push({
      icon: FileText,
      title: 'السجلات',
      description: 'سجل كامل لجميع العمليات: من قام بها، ماذا فعل، ومتى',
      path: '/logs',
      color: 'bg-green-500',
    });

    // الخيارات حسب الدور
    if (role === 'manager' || role === 'deputy_manager') {
      options.push({
        icon: Users,
        title: 'الموظفين',
        description: 'إدارة الموظفين والصلاحيات',
        path: '/employees',
        color: 'bg-orange-500',
      });
      options.push({
        icon: Users,
        title: 'المندوبين',
        description: 'إدارة المندوبين وتحديد نسبة العمولة',
        path: '/delegates',
        color: 'bg-purple-500',
      });
      options.push({
        icon: DollarSign,
        title: 'عمولات المندوبين',
        description: 'عرض وإدارة عمولات المندوبين مع إحصائيات تفصيلية',
        path: '/delegate-commissions',
        color: 'bg-emerald-500',
      });

      options.push({
        icon: Settings,
        title: 'الإعدادات',
        description: 'إعدادات النظام',
        path: '/settings',
        color: 'bg-gray-500',
      });
    }

    if (role === 'accountant' || role === 'manager' || role === 'deputy_manager') {
      options.push({
        icon: Bell,
        title: 'الإشعارات',
        description: 'الموافقة على طلبات الإغلاق',
        path: '/notifications',
        color: 'bg-yellow-500',
      });
    }

    // صفحة التنبيهات - للمدير ونائبه فقط (أو من لديه صلاحية view_alerts)
    if (role === 'manager' || role === 'deputy_manager' || hasPermission('view_alerts')) {
      options.push({
        icon: AlertTriangle,
        title: 'التنبيهات',
        description: 'تنبيهات انتهاء صلاحية الجوازات والبطاقات',
        path: '/alerts',
        color: 'bg-red-500',
      });
    }

    // إضافة أزرار إدارة الخدمات والموافقات للمدير ونائب المدير
    if (role === 'manager' || role === 'deputy_manager') {
      options.push({
        icon: Settings,
        title: 'إدارة الخدمات',
        description: 'إدارة الخدمات المقدمة',
        path: '/services-management',
        color: 'bg-purple-500',
      });

      options.push({
        icon: CheckCircle,
        title: 'الموافقات',
        description: 'مراجعة والموافقة على الطلبات',
        path: '/approvals',
        color: 'bg-teal-500',
      });

      options.push({
        icon: FileCheck,
        title: 'سجلات المراجعة',
        description: 'سجل كامل لجميع التغييرات والعمليات',
        path: '/audit-logs',
        color: 'bg-pink-500',
      });

      // تم دمج جميع السجلات في صفحة واحدة
      // لا حاجة لعرض 3 روابط منفصلة

      options.push({
        icon: BarChart3,
        title: 'التقارير المالية',
        description: 'عرض التقارير المالية والإحصائيات التفصيلية',
        path: '/financial-reports',
        color: 'bg-violet-500',
      });
    }

    // إعدادات الشركة - للمدير فقط
    if (role === 'manager') {
      options.push({
        icon: Building2,
        title: 'إعدادات الشركة',
        description: 'تخصيص اسم الشركة وشعارها وبياناتها',
        path: '/company-settings',
        color: 'bg-amber-600',
      });
    }

    return options;
  };

  const availableOptions = getAvailableOptions();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const handleAddOperation = () => {
    if (!operationForm.customerId || !operationForm.amount) {
      alert('الرجاء ملء جميع الحقول المطلوبة');
      return;
    }

    const newOperation: any = {
      id: Date.now().toString(),
      customerId: operationForm.customerId,
      type: operationForm.type,
      amount: parseFloat(operationForm.amount),
      description: operationForm.description,
      profit: role === 'accountant' ? parseFloat(operationForm.profit || '0') : 0,
      date: new Date(),
      currency: 'LYD',
      status: 'completed',
      processedBy: user?.fullName || 'Unknown',
      timestamp: new Date(),
      updatedAt: new Date(),
    };

    addOperation(newOperation);
    setOperationForm({ customerId: '', type: 'deposit', amount: '', description: '', profit: '' });
    setShowOperationDialog(false);
  };

  const getCustomerName = (customerId: string) => {
    const customer = customers.find((c: any) => c.id === customerId);
    return customer?.name || 'عميل غير معروف';
  };

  const handleAddCustomer = async () => {
    if (!customerForm.name.trim()) {
      alert('الرجاء إدخال اسم الزبون');
      return;
    }
    if (!customerForm.phone.trim()) {
      alert('الرجاء إدخال رقم الهاتف');
      return;
    }

    const customerId = `customer_${Date.now()}`;
    const newCustomer: Customer = {
      id: customerId,
      transactionNumber: `TRX-${customerId.slice(-6).padStart(6, '0')}`,
      name: customerForm.name,
      phone: customerForm.phone,
      email: customerForm.email || '',
      address: customerForm.address || '',
      idType: 'national_id' as const,
      registrationDate: new Date(),
      operationStatus: 'purchased' as const,
      documentStatus: 'cannot_deliver' as const,
      totalBalance: 0,
      totalTransactions: 0,
      createdBy: user?.fullName || 'Unknown',
      updatedAt: new Date(),
    };

    try {
      addCustomer(newCustomer);
      setCustomerForm({ name: '', phone: '', email: '', address: '' });
      setShowCustomerDialog(false);
      toast.success('تم إضافة الزبون بنجاح');
    } catch {
      toast.error('حدث خطأ أثناء إضافة الزبون');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">شركة ليبيا للخدمات المالية</h1>
            <p className="text-slate-300 text-sm mt-1">أداة إدارة العمليات المالية</p>
          </div>
          <div className="flex items-center gap-3">
            {/* مؤشر حالة المزامنة */}
            <SyncStatusIndicator />
            <Button
              onClick={() => navigate('/profile')}
              variant="outline"
              className="text-white border-white hover:bg-white hover:text-slate-900"
            >
              <User className="w-4 h-4 ml-2" />
              الملف الشخصي
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="text-white border-white hover:bg-white hover:text-slate-900"
            >
              <LogOut className="w-4 h-4 ml-2" />
              خروج
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {/* Welcome Card */}
        <Card className="bg-white shadow-lg mb-12 border-0">
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg md:text-2xl font-bold text-slate-900 mb-2">
                  مرحباً بك، {displayEmployee.fullName}
                </h2>
                <p className="text-slate-600">
                  الدور: <span className="font-semibold text-slate-900">{JOB_TITLES[displayEmployee.jobTitle]?.name || 'غير محدد'}</span>
                </p>
              </div>
              <div className="text-right">
                <div className="inline-block bg-gradient-to-br from-blue-500 to-blue-600 rounded-full p-4">
                  <Users className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>

            {/* Employee Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-slate-200">
              <div>
                <p className="text-sm text-slate-600 mb-1">رقم الهاتف</p>
                <p className="font-semibold text-slate-900">{displayEmployee.phone}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">الدور الوظيفي</p>
                <p className="font-semibold text-slate-900">{JOB_TITLES[displayEmployee.jobTitle]?.name || 'غير محدد'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">الحالة</p>
                <p className="font-semibold text-green-600">نشط</p>
              </div>
            </div>
          </div>
        </Card>

        {/* الإحصائيات المالية - للمدير فقط */}
        {(role === 'manager' || role === 'deputy_manager') && (
          <div className="mb-12 space-y-6">
            {/* فلاتر زمنية */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg md:text-2xl font-bold text-slate-900">لوحة التحكم المالية</h3>
              <div className="flex gap-2">
                <Button
                  variant={timeFilter === 'day' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeFilter('day')}
                >
                  اليوم
                </Button>
                <Button
                  variant={timeFilter === 'week' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeFilter('week')}
                >
                  الأسبوع
                </Button>
                <Button
                  variant={timeFilter === 'month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeFilter('month')}
                >
                  الشهر
                </Button>
                <Button
                  variant={timeFilter === 'year' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeFilter('year')}
                >
                  السنة
                </Button>
              </div>
            </div>

            {/* بطاقات الإحصائيات الرئيسية */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* إجمالي الإيرادات */}
              <Card className="border-t-4 border-t-green-500">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-slate-600">إجمالي الإيرادات</h3>
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="text-3xl font-bold text-slate-900">
                    {((treasuryCtx.cashBalance?.amount || 0) + treasuryCtx.getTotalBankBalance()).toLocaleString()} د.ل
                  </div>
                  <div className="flex items-center text-xs text-green-600 mt-2">
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                    <span>+12.5% عن الشهر الماضي</span>
                  </div>
                </div>
              </Card>

              {/* عدد الزباين */}
              <Card className="border-t-4 border-t-purple-500">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-slate-600">عدد الزباين</h3>
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="text-3xl font-bold text-slate-900">{customers.length}</div>
                  <div className="flex items-center text-xs text-purple-600 mt-2">
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                    <span>+8.3% عن الشهر الماضي</span>
                  </div>
                </div>
              </Card>

              {/* البطاقات النشطة */}
              <Card className="border-t-4 border-t-blue-500">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-slate-600">البطاقات النشطة</h3>
                    <CreditCard className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="text-3xl font-bold text-slate-900">
                    {cards.filter((c: any) => c.status === 'active').length}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">من إجمالي {cards.length} بطاقة</p>
                </div>
              </Card>

              {/* الرصيد النقدي */}
              <Card className="border-t-4 border-t-amber-500">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-slate-600">الرصيد النقدي</h3>
                    <Activity className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="text-3xl font-bold text-slate-900">
                    {(treasuryCtx.cashBalance?.amount || 0).toLocaleString()} د.ل
                  </div>
                  <p className="text-xs text-slate-500 mt-2">في الخزينة</p>
                </div>
              </Card>
            </div>

            {/* الرسوم البيانية */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* رسم بياني خطي للإيرادات والمصروفات */}
              <Card>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">الإيرادات والمصروفات الشهرية</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={getMonthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} name="الإيرادات" />
                      <Line type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={2} name="المصروفات" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* رسم بياني عمودي للأرباح */}
              <Card>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">الأرباح الشهرية</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={getMonthlyProfits}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="profit" fill="#3B82F6" name="الربح" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* رسم بياني دائري لحالات البطاقات */}
              <Card>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">حالات البطاقات</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'نشطة', value: cards.filter((c: any) => c.status === 'active').length },
                          { name: 'غير نشطة', value: cards.filter((c: any) => c.status === 'inactive').length },
                          { name: 'منتهية', value: cards.filter((c: any) => c.status === 'expired').length },
                          { name: 'محظورة', value: cards.filter((c: any) => c.status === 'blocked').length },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[0, 1, 2, 3].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* رسم بياني دائري لتوزيع المصروفات */}
              <Card>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">توزيع المصروفات</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={getExpensesDistribution.length > 0 ? getExpensesDistribution : [{ name: 'لا توجد بيانات', value: 1 }]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[0, 1, 2, 3, 4].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* زر الوصول السريع للمسح */}
        <div
          onClick={() => setShowScannerDialog(true)}
          className="mb-6 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer active:scale-95 p-5 flex items-center gap-4 text-white select-none"
        >
          <div className="bg-white/20 rounded-xl p-3 flex-shrink-0">
            <ScanLine className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="text-lg font-bold">مسح رمز المعاملة</h4>
            <p className="text-blue-100 text-sm mt-0.5">كاميرا QR أو قارئ باركود USB</p>
          </div>
          <div className="bg-white/20 rounded-lg px-3 py-1.5 text-sm font-semibold">
            ابدأ المسح
          </div>
        </div>

        {/* Available Options */}
        <div className="mb-8">
          <h3 className="text-lg md:text-2xl font-bold text-slate-900 mb-6">الخيارات المتاحة</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableOptions.map((option, index) => {
              const IconComponent = option.icon;
              return (
                <div
                  key={index}
                  onClick={() => handleNavigate(option.path)}
                  className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer border-l-4 border-slate-200 hover:border-blue-500 overflow-hidden relative"
                >
                  {/* عداد الإشعارات الحرجة على بطاقة الإشعارات */}
                  {option.path === '/notifications' && unreadCritical > 0 && (
                    <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse z-10">
                      {unreadCritical > 9 ? '9+' : unreadCritical}
                    </div>
                  )}
                  {/* عداد تنبيهات انتهاء الصلاحية */}
                  {option.path === '/customers' && criticalAlerts.length > 0 && (
                    <div className="absolute top-3 left-3 bg-orange-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center z-10">
                      {criticalAlerts.length > 9 ? '9+' : criticalAlerts.length}
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`${option.color} rounded-lg p-3`}>
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <h4 className="text-lg font-semibold text-slate-900 mb-2">
                      {option.title}
                    </h4>
                    <p className="text-sm text-slate-600">
                      {option.description}
                    </p>
                    {/* رسالة تنبيه إضافية */}
                    {option.path === '/notifications' && unreadCritical > 0 && (
                      <p className="text-xs text-red-600 font-semibold mt-2">
                        ⚠️ {unreadCritical} إشعار حرج غير مقروء
                      </p>
                    )}
                    {option.path === '/customers' && criticalAlerts.length > 0 && (
                      <p className="text-xs text-orange-600 font-semibold mt-2">
                        ⚠️ {criticalAlerts.length} صلاحية تنتهي خلال 30 يوم
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Customers Section - HIDDEN */}
        {false && (role === 'operations' || role === 'supervisor' || role === 'manager' || role === 'deputy_manager' || role === 'accountant') && (
          <div className="mt-12">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg md:text-2xl font-bold text-slate-900">الزبائن</h3>
              <Button
                onClick={() => {
                  setCustomerForm({ name: '', phone: '', email: '', address: '' });
                  setShowCustomerDialog(true);
                }}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                إضافة زبون
              </Button>
            </div>

            {/* Customers Table */}
            <Card className="overflow-hidden mb-12">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-100 border-b">
                    <tr>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900">الاسم</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900">الهاتف</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900">البريد الإلكتروني</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900">العنوان</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900">تاريخ التسجيل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                          لا توجد زبائن
                        </td>
                      </tr>
                    ) : (
                      customers.map((customer: any) => (
                        <tr key={customer.id} className="border-b hover:bg-slate-50">
                          <td className="px-6 py-4 text-sm text-slate-900">{customer.name}</td>
                          <td className="px-6 py-4 text-sm text-slate-900">{customer.phone}</td>
                          <td className="px-6 py-4 text-sm text-slate-900">{customer.email || '-'}</td>
                          <td className="px-6 py-4 text-sm text-slate-900">{customer.address || '-'}</td>
                          <td className="px-6 py-4 text-sm text-slate-900">
                            {formatDate(customer.registrationDate)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* Operations Section - HIDDEN */}
        {false && (role === 'operations' || role === 'supervisor' || role === 'manager' || role === 'deputy_manager' || role === 'accountant') && (
          <div className="mt-12">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg md:text-2xl font-bold text-slate-900">العمليات اليومية</h3>
              <Button
                onClick={() => {
                  setOperationForm({ customerId: '', type: 'deposit', amount: '', description: '', profit: '' });
                  setShowOperationDialog(true);
                }}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                إضافة عملية
              </Button>
            </div>

            {/* Operations Table */}
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-100 border-b">
                    <tr>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900">العميل</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900">النوع</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900">المبلغ</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900">الوصف</th>
                      {(role === 'accountant' || role === 'manager' || role === 'deputy_manager') && (
                        <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900">الربح</th>
                      )}
                      <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operations.length === 0 ? (
                      <tr>
                        <td colSpan={role === 'accountant' || role === 'manager' || role === 'deputy_manager' ? 6 : 5} className="px-6 py-8 text-center text-slate-500">
                          لا توجد عمليات
                        </td>
                      </tr>
                    ) : (
                      operations.map((operation: any) => (
                        <tr key={operation.id} className="border-b hover:bg-slate-50">
                          <td className="px-6 py-4 text-sm text-slate-900">{getCustomerName(operation.customerId)}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              operation.type === 'deposit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {operation.type === 'deposit' ? 'إيداع' : 'سحب'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-900">{operation.amount} د.ل</td>
                          <td className="px-6 py-4 text-sm text-slate-900">{operation.description || '-'}</td>
                          {(role === 'accountant' || role === 'manager' || role === 'deputy_manager') && (
                            <td className="px-6 py-4 text-sm text-slate-900">{operation.profit || 0} د.ل</td>
                          )}
                          <td className="px-6 py-4 text-sm text-slate-900">
                            {formatDate(operation.date)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* Operation Dialog */}
        <Dialog open={showOperationDialog} onOpenChange={setShowOperationDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة عملية جديدة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>العميل *</Label>
                <Select value={operationForm.customerId} onValueChange={(value) => setOperationForm({ ...operationForm, customerId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر عميلاً" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer: any) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>نوع العملية *</Label>
                <Select value={operationForm.type} onValueChange={(value) => setOperationForm({ ...operationForm, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deposit">إيداع</SelectItem>
                    <SelectItem value="withdrawal">سحب</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>المبلغ *</Label>
                <Input
                  type="number"
                  value={operationForm.amount}
                  onChange={(e) => setOperationForm({ ...operationForm, amount: e.target.value })}
                  placeholder="أدخل المبلغ"
                />
              </div>
              <div>
                <Label>الوصف</Label>
                <Textarea
                  value={operationForm.description}
                  onChange={(e) => setOperationForm({ ...operationForm, description: e.target.value })}
                  placeholder="أدخل وصف العملية"
                />
              </div>
              {(role === 'accountant' || role === 'manager' || role === 'deputy_manager') && (
                <div>
                  <Label>الربح</Label>
                  <Input
                    type="number"
                    value={operationForm.profit}
                    onChange={(e) => setOperationForm({ ...operationForm, profit: e.target.value })}
                    placeholder="أدخل الربح (اختياري)"
                  />
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowOperationDialog(false)}>
                  إلغاء
                </Button>
                <Button onClick={handleAddOperation}>
                  إضافة
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Customer Dialog */}
        <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة زبون جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>اسم الزبون *</Label>
                <Input
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                  placeholder="أدخل اسم الزبون"
                />
              </div>
              <div>
                <Label>رقم الهاتف *</Label>
                <Input
                  type="tel"
                  value={customerForm.phone}
                  onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                  placeholder="0920000000"
                />
              </div>
              <div>
                <Label>البريد الإلكتروني</Label>
                <Input
                  type="email"
                  value={customerForm.email}
                  onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                  placeholder="example@email.com"
                />
              </div>
              <div>
                <Label>العنوان</Label>
                <Input
                  value={customerForm.address}
                  onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                  placeholder="أدخل عنوان الزبون"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowCustomerDialog(false)}>
                  إلغاء
                </Button>
                <Button onClick={handleAddCustomer}>
                  إضافة
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Permissions Dialog */}
        <PermissionsDialog 
          open={showPermissionsDialog} 
          onClose={() => setShowPermissionsDialog(false)} 
        />

        {/* Scanner Dialog */}
        <ScannerDialog
          open={showScannerDialog}
          onOpenChange={setShowScannerDialog}
          customers={customers.map(c => ({ id: c.id, name: c.name, transactionNumber: c.transactionNumber }))}
        />
      </main>
    </div>
  );
}
