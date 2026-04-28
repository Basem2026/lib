import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuth } from './AuthContext';

/**
 * نظام الموظفين والصلاحيات (RBAC)
 * Employees & Permissions Context
 */

// الوظائف المتاحة
export type JobTitle = 'data_entry' | 'operations' | 'supervisor' | 'deputy_manager' | 'accountant' | 'manager';

// الصلاحيات المتاحة
export type Permission = 
  | 'add_customer' | 'view_customers' | 'edit_customer' | 'delete_customer' | 'print_customer_receipt'
  | 'view_cards' | 'add_card' | 'edit_card' | 'delete_card'
  | 'view_operations' | 'add_operation' | 'edit_operation' | 'delete_operation' | 'view_operation_profit' | 'print_operation_receipt'
  | 'view_expenses' | 'add_expense' | 'view_salaries' | 'add_salary'
  | 'view_treasury' | 'view_reports' | 'view_financial_summary'
  | 'submit_daily_close' | 'approve_daily_close' | 'reject_daily_close'
  | 'manage_users' | 'manage_permissions' | 'edit_user' | 'delete_user'
  | 'view_logs' | 'view_audit_trail' | 'view_employee_logs' | 'view_management_logs'
  | 'print_receipts' | 'print_reports'
  | 'view_alerts';

// الموظف
export interface Employee {
  id: string;
  employeeCode: string; // LY-IN-00001
  phone: string;
  fullName: string;
  jobTitle: JobTitle;
  passwordHash: string;
  status: 'active' | 'disabled' | 'blocked';
  permissions: Permission[];
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy?: string;
  salary?: string; // الراتب (اختياري) - decimal from database
  notes?: string; // ملاحظات (اختياري)
  // حسابات العهدة
  custodyAccounts?: {
    cashLYD: number; // كاش بالدينار
    cashUSD: number; // كاش بالدولار
    bankLYD: number; // مصرف بالدينار
    bankUSD: number; // مصرف بالدولار
  };
}

// عملية عهدة
export interface CustodyTransaction {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'deposit' | 'withdraw' | 'transfer'; // إيداع | سحب | تحويل
  accountType: 'cashLYD' | 'cashUSD' | 'bankLYD' | 'bankUSD'; // نوع الحساب
  amount: number; // المبلغ
  toAccountType?: 'cashLYD' | 'cashUSD' | 'bankLYD' | 'bankUSD'; // للتحويل فقط
  exchangeRate?: number; // سعر الصرف (للتحويل بين العملات)
  balanceBefore: number; // الرصيد قبل
  balanceAfter: number; // الرصيد بعد
  notes?: string; // ملاحظات
  createdAt: Date;
  createdBy: string; // من قام بالعملية
}

// سجل التدقيق
export interface AuditLog {
  id: string;
  action: 'create' | 'update' | 'delete' | 'print' | 'close_day' | 'approve_close' | 'reject_close' | 'permission_change';
  entityType: 'customer' | 'card' | 'operation' | 'expense' | 'salary' | 'employee' | 'daily_close';
  entityId: string;
  userId: string;
  userName: string;
  timestamp: Date;
  details: {
    before?: any;
    after?: any;
    reason?: string;
  };
}

// الإغلاق اليومي
export interface DailyClose {
  id: string;
  date: Date;
  status: 'pending' | 'approved' | 'rejected';
  submittedBy: string;
  submittedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  totalOperations: number;
  totalProfit: number;
  totalExpenses: number;
  totalSalaries: number;
  netBalance: number;
}

// بيانات تسليم العهدة
export interface HandoverCustodyData {
  employeeId: string;
  cashLYD?: number; // القيمة بالدينار الكاش
  cashUSD?: number; // القيمة بالدولار بالكاش
  supportedUSDRate?: number; // سعر مدعي للدولار الكاش
  referenceUSDCashSellRate?: number; // سعر مرجعي للدولار للبيع بالكاش
  bankLYD?: number; // القيمة بالمصرف بالدينار
  referenceUSDBankSellRate?: number; // سعر مرجعي لبيع الدولار بالمصرف
  notes?: string; // ملاحظات
}

// معلومات الوظيفة
export interface JobTitleInfo {
  id: JobTitle;
  name: string;
  code: string;
  description: string;
}

// قائمة الوظائف
export const JOB_TITLES: Record<JobTitle, JobTitleInfo> = {
  data_entry: { id: 'data_entry', name: 'موظف إدخال', code: 'IN', description: 'إدخال بيانات الزبائن' },
  operations: { id: 'operations', name: 'موظف العمليات اليومية', code: 'DO', description: 'تسجيل العمليات اليومية' },
  supervisor: { id: 'supervisor', name: 'مشرف مكتب', code: 'SUP', description: 'الإشراف على العمليات' },
  deputy_manager: { id: 'deputy_manager', name: 'نائب مدير', code: 'D', description: 'نائب المدير' },
  accountant: { id: 'accountant', name: 'محاسب', code: 'ACC', description: 'المراجعة المالية' },
  manager: { id: 'manager', name: 'مدير', code: 'MGR', description: 'المدير العام' },
};

// الصلاحيات الافتراضية
export const DEFAULT_PERMISSIONS: Record<JobTitle, Permission[]> = {
  data_entry: ['add_customer', 'print_customer_receipt'],
  operations: ['view_operations', 'add_operation', 'print_operation_receipt'],
  supervisor: ['add_customer', 'view_customers', 'print_customer_receipt', 'view_operations', 'add_operation', 'print_operation_receipt', 'submit_daily_close'],
  deputy_manager: ['add_customer', 'view_customers', 'edit_customer', 'delete_customer', 'print_customer_receipt', 'view_cards', 'add_card', 'view_operations', 'add_operation', 'edit_operation', 'view_operation_profit', 'print_operation_receipt', 'view_expenses', 'add_expense', 'view_salaries', 'add_salary', 'view_treasury', 'view_reports', 'view_financial_summary', 'submit_daily_close', 'view_logs', 'view_audit_trail', 'print_receipts', 'print_reports', 'view_alerts'],
  accountant: ['view_customers', 'view_cards', 'view_operations', 'view_operation_profit', 'view_expenses', 'view_salaries', 'view_treasury', 'view_reports', 'view_financial_summary', 'approve_daily_close', 'reject_daily_close', 'view_logs', 'view_audit_trail', 'print_reports'],
  manager: ['add_customer', 'view_customers', 'edit_customer', 'delete_customer', 'print_customer_receipt', 'view_cards', 'add_card', 'edit_card', 'delete_card', 'view_operations', 'add_operation', 'edit_operation', 'delete_operation', 'view_operation_profit', 'print_operation_receipt', 'view_expenses', 'add_expense', 'view_salaries', 'add_salary', 'view_treasury', 'view_reports', 'view_financial_summary', 'submit_daily_close', 'approve_daily_close', 'reject_daily_close', 'manage_users', 'manage_permissions', 'edit_user', 'delete_user', 'view_logs', 'view_audit_trail', 'print_receipts', 'print_reports', 'view_alerts'],
};

interface EmployeesContextType {
  employees: Employee[];
  auditLogs: AuditLog[];
  dailyCloses: DailyClose[];
  custodyTransactions: CustodyTransaction[]; // سجل عمليات العهدة
  addEmployee: (employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateEmployee: (id: string, updates: Partial<Employee>) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  updatePermissions: (id: string, permissions: Permission[]) => Promise<void>;
  toggleEmployeeStatus: (id: string) => Promise<void>;
  addAuditLog: (log: Omit<AuditLog, 'id' | 'timestamp'>) => Promise<void>;
  submitDailyClose: (close: Omit<DailyClose, 'id'>) => void;
  approveDailyClose: (id: string, approvedBy: string) => void;
  rejectDailyClose: (id: string, rejectionReason: string, rejectedBy: string) => void;
  getEmployeeByPhone: (phone: string) => Employee | undefined;
  hasPermission: (userId: string, permission: Permission) => boolean;
  generateEmployeeCode: (jobTitle: JobTitle) => string;
  // دوال إدارة العهدة
  depositCustody: (employeeId: string, accountType: 'cashLYD' | 'cashUSD' | 'bankLYD' | 'bankUSD', amount: number, notes: string, createdBy: string) => void;
  withdrawCustody: (employeeId: string, accountType: 'cashLYD' | 'cashUSD' | 'bankLYD' | 'bankUSD', amount: number, notes: string, createdBy: string) => void;
  transferCustody: (employeeId: string, fromAccount: 'cashLYD' | 'cashUSD' | 'bankLYD' | 'bankUSD', toAccount: 'cashLYD' | 'cashUSD' | 'bankLYD' | 'bankUSD', amount: number, exchangeRate: number | undefined, notes: string, createdBy: string) => void;
  handoverCustody: (data: HandoverCustodyData, createdBy: string) => Promise<{ success: boolean; error?: string }>;
  getCustodyTransactionsByEmployee: (employeeId: string) => CustodyTransaction[];
  isLoading: boolean;
}

const EmployeesContext = createContext<EmployeesContextType | undefined>(undefined);

export const EmployeesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading: authLoading } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [dailyCloses, setDailyCloses] = useState<DailyClose[]>([]);
  const [custodyTransactions, setCustodyTransactions] = useState<CustodyTransaction[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // تحميل عمليات العهدة من localStorage
  useEffect(() => {
    const saved = localStorage.getItem('custodyTransactions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCustodyTransactions(parsed.map((t: any) => ({
          ...t,
          createdAt: new Date(t.createdAt),
        })));
      } catch (e) {
        console.error('Failed to load custody transactions:', e);
      }
    }
  }, []);

  // استعلامات tRPC
  const { data: employeesData, isLoading: employeesLoading, refetch: refetchEmployees } = trpc.employees.getAll.useQuery(undefined, {
    enabled: !authLoading && !!user,
    retry: false,
  });
  
  const { data: logsData, refetch: refetchLogs } = trpc.logs.getAll.useQuery(undefined, {
    enabled: !authLoading && !!user,
    retry: false,
  });

  const createEmployeeMutation = trpc.employees.create.useMutation();
  const updateEmployeeMutation = trpc.employees.update.useMutation();
  const deleteEmployeeMutation = trpc.employees.delete.useMutation();
  const createLogMutation = trpc.logs.create.useMutation();

  // تحميل البيانات من localStorage
  useEffect(() => {
    const saved = localStorage.getItem('employees');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const parsedEmployees = parsed.map((emp: any) => ({
          ...emp,
          createdAt: emp.createdAt ? new Date(emp.createdAt) : new Date(),
          updatedAt: emp.updatedAt ? new Date(emp.updatedAt) : new Date(),
        }));
        setEmployees(parsedEmployees);
      } catch (e) {
        console.error('Failed to parse employees from localStorage:', e);
      }
    }
    setIsInitialized(true);
  }, []);

  // تحميل auditLogs من localStorage
  useEffect(() => {
    const saved = localStorage.getItem('auditLogs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const parsedLogs = parsed.map((log: any) => ({
          ...log,
          timestamp: log.timestamp ? new Date(log.timestamp) : new Date(),
        }));
        setAuditLogs(parsedLogs);
      } catch (e) {
        console.error('Failed to parse auditLogs from localStorage:', e);
      }
    }
  }, []);

  // إنشاء المدير الافتراضي إذا لم يكن موجود
  useEffect(() => {
    if (isInitialized && employees.length === 0) {
      const defaultEmployee = {
        id: '1',
        employeeCode: 'LY-MGR-00001',
        phone: '0920563695',
        fullName: 'محمد مصطفى زهمول',
        jobTitle: 'manager' as JobTitle,
        passwordHash: '12345678',
        status: 'active' as const,
        permissions: DEFAULT_PERMISSIONS.manager,
        salary: '2500', // الراتب الشهري
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // حفظ في localStorage مباشرة
      localStorage.setItem('employees', JSON.stringify([defaultEmployee]));
      setEmployees([defaultEmployee as Employee]);
    }
  }, [isInitialized, employees.length]);

  const generateEmployeeCode = (jobTitle: JobTitle): string => {
    const code = JOB_TITLES[jobTitle].code;
    const count = employees.filter(e => e.jobTitle === jobTitle).length + 1;
    return `LY-${code}-${String(count).padStart(5, '0')}`;
  };

  const addEmployee = async (employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newEmployee: Employee = {
      ...employee,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const updated = [...employees, newEmployee];
    setEmployees(updated);
    localStorage.setItem('employees', JSON.stringify(updated));
    
    // تسجيل العملية في audit logs
    await addAuditLog({
      action: 'create',
      entityType: 'employee',
      entityId: newEmployee.id,
      userId: employee.createdBy,
      userName: employee.createdBy,
      details: {
        after: {
          name: newEmployee.fullName,
          phone: newEmployee.phone,
          jobTitle: newEmployee.jobTitle,
        },
      },
    });
  };

  const updateEmployee = async (id: string, updates: Partial<Employee>) => {
    const employee = employees.find(emp => emp.id === id);
    const updated = employees.map(emp => 
      emp.id === id 
        ? { ...emp, ...updates, updatedAt: new Date() }
        : emp
    );
    setEmployees(updated);
    localStorage.setItem('employees', JSON.stringify(updated));
    
    // تسجيل العملية في audit logs
    if (employee && updates.updatedBy) {
      await addAuditLog({
        action: 'update',
        entityType: 'employee',
        entityId: id,
        userId: updates.updatedBy,
        userName: updates.updatedBy,
        details: {
          before: {
            name: employee.fullName,
            jobTitle: employee.jobTitle,
          },
          after: {
            name: updates.fullName || employee.fullName,
            jobTitle: updates.jobTitle || employee.jobTitle,
          },
        },
      });
    }
  };

  const deleteEmployee = async (id: string) => {
    const employee = employees.find(emp => emp.id === id);
    const updated = employees.filter(emp => emp.id !== id);
    setEmployees(updated);
    localStorage.setItem('employees', JSON.stringify(updated));
    
    // تسجيل العملية في audit logs
    if (employee) {
      await addAuditLog({
        action: 'delete',
        entityType: 'employee',
        entityId: id,
        userId: 'system',
        userName: 'system',
        details: {
          before: {
            name: employee.fullName,
            phone: employee.phone,
            jobTitle: employee.jobTitle,
          },
        },
      });
    }
  };

  const updatePermissions = async (id: string, permissions: Permission[]) => {
    const employee = employees.find(emp => emp.id === id);
    const updated = employees.map(emp => 
      emp.id === id 
        ? { ...emp, permissions, updatedAt: new Date() }
        : emp
    );
    setEmployees(updated);
    localStorage.setItem('employees', JSON.stringify(updated));
    
    // تسجيل العملية في audit logs
    if (employee) {
      await addAuditLog({
        action: 'permission_change',
        entityType: 'employee',
        entityId: id,
        userId: 'system',
        userName: 'system',
        details: {
          before: { permissions: employee.permissions },
          after: { permissions },
        },
      });
    }
  };

  const toggleEmployeeStatus = async (id: string) => {
    const employee = employees.find(emp => emp.id === id);
    const updated = employees.map(emp => 
      emp.id === id 
        ? { ...emp, status: emp.status === 'active' ? 'disabled' as const : 'active' as const, updatedAt: new Date() }
        : emp
    );
    setEmployees(updated);
    localStorage.setItem('employees', JSON.stringify(updated));
    
    // تسجيل العملية في audit logs
    if (employee) {
      const newStatus = employee.status === 'active' ? 'disabled' : 'active';
      await addAuditLog({
        action: 'update',
        entityType: 'employee',
        entityId: id,
        userId: 'system',
        userName: 'system',
        details: {
          before: { status: employee.status },
          after: { status: newStatus },
        },
      });
    }
  };

  const addAuditLog = async (log: Omit<AuditLog, 'id' | 'timestamp'>) => {
    const newLog: AuditLog = {
      ...log,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    
    const updated = [...auditLogs, newLog];
    setAuditLogs(updated);
    localStorage.setItem('auditLogs', JSON.stringify(updated));
  };

  const submitDailyClose = (close: Omit<DailyClose, 'id'>) => {
    const newClose: DailyClose = {
      ...close,
      id: Date.now().toString(),
    };
    setDailyCloses([...dailyCloses, newClose]);
    localStorage.setItem('dailyCloses', JSON.stringify([...dailyCloses, newClose]));
  };

  const approveDailyClose = (id: string, approvedBy: string) => {
    const updated = dailyCloses.map(dc =>
      dc.id === id
        ? { ...dc, status: 'approved' as const, approvedBy, approvedAt: new Date() }
        : dc
    );
    setDailyCloses(updated);
    localStorage.setItem('dailyCloses', JSON.stringify(updated));
  };

  const rejectDailyClose = (id: string, rejectionReason: string, rejectedBy: string) => {
    const updated = dailyCloses.map(dc =>
      dc.id === id
        ? { ...dc, status: 'rejected' as const, rejectionReason, approvedBy: rejectedBy, approvedAt: new Date() }
        : dc
    );
    setDailyCloses(updated);
    localStorage.setItem('dailyCloses', JSON.stringify(updated));
  };

  const getEmployeeByPhone = (phone: string): Employee | undefined => {
    return employees.find(e => e.phone === phone);
  };

  const hasPermission = (userId: string, permission: Permission): boolean => {
    const employee = employees.find(e => e.id === userId);
    return employee ? employee.permissions.includes(permission) : false;
  };

  // دوال إدارة العهدة
  const depositCustody = (employeeId: string, accountType: 'cashLYD' | 'cashUSD' | 'bankLYD' | 'bankUSD', amount: number, notes: string, createdBy: string) => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return;

    const custodyAccounts = employee.custodyAccounts || { cashLYD: 0, cashUSD: 0, bankLYD: 0, bankUSD: 0 };
    const balanceBefore = custodyAccounts[accountType];
    const balanceAfter = balanceBefore + amount;

    // تحديث رصيد الموظف
    updateEmployee(employeeId, {
      custodyAccounts: {
        ...custodyAccounts,
        [accountType]: balanceAfter,
      },
    });

    // تسجيل العملية
    const transaction: CustodyTransaction = {
      id: `custody-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      employeeId,
      employeeName: employee.fullName,
      type: 'deposit',
      accountType,
      amount,
      balanceBefore,
      balanceAfter,
      notes,
      createdAt: new Date(),
      createdBy,
    };

    const updated = [...custodyTransactions, transaction];
    setCustodyTransactions(updated);
    localStorage.setItem('custodyTransactions', JSON.stringify(updated));
  };

  const withdrawCustody = (employeeId: string, accountType: 'cashLYD' | 'cashUSD' | 'bankLYD' | 'bankUSD', amount: number, notes: string, createdBy: string) => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return;

    const custodyAccounts = employee.custodyAccounts || { cashLYD: 0, cashUSD: 0, bankLYD: 0, bankUSD: 0 };
    const balanceBefore = custodyAccounts[accountType];
    
    if (balanceBefore < amount) {
      alert('الرصيد غير كافي');
      return;
    }

    const balanceAfter = balanceBefore - amount;

    // تحديث رصيد الموظف
    updateEmployee(employeeId, {
      custodyAccounts: {
        ...custodyAccounts,
        [accountType]: balanceAfter,
      },
    });

    // تسجيل العملية
    const transaction: CustodyTransaction = {
      id: `custody-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      employeeId,
      employeeName: employee.fullName,
      type: 'withdraw',
      accountType,
      amount,
      balanceBefore,
      balanceAfter,
      notes,
      createdAt: new Date(),
      createdBy,
    };

    const updated = [...custodyTransactions, transaction];
    setCustodyTransactions(updated);
    localStorage.setItem('custodyTransactions', JSON.stringify(updated));
  };

  const transferCustody = (
    employeeId: string,
    fromAccount: 'cashLYD' | 'cashUSD' | 'bankLYD' | 'bankUSD',
    toAccount: 'cashLYD' | 'cashUSD' | 'bankLYD' | 'bankUSD',
    amount: number,
    exchangeRate: number | undefined,
    notes: string,
    createdBy: string
  ) => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return;

    const custodyAccounts = employee.custodyAccounts || { cashLYD: 0, cashUSD: 0, bankLYD: 0, bankUSD: 0 };
    const fromBalanceBefore = custodyAccounts[fromAccount];
    
    if (fromBalanceBefore < amount) {
      alert('الرصيد غير كافي في الحساب المصدر');
      return;
    }

    // حساب المبلغ المحول
    let transferredAmount = amount;
    if (exchangeRate) {
      transferredAmount = amount * exchangeRate;
    }

    const fromBalanceAfter = fromBalanceBefore - amount;
    const toBalanceBefore = custodyAccounts[toAccount];
    const toBalanceAfter = toBalanceBefore + transferredAmount;

    // تحديث رصيد الموظف
    updateEmployee(employeeId, {
      custodyAccounts: {
        ...custodyAccounts,
        [fromAccount]: fromBalanceAfter,
        [toAccount]: toBalanceAfter,
      },
    });

    // تسجيل العملية
    const transaction: CustodyTransaction = {
      id: `custody-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      employeeId,
      employeeName: employee.fullName,
      type: 'transfer',
      accountType: fromAccount,
      toAccountType: toAccount,
      amount,
      exchangeRate,
      balanceBefore: fromBalanceBefore,
      balanceAfter: fromBalanceAfter,
      notes,
      createdAt: new Date(),
      createdBy,
    };

    const updated = [...custodyTransactions, transaction];
    setCustodyTransactions(updated);
    localStorage.setItem('custodyTransactions', JSON.stringify(updated));
  };

  // تسليم عهدة (نموذج واحد مع حقول اختيارية)
  // ملاحظة: يتطلب ربط مع TreasuryContext لخصم المبالغ من المالية
  const handoverCustody = async (data: HandoverCustodyData, createdBy: string): Promise<{ success: boolean; error?: string }> => {
    const employee = employees.find(e => e.id === data.employeeId);
    if (!employee) {
      return { success: false, error: 'الموظف غير موجود' };
    }

    const custodyAccounts = employee.custodyAccounts || { cashLYD: 0, cashUSD: 0, bankLYD: 0, bankUSD: 0 };
    const transactions: CustodyTransaction[] = [];

    // معالجة كل حقل معبأ
    if (data.cashLYD && data.cashLYD > 0) {
      const balanceBefore = custodyAccounts.cashLYD;
      const balanceAfter = balanceBefore + data.cashLYD;
      custodyAccounts.cashLYD = balanceAfter;

      transactions.push({
        id: `custody-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        employeeId: data.employeeId,
        employeeName: employee.fullName,
        type: 'deposit',
        accountType: 'cashLYD',
        amount: data.cashLYD,
        balanceBefore,
        balanceAfter,
        notes: data.notes || 'تسليم عهدة - دينار كاش',
        createdAt: new Date(),
        createdBy,
      });
    }

    if (data.cashUSD && data.cashUSD > 0) {
      const balanceBefore = custodyAccounts.cashUSD;
      const balanceAfter = balanceBefore + data.cashUSD;
      custodyAccounts.cashUSD = balanceAfter;

      let notes = `تسليم عهدة - دولار كاش`;
      if (data.supportedUSDRate) notes += ` | سعر مدعي: ${data.supportedUSDRate}`;
      if (data.referenceUSDCashSellRate) notes += ` | سعر مرجعي للبيع: ${data.referenceUSDCashSellRate}`;
      if (data.notes) notes += ` | ${data.notes}`;

      transactions.push({
        id: `custody-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        employeeId: data.employeeId,
        employeeName: employee.fullName,
        type: 'deposit',
        accountType: 'cashUSD',
        amount: data.cashUSD,
        balanceBefore,
        balanceAfter,
        notes,
        createdAt: new Date(),
        createdBy,
      });
    }

    if (data.bankLYD && data.bankLYD > 0) {
      const balanceBefore = custodyAccounts.bankLYD;
      const balanceAfter = balanceBefore + data.bankLYD;
      custodyAccounts.bankLYD = balanceAfter;

      let notes = `تسليم عهدة - مصرف دينار`;
      if (data.referenceUSDBankSellRate) notes += ` | سعر مرجعي لبيع الدولار: ${data.referenceUSDBankSellRate}`;
      if (data.notes) notes += ` | ${data.notes}`;

      transactions.push({
        id: `custody-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        employeeId: data.employeeId,
        employeeName: employee.fullName,
        type: 'deposit',
        accountType: 'bankLYD',
        amount: data.bankLYD,
        balanceBefore,
        balanceAfter,
        notes,
        createdAt: new Date(),
        createdBy,
      });
    }

    // تحديث حسابات الموظف
    await updateEmployee(employee.id, {
      custodyAccounts,
      updatedBy: createdBy,
    });

    // حفظ العمليات
    const updated = [...custodyTransactions, ...transactions];
    setCustodyTransactions(updated);
    localStorage.setItem('custodyTransactions', JSON.stringify(updated));

    return { success: true };
  };

  const getCustodyTransactionsByEmployee = (employeeId: string): CustodyTransaction[] => {
    return custodyTransactions.filter(t => t.employeeId === employeeId);
  };

  return (
    <EmployeesContext.Provider
      value={{
        employees,
        auditLogs,
        dailyCloses,
        custodyTransactions,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        updatePermissions,
        toggleEmployeeStatus,
        addAuditLog,
        submitDailyClose,
        approveDailyClose,
        rejectDailyClose,
        getEmployeeByPhone,
        hasPermission,
        generateEmployeeCode,
        depositCustody,
        withdrawCustody,
        transferCustody,
        handoverCustody,
        getCustodyTransactionsByEmployee,
        isLoading: employeesLoading,
      }}
    >
      {children}
    </EmployeesContext.Provider>
  );
};

export const useEmployees = () => {
  const context = useContext(EmployeesContext);
  if (!context) {
    throw new Error('useEmployees must be used within EmployeesProvider');
  }
  return context;
};
