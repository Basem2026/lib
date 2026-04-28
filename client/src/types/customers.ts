/**
 * أنواع بيانات الزباين والبطاقات
 * Customers and Cards Types
 */

export interface Customer {
  id: string;
  transactionNumber: string; // رقم المعاملة التسلسلي (TRX-000001)
  // بيانات الزبون
  name: string;
  phone: string;
  email?: string;
  idNumber?: string;
  idType: 'national_id' | 'passport' | 'driver_license';
  address?: string;
  city?: string;
  passportNumber?: string;
  passportExpiry?: string;
  
  // بيانات البنك
  accountNumber?: string;
  iban1?: string;
  iban2?: string;
  accountPhone?: string;
  personalPhone?: string;
  
  // بيانات البطاقة
  cardNumber?: string;
  cardExpiry?: string;
  cardPin?: string;
  bankId?: string; // معرف المصرف (aman, nab, إلخ)
  
  // بيانات الشراء
  purchasePrice?: number;
  delegateId?: string;
  delegateShare?: number;
  totalPrice?: number;
  
  // المستندات
  documentsReceived?: {
    passport: boolean;
    pin: boolean;
    card: boolean;
  };
  documents?: string[];
  
  // بيانات عامة
  registrationDate: Date;
  operationStatus: 'purchased' | 'awaiting_match' | 'matched' | 'not_matched' | 'reserved' | 'deposited' | 'awaiting_execution' | 'executed' | 'partial_withdrawal' | 'full_withdrawal' | 'ready_for_pickup' | 'cancelled';
  cancellationReason?: string; // سبب الإلغاء (فقط عندما تكون الحالة 'cancelled')
  documentStatus: 'cannot_deliver' | 'passport_delivered' | 'pin_delivered' | 'card_delivered' | 'card_pin_delivered' | 'passport_card_delivered' | 'passport_pin_delivered' | 'all_delivered';
  totalBalance: number;
  totalTransactions: number;
  lastTransactionDate?: Date;
  notes?: string;
  accumulatedProfit?: number; // الربح المتراكم من عمليات السحب (يتجمع مع كل سحب)
  createdBy: string;
  updatedAt: Date;
}

export interface Card {
  id: string;
  customerId: string;
  cardNumber: string;
  cardType: 'debit' | 'credit' | 'prepaid';
  cardBrand: 'visa' | 'mastercard' | 'amex' | 'local';
  holderName: string;
  expiryDate: Date | string;
  cvv?: string;
  balance: number;
  currency: 'LYD' | 'USD' | 'USDT';
  issuedDate: Date;
  status: 'active' | 'inactive' | 'expired' | 'blocked';
  dailyLimit: number;
  monthlyLimit: number;
  usedDaily: number;
  usedMonthly: number;
  lastUsedDate?: Date;
  createdBy: string;
  updatedAt: Date;
}

export interface CustomerTransaction {
  id: string;
  customerId: string;
  cardId?: string;
  type: 'deposit' | 'withdrawal' | 'transfer' | 'payment';
  amount: number;
  currency: 'LYD' | 'USD' | 'USDT';
  description: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  timestamp: Date;
  reference?: string;
  notes?: string;
  processedBy: string;
}

export interface CustomerAccount {
  id: string;
  customerId: string;
  accountType: 'savings' | 'checking' | 'investment';
  accountNumber: string;
  balance: number;
  currency: 'LYD' | 'USD' | 'USDT';
  issuedDate: Date;
  status: 'active' | 'inactive' | 'closed';
  interestRate?: number;
  minimumBalance?: number;
  createdBy: string;
  updatedAt: Date;
}

export interface CustomerDocument {
  id: string;
  customerId: string;
  documentType: 'id' | 'passport' | 'address_proof' | 'income_proof' | 'other';
  fileName: string;
  fileUrl: string;
  uploadedDate: Date;
  expiryDate?: Date;
  status: 'valid' | 'expired' | 'pending_verification';
  uploadedBy: string;
}

export interface CustomerNote {
  id: string;
  customerId: string;
  title: string;
  content: string;
  type: 'general' | 'warning' | 'important';
  createdDate: Date;
  createdBy: string;
  updatedAt: Date;
}

export interface CardStatement {
  id: string;
  cardId: string;
  statementDate: Date;
  openingBalance: number;
  closingBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalTransactions: number;
  status: 'draft' | 'finalized' | 'sent';
  generatedBy: string;
  generatedDate: Date;
}
