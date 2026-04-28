import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

/**
 * نظام الخزينة المبسط - 7 حسابات رئيسية
 * 1. رأس المال - Capital
 * 2. حساب التوزيع - Distribution
 * 3. كاش دينار - Cash LYD
 * 4. كاش دولار - Cash USD
 * 5. USDT - Cryptocurrency
 * 6. حسابات بنكية دينار - Bank LYD
 * 7. حسابات بنكية دولار - Bank USD
 */

export type AccountType = 'capital' | 'distribution' | 'cash_lyd' | 'cash_usd' | 'usdt' | 'bank_lyd' | 'bank_usd' | 'profits';
export type TransactionType = 'deposit' | 'withdrawal' | 'capital_deposit' | 'distribution';

export interface Account {
  id: string;
  type: AccountType;
  name: string;
  balance: number;
  currency: 'LYD' | 'USD' | 'USDT';
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  fromAccount?: AccountType; // الحساب المصدر (في حالة التحويل)
  toAccount?: AccountType; // الحساب الوجهة (في حالة التحويل)
  accountType?: AccountType; // الحساب المتأثر (في حالة إيداع/سحب عادي)
  amount: number;
  currency: 'LYD' | 'USD' | 'USDT';
  description: string;
  reference: string;
  date: Date;
  createdBy: string;
  createdAt: Date;
}

interface AccountsContextType {
  accounts: Account[];
  transactions: Transaction[];
  getAccount: (type: AccountType) => Account | undefined;
  getAccountBalance: (type: AccountType) => number;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => void;
  getAccountTransactions: (type: AccountType) => Transaction[];
  getTotalAssets: () => { lyd: number; usd: number; usdt: number };
  resetAllData: () => void;
}

const AccountsContext = createContext<AccountsContextType | undefined>(undefined);

export function AccountsProvider({ children }: { children: ReactNode }) {
  // الحسابات الرئيسية السبعة
  const [accounts, setAccounts] = useState<Account[]>(() => {
    const saved = localStorage.getItem('treasuryAccounts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((acc: any) => ({
          ...acc,
          createdAt: new Date(acc.createdAt),
          updatedAt: new Date(acc.updatedAt),
        }));
      } catch {
        // في حالة فشل التحليل، استخدم القيم الافتراضية
      }
    }
    
    return [
      {
        id: '1',
        type: 'capital',
        name: 'رأس المال',
        balance: 0,
        currency: 'LYD',
        description: 'رأس مال الشركة الأساسي',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        type: 'distribution',
        name: 'حساب التوزيع',
        balance: 0,
        currency: 'LYD',
        description: 'حساب توزيع الأرباح على الشركاء',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '3',
        type: 'cash_lyd',
        name: 'كاش دينار',
        balance: 0,
        currency: 'LYD',
        description: 'النقدية بالدينار الليبي',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '4',
        type: 'cash_usd',
        name: 'كاش دولار',
        balance: 0,
        currency: 'USD',
        description: 'النقدية بالدولار الأمريكي',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '5',
        type: 'usdt',
        name: 'USDT',
        balance: 0,
        currency: 'USDT',
        description: 'العملة الرقمية USDT',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '6',
        type: 'bank_lyd',
        name: 'حسابات بنكية دينار',
        balance: 0,
        currency: 'LYD',
        description: 'مجموع أرصدة الحسابات البنكية بالدينار',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '7',
        type: 'bank_usd',
        name: 'حسابات بنكية دولار',
        balance: 0,
        currency: 'USD',
        description: 'مجموع أرصدة الحسابات البنكية بالدولار',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '8',
        type: 'profits',
        name: 'الأرباح',
        balance: 0,
        currency: 'LYD',
        description: 'حساب الأرباح المتحققة',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  });

  // سجل الحركات المالية
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('treasuryTransactions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((txn: any) => ({
          ...txn,
          date: new Date(txn.date),
          createdAt: new Date(txn.createdAt),
        }));
      } catch {
        return [];
      }
    }
    return [];
  });

  // حفظ الحسابات في localStorage
  useEffect(() => {
    localStorage.setItem('treasuryAccounts', JSON.stringify(accounts));
  }, [accounts]);

  // حفظ الحركات في localStorage
  useEffect(() => {
    localStorage.setItem('treasuryTransactions', JSON.stringify(transactions));
  }, [transactions]);

  // الحصول على حساب معين
  const getAccount = (type: AccountType): Account | undefined => {
    return accounts.find(acc => acc.type === type);
  };

  // الحصول على رصيد حساب
  const getAccountBalance = (type: AccountType): number => {
    const account = getAccount(type);
    return account?.balance || 0;
  };

  // إضافة حركة مالية
  const addTransaction = (transaction: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: `TXN-${Date.now()}`,
      createdAt: new Date(),
    };

    // تحديث الأرصدة حسب نوع العملية
    setAccounts(prevAccounts => {
      return prevAccounts.map(account => {
        // عملية إيداع/سحب عادية
        if (transaction.type === 'deposit' && account.type === transaction.accountType) {
          return {
            ...account,
            balance: account.balance + transaction.amount,
            updatedAt: new Date(),
          };
        }
        
        if (transaction.type === 'withdrawal' && account.type === transaction.accountType) {
          return {
            ...account,
            balance: account.balance - transaction.amount,
            updatedAt: new Date(),
          };
        }

        // عملية إيداع رأس المال (يزيد رأس المال + يزيد حساب آخر)
        if (transaction.type === 'capital_deposit') {
          if (account.type === 'capital') {
            return {
              ...account,
              balance: account.balance + transaction.amount,
              updatedAt: new Date(),
            };
          }
          if (account.type === transaction.toAccount) {
            return {
              ...account,
              balance: account.balance + transaction.amount,
              updatedAt: new Date(),
            };
          }
        }

        // عملية توزيع (ينقص حساب التوزيع + يزيد حساب آخر)
        if (transaction.type === 'distribution') {
          if (account.type === 'distribution') {
            return {
              ...account,
              balance: account.balance - transaction.amount,
              updatedAt: new Date(),
            };
          }
          if (account.type === transaction.toAccount) {
            return {
              ...account,
              balance: account.balance + transaction.amount,
              updatedAt: new Date(),
            };
          }
        }

        return account;
      });
    });

    // إضافة الحركة إلى السجل
    setTransactions(prev => [newTransaction, ...prev]);
  };

  // الحصول على حركات حساب معين
  const getAccountTransactions = (type: AccountType): Transaction[] => {
    return transactions.filter(
      txn =>
        txn.accountType === type ||
        txn.fromAccount === type ||
        txn.toAccount === type
    );
  };

  // حساب إجمالي الأصول
  const getTotalAssets = () => {
    const lyd = accounts
      .filter(acc => acc.currency === 'LYD')
      .reduce((sum, acc) => sum + acc.balance, 0);

    const usd = accounts
      .filter(acc => acc.currency === 'USD')
      .reduce((sum, acc) => sum + acc.balance, 0);

    const usdt = accounts
      .filter(acc => acc.currency === 'USDT')
      .reduce((sum, acc) => sum + acc.balance, 0);

    return { lyd, usd, usdt };
  };

  // إعادة تعيين جميع البيانات
  const resetAllData = () => {
    // إعادة تعيين الأرصدة إلى صفر
    setAccounts(prevAccounts =>
      prevAccounts.map(acc => ({
        ...acc,
        balance: 0,
        updatedAt: new Date(),
      }))
    );

    // حذف جميع الحركات
    setTransactions([]);

    // حذف من localStorage
    localStorage.removeItem('treasuryAccounts');
    localStorage.removeItem('treasuryTransactions');
  };

  return (
    <AccountsContext.Provider
      value={{
        accounts,
        transactions,
        getAccount,
        getAccountBalance,
        addTransaction,
        getAccountTransactions,
        getTotalAssets,
        resetAllData,
      }}
    >
      {children}
    </AccountsContext.Provider>
  );
}

export function useAccounts() {
  const context = useContext(AccountsContext);
  if (!context) {
    throw new Error('useAccounts must be used within AccountsProvider');
  }
  return context;
}
