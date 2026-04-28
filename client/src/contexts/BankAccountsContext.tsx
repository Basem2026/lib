import React, { createContext, useContext, useState, useEffect } from 'react';

export interface BankAccount {
  id: string;
  fullName: string;
  accountNumber: string;
  iban: string;
  bank: string;
  branch: string;
  createdAt: string;
}

interface BankAccountsContextType {
  bankAccounts: BankAccount[];
  addBankAccount: (account: Omit<BankAccount, 'id' | 'createdAt'>) => void;
  deleteBankAccount: (id: string) => void;
  updateBankAccount: (id: string, account: Omit<BankAccount, 'id' | 'createdAt'>) => void;
}

const BankAccountsContext = createContext<BankAccountsContextType | undefined>(undefined);

export const BankAccountsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  // تحميل البيانات من localStorage عند بدء التطبيق
  useEffect(() => {
    const savedAccounts = localStorage.getItem('bankAccounts');
    if (savedAccounts) {
      try {
        setBankAccounts(JSON.parse(savedAccounts));
      } catch (error) {
        console.error('خطأ في تحميل الحسابات البنكية:', error);
      }
    }
  }, []);

  // حفظ البيانات في localStorage عند التحديث
  useEffect(() => {
    localStorage.setItem('bankAccounts', JSON.stringify(bankAccounts));
  }, [bankAccounts]);

  const addBankAccount = (account: Omit<BankAccount, 'id' | 'createdAt'>) => {
    const newAccount: BankAccount = {
      ...account,
      id: `BANK-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setBankAccounts([...bankAccounts, newAccount]);
  };

  const deleteBankAccount = (id: string) => {
    setBankAccounts(bankAccounts.filter(account => account.id !== id));
  };

  const updateBankAccount = (id: string, account: Omit<BankAccount, 'id' | 'createdAt'>) => {
    setBankAccounts(
      bankAccounts.map(acc =>
        acc.id === id
          ? { ...acc, ...account }
          : acc
      )
    );
  };

  return (
    <BankAccountsContext.Provider value={{ bankAccounts, addBankAccount, deleteBankAccount, updateBankAccount }}>
      {children}
    </BankAccountsContext.Provider>
  );
};

export const useBankAccounts = () => {
  const context = useContext(BankAccountsContext);
  if (!context) {
    throw new Error('useBankAccounts يجب أن يُستخدم داخل BankAccountsProvider');
  }
  return context;
};
