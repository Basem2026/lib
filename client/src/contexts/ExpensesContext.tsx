import React, { createContext, useContext, useState, useEffect } from 'react';
import { Expense, ExpenseCategory, PaymentMethod } from '@/types/expenses';
import { useAccounts } from './AccountsContext';
import { useAuth } from '@/contexts/AuthContext';

interface ExpensesContextType {
  expenses: Expense[];
  addExpense: (data: {
    category: ExpenseCategory;
    description: string;
    amount: number;
    currency: 'LYD' | 'USD' | 'USDT';
    paymentMethod: PaymentMethod;
    bankAccountId?: string;
    date: Date;
    notes?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  getExpenses: () => Expense[];
  getExpensesByCategory: (category: ExpenseCategory) => Expense[];
  getTotalExpenses: (currency?: 'LYD' | 'USD' | 'USDT') => number;
  isLoading: boolean;
}

const ExpensesContext = createContext<ExpensesContextType | undefined>(undefined);

export const ExpensesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const { addTransaction, getAccountBalance } = useAccounts();
  const { user } = useAuth();

  // تحميل المصروفات من localStorage
  useEffect(() => {
    const saved = localStorage.getItem('expenses');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setExpenses(parsed.map((e: any) => ({
          ...e,
          date: new Date(e.date),
          createdAt: new Date(e.createdAt),
        })));
      } catch (error) {
        console.error('Error loading expenses:', error);
      }
    }
  }, []);

  // حفظ المصروفات في localStorage
  useEffect(() => {
    if (expenses.length > 0) {
      localStorage.setItem('expenses', JSON.stringify(expenses));
    }
  }, [expenses]);

  // إضافة مصروف
  const addExpense = async (data: {
    category: ExpenseCategory;
    description: string;
    amount: number;
    currency: 'LYD' | 'USD' | 'USDT';
    paymentMethod: PaymentMethod;
    bankAccountId?: string;
    date: Date;
    notes?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      // تحديد الحساب الذي سينقص
      let accountType: 'cash_lyd' | 'cash_usd' | 'bank_lyd' | 'usdt' = 'cash_lyd';
      
      if (data.paymentMethod === 'cash') {
        // كاش: حسب العملة
        if (data.currency === 'LYD') {
          accountType = 'cash_lyd';
        } else if (data.currency === 'USD') {
          accountType = 'cash_usd';
        } else if (data.currency === 'USDT') {
          accountType = 'usdt';
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

      // تسجيل سحب المصروف من الخزينة
      addTransaction({
        type: 'withdrawal',
        accountType: accountType,
        amount: data.amount,
        currency: data.currency,
        description: `مصروف: ${data.description} (${data.category})`,
        reference: `EXP-${Date.now()}`,
        date: data.date,
        createdBy: user?.fullName || 'نظام',
      });

      // إضافة المصروف
      const newExpense: Expense = {
        id: Date.now().toString(),
        category: data.category,
        description: data.description,
        amount: data.amount,
        currency: data.currency,
        paymentMethod: data.paymentMethod,
        bankAccountId: data.bankAccountId,
        date: data.date,
        notes: data.notes,
        createdBy: user?.fullName || 'نظام',
        createdAt: new Date(),
      };

      setExpenses(prev => [newExpense, ...prev]);
      return { success: true };
    } catch (error) {
      console.error('Error adding expense:', error);
      return { success: false, error: 'حدث خطأ أثناء إضافة المصروف' };
    }
  };

  // الحصول على جميع المصروفات
  const getExpenses = () => {
    return expenses;
  };

  // الحصول على المصروفات حسب الفئة
  const getExpensesByCategory = (category: ExpenseCategory) => {
    return expenses.filter(e => e.category === category);
  };

  // حساب إجمالي المصروفات
  const getTotalExpenses = (currency?: 'LYD' | 'USD' | 'USDT') => {
    return expenses
      .filter(e => !currency || e.currency === currency)
      .reduce((sum, e) => sum + e.amount, 0);
  };

  return (
    <ExpensesContext.Provider
      value={{
        expenses,
        addExpense,
        getExpenses,
        getExpensesByCategory,
        getTotalExpenses,
        isLoading: false,
      }}
    >
      {children}
    </ExpensesContext.Provider>
  );
};

export const useExpenses = () => {
  const context = useContext(ExpensesContext);
  if (!context) {
    throw new Error('useExpenses must be used within ExpensesProvider');
  }
  return context;
};
