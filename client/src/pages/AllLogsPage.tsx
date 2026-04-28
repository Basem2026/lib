import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Download, Trash2, Shield, Users, Activity, AlertTriangle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

/**
 * صفحة السجلات الشاملة
 * دمج سجل الإدارة + سجل الموظفين + سجل التدقيق
 */
export default function AllLogsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [clearConfirmType, setClearConfirmType] = useState<'all' | 'management' | 'employees' | null>(null);

  // جلب السجلات من قاعدة البيانات
  const { data: allLogs = [], isLoading, refetch } = trpc.auditLogs.getAll.useQuery({
    limit: 1000,
  });

  // mutations لمسح السجلات
  const clearAllMutation = trpc.auditLogs.clearAll.useMutation({
    onSuccess: () => {
      toast.success('تم مسح جميع السجلات بنجاح');
      refetch();
      setClearConfirmType(null);
    },
    onError: () => toast.error('فشل مسح السجلات'),
  });

  const clearByTypeMutation = trpc.auditLogs.clearByType.useMutation({
    onSuccess: () => {
      toast.success('تم مسح السجلات المحددة بنجاح');
      refetch();
      setClearConfirmType(null);
    },
    onError: () => toast.error('فشل مسح السجلات'),
  });

  const handleConfirmClear = () => {
    if (clearConfirmType === 'all') {
      clearAllMutation.mutate();
    } else if (clearConfirmType === 'management') {
      clearByTypeMutation.mutate({ entityTypes: ['employee', 'system', 'treasury', 'settings', 'salary', 'expense'] });
    } else if (clearConfirmType === 'employees') {
      clearByTypeMutation.mutate({ entityTypes: ['operation', 'card', 'customer'] });
    }
  };

  // تصنيف السجلات
  // تبويب الإدارة: الخزينة، الإعدادات، الموظفين، الرواتب، المصاريف
  const MANAGEMENT_TYPES = ['employee', 'system', 'treasury', 'settings', 'salary', 'expense'];
  // تبويب الموظفين: العمليات اليومية، البطاقات، الزبائن
  const EMPLOYEE_TYPES = ['operation', 'card', 'customer'];

  const managementLogs = useMemo(() => {
    return allLogs.filter(log => MANAGEMENT_TYPES.includes(log.entityType));
  }, [allLogs]);

  const employeeLogs = useMemo(() => {
    return allLogs.filter(log => EMPLOYEE_TYPES.includes(log.entityType));
  }, [allLogs]);

  // دالة الفلترة
  const filterLogs = (logs: any[]) => {
    let filtered = [...logs];

    // فلترة حسب البحث
    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.entityType?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // فلترة حسب نوع العملية
    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => log.action === actionFilter);
    }

    // فلترة حسب نوع الكيان
    if (entityFilter !== 'all') {
      filtered = filtered.filter(log => log.entityType === entityFilter);
    }

    // فلترة حسب التاريخ
    if (dateRange !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateRange) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      filtered = filtered.filter(log => new Date(log.timestamp) >= filterDate);
    }

    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const filteredManagementLogs = useMemo(() => filterLogs(managementLogs), [managementLogs, searchTerm, actionFilter, entityFilter, dateRange]);
  const filteredEmployeeLogs = useMemo(() => filterLogs(employeeLogs), [employeeLogs, searchTerm, actionFilter, entityFilter, dateRange]);
  const filteredAllLogs = useMemo(() => filterLogs(allLogs), [allLogs, searchTerm, actionFilter, entityFilter, dateRange]);

  // دالة تصدير Excel
  const exportToExcel = (logs: any[], filename: string) => {
    const headers = ['التاريخ', 'المستخدم', 'العملية', 'النوع', 'الوصف'];
    const rows = logs.map(log => [
      format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss', { locale: ar }),
      log.userName || 'غير معروف',
      getActionLabel(log.action),
      getEntityLabel(log.entityType),
      log.details?.description || '-'
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\\n');
    const blob = new Blob([`\\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  // دوال مساعدة
  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      create: 'إضافة',
      update: 'تعديل',
      delete: 'حذف',
      approve: 'موافقة',
      reject: 'رفض',
    };
    return labels[action] || action;
  };

  const getEntityLabel = (entityType: string) => {
    const labels: Record<string, string> = {
      employee: 'موظف',
      permission: 'صلاحية',
      settings: 'إعدادات',
      operation: 'عملية يومية',
      card: 'بطاقة',
      customer: 'زبون',
      treasury: 'خزينة',
      salary: 'راتب',
      expense: 'مصروف',
      system: 'نظام',
    };
    return labels[entityType] || entityType;
  };

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'create': return 'default';
      case 'update': return 'secondary';
      case 'delete': return 'destructive';
      case 'approve': return 'default';
      case 'reject': return 'destructive';
      default: return 'outline';
    }
  };

  // دالة تنسيق تفاصيل السجل بشكل واضح
  const formatLogDetails = (log: any) => {
    if (!log.details) return <p className="text-muted-foreground">لا توجد تفاصيل إضافية</p>;

    // إذا كان details نص مباشر
    if (typeof log.details === 'string') {
      // معالجة خاصة للسجلات القديمة التي تحتوي على "[object Object]"
      if (log.details === '[object Object]' || log.details.includes('[object Object]')) {
        return <p className="text-muted-foreground">لا توجد تفاصيل إضافية لهذا السجل (سجل قديم)</p>;
      }
      return <p className="leading-relaxed">{log.details}</p>;
    }

    // إذا كان details يحتوي على metadata (مثل المندوبين)
    if (log.details.metadata) {
      return <p className="leading-relaxed">{String(log.details.metadata)}</p>;
    }

    // إذا كان details يحتوي على description
    if (log.details.description) {
      return <p className="leading-relaxed">{String(log.details.description)}</p>;
    }

    // إذا كان details كائن عادي، عرض الحقول بشكل واضح
    const entries = Object.entries(log.details).filter(([key]) => key !== 'metadata' && key !== 'description');
    if (entries.length === 0) {
      // إذا كان الكائن فارغ، عرض رسالة واضحة
      return <p className="text-muted-foreground">لا توجد تفاصيل إضافية لهذا السجل</p>;
    }

    return (
      <div className="space-y-3">
        {entries.map(([key, value]) => {
          // تحويل القيمة إلى نص بشكل آمن
          let displayValue: React.ReactNode;
          if (value === null || value === undefined) {
            displayValue = <span className="text-muted-foreground">-</span>;
          } else if (typeof value === 'object') {
            // إذا كان كائن، حاول استخراج الاسم أو عرض JSON منسق
            if ('fullName' in value && value.fullName) {
              displayValue = String(value.fullName);
            } else if ('name' in value && value.name) {
              displayValue = String(value.name);
            } else {
              // عرض JSON منسق في مربع نص
              displayValue = (
                <pre className="bg-muted/50 p-3 rounded text-xs overflow-auto max-h-40">
                  {JSON.stringify(value, null, 2)}
                </pre>
              );
            }
          } else {
            displayValue = String(value);
          }

          return (
            <div key={key} className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{key}</p>
              <div className="text-sm">{displayValue}</div>
            </div>
          );
        })}
      </div>
    );
  };

  // مكون جدول السجلات
  const LogsTable = ({ logs, emptyMessage }: { logs: any[], emptyMessage: string }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>التاريخ والوقت</TableHead>
          <TableHead>المستخدم</TableHead>
          <TableHead>العملية</TableHead>
          <TableHead>النوع</TableHead>
          <TableHead>الوصف</TableHead>
          <TableHead>الإجراءات</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
              {emptyMessage}
            </TableCell>
          </TableRow>
        ) : (
          logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="font-mono text-sm">
                {format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss', { locale: ar })}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  {log.userName || 'غير معروف'}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={getActionBadgeVariant(log.action)}>
                  {getActionLabel(log.action)}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{getEntityLabel(log.entityType)}</Badge>
              </TableCell>
              <TableCell className="max-w-md truncate">
                {log.details?.description || '-'}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedLog(log)}
                >
                  عرض التفاصيل
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري تحميل السجلات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">السجلات الشاملة</h1>
        <p className="text-muted-foreground mt-2">جميع السجلات والعمليات في النظام</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>البحث والفلترة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="بحث في السجلات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="نوع العملية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع العمليات</SelectItem>
                <SelectItem value="create">إضافة</SelectItem>
                <SelectItem value="update">تعديل</SelectItem>
                <SelectItem value="delete">حذف</SelectItem>
                <SelectItem value="approve">موافقة</SelectItem>
                <SelectItem value="reject">رفض</SelectItem>
              </SelectContent>
            </Select>

            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="نوع الكيان" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنواع</SelectItem>
                <SelectItem value="employee">موظف</SelectItem>
                <SelectItem value="operation">عملية يومية</SelectItem>
                <SelectItem value="card">بطاقة</SelectItem>
                <SelectItem value="customer">زبون</SelectItem>
                <SelectItem value="treasury">خزينة</SelectItem>
                <SelectItem value="salary">راتب</SelectItem>
                <SelectItem value="expense">مصروف</SelectItem>
                <SelectItem value="permission">صلاحية</SelectItem>
                <SelectItem value="settings">إعدادات</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={(v) => setDateRange(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="الفترة الزمنية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الفترات</SelectItem>
                <SelectItem value="today">اليوم</SelectItem>
                <SelectItem value="week">آخر أسبوع</SelectItem>
                <SelectItem value="month">آخر شهر</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            سجل التدقيق ({filteredAllLogs.length})
          </TabsTrigger>
          <TabsTrigger value="management" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            سجل الإدارة ({filteredManagementLogs.length})
          </TabsTrigger>
          <TabsTrigger value="employees" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            سجل الموظفين ({filteredEmployeeLogs.length})
          </TabsTrigger>
        </TabsList>

        {/* سجل التدقيق */}
        <TabsContent value="all">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>سجل التدقيق (Audit Trail)</CardTitle>
                  <CardDescription>جميع العمليات المسجلة في النظام</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => exportToExcel(filteredAllLogs, 'audit_trail')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    تصدير Excel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setClearConfirmType('all')}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    مسح الكل
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <LogsTable logs={filteredAllLogs} emptyMessage="لا توجد سجلات" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* سجل الإدارة */}
        <TabsContent value="management">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>سجل الإدارة</CardTitle>
                  <CardDescription>عمليات الإدارة (إضافة موظف، تغيير صلاحيات، إلخ)</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => exportToExcel(filteredManagementLogs, 'management_logs')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    تصدير Excel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setClearConfirmType('management')}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    مسح سجل الإدارة
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <LogsTable logs={filteredManagementLogs} emptyMessage="لا توجد سجلات إدارية" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* سجل الموظفين */}
        <TabsContent value="employees">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>سجل الموظفين</CardTitle>
                  <CardDescription>عمليات الموظفين اليومية</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => exportToExcel(filteredEmployeeLogs, 'employee_logs')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    تصدير Excel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setClearConfirmType('employees')}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    مسح سجل الموظفين
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <LogsTable logs={filteredEmployeeLogs} emptyMessage="لا توجد سجلات موظفين" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog تأكيد المسح */}
      <Dialog open={!!clearConfirmType} onOpenChange={() => setClearConfirmType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              تأكيد مسح السجلات
            </DialogTitle>
            <DialogDescription>
              {clearConfirmType === 'all' && 'سيتم مسح جميع سجلات التدقيق نهائياً ولا يمكن التراجع عن هذا الإجراء.'}
              {clearConfirmType === 'management' && 'سيتم مسح جميع سجلات الإدارة نهائياً ولا يمكن التراجع عن هذا الإجراء.'}
              {clearConfirmType === 'employees' && 'سيتم مسح جميع سجلات الموظفين نهائياً ولا يمكن التراجع عن هذا الإجراء.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearConfirmType(null)}>إلغاء</Button>
            <Button
              variant="destructive"
              onClick={handleConfirmClear}
              disabled={clearAllMutation.isPending || clearByTypeMutation.isPending}
            >
              {(clearAllMutation.isPending || clearByTypeMutation.isPending) ? 'جاري المسح...' : 'تأكيد المسح'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog لتفاصيل السجل */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل السجل</DialogTitle>
            <DialogDescription>
              {selectedLog && format(new Date(selectedLog.timestamp), 'yyyy-MM-dd HH:mm:ss', { locale: ar })}
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">المستخدم</p>
                  <p className="text-sm">{selectedLog.userName || 'غير معروف'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">العملية</p>
                  <Badge variant={getActionBadgeVariant(selectedLog.action)}>
                    {getActionLabel(selectedLog.action)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">النوع</p>
                  <Badge variant="outline">{getEntityLabel(selectedLog.entityType)}</Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">معرف الكيان</p>
                  <p className="text-sm font-mono">{selectedLog.entityId || '-'}</p>
                </div>
              </div>

              {selectedLog.details && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">التفاصيل</p>
                  <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
                    {formatLogDetails(selectedLog)}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
