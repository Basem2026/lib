'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCustomers } from '@/contexts/CustomersContext';
import { useOperations } from '@/contexts/OperationsContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Plus, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLocation } from 'wouter';
import { formatDate } from '@/lib/utils';

type UserRole = 'office_staff' | 'office_manager' | 'admin' | 'operations' | 'supervisor' | 'user';

interface Permission {
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

const PERMISSIONS: Record<UserRole, { customers: Permission; operations: Permission }> = {
  office_staff: {
    customers: { canView: true, canAdd: true, canEdit: false, canDelete: false },
    operations: { canView: true, canAdd: true, canEdit: false, canDelete: false },
  },
  office_manager: {
    customers: { canView: true, canAdd: true, canEdit: true, canDelete: true },
    operations: { canView: true, canAdd: true, canEdit: true, canDelete: true },
  },
  operations: {
    customers: { canView: true, canAdd: true, canEdit: false, canDelete: false },
    operations: { canView: true, canAdd: true, canEdit: false, canDelete: false },
  },
  supervisor: {
    customers: { canView: true, canAdd: true, canEdit: true, canDelete: true },
    operations: { canView: true, canAdd: true, canEdit: true, canDelete: true },
  },
  admin: {
    customers: { canView: true, canAdd: true, canEdit: true, canDelete: true },
    operations: { canView: true, canAdd: true, canEdit: true, canDelete: true },
  },
  user: {
    customers: { canView: false, canAdd: false, canEdit: false, canDelete: false },
    operations: { canView: false, canAdd: false, canEdit: false, canDelete: false },
  },
};

export default function OfficeStaff() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { customers, addCustomer, updateCustomer, removeCustomer } = useCustomers();
  const { operations, addOperation } = useOperations();

  // All state hooks must be declared before any conditional returns
  const [activeTab, setActiveTab] = useState('customers');
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [showOperationDialog, setShowOperationDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [editingOperation, setEditingOperation] = useState<any>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  // Form states
  const [customerForm, setCustomerForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });

  const [operationForm, setOperationForm] = useState({
    customerId: '',
    type: 'deposit',
    amount: '',
    description: '',
  });

  // Check if user is logged in
  useEffect(() => {
    if (!isLoading && !user) {
      setLocation('/login');
    }
  }, [user, isLoading, setLocation]);

  // If loading or not logged in, show loading
  if (isLoading || !user) {
    return null;
  }

  // Get user role based on jobTitle - default to 'user' if not found
  const jobTitleToRole: Record<string, UserRole> = {
    'office_staff': 'office_staff',
    'office_manager': 'office_manager',
    'manager': 'office_manager',
    'operations': 'operations',
    'supervisor': 'supervisor',
    'admin': 'admin',
  };
  const userRole: UserRole = jobTitleToRole[user?.jobTitle || ''] || 'user';
  const permissions = PERMISSIONS[userRole];

  // Check if user has access to this page
  if (!permissions.customers.canView && !permissions.operations.canView) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert className="max-w-md border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            ليس لديك صلاحية للوصول إلى هذه الصفحة
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Handle customer operations
  const handleAddCustomer = () => {
    if (!customerForm.name || !customerForm.phone) {
      alert('الرجاء ملء الحقول المطلوبة');
      return;
    }

    if (editingCustomer) {
      updateCustomer(editingCustomer.id, customerForm);
      setEditingCustomer(null);
    } else {
      const customerId = Date.now().toString();
      const newCustomer = {
        ...customerForm,
        id: customerId,
        transactionNumber: `TRX-${customerId.slice(-6).padStart(6, '0')}`,
        idType: 'national_id' as const,
        registrationDate: new Date(),
        operationStatus: 'purchased' as const,
        documentStatus: 'cannot_deliver' as const,
        totalBalance: 0,
        totalTransactions: 0,
        createdBy: user?.id || 'unknown',
        updatedAt: new Date(),
      };
      addCustomer(newCustomer);
    }

    setCustomerForm({ name: '', phone: '', email: '', address: '', notes: '' });
    setShowCustomerDialog(false);
  };

  const handleEditCustomer = (customer: any) => {
    if (!permissions.customers.canEdit) {
      alert('ليس لديك صلاحية لتعديل العملاء');
      return;
    }
    setEditingCustomer(customer);
    setCustomerForm(customer);
    setShowCustomerDialog(true);
  };

  const handleDeleteCustomer = (id: string) => {
    if (!permissions.customers.canDelete) {
      alert('ليس لديك صلاحية لحذف العملاء');
      return;
    }
    if (confirm('هل أنت متأكد من حذف هذا العميل؟')) {
      removeCustomer(id);
    }
  };

  // Handle operation operations
  const handleAddOperation = () => {
    if (!operationForm.customerId || !operationForm.amount) {
      alert('الرجاء ملء الحقول المطلوبة');
      return;
    }

    const newOp = {
      id: editingOperation?.id || Date.now().toString(),
      customerId: operationForm.customerId,
      cardId: undefined,
      type: operationForm.type as 'deposit' | 'withdrawal' | 'transfer' | 'payment',
      amount: parseFloat(operationForm.amount),
      currency: 'LYD' as const,
      description: operationForm.description,
      status: 'completed' as const,
      timestamp: new Date(),
      date: new Date(),
      processedBy: user?.id || 'unknown',
      updatedAt: new Date(),
    };

    if (editingOperation) {
      // Note: updateOperation is not available in OperationsContext, so we'll just add the new one
      // In a real app, you would implement updateOperation
      setEditingOperation(null);
    } else {
      addOperation(newOp);
    }

    setOperationForm({ customerId: '', type: 'deposit', amount: '', description: '' });
    setShowOperationDialog(false);
  };

  const handleEditOperation = (operation: any) => {
    if (!permissions.operations.canEdit) {
      alert('ليس لديك صلاحية لتعديل العمليات');
      return;
    }
    setEditingOperation(operation);
    setOperationForm(operation);
    setShowOperationDialog(true);
  };

  const handleDeleteOperation = (id: string) => {
    if (!permissions.operations.canDelete) {
      alert('ليس لديك صلاحية لحذف العمليات');
      return;
    }
    if (confirm('هل أنت متأكد من حذف هذه العملية؟')) {
      // Note: deleteOperation is not available in OperationsContext
      // In a real app, you would implement this
      alert('حذف العمليات غير مفعل حالياً');
    }
  };

  // Get customer name by ID
  const getCustomerName = (customerId: string) => {
    const customer = customers.find((c: any) => c.id === customerId);
    return customer?.name || 'عميل غير معروف';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">موظف المكتب</h1>
          <p className="text-gray-600">
            الدور: <span className="font-semibold">
              {userRole === 'office_staff' ? 'موظف مكتب' : 'مشرف مكتب'}
            </span>
          </p>
        </div>

        {/* Permissions Info */}
        <Card className="mb-6 p-4 bg-blue-50 border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">الصلاحيات المتاحة:</h3>
          <div className="grid grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <strong>العملاء:</strong>
              <ul className="mt-1 space-y-1">
                {permissions.customers.canView && <li>✓ عرض</li>}
                {permissions.customers.canAdd && <li>✓ إضافة</li>}
                {permissions.customers.canEdit && <li>✓ تعديل</li>}
                {permissions.customers.canDelete && <li>✓ حذف</li>}
              </ul>
            </div>
            <div>
              <strong>العمليات:</strong>
              <ul className="mt-1 space-y-1">
                {permissions.operations.canView && <li>✓ عرض</li>}
                {permissions.operations.canAdd && <li>✓ إضافة</li>}
                {permissions.operations.canEdit && <li>✓ تعديل</li>}
                {permissions.operations.canDelete && <li>✓ حذف</li>}
              </ul>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            {permissions.customers.canView && <TabsTrigger value="customers">العملاء</TabsTrigger>}
            {permissions.operations.canView && <TabsTrigger value="operations">العمليات</TabsTrigger>}
          </TabsList>

          {/* Customers Tab */}
          {permissions.customers.canView && (
            <TabsContent value="customers" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">قائمة العملاء</h2>
                {permissions.customers.canAdd && (
                  <Button
                    onClick={() => {
                      setEditingCustomer(null);
                      setCustomerForm({ name: '', phone: '', email: '', address: '', notes: '' });
                      setShowCustomerDialog(true);
                    }}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    إضافة عميل
                  </Button>
                )}
              </div>

              {/* Customers Table */}
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">الاسم</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">الهاتف</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">البريد الإلكتروني</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">العنوان</th>
                        {(permissions.customers.canEdit || permissions.customers.canDelete) && (
                          <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">الإجراءات</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {customers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                            لا توجد عملاء
                          </td>
                        </tr>
                      ) : (
                        customers.map((customer: any) => (
                          <tr key={customer.id} className="border-b hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-900">{customer.name}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{customer.phone}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{customer.email || '-'}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{customer.address || '-'}</td>
                            {(permissions.customers.canEdit || permissions.customers.canDelete) && (
                              <td className="px-6 py-4 text-sm">
                                <div className="flex gap-2">
                                  {permissions.customers.canEdit && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleEditCustomer(customer)}
                                      className="gap-1"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                      تعديل
                                    </Button>
                                  )}
                                  {permissions.customers.canDelete && (
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => handleDeleteCustomer(customer.id)}
                                      className="gap-1"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      حذف
                                    </Button>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </TabsContent>
          )}

          {/* Operations Tab */}
          {permissions.operations.canView && (
            <TabsContent value="operations" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">قائمة العمليات</h2>
                {permissions.operations.canAdd && (
                  <Button
                    onClick={() => {
                      setEditingOperation(null);
                      setOperationForm({ customerId: '', type: 'deposit', amount: '', description: '' });
                      setShowOperationDialog(true);
                    }}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    إضافة عملية
                  </Button>
                )}
              </div>

              {/* Operations Table */}
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">العميل</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">النوع</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">المبلغ</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">الوصف</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">التاريخ</th>
                        {(permissions.operations.canEdit || permissions.operations.canDelete) && (
                          <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">الإجراءات</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {operations.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                            لا توجد عمليات
                          </td>
                        </tr>
                      ) : (
                        operations.map((operation: any) => (
                          <tr key={operation.id} className="border-b hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-900">{getCustomerName(operation.customerId)}</td>
                            <td className="px-6 py-4 text-sm">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                operation.type === 'deposit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {operation.type === 'deposit' ? 'إيداع' : 'سحب'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">{operation.amount} د.ل</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{operation.description || '-'}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {formatDate(operation.date)}
                            </td>
                            {(permissions.operations.canEdit || permissions.operations.canDelete) && (
                              <td className="px-6 py-4 text-sm">
                              {/* Operations edit/delete disabled for now */}
                            </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* Customer Dialog */}
        <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCustomer ? 'تعديل عميل' : 'إضافة عميل جديد'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>الاسم *</Label>
                <Input
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                  placeholder="أدخل اسم العميل"
                />
              </div>
              <div>
                <Label>الهاتف *</Label>
                <Input
                  value={customerForm.phone}
                  onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                  placeholder="أدخل رقم الهاتف"
                />
              </div>
              <div>
                <Label>البريد الإلكتروني</Label>
                <Input
                  type="email"
                  value={customerForm.email}
                  onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                  placeholder="أدخل البريد الإلكتروني"
                />
              </div>
              <div>
                <Label>العنوان</Label>
                <Input
                  value={customerForm.address}
                  onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                  placeholder="أدخل العنوان"
                />
              </div>
              <div>
                <Label>ملاحظات</Label>
                <Textarea
                  value={customerForm.notes}
                  onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })}
                  placeholder="أدخل الملاحظات"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowCustomerDialog(false)}>
                  إلغاء
                </Button>
                <Button onClick={handleAddCustomer}>
                  {editingCustomer ? 'تحديث' : 'إضافة'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Operation Dialog */}
        <Dialog open={showOperationDialog} onOpenChange={setShowOperationDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingOperation ? 'تعديل عملية' : 'إضافة عملية جديدة'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>العميل *</Label>
                <Select value={operationForm.customerId} onValueChange={(value) => setOperationForm({ ...operationForm, customerId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر عميلاً" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer: any) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>نوع العملية *</Label>
                <Select value={operationForm.type} onValueChange={(value) => setOperationForm({ ...operationForm, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deposit">إيداع</SelectItem>
                    <SelectItem value="withdrawal">سحب</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>المبلغ *</Label>
                <Input
                  type="number"
                  value={operationForm.amount}
                  onChange={(e) => setOperationForm({ ...operationForm, amount: e.target.value })}
                  placeholder="أدخل المبلغ"
                />
              </div>
              <div>
                <Label>الوصف</Label>
                <Textarea
                  value={operationForm.description}
                  onChange={(e) => setOperationForm({ ...operationForm, description: e.target.value })}
                  placeholder="أدخل وصف العملية"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowOperationDialog(false)}>
                  إلغاء
                </Button>
                <Button onClick={handleAddOperation}>
                  {editingOperation ? 'تحديث' : 'إضافة'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
