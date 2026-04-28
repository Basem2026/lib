/**
 * أنواع بيانات نظام المصروفات (Expenses System)
 */

export type ExpenseCategory = 
  | 'rent' // إيجار
  | 'utilities' // مرافق (كهرباء، ماء، إنترنت)
  | 'supplies' // مستلزمات مكتبية
  | 'maintenance' // صيانة
  | 'transportation' // مواصلات
  | 'marketing' // تسويق
  | 'other'; // أخرى

export type PaymentMethod = 'cash' | 'bank';

export interface Expense {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  currency: 'LYD' | 'USD' | 'USDT';
  paymentMethod: PaymentMethod;
  bankAccountId?: string; // إذا كانت الدفعة من حساب بنكي
  date: Date;
  notes?: string;
  createdBy: string;
  createdAt: Date;
}

// أسماء الفئات بالعربية
export const EXPENSE_CATEGORIES: Record<ExpenseCategory, string> = {
  rent: 'إيجار',
  utilities: 'مرافق (كهرباء، ماء، إنترنت)',
  supplies: 'مستلزمات مكتبية',
  maintenance: 'صيانة',
  transportation: 'مواصلات',
  marketing: 'تسويق',
  other: 'أخرى',
};

// أسماء طرق الدفع بالعربية
export const PAYMENT_METHODS: Record<PaymentMethod, string> = {
  cash: 'نقدي',
  bank: 'مصرفي',
};
