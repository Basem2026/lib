import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { nanoid } from 'nanoid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Users, UserCheck, UserX } from 'lucide-react';

import type { JobTitle } from '@/contexts/EmployeesContext';

const JOB_TITLES: Record<JobTitle, { id: JobTitle; name: string }> = {
  manager: { id: 'manager', name: 'مدير' },
  deputy_manager: { id: 'deputy_manager', name: 'مدير مساعد' },
  supervisor: { id: 'supervisor', name: 'مشرف' },
  accountant: { id: 'accountant', name: 'محاسب' },
  data_entry: { id: 'data_entry', name: 'موظف إدخال' },
  operations: { id: 'operations', name: 'موظف عمليات' },
};

export default function EmployeesPage() {
  const { data: employees = [], isLoading, refetch } = trpc.employees.getAll.useQuery();
  const createEmployee = trpc.employees.create.useMutation();
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    jobTitle: 'data_entry' as JobTitle,
    passwordHash: '',
    salary: '',
    notes: '',
  });

  // إحصائيات
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(e => e.status === 'active').length;
  const disabledEmployees = employees.filter(e => e.status === 'disabled').length;

  // توليد رمز موظف
  const generateEmployeeCode = (jobTitle: JobTitle): string => {
    const prefix = jobTitle === 'manager' ? 'LY-MGR' :
                   jobTitle === 'deputy_manager' ? 'LY-DM' :
                   jobTitle === 'supervisor' ? 'LY-SUP' :
                   jobTitle === 'accountant' ? 'LY-ACC' :
                   jobTitle === 'data_entry' ? 'LY-IN' :
                   'LY-OPS';
    
    const existingCodes = employees
      .filter(e => e.employeeCode.startsWith(prefix))
      .map(e => parseInt(e.employeeCode.split('-').pop() || '0'));
    
    const nextNumber = existingCodes.length > 0 ? Math.max(...existingCodes) + 1 : 1;
    return `${prefix}-${String(nextNumber).padStart(5, '0')}`;
  };

  // إضافة موظف
  const handleAddEmployee = async () => {
    
    if (!formData.fullName || !formData.phone || !formData.passwordHash) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    const employeeCode = generateEmployeeCode(formData.jobTitle);
    const employeeId = nanoid();
    
    try {
      await createEmployee.mutateAsync({
        id: employeeId,
        employeeCode,
        fullName: formData.fullName,
        phone: formData.phone,
        jobTitle: formData.jobTitle,
        passwordHash: formData.passwordHash,
        status: 'active',
        permissions: [],
        createdBy: 'system',
        salary: formData.salary ? parseFloat(formData.salary) : undefined,
        notes: formData.notes || undefined,
      });
      
      await refetch();
    
      toast.success('تم إضافة الموظف بنجاح');
    } catch {
      toast.error('فشل في إضافة الموظف');
      return;
    }
    setShowAddDialog(false);
    setFormData({
      fullName: '',
      phone: '',
      jobTitle: 'data_entry',
      passwordHash: '',
      salary: '',
      notes: '',
    });
  };

  // تبديل حالة موظف
  const handleToggleStatus = async (employeeCode: string) => {
    toast.info('هذه الميزة قيد التطوير');
  };

  // حذف موظف
  const handleDeleteEmployee = async (employeeCode: string) => {
    toast.info('هذه الميزة قيد التطوير');
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F9FBFD' }}>
      {/* Header */}
      <header className="text-white py-8 px-4 border-b-4" style={{ backgroundColor: '#1E2E3D', borderBottomColor: '#C9A34D' }}>
        <div className="container max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold">إدارة الموظفين</h1>
          <p className="mt-2" style={{ color: '#DCE3EA' }}>إدارة الموظفين والصلاحيات</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-6xl mx-auto py-8 px-4">
        {/* إحصائيات */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card style={{ borderTopColor: '#C9A34D', borderTopWidth: '4px' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ color: '#1E2E3D' }}>
                <Users className="w-5 h-5" />
                إجمالي الموظفين
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold" style={{ color: '#1E2E3D' }}>{totalEmployees}</p>
            </CardContent>
          </Card>

          <Card style={{ borderTopColor: '#10B981', borderTopWidth: '4px' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ color: '#10B981' }}>
                <UserCheck className="w-5 h-5" />
                الموظفون النشطون
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold" style={{ color: '#10B981' }}>{activeEmployees}</p>
            </CardContent>
          </Card>

          <Card style={{ borderTopColor: '#EF4444', borderTopWidth: '4px' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ color: '#EF4444' }}>
                <UserX className="w-5 h-5" />
                الموظفون المعطلون
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold" style={{ color: '#EF4444' }}>{disabledEmployees}</p>
            </CardContent>
          </Card>
        </div>

        {/* أزرار الإضافة */}
        <div className="flex gap-4 mb-6">
          <Button 
            onClick={() => setShowAddDialog(true)}
            style={{ backgroundColor: '#C9A34D' }}
            className="text-white"
          >
            إضافة موظف
          </Button>
        </div>

        {/* جدول الموظفين */}
        <Card>
          <CardHeader>
            <CardTitle style={{ color: '#1E2E3D' }}>قائمة الموظفين</CardTitle>
            <p className="text-sm mt-2" style={{ color: '#6E7C87' }}>جميع الموظفين المسجلين في النظام</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: '#F1F4F8' }}>
                    <th className="text-right p-3" style={{ color: '#1E2E3D' }}>رقم الموظف</th>
                    <th className="text-right p-3" style={{ color: '#1E2E3D' }}>الاسم الكامل</th>
                    <th className="text-right p-3" style={{ color: '#1E2E3D' }}>رقم الهاتف</th>
                    <th className="text-right p-3" style={{ color: '#1E2E3D' }}>الدور الوظيفي</th>
                    <th className="text-right p-3" style={{ color: '#1E2E3D' }}>الحالة</th>
                    <th className="text-right p-3" style={{ color: '#1E2E3D' }}>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => (
                    <tr key={employee.employeeCode} className="border-b">
                      <td className="p-3" style={{ color: '#6E7C87' }}>{employee.employeeCode}</td>
                      <td className="p-3" style={{ color: '#1E2E3D' }}>{employee.fullName}</td>
                      <td className="p-3" style={{ color: '#6E7C87' }}>{employee.phone}</td>
                      <td className="p-3" style={{ color: '#6E7C87' }}>
                        <span className="px-3 py-1 rounded-full text-sm" style={{ backgroundColor: '#F1F4F8', color: '#1E2E3D' }}>
                          {JOB_TITLES[employee.jobTitle as JobTitle].name}
                        </span>
                      </td>
                      <td className="p-3">
                        <span 
                          className="px-3 py-1 rounded-full text-sm text-white"
                          style={{ backgroundColor: employee.status === 'active' ? '#10B981' : '#EF4444' }}
                        >
                          {employee.status === 'active' ? 'نشط' : 'معطل'}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleStatus(employee.employeeCode)}
                          >
                            {employee.status === 'active' ? 'تعطيل' : 'تفعيل'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteEmployee(employee.employeeCode)}
                            style={{ color: '#EF4444', borderColor: '#EF4444' }}
                          >
                            حذف
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* نافذة إضافة موظف - Modal بسيط */}
      {showAddDialog && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setShowAddDialog(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6">
              <h2 className="text-2xl font-bold" style={{ color: '#1E2E3D' }}>
                إضافة موظف جديد
              </h2>
              <p className="text-sm mt-2" style={{ color: '#6E7C87' }}>
                إدخل بيانات الموظف الجديد
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="fullName">الاسم الكامل *</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="محمد مصطفى زهمول"
                />
              </div>

              <div>
                <Label htmlFor="phone">رقم الهاتف *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0920563695"
                />
              </div>

              <div>
                <Label htmlFor="jobTitle">الوظيفة *</Label>
                <select
                  id="jobTitle"
                  value={formData.jobTitle}
                  onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value as JobTitle })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.values(JOB_TITLES).map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="password">كلمة المرور *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.passwordHash}
                  onChange={(e) => setFormData({ ...formData, passwordHash: e.target.value })}
                  placeholder="••••••••"
                />
              </div>

              <div>
                <Label htmlFor="salary">الراتب (اختياري)</Label>
                <Input
                  id="salary"
                  type="number"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                  placeholder="2500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowAddDialog(false)}
                className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleAddEmployee}
                style={{ backgroundColor: '#C9A34D' }}
                className="px-4 py-2 rounded text-white font-medium hover:opacity-90"
              >
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
