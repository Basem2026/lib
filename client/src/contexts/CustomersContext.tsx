import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Customer, Card, CustomerTransaction, CustomerAccount } from '@/types/customers';
import { trpc } from '@/lib/trpc';
import { useAuditLogs } from './AuditLogsContext';
import { useNotifications } from './NotificationsContext';
import { useAuth } from './AuthContext';
import { useSyncManager } from '@/hooks/useSyncManager';

interface CustomersContextType {
  // Customers
  customers: Customer[];
  addCustomer: (customer: Customer) => Promise<void>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<void>;
  removeCustomer: (id: string) => Promise<void>;
  getCustomer: (id: string) => Customer | undefined;
  searchCustomers: (query: string) => Customer[];
  getActiveCustomers: () => Customer[];
  getTotalCustomers: () => number;

  // Cards
  cards: Card[];
  addCard: (card: Card) => Promise<void>;
  updateCard: (id: string, updates: Partial<Card>) => Promise<void>;
  removeCard: (id: string) => Promise<void>;
  getCard: (id: string) => Card | undefined;
  getCardsByCustomer: (customerId: string) => Card[];
  getTotalCards: () => number;
  getTotalCardBalance: () => number;

  // Transactions
  transactions: CustomerTransaction[];
  addTransaction: (transaction: CustomerTransaction) => void;
  getTransactionsByCustomer: (customerId: string) => CustomerTransaction[];
  getTransactionsByCard: (cardId: string) => CustomerTransaction[];
  getTransactionsByType: (type: string) => CustomerTransaction[];

  // Accounts
  accounts: CustomerAccount[];
  addAccount: (account: CustomerAccount) => void;
  updateAccount: (id: string, updates: Partial<CustomerAccount>) => void;
  getAccountsByCustomer: (customerId: string) => CustomerAccount[];
  
  isLoading: boolean;
}

const CustomersContext = createContext<CustomersContextType | undefined>(undefined);

export const CustomersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { addLog } = useAuditLogs();
  const { addNotification } = useNotifications();
  const { user, isLoading: authLoading } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [transactions, setTransactions] = useState<CustomerTransaction[]>([]);
  const [accounts, setAccounts] = useState<CustomerAccount[]>([]);

  // استعلامات tRPC مع polling فوري
  const { data: customersData, isLoading: customersLoading, refetch: refetchCustomers } = trpc.customers.getAll.useQuery(undefined, {
    enabled: !authLoading && !!user,
    retry: false,
    refetchInterval: !authLoading && !!user ? 2000 : false, // تحديث كل ثانيتين فقط عند تسجيل الدخول
    refetchOnWindowFocus: true, // تحديث عند العودة للنافذة
    refetchOnReconnect: true, // تحديث عند استعادة الاتصال
  });
  
  const utils = trpc.useUtils();

  // نظام المزامنة الفورية - يستمع لأحداث التغيير من الأجهزة الأخرى
  useSyncManager({
    onCustomerChange: () => {
      utils.customers.getAll.invalidate();
    },
    onCardChange: () => {
      utils.cards.getAll.invalidate();
    },
    enabled: !authLoading && !!user,
  });

  const createCustomerMutation = trpc.customers.create.useMutation();
  const updateCustomerMutation = trpc.customers.update.useMutation();
  const deleteCustomerMutation = trpc.customers.delete.useMutation();

  // تحميل البيانات من قاعدة البيانات
  useEffect(() => {
    if (customersData) {
      const parsedCustomers = customersData.map((customer: any) => ({
        ...customer,
        registrationDate: new Date(customer.registrationDate),
        updatedAt: new Date(customer.updatedAt),
        passportExpiry: customer.passportExpiry ? new Date(customer.passportExpiry) : undefined,
        cardExpiry: customer.cardExpiry || undefined,
        purchasePrice: customer.purchasePrice ? parseFloat(customer.purchasePrice) : undefined,
        delegateShare: customer.delegateShare ? parseFloat(customer.delegateShare) : undefined,
        depositBalance: customer.depositBalance ? parseFloat(customer.depositBalance) : undefined,
        dinarBalance: customer.dinarBalance ? parseFloat(customer.dinarBalance) : undefined,
      }));
      setCustomers(parsedCustomers);
    }
  }, [customersData]);

  // تحميل Transactions و Accounts من localStorage (مؤقتاً)
  useEffect(() => {
    const storedTransactions = localStorage.getItem('transactions_data');
    const storedAccounts = localStorage.getItem('accounts_data');

    if (storedTransactions) {
      const parsed = JSON.parse(storedTransactions);
      setTransactions(parsed.map((t: any) => ({
        ...t,
        transactionDate: new Date(t.transactionDate),
        updatedAt: new Date(t.updatedAt),
      })));
    }

    if (storedAccounts) {
      const parsed = JSON.parse(storedAccounts);
      setAccounts(parsed.map((a: any) => ({
        ...a,
        createdAt: new Date(a.createdAt),
        updatedAt: new Date(a.updatedAt),
      })));
    }
  }, []);

  // Customer functions
  const addCustomer = useCallback(async (customer: Customer) => {
    await createCustomerMutation.mutateAsync(customer);
    // تحديث الـ cache فوراً
    await utils.customers.getAll.invalidate();
    await refetchCustomers();
    
    // تسجيل العملية
    addLog({
      logType: 'employee',
      actionType: 'add',
      entityType: 'customer',
      entityId: customer.id,
      entityName: customer.name,
      description: `إضافة زبون جديد: ${customer.name}`,
      after: {
        name: customer.name,
        phone: customer.phone,
        operationStatus: customer.operationStatus
      },
      changes: []
    });

    // إرسال إشعار للمدير
    addNotification({
      type: 'info',
      title: 'زبون جديد',
      message: `تم إضافة زبون جديد: ${customer.name} - ${customer.phone}`,
      targetRole: 'managers_and_alerts',
      actionUrl: `/customers/${customer.id}`,
      actionLabel: 'عرض التفاصيل'
    });
  }, [createCustomerMutation, refetchCustomers, addLog, addNotification]);

  const updateCustomer = useCallback(async (id: string, updates: Partial<Customer>) => {
    const oldCustomer = customers.find(c => c.id === id);
    
    await updateCustomerMutation.mutateAsync({
      id,
      updates: {
        ...updates,
        updatedAt: new Date(),
      },
    });
    // تحديث الـ cache فوراً
    await utils.customers.getAll.invalidate();
    await refetchCustomers();
    
    // تسجيل العملية
    if (oldCustomer) {
      const changes: any[] = [];
      Object.keys(updates).forEach(key => {
        if (key !== 'updatedAt' && (updates as any)[key] !== (oldCustomer as any)[key]) {
          changes.push({
            field: key,
            fieldLabel: key,
            oldValue: (oldCustomer as any)[key],
            newValue: (updates as any)[key]
          });
        }
      });
      
      addLog({
        logType: 'employee',
        actionType: 'edit',
        entityType: 'customer',
        entityId: id,
        entityName: oldCustomer.name,
        description: `تعديل بيانات زبون: ${oldCustomer.name}`,
        before: oldCustomer,
        after: { ...oldCustomer, ...updates },
        changes
      });
    }
  }, [updateCustomerMutation, refetchCustomers, customers, addLog]);

  const removeCustomer = useCallback(async (id: string) => {
    const oldCustomer = customers.find(c => c.id === id);
    
    await deleteCustomerMutation.mutateAsync({ id });
    // تحديث الـ cache فوراً
    await utils.customers.getAll.invalidate();
    await refetchCustomers();
    
    // تسجيل العملية
    if (oldCustomer) {
      addLog({
        logType: 'employee',
        actionType: 'delete',
        entityType: 'customer',
        entityId: id,
        entityName: oldCustomer.name,
        description: `حذف زبون: ${oldCustomer.name}`,
        before: oldCustomer,
        changes: []
      });
    }
  }, [deleteCustomerMutation, refetchCustomers, customers, addLog]);

  const getCustomer = useCallback((id: string) => {
    return customers.find(c => c.id === id);
  }, [customers]);

  const searchCustomers = useCallback((query: string) => {
    const lowerQuery = query.toLowerCase();
    return customers.filter(c =>
      c.name.toLowerCase().includes(lowerQuery) ||
      c.phone.includes(query) ||
      c.email?.toLowerCase().includes(lowerQuery) ||
      c.transactionNumber?.includes(query)
    );
  }, [customers]);

  const getActiveCustomers = useCallback(() => {
    return customers.filter(c => 
      c.operationStatus !== 'full_withdrawal' && 
      c.operationStatus !== 'ready_for_pickup'
    );
  }, [customers]);

  const getTotalCustomers = useCallback(() => {
    return customers.length;
  }, [customers]);

  // Card functions (مؤقتاً من localStorage)
  const addCard = useCallback(async (card: Card) => {
    const updated = [...cards, card];
    setCards(updated);
    localStorage.setItem('cards_data', JSON.stringify(updated));

    // إرسال إشعار للمدير
    const customer = customers.find(c => c.id === card.customerId);
    addNotification({
      type: 'info',
      title: 'بطاقة جديدة',
      message: `تم إضافة بطاقة جديدة للزبون: ${customer?.name || 'غير محدد'}`,
      targetRole: 'managers_and_alerts',
      actionUrl: `/customers/${card.customerId}`,
      actionLabel: 'عرض التفاصيل'
    });
  }, [cards, customers, addNotification]);

  const updateCard = useCallback(async (id: string, updates: Partial<Card>) => {
    const card = cards.find(c => c.id === id);
    const updated = cards.map(c => c.id === id ? { ...c, ...updates, updatedAt: new Date() } : c);
    setCards(updated);
    localStorage.setItem('cards_data', JSON.stringify(updated));

    // إرسال إشعار للمدير عند تغيير الحالة أو الرصيد
    if (updates.status || updates.balance !== undefined) {
      const customer = customers.find(c => c.id === card?.customerId);
      addNotification({
        type: 'info',
        title: 'تحديث بطاقة',
        message: `تم تحديث بطاقة للزبون: ${customer?.name || 'غير محدد'}`,
        targetRole: 'managers_and_alerts',
        actionUrl: `/customers/${card?.customerId}`,
        actionLabel: 'عرض التفاصيل'
      });
    }
  }, [cards, customers, addNotification]);

  const removeCard = useCallback(async (id: string) => {
    const updated = cards.filter(c => c.id !== id);
    setCards(updated);
    localStorage.setItem('cards_data', JSON.stringify(updated));
  }, [cards]);

  const getCard = useCallback((id: string) => {
    return cards.find(c => c.id === id);
  }, [cards]);

  const getCardsByCustomer = useCallback((customerId: string) => {
    return cards.filter(c => c.customerId === customerId);
  }, [cards]);

  const getTotalCards = useCallback(() => {
    return cards.length;
  }, [cards]);

  const getTotalCardBalance = useCallback(() => {
    return cards.reduce((sum, card) => sum + (card.balance || 0), 0);
  }, [cards]);

  // Transaction functions (localStorage)
  const addTransaction = useCallback((transaction: CustomerTransaction) => {
    const updated = [...transactions, transaction];
    setTransactions(updated);
    localStorage.setItem('transactions_data', JSON.stringify(updated));

    // إرسال إشعار للمدير
    const customer = customers.find(c => c.id === transaction.customerId);
    const typeLabel = transaction.type === 'deposit' ? 'إيداع' : transaction.type === 'withdrawal' ? 'سحب' : 'معاملة';
    addNotification({
      type: 'info',
      title: `${typeLabel} جديد`,
      message: `تم ${typeLabel} بقيمة ${transaction.amount} للزبون: ${customer?.name || 'غير محدد'}`,
      targetRole: 'managers_and_alerts',
      actionUrl: `/customers/${transaction.customerId}`,
      actionLabel: 'عرض التفاصيل'
    });
  }, [transactions, customers, addNotification]);

  const getTransactionsByCustomer = useCallback((customerId: string) => {
    return transactions.filter(t => t.customerId === customerId);
  }, [transactions]);

  const getTransactionsByCard = useCallback((cardId: string) => {
    return transactions.filter(t => t.cardId === cardId);
  }, [transactions]);

  const getTransactionsByType = useCallback((type: string) => {
    return transactions.filter(t => t.type === type);
  }, [transactions]);

  // Account functions (localStorage)
  const addAccount = useCallback((account: CustomerAccount) => {
    const updated = [...accounts, account];
    setAccounts(updated);
    localStorage.setItem('accounts_data', JSON.stringify(updated));
  }, [accounts]);

  const updateAccount = useCallback((id: string, updates: Partial<CustomerAccount>) => {
    const updated = accounts.map(a => a.id === id ? { ...a, ...updates, updatedAt: new Date() } : a);
    setAccounts(updated);
    localStorage.setItem('accounts_data', JSON.stringify(updated));
  }, [accounts]);

  const getAccountsByCustomer = useCallback((customerId: string) => {
    return accounts.filter(a => a.customerId === customerId);
  }, [accounts]);

  return (
    <CustomersContext.Provider
      value={{
        customers,
        addCustomer,
        updateCustomer,
        removeCustomer,
        getCustomer,
        searchCustomers,
        getActiveCustomers,
        getTotalCustomers,
        cards,
        addCard,
        updateCard,
        removeCard,
        getCard,
        getCardsByCustomer,
        getTotalCards,
        getTotalCardBalance,
        transactions,
        addTransaction,
        getTransactionsByCustomer,
        getTransactionsByCard,
        getTransactionsByType,
        accounts,
        addAccount,
        updateAccount,
        getAccountsByCustomer,
        isLoading: customersLoading,
      }}
    >
      {children}
    </CustomersContext.Provider>
  );
};

export const useCustomers = () => {
  const context = useContext(CustomersContext);
  if (!context) {
    throw new Error('useCustomers must be used within CustomersProvider');
  }
  return context;
};
