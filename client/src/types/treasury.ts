/**
 * أنواع بيانات وحدة الخزينة (Treasury Module)
 * تتضمن إدارة رأس المال والأرصدة والعهدة اليومية
 */

export type CurrencyType = 'LYD' | 'USD' | 'USDT';

export interface Capital {
  id: string;
  amount: number;
  currency: CurrencyType;
  date: Date;
  notes?: string;
  createdBy: string;
  updatedAt: Date;
}

export interface CashBalance {
  id: string;
  amount: number;
  currency: CurrencyType;
  lastUpdated: Date;
  notes?: string;
}

export interface BankAccount {
  id: string;
  name: string;
  accountNumber: string;
  bankName: string;
  balance: number;
  currency: CurrencyType;
  iban?: string;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OperatingWallet {
  id: string;
  name: string;
  balance: number;
  currency: CurrencyType;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DailyCustody {
  id: string;
  date: Date;
  status: 'open' | 'closed' | 'pending';
  
  // الفتح (Opening)
  openingBalance: number;
  openingCurrency: CurrencyType;
  openedBy: string;
  openedAt: Date;
  
  // العمليات (Operations)
  totalIncome: number;
  totalExpense: number;
  totalTransactions: number;
  
  // الإغلاق (Closing)
  closingBalance: number;
  closingCurrency: CurrencyType;
  closedBy?: string;
  closedAt?: Date;
  
  // التحقق
  variance: number; // الفرق بين الرصيد المتوقع والفعلي
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
  
  notes?: string;
  timeline: TimelineEntry[];
}

export interface TimelineEntry {
  timestamp: Date;
  action: string;
  user: string;
  details?: string;
}

export interface TreasuryTransaction {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  currency: CurrencyType;
  fromAccount?: string;
  toAccount?: string;
  description: string;
  date: Date;
  createdBy: string;
  status: 'pending' | 'completed' | 'cancelled';
  receipt?: string;
  notes?: string;
}

export interface TreasuryReport {
  date: Date;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  
  // الأرصدة
  openingBalance: number;
  closingBalance: number;
  
  // الحركات
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  
  // التفاصيل
  byAccount: {
    [accountId: string]: {
      name: string;
      balance: number;
      income: number;
      expense: number;
    }
  };
  
  // الملخص
  summary: string;
}
