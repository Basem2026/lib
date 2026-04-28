import React, { useState, useMemo } from 'react';
import { useLogs } from '@/contexts/LogsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, Download, Trash2, Eye, FileText, Activity, 
  CreditCard, DollarSign, TrendingUp, RefreshCw 
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

/**
 * صفحة السجلات والتدقيق (Logs & Audit Trail Page)
 * Design Philosophy: Comprehensive Audit Trail Monitoring
 * - عرض جميع العمليات والتغييرات
 * - تصفية وبحث متقدم
 * - تصدير البيانات بصيغة Excel
 */

export default function LogsPage() {
  const { user } = useAuth();
  const { auditTrails, systemLogs, getLogStatistics, exportAuditTrails, clearOldLogs } = useLogs();
  const [, setLocation] = useLocation();

  const [activeTab, setActiveTab] = useState<'audit' | 'system'>('audit');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterUser, setFilterUser] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedTrail, setSelectedTrail] = useState<any | null>(null);

  const statistics = getLogStatistics();

  // تصفية السجلات
  const filteredAuditTrails = useMemo(() => {
    return auditTrails.filter(trail => {
      const matchesSearch = 
        trail.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trail.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trail.entityId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trail.details?.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesAction = filterAction === 'all' || trail.action === filterAction;
      const matchesUser = filterUser === 'all' || trail.userId === filterUser;
      const matchesStatus = filterStatus === 'all' || trail.status === filterStatus;

      return matchesSearch && matchesAction && matchesUser && matchesStatus;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [auditTrails, searchTerm, filterAction, filterUser, filterStatus]);

  // استخراج قائمة المستخدمين الفريدة
  const uniqueUsers = useMemo(() => {
    const users = new Set(auditTrails.map(t => t.userName));
    return Array.from(users);
  }, [auditTrails]);

  const handleExportExcel = () => {
    // إنشاء CSV متوافق مع Excel
    const headers = ['التاريخ والوقت', 'العملية', 'المستخدم', 'الحالة', 'التفاصيل'];
    const rows = filteredAuditTrails.map(trail => [
      new Date(trail.timestamp).toLocaleString('ar-LY'),
      getActionLabel(trail.action),
      trail.userName,
      trail.status === 'success' ? 'نجح' : 'فشل',
      trail.details?.description || '-',
    ]);

    // إضافة BOM لدعم UTF-8 في Excel
    const BOM = '\uFEFF';
    const csv = BOM + [headers, ...rows].map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-trails-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('تم تصدير البيانات بصيغة Excel');
  };

  const handleClearOldLogs = () => {
    if (window.confirm('هل تريد حذف السجلات القديمة (أكثر من 90 يوم)؟')) {
      clearOldLogs(90);
      toast.success('تم حذف السجلات القديمة');
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      // عمليات الزبائن
      'add_customer': 'إضافة زبون',
      'edit_customer': 'تعديل زبون',
      'delete_customer': 'حذف زبون',
      'view_customer': 'عرض زبون',
      
      // عمليات البطاقات
      'add_card': 'إضافة بطاقة',
      'edit_card': 'تعديل بطاقة',
      'delete_card': 'حذف بطاقة',
      'view_card': 'عرض بطاقة',
      'change_card_status': 'تغيير حالة بطاقة',
      'update_card_balance': 'تحديث رصيد بطاقة',
      'update_deposit_balance': 'تحديث رصيد إيداع',
      
      // عمليات البطاقات الجماعية
      'bulk_status_change': 'تغيير حالات جماعي',
      'bulk_withdrawal': 'سحب بطاقات جماعي',
      'withdraw_pending': 'سحب متبقي محتجز',
      'card_sale_cash': 'بيع بطاقة (كاش)',
      'card_sale_bank': 'بيع بطاقة (مصرف)',
      
      // عمليات أخرى
      'add_operation': 'إضافة عملية',
      'edit_operation': 'تعديل عملية',
      'delete_operation': 'حذف عملية',
      'add_expense': 'إضافة مصروف',
      'edit_expense': 'تعديل مصروف',
      'delete_expense': 'حذف مصروف',
      'submit_daily_close': 'إرسال إغلاق يومي',
      'approve_daily_close': 'موافقة إغلاق يومي',
      'reject_daily_close': 'رفض إغلاق يومي',
      'login': 'تسجيل دخول',
      'logout': 'تسجيل خروج',
    };
    return labels[action] || action;
  };

  const getActionIcon = (action: string) => {
    if (action.includes('card') || action.includes('bulk') || action.includes('withdraw')) {
      return <CreditCard className="w-4 h-4" />;
    }
    if (action.includes('sale')) {
      return <DollarSign className="w-4 h-4" />;
    }
    if (action.includes('status')) {
      return <RefreshCw className="w-4 h-4" />;
    }
    return <Activity className="w-4 h-4" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => setLocation("/dashboard")}
          className="mb-4 text-amber-400 hover:text-amber-300"
        >
          <ArrowLeft className="ml-2 h-4 w-4" />
          العودة
        </Button>
        <h1 className="text-4xl font-bold text-white mb-2">السجلات والتدقيق</h1>
        <p className="text-slate-400">سجل شامل لجميع العمليات والتغييرات في النظام</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">إجمالي السجلات</p>
                <p className="text-3xl font-bold text-blue-400">{statistics.totalAuditTrails}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">العمليات الفاشلة</p>
                <p className="text-3xl font-bold text-red-400">{statistics.failedOperations}</p>
              </div>
              <Activity className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">الأخطاء الحرجة</p>
                <p className="text-3xl font-bold text-orange-400">{statistics.criticalErrors}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">آخر نشاط</p>
                <p className="text-sm font-bold text-green-400">
                  {statistics.lastActivityTime 
                    ? new Date(statistics.lastActivityTime).toLocaleString('ar-LY')
                    : 'لا توجد نشاطات'}
                </p>
              </div>
              <Activity className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="border-b border-slate-700">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-white">سجل التدقيق</CardTitle>
              <CardDescription className="text-slate-400">
                جميع العمليات والتغييرات في النظام ({filteredAuditTrails.length} سجل)
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm"
                onClick={handleExportExcel}
                className="bg-green-600 hover:bg-green-700"
              >
                <Download className="w-4 h-4 ml-2" />
                تصدير Excel
              </Button>
              <Button 
                size="sm"
                onClick={handleClearOldLogs}
                variant="outline"
                className="text-red-400 border-red-400 hover:bg-red-400/10"
              >
                <Trash2 className="w-4 h-4 ml-2" />
                حذف القديم
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Input
              placeholder="ابحث عن..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
            />
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="نوع العملية" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="all">جميع العمليات</SelectItem>
                <SelectItem value="bulk_withdrawal">سحب بطاقات جماعي</SelectItem>
                <SelectItem value="withdraw_pending">سحب متبقي محتجز</SelectItem>
                <SelectItem value="bulk_status_change">تغيير حالات جماعي</SelectItem>
                <SelectItem value="card_sale_cash">بيع بطاقة (كاش)</SelectItem>
                <SelectItem value="card_sale_bank">بيع بطاقة (مصرف)</SelectItem>
                <SelectItem value="add_customer">إضافة زبون</SelectItem>
                <SelectItem value="edit_customer">تعديل زبون</SelectItem>
                <SelectItem value="delete_customer">حذف زبون</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterUser} onValueChange={setFilterUser}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="المستخدم" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="all">جميع المستخدمين</SelectItem>
                {uniqueUsers.map(userName => (
                  <SelectItem key={userName} value={userName}>{userName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="success">نجح</SelectItem>
                <SelectItem value="failed">فشل</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Audit Trails Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-700 border-b-2 border-slate-600">
                <tr>
                  <th className="px-4 py-3 text-center text-slate-300">الأيقونة</th>
                  <th className="px-4 py-3 text-center text-slate-300">العملية</th>
                  <th className="px-4 py-3 text-center text-slate-300">المستخدم</th>
                  <th className="px-4 py-3 text-center text-slate-300">التاريخ والوقت</th>
                  <th className="px-4 py-3 text-center text-slate-300">الحالة</th>
                  <th className="px-4 py-3 text-center text-slate-300">الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {filteredAuditTrails.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      لا توجد سجلات
                    </td>
                  </tr>
                ) : (
                  filteredAuditTrails.map((trail) => (
                    <tr key={trail.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center text-amber-400">
                          {getActionIcon(trail.action)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-white">{getActionLabel(trail.action)}</td>
                      <td className="px-4 py-3 text-center text-slate-300">{trail.userName}</td>
                      <td className="px-4 py-3 text-center text-xs text-slate-400">
                        {new Date(trail.timestamp).toLocaleString('ar-LY')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs ${
                          trail.status === 'success' 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {trail.status === 'success' ? 'نجح' : 'فشل'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedTrail(trail)}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={!!selectedTrail} onOpenChange={() => setSelectedTrail(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-amber-400">تفاصيل السجل</DialogTitle>
            <DialogDescription className="text-slate-400">
              معلومات تفصيلية عن العملية
            </DialogDescription>
          </DialogHeader>
          {selectedTrail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-400 text-sm">العملية</p>
                  <p className="text-white font-semibold">{getActionLabel(selectedTrail.action)}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">المستخدم</p>
                  <p className="text-white font-semibold">{selectedTrail.userName}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">التاريخ والوقت</p>
                  <p className="text-white font-semibold">
                    {new Date(selectedTrail.timestamp).toLocaleString('ar-LY')}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">الحالة</p>
                  <p className={`font-semibold ${
                    selectedTrail.status === 'success' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {selectedTrail.status === 'success' ? 'نجح' : 'فشل'}
                  </p>
                </div>
              </div>
              
              {selectedTrail.details?.description && (
                <div>
                  <p className="text-slate-400 text-sm mb-2">التفاصيل</p>
                  <p className="text-white bg-slate-700 p-3 rounded">
                    {selectedTrail.details.description}
                  </p>
                </div>
              )}

              {selectedTrail.details?.before && (
                <div>
                  <p className="text-slate-400 text-sm mb-2">القيم القديمة</p>
                  <pre className="text-white bg-slate-700 p-3 rounded text-xs overflow-auto">
                    {JSON.stringify(selectedTrail.details.before, null, 2)}
                  </pre>
                </div>
              )}

              {selectedTrail.details?.after && (
                <div>
                  <p className="text-slate-400 text-sm mb-2">القيم الجديدة</p>
                  <pre className="text-white bg-slate-700 p-3 rounded text-xs overflow-auto">
                    {JSON.stringify(selectedTrail.details.after, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
