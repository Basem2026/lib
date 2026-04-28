/**
 * أنواع بيانات العمليات اليومية (Daily Operations)
 * يتضمن 6 أنواع عمليات مختلفة مع حسابات تلقائية
 */

export type OperationType =
  | 'card_withdrawal' // سحب بطاقة/LYPay/OnePay/إيفاء/رسائل
  | 'transfer' // تحويلات/إيداعات
  | 'aman_exchange' // صيرفة الأمان
  | 'buy_usd' // شراء دولار/USDT
  | 'sell_usd' // بيع دولار/USDT
  | 'usd_card_withdrawal'; // سحب بطاقات الدولار

export type PaymentMethod = 'cash' | 'bank';

export type TransferDirection = 'from_us' | 'to_us'; // نحول منه | نستلم عليه

export type AmanServiceType =
  | 'open_account' // فتح حساب
  | 'activation' // تفعيل
  | 'withdrawal' // سحب
  | 'other'; // أخرى

// عملية يومية
export interface DailyOperation {
  id: string;
  operationNumber: string; // رقم العملية (تلقائي)
  date: Date; // التاريخ والوقت (تلقائي)
  
  // معلومات أساسية
  operationName: string; // اسم العملية
  operationType: OperationType; // نوع العملية
  
  // القيم المالية
  receivedLYD: number; // القيمة المستلمة (دينار)
  receivedUSD: number; // القيمة المستلمة (دولار)
  percentage: number; // النسبة %
  deliveredLYD: number; // القيمة المسلمة (دينار)
  deliveredUSD: number; // القيمة المسلمة (دولار)
  profit: number; // الربح
  referenceRate: number; // السعر المرجعي
  
  // نسب إضافية (لسحب بطاقات الدولار)
  machinePercentage?: number; // نسبة الماكينة
  companyPercentage?: number; // نسبة الشركة
  totalPercentage?: number; // النسبة الإجمالية (تلقائي)
  
  // طريقة الدفع
  paymentMethod: PaymentMethod; // كاش/مصرفي
  bankAccountId?: string; // الحساب المصرفي (إذا كان مصرفي)
  bankAccountName?: string; // اسم الحساب المصرفي
  
  // معلومات إضافية حسب نوع العملية
  transferDirection?: TransferDirection; // للتحويلات
  amanServiceType?: AmanServiceType; // لصيرفة الأمان
  marketRate?: number; // سعر السوق (لسحب بطاقات الدولار)
  laterSellRate?: number; // سعر بيع لاحق (لسحب بطاقات الدولار)
  
  notes?: string;
  createdAt: Date;
  createdBy: string;
  
  // حالة العملية
  status: 'active' | 'closed'; // نشطة | مقفولة (بعد إغلاق اليوم)
  dayCloseId?: string; // معرف إغلاق اليوم
}

// إغلاق اليوم
export interface DayClose {
  id: string;
  date: Date;
  operations: DailyOperation[]; // العمليات المقفولة
  totalProfit: number; // إجمالي الربح
  totalReceivedLYD: number; // إجمالي المستلم (دينار)
  totalReceivedUSD: number; // إجمالي المستلم (دولار)
  totalDeliveredLYD: number; // إجمالي المسلم (دينار)
  totalDeliveredUSD: number; // إجمالي المسلم (دولار)
  operationsCount: number; // عدد العمليات
  closedAt: Date;
  closedBy: string;
  pdfUrl?: string; // رابط PDF التقرير
}

// معلومات أنواع العمليات
export interface OperationTypeInfo {
  type: OperationType;
  name: string;
  description: string;
  icon: string;
}

export const OPERATION_TYPES_INFO: Record<OperationType, OperationTypeInfo> = {
  card_withdrawal: {
    type: 'card_withdrawal',
    name: 'سحب بطاقة',
    description: 'سحب بطاقة/LYPay/OnePay/إيفاء/رسائل',
    icon: '💳',
  },
  transfer: {
    type: 'transfer',
    name: 'تحويلات/إيداعات',
    description: 'تحويل من/إلى حساب',
    icon: '💸',
  },
  aman_exchange: {
    type: 'aman_exchange',
    name: 'صيرفة الأمان',
    description: 'خدمات مصرف الأمان',
    icon: '🏦',
  },
  buy_usd: {
    type: 'buy_usd',
    name: 'شراء دولار/USDT',
    description: 'شراء عملة أجنبية',
    icon: '💵',
  },
  sell_usd: {
    type: 'sell_usd',
    name: 'بيع دولار/USDT',
    description: 'بيع عملة أجنبية',
    icon: '💰',
  },
  usd_card_withdrawal: {
    type: 'usd_card_withdrawal',
    name: 'سحب بطاقات الدولار',
    description: 'سحب من بطاقات الدولار',
    icon: '💵',
  },
};

// بيانات نموذج سحب بطاقة
export interface CardWithdrawalFormData {
  operationName: string;
  receivedLYD: number;
  bankAccountId?: string;
  percentage: number;
  paymentMethod: PaymentMethod;
  notes?: string;
}

// بيانات نموذج تحويلات
export interface TransferFormData {
  operationName: string;
  transferDirection: TransferDirection;
  amount: number;
  currency: 'LYD' | 'USD';
  bankAccountId?: string;
  percentage?: number;
  paymentMethod: PaymentMethod;
  notes?: string;
}

// بيانات نموذج صيرفة الأمان
export interface AmanExchangeFormData {
  operationName: string;
  serviceType: AmanServiceType;
  transferDirection: TransferDirection;
  amount: number;
  currency: 'LYD' | 'USD';
  bankAccountId?: string;
  percentage?: number;
  paymentMethod: PaymentMethod;
  notes?: string;
}

// بيانات نموذج شراء دولار
export interface BuyUSDFormData {
  operationName: string;
  deliveredLYD: number;
  receivedUSD: number;
  currency: 'USD' | 'USDT';
  bankAccountId?: string;
  paymentMethod: PaymentMethod;
  notes?: string;
}

// بيانات نموذج بيع دولار
export interface SellUSDFormData {
  operationName: string;
  deliveredUSD: number;
  receivedLYD: number;
  currency: 'USD' | 'USDT';
  referenceRate: number; // السعر المرجعي (من العهدة)
  bankAccountId?: string;
  paymentMethod: PaymentMethod;
  notes?: string;
}

// بيانات نموذج سحب بطاقات الدولار
export interface USDCardWithdrawalFormData {
  operationName: string;
  receivedUSD: number;
  machinePercentage: number;
  companyPercentage: number;
  marketRate: number; // سعر السوق
  laterSellRate?: number; // سعر بيع لاحق (اختياري)
  bankAccountId?: string;
  paymentMethod: PaymentMethod;
  notes?: string;
}
