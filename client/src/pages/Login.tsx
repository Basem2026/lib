import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Lock } from 'lucide-react';

/**
 * صفحة تسجيل الدخول - نظام محلي
 * - رقم الهاتف + كلمة المرور
 * - التحقق من بيانات الموظفين عبر localStorage
 */
export default function Login() {
  const [, setLocation] = useLocation();
  const { refreshUser } = useAuth();
  const { requestPushPermission } = useNotifications();
  
  const [phone, setPhone] = useState('0920563695');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phone.trim()) {
      toast.error('الرجاء إدخال رقم الهاتف');
      return;
    }
    
    if (!password.trim()) {
      toast.error('الرجاء إدخال كلمة المرور');
      return;
    }

    setIsLoading(true);

    try {
      // قراءة الموظفين من localStorage
      const employeesData = localStorage.getItem('employees');
      const employees = employeesData ? JSON.parse(employeesData) : [];

      // البحث عن الموظف
      const employee = employees.find((emp: any) => emp.phone === phone);

      if (!employee) {
        toast.error('رقم الهاتف غير مسجل');
        setIsLoading(false);
        return;
      }

      // التحقق من كلمة المرور (بسيط بدون تشفير)
      const storedPassword = employee.password || employee.passwordHash || '';
      if (storedPassword !== password) {
        toast.error('كلمة المرور غير صحيحة');
        setIsLoading(false);
        return;
      }

      // التحقق من حالة الموظف
      if (employee.status === 'blocked') {
        // حفظ بيانات المستخدم لعرضها في صفحة الحظر
        localStorage.setItem('currentUser', JSON.stringify(employee));
        refreshUser();
        toast.error('حسابك محظور من قبل الإدارة. يرجى مراجعة الإدارة لمعرفة السبب', {
          duration: 5000,
          style: { background: '#DC2626', color: 'white' }
        });
        setTimeout(() => {
          setLocation('/blocked');
        }, 1000);
        setIsLoading(false);
        return;
      }
      
      if (employee.status === 'disabled') {
        toast.error('حسابك معطل مؤقتاً. يرجى التواصل مع المدير لإعادة التفعيل', {
          duration: 5000,
          style: { background: '#F59E0B', color: 'white' }
        });
        setIsLoading(false);
        return;
      }
      
      if (employee.status !== 'active') {
        toast.error('الحساب غير نشط. يرجى التواصل مع المدير');
        setIsLoading(false);
        return;
      }

      // حفظ بيانات المستخدم الحالي
      localStorage.setItem('currentUser', JSON.stringify(employee));
      
      // تحديث AuthContext
      refreshUser();

      // تسجيل Push subscription لاستقبال الإشعارات حتى لو الموقع مغلق
      localStorage.setItem('pushEmployeeId', employee.id);
      requestPushPermission(employee.id).catch(() => {});
      
      toast.success(`مرحباً ${employee.fullName}!`);
      
      // الانتقال إلى لوحة التحكم
      setTimeout(() => {
        setLocation('/dashboard');
      }, 500);

    } catch {
      toast.error('حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F9FBFD' }}>
      <Card className="w-full max-w-md shadow-xl border-t-4" style={{ borderTopColor: '#C9A34D' }}>
        <CardHeader className="text-center space-y-4" style={{ backgroundColor: '#1E2E3D', color: '#FFFFFF' }}>
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#4A90E2' }}>
              <Lock className="w-8 h-8" />
            </div>
          </div>
          <CardTitle className="text-2xl">تسجيل الدخول</CardTitle>
          <CardDescription style={{ color: '#DCE3EA' }}>
            شركة ليبيا للخدمات المالية
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">رقم الهاتف</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="0920563695"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full text-white"
              style={{ backgroundColor: '#4A90E2' }}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  جاري تسجيل الدخول...
                </>
              ) : (
                'تسجيل الدخول'
              )}
            </Button>

            <Button 
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => toast.info('يرجى التواصل مع المدير لإعادة تعيين كلمة المرور')}
            >
              نسيت كلمة المرور؟
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t text-center text-sm" style={{ color: '#6E7C87' }}>
            <p>نظام إدارة الخدمات المالية</p>
            <p className="mt-2">📞 0920563695 | 📍 صبراته - ليبيا</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
