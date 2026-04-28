/**
 * Context لإدارة أسعار الدولار
 * يحفظ البيانات في localStorage
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface DollarRate {
  id: string;
  bankName: string;
  dollarValue: number;
  cashRate: number;
  checkRate: number;
}

interface DollarRatesContextType {
  rates: DollarRate[];
  addRate: (rate: Omit<DollarRate, 'id'>) => void;
  updateRate: (id: string, rate: Omit<DollarRate, 'id'>) => void;
  deleteRate: (id: string) => void;
}

const DollarRatesContext = createContext<DollarRatesContextType | undefined>(undefined);

// بيانات افتراضية تظهر للمستخدمين الجدد - جميع المصارف الليبية
const DEFAULT_RATES: DollarRate[] = [
  { id: 'default-1', bankName: 'مصرف الأمان', dollarValue: 500, cashRate: 5.10, checkRate: 5.05 },
  { id: 'default-2', bankName: 'مصرف شمال أفريقيا', dollarValue: 500, cashRate: 5.15, checkRate: 5.10 },
  { id: 'default-3', bankName: 'المصرف التجاري الوطني', dollarValue: 500, cashRate: 5.12, checkRate: 5.07 },
  { id: 'default-4', bankName: 'مصرف التجارة والتنمية', dollarValue: 500, cashRate: 5.08, checkRate: 5.03 },
  { id: 'default-5', bankName: 'مصرف الوحدة', dollarValue: 500, cashRate: 5.20, checkRate: 5.15 },
  { id: 'default-6', bankName: 'مصرف الجمهورية', dollarValue: 500, cashRate: 5.18, checkRate: 5.13 },
  { id: 'default-7', bankName: 'مصرف الصحاري', dollarValue: 500, cashRate: 5.25, checkRate: 5.20 },
  { id: 'default-8', bankName: 'مصرف النوران', dollarValue: 500, cashRate: 5.22, checkRate: 5.17 },
  { id: 'default-9', bankName: 'مصرف المتوسط', dollarValue: 500, cashRate: 5.14, checkRate: 5.09 },
  { id: 'default-10', bankName: 'مصرف الادخار والاستثمار', dollarValue: 500, cashRate: 5.16, checkRate: 5.11 },
  { id: 'default-11', bankName: 'مصرف الوفاء', dollarValue: 500, cashRate: 5.19, checkRate: 5.14 },
  { id: 'default-12', bankName: 'مصرف التجارة والتنمية المتحد', dollarValue: 500, cashRate: 5.11, checkRate: 5.06 },
  { id: 'default-13', bankName: 'مصرف الخليج الأول', dollarValue: 500, cashRate: 5.17, checkRate: 5.12 },
  { id: 'default-14', bankName: 'مصرف المتحد', dollarValue: 500, cashRate: 5.13, checkRate: 5.08 },
];

export function DollarRatesProvider({ children }: { children: ReactNode }) {
  const [rates, setRates] = useState<DollarRate[]>(DEFAULT_RATES);

  // تحميل البيانات من localStorage عند البداية
  useEffect(() => {
    const saved = localStorage.getItem('dollarRates');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // تأكد من أن جميع الأرقام هي number
        const normalized = parsed.map((rate: any) => ({
          ...rate,
          dollarValue: typeof rate.dollarValue === 'number' ? rate.dollarValue : parseFloat(rate.dollarValue) || 0,
          cashRate: typeof rate.cashRate === 'number' ? rate.cashRate : parseFloat(rate.cashRate) || 0,
          checkRate: typeof rate.checkRate === 'number' ? rate.checkRate : parseFloat(rate.checkRate) || 0,
        }));
        setRates(normalized);
      } catch (e) {
        console.error('Failed to load dollar rates:', e);
      }
    }
  }, []);

  // حفظ البيانات في localStorage عند التغيير
  useEffect(() => {
    localStorage.setItem('dollarRates', JSON.stringify(rates));
  }, [rates]);

  const addRate = (rate: Omit<DollarRate, 'id'>) => {
    const newRate: DollarRate = {
      ...rate,
      dollarValue: typeof rate.dollarValue === 'number' ? rate.dollarValue : parseFloat(String(rate.dollarValue)) || 0,
      cashRate: typeof rate.cashRate === 'number' ? rate.cashRate : parseFloat(String(rate.cashRate)) || 0,
      checkRate: typeof rate.checkRate === 'number' ? rate.checkRate : parseFloat(String(rate.checkRate)) || 0,
      id: Date.now().toString(),
    };
    setRates(prev => [...prev, newRate]);
  };

  const updateRate = (id: string, rate: Omit<DollarRate, 'id'>) => {
    setRates(prev =>
      prev.map(r => (r.id === id ? { 
        ...rate,
        dollarValue: typeof rate.dollarValue === 'number' ? rate.dollarValue : parseFloat(String(rate.dollarValue)) || 0,
        cashRate: typeof rate.cashRate === 'number' ? rate.cashRate : parseFloat(String(rate.cashRate)) || 0,
        checkRate: typeof rate.checkRate === 'number' ? rate.checkRate : parseFloat(String(rate.checkRate)) || 0,
        id 
      } : r))
    );
  };

  const deleteRate = (id: string) => {
    setRates(prev => prev.filter(r => r.id !== id));
  };

  return (
    <DollarRatesContext.Provider value={{ rates, addRate, updateRate, deleteRate }}>
      {children}
    </DollarRatesContext.Provider>
  );
}

export function useDollarRates() {
  const context = useContext(DollarRatesContext);
  if (!context) {
    throw new Error('useDollarRates must be used within DollarRatesProvider');
  }
  return context;
}
