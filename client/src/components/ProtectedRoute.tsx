import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployees, type Permission } from '@/contexts/EmployeesContext';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermission?: Permission;
  requiredPermissions?: Permission[];
  requireAll?: boolean; // true = يحتاج جميع الصلاحيات، false = يحتاج صلاحية واحدة على الأقل
}

/**
 * مكون لحماية الصفحات بناءً على الصلاحيات
 * يتحقق من صلاحيات المستخدم الحالي قبل عرض المحتوى
 */
export default function ProtectedRoute({
  children,
  requiredPermission,
  requiredPermissions,
  requireAll = false,
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const { employees } = useEmployees();
  const [, setLocation] = useLocation();

  // إذا كان التحميل جارياً
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F9FBFD' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#C9A34D' }}></div>
          <p style={{ color: '#6E7C87' }}>جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // إذا لم يكن المستخدم مسجلاً دخول
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F9FBFD' }}>
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-red-600" />
              يجب تسجيل الدخول
            </CardTitle>
            <CardDescription>
              يجب عليك تسجيل الدخول للوصول إلى هذه الصفحة
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setLocation('/login')}
              className="w-full text-white"
              style={{ backgroundColor: '#C9A34D' }}
            >
              تسجيل الدخول
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // البحث عن الموظف الحالي
  const currentEmployee = employees.find(emp => emp.phone === user.phone);

  // إذا لم يتم العثور على الموظف
  if (!currentEmployee) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F9FBFD' }}>
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-red-600" />
              خطأ في الحساب
            </CardTitle>
            <CardDescription>
              لم يتم العثور على بيانات الموظف. يرجى التواصل مع المدير.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setLocation('/dashboard')}
              className="w-full"
              variant="outline"
            >
              <ArrowLeft className="w-4 h-4 ml-2" />
              العودة للوحة التحكم
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // إذا كان الموظف معطلاً
  if (currentEmployee.status === 'disabled') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F9FBFD' }}>
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-red-600" />
              الحساب معطل
            </CardTitle>
            <CardDescription>
              تم تعطيل حسابك. يرجى التواصل مع المدير.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setLocation('/login')}
              className="w-full"
              variant="outline"
            >
              <ArrowLeft className="w-4 h-4 ml-2" />
              تسجيل الخروج
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // التحقق من الصلاحيات
  const userPermissions = currentEmployee.permissions || [];

  // إذا كان المدير، السماح بكل شيء
  if (currentEmployee.jobTitle === 'manager') {
    return <>{children}</>;
  }

  // إذا لم يتم تحديد صلاحيات مطلوبة، السماح بالدخول
  if (!requiredPermission && (!requiredPermissions || requiredPermissions.length === 0)) {
    return <>{children}</>;
  }

  // التحقق من الصلاحية الواحدة
  if (requiredPermission && !Array.isArray(userPermissions)) {
    // إذا لم يكن permissions array، اعتبره لا يملك صلاحيات
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F9FBFD' }}>
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-red-600" />
              ليس لديك صلاحية
            </CardTitle>
            <CardDescription>
              ليس لديك الصلاحية للوصول إلى هذه الصفحة. يرجى التواصل مع المدير لطلب الصلاحية.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setLocation('/dashboard')}
              className="w-full"
              variant="outline"
            >
              <ArrowLeft className="w-4 h-4 ml-2" />
              العودة للوحة التحكم
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (requiredPermission && !userPermissions.includes(requiredPermission)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F9FBFD' }}>
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-red-600" />
              ليس لديك صلاحية
            </CardTitle>
            <CardDescription>
              ليس لديك الصلاحية للوصول إلى هذه الصفحة. يرجى التواصل مع المدير لطلب الصلاحية.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setLocation('/dashboard')}
              className="w-full"
              variant="outline"
            >
              <ArrowLeft className="w-4 h-4 ml-2" />
              العودة للوحة التحكم
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // التحقق من الصلاحيات المتعددة
  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasPermission = requireAll
      ? requiredPermissions.every(perm => userPermissions.includes(perm))
      : requiredPermissions.some(perm => userPermissions.includes(perm));

    if (!hasPermission) {
      return (
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F9FBFD' }}>
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="w-6 h-6 text-red-600" />
                ليس لديك صلاحية
              </CardTitle>
              <CardDescription>
                ليس لديك الصلاحية للوصول إلى هذه الصفحة. يرجى التواصل مع المدير لطلب الصلاحية.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => setLocation('/dashboard')}
                className="w-full"
                variant="outline"
              >
                <ArrowLeft className="w-4 h-4 ml-2" />
                العودة للوحة التحكم
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  // إذا كان لديه الصلاحية، عرض المحتوى
  return <>{children}</>;
}
