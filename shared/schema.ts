import { mysqlTable, varchar, text, timestamp, decimal, mysqlEnum, json, int, boolean } from 'drizzle-orm/mysql-core';
import { nanoid } from 'nanoid';
// ==================== الحوالات المالية ====================

// جداول الفروع والشركات الشريكة (إضافة إذا لم تكن موجودة)
export const branches = mysqlTable('branches', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => nanoid()),
  name: varchar('name', { length: 100 }).notNull(),
  city: varchar('city', { length: 100 }),
  address: text('address'),
  phone: varchar('phone', { length: 20 }),
  managerId: varchar('manager_id', { length: 36 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const partnerCompanies = mysqlTable('partner_companies', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => nanoid()),
  name: varchar('name', { length: 200 }).notNull(),
  country: varchar('country', { length: 100 }),
  contactPerson: varchar('contact_person', { length: 100 }),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 100 }),
  commissionShare: decimal('commission_share', { precision: 5, scale: 2 }).default('50'), // نسبة ربح الشريك
  createdAt: timestamp('created_at').defaultNow(),
});

// جدول الحوالات الرئيسي
export const transfers = mysqlTable('transfers', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => nanoid()),
  transferNumber: varchar('transfer_number', { length: 50 }).notNull().unique(),
  companyId: varchar('company_id', { length: 36 }).notNull(), // للـ multi-tenant
  branchFromId: varchar('branch_from_id', { length: 36 }).references(() => branches.id),
  branchToId: varchar('branch_to_id', { length: 36 }).references(() => branches.id),
  partnerCompanyId: varchar('partner_company_id', { length: 36 }).references(() => partnerCompanies.id),
  transferType: mysqlEnum('transfer_type', ['internal', 'partner']).notNull(),
  direction: mysqlEnum('direction', ['outgoing', 'incoming']).default('outgoing'),
  
  // بيانات المرسل
  senderName: varchar('sender_name', { length: 100 }).notNull(),
  senderPhone: varchar('sender_phone', { length: 20 }).notNull(),
  senderIdNumber: varchar('sender_id_number', { length: 50 }),
  senderAddress: text('sender_address'),
  
  // بيانات المستلم
  receiverName: varchar('receiver_name', { length: 100 }).notNull(),
  receiverPhone: varchar('receiver_phone', { length: 20 }).notNull(),
  receiverIdNumber: varchar('receiver_id_number', { length: 50 }),
  
  // العملات والقيم
  sendCurrency: mysqlEnum('send_currency', ['LYD', 'USD', 'EUR', 'USDT']).default('LYD'),
  receiveCurrency: mysqlEnum('receive_currency', ['LYD', 'USD', 'EUR', 'USDT']).default('LYD'),
  sendAmount: decimal('send_amount', { precision: 15, scale: 2 }).notNull(),
  receiveAmount: decimal('receive_amount', { precision: 15, scale: 2 }),
  
  // العمولة والربح
  feeType: mysqlEnum('fee_type', ['fixed', 'percentage']).default('fixed'),
  feeValue: decimal('fee_value', { precision: 10, scale: 2 }).default('0'),
  totalFee: decimal('total_fee', { precision: 15, scale: 2 }).default('0'),
  totalPaid: decimal('total_paid', { precision: 15, scale: 2 }).notNull(), // ما دفعه المرسل
  profitCompany: decimal('profit_company', { precision: 15, scale: 2 }).default('0'),
  profitPartner: decimal('profit_partner', { precision: 15, scale: 2 }).default('0'),
  
  // طرق الدفع والصرف
  paymentMethod: mysqlEnum('payment_method', ['cash', 'bank', 'usdt']).default('cash'),
  payoutMethod: mysqlEnum('payout_method', ['cash', 'bank', 'usdt']).default('cash'),
  sourceAccountId: varchar('source_account_id', { length: 36 }),
  destinationAccountId: varchar('destination_account_id', { length: 36 }),
  
  // الحالة الأساسية والحالة التسووية
  status: mysqlEnum('status', [
    'created',                    // تم إنشاء الحوالة
    'received',                   // تم استلام القيمة
    'fee_calculated',             // تم احتساب العمولة
    'profit_recorded',            // تم تسجيل الربح
    'receipt_sent',               // تم إرسال الإيصال للمرسل
    'pending_approval',           // في انتظار موافقة المدير
    'approved',                   // تمت الموافقة
    'rejected',                   // مرفوضة
    'sent_to_branch',             // تم تحويلها إلى فرع الصرف
    'sent_to_partner',            // تم إرسالها للشريك
    'acknowledged_by_receiver',   // جهة الصرف استلمت البيانات
    'ready_for_payout',           // جاهزة للصرف
    'receiver_arrived',           // وصل المستلم
    'identity_verified',          // تم التحقق من بيانات المستلم
    'pending_payout',             // قيد الصرف
    'paid_full',                  // تم الصرف بالكامل
    'paid_partial',               // تم الصرف جزئياً
    'failed_payout',              // تعذر الصرف
    'cancelled_by_sender',        // طلب إلغاء من المرسل
    'cancelled',                  // تم الإلغاء
    'refunded_to_sender',         // تم رد القيمة للمرسل
    'under_settlement',           // قيد التسوية
    'settled'                     // تمت التسوية بالكامل
  ]).default('created').notNull(),
  
  settlementStatus: mysqlEnum('settlement_status', ['pending', 'partial', 'completed']).default('pending'),
  
  // الكود السري للاستلام
  pickupCode: varchar('pickup_code', { length: 10 }),
  
  // تاريخ الاستحقاق
  expiresAt: timestamp('expires_at'),
  
  // علاقات الموظفين
  createdBy: varchar('created_by', { length: 36 }).notNull(),
  approvedBy: varchar('approved_by', { length: 36 }),
  paidBy: varchar('paid_by', { length: 36 }),
  cancelledBy: varchar('cancelled_by', { length: 36 }),
  
  // الطوابع الزمنية
  createdAt: timestamp('created_at').defaultNow(),
  paidAt: timestamp('paid_at'),
  cancelledAt: timestamp('cancelled_at'),
  
  // ملاحظات عامة
  notes: text('notes'),
});

// جدول تتبع الحالات (Timeline)
export const transferStatusLogs = mysqlTable('transfer_status_logs', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => nanoid()),
  transferId: varchar('transfer_id', { length: 36 }).references(() => transfers.id).notNull(),
  oldStatus: varchar('old_status', { length: 50 }),
  newStatus: varchar('new_status', { length: 50 }).notNull(),
  action: varchar('action', { length: 100 }), // مثل 'create', 'approve', 'payout', 'cancel'
  note: text('note'),
  employeeId: varchar('employee_id', { length: 36 }).notNull(),
  branchId: varchar('branch_id', { length: 36 }).references(() => branches.id),
  metadata: json('metadata'), // لتخزين بيانات قبل/بعد التعديل
  createdAt: timestamp('created_at').defaultNow(),
});

// جدول الإيصالات
export const transferReceipts = mysqlTable('transfer_receipts', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => nanoid()),
  transferId: varchar('transfer_id', { length: 36 }).references(() => transfers.id).notNull(),
  receiptType: mysqlEnum('receipt_type', ['sender', 'receiver', 'internal', 'settlement']).notNull(),
  pdfUrl: text('pdf_url'),
  sentTo: varchar('sent_to', { length: 20 }), // رقم الهاتف
  sentChannel: mysqlEnum('sent_channel', ['whatsapp', 'sms', 'email', 'manual']),
  sentStatus: mysqlEnum('sent_status', ['pending', 'sent', 'failed']).default('pending'),
  printedBy: varchar('printed_by', { length: 36 }),
  printedAt: timestamp('printed_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// جدول تسوية الحوالات مع الشركاء
export const partnerSettlements = mysqlTable('partner_settlements', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => nanoid()),
  partnerCompanyId: varchar('partner_company_id', { length: 36 }).references(() => partnerCompanies.id).notNull(),
  currency: mysqlEnum('currency', ['LYD', 'USD', 'EUR', 'USDT']).default('LYD'),
  totalSent: decimal('total_sent', { precision: 15, scale: 2 }).default('0'),
  totalReceived: decimal('total_received', { precision: 15, scale: 2 }).default('0'),
  totalPartnerProfit: decimal('total_partner_profit', { precision: 15, scale: 2 }).default('0'),
  totalCompanyProfit: decimal('total_company_profit', { precision: 15, scale: 2 }).default('0'),
  netAmount: decimal('net_amount', { precision: 15, scale: 2 }).default('0'),
  status: mysqlEnum('status', ['pending', 'partial', 'completed']).default('pending'),
  settledBy: varchar('settled_by', { length: 36 }),
  settledAt: timestamp('settled_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ========== خزينة الحسابات ==========
export const treasuryAccounts = mysqlTable('treasury_accounts', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => nanoid()),
  accountId: varchar('account_id', { length: 50 }).notNull(),
  accountName: varchar('account_name', { length: 100 }).notNull(),
  accountType: varchar('account_type', { length: 50 }).notNull(),
  currency: varchar('currency', { length: 10 }).notNull().default('LYD'),
  balance: decimal('balance', { precision: 15, scale: 2 }).notNull().default('0'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const accountTransactions = mysqlTable('account_transactions', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => nanoid()),
  accountId: varchar('account_id', { length: 50 }).notNull(),
  accountName: varchar('account_name', { length: 100 }).notNull(),
  currency: varchar('currency', { length: 10 }).notNull().default('LYD'),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  direction: mysqlEnum('direction', ['credit', 'debit']).notNull(),
  description: text('description'),
  createdBy: varchar('created_by', { length: 36 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const bankAccounts = mysqlTable('bank_accounts', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => nanoid()),
  bankName: varchar('bank_name', { length: 100 }).notNull(),
  accountNumber: varchar('account_number', { length: 50 }),
  currency: varchar('currency', { length: 10 }).notNull().default('LYD'),
  balance: decimal('balance', { precision: 15, scale: 2 }).notNull().default('0'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
