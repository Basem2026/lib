import { useCustomers } from '@/contexts/CustomersContext';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  CreditCard,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from 'lucide-react';
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
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useNotifications } from '@/contexts/NotificationsContext';
import { Button } from '@/components/ui/button';
import { Bell, BellOff } from 'lucide-react';
import { toast } from 'sonner';
import { OnlineUsers } from '@/components/OnlineUsers';

/**
 * لوحة التحكم التفاعلية - Dashboard
 * تعرض الإحصائيات المالية والرسوم البيانية
 * مربوطة بالبيانات الحقيقية 100%
 */

const COLORS = ['#1E2E3D', '#C9A34D', '#6E7C87', '#3B82F6', '#10B981', '#F59E0B'];

export default function Dashboard() {
  const { customers, cards } = useCustomers();
  const { isPushEnabled, requestPushPermission } = useNotifications();

  const handleEnableNotifications = async () => {
    const success = await requestPushPermission();
    if (success) {
      toast.success('تم تفعيل الإشعارات بنجاح! ستصلك إشعارات فورية عند أي عملية جديدة');
    } else {
      toast.error('فشل تفعيل الإشعارات. يرجى التأكد من إعدادات المتصفح');
    }
  };
  
  // جلب بيانات الخزينة الحقيقية
  const { data: treasuryAccounts, isLoading: loadingTreasury } = trpc.treasury.getAllAccounts.useQuery();
  const { data: treasuryRecords, isLoading: loadingRecords } = trpc.treasury.getAll.useQuery();
  const { data: expenses, isLoading: loadingExpenses } = trpc.expenses.getAll.useQuery();

  // حساب الإحصائيات الرئيسية
  const stats = useMemo(() => {
    if (!treasuryAccounts || !treasuryRecords || !expenses) {
      return {
        totalRevenue: 0,
        totalExpenses: 0,
        totalProfit: 0,
        totalCustomers: customers.length,
        activeCards: cards.filter(c => c.status === 'active').length,
        revenueGrowth: 0,
        customerGrowth: 0,
        cashLYD: 0,
        cashUSD: 0,
        cashUSDT: 0,
        totalBankBalance: 0,
      };
    }

    // حساب الأرصدة - جمع جميع الحسابات النقدية
    const cashLYD = treasuryAccounts
      .filter((a: any) => a.accountType === 'cash')
      .reduce((sum: number, a: any) => sum + parseFloat(a.balanceLYD || '0'), 0);
    
    const cashUSD = treasuryAccounts
      .filter((a: any) => a.accountType === 'cash')
      .reduce((sum: number, a: any) => sum + parseFloat(a.balanceUSD || '0'), 0);
    
    const cashUSDT = treasuryAccounts
      .filter((a: any) => a.accountType === 'cash')
      .reduce((sum: number, a: any) => sum + parseFloat(a.balanceUSDT || '0'), 0);
    
    // حساب إجمالي الحسابات البنكية
    const totalBankBalance = treasuryAccounts
      .filter((a: any) => a.accountType === 'bank')
      .reduce((sum: number, a: any) => sum + parseFloat(a.balanceLYD || '0') + parseFloat(a.balanceUSD || '0'), 0);

    // حساب إجمالي المصروفات
    const totalExpenses = expenses.reduce((sum: number, e: any) => {
      const amount = parseFloat(e.amount || '0');
      const currency = e.currency || 'LYD';
      // تحويل إلى دينار
      if (currency === 'LYD') return sum + amount;
      if (currency === 'USD') return sum + (amount * 4.8);
      if (currency === 'USDT') return sum + (amount * 4.8);
      return sum + amount;
    }, 0);

    // حساب الإيرادات من daily_operations
    const totalRevenue = treasuryRecords
      .filter((r: any) => r.type === 'deposit')
      .reduce((sum: number, r: any) => {
        const amountLYD = parseFloat(r.amountLYD || '0');
        const amountUSD = parseFloat(r.amountUSD || '0');
        const amountUSDT = parseFloat(r.amountUSDT || '0');
        return sum + amountLYD + (amountUSD * 4.8) + (amountUSDT * 4.8);
      }, 0);
    
    // حساب صافي الربح
    const totalProfit = totalRevenue - totalExpenses;

    // حساب النمو (مقارنة بالشهر الماضي)
    const lastMonth = subMonths(new Date(), 1);
    const lastMonthStart = startOfMonth(lastMonth);
    const lastMonthEnd = endOfMonth(lastMonth);
    
    const lastMonthRecords = treasuryRecords.filter((r: any) => {
      const date = new Date(r.createdAt);
      return date >= lastMonthStart && date <= lastMonthEnd;
    });

    const lastMonthRevenue = lastMonthRecords
      .filter((r: any) => r.type === 'deposit')
      .reduce((sum: number, r: any) => {
        const amountLYD = parseFloat(r.amountLYD || '0');
        const amountUSD = parseFloat(r.amountUSD || '0');
        const amountUSDT = parseFloat(r.amountUSDT || '0');
        return sum + amountLYD + (amountUSD * 4.8) + (amountUSDT * 4.8);
      }, 0);

    const revenueGrowth = lastMonthRevenue > 0 
      ? ((totalRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
      : 0;

    // حساب نمو الزبائن
    const lastMonthCustomers = customers.filter((c: any) => {
      const date = new Date(c.createdAt);
      return date >= lastMonthStart && date <= lastMonthEnd;
    }).length;

    const customerGrowth = lastMonthCustomers > 0
      ? ((customers.length - lastMonthCustomers) / lastMonthCustomers * 100).toFixed(1)
      : 0;

    return {
      totalRevenue,
      totalExpenses,
      totalProfit,
      totalCustomers: customers.length,
      activeCards: cards.filter(c => c.status === 'active').length,
      revenueGrowth: parseFloat(revenueGrowth as string),
      customerGrowth: parseFloat(customerGrowth as string),
      cashLYD,
      cashUSD,
      cashUSDT,
      totalBankBalance,
    };
  }, [customers, cards, treasuryAccounts, treasuryRecords, expenses]);

  // بيانات الإيرادات والمصروفات الشهرية (آخر 6 أشهر)
  const monthlyData = useMemo(() => {
    if (!treasuryRecords || !expenses) return [];

    const months = [];
    for (let i = 5; i >= 0; i--) {
      const month = subMonths(new Date(), i);
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);

      // حساب الإيرادات في هذا الشهر
      const monthRevenue = treasuryRecords
        .filter((r: any) => {
          const date = new Date(r.createdAt);
          return date >= monthStart && date <= monthEnd && r.type === 'deposit';
        })
        .reduce((sum: number, r: any) => {
          const amountLYD = parseFloat(r.amountLYD || '0');
          const amountUSD = parseFloat(r.amountUSD || '0');
          const amountUSDT = parseFloat(r.amountUSDT || '0');
          return sum + amountLYD + (amountUSD * 4.8) + (amountUSDT * 4.8);
        }, 0);

      // حساب المصروفات في هذا الشهر
      const monthExpenses = expenses
        .filter((e: any) => {
          const date = new Date(e.createdAt);
          return date >= monthStart && date <= monthEnd;
        })
        .reduce((sum: number, e: any) => {
          const amount = parseFloat(e.amount || '0');
          const currency = e.currency || 'LYD';
          if (currency === 'LYD') return sum + amount;
          if (currency === 'USD') return sum + (amount * 4.8);
          if (currency === 'USDT') return sum + (amount * 4.8);
          return sum + amount;
        }, 0);

      const monthProfit = monthRevenue - monthExpenses;

      months.push({
        month: format(month, 'MMMM', { locale: ar }),
        revenue: Math.round(monthRevenue),
        expenses: Math.round(monthExpenses),
        profit: Math.round(monthProfit),
      });
    }

    return months;
  }, [treasuryRecords, expenses]);

  // بيانات توزيع المصروفات (حسب الفئة)
  const expensesDistribution = useMemo(() => {
    if (!expenses) return [];

    const categories: { [key: string]: number } = {};
    const typeNames: { [key: string]: string } = {
      rent: 'إيجار',
      utilities: 'مرافق',
      maintenance: 'صيانة',
      supplies: 'لوازم',
      transportation: 'نقل',
      communication: 'اتصالات',
      other: 'أخرى',
    };
    expenses.forEach((e: any) => {
      const category = typeNames[e.expenseType] || 'أخرى';
      const amount = parseFloat(e.amount || '0');
      const currency = e.currency || 'LYD';
      let totalAmount = amount;
      if (currency === 'USD') totalAmount = amount * 4.8;
      if (currency === 'USDT') totalAmount = amount * 4.8;
      categories[category] = (categories[category] || 0) + totalAmount;
    });

    return Object.entries(categories).map(([name, value]) => ({
      name,
      value: Math.round(value),
    }));
  }, [expenses]);

  // بيانات حالات البطاقات
  const cardsStatus = useMemo(() => {
    const statusCounts: { [key: string]: number } = {};
    cards.forEach(c => {
      const status = c.status || 'غير محدد';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    const statusNames: { [key: string]: string } = {
      active: 'نشطة',
      inactive: 'غير نشطة',
      expired: 'منتهية',
      blocked: 'محظورة',
      pending: 'قيد الانتظار',
      deposited: 'تم الإيداع',
    };

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: statusNames[status] || status,
      value: count,
    }));
  }, [cards]);

  // عرض Loader أثناء التحميل
  if (loadingTreasury || loadingRecords || loadingExpenses) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* العنوان */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">لوحة التحكم</h1>
            <p className="text-slate-600 mt-2">نظرة شاملة على الأداء المالي والإحصائيات</p>
          </div>
          {!isPushEnabled && (
            <Button
              onClick={handleEnableNotifications}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg"
            >
              <Bell className="w-4 h-4 mr-2" />
              تفعيل الإشعارات
            </Button>
          )}
          {isPushEnabled && (
            <div className="flex items-center gap-2 text-green-600">
              <Bell className="w-5 h-5" />
              <span className="font-medium">الإشعارات مفعلة</span>
            </div>
          )}
        </div>

        {/* بطاقات الإحصائيات الرئيسية */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* إجمالي الإيرادات */}
          <Card className="border-t-4 border-t-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRevenue.toLocaleString()} د.ل</div>
              <div className={`flex items-center text-xs mt-1 ${stats.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.revenueGrowth >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 mr-1" />
                )}
                <span>{stats.revenueGrowth >= 0 ? '+' : ''}{stats.revenueGrowth}% عن الشهر الماضي</span>
              </div>
            </CardContent>
          </Card>

          {/* إجمالي المصروفات */}
          <Card className="border-t-4 border-t-red-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي المصروفات</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalExpenses.toLocaleString()} د.ل</div>
              <p className="text-xs text-slate-500 mt-1">تشمل جميع المصاريف</p>
            </CardContent>
          </Card>

          {/* صافي الربح */}
          <Card className="border-t-4 border-t-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">صافي الربح</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProfit.toLocaleString()} د.ل</div>
              <p className="text-xs text-slate-500 mt-1">الإيرادات - المصروفات</p>
            </CardContent>
          </Card>

          {/* عدد الزباين */}
          <Card className="border-t-4 border-t-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">عدد الزباين</CardTitle>
              <Users className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCustomers}</div>
              <div className={`flex items-center text-xs mt-1 ${stats.customerGrowth >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                {stats.customerGrowth >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 mr-1" />
                )}
                <span>{stats.customerGrowth >= 0 ? '+' : ''}{stats.customerGrowth}% عن الشهر الماضي</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* الموظفون المتصلون */}
        <OnlineUsers />

        {/* الرسوم البيانية */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* رسم بياني خطي للإيرادات والمصروفات */}
          <Card>
            <CardHeader>
              <CardTitle>الإيرادات والمصروفات الشهرية</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10B981"
                      strokeWidth={2}
                      name="الإيرادات"
                    />
                    <Line
                      type="monotone"
                      dataKey="expenses"
                      stroke="#EF4444"
                      strokeWidth={2}
                      name="المصروفات"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-500">
                  لا توجد بيانات
                </div>
              )}
            </CardContent>
          </Card>

          {/* رسم بياني عمودي للأرباح */}
          <Card>
            <CardHeader>
              <CardTitle>الأرباح الشهرية</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="profit" fill="#3B82F6" name="الربح" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-500">
                  لا توجد بيانات
                </div>
              )}
            </CardContent>
          </Card>

          {/* رسم بياني دائري لتوزيع المصروفات */}
          <Card>
            <CardHeader>
              <CardTitle>توزيع المصروفات</CardTitle>
            </CardHeader>
            <CardContent>
              {expensesDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={expensesDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value.toLocaleString()} د.ل`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {expensesDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-500">
                  لا توجد مصروفات
                </div>
              )}
            </CardContent>
          </Card>

          {/* رسم بياني دائري لحالات البطاقات */}
          <Card>
            <CardHeader>
              <CardTitle>حالات البطاقات</CardTitle>
            </CardHeader>
            <CardContent>
              {cardsStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={cardsStatus}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {cardsStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-500">
                  لا توجد بطاقات
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* إحصائيات إضافية */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">البطاقات النشطة</CardTitle>
              <CreditCard className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeCards}</div>
              <p className="text-xs text-slate-500 mt-1">من إجمالي {cards.length} بطاقة</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">كاش دينار</CardTitle>
              <DollarSign className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.cashLYD.toLocaleString()} د.ل</div>
              <p className="text-xs text-slate-500 mt-1">في الخزينة</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">كاش دولار</CardTitle>
              <DollarSign className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.cashUSD.toLocaleString()}</div>
              <p className="text-xs text-slate-500 mt-1">في الخزينة</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">الحسابات البنكية</CardTitle>
              <Activity className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalBankBalance.toLocaleString()} د.ل
              </div>
              <p className="text-xs text-slate-500 mt-1">إجمالي البنوك</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
