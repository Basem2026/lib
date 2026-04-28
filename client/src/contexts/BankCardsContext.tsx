/**
 * Context لإدارة أسعار البطاقات
 * يحفظ البيانات في localStorage
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface BankCardPrice {
  id: string;
  bankName: string;
  price: number;
  isVisible: boolean; // للتحكم في العرض/الإخفاء
}

interface BankCardsContextType {
  cards: BankCardPrice[];
  addCard: (card: Omit<BankCardPrice, 'id'>) => void;
  updateCard: (id: string, card: Omit<BankCardPrice, 'id'>) => void;
  deleteCard: (id: string) => void;
  toggleVisibility: (id: string) => void;
}

const BankCardsContext = createContext<BankCardsContextType | undefined>(undefined);

// بيانات افتراضية تظهر للمستخدمين الجدد - جميع المصارف الليبية
const DEFAULT_CARDS: BankCardPrice[] = [
  { id: 'default-1', bankName: 'مصرف الأمان', price: 1.50, isVisible: true },
  { id: 'default-2', bankName: 'مصرف شمال أفريقيا', price: 1.55, isVisible: true },
  { id: 'default-3', bankName: 'المصرف التجاري الوطني', price: 1.52, isVisible: true },
  { id: 'default-4', bankName: 'مصرف التجارة والتنمية', price: 1.48, isVisible: true },
  { id: 'default-5', bankName: 'مصرف الوحدة', price: 1.60, isVisible: true },
  { id: 'default-6', bankName: 'مصرف الجمهورية', price: 1.58, isVisible: true },
  { id: 'default-7', bankName: 'مصرف الصحاري', price: 1.65, isVisible: true },
  { id: 'default-8', bankName: 'مصرف النوران', price: 1.62, isVisible: true },
  { id: 'default-9', bankName: 'مصرف المتوسط', price: 1.54, isVisible: true },
  { id: 'default-10', bankName: 'مصرف الادخار والاستثمار', price: 1.56, isVisible: true },
  { id: 'default-11', bankName: 'مصرف الوفاء', price: 1.59, isVisible: true },
  { id: 'default-12', bankName: 'مصرف التجارة والتنمية المتحد', price: 1.51, isVisible: true },
  { id: 'default-13', bankName: 'مصرف الخليج الأول', price: 1.57, isVisible: true },
  { id: 'default-14', bankName: 'مصرف المتحد', price: 1.53, isVisible: true },
];

export function BankCardsProvider({ children }: { children: ReactNode }) {
  const [cards, setCards] = useState<BankCardPrice[]>(DEFAULT_CARDS);

  // تحميل البيانات من localStorage عند البداية
  useEffect(() => {
    const saved = localStorage.getItem('bankCards');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // تأكد من أن price هو number
        const normalized = parsed.map((card: any) => ({
          ...card,
          price: typeof card.price === 'number' ? card.price : parseFloat(card.price) || 0,
        }));
        setCards(normalized);
      } catch (e) {
        console.error('Failed to load bank cards:', e);
      }
    }
  }, []);

  // حفظ البيانات في localStorage عند التغيير
  useEffect(() => {
    localStorage.setItem('bankCards', JSON.stringify(cards));
  }, [cards]);

  const addCard = (card: Omit<BankCardPrice, 'id'>) => {
    const newCard: BankCardPrice = {
      ...card,
      price: typeof card.price === 'number' ? card.price : parseFloat(String(card.price)) || 0,
      id: Date.now().toString(),
    };
    setCards(prev => [...prev, newCard]);
  };

  const updateCard = (id: string, card: Omit<BankCardPrice, 'id'>) => {
    setCards(prev =>
      prev.map(c => (c.id === id ? { 
        ...card, 
        price: typeof card.price === 'number' ? card.price : parseFloat(String(card.price)) || 0,
        id 
      } : c))
    );
  };

  const deleteCard = (id: string) => {
    setCards(prev => prev.filter(c => c.id !== id));
  };

  const toggleVisibility = (id: string) => {
    setCards(prev =>
      prev.map(c => (c.id === id ? { ...c, isVisible: !c.isVisible } : c))
    );
  };

  return (
    <BankCardsContext.Provider value={{ cards, addCard, updateCard, deleteCard, toggleVisibility }}>
      {children}
    </BankCardsContext.Provider>
  );
}

export function useBankCards() {
  const context = useContext(BankCardsContext);
  if (!context) {
    throw new Error('useBankCards must be used within BankCardsProvider');
  }
  return context;
}
