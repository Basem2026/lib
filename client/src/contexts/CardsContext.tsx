import React, { createContext, useContext, useEffect, useState } from 'react';
import { Card, CardsContextType, FinancialStatus, DocumentStatus, StatusChange } from '@/types/cards';
import { trpc } from '@/lib/trpc';
import { useAccounts } from './AccountsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from './NotificationsContext';

const CardsContext = createContext<CardsContextType | undefined>(undefined);

export function CardsProvider({ children }: { children: React.ReactNode }) {
  const [cards, setCards] = useState<Card[]>([]);
  const [nextTransactionId, setNextTransactionId] = useState(1);
  const { addTransaction } = useAccounts();
  const { user, isLoading: authLoading } = useAuth();
  const { addNotification } = useNotifications();

  // استعلامات tRPC
  const { data: cardsData, isLoading, refetch: refetchCards } = trpc.cards.getAll.useQuery(undefined, {
    enabled: !authLoading && !!user,
    retry: false,
  });

  const createCardMutation = trpc.cards.create.useMutation();
  const updateCardMutation = trpc.cards.update.useMutation();
  const deleteCardMutation = trpc.cards.delete.useMutation();

  // تحميل البيانات من قاعدة البيانات
  useEffect(() => {
    if (cardsData) {
      const parsedCards = cardsData.map((card: any) => ({
        ...card,
        createdAt: new Date(card.createdAt),
        updatedAt: new Date(card.updatedAt),
        purchaseDate: card.purchaseDate ? new Date(card.purchaseDate) : undefined,
        activationDate: card.activationDate ? new Date(card.activationDate) : undefined,
        depositDate: card.depositDate ? new Date(card.depositDate) : undefined,
        firstWithdrawalDate: card.firstWithdrawalDate ? new Date(card.firstWithdrawalDate) : undefined,
        secondWithdrawalDate: card.secondWithdrawalDate ? new Date(card.secondWithdrawalDate) : undefined,
        cardActivationPrice: card.cardActivationPrice ? parseFloat(card.cardActivationPrice) : undefined,
        totalPurchasePrice: card.totalPurchasePrice ? parseFloat(card.totalPurchasePrice) : undefined,
        depositAmount: card.depositAmount ? parseFloat(card.depositAmount) : undefined,
        cardDollarValue: card.cardDollarValue ? parseFloat(card.cardDollarValue) : undefined,
        sellDollarPrice: card.sellDollarPrice ? parseFloat(card.sellDollarPrice) : undefined,
        firstWithdrawalAmount: card.firstWithdrawalAmount ? parseFloat(card.firstWithdrawalAmount) : undefined,
        firstWithdrawalPercentage: card.firstWithdrawalPercentage ? parseFloat(card.firstWithdrawalPercentage) : undefined,
        firstWithdrawalHeld: card.firstWithdrawalHeld ? parseFloat(card.firstWithdrawalHeld) : undefined,
        firstWithdrawalReceived: card.firstWithdrawalReceived ? parseFloat(card.firstWithdrawalReceived) : undefined,
        firstProfit: card.firstProfit ? parseFloat(card.firstProfit) : undefined,
        secondWithdrawalAmount: card.secondWithdrawalAmount ? parseFloat(card.secondWithdrawalAmount) : undefined,
        secondWithdrawalPercentage: card.secondWithdrawalPercentage ? parseFloat(card.secondWithdrawalPercentage) : undefined,
        secondWithdrawalHeld: card.secondWithdrawalHeld ? parseFloat(card.secondWithdrawalHeld) : undefined,
        secondWithdrawalReceived: card.secondWithdrawalReceived ? parseFloat(card.secondWithdrawalReceived) : undefined,
        secondProfit: card.secondProfit ? parseFloat(card.secondProfit) : undefined,
        totalProfit: card.totalProfit ? parseFloat(card.totalProfit) : undefined,
        financialStatusHistory: card.financialStatusHistory ? JSON.parse(card.financialStatusHistory) : [],
        documentStatusHistory: card.documentStatusHistory ? JSON.parse(card.documentStatusHistory) : [],
      }));
      setCards(parsedCards);
      
      // حساب nextTransactionId
      if (parsedCards.length > 0) {
        const maxId = Math.max(...parsedCards.map((c: Card) => parseInt(c.transactionId) || 0));
        setNextTransactionId(maxId + 1);
      }
    }
  }, [cardsData]);

  const addCard = async (card: Card) => {
    const newCard = {
      ...card,
      transactionId: nextTransactionId.toString(),
      financialStatusHistory: [{
        status: card.financialStatus,
        changedAt: new Date(),
        changedBy: card.createdBy,
      }],
      documentStatusHistory: [{
        status: card.documentStatus,
        changedAt: new Date(),
        changedBy: card.createdBy,
      }],
    };
    
    await createCardMutation.mutateAsync(newCard);
    await refetchCards();
    setNextTransactionId(nextTransactionId + 1);
    
    // تسجيل شراء البطاقة في الخزينة
    if (card.totalPurchasePrice && card.totalPurchasePrice > 0) {
      addTransaction({
        type: 'withdrawal',
        accountType: 'cash_lyd',
        amount: card.totalPurchasePrice,
        currency: 'LYD',
        description: `شراء بطاقة - ${card.name} - رقم المعاملة: ${newCard.transactionId}`,
        reference: `CARD-${newCard.transactionId}`,
        date: new Date(),
        createdBy: user?.fullName || 'مستخدم',
      });
    }
  };

  const updateCard = async (id: string, updates: Partial<Card>) => {
    await updateCardMutation.mutateAsync({
      id,
      updates: {
        ...updates,
        updatedAt: new Date(),
      },
    });
    await refetchCards();
  };

  const deleteCard = async (id: string) => {
    await deleteCardMutation.mutateAsync({ 
      id,
      deletedBy: user?.id || 'unknown',
      deletedByName: user?.fullName || 'غير معروف',
    });
    await refetchCards();
  };

  const getCard = (id: string) => {
    return cards.find(card => card.transactionId === id);
  };

  const getCardsByCustomer = (customerId: string) => {
    return cards.filter(card => card.nationalId === customerId);
  };

  const getTotalCards = () => cards.length;

  const getTotalProfit = () => {
    return cards.reduce((sum, card) => sum + (card.totalProfit || 0), 0);
  };

  const getCardsByStatus = (status: FinancialStatus) => {
    return cards.filter(card => card.financialStatus === status);
  };

  const updateFinancialStatus = async (id: string, status: FinancialStatus, changedBy: string, reason?: string, depositPaymentMethod?: 'cash' | 'bank', depositBankAccount?: string) => {
    const card = cards.find(c => c.transactionId === id);
    if (!card) return;

    const newChange: StatusChange = {
      status,
      changedAt: new Date(),
      changedBy,
      reason,
    };

    await updateCardMutation.mutateAsync({
      id,
      updates: {
        financialStatus: status,
        financialStatusHistory: [...(card.financialStatusHistory || []), newChange],
        updatedAt: new Date(),
        updatedBy: changedBy,
      },
    });
    await refetchCards();

    // إشعار تلقائي للمسؤول عند تغيير الحالة المالية
    const isCriticalStatus = status === 'غير مطابق';
    addNotification({
      type: isCriticalStatus ? 'error' : 'info',
      title: isCriticalStatus ? '⚠️ تنبيه حرج: غير مطابق' : 'تغيير حالة مالية',
      message: isCriticalStatus
        ? `تم تصنيف المعاملة رقم ${id} (الزبون: ${card.name}) كغير مطابقة. يرجى مراجعة المعاملة فوراً.`
        : `تم تغيير الحالة المالية للمعاملة رقم ${id} (${card.name}) إلى: ${status}`,
      targetRole: 'managers_and_alerts',
      actionUrl: `/customers`,
      actionLabel: 'عرض الزبائن',
      relatedId: id,
    });
    
    // تسجيل في الخزينة حسب الحالة
    
    // عند الإيداع: ينقص من الكاش أو البنك حسب طريقة الدفع
    if (status === 'تم الإيداع' && card.depositAmount && card.depositAmount > 0) {
      const accountType = depositPaymentMethod === 'bank' && depositBankAccount 
        ? depositBankAccount 
        : 'cash_lyd';
      
      addTransaction({
        type: 'withdrawal',
        accountType: accountType as any,
        amount: card.depositAmount,
        currency: 'LYD',
        description: `إيداع بطاقة - ${card.name} - رقم المعاملة: ${card.transactionId}`,
        reference: `CARD-DEPOSIT-${card.transactionId}`,
        date: new Date(),
        createdBy: changedBy,
      });
    }
    
    // عند السحب الأول: يزيد الكاش بمبلغ firstDinarValue (القيمة بالدينار)
    if (status === 'تم السحب' && card.firstDinarValue && card.firstDinarValue > 0) {
      addTransaction({
        type: 'deposit',
        accountType: 'cash_lyd',
        amount: card.firstDinarValue,
        currency: 'LYD',
        description: `سحب أول من بطاقة - ${card.name} - رقم المعاملة: ${card.transactionId}`,
        reference: `CARD-WD1-${card.transactionId}`,
        date: new Date(),
        createdBy: changedBy,
      });
      
      // تسجيل الربح
      if (card.firstProfit && card.firstProfit > 0) {
        addTransaction({
          type: 'deposit',
          accountType: 'profits',
          amount: card.firstProfit,
          currency: 'LYD',
          description: `ربح سحب أول - ${card.name} - رقم المعاملة: ${card.transactionId}`,
          reference: `CARD-PROFIT1-${card.transactionId}`,
          date: new Date(),
          createdBy: changedBy,
        });
      }
    }
    
    // عند السحب بالكامل: يزيد الكاش بمبلغ secondDinarValue (قيمة المتبقي بدينار)
    if (status === 'تم السحب بالكامل' && card.secondDinarValue && card.secondDinarValue > 0) {
      addTransaction({
        type: 'deposit',
        accountType: 'cash_lyd',
        amount: card.secondDinarValue,
        currency: 'LYD',
        description: `سحب ثاني من بطاقة - ${card.name} - رقم المعاملة: ${card.transactionId}`,
        reference: `CARD-WD2-${card.transactionId}`,
        date: new Date(),
        createdBy: changedBy,
      });
      
      // تسجيل الربح
      if (card.secondProfit && card.secondProfit > 0) {
        addTransaction({
          type: 'deposit',
          accountType: 'profits',
          amount: card.secondProfit,
          currency: 'LYD',
          description: `ربح سحب ثاني - ${card.name} - رقم المعاملة: ${card.transactionId}`,
          reference: `CARD-PROFIT2-${card.transactionId}`,
          date: new Date(),
          createdBy: changedBy,
        });
      }
    }
  };

  const updateDocumentStatus = async (id: string, status: DocumentStatus, changedBy: string, reason?: string) => {
    const card = cards.find(c => c.transactionId === id);
    if (!card) return;

    const newChange: StatusChange = {
      status,
      changedAt: new Date(),
      changedBy,
      reason,
    };

    await updateCardMutation.mutateAsync({
      id,
      updates: {
        documentStatus: status,
        documentStatusHistory: [...(card.documentStatusHistory || []), newChange],
        updatedAt: new Date(),
        updatedBy: changedBy,
      },
    });
    await refetchCards();

    // إشعار تلقائي للمسؤول عند تغيير حالة المستندات
    addNotification({
      type: 'success',
      title: 'تغيير حالة المستندات',
      message: `تم تغيير حالة مستندات المعاملة رقم ${id} (${card.name}) إلى: ${status}`,
      targetRole: 'managers_and_alerts',
      actionUrl: `/customers`,
      actionLabel: 'عرض الزبائن',
      relatedId: id,
    });
  };

  return (
    <CardsContext.Provider value={{
      cards,
      addCard,
      updateCard,
      deleteCard,
      getCard,
      getCardsByCustomer,
      getTotalCards,
      getTotalProfit,
      getCardsByStatus,
      updateFinancialStatus,
      updateDocumentStatus,
    }}>
      {children}
    </CardsContext.Provider>
  );
}

export function useCards() {
  const context = useContext(CardsContext);
  if (!context) {
    throw new Error('useCards must be used within CardsProvider');
  }
  return context;
}
