/**
 * أنواع بيانات نظام الرواتب (Salaries System)
 */

import { PaymentMethod } from './expenses';

export interface Salary {
  id: string;
  employeeId: string;
  employeeName: string;
  employeePosition: string; // منصب الموظف
  amount: number;
  currency: 'LYD' | 'USD';
  paymentMethod: PaymentMethod;
  bankAccountId?: string; // إذا كانت الدفعة من حساب بنكي
  month: string; // الشهر (YYYY-MM)
  paymentDate: Date; // تاريخ الدفع
  notes?: string;
  createdBy: string;
  createdAt: Date;
}

// حالة الراتب
export type SalaryStatus = 'pending' | 'paid';

export interface SalaryWithStatus extends Salary {
  status: SalaryStatus;
}
