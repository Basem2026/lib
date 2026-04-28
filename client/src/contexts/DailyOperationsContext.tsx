import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  DailyOperation,
  DayClose,
  OperationType,
  PaymentMethod,
  CardWithdrawalFormData,
  TransferFormData,
  AmanExchangeFormData,
  BuyUSDFormData,
  SellUSDFormData,
  USDCardWithdrawalFormData,
} from '@/types/dailyOperations';
import { useDepartments } from './DepartmentsContext';
import { useAccounts } from './AccountsContext';
// تم إزالة ربط الخزينة مؤقتاً - سيتم إعادة ربطه لاحقاً بطريقة مبسطة

interface DailyOperationsContextType {
  // العمليات
  operations: DailyOperation[];
  activeOperations: DailyOperation[];
  closedDays: DayClose[];
  
  // إضافة عمليات
  addCardWithdrawal: (data: CardWithdrawalFormData, createdBy: string) => Promise<{ success: boolean; error?: string }>;
  addTransfer: (data: TransferFormData, createdBy: string) => Promise<{ success: boolean; error?: string }>;
  addAmanExchange: (data: AmanExchangeFormData, createdBy: string) => Promise<{ success: boolean; error?: string }>;
  addBuyUSD: (data: BuyUSDFormData, createdBy: string) => Promise<{ success: boolean; error?: string }>;
  addSellUSD: (data: SellUSDFormData, createdBy: string) => Promise<{ success: boolean; error?: string }>;
  addUSDCardWithdrawal: (data: USDCardWithdrawalFormData, createdBy: string) => Promise<{ success: boolean; error?: string }>;
  
  // إغلاق اليوم
  closeDay: (closedBy: string) => Promise<{ success: boolean; error?: string; dayClose?: DayClose }>;
  
  // الاستعلامات
  getActiveOperations: () => DailyOperation[];
  getClosedDays: () => DayClose[];
  getDayCloseById: (id: string) => DayClose | undefined;
  
  isLoading: boolean;
}

const DailyOperationsContext = createContext<DailyOperationsContextType | undefined>(undefined);

export const DailyOperationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [operations, setOperations] = useState<DailyOperation[]>([]);
  const [closedDays, setClosedDays] = useState<DayClose[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const { deposit, withdraw } = useDepartments();
  const { addTransaction } = useAccounts();

  // تحميل البيانات من localStorage
  useEffect(() => {
    const savedOps = localStorage.getItem('dailyOperations');
    const savedClosedDays = localStorage.getItem('closedDays');
    
    if (savedOps) {
      try {
        const parsed = JSON.parse(savedOps);
        setOperations(parsed.map((op: any) => ({
          ...op,
          date: new Date(op.date),
          createdAt: new Date(op.createdAt),
        })));
      } catch (e) {
        console.error('Failed to load daily operations:', e);
      }
    }
    
    if (savedClosedDays) {
      try {
        const parsed = JSON.parse(savedClosedDays);
        setClosedDays(parsed.map((dc: any) => ({
          ...dc,
          date: new Date(dc.date),
          closedAt: new Date(dc.closedAt),
          operations: dc.operations.map((op: any) => ({
            ...op,
            date: new Date(op.date),
            createdAt: new Date(op.createdAt),
          })),
        })));
      } catch (e) {
        console.error('Failed to load closed days:', e);
      }
    }
    
    setIsInitialized(true);
  }, []);

  // حفظ التغييرات في localStorage
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('dailyOperations', JSON.stringify(operations));
    }
  }, [operations, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('closedDays', JSON.stringify(closedDays));
    }
  }, [closedDays, isInitialized]);

  // توليد رقم عملية تلقائي
  const generateOperationNumber = useCallback((): string => {
    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const todayOps = operations.filter(op => {
      const opDate = new Date(op.date);
      return opDate.toDateString() === today.toDateString() && op.status === 'active';
    });
    const nextNum = todayOps.length + 1;
    return `OP-${dateStr}-${String(nextNum).padStart(4, '0')}`;
  }, [operations]);

  // (أ) سحب بطاقة
  const addCardWithdrawal = useCallback(async (
    data: CardWithdrawalFormData,
    createdBy: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // الحسابات
      const delivered = data.receivedLYD * (1 - data.percentage / 100);
      const profit = data.receivedLYD - delivered;

      // خصم من قسم البطاقات (كاش أو مصرف)
      const withdrawResult = await withdraw(
        'cards',
        data.paymentMethod === 'cash' ? 'cash_lyd' : 'bank_other',
        delivered,
        undefined,
        'card_withdrawal',
        `سحب بطاقة - ${data.operationName}`,
        createdBy
      );

      if (!withdrawResult.success) {
        return { success: false, error: `فشل الخصم من قسم البطاقات: ${withdrawResult.error}` };
      }

      // إيداع في قسم العمليات اليومية
      const depositResult = await deposit(
        'daily_operations',
        data.paymentMethod === 'cash' ? 'cash_lyd' : 'bank_other',
        data.receivedLYD,
        undefined,
        'card_withdrawal',
        `سحب بطاقة - ${data.operationName}`,
        createdBy
      );

      if (!depositResult.success) {
        return { success: false, error: `فشل الإيداع في قسم العمليات اليومية: ${depositResult.error}` };
      }

      // إضافة العملية
      const newOperation: DailyOperation = {
        id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        operationNumber: generateOperationNumber(),
        date: new Date(),
        operationName: data.operationName,
        operationType: 'card_withdrawal',
        receivedLYD: data.receivedLYD,
        receivedUSD: 0,
        percentage: data.percentage,
        deliveredLYD: delivered,
        deliveredUSD: 0,
        profit,
        referenceRate: 0,
        paymentMethod: data.paymentMethod,
        bankAccountId: data.bankAccountId,
        notes: data.notes,
        createdAt: new Date(),
        createdBy,
        status: 'active',
      };

      setOperations(prev => [...prev, newOperation]);
      
      // TODO: ربط بالخزينة الجديدة
      
      return { success: true };
    } catch (error) {
      console.error('Error adding card withdrawal:', error);
      return { success: false, error: 'حدث خطأ أثناء إضافة العملية' };
    }
  }, [generateOperationNumber, withdraw, deposit]);

  // (ب) تحويلات/إيداعات
  const addTransfer = useCallback(async (
    data: TransferFormData,
    createdBy: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const percentage = data.percentage || 0;
      let receivedLYD = 0, receivedUSD = 0, deliveredLYD = 0, deliveredUSD = 0, profit = 0;

      if (data.transferDirection === 'from_us') {
        // نحول منه (نحن ندفع)
        if (data.currency === 'LYD') {
          deliveredLYD = data.amount;
          receivedLYD = data.amount * (1 - percentage / 100);
          profit = deliveredLYD - receivedLYD;
        } else {
          deliveredUSD = data.amount;
          receivedUSD = data.amount * (1 - percentage / 100);
          profit = deliveredUSD - receivedUSD;
        }

        // خصم من قسم العمليات اليومية
        const accountType = data.currency === 'LYD' 
          ? (data.paymentMethod === 'cash' ? 'cash_lyd' : 'bank_other')
          : 'cash_usd';
        
        const withdrawResult = await withdraw(
          'daily_operations',
          accountType,
          data.amount,
          undefined,
          'transfer',
          `تحويل - ${data.operationName}`,
          createdBy
        );

        if (!withdrawResult.success) {
          return { success: false, error: `فشل الخصم: ${withdrawResult.error}` };
        }
      } else {
        // نستلم عليه (الزبون يحول لنا)
        if (data.currency === 'LYD') {
          receivedLYD = data.amount;
          deliveredLYD = data.amount * (1 - percentage / 100);
          profit = receivedLYD - deliveredLYD;
        } else {
          receivedUSD = data.amount;
          deliveredUSD = data.amount * (1 - percentage / 100);
          profit = receivedUSD - deliveredUSD;
        }

        // إيداع في قسم العمليات اليومية
        const accountType = data.currency === 'LYD' 
          ? (data.paymentMethod === 'cash' ? 'cash_lyd' : 'bank_other')
          : 'cash_usd';
        
        const depositResult = await deposit(
          'daily_operations',
          accountType,
          data.amount,
          undefined,
          'transfer',
          `تحويل - ${data.operationName}`,
          createdBy
        );

        if (!depositResult.success) {
          return { success: false, error: `فشل الإيداع: ${depositResult.error}` };
        }
      }

      const newOperation: DailyOperation = {
        id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        operationNumber: generateOperationNumber(),
        date: new Date(),
        operationName: data.operationName,
        operationType: 'transfer',
        receivedLYD,
        receivedUSD,
        percentage,
        deliveredLYD,
        deliveredUSD,
        profit,
        referenceRate: 0,
        paymentMethod: data.paymentMethod,
        bankAccountId: data.bankAccountId,
        transferDirection: data.transferDirection,
        notes: data.notes,
        createdAt: new Date(),
        createdBy,
        status: 'active',
      };

      setOperations(prev => [...prev, newOperation]);
      
      // TODO: ربط بالخزينة الجديدة
      
      return { success: true };
    } catch (error) {
      console.error('Error adding transfer:', error);
      return { success: false, error: 'حدث خطأ أثناء إضافة العملية' };
    }
  }, [generateOperationNumber, withdraw, deposit]);

  // (ج) صيرفة الأمان
  const addAmanExchange = useCallback(async (
    data: AmanExchangeFormData,
    createdBy: string
  ): Promise<{ success: boolean; error?: string }> => {
    // نفس منطق التحويلات + تحديد نوع الخدمة
    try {
      const percentage = data.percentage || 0;
      let receivedLYD = 0, receivedUSD = 0, deliveredLYD = 0, deliveredUSD = 0, profit = 0;

      if (data.transferDirection === 'from_us') {
        if (data.currency === 'LYD') {
          deliveredLYD = data.amount;
          receivedLYD = data.amount * (1 - percentage / 100);
          profit = deliveredLYD - receivedLYD;
        } else {
          deliveredUSD = data.amount;
          receivedUSD = data.amount * (1 - percentage / 100);
          profit = deliveredUSD - receivedUSD;
        }

        const accountType = data.currency === 'LYD' 
          ? (data.paymentMethod === 'cash' ? 'cash_lyd' : 'bank_other')
          : 'cash_usd';
        
        const withdrawResult = await withdraw(
          'daily_operations',
          accountType,
          data.amount,
          undefined,
          'other',
          `صيرفة الأمان - ${data.operationName}`,
          createdBy
        );

        if (!withdrawResult.success) {
          return { success: false, error: `فشل الخصم: ${withdrawResult.error}` };
        }
      } else {
        if (data.currency === 'LYD') {
          receivedLYD = data.amount;
          deliveredLYD = data.amount * (1 - percentage / 100);
          profit = receivedLYD - deliveredLYD;
        } else {
          receivedUSD = data.amount;
          deliveredUSD = data.amount * (1 - percentage / 100);
          profit = receivedUSD - deliveredUSD;
        }

        const accountType = data.currency === 'LYD' 
          ? (data.paymentMethod === 'cash' ? 'cash_lyd' : 'bank_other')
          : 'cash_usd';
        
        const depositResult = await deposit(
          'daily_operations',
          accountType,
          data.amount,
          undefined,
          'other',
          `صيرفة الأمان - ${data.operationName}`,
          createdBy
        );

        if (!depositResult.success) {
          return { success: false, error: `فشل الإيداع: ${depositResult.error}` };
        }
      }

      const newOperation: DailyOperation = {
        id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        operationNumber: generateOperationNumber(),
        date: new Date(),
        operationName: data.operationName,
        operationType: 'aman_exchange',
        receivedLYD,
        receivedUSD,
        percentage,
        deliveredLYD,
        deliveredUSD,
        profit,
        referenceRate: 0,
        paymentMethod: data.paymentMethod,
        bankAccountId: data.bankAccountId,
        transferDirection: data.transferDirection,
        amanServiceType: data.serviceType,
        notes: data.notes,
        createdAt: new Date(),
        createdBy,
        status: 'active',
      };

      setOperations(prev => [...prev, newOperation]);
      
      // ربط بالخزينة (نفس منطق التحويلات)
      let entries;
      if (data.transferDirection === 'from_us') {
        // TODO: ربط بالخزينة الجديدة
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error adding aman exchange:', error);
      return { success: false, error: 'حدث خطأ أثناء إضافة العملية' };
    }
  }, [generateOperationNumber, withdraw, deposit]);

  // (د) شراء دولار/USDT
  const addBuyUSD = useCallback(async (
    data: BuyUSDFormData,
    createdBy: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const referenceRate = data.deliveredLYD / data.receivedUSD;

      // خصم دينار من قسم العمليات اليومية
      const withdrawResult = await withdraw(
        'daily_operations',
        data.paymentMethod === 'cash' ? 'cash_lyd' : 'bank_other',
        data.deliveredLYD,
        undefined,
        'other',
        `شراء ${data.currency} - ${data.operationName}`,
        createdBy
      );

      if (!withdrawResult.success) {
        return { success: false, error: `فشل خصم الدينار: ${withdrawResult.error}` };
      }

      // إيداع دولار في قسم العمليات اليومية
      const depositResult = await deposit(
        'daily_operations',
        data.currency === 'USD' ? 'cash_usd' : 'cash_usdt',
        data.receivedUSD,
        undefined,
        'other',
        `شراء ${data.currency} - ${data.operationName}`,
        createdBy
      );

      if (!depositResult.success) {
        return { success: false, error: `فشل إيداع الدولار: ${depositResult.error}` };
      }

      const newOperation: DailyOperation = {
        id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        operationNumber: generateOperationNumber(),
        date: new Date(),
        operationName: data.operationName,
        operationType: 'buy_usd',
        receivedLYD: 0,
        receivedUSD: data.receivedUSD,
        percentage: 0,
        deliveredLYD: data.deliveredLYD,
        deliveredUSD: 0,
        profit: 0, // شراء فقط
        referenceRate,
        paymentMethod: data.paymentMethod,
        bankAccountId: data.bankAccountId,
        notes: data.notes,
        createdAt: new Date(),
        createdBy,
        status: 'active',
      };

      setOperations(prev => [...prev, newOperation]);
      
      // ربط بالخزينة
      // TODO: ربط بالخزينة الجديدة
      
      return { success: true };
    } catch (error) {
      console.error('Error adding buy USD:', error);
      return { success: false, error: 'حدث خطأ أثناء إضافة العملية' };
    }
  }, [generateOperationNumber, withdraw, deposit]);

  // (هـ) بيع دولار/USDT
  const addSellUSD = useCallback(async (
    data: SellUSDFormData,
    createdBy: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const sellRate = data.receivedLYD / data.deliveredUSD;
      const profit = (sellRate - data.referenceRate) * data.deliveredUSD;

      // خصم دولار من قسم العمليات اليومية
      const withdrawResult = await withdraw(
        'daily_operations',
        data.currency === 'USD' ? 'cash_usd' : 'cash_usdt',
        data.deliveredUSD,
        undefined,
        'other',
        `بيع ${data.currency} - ${data.operationName}`,
        createdBy
      );

      if (!withdrawResult.success) {
        return { success: false, error: `فشل خصم الدولار: ${withdrawResult.error}` };
      }

      // إيداع دينار في قسم العمليات اليومية
      const depositResult = await deposit(
        'daily_operations',
        data.paymentMethod === 'cash' ? 'cash_lyd' : 'bank_other',
        data.receivedLYD,
        undefined,
        'other',
        `بيع ${data.currency} - ${data.operationName}`,
        createdBy
      );

      if (!depositResult.success) {
        return { success: false, error: `فشل إيداع الدينار: ${depositResult.error}` };
      }

      const newOperation: DailyOperation = {
        id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        operationNumber: generateOperationNumber(),
        date: new Date(),
        operationName: data.operationName,
        operationType: 'sell_usd',
        receivedLYD: data.receivedLYD,
        receivedUSD: 0,
        percentage: 0,
        deliveredLYD: 0,
        deliveredUSD: data.deliveredUSD,
        profit,
        referenceRate: data.referenceRate,
        paymentMethod: data.paymentMethod,
        bankAccountId: data.bankAccountId,
        notes: data.notes,
        createdAt: new Date(),
        createdBy,
        status: 'active',
      };

      setOperations(prev => [...prev, newOperation]);
      
      // TODO: ربط بالخزينة الجديدة
      
      return { success: true };
    } catch (error) {
      console.error('Error adding sell USD:', error);
      return { success: false, error: 'حدث خطأ أثناء إضافة العملية' };
    }
  }, [generateOperationNumber, withdraw, deposit]);

  // (و) سحب بطاقات الدولار
  const addUSDCardWithdrawal = useCallback(async (
    data: USDCardWithdrawalFormData,
    createdBy: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const totalPercentage = data.machinePercentage + data.companyPercentage;
      const deliveredUSD = data.receivedUSD * (1 - totalPercentage / 100);
      const profitInLYD = (data.receivedUSD - deliveredUSD) * data.marketRate;
      
      // إذا كان هناك سعر بيع لاحق، نحسب فرق السعر
      const laterProfit = data.laterSellRate 
        ? (data.laterSellRate - data.marketRate) * data.receivedUSD
        : 0;
      
      const totalProfit = profitInLYD + laterProfit;

      // خصم دولار من قسم البطاقات
      const withdrawResult = await withdraw(
        'cards',
        'cash_usd',
        deliveredUSD,
        undefined,
        'card_withdrawal',
        `سحب بطاقة دولار - ${data.operationName}`,
        createdBy
      );

      if (!withdrawResult.success) {
        return { success: false, error: `فشل خصم الدولار: ${withdrawResult.error}` };
      }

      // إيداع دولار في قسم العمليات اليومية
      const depositResult = await deposit(
        'daily_operations',
        'cash_usd',
        data.receivedUSD,
        undefined,
        'card_withdrawal',
        `سحب بطاقة دولار - ${data.operationName}`,
        createdBy
      );

      if (!depositResult.success) {
        return { success: false, error: `فشل إيداع الدولار: ${depositResult.error}` };
      }

      const newOperation: DailyOperation = {
        id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        operationNumber: generateOperationNumber(),
        date: new Date(),
        operationName: data.operationName,
        operationType: 'usd_card_withdrawal',
        receivedLYD: 0,
        receivedUSD: data.receivedUSD,
        percentage: 0,
        deliveredLYD: 0,
        deliveredUSD,
        profit: totalProfit,
        referenceRate: 0,
        machinePercentage: data.machinePercentage,
        companyPercentage: data.companyPercentage,
        totalPercentage,
        marketRate: data.marketRate,
        laterSellRate: data.laterSellRate,
        paymentMethod: data.paymentMethod,
        bankAccountId: data.bankAccountId,
        notes: data.notes,
        createdAt: new Date(),
        createdBy,
        status: 'active',
      };

      setOperations(prev => [...prev, newOperation]);
      
      // TODO: ربط بالخزينة الجديدة
      
      return { success: true };
    } catch (error) {
      console.error('Error adding USD card withdrawal:', error);
      return { success: false, error: 'حدث خطأ أثناء إضافة العملية' };
    }
  }, [generateOperationNumber, withdraw, deposit]);

  // إغلاق اليوم
  const closeDay = useCallback(async (
    closedBy: string
  ): Promise<{ success: boolean; error?: string; dayClose?: DayClose }> => {
    try {
      const activeOps = operations.filter(op => op.status === 'active');
      
      if (activeOps.length === 0) {
        return { success: false, error: 'لا توجد عمليات نشطة لإغلاقها' };
      }

      const totalProfit = activeOps.reduce((sum, op) => sum + op.profit, 0);
      const totalReceivedLYD = activeOps.reduce((sum, op) => sum + op.receivedLYD, 0);
      const totalReceivedUSD = activeOps.reduce((sum, op) => sum + op.receivedUSD, 0);
      const totalDeliveredLYD = activeOps.reduce((sum, op) => sum + op.deliveredLYD, 0);
      const totalDeliveredUSD = activeOps.reduce((sum, op) => sum + op.deliveredUSD, 0);

      const dayClose: DayClose = {
        id: `dc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        date: new Date(),
        operations: activeOps,
        totalProfit,
        totalReceivedLYD,
        totalReceivedUSD,
        totalDeliveredLYD,
        totalDeliveredUSD,
        operationsCount: activeOps.length,
        closedAt: new Date(),
        closedBy,
      };

      // تحديث حالة العمليات إلى مقفولة
      setOperations(prev => prev.map(op => 
        op.status === 'active' ? { ...op, status: 'closed' as const, dayCloseId: dayClose.id } : op
      ));

      // إضافة إلى الأيام المقفولة
      setClosedDays(prev => [...prev, dayClose]);

      return { success: true, dayClose };
    } catch (error) {
      console.error('Error closing day:', error);
      return { success: false, error: 'حدث خطأ أثناء إغلاق اليوم' };
    }
  }, [operations]);

  const getActiveOperations = useCallback((): DailyOperation[] => {
    return operations.filter(op => op.status === 'active');
  }, [operations]);

  const getClosedDays = useCallback((): DayClose[] => {
    return closedDays;
  }, [closedDays]);

  const getDayCloseById = useCallback((id: string): DayClose | undefined => {
    return closedDays.find(dc => dc.id === id);
  }, [closedDays]);

  return (
    <DailyOperationsContext.Provider
      value={{
        operations,
        activeOperations: getActiveOperations(),
        closedDays,
        addCardWithdrawal,
        addTransfer,
        addAmanExchange,
        addBuyUSD,
        addSellUSD,
        addUSDCardWithdrawal,
        closeDay,
        getActiveOperations,
        getClosedDays,
        getDayCloseById,
        isLoading: false,
      }}
    >
      {children}
    </DailyOperationsContext.Provider>
  );
};

export const useDailyOperations = () => {
  const context = useContext(DailyOperationsContext);
  if (!context) {
    throw new Error('useDailyOperations must be used within DailyOperationsProvider');
  }
  return context;
};
