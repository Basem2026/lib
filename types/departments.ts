/**
 * أنواع بيانات نظام الأقسام (Departments System)
 * يتضمن إدارة الأقسام المالية الأربعة مع حساباتها
 */

export type DepartmentType = 'cards' | 'daily_operations' | 'expenses_salaries' | 'profits';

export type CurrencyType = 'LYD' | 'USD' | 'USDT';

export type AccountType = 'cash_lyd' | 'cash_usd' | 'cash_usdt' | 'bank_lyd' | 'bank_other';

// حساب بنكي
export interface BankAccount {
  id: string;
  name: string;
  accountNumber: string;
  bankName: string;
  balance: number;
  currency: CurrencyType;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// قسم مالي
export interface Department {
  id: string;
  type: DepartmentType;
  name: string; // اسم القسم بالعربية
  description?: string;
  
  // الأرصدة النقدية
  cashLYD: number; // كاش دينار
  cashUSD: number; // كاش دولار
  cashUSDT: number; // كاش USDT
  
  // الحسابات البنكية
  bankAccounts: BankAccount[]; // حسابات بنكية بالدينار (متعددة)
  bankOther: number; // حساب مصرفي آخر (للبيع المصرفي)
  
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// عملية مالية على قسم
export interface DepartmentTransaction {
  id: string;
  departmentId: string;
  departmentName: string;
  type: 'deposit' | 'withdraw' | 'transfer'; // إيداع | سحب | تحويل
  accountType: AccountType; // نوع الحساب
  amount: number; // المبلغ
  balanceBefore: number; // الرصيد قبل
  balanceAfter: number; // الرصيد بعد
  
  // للتحويل فقط
  toAccountType?: AccountType;
  toBalanceBefore?: number;
  toBalanceAfter?: number;
  
  // معلومات إضافية
  reference?: string; // مرجع العملية (مثل: رقم الزبون، رقم المصروف)
  referenceType?: 'customer' | 'expense' | 'salary' | 'custody' | 'other';
  notes?: string;
  
  createdAt: Date;
  createdBy: string;
}

// معلومات القسم
export interface DepartmentInfo {
  type: DepartmentType;
  name: string;
  description: string;
  icon: string;
}

// معلومات الأقسام
export const DEPARTMENT_INFO: Record<DepartmentType, DepartmentInfo> = {
  cards: {
    type: 'cards',
    name: 'قسم البطاقات',
    description: 'إدارة عمليات البطاقات والسحوبات',
    icon: '💳',
  },
  daily_operations: {
    type: 'daily_operations',
    name: 'قسم العمليات اليومية',
    description: 'إدارة العمليات اليومية والعهد',
    icon: '📊',
  },
  expenses_salaries: {
    type: 'expenses_salaries',
    name: 'قسم المصروفات والمرتبات',
    description: 'إدارة المصروفات ورواتب الموظفين',
    icon: '💰',
  },
  profits: {
    type: 'profits',
    name: 'قسم الأرباح',
    description: 'تجميع الأرباح من جميع الأقسام',
    icon: '📈',
  },
};

// معلومات أنواع الحسابات
export const ACCOUNT_TYPE_INFO: Record<AccountType, { name: string; currency: CurrencyType | 'mixed' }> = {
  cash_lyd: { name: 'كاش دينار', currency: 'LYD' },
  cash_usd: { name: 'كاش دولار', currency: 'USD' },
  cash_usdt: { name: 'كاش USDT', currency: 'USDT' },
  bank_lyd: { name: 'حساب بنكي دينار', currency: 'LYD' },
  bank_other: { name: 'حساب مصرفي آخر', currency: 'mixed' },
};
