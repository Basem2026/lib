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
import { Search, Download, Filter, Calendar, Shield, Plus, Edit, Trash2, Ban, Check, Loader2 } from 'lucide-react';
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

/**
 * صفحة سجل الإدارة
 * عرض عمليات الإدارة (إضافة موظف، تغيير صلاحيات، إلخ)
 */
export default function ManagementLogsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  // جلب السجلات من قاعدة البيانات
  const { data: allLogs = [], isLoading } = trpc.auditLogs.getAll.useQuery({
    limit: 500,
  });

  const filteredLogs = useMemo(() => {
    let logs = [...allLogs];

    // فلترة حسب البحث
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      logs = logs.filter(
        log =>
          log.userName.toLowerCase().includes(searchLower) ||
          log.entityType.toLowerCase().includes(searchLower) ||
          (log.details?.metadata?.name && log.details.metadata.name.toLowerCase().includes(searchLower))
      );
    }

    // فلترة حسب نوع العملية
    if (actionFilter !== 'all') {
      logs = logs.filter(log => log.action === actionFilter);
    }

    // فلترة حسب نوع الكيان
    if (entityFilter !== 'all') {
      logs = logs.filter(log => log.entityType === entityFilter);
    }

    // فلترة حسب التاريخ
    const now = Date.now();
    if (dateRange === 'today') {
      const today = new Date().setHours(0, 0, 0, 0);
      logs = logs.filter(log => new Date(log.timestamp).getTime() >= today);
    } else if (dateRange === 'week') {
      const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
      logs = logs.filter(log => new Date(log.timestamp).getTime() >= weekAgo);
    } else if (dateRange === 'month') {
      const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
      logs = logs.filter(log => new Date(log.timestamp).getTime() >= monthAgo);
    }

    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [allLogs, searchTerm, actionFilter, entityFilter, dateRange]);

  const handleExport = () => {
    const data = filteredLogs.map(log => ({
      التاريخ: new Date(log.timestamp).toLocaleDateString('ar-LY'),
      الوقت: new Date(log.timestamp).toLocaleTimeString('ar-LY'),
      الموظف: log.userName,
      'نوع العملية': getActionText(log.action),
      'نوع الكيان': getEntityText(log.entityType),
      'اسم الكيان': log.details?.metadata?.name || log.entityId || '-',
      الوصف: getDescription(log),
    }));

    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `management-logs-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getActionText = (action: string) => {
    const actionMap: Record<string, string> = {
      create: 'إضافة',
      update: 'تعديل',
      delete: 'حذف',
      print: 'طباعة',
      close_day: 'إغلاق يوم',
      approve_close: 'موافقة على الإغلاق',
      reject_close: 'رفض الإغلاق',
      permission_change: 'تغيير الصلاحيات',
      login: 'تسجيل دخول',
      logout: 'تسجيل خروج',
      bulk_status_change: 'تغيير حالة جماعي',
      bulk_withdrawal: 'سحب جماعي',
      withdraw_pending: 'سحب معلق',
      card_sale_cash: 'بيع بطاقة نقدي',
      card_sale_bank: 'بيع بطاقة بنكي',
    };
    return actionMap[action] || action;
  };

  const getEntityText = (entityType: string) => {
    const entityMap: Record<string, string> = {
      customer: 'زبون',
      card: 'بطاقة',
      operation: 'عملية',
      expense: 'مصروف',
      salary: 'راتب',
      employee: 'موظف',
      daily_close: 'إغلاق يومي',
      treasury: 'خزينة',
      system: 'نظام',
    };
    return entityMap[entityType] || entityType;
  };

  const getDescription = (log: any) => {
    const action = getActionText(log.action);
    const entity = getEntityText(log.entityType);
    const name = log.details?.metadata?.name || log.entityId || '';
    return `${action} ${entity}${name ? ': ' + name : ''}`;
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return <Plus className="w-4 h-4" />;
      case 'update':
        return <Edit className="w-4 h-4" />;
      case 'delete':
        return <Trash2 className="w-4 h-4" />;
      case 'permission_change':
        return <Shield className="w-4 h-4" />;
      case 'approve_close':
        return <Check className="w-4 h-4" />;
      case 'reject_close':
        return <Ban className="w-4 h-4" />;
      default:
        return <Calendar className="w-4 h-4" />;
    }
  };

  const getActionBadgeVariant = (action: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (action) {
      case 'create':
        return 'default';
      case 'update':
        return 'secondary';
      case 'delete':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">سجلات الإدارة</h1>
        <p className="text-muted-foreground mt-2">
          عرض جميع عمليات الإدارة (إضافة موظف، تغيير صلاحيات، إلخ)
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                سجل العمليات الإدارية
              </CardTitle>
              <CardDescription>
                إجمالي السجلات: {filteredLogs.length}
              </CardDescription>
            </div>
            <Button onClick={handleExport} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              تصدير CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="ابحث..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="كل العمليات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل العمليات</SelectItem>
                <SelectItem value="create">إضافة</SelectItem>
                <SelectItem value="update">تعديل</SelectItem>
                <SelectItem value="delete">حذف</SelectItem>
                <SelectItem value="permission_change">تغيير الصلاحيات</SelectItem>
              </SelectContent>
            </Select>

            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="كل الكيانات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الكيانات</SelectItem>
                <SelectItem value="employee">موظف</SelectItem>
                <SelectItem value="customer">زبون</SelectItem>
                <SelectItem value="card">بطاقة</SelectItem>
                <SelectItem value="operation">عملية</SelectItem>
                <SelectItem value="expense">مصروف</SelectItem>
                <SelectItem value="salary">راتب</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={(v) => setDateRange(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="كل الفترات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الفترات</SelectItem>
                <SelectItem value="today">اليوم</SelectItem>
                <SelectItem value="week">آخر أسبوع</SelectItem>
                <SelectItem value="month">آخر شهر</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الإجراءات</TableHead>
                  <TableHead>الموظف</TableHead>
                  <TableHead>الوصف</TableHead>
                  <TableHead>الكيان</TableHead>
                  <TableHead>نوع العملية</TableHead>
                  <TableHead>التاريخ والوقت</TableHead>
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
                  filteredLogs.map((log) => (
                    <TableRow
                      key={log.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedLog(log)}
                    >
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                        >
                          عرض
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">{log.userName}</TableCell>
                      <TableCell>{getDescription(log)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getEntityText(log.entityType)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getActionBadgeVariant(log.action)} className="gap-1">
                          {getActionIcon(log.action)}
                          {getActionText(log.action)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(log.timestamp).toLocaleDateString('ar-LY', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                        })}{' '}
                        {new Date(log.timestamp).toLocaleTimeString('ar-LY', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedLog && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {getActionIcon(selectedLog.action)}
                  تفاصيل السجل
                </DialogTitle>
                <DialogDescription>
                  {getDescription(selectedLog)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">الموظف</p>
                    <p className="text-base">{selectedLog.userName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">نوع العملية</p>
                    <Badge variant={getActionBadgeVariant(selectedLog.action)} className="gap-1">
                      {getActionIcon(selectedLog.action)}
                      {getActionText(selectedLog.action)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">نوع الكيان</p>
                    <Badge variant="outline">{getEntityText(selectedLog.entityType)}</Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">التاريخ والوقت</p>
                    <p className="text-base">
                      {new Date(selectedLog.timestamp).toLocaleDateString('ar-LY')}{' '}
                      {new Date(selectedLog.timestamp).toLocaleTimeString('ar-LY')}
                    </p>
                  </div>
                </div>

                {selectedLog.details && (
                  <div className="space-y-3">
                    {selectedLog.details.before && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">البيانات القديمة</p>
                        <pre className="bg-muted p-3 rounded-lg text-sm overflow-x-auto">
                          {JSON.stringify(selectedLog.details.before, null, 2)}
                        </pre>
                      </div>
                    )}
                    {selectedLog.details.after && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">البيانات الجديدة</p>
                        <pre className="bg-muted p-3 rounded-lg text-sm overflow-x-auto">
                          {JSON.stringify(selectedLog.details.after, null, 2)}
                        </pre>
                      </div>
                    )}
                    {selectedLog.details.metadata && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">معلومات إضافية</p>
                        <pre className="bg-muted p-3 rounded-lg text-sm overflow-x-auto">
                          {JSON.stringify(selectedLog.details.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
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
