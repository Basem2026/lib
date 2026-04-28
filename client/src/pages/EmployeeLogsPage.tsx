import { useState, useMemo } from 'react';
import { useAuditLogs } from '@/contexts/AuditLogsContext';
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
import { Search, Download, Plus, Edit, Trash2, Users } from 'lucide-react';
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
import type { AuditLog, ActionType } from '@/contexts/AuditLogsContext';

/**
 * صفحة سجل الموظفين
 * عرض العمليات اليومية (إضافة زبون، إضافة بطاقة، إلخ)
 */
export default function EmployeeLogsPage() {
  const { employeeLogs } = useAuditLogs();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // قائمة الموظفين الفريدة
  const uniqueEmployees = useMemo(() => {
    const employees = new Set(employeeLogs.map(log => log.employeeName));
    return Array.from(employees);
  }, [employeeLogs]);

  const filteredLogs = useMemo(() => {
    let logs = [...employeeLogs];

    // فلترة حسب البحث
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      logs = logs.filter(
        log =>
          log.employeeName.toLowerCase().includes(searchLower) ||
          log.entityName.toLowerCase().includes(searchLower) ||
          log.description.toLowerCase().includes(searchLower)
      );
    }

    // فلترة حسب نوع العملية
    if (actionFilter !== 'all') {
      logs = logs.filter(log => log.actionType === actionFilter);
    }

    // فلترة حسب نوع الكيان
    if (entityFilter !== 'all') {
      logs = logs.filter(log => log.entityType === entityFilter);
    }

    // فلترة حسب الموظف
    if (employeeFilter !== 'all') {
      logs = logs.filter(log => log.employeeName === employeeFilter);
    }

    // فلترة حسب التاريخ
    const now = Date.now();
    if (dateRange === 'today') {
      const today = new Date().setHours(0, 0, 0, 0);
      logs = logs.filter(log => log.timestamp >= today);
    } else if (dateRange === 'week') {
      const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
      logs = logs.filter(log => log.timestamp >= weekAgo);
    } else if (dateRange === 'month') {
      const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
      logs = logs.filter(log => log.timestamp >= monthAgo);
    }

    return logs.sort((a, b) => b.timestamp - a.timestamp);
  }, [employeeLogs, searchTerm, actionFilter, entityFilter, employeeFilter, dateRange]);

  const handleExport = () => {
    const data = filteredLogs.map(log => ({
      التاريخ: log.date,
      الوقت: log.time,
      الموظف: log.employeeName,
      'نوع العملية': getActionText(log.actionType),
      'نوع الكيان': getEntityText(log.entityType),
      'اسم الكيان': log.entityName,
      الوصف: log.description,
    }));

    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employee-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getActionIcon = (action: ActionType) => {
    switch (action) {
      case 'add': return <Plus className="w-4 h-4" />;
      case 'edit': return <Edit className="w-4 h-4" />;
      case 'delete': return <Trash2 className="w-4 h-4" />;
      default: return null;
    }
  };

  const getActionColor = (action: ActionType) => {
    switch (action) {
      case 'add': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'edit': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'delete': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionText = (action: ActionType) => {
    const actions: Record<ActionType, string> = {
      add: 'إضافة',
      edit: 'تعديل',
      delete: 'حذف',
      block: 'حظر',
      unblock: 'إلغاء حظر',
      disable: 'تعطيل',
      enable: 'تفعيل',
    };
    return actions[action] || action;
  };

  const getEntityText = (entity: string) => {
    const entities: Record<string, string> = {
      employee: 'موظف',
      customer: 'زبون',
      card: 'بطاقة',
      operation: 'عملية',
      expense: 'مصروف',
      salary: 'راتب',
      permission: 'صلاحية',
      service: 'خدمة',
    };
    return entities[entity] || entity;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">سجلات الموظفين</h1>
          <p className="text-muted-foreground mt-1">
            عرض جميع العمليات اليومية (إضافة زبون، إضافة بطاقة، إلخ)
          </p>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="w-4 h-4 ml-2" />
          تصدير CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            سجل العمليات اليومية
          </CardTitle>
          <CardDescription>
            إجمالي السجلات: {filteredLogs.length}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* فلاتر */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="بحث..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="نوع العملية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل العمليات</SelectItem>
                <SelectItem value="add">إضافة</SelectItem>
                <SelectItem value="edit">تعديل</SelectItem>
                <SelectItem value="delete">حذف</SelectItem>
              </SelectContent>
            </Select>

            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="نوع الكيان" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الكيانات</SelectItem>
                <SelectItem value="customer">زبون</SelectItem>
                <SelectItem value="card">بطاقة</SelectItem>
                <SelectItem value="operation">عملية</SelectItem>
                <SelectItem value="expense">مصروف</SelectItem>
                <SelectItem value="salary">راتب</SelectItem>
              </SelectContent>
            </Select>

            <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="الموظف" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الموظفين</SelectItem>
                {uniqueEmployees.map(emp => (
                  <SelectItem key={emp} value={emp}>{emp}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
              <SelectTrigger>
                <SelectValue placeholder="الفترة الزمنية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الفترات</SelectItem>
                <SelectItem value="today">اليوم</SelectItem>
                <SelectItem value="week">آخر أسبوع</SelectItem>
                <SelectItem value="month">آخر شهر</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* الجدول */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">التاريخ والوقت</TableHead>
                  <TableHead className="text-right">نوع العملية</TableHead>
                  <TableHead className="text-right">الكيان</TableHead>
                  <TableHead className="text-right">الوصف</TableHead>
                  <TableHead className="text-right">الموظف</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      لا توجد سجلات
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-right">
                        <div className="flex flex-col">
                          <span className="font-medium">{log.date}</span>
                          <span className="text-sm text-muted-foreground">{log.time}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge className={`flex items-center gap-1 w-fit ${getActionColor(log.actionType)}`}>
                          {getActionIcon(log.actionType)}
                          {getActionText(log.actionType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col">
                          <span className="font-medium">{getEntityText(log.entityType)}</span>
                          <span className="text-sm text-muted-foreground">{log.entityName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right max-w-md truncate">
                        {log.description}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-medium">{log.employeeName}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedLog(log)}
                        >
                          التفاصيل
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

      {/* نافذة التفاصيل */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          {selectedLog && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {getActionIcon(selectedLog.actionType)}
                  تفاصيل العملية
                </DialogTitle>
                <DialogDescription>
                  {selectedLog.description}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* معلومات أساسية */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">التاريخ</p>
                    <p className="font-medium">{selectedLog.date}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">الوقت</p>
                    <p className="font-medium">{selectedLog.time}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">الموظف</p>
                    <p className="font-medium">{selectedLog.employeeName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">نوع العملية</p>
                    <Badge className={getActionColor(selectedLog.actionType)}>
                      {getActionText(selectedLog.actionType)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">نوع الكيان</p>
                    <p className="font-medium">{getEntityText(selectedLog.entityType)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">اسم الكيان</p>
                    <p className="font-medium">{selectedLog.entityName}</p>
                  </div>
                </div>

                {/* التغييرات */}
                {selectedLog.changes && selectedLog.changes.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">التغييرات:</h4>
                    <div className="space-y-2">
                      {selectedLog.changes.map((change, index) => (
                        <div key={index} className="p-3 bg-muted rounded-lg">
                          <p className="font-medium mb-2">{change.fieldLabel}</p>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">قبل:</p>
                              <p className="font-mono">{JSON.stringify(change.oldValue, null, 2)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">بعد:</p>
                              <p className="font-mono">{JSON.stringify(change.newValue, null, 2)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* البيانات قبل */}
                {selectedLog.before && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">البيانات قبل التعديل:</h4>
                    <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto">
                      {JSON.stringify(selectedLog.before, null, 2)}
                    </pre>
                  </div>
                )}

                {/* البيانات بعد */}
                {selectedLog.after && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">البيانات بعد التعديل:</h4>
                    <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto">
                      {JSON.stringify(selectedLog.after, null, 2)}
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
