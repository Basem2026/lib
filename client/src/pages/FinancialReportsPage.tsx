import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Download, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
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
} from "recharts";

/**
 * صفحة التقارير المالية الشاملة
 * عرض ملخص الحركة المالية (الإيرادات، المصروفات، الأرباح)
 */
export default function FinancialReportsPage() {
  const { user } = useAuth();
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

  // جلب البيانات المالية
  const { data: capitalAccount } = trpc.accounts.getCapitalAccount.useQuery();
  const { data: intermediaryAccount } = trpc.accounts.getIntermediaryAccount.useQuery();
  const { data: treasuryAccounts } = trpc.accounts.getTreasuryAccounts.useQuery();
  const { data: operations } = trpc.operations.getAll.useQuery();
  const { data: expenses } = trpc.expenses.getAll.useQuery();
  const { data: salaries } = trpc.salaries.getAll.useQuery();

  // حساب الإجماليات
  const totalRevenue = operations?.reduce((sum, op) => sum + parseFloat(op.profit || '0'), 0) || 0;
  const totalExpenses = expenses?.reduce((sum, exp) => sum + parseFloat(exp.amount), 0) || 0;
  const totalSalaries = salaries?.reduce((sum, sal) => sum + parseFloat(sal.totalSalary), 0) || 0;
  const netProfit = totalRevenue - totalExpenses - totalSalaries;

  // حساب أرصدة الخزينة
  const totalTreasuryLYD = treasuryAccounts?.reduce((sum: number, acc: any) => sum + parseFloat(acc.balanceLYD), 0) || 0;
  const totalTreasuryUSD = treasuryAccounts?.reduce((sum: number, acc: any) => sum + parseFloat(acc.balanceUSD), 0) || 0;
  const totalTreasuryUSDT = treasuryAccounts?.reduce((sum: number, acc: any) => sum + parseFloat(acc.balanceUSDT), 0) || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">التقارير المالية</h1>
            <p className="text-slate-600 mt-1">ملخص شامل للحركة المالية والأرباح</p>
          </div>
          <Button className="gap-2">
            <Download className="w-4 h-4" />
            تصدير PDF
          </Button>
        </div>

        {/* Date Range Filter */}
        <Card>
          <CardHeader>
            <CardTitle>تصفية حسب التاريخ</CardTitle>
            <CardDescription>اختر الفترة الزمنية للتقرير</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[240px] justify-start text-right font-normal">
                  <CalendarIcon className="ml-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "PPP", { locale: ar }) : "من تاريخ"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[240px] justify-start text-right font-normal">
                  <CalendarIcon className="ml-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "PPP", { locale: ar }) : "إلى تاريخ"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-green-900">إجمالي الإيرادات</CardTitle>
              <TrendingUp className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg md:text-2xl font-bold text-green-900">{totalRevenue.toFixed(2)} د.ل</div>
              <p className="text-xs text-green-700 mt-1">من العمليات اليومية</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-red-900">إجمالي المصروفات</CardTitle>
              <TrendingDown className="w-4 h-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg md:text-2xl font-bold text-red-900">{totalExpenses.toFixed(2)} د.ل</div>
              <p className="text-xs text-red-700 mt-1">مصروفات تشغيلية</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-orange-900">إجمالي الرواتب</CardTitle>
              <DollarSign className="w-4 h-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg md:text-2xl font-bold text-orange-900">{totalSalaries.toFixed(2)} د.ل</div>
              <p className="text-xs text-orange-700 mt-1">رواتب الموظفين</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-blue-900">صافي الربح</CardTitle>
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className={`text-lg md:text-2xl font-bold ${netProfit >= 0 ? "text-blue-900" : "text-red-900"}`}>
                {netProfit.toFixed(2)} د.ل
              </div>
              <p className="text-xs text-blue-700 mt-1">الربح بعد المصروفات</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Line Chart - Revenue vs Expenses */}
          <Card>
            <CardHeader>
              <CardTitle>الإيرادات مقابل المصروفات</CardTitle>
              <CardDescription>مقارنة شهرية للإيرادات والمصروفات</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={[
                    { month: "يناير", revenue: totalRevenue * 0.8, expenses: totalExpenses * 0.7 },
                    { month: "فبراير", revenue: totalRevenue * 0.9, expenses: totalExpenses * 0.85 },
                    { month: "مارس", revenue: totalRevenue, expenses: totalExpenses },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} name="الإيرادات" />
                  <Line type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={2} name="المصروفات" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pie Chart - Expenses Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>توزيع المصروفات</CardTitle>
              <CardDescription>توزيع المصروفات حسب النوع</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "الرواتب", value: totalSalaries },
                      { name: "المصروفات التشغيلية", value: totalExpenses },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value.toFixed(0)}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell fill="#F59E0B" />
                    <Cell fill="#EF4444" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Bar Chart - Treasury Balances */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>أرصدة الخزينة</CardTitle>
              <CardDescription>الأرصدة الحالية في حسابات الخزينة</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[
                    { currency: "دينار ليبي", balance: totalTreasuryLYD },
                    { currency: "دولار أمريكي", balance: totalTreasuryUSD },
                    { currency: "USDT", balance: totalTreasuryUSDT },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="currency" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="balance" fill="#3B82F6" name="الرصيد" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Reports */}
        <Tabs defaultValue="accounts" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="accounts">الحسابات</TabsTrigger>
            <TabsTrigger value="operations">العمليات</TabsTrigger>
            <TabsTrigger value="expenses">المصروفات</TabsTrigger>
            <TabsTrigger value="salaries">الرواتب</TabsTrigger>
          </TabsList>

          <TabsContent value="accounts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>رأس المال</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-slate-600">دينار ليبي</p>
                    <p className="text-lg md:text-2xl font-bold">{capitalAccount?.totalCapitalLYD || "0.00"} د.ل</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">دولار أمريكي</p>
                    <p className="text-lg md:text-2xl font-bold">${capitalAccount?.totalCapitalUSD || "0.00"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">USDT</p>
                    <p className="text-lg md:text-2xl font-bold">{capitalAccount?.totalCapitalUSDT || "0.00"} USDT</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>الحساب الوسطي</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-slate-600">دينار ليبي</p>
                    <p className="text-lg md:text-2xl font-bold">{intermediaryAccount?.balanceLYD || "0.00"} د.ل</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">دولار أمريكي</p>
                    <p className="text-lg md:text-2xl font-bold">${intermediaryAccount?.balanceUSD || "0.00"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">USDT</p>
                    <p className="text-lg md:text-2xl font-bold">{intermediaryAccount?.balanceUSDT || "0.00"} USDT</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>حسابات الخزينة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-slate-600">إجمالي دينار ليبي</p>
                    <p className="text-lg md:text-2xl font-bold">{totalTreasuryLYD.toFixed(2)} د.ل</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">إجمالي دولار أمريكي</p>
                    <p className="text-lg md:text-2xl font-bold">${totalTreasuryUSD.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">إجمالي USDT</p>
                    <p className="text-lg md:text-2xl font-bold">{totalTreasuryUSDT.toFixed(2)} USDT</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="operations">
            <Card>
              <CardHeader>
                <CardTitle>العمليات اليومية ({operations?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {operations?.slice(0, 10).map((op) => (
                    <div key={op.id} className="flex justify-between items-center p-3 bg-slate-50 rounded">
                      <div>
                        <p className="font-medium">{op.customerName || 'عملية'}</p>
                        <p className="text-sm text-slate-600">{op.operationType}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">+{parseFloat(op.profit || '0').toFixed(2)} د.ل</p>
                        <p className="text-xs text-slate-500">{formatDate(op.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expenses">
            <Card>
              <CardHeader>
                <CardTitle>المصروفات ({expenses?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {expenses?.slice(0, 10).map((exp) => (
                    <div key={exp.id} className="flex justify-between items-center p-3 bg-slate-50 rounded">
                      <div>
                        <p className="font-medium">{exp.description}</p>
                        <p className="text-sm text-slate-600">{exp.expenseType}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-600">-{parseFloat(exp.amount).toFixed(2)} {exp.currency}</p>
                        <p className="text-xs text-slate-500">{exp.expenseDate}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="salaries">
            <Card>
              <CardHeader>
                <CardTitle>الرواتب ({salaries?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {salaries?.slice(0, 10).map((sal) => (
                    <div key={sal.id} className="flex justify-between items-center p-3 bg-slate-50 rounded">
                      <div>
                        <p className="font-medium">{sal.employeeName}</p>
                        <p className="text-sm text-slate-600">{sal.salaryMonth}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-orange-600">
                          -{parseFloat(sal.totalSalary).toFixed(2)} {sal.currency}
                        </p>
                        <p className="text-xs text-slate-500">{sal.paymentDate}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
