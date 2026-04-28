import { useState } from 'react';
import { useEmployees, type Employee, type Permission, JOB_TITLES } from '@/contexts/EmployeesContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Shield, Edit } from 'lucide-react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';

/**
 * صفحة إدارة الصلاحيات
 * تسمح للمدير بتعديل صلاحيات الموظفين
 */

// تصنيف الصلاحيات
const PERMISSIONS_CATEGORIES = {
  customers: {
    name: 'إدارة الزبائن',
    permissions: [
      { id: 'view_customers' as Permission, name: 'عرض الزبائن' },
      { id: 'add_customer' as Permission, name: 'إضافة زبون' },
      { id: 'edit_customer' as Permission, name: 'تعديل زبون' },
      { id: 'delete_customer' as Permission, name: 'حذف زبون' },
      { id: 'print_customer_receipt' as Permission, name: 'طباعة إيصال زبون' },
    ],
  },
  cards: {
    name: 'إدارة البطاقات',
    permissions: [
      { id: 'view_cards' as Permission, name: 'عرض البطاقات' },
      { id: 'add_card' as Permission, name: 'إضافة بطاقة' },
      { id: 'edit_card' as Permission, name: 'تعديل بطاقة' },
      { id: 'delete_card' as Permission, name: 'حذف بطاقة' },
    ],
  },
  operations: {
    name: 'إدارة العمليات',
    permissions: [
      { id: 'view_operations' as Permission, name: 'عرض العمليات' },
      { id: 'add_operation' as Permission, name: 'إضافة عملية' },
      { id: 'edit_operation' as Permission, name: 'تعديل عملية' },
      { id: 'delete_operation' as Permission, name: 'حذف عملية' },
      { id: 'view_operation_profit' as Permission, name: 'عرض الأرباح' },
      { id: 'print_operation_receipt' as Permission, name: 'طباعة إيصال عملية' },
    ],
  },
  financial: {
    name: 'الإدارة المالية',
    permissions: [
      { id: 'view_expenses' as Permission, name: 'عرض المصروفات' },
      { id: 'add_expense' as Permission, name: 'إضافة مصروف' },
      { id: 'edit_expense' as Permission, name: 'تعديل مصروف' },
      { id: 'delete_expense' as Permission, name: 'حذف مصروف' },
      { id: 'view_salaries' as Permission, name: 'عرض الرواتب' },
      { id: 'add_salary' as Permission, name: 'إضافة راتب' },
      { id: 'edit_salary' as Permission, name: 'تعديل راتب' },
      { id: 'delete_salary' as Permission, name: 'حذف راتب' },
      { id: 'view_treasury' as Permission, name: 'عرض الخزينة' },
      { id: 'add_treasury_transaction' as Permission, name: 'إضافة معاملة خزينة' },
      { id: 'edit_treasury_transaction' as Permission, name: 'تعديل معاملة خزينة' },
      { id: 'delete_treasury_transaction' as Permission, name: 'حذف معاملة خزينة' },
      { id: 'view_financial_summary' as Permission, name: 'عرض الملخص المالي' },
    ],
  },
  reports: {
    name: 'التقارير',
    permissions: [
      { id: 'view_reports' as Permission, name: 'عرض التقارير' },
      { id: 'print_reports' as Permission, name: 'طباعة التقارير' },
    ],
  },
  daily_close: {
    name: 'الإقفال اليومي',
    permissions: [
      { id: 'submit_daily_close' as Permission, name: 'تقديم الإقفال اليومي' },
      { id: 'approve_daily_close' as Permission, name: 'الموافقة على الإقفال' },
      { id: 'reject_daily_close' as Permission, name: 'رفض الإقفال' },
    ],
  },
  system: {
    name: 'إدارة النظام',
    permissions: [
      { id: 'manage_users' as Permission, name: 'إدارة المستخدمين' },
      { id: 'manage_permissions' as Permission, name: 'إدارة الصلاحيات' },
      { id: 'edit_user' as Permission, name: 'تعديل مستخدم' },
      { id: 'delete_user' as Permission, name: 'حذف مستخدم' },
      { id: 'view_logs' as Permission, name: 'عرض السجلات' },
      { id: 'view_audit_trail' as Permission, name: 'عرض سجل التدقيق' },
    ],
  },
};

export default function PermissionsManagement() {
  const [, setLocation] = useLocation();
  const { employees, updateEmployee } = useEmployees();
  
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>([]);

  // فتح نافذة تعديل الصلاحيات
  const handleEditClick = (employee: Employee) => {
    setSelectedEmployee(employee);
    setSelectedPermissions([...employee.permissions]);
    setShowEditDialog(true);
  };

  // تبديل صلاحية
  const togglePermission = (permission: Permission) => {
    if (selectedPermissions.includes(permission)) {
      setSelectedPermissions(selectedPermissions.filter(p => p !== permission));
    } else {
      setSelectedPermissions([...selectedPermissions, permission]);
    }
  };

  // حفظ الصلاحيات
  const handleSavePermissions = () => {
    if (!selectedEmployee) return;

    updateEmployee(selectedEmployee.id, {
      permissions: selectedPermissions,
    });

    toast.success('تم تحديث الصلاحيات بنجاح');
    setShowEditDialog(false);
    setSelectedEmployee(null);
    setSelectedPermissions([]);
  };

  // الموظفون غير المدراء
  const nonManagerEmployees = employees.filter(emp => emp.jobTitle !== 'manager');

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F9FBFD' }}>
      {/* Header */}
      <header className="text-white py-6 px-4 border-b-4" style={{ backgroundColor: '#1E2E3D', borderBottomColor: '#C9A34D' }}>
        <div className="container max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/dashboard')}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">إدارة الصلاحيات</h1>
              <p className="text-sm mt-1" style={{ color: '#DCE3EA' }}>
                تعديل صلاحيات الموظفين
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-7xl mx-auto py-8 px-4">
        <Card style={{ backgroundColor: '#FFFFFF' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" style={{ color: '#C9A34D' }} />
              قائمة الموظفين
            </CardTitle>
            <CardDescription>اضغط على زر التعديل لتغيير صلاحيات الموظف</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {nonManagerEmployees.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  لا يوجد موظفون لإدارة صلاحياتهم
                </div>
              ) : (
                nonManagerEmployees.map((employee) => (
                  <div
                    key={employee.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold" style={{ color: '#1E2E3D' }}>
                          {employee.fullName}
                        </h3>
                        <Badge variant="outline" style={{ borderColor: '#C9A34D', color: '#C9A34D' }}>
                          {JOB_TITLES[employee.jobTitle].name}
                        </Badge>
                        {employee.status === 'disabled' && (
                          <Badge className="bg-red-100 text-red-800">معطل</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {employee.permissions.length} صلاحية
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditClick(employee)}
                      className="gap-2"
                      style={{ borderColor: '#C9A34D', color: '#C9A34D' }}
                    >
                      <Edit className="w-4 h-4" />
                      تعديل الصلاحيات
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* نافذة تعديل الصلاحيات */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تعديل صلاحيات {selectedEmployee?.fullName}</DialogTitle>
            <DialogDescription>
              اختر الصلاحيات التي تريد منحها للموظف
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            {Object.entries(PERMISSIONS_CATEGORIES).map(([key, category]) => (
              <Card key={key}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{category.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-3">
                    {category.permissions.map((permission) => (
                      <div key={permission.id} className="flex items-center space-x-2 space-x-reverse">
                        <Checkbox
                          id={permission.id}
                          checked={selectedPermissions.includes(permission.id)}
                          onCheckedChange={() => togglePermission(permission.id)}
                        />
                        <Label
                          htmlFor={permission.id}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {permission.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSavePermissions} style={{ backgroundColor: '#C9A34D' }} className="text-white">
              حفظ الصلاحيات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
