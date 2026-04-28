import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

/**
 * نظام إدارة الخدمات
 * Services Management Context
 */

// أنواع الخدمات
export type ServiceType = 'dollar_withdrawal' | 'personal_cards' | 'transfers' | 'local_withdrawal';

// خدمة سحب البطاقات الدولار
export interface DollarWithdrawalService {
  id: 'dollar_withdrawal';
  name: string;
  description: string;
  image: string;
  withdrawalRate: number; // نسبة السحب (%)
}

// خدمة بطاقات الأغراض الشخصية
export interface PersonalCardsService {
  id: 'personal_cards';
  name: string;
  description: string;
  image: string;
  purchasePrice: number; // سعر الشراء
  bankName: string; // اسم المصرف
}

// خدمة التحويلات
export interface TransfersService {
  id: 'transfers';
  name: string;
  description: string;
  image: string;
  types: {
    name: string; // نوع الخدمة (مثل: تحويل من وإلى الحسابات)
    price: number; // السعر
    rate: number; // النسبة (%)
  }[];
}

// خدمة سحب بطاقات محلية
export interface LocalWithdrawalService {
  id: 'local_withdrawal';
  name: string;
  description: string;
  image: string;
  withdrawalRate: number; // النسبة (%)
}

// جميع الخدمات
export type Service = DollarWithdrawalService | PersonalCardsService | TransfersService | LocalWithdrawalService;

interface ServicesContextType {
  services: {
    dollarWithdrawal: DollarWithdrawalService;
    personalCards: PersonalCardsService;
    transfers: TransfersService;
    localWithdrawal: LocalWithdrawalService;
  };
  updateDollarWithdrawal: (data: Partial<DollarWithdrawalService>) => void;
  updatePersonalCards: (data: Partial<PersonalCardsService>) => void;
  updateTransfers: (data: Partial<TransfersService>) => void;
  updateLocalWithdrawal: (data: Partial<LocalWithdrawalService>) => void;
}

const ServicesContext = createContext<ServicesContextType | undefined>(undefined);

// البيانات الافتراضية
const DEFAULT_SERVICES = {
  dollarWithdrawal: {
    id: 'dollar_withdrawal' as const,
    name: 'سحب البطاقات الدولار',
    description: 'خدمات سحب بطاقات الدولار من مصرف الأمان',
    image: '/images/IMG_5788.JPG',
    withdrawalRate: 1.5,
  },
  personalCards: {
    id: 'personal_cards' as const,
    name: 'بطاقات الأغراض الشخصية',
    description: 'بطاقات الدولار الخاصة بمصرف الأمان',
    image: '/images/IMG_5783.PNG',
    purchasePrice: 0,
    bankName: 'مصرف الأمان',
  },
  transfers: {
    id: 'transfers' as const,
    name: 'التحويلات',
    description: 'خدمات التحويلات والإيداعات',
    image: '/images/IMG_5789.WEBP',
    types: [
      { name: 'تحويل من وإلى الحسابات', price: 0, rate: 0.5 },
      { name: 'إيداع في الحساب', price: 0, rate: 0.75 },
      { name: 'سحب من الحساب', price: 0, rate: 1 },
    ],
  },
  localWithdrawal: {
    id: 'local_withdrawal' as const,
    name: 'سحب البطاقات المحلية',
    description: 'خدمات السحب من الحسابات المحلية',
    image: '/images/IMG_5787.JPG',
    withdrawalRate: 1,
  },
};

export function ServicesProvider({ children }: { children: ReactNode }) {
  const [services, setServices] = useState(DEFAULT_SERVICES);

  // تحميل البيانات من localStorage
  useEffect(() => {
    const saved = localStorage.getItem('services');
    if (saved) {
      try {
        setServices(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load services:', e);
      }
    }
  }, []);

  // حفظ البيانات في localStorage
  useEffect(() => {
    localStorage.setItem('services', JSON.stringify(services));
  }, [services]);

  const updateDollarWithdrawal = (data: Partial<DollarWithdrawalService>) => {
    setServices(prev => ({
      ...prev,
      dollarWithdrawal: { ...prev.dollarWithdrawal, ...data },
    }));
  };

  const updatePersonalCards = (data: Partial<PersonalCardsService>) => {
    setServices(prev => ({
      ...prev,
      personalCards: { ...prev.personalCards, ...data },
    }));
  };

  const updateTransfers = (data: Partial<TransfersService>) => {
    setServices(prev => ({
      ...prev,
      transfers: { ...prev.transfers, ...data },
    }));
  };

  const updateLocalWithdrawal = (data: Partial<LocalWithdrawalService>) => {
    setServices(prev => ({
      ...prev,
      localWithdrawal: { ...prev.localWithdrawal, ...data },
    }));
  };

  return (
    <ServicesContext.Provider
      value={{
        services,
        updateDollarWithdrawal,
        updatePersonalCards,
        updateTransfers,
        updateLocalWithdrawal,
      }}
    >
      {children}
    </ServicesContext.Provider>
  );
}

export function useServices() {
  const context = useContext(ServicesContext);
  if (!context) {
    throw new Error('useServices must be used within ServicesProvider');
  }
  return context;
}
