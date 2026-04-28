import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Department,
  DepartmentType,
  DepartmentTransaction,
  AccountType,
  BankAccount as DeptBankAccount,
  DEPARTMENT_INFO,
} from '@/types/departments';

interface DepartmentsContextType {
  // الأقسام
  departments: Department[];
  getDepartmentByType: (type: DepartmentType) => Department | undefined;
  
  // الحسابات البنكية
  addBankAccountToDepartment: (departmentType: DepartmentType, account: Omit<DeptBankAccount, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateBankAccountInDepartment: (departmentType: DepartmentType, accountId: string, updates: Partial<DeptBankAccount>) => void;
  removeBankAccountFromDepartment: (departmentType: DepartmentType, accountId: string) => void;
  
  // العمليات المالية
  deposit: (departmentType: DepartmentType, accountType: AccountType, amount: number, reference?: string, referenceType?: string, notes?: string, createdBy?: string) => Promise<{ success: boolean; error?: string }>;
  withdraw: (departmentType: DepartmentType, accountType: AccountType, amount: number, reference?: string, referenceType?: string, notes?: string, createdBy?: string) => Promise<{ success: boolean; error?: string }>;
  transfer: (fromDept: DepartmentType, fromAccount: AccountType, toDept: DepartmentType, toAccount: AccountType, amount: number, notes?: string, createdBy?: string) => Promise<{ success: boolean; error?: string }>;
  
  // الاستعلامات
  getAccountBalance: (departmentType: DepartmentType, accountType: AccountType, bankAccountId?: string) => number;
  getTransactionsByDepartment: (departmentType: DepartmentType) => DepartmentTransaction[];
  getAllTransactions: () => DepartmentTransaction[];
  
  isLoading: boolean;
}

const DepartmentsContext = createContext<DepartmentsContextType | undefined>(undefined);

export const DepartmentsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [transactions, setTransactions] = useState<DepartmentTransaction[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // تحميل البيانات من localStorage
  useEffect(() => {
    const savedDepts = localStorage.getItem('departments');
    const savedTxs = localStorage.getItem('departmentTransactions');
    
    if (savedDepts) {
      try {
        const parsed = JSON.parse(savedDepts);
        setDepartments(parsed.map((d: any) => ({
          ...d,
          createdAt: new Date(d.createdAt),
          updatedAt: new Date(d.updatedAt),
          bankAccounts: d.bankAccounts?.map((ba: any) => ({
            ...ba,
            createdAt: new Date(ba.createdAt),
            updatedAt: new Date(ba.updatedAt),
          })) || [],
        })));
      } catch (e) {
        console.error('Failed to load departments:', e);
      }
    }
    
    if (savedTxs) {
      try {
        const parsed = JSON.parse(savedTxs);
        setTransactions(parsed.map((t: any) => ({
          ...t,
          createdAt: new Date(t.createdAt),
        })));
      } catch (e) {
        console.error('Failed to load department transactions:', e);
      }
    }
    
    setIsInitialized(true);
  }, []);

  // إنشاء الأقسام الافتراضية إذا لم تكن موجودة
  useEffect(() => {
    if (isInitialized && departments.length === 0) {
      const defaultDepartments: Department[] = [
        {
          id: 'dept-cards',
          type: 'cards',
          name: DEPARTMENT_INFO.cards.name,
          description: DEPARTMENT_INFO.cards.description,
          cashLYD: 0,
          cashUSD: 0,
          cashUSDT: 0,
          bankAccounts: [],
          bankOther: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'dept-daily-ops',
          type: 'daily_operations',
          name: DEPARTMENT_INFO.daily_operations.name,
          description: DEPARTMENT_INFO.daily_operations.description,
          cashLYD: 0,
          cashUSD: 0,
          cashUSDT: 0,
          bankAccounts: [],
          bankOther: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'dept-expenses',
          type: 'expenses_salaries',
          name: DEPARTMENT_INFO.expenses_salaries.name,
          description: DEPARTMENT_INFO.expenses_salaries.description,
          cashLYD: 0,
          cashUSD: 0,
          cashUSDT: 0,
          bankAccounts: [],
          bankOther: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'dept-profits',
          type: 'profits',
          name: DEPARTMENT_INFO.profits.name,
          description: DEPARTMENT_INFO.profits.description,
          cashLYD: 0,
          cashUSD: 0,
          cashUSDT: 0,
          bankAccounts: [],
          bankOther: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      
      setDepartments(defaultDepartments);
      localStorage.setItem('departments', JSON.stringify(defaultDepartments));
    }
  }, [isInitialized, departments.length]);

  // حفظ التغييرات في localStorage
  useEffect(() => {
    if (isInitialized && departments.length > 0) {
      localStorage.setItem('departments', JSON.stringify(departments));
    }
  }, [departments, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('departmentTransactions', JSON.stringify(transactions));
    }
  }, [transactions, isInitialized]);

  const getDepartmentByType = useCallback((type: DepartmentType): Department | undefined => {
    return departments.find(d => d.type === type);
  }, [departments]);

  const addBankAccountToDepartment = useCallback((departmentType: DepartmentType, account: Omit<DeptBankAccount, 'id' | 'createdAt' | 'updatedAt'>) => {
    setDepartments(prev => prev.map(dept => {
      if (dept.type === departmentType) {
        const newAccount: DeptBankAccount = {
          ...account,
          id: `bank-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return {
          ...dept,
          bankAccounts: [...dept.bankAccounts, newAccount],
          updatedAt: new Date(),
        };
      }
      return dept;
    }));
  }, []);

  const updateBankAccountInDepartment = useCallback((departmentType: DepartmentType, accountId: string, updates: Partial<DeptBankAccount>) => {
    setDepartments(prev => prev.map(dept => {
      if (dept.type === departmentType) {
        return {
          ...dept,
          bankAccounts: dept.bankAccounts.map(ba =>
            ba.id === accountId ? { ...ba, ...updates, updatedAt: new Date() } : ba
          ),
          updatedAt: new Date(),
        };
      }
      return dept;
    }));
  }, []);

  const removeBankAccountFromDepartment = useCallback((departmentType: DepartmentType, accountId: string) => {
    setDepartments(prev => prev.map(dept => {
      if (dept.type === departmentType) {
        return {
          ...dept,
          bankAccounts: dept.bankAccounts.filter(ba => ba.id !== accountId),
          updatedAt: new Date(),
        };
      }
      return dept;
    }));
  }, []);

  const getAccountBalance = useCallback((departmentType: DepartmentType, accountType: AccountType, bankAccountId?: string): number => {
    const dept = getDepartmentByType(departmentType);
    if (!dept) return 0;

    switch (accountType) {
      case 'cash_lyd':
        return dept.cashLYD;
      case 'cash_usd':
        return dept.cashUSD;
      case 'cash_usdt':
        return dept.cashUSDT;
      case 'bank_lyd':
        if (bankAccountId) {
          const account = dept.bankAccounts.find(ba => ba.id === bankAccountId);
          return account?.balance || 0;
        }
        return dept.bankAccounts.reduce((sum, ba) => sum + ba.balance, 0);
      case 'bank_other':
        return dept.bankOther;
      default:
        return 0;
    }
  }, [getDepartmentByType]);

  const deposit = useCallback(async (
    departmentType: DepartmentType,
    accountType: AccountType,
    amount: number,
    reference?: string,
    referenceType?: string,
    notes?: string,
    createdBy: string = 'system'
  ): Promise<{ success: boolean; error?: string }> => {
    const dept = getDepartmentByType(departmentType);
    if (!dept) {
      return { success: false, error: 'القسم غير موجود' };
    }

    if (amount <= 0) {
      return { success: false, error: 'المبلغ يجب أن يكون أكبر من صفر' };
    }

    const balanceBefore = getAccountBalance(departmentType, accountType);
    const balanceAfter = balanceBefore + amount;

    // تحديث الرصيد
    setDepartments(prev => prev.map(d => {
      if (d.type === departmentType) {
        const updated = { ...d, updatedAt: new Date() };
        switch (accountType) {
          case 'cash_lyd':
            updated.cashLYD = balanceAfter;
            break;
          case 'cash_usd':
            updated.cashUSD = balanceAfter;
            break;
          case 'cash_usdt':
            updated.cashUSDT = balanceAfter;
            break;
          case 'bank_other':
            updated.bankOther = balanceAfter;
            break;
        }
        return updated;
      }
      return d;
    }));

    // تسجيل العملية
    const transaction: DepartmentTransaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      departmentId: dept.id,
      departmentName: dept.name,
      type: 'deposit',
      accountType,
      amount,
      balanceBefore,
      balanceAfter,
      reference,
      referenceType: referenceType as any,
      notes,
      createdAt: new Date(),
      createdBy,
    };

    setTransactions(prev => [...prev, transaction]);

    return { success: true };
  }, [getDepartmentByType, getAccountBalance]);

  const withdraw = useCallback(async (
    departmentType: DepartmentType,
    accountType: AccountType,
    amount: number,
    reference?: string,
    referenceType?: string,
    notes?: string,
    createdBy: string = 'system'
  ): Promise<{ success: boolean; error?: string }> => {
    const dept = getDepartmentByType(departmentType);
    if (!dept) {
      return { success: false, error: 'القسم غير موجود' };
    }

    if (amount <= 0) {
      return { success: false, error: 'المبلغ يجب أن يكون أكبر من صفر' };
    }

    const balanceBefore = getAccountBalance(departmentType, accountType);
    
    if (balanceBefore < amount) {
      return { success: false, error: 'الرصيد غير كافٍ' };
    }

    const balanceAfter = balanceBefore - amount;

    // تحديث الرصيد
    setDepartments(prev => prev.map(d => {
      if (d.type === departmentType) {
        const updated = { ...d, updatedAt: new Date() };
        switch (accountType) {
          case 'cash_lyd':
            updated.cashLYD = balanceAfter;
            break;
          case 'cash_usd':
            updated.cashUSD = balanceAfter;
            break;
          case 'cash_usdt':
            updated.cashUSDT = balanceAfter;
            break;
          case 'bank_other':
            updated.bankOther = balanceAfter;
            break;
        }
        return updated;
      }
      return d;
    }));

    // تسجيل العملية
    const transaction: DepartmentTransaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      departmentId: dept.id,
      departmentName: dept.name,
      type: 'withdraw',
      accountType,
      amount,
      balanceBefore,
      balanceAfter,
      reference,
      referenceType: referenceType as any,
      notes,
      createdAt: new Date(),
      createdBy,
    };

    setTransactions(prev => [...prev, transaction]);

    return { success: true };
  }, [getDepartmentByType, getAccountBalance]);

  const transfer = useCallback(async (
    fromDept: DepartmentType,
    fromAccount: AccountType,
    toDept: DepartmentType,
    toAccount: AccountType,
    amount: number,
    notes?: string,
    createdBy: string = 'system'
  ): Promise<{ success: boolean; error?: string }> => {
    // سحب من الحساب الأول
    const withdrawResult = await withdraw(fromDept, fromAccount, amount, undefined, 'other', notes, createdBy);
    if (!withdrawResult.success) {
      return withdrawResult;
    }

    // إيداع في الحساب الثاني
    const depositResult = await deposit(toDept, toAccount, amount, undefined, 'other', notes, createdBy);
    if (!depositResult.success) {
      // إرجاع المبلغ المسحوب
      await deposit(fromDept, fromAccount, amount, undefined, 'other', 'إرجاع بسبب فشل التحويل', createdBy);
      return depositResult;
    }

    return { success: true };
  }, [withdraw, deposit]);

  const getTransactionsByDepartment = useCallback((departmentType: DepartmentType): DepartmentTransaction[] => {
    const dept = getDepartmentByType(departmentType);
    if (!dept) return [];
    return transactions.filter(t => t.departmentId === dept.id);
  }, [getDepartmentByType, transactions]);

  const getAllTransactions = useCallback((): DepartmentTransaction[] => {
    return transactions;
  }, [transactions]);

  return (
    <DepartmentsContext.Provider
      value={{
        departments,
        getDepartmentByType,
        addBankAccountToDepartment,
        updateBankAccountInDepartment,
        removeBankAccountFromDepartment,
        deposit,
        withdraw,
        transfer,
        getAccountBalance,
        getTransactionsByDepartment,
        getAllTransactions,
        isLoading: false,
      }}
    >
      {children}
    </DepartmentsContext.Provider>
  );
};

export const useDepartments = () => {
  const context = useContext(DepartmentsContext);
  if (!context) {
    throw new Error('useDepartments must be used within DepartmentsProvider');
  }
  return context;
};
