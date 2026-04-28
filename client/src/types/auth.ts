// أنواع الأدوار (Roles)
export type Role = 'admin' | 'manager' | 'supervisor' | 'cashier' | 'data_entry' | 'delegate';

// أنواع الصلاحيات (Permissions)
export type Permission = 
  | 'view_treasury'
  | 'edit_treasury'
  | 'view_customers'
  | 'add_customer'
  | 'edit_customer'
  | 'view_operations'
  | 'add_operation'
  | 'edit_operation'
  | 'view_expenses'
  | 'add_expense'
  | 'view_salaries'
  | 'add_salary'
  | 'view_logs'
  | 'view_reports'
  | 'manage_users'
  | 'manage_permissions'
  | 'close_day'
  | 'print_receipt'
  | 'change_status'
  | 'view_profits'
  | 'view_dashboard'
  | 'view_cards'
  | 'view_data_entry'
  | 'view_office_staff'
  | 'view_notifications';

// بيانات المستخدم
export interface User {
  id: string;
  phone: string;
  name: string;
  role: Role;
  isDelegate: boolean;
  delegateNumber?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// بيانات الجلسة
export interface AuthSession {
  user: User;
  token: string;
  expiresAt: Date;
}

// تعريف الصلاحيات حسب الدور
export const rolePermissions: Record<Role, Permission[]> = {
  admin: [
    'view_treasury',
    'edit_treasury',
    'view_customers',
    'add_customer',
    'edit_customer',
    'view_operations',
    'add_operation',
    'edit_operation',
    'view_expenses',
    'add_expense',
    'view_salaries',
    'add_salary',
    'view_logs',
    'view_reports',
    'manage_users',
    'manage_permissions',
    'close_day',
    'print_receipt',
    'change_status',
    'view_profits',
    'view_dashboard',
    'view_cards',
    'view_data_entry',
    'view_office_staff',
    'view_notifications',
  ],
  manager: [
    'view_treasury',
    'edit_treasury',
    'view_customers',
    'add_customer',
    'edit_customer',
    'view_operations',
    'add_operation',
    'edit_operation',
    'view_expenses',
    'add_expense',
    'view_salaries',
    'add_salary',
    'view_logs',
    'view_reports',
    'close_day',
    'print_receipt',
    'change_status',
    'view_profits',
    'view_dashboard',
    'view_cards',
    'view_office_staff',
    'view_notifications',
  ],
  supervisor: [
    'view_customers',
    'view_operations',
    'add_operation',
    'view_reports',
    'print_receipt',
    'change_status',
  ],
  cashier: [
    'view_customers',
    'add_customer',
    'view_operations',
    'add_operation',
    'print_receipt',
    'change_status',
  ],
  data_entry: [
    'view_customers',
    'add_customer',
    'print_receipt',
    'view_data_entry',
  ],
  delegate: [
    'view_customers',
    'add_customer',
    'print_receipt',
  ],
};

// أعمدة الجداول المرئية حسب الدور
export const visibleColumns: Record<Role, string[]> = {
  admin: ['all'],
  manager: ['all'],
  supervisor: ['transactionId', 'name', 'date', 'status', 'documents'],
  cashier: ['transactionId', 'name', 'date', 'status', 'documents'],
  data_entry: ['transactionId', 'name', 'date', 'status'],
  delegate: ['transactionId', 'name', 'date', 'status'],
};
