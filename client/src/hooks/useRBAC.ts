import { useAuth } from '@/contexts/AuthContext';
import { useEmployees, Permission } from '@/contexts/EmployeesContext';

/**
 * Hook لـ RBAC - التحكم في الوصول بناءً على الصلاحيات
 * RBAC Hook - Role-Based Access Control
 */

export interface ColumnVisibility {
  [key: string]: boolean;
}

export const useRBAC = () => {
  const { user } = useAuth();
  const { hasPermission, employees } = useEmployees();

  // الحصول على الموظف الحالي
  const currentEmployee = employees.find(e => e.phone === user?.phone);

  // التحقق من وجود صلاحية معينة
  const checkPermission = (permission: Permission): boolean => {
    if (!currentEmployee) return false;
    return hasPermission(currentEmployee.id, permission);
  };

  // الحصول على الأعمدة المرئية للعمليات
  const getOperationColumns = (): ColumnVisibility => {
    return {
      operationNumber: true,
      dateTime: true,
      operationName: true,
      receivedLYD: true,
      receivedUSD: true,
      percentage: true,
      deliveredLYD: true,
      deliveredUSD: true,
      profit: checkPermission('view_operation_profit'), // حساس
      referencePrice: checkPermission('view_operation_profit'), // حساس
      operationType: true,
      machinePercentage: checkPermission('view_operation_profit'), // حساس
      companyPercentage: checkPermission('view_operation_profit'), // حساس
      totalPercentage: checkPermission('view_operation_profit'), // حساس
      cashOrBank: true,
      bankAccount: true,
      actions: true,
    };
  };

  // الحصول على الأعمدة المرئية للزبائن
  const getCustomerColumns = (): ColumnVisibility => {
    return {
      name: true,
      phone: true,
      status: true,
      documents: true,
      balance: checkPermission('view_operation_profit'), // حساس
      totalOperations: true,
      createdDate: true,
      createdBy: true,
      actions: true,
    };
  };

  // الحصول على الأعمدة المرئية للبطاقات
  const getCardColumns = (): ColumnVisibility => {
    return {
      cardNumber: true,
      cardHolder: true,
      status: true,
      balance: checkPermission('view_operation_profit'), // حساس
      expiryDate: true,
      issueDate: true,
      createdDate: true,
      actions: true,
    };
  };

  // التحقق من إمكانية إجراء عملية معينة
  const canPerformAction = (action: string): boolean => {
    const actionPermissions: Record<string, Permission> = {
      add_customer: 'add_customer',
      edit_customer: 'edit_customer',
      delete_customer: 'delete_customer',
      print_customer_receipt: 'print_customer_receipt',
      add_operation: 'add_operation',
      edit_operation: 'edit_operation',
      delete_operation: 'delete_operation',
      print_operation_receipt: 'print_operation_receipt',
      submit_daily_close: 'submit_daily_close',
      approve_daily_close: 'approve_daily_close',
      reject_daily_close: 'reject_daily_close',
      manage_users: 'manage_users',
      manage_permissions: 'manage_permissions',
      view_logs: 'view_logs',
      print_reports: 'print_reports',
    };

    const permission = actionPermissions[action];
    return permission ? checkPermission(permission) : false;
  };

  // الحصول على الرسالة عند عدم وجود صلاحية
  const getAccessDeniedMessage = (): string => {
    return 'ليس لديك صلاحية للوصول إلى هذا المحتوى';
  };

  return {
    checkPermission,
    getOperationColumns,
    getCustomerColumns,
    getCardColumns,
    canPerformAction,
    getAccessDeniedMessage,
    currentEmployee,
  };
};
