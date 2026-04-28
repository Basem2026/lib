import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployees } from '@/contexts/EmployeesContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Trash2, User, Bell, BellOff } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/PageHeader';
import { BRAND_COLORS } from '@/lib/colors';
import { trpc } from '@/lib/trpc';
import { useNotifications } from '@/contexts/NotificationsContext';
import { Checkbox } from '@/components/ui/checkbox';

/**
 * صفحة الإعدادات V2 - Settings V2
 * مع زر إعادة تعيين النظام الكامل
 */
export default function SettingsV2() {
  const { user } = useAuth();
  const { employees } = useEmployees();
  const { isPushEnabled, requestPushPermission } = useNotifications();
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [isClearing, setIsClearing] = useState(false);
  
  // إعدادات الإشعارات
  const [notificationSettings, setNotificationSettings] = useState({
    customers: true,
    cards: true,
    dailyOperations: true,
  });

  // تحميل الإعدادات من localStorage
  useEffect(() => {
    const saved = localStorage.getItem('notificationSettings');
    if (saved) {
      setNotificationSettings(JSON.parse(saved));
    }
  }, []);

  // حفظ الإعدادات عند التغيير
  const handleNotificationSettingChange = (key: string, value: boolean) => {
    const newSettings = { ...notificationSettings, [key]: value };
    setNotificationSettings(newSettings);
    localStorage.setItem('notificationSettings', JSON.stringify(newSettings));
    toast.success('تم حفظ إعدادات الإشعارات');
  };

  const handleEnableNotifications = async () => {
    const success = await requestPushPermission();
    if (success) {
      toast.success('تم تفعيل الإشعارات بنجاح!');
    } else {
      toast.error('فشل تفعيل الإشعارات');
    }
  };
  
  // البحث عن بيانات الموظف الحالي
  const currentEmployee = employees.find(emp => emp.phone === user?.phone);
  
  // tRPC mutation لإعادة تعيين النظام مع التحقق من كلمة المرور
  const resetSystemMutation = trpc.admin.resetSystem.useMutation();

  const handleClearAllData = async () => {
    // التحقق من النص التأكيدي
    if (confirmText !== 'مسح كل شي') {
      toast.error('يرجى كتابة "مسح كل شي" بالضبط للتأكيد');
      return;
    }

    if (!password) {
      toast.error('يرجى إدخال كلمة المرور');
      return;
    }
    
    setIsClearing(true);
    
    try {
      // 1. مسح البيانات من قاعدة البيانات مع التحقق من كلمة المرور
      await resetSystemMutation.mutateAsync({
        managerPassword: password,
        managerEmployeeCode: currentEmployee?.employeeCode || '',
      });
      
      // 2. مسح جميع بيانات localStorage بما فيها الموظفون والجلسة الحالية
      localStorage.clear();
      
      toast.success('تم إعادة تعيين النظام بنجاح! جميع البيانات تم مسحها. سيتم التوجيه لصفحة تسجيل الدخول...');
      
      // إعادة توجيه لصفحة تسجيل الدخول بعد ثانيتين
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
      
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'خطأ غير متوقع';
      toast.error(`حدث خطأ أثناء مسح البيانات: ${msg}`);
      setIsClearing(false);
    }
  };
  
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F9FBFD' }}>
      <PageHeader 
        title="الإعدادات"
        subtitle="إدارة إعدادات النظام"
      />
      
      <div className="container mx-auto p-6 space-y-6">
        {/* معلومات المستخدم */}
        <Card style={{ borderTop: `4px solid ${BRAND_COLORS.gold}` }}>
          <CardHeader style={{ backgroundColor: BRAND_COLORS.navy }}>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-white" />
              <CardTitle className="text-white">معلومات المستخدم</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium" style={{ color: BRAND_COLORS.silver }}>
                  الاسم
                </Label>
                <p className="text-lg font-bold mt-1" style={{ color: BRAND_COLORS.navy }}>
                  {currentEmployee?.fullName || user?.fullName || 'غير محدد'}
                </p>
              </div>
              
              <div>
                <Label className="text-sm font-medium" style={{ color: BRAND_COLORS.silver }}>
                  رقم الهاتف
                </Label>
                <p className="text-lg mt-1" style={{ color: BRAND_COLORS.navy }}>
                  {currentEmployee?.phone || user?.phone || 'غير محدد'}
                </p>
              </div>
              
              <div>
                <Label className="text-sm font-medium" style={{ color: BRAND_COLORS.silver }}>
                  الوظيفة
                </Label>
                <p className="text-lg mt-1" style={{ color: BRAND_COLORS.gold, fontWeight: 'bold' }}>
                  {currentEmployee?.jobTitle === 'manager' ? 'مدير' : 
                   currentEmployee?.jobTitle === 'deputy_manager' ? 'نائب المدير' : 
                   currentEmployee?.jobTitle === 'accountant' ? 'محاسب' : 
                   currentEmployee?.jobTitle === 'supervisor' ? 'مشرف' : 
                   currentEmployee?.jobTitle === 'operations' ? 'موظف عمليات' : 'موظف إدخال بيانات'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* إعدادات الإشعارات */}
        <Card style={{ borderTop: `4px solid ${BRAND_COLORS.gold}` }}>
          <CardHeader style={{ backgroundColor: BRAND_COLORS.navy }}>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-white" />
              <CardTitle className="text-white">إعدادات الإشعارات</CardTitle>
            </div>
            <CardDescription className="text-white/80">
              إدارة إشعارات Push واختيار أنواع الإشعارات
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* حالة الإشعارات */}
            <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: isPushEnabled ? '#E8F5E9' : '#FFF3E0' }}>
              <div className="flex items-center gap-3">
                {isPushEnabled ? (
                  <Bell className="w-6 h-6 text-green-600" />
                ) : (
                  <BellOff className="w-6 h-6 text-orange-600" />
                )}
                <div>
                  <p className="font-bold" style={{ color: isPushEnabled ? '#2E7D32' : '#E65100' }}>
                    {isPushEnabled ? 'الإشعارات مفعلة' : 'الإشعارات غير مفعلة'}
                  </p>
                  <p className="text-sm" style={{ color: BRAND_COLORS.silver }}>
                    {isPushEnabled ? 'ستصلك إشعارات فورية عند أي عملية جديدة' : 'قم بتفعيل الإشعارات للحصول على تنبيهات فورية'}
                  </p>
                </div>
              </div>
              {!isPushEnabled && (
                <Button
                  onClick={handleEnableNotifications}
                  style={{ backgroundColor: BRAND_COLORS.gold, color: 'white' }}
                >
                  تفعيل
                </Button>
              )}
            </div>

            {/* اختيار أنواع الإشعارات */}
            <div className="space-y-4">
              <Label className="text-base font-bold" style={{ color: BRAND_COLORS.navy }}>
                اختر أنواع الإشعارات:
              </Label>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="customers"
                    checked={notificationSettings.customers}
                    onCheckedChange={(checked) => handleNotificationSettingChange('customers', checked as boolean)}
                  />
                  <Label htmlFor="customers" className="cursor-pointer">
                    إضافة زبون جديد
                  </Label>
                </div>

                <div className="flex items-center gap-3">
                  <Checkbox
                    id="cards"
                    checked={notificationSettings.cards}
                    onCheckedChange={(checked) => handleNotificationSettingChange('cards', checked as boolean)}
                  />
                  <Label htmlFor="cards" className="cursor-pointer">
                    عمليات إدارة البطاقات (إضافة، تحديث، معاملات)
                  </Label>
                </div>

                <div className="flex items-center gap-3">
                  <Checkbox
                    id="dailyOperations"
                    checked={notificationSettings.dailyOperations}
                    onCheckedChange={(checked) => handleNotificationSettingChange('dailyOperations', checked as boolean)}
                  />
                  <Label htmlFor="dailyOperations" className="cursor-pointer">
                    العمليات اليومية
                  </Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* منطقة الخطر */}
        <Card style={{ borderTop: `4px solid #EF4444` }}>
          <CardHeader style={{ backgroundColor: '#FEE2E2' }}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <CardTitle className="text-red-600">منطقة الخطر</CardTitle>
            </div>
            <CardDescription className="text-red-600">
              العمليات في هذا القسم لا يمكن التراجع عنها
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between p-4 border rounded-lg" style={{ borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' }}>
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-2" style={{ color: BRAND_COLORS.navy }}>
                  إعادة تعيين النظام بالكامل
                </h3>
                <p className="text-sm mb-2" style={{ color: BRAND_COLORS.silver }}>
                  مسح جميع البيانات من النظام وإعادته إلى حالته الأولية
                </p>
                <div className="text-sm font-medium text-red-700 space-y-1">
                  <p>✓ سيتم مسح: الزبائن، البطاقات، العمليات، المصاريف، الرواتب</p>
                  <p>✓ سيتم مسح: الحسابات البنكية، الخزينة، السجلات، الموظفون</p>
                  <p>✓ سيتم إنشاء حساب المدير تلقائياً عند أول دخول</p>
                </div>
                <p className="text-sm font-bold text-red-600 mt-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  تحذير: هذه العملية لا يمكن التراجع عنها نهائياً!
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => setShowClearDialog(true)}
                className="gap-2 ml-4"
                style={{ backgroundColor: '#DC2626' }}
              >
                <Trash2 className="w-4 h-4" />
                إعادة تعيين النظام
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Dialog تأكيد المسح */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 text-xl">
              <AlertTriangle className="w-6 h-6" />
              تأكيد إعادة تعيين النظام
            </DialogTitle>
            <DialogDescription className="text-base">
              هذه العملية ستحذف <strong>جميع البيانات</strong> من النظام بشكل نهائي ولا يمكن التراجع عنها.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg">
              <p className="text-sm text-red-800 font-bold mb-3">
                ⚠️ سيتم حذف جميع البيانات التالية:
              </p>
              <ul className="text-sm text-red-700 space-y-1.5 list-disc list-inside">
                <li>جميع الزبائن والبطاقات</li>
                <li>جميع العمليات اليومية</li>
                <li>جميع المصروفات والرواتب</li>
                <li>جميع الحسابات البنكية</li>
                <li>جميع معاملات الخزينة</li>
                <li>جميع السجلات والإشعارات</li>
                <li>جميع الموافقات والخدمات</li>
              </ul>
              <p className="text-sm text-red-700 font-medium mt-3">
                ⚠️ سيتم مسح جميع بيانات الموظفين أيضاً — سيتم إنشاء حساب المدير تلقائياً عند أول دخول
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-base font-bold">
                1. أدخل كلمة المرور للتأكيد:
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="text-center font-bold"
                disabled={isClearing}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirm" className="text-base font-bold">
                2. اكتب <span className="text-red-600">"مسح كل شي"</span> بالضبط للتأكيد النهائي:
              </Label>
              <Input
                id="confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="مسح كل شي"
                className="text-center font-bold text-lg"
                disabled={isClearing}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowClearDialog(false);
                setPassword('');
                setConfirmText('');
              }}
              disabled={isClearing}
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearAllData}
              disabled={!password || confirmText !== 'مسح كل شي' || isClearing}
              style={{ backgroundColor: '#DC2626' }}
            >
              {isClearing ? 'جاري المسح...' : 'تأكيد المسح النهائي'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
