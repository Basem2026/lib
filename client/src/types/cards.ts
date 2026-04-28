/**
 * نموذج بيانات البطاقات الشاملة
 * جدول رئيسي لبطاقات الأغراض الشخصية
 */

export type FinancialStatus = 
  | 'تم الشراء'                              // 1
  | 'في انتظار المطابقة'                    // 2
  | 'تمت المطابقة'                          // 3
  | 'غير مطابق'                             // 4
  | 'تم الحجز دون اختيار شركة الصرافة'     // 5 - الحجز في منصة الأغراض الشخصية بدون اختيار شركة صرافة
  | 'تم اختيار شركة الصرافة'               // 6 - مع نموذج اختيار الشركة
  | 'تم الإيداع'                            // 7
  | 'تم التنفيذ'                            // 8 - بدون نموذج
  | 'تم الإيداع الدولار في البطاقة'        // 9
  | 'تم السحب'                              // 10
  | 'متبقي رصيد في البطاقة'                // 11
  | 'تم السحب بالكامل';                    // 12

export type DocumentStatus = 
  | 'المعاملة ليست جاهزة للاستلام'
  | 'جاهزة للاستلام'
  | 'تم الاستلام بالكامل'
  | 'متبقي جواز'
  | 'متبقي شفرة'
  | 'متبقي بطاقة'
  | 'متبقي جواز + بطاقة'
  | 'متبقي جواز + شفرة'
  | 'متبقي شفرة + بطاقة';

export interface StatusChange {
  status: FinancialStatus | DocumentStatus;
  changedAt: Date;
  changedBy: string;
  reason?: string;
}

export interface Card {
  // معرف المعاملة
  transactionId: string; // تسلسلي تلقائي

  // بيانات الزبون
  name: string; // مطابق الجواز
  nationalId: string; // الرقم الوطني
  passportNumber: string; // رقم الجواز
  passportExpiry: string; // تاريخ انتهاء الجواز
  accountNumber: string; // رقم الحساب 333
  iban1: string; // حساب IBAN 333
  iban2?: string; // حساب IBAN 555 (اختياري)
  accountPhone: string; // رقم هاتف المربوط بالحساب
  personalPhone: string; // رقم هاتف شخصي للتواصل

  // بيانات البطاقة
  cardNumber: string; // رقم البطاقة
  cardExpiry: string; // تاريخ صلاحية البطاقة
  cardPin: string; // الرمز السري

  // بيانات الشراء
  purchasePrice: number; // ثمن الشراء (الزبون)
  delegate: string; // اسم المندوب
  delegateShare: number; // حصة المندوب
  totalPurchasePrice: number; // ثمن الشراء الإجمالي

  // المستندات المستلمة
  documentsReceived: {
    passport: boolean; // ✅ جواز
    pin: boolean; // ✅ شفرة
    card: boolean; // ✅ بطاقة
  };

  // بيانات الإيداع الأول
  depositAmount: number; // قيمة الإيداع
  currencyReserveAmount: number; // قيمة الحجز العملة (دولار)
  bankDollarCost: number; // سعر تكلفة الدولار من المصرف
  cardDollarValue: number; // قيمة الدولار في البطاقة
  firstWithdrawalRate: number; // نسبة السحب الأول
  firstNetAmount: number; // الصافي بعد السحب الأول
  remainingInCard: number; // المتبقي في البطاقات

  // حسابات الربح الأول
  sellDollarPrice: number; // سعر دولار البيع
  firstDinarValue: number; // القيمة بالدينار (الصافي بعد السحب × سعر الدولار البيع)
  firstProfit: number; // الربح الأول (القيمة بالدينار - قيمة الإيداع)

  // بيانات السحب الثاني
  secondWithdrawalRate: number; // نسبة السحب المتبقي في البطاقة
  secondNetAmount: number; // الصافي بعد السحب المتبقي (المتبقي - نسبة سحب المتبقي)
  secondSellDollarPrice: number; // سعر بيع الدولار المتبقي
  secondDinarValue: number; // قيمة المتبقي بدينار
  secondProfit: number; // الربح الثاني (قيمة المتبقي بالدينار)

  // الربح الإجمالي
  totalProfit: number; // الربح الإجمالي للبطاقة (ربح الأول + الربح الثاني)

  // بيانات شركة الصرافة
  exchangeCompanyName?: string;
  exchangeCompanyPhone?: string;
  exchangeRate?: number;

  // الحالات
  financialStatus: FinancialStatus;
  documentStatus: DocumentStatus;

  // تتبع التغييرات
  financialStatusHistory: StatusChange[];
  documentStatusHistory: StatusChange[];

  // البيانات الإدارية
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export interface CardsContextType {
  cards: Card[];
  addCard: (card: Card) => void;
  updateCard: (id: string, card: Partial<Card>) => void;
  deleteCard: (id: string) => void;
  getCard: (id: string) => Card | undefined;
  getCardsByCustomer: (customerId: string) => Card[];
  getTotalCards: () => number;
  getTotalProfit: () => number;
  getCardsByStatus: (status: FinancialStatus) => Card[];
  updateFinancialStatus: (id: string, status: FinancialStatus, changedBy: string, reason?: string, depositPaymentMethod?: 'cash' | 'bank', depositBankAccount?: string) => void;
  updateDocumentStatus: (id: string, status: DocumentStatus, changedBy: string, reason?: string) => void;
}
