import React, { useState } from 'react';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployees } from '@/contexts/EmployeesContext';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Trash2, CheckCircle, AlertCircle, Info, Clock, AlertTriangle, Bell } from 'lucide-react';
import { toast } from 'sonner';

/**
 * صفحة الإشعارات (Notifications Page)
 * عرض جميع الإشعارات مع تصفية حسب النوع
 */

export default function NotificationsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { notifications, markAsRead, markAllAsRead, deleteNotification, getNotificationsByRole, sendTestPush } = useNotifications();
  const { employees } = useEmployees();

  const currentEmployee = employees.find(e => e.id === user?.id);
  const [selectedTestEmployee, setSelectedTestEmployee] = useState<string>('');
  const isManager = currentEmployee?.jobTitle === 'manager' || currentEmployee?.jobTitle === 'deputy_manager';
  // تمرير صلاحيات الموظف لفلترة الإشعارات (من لديه view_alerts يرى إشعارات managers_and_alerts)
  const roleNotifications = currentEmployee
    ? getNotificationsByRole(currentEmployee.jobTitle, currentEmployee.permissions)
    : notifications;

  const handleMarkAsRead = (notificationId: string) => {
    markAsRead(notificationId);
  };

  const handleDelete = (notificationId: string) => {
    deleteNotification(notificationId);
    toast.success('تم حذف الإشعار');
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
    toast.success('تم تحديد جميع الإشعارات كمقروءة');
  };

  const handleActionClick = (notification: any) => {
    if (notification.actionUrl) {
      markAsRead(notification.id);
      setLocation(notification.actionUrl);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'pending_approval':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getNotificationBadgeColor = (type: string) => {
    switch (type) {
      case 'pending_approval': return 'bg-yellow-100 text-yellow-800';
      case 'success':          return 'bg-green-100 text-green-800';
      case 'error':            return 'bg-red-100 text-red-800';
      case 'warning':          return 'bg-orange-100 text-orange-800';
      default:                 return 'bg-blue-100 text-blue-800';
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'pending_approval': return 'معلق';
      case 'success':          return 'نجاح';
      case 'error':            return 'حرج';
      case 'warning':          return 'تحذير';
      default:                 return 'معلومة';
    }
  };

  const getBorderColor = (type: string) => {
    switch (type) {
      case 'pending_approval': return 'border-l-yellow-500';
      case 'success':          return 'border-l-green-500';
      case 'error':            return 'border-l-red-600';
      case 'warning':          return 'border-l-orange-500';
      default:                 return 'border-l-blue-500';
    }
  };

  const getBgColor = (notification: any) => {
    if (notification.type === 'error') return 'bg-red-50';
    if (!notification.read) return 'bg-blue-50';
    return 'bg-white';
  };

  // تصنيف الإشعارات
  const criticalNotifications = roleNotifications.filter(n => n.type === 'error');
  const financialNotifications = roleNotifications.filter(n =>
    n.title.includes('مالية') || n.title.includes('مالي') || n.message.includes('الحالة المالية')
  );
  const documentNotifications = roleNotifications.filter(n =>
    n.title.includes('مستندات') || n.message.includes('مستندات')
  );
  const otherNotifications = roleNotifications.filter(n =>
    !criticalNotifications.includes(n) &&
    !financialNotifications.includes(n) &&
    !documentNotifications.includes(n)
  );

  const renderNotificationCard = (notification: any) => (
    <Card
      key={notification.id}
      className={`border-l-4 ${getBorderColor(notification.type)} ${getBgColor(notification)} ${
        notification.type === 'error' ? 'ring-1 ring-red-200' : ''
      }`}
    >
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="mt-0.5 flex-shrink-0">
              {getNotificationIcon(notification.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="font-semibold text-base">{notification.title}</h3>
                <Badge className={getNotificationBadgeColor(notification.type)}>
                  {getTypeName(notification.type)}
                </Badge>
                {!notification.read && (
                  <Badge className="bg-blue-500 text-white text-xs">جديد</Badge>
                )}
                {notification.type === 'error' && (
                  <Badge className="bg-red-600 text-white text-xs animate-pulse">⚠ حرج</Badge>
                )}
              </div>
              <p className="text-gray-700 text-sm mb-1">{notification.message}</p>
              <p className="text-xs text-gray-400">
                {new Date(notification.timestamp).toLocaleString('ar-LY')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {notification.actionUrl && (
              <Button
                variant="default"
                size="sm"
                onClick={() => handleActionClick(notification)}
                className={notification.type === 'error' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}
              >
                {notification.actionLabel || 'عرض'}
              </Button>
            )}
            {!notification.read && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMarkAsRead(notification.id)}
              >
                مقروء
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(notification.id)}
              className="text-red-400 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const EmptyState = ({ message }: { message: string }) => (
    <Card className="border-2 border-dashed border-gray-200">
      <CardContent className="py-12 text-center">
        <Bell className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-400">{message}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-[#F9FBFD]">
      {/* Header */}
      <header className="bg-[#1E2E3D] text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setLocation('/dashboard')}
              className="text-white border-white hover:bg-white/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">الإشعارات</h1>
              <p className="text-sm text-gray-300">
                {roleNotifications.filter(n => !n.read).length} غير مقروء من {roleNotifications.length} إشعار
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {criticalNotifications.filter(n => !n.read).length > 0 && (
              <Badge className="bg-red-500 text-white animate-pulse px-3 py-1">
                ⚠ {criticalNotifications.filter(n => !n.read).length} حرج
              </Badge>
            )}
            {roleNotifications.filter(n => !n.read).length > 0 && (
              <Button
                variant="secondary"
                onClick={handleMarkAllAsRead}
                className="bg-white text-[#1E2E3D] hover:bg-gray-100"
              >
                تحديد الكل كمقروء
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* إحصائيات سريعة */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'الكل', count: roleNotifications.length, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'حرجة', count: criticalNotifications.length, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'مالية', count: financialNotifications.length, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'مستندات', count: documentNotifications.length, color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map(stat => (
            <Card key={stat.label} className={stat.bg}>
              <CardContent className="py-3 text-center">
                <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.count}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* قسم الإشعار التجريبي - للمدير ونائب المدير فقط */}
        {isManager && (
          <Card className="mb-6 border border-[#C9A34D]/30 bg-amber-50">
            <CardContent className="py-4">
              <div className="flex items-center gap-3 flex-wrap">
                <Bell className="w-5 h-5 text-[#C9A34D] flex-shrink-0" />
                <span className="font-semibold text-[#1E2E3D] text-sm">إرسال إشعار تجريبي لموظف</span>
                <select
                  value={selectedTestEmployee}
                  onChange={e => setSelectedTestEmployee(e.target.value)}
                  className="flex-1 min-w-[180px] border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C9A34D]"
                >
                  <option value="">-- اختر موظفاً --</option>
                  {employees.filter(e => e.status === 'active').map(e => (
                    <option key={e.id} value={e.id}>{e.fullName} ({e.jobTitle === 'manager' ? 'مدير' : e.jobTitle === 'deputy_manager' ? 'نائب مدير' : e.jobTitle})</option>
                  ))}
                </select>
                <Button
                  size="sm"
                  disabled={!selectedTestEmployee}
                  onClick={() => {
                    if (selectedTestEmployee) {
                      sendTestPush(selectedTestEmployee);
                      toast.success('تم إرسال الإشعار التجريبي');
                    }
                  }}
                  className="bg-[#C9A34D] hover:bg-[#b8923d] text-white"
                >
                  إرسال
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* تابات التصفية */}
        <Tabs defaultValue="all" dir="rtl">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="all" className="flex-1">
              الكل
              {roleNotifications.filter(n => !n.read).length > 0 && (
                <span className="mr-1.5 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                  {roleNotifications.filter(n => !n.read).length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="critical" className="flex-1">
              حرجة
              {criticalNotifications.filter(n => !n.read).length > 0 && (
                <span className="mr-1.5 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full animate-pulse">
                  {criticalNotifications.filter(n => !n.read).length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex-1">
              مالية
              {financialNotifications.filter(n => !n.read).length > 0 && (
                <span className="mr-1.5 text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">
                  {financialNotifications.filter(n => !n.read).length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex-1">
              مستندات
              {documentNotifications.filter(n => !n.read).length > 0 && (
                <span className="mr-1.5 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                  {documentNotifications.filter(n => !n.read).length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="other" className="flex-1">
              أخرى
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            {roleNotifications.length === 0
              ? <EmptyState message="لا توجد إشعارات حالياً" />
              : <div className="space-y-3">{roleNotifications.map(renderNotificationCard)}</div>
            }
          </TabsContent>

          <TabsContent value="critical">
            {criticalNotifications.length === 0
              ? <EmptyState message="لا توجد إشعارات حرجة" />
              : <div className="space-y-3">{criticalNotifications.map(renderNotificationCard)}</div>
            }
          </TabsContent>

          <TabsContent value="financial">
            {financialNotifications.length === 0
              ? <EmptyState message="لا توجد إشعارات مالية" />
              : <div className="space-y-3">{financialNotifications.map(renderNotificationCard)}</div>
            }
          </TabsContent>

          <TabsContent value="documents">
            {documentNotifications.length === 0
              ? <EmptyState message="لا توجد إشعارات مستندات" />
              : <div className="space-y-3">{documentNotifications.map(renderNotificationCard)}</div>
            }
          </TabsContent>

          <TabsContent value="other">
            {otherNotifications.length === 0
              ? <EmptyState message="لا توجد إشعارات أخرى" />
              : <div className="space-y-3">{otherNotifications.map(renderNotificationCard)}</div>
            }
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
