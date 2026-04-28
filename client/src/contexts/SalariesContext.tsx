import React, { createContext, useContext, useState, useEffect } from 'react';
import { Salary } from '@/types/salaries';
import { PaymentMethod } from '@/types/expenses';
import { useAccounts } from './AccountsContext';
import { useAuth } from './AuthContext';

interface SalariesContextType {
  salaries: Salary[];
  addSalary: (data: {
    employeeId: string;
    employeeName: string;
    employeePosition: string;
    amount: number;
    currency: 'LYD' | 'USD';
    paymentMethod: PaymentMethod;
    bankAccountId?: string;
    month: string;
    paymentDate: Date;
    notes?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  getSalaries: () => Salary[];
  getSalariesByEmployee: (employeeId: string) => Salary[];
  getTotalSalaries: (currency?: 'LYD' | 'USD') => number;
  isLoading: boolean;
}

const SalariesContext = createContext<SalariesContextType | undefined>(undefined);

export const SalariesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const { addTransaction, getAccountBalance } = useAccounts();
  const { user } = useAuth();

  // تحميل الرواتب من localStorage
  useEffect(() => {
    const saved = localStorage.getItem('salaries');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSalaries(parsed.map((s: any) => ({
          ...s,
          paymentDate: new Date(s.paymentDate),
          createdAt: new Date(s.createdAt),
        })));
      } catch (error) {
        console.error('Error loading salaries:', error);
      }
    }
  }, []);

  // حفظ الرواتب في localStorage
  useEffect(() => {
    if (salaries.length > 0) {
      localStorage.setItem('salaries', JSON.stringify(salaries));
    }
  }, [salaries]);

  // إضافة راتب
  const addSalary = async (data: {
    employeeId: string;
    employeeName: string;
    employeePosition: string;
    amount: number;
    currency: 'LYD' | 'USD';
    paymentMethod: PaymentMethod;
    bankAccountId?: string;
    month: string;
    paymentDate: Date;
    notes?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      // تحديد الحساب الذي سينقص
      let accountType: 'cash_lyd' | 'cash_usd' | 'bank_lyd' = 'cash_lyd';
      
      if (data.paymentMethod === 'cash') {
        // كاش: حسب العملة
        if (data.currency === 'LYD') {
          accountType = 'cash_lyd';
        } else if (data.currency === 'USD') {
          accountType = 'cash_usd';
        }
      } else {
        // مصرفي: دائماً من الحسابات المصرفية بالدينار
        accountType = 'bank_lyd';
      }

      // التحقق من الرصيد
      const currentBalance = getAccountBalance(accountType);
      if (currentBalance < data.amount) {
        return { 
          success: false, 
          error: `الرصيد غير كافٍ. الرصيد الحالي: ${currentBalance.toFixed(2)} ${data.currency}` 
        };
      }

      // تسجيل سحب الراتب من الخزينة
      addTransaction({
        type: 'withdrawal',
        accountType: accountType,
        amount: data.amount,
        currency: data.currency,
        description: `راتب: ${data.employeeName} - ${data.month}`,
        reference: `SAL-${Date.now()}`,
        date: data.paymentDate,
        createdBy: user?.fullName || 'نظام',
      });

      // إضافة الراتب
      const newSalary: Salary = {
        id: Date.now().toString(),
        employeeId: data.employeeId,
        employeeName: data.employeeName,
        employeePosition: data.employeePosition,
        amount: data.amount,
        currency: data.currency,
        paymentMethod: data.paymentMethod,
        bankAccountId: data.bankAccountId,
        month: data.month,
        paymentDate: data.paymentDate,
        notes: data.notes,
        createdBy: user?.fullName || 'نظام',
        createdAt: new Date(),
      };

      setSalaries(prev => [newSalary, ...prev]);
      return { success: true };
    } catch (error) {
      console.error('Error adding salary:', error);
      return { success: false, error: 'حدث خطأ أثناء إضافة الراتب' };
    }
  };

  // الحصول على جميع الرواتب
  const getSalaries = () => {
    return salaries;
  };

  // الحصول على رواتب موظف معين
  const getSalariesByEmployee = (employeeId: string) => {
    return salaries.filter(s => s.employeeId === employeeId);
  };

  // حساب إجمالي الرواتب
  const getTotalSalaries = (currency?: 'LYD' | 'USD') => {
    return salaries
      .filter(s => !currency || s.currency === currency)
      .reduce((sum, s) => sum + s.amount, 0);
  };

  return (
    <SalariesContext.Provider
      value={{
        salaries,
        addSalary,
        getSalaries,
        getSalariesByEmployee,
        getTotalSalaries,
        isLoading: false,
      }}
    >
      {children}
    </SalariesContext.Provider>
  );
};

export const useSalaries = () => {
  const context = useContext(SalariesContext);
  if (!context) {
    throw new Error('useSalaries must be used within SalariesProvider');
  }
  return context;
};
