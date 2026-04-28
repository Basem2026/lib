import React, { createContext, useContext, useState, useCallback } from 'react';
import { Expense, Salary, Report, Payroll, BudgetPlan, ExpenseCategory } from '@/types/financial';

export interface FinancialContextType {
  // Expenses
  expenses: Expense[];
  addExpense: (expense: Expense) => void;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  removeExpense: (id: string) => void;
  getExpensesByCategory: (category: string) => Expense[];
  getExpensesByDate: (startDate: Date, endDate: Date) => Expense[];
  getTotalExpenses: () => number;
  getExpensesByStatus: (status: string) => Expense[];

  // Expense Categories
  expenseCategories: ExpenseCategory[];
  addExpenseCategory: (category: ExpenseCategory) => void;
  updateExpenseCategory: (id: string, updates: Partial<ExpenseCategory>) => void;

  // Salaries
  salaries: Salary[];
  addSalary: (salary: Salary) => void;
  updateSalary: (id: string, updates: Partial<Salary>) => void;
  getSalariesByMonth: (month: number, year: number) => Salary[];
  getTotalSalaries: () => number;
  getSalariesByStatus: (status: string) => Salary[];

  // Payroll
  payrolls: Payroll[];
  addPayroll: (payroll: Payroll) => void;
  updatePayroll: (id: string, updates: Partial<Payroll>) => void;
  getCurrentPayroll: () => Payroll | null;

  // Reports
  reports: Report[];
  addReport: (report: Report) => void;
  getReportsByType: (type: string) => Report[];
  getReportsByPeriod: (period: string) => Report[];

  // Budget
  budgets: BudgetPlan[];
  addBudget: (budget: BudgetPlan) => void;
  updateBudget: (id: string, updates: Partial<BudgetPlan>) => void;
  getCurrentBudget: () => BudgetPlan | null;

  // Statistics
  getTotalExpensesByCategory: () => { [key: string]: number };
  getMonthlyExpenses: (month: number, year: number) => number;
  getMonthlyRevenue: (month: number, year: number) => number;
  getMonthlyProfit: (month: number, year: number) => number;

  // Balances System (نظام الأرصدة)
  balances: {
    cards: {
      bankAccounts: { [accountName: string]: number }; // حسابات بنكية البطاقات
      cash: number; // كاش البطاقات
    };
    dailyOperations: {
      bankAccounts: { [accountName: string]: number }; // حسابات بنكية العمليات اليومية
      cash: number; // كاش العمليات اليومية
    };
  };
  updateCardsBankBalance: (accountName: string, amount: number) => void;
  updateCardsCashBalance: (amount: number) => void;
  updateDailyOpsBankBalance: (accountName: string, amount: number) => void;
  updateDailyOpsCashBalance: (amount: number) => void;
  getTotalCardsBalance: () => number;
  getTotalDailyOpsBalance: () => number;
  getTotalCapital: () => number;
}

const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

export const FinancialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [budgets, setBudgets] = useState<BudgetPlan[]>([]);

  // Balances State (حالة الأرصدة)
  const [balances, setBalances] = useState({
    cards: {
      bankAccounts: {
        'حساب الأمان': 0,
        'حساب الجمهورية': 0,
        'حساب الأهلي': 0,
      },
      cash: 0,
    },
    dailyOperations: {
      bankAccounts: {},
      cash: 0,
    },
  });

  // Expense functions
  const addExpense = useCallback((expense: Expense) => {
    setExpenses(prev => [...prev, expense]);
  }, []);

  const updateExpense = useCallback((id: string, updates: Partial<Expense>) => {
    setExpenses(prev =>
      prev.map(e => e.id === id ? { ...e, ...updates, updatedAt: new Date() } : e)
    );
  }, []);

  const removeExpense = useCallback((id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  }, []);

  const getExpensesByCategory = useCallback((category: string) => {
    return expenses.filter(e => e.category === category);
  }, [expenses]);

  const getExpensesByDate = useCallback((startDate: Date, endDate: Date) => {
    return expenses.filter(e => {
      const expDate = new Date(e.date);
      return expDate >= startDate && expDate <= endDate;
    });
  }, [expenses]);

  const getTotalExpenses = useCallback(() => {
    return expenses.filter(e => e.status === 'paid').reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const getExpensesByStatus = useCallback((status: string) => {
    return expenses.filter(e => e.status === status);
  }, [expenses]);

  // Expense Category functions
  const addExpenseCategory = useCallback((category: ExpenseCategory) => {
    setExpenseCategories(prev => [...prev, category]);
  }, []);

  const updateExpenseCategory = useCallback((id: string, updates: Partial<ExpenseCategory>) => {
    setExpenseCategories(prev =>
      prev.map(c => c.id === id ? { ...c, ...updates } : c)
    );
  }, []);

  // Salary functions
  const addSalary = useCallback((salary: Salary) => {
    setSalaries(prev => [...prev, salary]);
  }, []);

  const updateSalary = useCallback((id: string, updates: Partial<Salary>) => {
    setSalaries(prev =>
      prev.map(s => s.id === id ? { ...s, ...updates } : s)
    );
  }, []);

  const getSalariesByMonth = useCallback((month: number, year: number) => {
    return salaries.filter(s => s.month === month && s.year === year);
  }, [salaries]);

  const getTotalSalaries = useCallback(() => {
    return salaries.filter(s => s.status === 'paid').reduce((sum, s) => sum + s.netSalary, 0);
  }, [salaries]);

  const getSalariesByStatus = useCallback((status: string) => {
    return salaries.filter(s => s.status === status);
  }, [salaries]);

  // Payroll functions
  const addPayroll = useCallback((payroll: Payroll) => {
    setPayrolls(prev => [...prev, payroll]);
  }, []);

  const updatePayroll = useCallback((id: string, updates: Partial<Payroll>) => {
    setPayrolls(prev =>
      prev.map(p => p.id === id ? { ...p, ...updates } : p)
    );
  }, []);

  const getCurrentPayroll = useCallback(() => {
    const now = new Date();
    return payrolls.find(p => p.month === now.getMonth() + 1 && p.year === now.getFullYear()) || null;
  }, [payrolls]);

  // Report functions
  const addReport = useCallback((report: Report) => {
    setReports(prev => [...prev, report]);
  }, []);

  const getReportsByType = useCallback((type: string) => {
    return reports.filter(r => r.type === type);
  }, [reports]);

  const getReportsByPeriod = useCallback((period: string) => {
    return reports.filter(r => r.period === period);
  }, [reports]);

  // Budget functions
  const addBudget = useCallback((budget: BudgetPlan) => {
    setBudgets(prev => [...prev, budget]);
  }, []);

  const updateBudget = useCallback((id: string, updates: Partial<BudgetPlan>) => {
    setBudgets(prev =>
      prev.map(b => b.id === id ? { ...b, ...updates } : b)
    );
  }, []);

  const getCurrentBudget = useCallback(() => {
    const now = new Date();
    return budgets.find(b => b.year === now.getFullYear() && b.status === 'active') || null;
  }, [budgets]);

  // Statistics functions
  const getTotalExpensesByCategory = useCallback(() => {
    const result: { [key: string]: number } = {};
    expenses.forEach(e => {
      if (!result[e.category as string]) {
        result[e.category as string] = 0;
      }
      result[e.category as string] += e.amount;
    });
    return result;
  }, [expenses]);

  const getMonthlyExpenses = useCallback((month: number, year: number) => {
    return getExpensesByDate(
      new Date(year, month - 1, 1),
      new Date(year, month, 0)
    ).reduce((sum, e) => sum + e.amount, 0);
  }, [getExpensesByDate]);

  const getMonthlyRevenue = useCallback((month: number, year: number) => {
    // This would be calculated from operations context
    return 0;
  }, []);

  const getMonthlyProfit = useCallback((month: number, year: number) => {
    return getMonthlyRevenue(month, year) - getMonthlyExpenses(month, year);
  }, [getMonthlyExpenses, getMonthlyRevenue]);

  // Balances Functions (دوال الأرصدة)
  const updateCardsBankBalance = useCallback((accountName: string, amount: number) => {
    setBalances(prev => ({
      ...prev,
      cards: {
        ...prev.cards,
        bankAccounts: {
          ...prev.cards.bankAccounts,
          [accountName]: parseFloat((((prev.cards.bankAccounts as any)[accountName] || 0) + amount).toFixed(2)),
        },
      },
    }));
  }, []);

  const updateCardsCashBalance = useCallback((amount: number) => {
    setBalances(prev => ({
      ...prev,
      cards: {
        ...prev.cards,
        cash: parseFloat((prev.cards.cash + amount).toFixed(2)),
      },
    }));
  }, []);

  const updateDailyOpsBankBalance = useCallback((accountName: string, amount: number) => {
    setBalances(prev => ({
      ...prev,
      dailyOperations: {
        ...prev.dailyOperations,
        bankAccounts: {
          ...prev.dailyOperations.bankAccounts,
          [accountName]: parseFloat((((prev.dailyOperations.bankAccounts as any)[accountName] || 0) + amount).toFixed(2)),
        },
      },
    }));
  }, []);

  const updateDailyOpsCashBalance = useCallback((amount: number) => {
    setBalances(prev => ({
      ...prev,
      dailyOperations: {
        ...prev.dailyOperations,
        cash: parseFloat((prev.dailyOperations.cash + amount).toFixed(2)),
      },
    }));
  }, []);

  const getTotalCardsBalance = useCallback(() => {
    const bankTotal = Object.values(balances.cards.bankAccounts).reduce((sum: number, val) => sum + Number(val), 0);
    return parseFloat((bankTotal + balances.cards.cash).toFixed(2));
  }, [balances]);

  const getTotalDailyOpsBalance = useCallback(() => {
    const bankTotal = Object.values(balances.dailyOperations.bankAccounts).reduce((sum: number, val) => sum + Number(val), 0);
    return parseFloat((bankTotal + balances.dailyOperations.cash).toFixed(2));
  }, [balances]);

  const getTotalCapital = useCallback(() => {
    return parseFloat((getTotalCardsBalance() + getTotalDailyOpsBalance()).toFixed(2));
  }, [getTotalCardsBalance, getTotalDailyOpsBalance]);

  return (
    <FinancialContext.Provider
      value={{
        expenses,
        addExpense,
        updateExpense,
        removeExpense,
        getExpensesByCategory,
        getExpensesByDate,
        getTotalExpenses,
        getExpensesByStatus,
        expenseCategories,
        addExpenseCategory,
        updateExpenseCategory,
        salaries,
        addSalary,
        updateSalary,
        getSalariesByMonth,
        getTotalSalaries,
        getSalariesByStatus,
        payrolls,
        addPayroll,
        updatePayroll,
        getCurrentPayroll,
        reports,
        addReport,
        getReportsByType,
        getReportsByPeriod,
        budgets,
        addBudget,
        updateBudget,
        getCurrentBudget,
        getTotalExpensesByCategory,
        getMonthlyExpenses,
        getMonthlyRevenue,
        getMonthlyProfit,
        balances,
        updateCardsBankBalance,
        updateCardsCashBalance,
        updateDailyOpsBankBalance,
        updateDailyOpsCashBalance,
        getTotalCardsBalance,
        getTotalDailyOpsBalance,
        getTotalCapital,
      }}
    >
      {children}
    </FinancialContext.Provider>
  );
};

export const useFinancial = (): FinancialContextType => {
  const context = useContext(FinancialContext);
  if (!context) {
    throw new Error('useFinancial must be used within FinancialProvider');
  }
  return context;
};
