import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Download, Filter, Calendar, FileEdit, Eye, Activity, TrendingUp } from 'lucide-react';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

/**
 * صفحة سجل التدقيق (Audit Trail)
 * عرض جميع العمليات المسجلة في النظام
 */
export default function AuditLogsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [selectedLog, setSelectedLog] = useState<any>(null);

  // حساب نطاق التاريخ
  const getDateRange = () => {
    const now = new Date();
    if (dateRange === 'today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return {
        startDate: format(today, 'yyyy-MM-dd'),
        endDate: format(now, 'yyyy-MM-dd'),
      };
    } else if (dateRange === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return {
        startDate: format(weekAgo, 'yyyy-MM-dd'),
        endDate: format(now, 'yyyy-MM-dd'),
      };
    } else if (dateRange === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return {
        startDate: format(monthAgo, 'yyyy-MM-dd'),
        endDate: format(now, 'yyyy-MM-dd'),
      };
    }
    return {};
  };

  // جلب قائمة المستخدمين
  const { data: uniqueUsers } = trpc.auditLogs.getUniqueUsers.useQuery();

  // جلب السجلات من Backend
  const { data: logs, isLoading } = trpc.auditLogs.getAll.useQuery({
    entityType: entityTypeFilter !== 'all' ? entityTypeFilter as any : undefined,
    action: actionFilter !== 'all' ? actionFilter as any : undefined,
    userId: userFilter !== 'all' ? userFilter : undefined,
    ...getDateRange(),
    limit: 200,
  });

  // جلب الإحصائيات
  const { data: stats } = trpc.auditLogs.getStats.useQuery(getDateRange());

  // فلترة محلية بالبحث
  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    
    if (!searchTerm) return logs;

    const searchLower = searchTerm.toLowerCase();
    return logs.filter(
      log =>
        log.userName.toLowerCase().includes(searchLower) ||
        (log.entityId && log.entityId.toLowerCase().includes(searchLower)) ||
        log.entityType.toLowerCase().includes(searchLower)
    );
  }, [logs, searchTerm]);

  const handleExport = (format: 'json' | 'csv') => {
    if (!filteredLogs) return;

    let data: string;
    if (format === 'json') {
      data = JSON.stringify(filteredLogs, null, 2);
    } else {
      // CSV export
      const headers = ['التاريخ', 'المستخدم', 'الإجراء', 'النوع', 'المعرف'];
      const rows = filteredLogs.map(log => [
        new Date(log.timestamp).toLocaleString('ar-LY'),
        log.userName,
        getActionText(log.action),
        getEntityText(log.entityType),
        log.entityId || '-',
      ]);
      data = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }

    const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getEntityText = (entity: string) => {
    const entities: Record<string, string> = {
      customer: 'زبون',
      card: 'بطاقة',
      employee: 'موظف',
      operation: 'عملية',
      expense: 'مصروف',
      salary: 'راتب',
      daily_close: 'إغلاق يومي',
      treasury: 'خزينة',
      system: 'نظام',
    };
    return entities[entity] || entity;
  };

  const getActionText = (action: string) => {
    const actions: Record<string, string> = {
      create: 'إنشاء',
      update: 'تعديل',
      delete: 'حذف',
      print: 'طباعة',
      close_day: 'إغلاق يوم',
      approve_close: 'موافقة إغلاق',
      reject_close: 'رفض إغلاق',
      permission_change: 'تغيير صلاحيات',
      login: 'تسجيل دخول',
      logout: 'تسجيل خروج',
    };
    return actions[action] || action;
  };

  const getActionBadgeColor = (action: string) => {
    if (action === 'create') return 'bg-green-100 text-green-800 border-green-300';
    if (action === 'delete') return 'bg-red-100 text-red-800 border-red-300';
    if (action === 'update') return 'bg-blue-100 text-blue-800 border-blue-300';
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'نعم' : 'لا';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

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
      <div className="flex items-center gap-3">
        <FileEdit className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">سجل التدقيق (Audit Trail)</h1>
          <p className="text-muted-foreground">جميع العمليات المسجلة في النظام</p>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription>إجمالي العمليات</CardDescription>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-3xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription>عمليات الإنشاء</CardDescription>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <CardTitle className="text-3xl text-green-600">
                {stats.byAction.create || 0}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription>عمليات الحذف</CardDescription>
                <TrendingUp className="h-4 w-4 text-red-600" />
              </div>
              <CardTitle className="text-3xl text-red-600">
                {stats.byAction.delete || 0}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>أكثر مستخدم نشاطاً</CardDescription>
              <CardTitle className="text-lg">
                {Object.entries(stats.byUser).sort((a, b) => b[1] - a[1])[0]?.[0] || '-'}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {Object.entries(stats.byUser).sort((a, b) => b[1] - a[1])[0]?.[1] || 0} عملية
              </p>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>البحث والفلترة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="relative">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث في السجلات..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>

            <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
              <SelectTrigger>
                <Filter className="h-4 w-4 ml-2" />
                <SelectValue placeholder="نوع الكيان" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنواع</SelectItem>
                <SelectItem value="customer">زبون</SelectItem>
                <SelectItem value="card">بطاقة</SelectItem>
                <SelectItem value="operation">عملية</SelectItem>
                <SelectItem value="expense">مصروف</SelectItem>
                <SelectItem value="salary">راتب</SelectItem>
                <SelectItem value="employee">موظف</SelectItem>
              </SelectContent>
            </Select>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <Filter className="h-4 w-4 ml-2" />
                <SelectValue placeholder="نوع الإجراء" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الإجراءات</SelectItem>
                <SelectItem value="create">إنشاء</SelectItem>
                <SelectItem value="delete">حذف</SelectItem>
                <SelectItem value="update">تعديل</SelectItem>
              </SelectContent>
            </Select>

            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger>
                <Filter className="h-4 w-4 ml-2" />
                <SelectValue placeholder="المستخدم" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع المستخدمين</SelectItem>
                {uniqueUsers?.map((user) => (
                  <SelectItem key={user.userId} value={user.userId}>
                    {user.userName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
              <SelectTrigger>
                <Calendar className="h-4 w-4 ml-2" />
                <SelectValue placeholder="الفترة الزمنية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الفترات</SelectItem>
                <SelectItem value="today">اليوم</SelectItem>
                <SelectItem value="week">آخر أسبوع</SelectItem>
                <SelectItem value="month">آخر شهر</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleExport('json')} className="flex-1">
                <Download className="h-4 w-4 ml-2" />
                JSON
              </Button>
              <Button variant="outline" onClick={() => handleExport('csv')} className="flex-1">
                <Download className="h-4 w-4 ml-2" />
                CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>السجلات ({filteredLogs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">التاريخ والوقت</TableHead>
                  <TableHead className="text-right">المستخدم</TableHead>
                  <TableHead className="text-right">الإجراء</TableHead>
                  <TableHead className="text-right">النوع</TableHead>
                  <TableHead className="text-right">المعرف</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      لا توجد سجلات
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="text-right">
                        {format(new Date(log.timestamp), 'PPpp', { locale: ar })}
                      </TableCell>
                      <TableCell className="text-right font-medium">{log.userName}</TableCell>
                      <TableCell className="text-right">
                        <Badge className={getActionBadgeColor(log.action)}>
                          {getActionText(log.action)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{getEntityText(log.entityType)}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {log.entityId || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye className="h-4 w-4 ml-1" />
                          عرض التفاصيل
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Log Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          {selectedLog && (
            <>
              <DialogHeader>
                <DialogTitle>تفاصيل السجل</DialogTitle>
                <DialogDescription>
                  {getActionText(selectedLog.action)} {getEntityText(selectedLog.entityType)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">المستخدم</p>
                    <p className="text-sm font-semibold">{selectedLog.userName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">التاريخ</p>
                    <p className="text-sm">
                      {format(new Date(selectedLog.timestamp), 'PPpp', { locale: ar })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">الإجراء</p>
                    <Badge className={getActionBadgeColor(selectedLog.action)}>
                      {getActionText(selectedLog.action)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">النوع</p>
                    <Badge variant="outline">{getEntityText(selectedLog.entityType)}</Badge>
                  </div>
                </div>

                {/* Before State */}
                {selectedLog.details?.before && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-red-600">البيانات قبل التعديل/الحذف:</h3>
                    <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto">
                      {JSON.stringify(selectedLog.details.before, null, 2)}
                    </pre>
                  </div>
                )}

                {/* After State */}
                {selectedLog.details?.after && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-green-600">البيانات بعد الإنشاء/التعديل:</h3>
                    <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto">
                      {JSON.stringify(selectedLog.details.after, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Metadata */}
                {selectedLog.details?.metadata && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">معلومات إضافية:</h3>
                    <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto">
                      {JSON.stringify(selectedLog.details.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
