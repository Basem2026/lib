import { useState, useMemo } from 'react';
import { useExpiringAlerts } from '@/hooks/useExpiringAlerts';
import { usePermissions } from '@/hooks/usePermissions';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertTriangle,
  Clock,
  CreditCard,
  BookOpen,
  Search,
  Download,
  User,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export default function AlertsPage() {
  const { hasPermission } = usePermissions();
  const { expiringAlerts, criticalAlerts, warningAlerts } = useExpiringAlerts();
  const [searchQuery, setSearchQuery] = useState('');
  const [, navigate] = useLocation();

  // إذا لم يكن لديه صلاحية، يُعاد توجيهه
  if (!hasPermission('view_alerts')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <ShieldAlert className="w-16 h-16 text-red-400" />
        <h2 className="text-xl font-bold text-foreground">غير مصرح لك بعرض هذه الصفحة</h2>
        <p className="text-muted-foreground">تحتاج إلى صلاحية view_alerts للوصول إلى صفحة التنبيهات</p>
        <Button variant="outline" onClick={() => navigate('/')}>العودة للرئيسية</Button>
      </div>
    );
  }

  // تصفية بالبحث
  const filterAlerts = (alerts: typeof expiringAlerts) =>
    alerts.filter((a) =>
      a.customerName.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const filteredAll = useMemo(() => filterAlerts(expiringAlerts), [expiringAlerts, searchQuery]);
  const filteredCritical = useMemo(() => filterAlerts(criticalAlerts), [criticalAlerts, searchQuery]);
  const filteredWarning = useMemo(() => filterAlerts(warningAlerts), [warningAlerts, searchQuery]);
  const filteredPassport = useMemo(() => filterAlerts(expiringAlerts.filter(a => a.type === 'passport')), [expiringAlerts, searchQuery]);
  const filteredCard = useMemo(() => filterAlerts(expiringAlerts.filter(a => a.type === 'card')), [expiringAlerts, searchQuery]);

  // تصدير CSV
  const exportCSV = () => {
    const headers = ['الاسم', 'النوع', 'تاريخ الانتهاء', 'الأيام المتبقية', 'الأولوية'];
    const rows = filteredAll.map((a) => [
      a.customerName,
      a.type === 'passport' ? 'جواز السفر' : 'البطاقة',
      a.expiryDate,
      a.daysRemaining.toString(),
      a.urgency === 'critical' ? 'حرج' : 'تحذير',
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `تنبيهات_الصلاحيات_${new Date().toLocaleDateString('ar')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const UrgencyBadge = ({ urgency }: { urgency: 'critical' | 'warning' | 'info' }) => {
    if (urgency === 'critical') return <Badge className="bg-red-500 text-white">حرج</Badge>;
    if (urgency === 'warning') return <Badge className="bg-yellow-500 text-white">تحذير</Badge>;
    return <Badge variant="secondary">معلومة</Badge>;
  };

  const TypeIcon = ({ type }: { type: 'card' | 'passport' }) =>
    type === 'passport' ? (
      <BookOpen className="w-4 h-4 text-blue-500" />
    ) : (
      <CreditCard className="w-4 h-4 text-purple-500" />
    );

  const AlertRow = ({ alert }: { alert: typeof expiringAlerts[0] }) => (
    <div
      className={`flex items-center justify-between p-4 rounded-lg border transition-colors hover:bg-accent/50 cursor-pointer ${
        alert.urgency === 'critical' ? 'border-red-200 bg-red-50/50 dark:bg-red-950/20' : 'border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20'
      }`}
      onClick={() => navigate(`/customers/${alert.customerId}`)}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${alert.urgency === 'critical' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'}`}>
          <TypeIcon type={alert.type} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="font-semibold text-foreground">{alert.customerName}</span>
            <UrgencyBadge urgency={alert.urgency} />
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{alert.message}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-center">
          <div className={`text-2xl font-bold ${alert.urgency === 'critical' ? 'text-red-600' : 'text-yellow-600'}`}>
            {alert.daysRemaining}
          </div>
          <div className="text-xs text-muted-foreground">يوم</div>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </div>
  );

  const EmptyState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
      <Clock className="w-12 h-12 opacity-30" />
      <p>{message}</p>
    </div>
  );

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            صفحة التنبيهات
          </h1>
          <p className="text-muted-foreground mt-1">
            عرض جميع الزبائن الذين تنتهي صلاحياتهم قريباً
          </p>
        </div>
        <Button variant="outline" onClick={exportCSV} className="gap-2">
          <Download className="w-4 h-4" />
          تصدير CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-red-200">
          <CardContent className="pt-4 pb-4">
            <div className="text-3xl font-bold text-red-600">{criticalAlerts.length}</div>
            <div className="text-sm text-muted-foreground mt-1">تنبيه حرج (≤30 يوم)</div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200">
          <CardContent className="pt-4 pb-4">
            <div className="text-3xl font-bold text-yellow-600">{warningAlerts.length}</div>
            <div className="text-sm text-muted-foreground mt-1">تحذير (31-90 يوم)</div>
          </CardContent>
        </Card>
        <Card className="border-blue-200">
          <CardContent className="pt-4 pb-4">
            <div className="text-3xl font-bold text-blue-600">
              {expiringAlerts.filter(a => a.type === 'passport').length}
            </div>
            <div className="text-sm text-muted-foreground mt-1">جوازات سفر</div>
          </CardContent>
        </Card>
        <Card className="border-purple-200">
          <CardContent className="pt-4 pb-4">
            <div className="text-3xl font-bold text-purple-600">
              {expiringAlerts.filter(a => a.type === 'card').length}
            </div>
            <div className="text-sm text-muted-foreground mt-1">بطاقات</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="بحث بالاسم..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-9"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="all">الكل ({filteredAll.length})</TabsTrigger>
          <TabsTrigger value="critical" className="text-red-600">حرج ({filteredCritical.length})</TabsTrigger>
          <TabsTrigger value="warning" className="text-yellow-600">تحذير ({filteredWarning.length})</TabsTrigger>
          <TabsTrigger value="passport">جوازات ({filteredPassport.length})</TabsTrigger>
          <TabsTrigger value="card">بطاقات ({filteredCard.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-3 mt-4">
          {filteredAll.length === 0 ? (
            <EmptyState message={searchQuery ? 'لا توجد نتائج للبحث' : 'لا توجد تنبيهات حالياً'} />
          ) : (
            filteredAll.map((alert) => <AlertRow key={alert.id} alert={alert} />)
          )}
        </TabsContent>

        <TabsContent value="critical" className="space-y-3 mt-4">
          {filteredCritical.length === 0 ? (
            <EmptyState message={searchQuery ? 'لا توجد نتائج' : 'لا توجد تنبيهات حرجة'} />
          ) : (
            filteredCritical.map((alert) => <AlertRow key={alert.id} alert={alert} />)
          )}
        </TabsContent>

        <TabsContent value="warning" className="space-y-3 mt-4">
          {filteredWarning.length === 0 ? (
            <EmptyState message={searchQuery ? 'لا توجد نتائج' : 'لا توجد تحذيرات'} />
          ) : (
            filteredWarning.map((alert) => <AlertRow key={alert.id} alert={alert} />)
          )}
        </TabsContent>

        <TabsContent value="passport" className="space-y-3 mt-4">
          {filteredPassport.length === 0 ? (
            <EmptyState message={searchQuery ? 'لا توجد نتائج' : 'لا توجد تنبيهات جوازات سفر'} />
          ) : (
            filteredPassport.map((alert) => <AlertRow key={alert.id} alert={alert} />)
          )}
        </TabsContent>

        <TabsContent value="card" className="space-y-3 mt-4">
          {filteredCard.length === 0 ? (
            <EmptyState message={searchQuery ? 'لا توجد نتائج' : 'لا توجد تنبيهات بطاقات'} />
          ) : (
            filteredCard.map((alert) => <AlertRow key={alert.id} alert={alert} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
