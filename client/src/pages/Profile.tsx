import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployees } from '@/contexts/EmployeesContext';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowRight, User, Phone, Lock, Save } from 'lucide-react';

/**
 * صفحة الملف الشخصي
 * - يسمح للموظف بتعديل بياناته الشخصية (الاسم، رقم الهاتف، كلمة المرور)
 * - التعديلات تُحفظ في localStorage وقاعدة البيانات
 */
export default function Profile() {
  const [, navigate] = useLocation();
  const { user, refreshUser } = useAuth();
  const { employees, updateEmployee } = useEmployees();
  
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // البحث عن بيانات الموظف الحالي
  const currentEmployee = employees.find(emp => emp.phone === user?.phone);

  useEffect(() => {
    if (currentEmployee) {
      setFullName(currentEmployee.fullName);
      setPhone(currentEmployee.phone);
    }
  }, [currentEmployee]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentEmployee) {
      toast.error('لم يتم العثور على بيانات الموظف');
      return;
    }

    // التحقق من البيانات
    if (!fullName.trim()) {
      toast.error('الرجاء إدخال الاسم الكامل');
      return;
    }

    if (!phone.trim()) {
      toast.error('الرجاء إدخال رقم الهاتف');
      return;
    }

    // إذا أراد تغيير كلمة المرور
    if (newPassword || confirmPassword) {
      if (!currentPassword) {
        toast.error('الرجاء إدخال كلمة المرور الحالية');
        return;
      }

      if (newPassword !== confirmPassword) {
        toast.error('كلمة المرور الجديدة غير متطابقة');
        return;
      }

      if (newPassword.length < 8) {
        toast.error('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
        return;
      }

      // التحقق من كلمة المرور الحالية من Context
      if (currentEmployee.passwordHash !== currentPassword) {
        toast.error('كلمة المرور الحالية غير صحيحة');
        return;
      }
    }

    setIsLoading(true);

    try {
      // تحديث البيانات
      const updatedEmployee = {
        ...currentEmployee,
        fullName: fullName.trim(),
        phone: phone.trim(),
        passwordHash: newPassword ? newPassword : currentEmployee.passwordHash,
        updatedAt: new Date(),
        updatedBy: currentEmployee.id,
      };

      // حفظ في Context (قاعدة البيانات)
      await updateEmployee(currentEmployee.id, {
        fullName: fullName.trim(),
        phone: phone.trim(),
        passwordHash: newPassword ? newPassword : currentEmployee.passwordHash,
        updatedBy: currentEmployee.id,
      });

      // تحديث بيانات المستخدم في AuthContext
      const updatedUser = {
        ...user!,
        fullName: fullName.trim(),
        phone: phone.trim(),
      };
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      refreshUser();

      toast.success('تم تحديث البيانات بنجاح');

      // مسح حقول كلمة المرور
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      toast.error('حدث خطأ أثناء تحديث البيانات');
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentEmployee) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#F9FBFD' }}>
        <div className="container max-w-4xl mx-auto py-8 px-4">
          <div className="text-center">
            <p className="text-lg text-gray-600">جاري التحميل...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F9FBFD' }}>
      {/* Header */}
      <header className="text-white py-6 px-4 shadow-md" style={{ backgroundColor: '#1E2E3D' }}>
        <div className="container max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard')}
              className="text-white hover:bg-white/10"
            >
              <ArrowRight className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold">الملف الشخصي</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Card className="shadow-lg border-t-4" style={{ borderTopColor: '#C9A34D' }}>
          <CardHeader style={{ backgroundColor: '#1E2E3D', color: '#FFFFFF' }}>
            <CardTitle className="text-xl">تعديل البيانات الشخصية</CardTitle>
            <CardDescription style={{ color: '#DCE3EA' }}>
              يمكنك تعديل اسمك ورقم هاتفك وكلمة المرور
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              {/* معلومات الحساب */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: '#1E2E3D' }}>
                  <User className="w-5 h-5" />
                  معلومات الحساب
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="fullName">الاسم الكامل</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="أدخل الاسم الكامل"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    رقم الهاتف
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="0920563695"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* تغيير كلمة المرور */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: '#1E2E3D' }}>
                  <Lock className="w-5 h-5" />
                  تغيير كلمة المرور (اختياري)
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="currentPassword">كلمة المرور الحالية</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">تأكيد كلمة المرور الجديدة</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* أزرار الحفظ */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  className="flex-1 text-white"
                  style={{ backgroundColor: '#4A90E2' }}
                  disabled={isLoading}
                >
                  <Save className="w-4 h-4 ml-2" />
                  {isLoading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                  disabled={isLoading}
                >
                  إلغاء
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* معلومات إضافية */}
        <Card className="mt-6 shadow-md">
          <CardContent className="pt-6">
            <div className="space-y-2 text-sm" style={{ color: '#6E7C87' }}>
              <p><strong>الوظيفة:</strong> {currentEmployee.jobTitle === 'manager' ? 'مدير' : currentEmployee.jobTitle === 'deputy_manager' ? 'نائب المدير' : currentEmployee.jobTitle === 'accountant' ? 'محاسب' : currentEmployee.jobTitle === 'supervisor' ? 'مشرف' : currentEmployee.jobTitle === 'operations' ? 'موظف عمليات' : 'موظف إدخال بيانات'}</p>
              <p><strong>كود الموظف:</strong> {currentEmployee.employeeCode}</p>
              <p><strong>تاريخ الإنشاء:</strong> {new Date(currentEmployee.createdAt).toLocaleDateString('ar-LY')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
