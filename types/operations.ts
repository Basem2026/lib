/**
 * أنواع بيانات العمليات والمعاملات
 * Operations and Transactions Types
 */

export interface DailyOperation {
  id: string; // رقم العملية (تلقائي)
  operationNumber: string; // رقم العملية المعروض
  date: Date; // التاريخ والوقت (تلقائي)
  operationName: string; // اسم العملية
  operationType: 'card_withdrawal' | 'transfer_from' | 'transfer_to' | 'money_exchange' | 'other_services' | 'cash_deposit' | 'cash_withdrawal'; // نوع العملية
  // card_withdrawal: سحب بطاقة/LYPay/OnePay/إيفاء/رسائل
  // transfer_from: تحويل منه (من حساب للزبون)
  // transfer_to: تحويل له (من الزبون لحساب)
  // money_exchange: صرف عملة (دينار ← دولار أو العكس)
  // other_services: خدمات أخرى (رسوم إدارية، عمولات)
  // cash_deposit: إيداع نقدي في حساب
  // cash_withdrawal: سحب نقدي من حساب
  
  // القيم المستلمة
  receivedLYD: number; // القيمة المستلمة (دينار)
  receivedUSD: number; // القيمة المستلمة (دولار)
  
  // النسب والحسابات
  percentage: number; // النسبة %
  machinePercentage?: number; // نسبة الماكينة
  companyPercentage?: number; // نسبة الشركة
  totalPercentage?: number; // النسبة الإجمالية (تلقائي)
  
  // القيم المسلمة
  givenLYD: number; // القيمة المسلمة (دينار)
  givenUSD: number; // القيمة المسلمة (دولار)
  
  // الربح والسعر
  profit: number; // الربح (تلقائي)
  referencePrice?: number; // السعر المرجعي
  
  // طريقة الدفع
  paymentMethod: 'cash' | 'bank'; // كاش/مصرفي
  bankAccount?: string; // الحساب البنكي
  
  // معلومات إضافية
  description: string; // وصف العملية
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  reference?: string;
  notes?: string;
  processedBy: string;
  approvedBy?: string;
  timestamp: Date;
  updatedAt: Date;
}

export interface Operation {
  id: string;
  date: Date;
  type: 'deposit' | 'withdrawal' | 'transfer' | 'exchange' | 'payment';
  amount: number;
  currency: 'LYD' | 'USD' | 'USDT';
  description: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  reference?: string;
  notes?: string;
  processedBy: string;
  approvedBy?: string;
  timestamp: Date;
  updatedAt: Date;
}

export interface Deposit {
  id: string;
  operationId: string;
  customerId?: string;
  cardId?: string;
  amount: number;
  currency: 'LYD' | 'USD' | 'USDT';
  depositMethod: 'cash' | 'bank' | 'check' | 'mobile_wallet';
  source?: string;
  date: Date;
  status: 'pending' | 'completed' | 'failed';
  receiptNumber?: string;
  notes?: string;
  processedBy: string;
  timestamp: Date;
}

export interface Withdrawal {
  id: string;
  operationId: string;
  customerId?: string;
  cardId?: string;
  amount: number;
  currency: 'LYD' | 'USD' | 'USDT';
  withdrawalMethod: 'cash' | 'bank' | 'check' | 'mobile_wallet';
  destination?: string;
  date: Date;
  status: 'pending' | 'completed' | 'failed';
  receiptNumber?: string;
  notes?: string;
  processedBy: string;
  approvedBy?: string;
  timestamp: Date;
}

export interface Transfer {
  id: string;
  operationId: string;
  fromCustomerId: string;
  toCustomerId: string;
  fromCardId?: string;
  toCardId?: string;
  amount: number;
  currency: 'LYD' | 'USD' | 'USDT';
  transferType: 'internal' | 'external' | 'international';
  date: Date;
  status: 'pending' | 'completed' | 'failed';
  referenceNumber?: string;
  notes?: string;
  processedBy: string;
  timestamp: Date;
}

export interface Exchange {
  id: string;
  operationId: string;
  customerId?: string;
  fromCurrency: 'LYD' | 'USD' | 'USDT';
  toCurrency: 'LYD' | 'USD' | 'USDT';
  fromAmount: number;
  toAmount: number;
  exchangeRate: number;
  date: Date;
  status: 'pending' | 'completed' | 'failed';
  referenceNumber?: string;
  notes?: string;
  processedBy: string;
  timestamp: Date;
}

export interface Payment {
  id: string;
  operationId: string;
  customerId?: string;
  cardId?: string;
  amount: number;
  currency: 'LYD' | 'USD' | 'USDT';
  paymentType: 'utility' | 'loan' | 'fee' | 'other';
  paymentMethod: 'cash' | 'card' | 'bank' | 'check';
  beneficiary?: string;
  date: Date;
  status: 'pending' | 'completed' | 'failed';
  receiptNumber?: string;
  notes?: string;
  processedBy: string;
  timestamp: Date;
}

export interface DailyOperationsSummary {
  id: string;
  date: Date;
  status: 'open' | 'closed';
  openedAt: Date;
  openedBy: string;
  closedAt?: Date;
  closedBy?: string;
  
  // Deposits
  totalDeposits: number;
  totalDepositAmount: number;
  depositsByMethod: {
    cash: number;
    bank: number;
    check: number;
    mobile_wallet: number;
  };
  
  // Withdrawals
  totalWithdrawals: number;
  totalWithdrawalAmount: number;
  withdrawalsByMethod: {
    cash: number;
    bank: number;
    check: number;
    mobile_wallet: number;
  };
  
  // Transfers
  totalTransfers: number;
  totalTransferAmount: number;
  
  // Exchanges
  totalExchanges: number;
  totalExchangeAmount: number;
  
  // Payments
  totalPayments: number;
  totalPaymentAmount: number;
  
  // Summary
  totalOperations: number;
  totalAmount: number;
  netAmount: number;
  
  // Variance
  variance: number;
  variancePercentage: number;
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
  
  notes?: string;
  timeline: OperationTimeline[];
}

export interface OperationTimeline {
  timestamp: Date;
  action: string;
  user: string;
  details: string;
  status?: string;
}

export interface OperationReceipt {
  id: string;
  operationId: string;
  receiptNumber: string;
  date: Date;
  type: 'deposit' | 'withdrawal' | 'transfer' | 'exchange' | 'payment';
  amount: number;
  currency: string;
  status: string;
  processedBy: string;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  printed: boolean;
  printedAt?: Date;
  printedBy?: string;
}

export interface OperationFilter {
  startDate?: Date;
  endDate?: Date;
  type?: string;
  status?: string;
  currency?: string;
  processedBy?: string;
  minAmount?: number;
  maxAmount?: number;
}
