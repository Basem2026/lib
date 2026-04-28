import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Operation, Deposit, Withdrawal, Transfer, Exchange, Payment, DailyOperationsSummary, OperationReceipt, DailyOperation } from '@/types/operations';
import { useNotifications } from './NotificationsContext';

interface OperationsContextType {
  // Daily Operations
  dailyOperations: DailyOperation[];
  addDailyOperation: (operation: Omit<DailyOperation, "id" | "operationNumber" | "date">) => void;
  updateDailyOperation: (id: string, updates: Partial<DailyOperation>) => void;
  deleteDailyOperation: (id: string) => void;
  getDailyOperationsByType: (type: string) => DailyOperation[];
  getDailyOperationsByDate: (date: Date) => DailyOperation[];

  // Operations
  operations: Operation[];
  addOperation: (operation: Operation) => void;
  getOperationsByDate: (date: Date) => Operation[];
  getOperationsByType: (type: string) => Operation[];
  getOperationsByStatus: (status: string) => Operation[];

  // Deposits
  deposits: Deposit[];
  addDeposit: (deposit: Deposit) => void;
  getTotalDeposits: () => number;
  getDepositsByMethod: (method: string) => Deposit[];

  // Withdrawals
  withdrawals: Withdrawal[];
  addWithdrawal: (withdrawal: Withdrawal) => void;
  getTotalWithdrawals: () => number;
  getWithdrawalsByMethod: (method: string) => Withdrawal[];

  // Transfers
  transfers: Transfer[];
  addTransfer: (transfer: Transfer) => void;
  getTotalTransfers: () => number;

  // Exchanges
  exchanges: Exchange[];
  addExchange: (exchange: Exchange) => void;
  getTotalExchanges: () => number;

  // Payments
  payments: Payment[];
  addPayment: (payment: Payment) => void;
  getTotalPayments: () => number;
  getPaymentsByType: (type: string) => Payment[];

  // Daily Summary
  dailySummaries: DailyOperationsSummary[];
  openDailyOperations: (openedBy: string) => void;
  closeDailyOperations: (id: string, closedBy: string) => void;
  getCurrentDailySummary: () => DailyOperationsSummary | null;
  updateDailySummary: (id: string, updates: Partial<DailyOperationsSummary>) => void;

  // Receipts
  receipts: OperationReceipt[];
  generateReceipt: (operationId: string, type: string, amount: number, currency: string, processedBy: string) => void;
  printReceipt: (receiptId: string, printedBy: string) => void;

  // Statistics
  getTotalOperationsAmount: () => number;
  getNetAmount: () => number;
  getDailyBalance: () => number;
}

const OperationsContext = createContext<OperationsContextType | undefined>(undefined);

export const OperationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { addNotification } = useNotifications();
  const [dailyOperations, setDailyOperations] = useState<DailyOperation[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [dailySummaries, setDailySummaries] = useState<DailyOperationsSummary[]>([]);
  const [receipts, setReceipts] = useState<OperationReceipt[]>([]);

  // Operation functions
  // Daily Operation functions
  const addDailyOperation = useCallback((operation: Omit<DailyOperation, "id" | "operationNumber" | "date">) => {
    // توليد الحقول المطلوبة تلقائياً
    const stored = localStorage.getItem('dailyOperations');
    const existingOperations = stored ? JSON.parse(stored) : [];
    const operationNumber = `DO-${String(existingOperations.length + 1).padStart(6, '0')}`;
    
    const fullOperation: DailyOperation = {
      ...operation,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      operationNumber,
      date: new Date(),
    };
    
    setDailyOperations(prev => [...prev, fullOperation]);
    localStorage.setItem('dailyOperations', JSON.stringify([...existingOperations, fullOperation]));

    // إرسال إشعار للمدير
    addNotification({
      type: 'info',
      title: 'عملية يومية جديدة',
      message: `تم إضافة عملية يومية جديدة - ${fullOperation.operationNumber}`,
      targetRole: 'managers_and_alerts',
      actionUrl: '/daily-operations',
      actionLabel: 'عرض العمليات'
    });
  }, [addNotification]);

  const updateDailyOperation = useCallback((id: string, updates: Partial<DailyOperation>) => {
    setDailyOperations(prev =>
      prev.map(op => op.id === id ? { ...op, ...updates, updatedAt: new Date() } : op)
    );
    // تحديث localStorage
    const stored = localStorage.getItem('dailyOperations');
    if (stored) {
      const operations = JSON.parse(stored);
      const updated = operations.map((op: DailyOperation) =>
        op.id === id ? { ...op, ...updates, updatedAt: new Date() } : op
      );
      localStorage.setItem('dailyOperations', JSON.stringify(updated));
    }
  }, []);

  const deleteDailyOperation = useCallback((id: string) => {
    setDailyOperations(prev => prev.filter(op => op.id !== id));
    // حذف من localStorage
    const stored = localStorage.getItem('dailyOperations');
    if (stored) {
      const operations = JSON.parse(stored);
      const filtered = operations.filter((op: DailyOperation) => op.id !== id);
      localStorage.setItem('dailyOperations', JSON.stringify(filtered));
    }
  }, []);

  const getDailyOperationsByType = useCallback((type: string) => {
    return dailyOperations.filter(op => op.operationType === type);
  }, [dailyOperations]);

  const getDailyOperationsByDate = useCallback((date: Date) => {
    const dateStr = date.toDateString();
    return dailyOperations.filter(op => new Date(op.date).toDateString() === dateStr);
  }, [dailyOperations]);

  const addOperation = useCallback((operation: Operation) => {
    setOperations(prev => [...prev, operation]);
  }, []);

  const getOperationsByDate = useCallback((date: Date) => {
    const dateStr = date.toDateString();
    return operations.filter(op => new Date(op.date).toDateString() === dateStr);
  }, [operations]);

  const getOperationsByType = useCallback((type: string) => {
    return operations.filter(op => op.type === type);
  }, [operations]);

  const getOperationsByStatus = useCallback((status: string) => {
    return operations.filter(op => op.status === status);
  }, [operations]);

  // Deposit functions
  const addDeposit = useCallback((deposit: Deposit) => {
    setDeposits(prev => [...prev, deposit]);
  }, []);

  const getTotalDeposits = useCallback(() => {
    return deposits.filter(d => d.status === 'completed').reduce((sum, d) => sum + d.amount, 0);
  }, [deposits]);

  const getDepositsByMethod = useCallback((method: string) => {
    return deposits.filter(d => d.depositMethod === method);
  }, [deposits]);

  // Withdrawal functions
  const addWithdrawal = useCallback((withdrawal: Withdrawal) => {
    setWithdrawals(prev => [...prev, withdrawal]);
  }, []);

  const getTotalWithdrawals = useCallback(() => {
    return withdrawals.filter(w => w.status === 'completed').reduce((sum, w) => sum + w.amount, 0);
  }, [withdrawals]);

  const getWithdrawalsByMethod = useCallback((method: string) => {
    return withdrawals.filter(w => w.withdrawalMethod === method);
  }, [withdrawals]);

  // Transfer functions
  const addTransfer = useCallback((transfer: Transfer) => {
    setTransfers(prev => [...prev, transfer]);
  }, []);

  const getTotalTransfers = useCallback(() => {
    return transfers.filter(t => t.status === 'completed').reduce((sum, t) => sum + t.amount, 0);
  }, [transfers]);

  // Exchange functions
  const addExchange = useCallback((exchange: Exchange) => {
    setExchanges(prev => [...prev, exchange]);
  }, []);

  const getTotalExchanges = useCallback(() => {
    return exchanges.filter(e => e.status === 'completed').reduce((sum, e) => sum + e.fromAmount, 0);
  }, [exchanges]);

  // Payment functions
  const addPayment = useCallback((payment: Payment) => {
    setPayments(prev => [...prev, payment]);
  }, []);

  const getTotalPayments = useCallback(() => {
    return payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0);
  }, [payments]);

  const getPaymentsByType = useCallback((type: string) => {
    return payments.filter(p => p.paymentType === type);
  }, [payments]);

  // Daily Summary functions
  const openDailyOperations = useCallback((openedBy: string) => {
    const newSummary: DailyOperationsSummary = {
      id: Date.now().toString(),
      date: new Date(),
      status: 'open',
      openedAt: new Date(),
      openedBy,
      totalDeposits: 0,
      totalDepositAmount: 0,
      depositsByMethod: { cash: 0, bank: 0, check: 0, mobile_wallet: 0 },
      totalWithdrawals: 0,
      totalWithdrawalAmount: 0,
      withdrawalsByMethod: { cash: 0, bank: 0, check: 0, mobile_wallet: 0 },
      totalTransfers: 0,
      totalTransferAmount: 0,
      totalExchanges: 0,
      totalExchangeAmount: 0,
      totalPayments: 0,
      totalPaymentAmount: 0,
      totalOperations: 0,
      totalAmount: 0,
      netAmount: 0,
      variance: 0,
      variancePercentage: 0,
      verified: false,
      timeline: [{
        timestamp: new Date(),
        action: 'فتح العمليات اليومية',
        user: openedBy,
        details: 'تم فتح العمليات اليومية'
      }]
    };
    setDailySummaries(prev => [...prev, newSummary]);
  }, []);

  const closeDailyOperations = useCallback((id: string, closedBy: string) => {
    setDailySummaries(prev =>
      prev.map(summary => {
        if (summary.id === id) {
          return {
            ...summary,
            status: 'closed',
            closedAt: new Date(),
            closedBy,
            timeline: [...summary.timeline, {
              timestamp: new Date(),
              action: 'إغلاق العمليات اليومية',
              user: closedBy,
              details: 'تم إغلاق العمليات اليومية'
            }]
          };
        }
        return summary;
      })
    );
  }, []);

  const getCurrentDailySummary = useCallback(() => {
    const today = new Date().toDateString();
    return dailySummaries.find(s => new Date(s.date).toDateString() === today && s.status === 'open') || null;
  }, [dailySummaries]);

  const updateDailySummary = useCallback((id: string, updates: Partial<DailyOperationsSummary>) => {
    setDailySummaries(prev =>
      prev.map(summary => summary.id === id ? { ...summary, ...updates } : summary)
    );
  }, []);

  // Receipt functions
  const generateReceipt = useCallback((operationId: string, type: string, amount: number, currency: string, processedBy: string) => {
    const newReceipt: OperationReceipt = {
      id: Date.now().toString(),
      operationId,
      receiptNumber: `RCP-${Date.now()}`,
      date: new Date(),
      type: type as any,
      amount,
      currency,
      status: 'generated',
      processedBy,
      printed: false,
    };
    setReceipts(prev => [...prev, newReceipt]);
  }, []);

  const printReceipt = useCallback((receiptId: string, printedBy: string) => {
    setReceipts(prev =>
      prev.map(receipt => 
        receipt.id === receiptId 
          ? { ...receipt, printed: true, printedAt: new Date(), printedBy }
          : receipt
      )
    );
  }, []);

  // Statistics functions
  const getTotalOperationsAmount = useCallback(() => {
    return getTotalDeposits() + getTotalWithdrawals() + getTotalTransfers() + getTotalPayments();
  }, [getTotalDeposits, getTotalWithdrawals, getTotalTransfers, getTotalPayments]);

  const getNetAmount = useCallback(() => {
    return getTotalDeposits() - getTotalWithdrawals();
  }, [getTotalDeposits, getTotalWithdrawals]);

  const getDailyBalance = useCallback(() => {
    const today = new Date().toDateString();
    const todayOperations = operations.filter(op => new Date(op.date).toDateString() === today);
    return todayOperations.reduce((sum, op) => {
      if (op.type === 'deposit') return sum + op.amount;
      if (op.type === 'withdrawal') return sum - op.amount;
      return sum;
    }, 0);
  }, [operations]);

  // تحميل العمليات اليومية من localStorage عند التحميل الأول
  useEffect(() => {
    const stored = localStorage.getItem('dailyOperations');
    if (stored) {
      try {
        const operations = JSON.parse(stored);
        setDailyOperations(operations);
      } catch (error) {
        console.error('Error loading daily operations:', error);
      }
    }
  }, []);

  return (
    <OperationsContext.Provider
      value={{
        dailyOperations,
        addDailyOperation,
        updateDailyOperation,
        deleteDailyOperation,
        getDailyOperationsByType,
        getDailyOperationsByDate,
        operations,
        addOperation,
        getOperationsByDate,
        getOperationsByType,
        getOperationsByStatus,
        deposits,
        addDeposit,
        getTotalDeposits,
        getDepositsByMethod,
        withdrawals,
        addWithdrawal,
        getTotalWithdrawals,
        getWithdrawalsByMethod,
        transfers,
        addTransfer,
        getTotalTransfers,
        exchanges,
        addExchange,
        getTotalExchanges,
        payments,
        addPayment,
        getTotalPayments,
        getPaymentsByType,
        dailySummaries,
        openDailyOperations,
        closeDailyOperations,
        getCurrentDailySummary,
        updateDailySummary,
        receipts,
        generateReceipt,
        printReceipt,
        getTotalOperationsAmount,
        getNetAmount,
        getDailyBalance,
      }}
    >
      {children}
    </OperationsContext.Provider>
  );
};

export const useOperations = () => {
  const context = useContext(OperationsContext);
  if (!context) {
    throw new Error('useOperations must be used within OperationsProvider');
  }
  return context;
};
