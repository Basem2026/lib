import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

/**
 * نوع الحساب البنكي للشركة
 */
export interface CompanyBankAccount {
  id: string;
  accountNumber: string;
  bankName: string;
  accountName: string;
  iban?: string;
  currency: 'LYD' | 'USD';
  createdAt: Date;
  createdBy: string;
}

interface CompanyBankAccountsContextType {
  accounts: CompanyBankAccount[];
  addAccount: (account: Omit<CompanyBankAccount, 'id' | 'createdAt'>) => void;
  deleteAccount: (id: string) => void;
  getAccountById: (id: string) => CompanyBankAccount | undefined;
  clearAll: () => void;
}

const CompanyBankAccountsContext = createContext<CompanyBankAccountsContextType | undefined>(undefined);

export function CompanyBankAccountsProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<CompanyBankAccount[]>([]);

  // تحميل البيانات من localStorage عند بدء التطبيق
  useEffect(() => {
    const saved = localStorage.getItem('companyBankAccounts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // تحويل التواريخ من string إلى Date
        const accountsWithDates = parsed.map((acc: any) => ({
          ...acc,
          createdAt: new Date(acc.createdAt),
        }));
        setAccounts(accountsWithDates);
      } catch (error) {
        console.error('خطأ في تحميل الحسابات البنكية:', error);
      }
    }
  }, []);

  // حفظ البيانات في localStorage عند كل تغيير
  useEffect(() => {
    if (accounts.length > 0) {
      localStorage.setItem('companyBankAccounts', JSON.stringify(accounts));
    }
  }, [accounts]);

  const addAccount = (account: Omit<CompanyBankAccount, 'id' | 'createdAt'>) => {
    const newAccount: CompanyBankAccount = {
      ...account,
      id: `ACC-${Date.now()}`,
      createdAt: new Date(),
    };
    setAccounts(prev => [...prev, newAccount]);
  };

  const deleteAccount = (id: string) => {
    setAccounts(prev => prev.filter(acc => acc.id !== id));
  };

  const getAccountById = (id: string) => {
    return accounts.find(acc => acc.id === id);
  };

  const clearAll = () => {
    setAccounts([]);
    localStorage.removeItem('companyBankAccounts');
  };

  return (
    <CompanyBankAccountsContext.Provider value={{ accounts, addAccount, deleteAccount, getAccountById, clearAll }}>
      {children}
    </CompanyBankAccountsContext.Provider>
  );
}

export function useCompanyBankAccounts() {
  const context = useContext(CompanyBankAccountsContext);
  if (!context) {
    throw new Error('useCompanyBankAccounts must be used within CompanyBankAccountsProvider');
  }
  return context;
}
