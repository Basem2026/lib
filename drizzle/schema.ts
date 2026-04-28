import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  fullName: text("fullName"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Employees table - الموظفين
 */
export const employees = mysqlTable("employees", {
  id: varchar("id", { length: 64 }).primaryKey(),
  employeeCode: varchar("employeeCode", { length: 64 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  fullName: text("fullName").notNull(),
  jobTitle: mysqlEnum("jobTitle", ["data_entry", "operations", "supervisor", "deputy_manager", "accountant", "manager"]).notNull(),
  passwordHash: text("passwordHash").notNull(),
  status: mysqlEnum("status", ["active", "disabled"]).default("active").notNull(),
  permissions: json("permissions").$type<string[]>().notNull(),
  salary: decimal("salary", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: varchar("createdBy", { length: 64 }).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  updatedBy: varchar("updatedBy", { length: 64 }),
});

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;

/**
 * Customers table - الزباين
 */
export const customers = mysqlTable("customers", {
  id: varchar("id", { length: 64 }).primaryKey(),
  transactionNumber: varchar("transactionNumber", { length: 64 }).notNull().unique(),
  name: text("name").notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 320 }),
  idNumber: varchar("idNumber", { length: 64 }),
  idType: mysqlEnum("idType", ["national_id", "passport", "driver_license"]).notNull(),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  passportNumber: varchar("passportNumber", { length: 64 }),
  passportExpiry: varchar("passportExpiry", { length: 20 }),
  accountNumber: varchar("accountNumber", { length: 64 }),
  iban1: varchar("iban1", { length: 64 }),
  iban2: varchar("iban2", { length: 64 }),
  accountPhone: varchar("accountPhone", { length: 20 }),
  personalPhone: varchar("personalPhone", { length: 20 }),
  cardNumber: varchar("cardNumber", { length: 64 }),
  cardExpiry: varchar("cardExpiry", { length: 20 }),
  cardPin: varchar("cardPin", { length: 20 }),
  bankId: varchar("bankId", { length: 64 }).default("aman"),
  purchasePrice: decimal("purchasePrice", { precision: 10, scale: 2 }),
  delegateId: varchar("delegateId", { length: 64 }),
  delegateShare: decimal("delegateShare", { precision: 10, scale: 2 }),
  totalPrice: decimal("totalPrice", { precision: 10, scale: 2 }),
  documentsReceived: json("documentsReceived").$type<{ passport: boolean; pin: boolean; card: boolean }>(),
  documents: json("documents").$type<string[]>(),
  registrationDate: timestamp("registrationDate").defaultNow().notNull(),
  operationStatus: mysqlEnum("operationStatus", ["purchased", "awaiting_match", "matched", "not_matched", "reserved", "deposited", "awaiting_execution", "executed", "partial_withdrawal", "full_withdrawal", "ready_for_pickup"]).notNull(),
  documentStatus: mysqlEnum("documentStatus", ["cannot_deliver", "passport_delivered", "pin_delivered", "card_delivered", "card_pin_delivered", "passport_card_delivered", "passport_pin_delivered", "all_delivered"]).notNull(),
  totalBalance: decimal("totalBalance", { precision: 10, scale: 2 }).default("0").notNull(),
  totalTransactions: int("totalTransactions").default(0).notNull(),
  lastTransactionDate: timestamp("lastTransactionDate"),
  notes: text("notes"),
  createdBy: varchar("createdBy", { length: 64 }).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

/**
 * Cards table - البطاقات (بطاقات الأغراض الشخصية)
 */
export const cards = mysqlTable("cards", {
  transactionId: varchar("transactionId", { length: 64 }).primaryKey(),
  // بيانات الزبون
  name: text("name").notNull(),
  nationalId: varchar("nationalId", { length: 64 }).notNull(),
  passportNumber: varchar("passportNumber", { length: 64 }).notNull(),
  passportExpiry: varchar("passportExpiry", { length: 20 }).notNull(),
  accountNumber: varchar("accountNumber", { length: 64 }).notNull(),
  iban1: varchar("iban1", { length: 64 }).notNull(),
  iban2: varchar("iban2", { length: 64 }),
  accountPhone: varchar("accountPhone", { length: 20 }).notNull(),
  personalPhone: varchar("personalPhone", { length: 20 }).notNull(),
  // بيانات البطاقة
  cardNumber: varchar("cardNumber", { length: 64 }).notNull(),
  cardExpiry: varchar("cardExpiry", { length: 20 }).notNull(),
  cardPin: varchar("cardPin", { length: 20 }).notNull(),
  // بيانات الشراء
  purchasePrice: decimal("purchasePrice", { precision: 10, scale: 2 }).notNull(),
  delegate: varchar("delegate", { length: 100 }).notNull(),
  delegateShare: decimal("delegateShare", { precision: 10, scale: 2 }).notNull(),
  totalPurchasePrice: decimal("totalPurchasePrice", { precision: 10, scale: 2 }).notNull(),
  // المستندات المستلمة
  documentsReceived: json("documentsReceived").$type<{ passport: boolean; pin: boolean; card: boolean }>().notNull(),
  // بيانات الإيداع الأول
  depositAmount: decimal("depositAmount", { precision: 10, scale: 2 }).default("0").notNull(),
  currencyReserveAmount: decimal("currencyReserveAmount", { precision: 10, scale: 2 }).default("0").notNull(),
  bankDollarCost: decimal("bankDollarCost", { precision: 10, scale: 4 }).default("0").notNull(),
  cardDollarValue: decimal("cardDollarValue", { precision: 10, scale: 2 }).default("0").notNull(),
  firstWithdrawalRate: decimal("firstWithdrawalRate", { precision: 5, scale: 2 }).default("0").notNull(),
  firstNetAmount: decimal("firstNetAmount", { precision: 10, scale: 2 }).default("0").notNull(),
  remainingInCard: decimal("remainingInCard", { precision: 10, scale: 2 }).default("0").notNull(),
  // حسابات الربح الأول
  sellDollarPrice: decimal("sellDollarPrice", { precision: 10, scale: 4 }).default("0").notNull(),
  firstDinarValue: decimal("firstDinarValue", { precision: 10, scale: 2 }).default("0").notNull(),
  firstProfit: decimal("firstProfit", { precision: 10, scale: 2 }).default("0").notNull(),
  // بيانات السحب الثاني
  secondWithdrawalRate: decimal("secondWithdrawalRate", { precision: 5, scale: 2 }).default("0").notNull(),
  secondNetAmount: decimal("secondNetAmount", { precision: 10, scale: 2 }).default("0").notNull(),
  secondSellDollarPrice: decimal("secondSellDollarPrice", { precision: 10, scale: 4 }).default("0").notNull(),
  secondDinarValue: decimal("secondDinarValue", { precision: 10, scale: 2 }).default("0").notNull(),
  secondProfit: decimal("secondProfit", { precision: 10, scale: 2 }).default("0").notNull(),
  // الربح الإجمالي
  totalProfit: decimal("totalProfit", { precision: 10, scale: 2 }).default("0").notNull(),
  // الحالات
  financialStatus: text("financialStatus").notNull(),
  documentStatus: text("documentStatus").notNull(),
  // تتبع التغييرات
  financialStatusHistory: json("financialStatusHistory").$type<Array<{ status: string; changedAt: Date; changedBy: string; reason?: string }>>().notNull(),
  documentStatusHistory: json("documentStatusHistory").$type<Array<{ status: string; changedAt: Date; changedBy: string; reason?: string }>>().notNull(),
  // الربط مع حسابات الخزينة
  paymentMethod: mysqlEnum("paymentMethod", ["cash", "bank"]).default("cash"),
  treasuryAccountId: varchar("treasuryAccountId", { length: 64 }),
  // بيانات شركة الصرافة
  exchangeCompanyName: text("exchangeCompanyName"),
  exchangeCompanyPhone: varchar("exchangeCompanyPhone", { length: 20 }),
  exchangeRate: decimal("exchangeRate", { precision: 5, scale: 2 }),
  // البيانات الإدارية
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdBy: varchar("createdBy", { length: 64 }).notNull(),
  updatedBy: varchar("updatedBy", { length: 64 }).notNull(),
  // الحذف الناعم (soft delete)
  isDeleted: boolean("isDeleted").default(false).notNull(),
  deletedAt: timestamp("deletedAt"),
  deletedBy: varchar("deletedBy", { length: 64 }),
  deletedByName: text("deletedByName"),
});

export type Card = typeof cards.$inferSelect;
export type InsertCard = typeof cards.$inferInsert;

/**
 * Treasury records table - سجلات الخزينة
 */
export const treasuryRecords = mysqlTable("treasury_records", {
  id: varchar("id", { length: 64 }).primaryKey(),
  type: mysqlEnum("type", ["capital", "revenue", "expense", "profit", "withdrawal", "deposit", "cash", "bank_account", "wallet", "custody", "transaction", "distribution"]).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: mysqlEnum("currency", ["LYD", "USD", "USDT"]).default("LYD").notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 100 }),
  reference: varchar("reference", { length: 100 }),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  processedBy: varchar("processedBy", { length: 64 }).notNull(),
  notes: text("notes"),
  data: json("data"), // حقل JSON لتخزين البيانات المعقدة
});

export type TreasuryRecord = typeof treasuryRecords.$inferSelect;
export type InsertTreasuryRecord = typeof treasuryRecords.$inferInsert;

/**
 * Audit logs table - سجلات التدقيق
 */
export const auditLogs = mysqlTable("audit_logs", {
  id: varchar("id", { length: 64 }).primaryKey(),
  action: mysqlEnum("action", ["create", "update", "delete", "print", "close_day", "approve_close", "reject_close", "permission_change", "login", "logout", "bulk_status_change", "bulk_withdrawal", "withdraw_pending", "card_sale_cash", "card_sale_bank"]).notNull(),
  entityType: mysqlEnum("entityType", ["customer", "card", "operation", "expense", "salary", "employee", "daily_close", "treasury", "system", "settings"]).notNull(),
  entityId: varchar("entityId", { length: 64 }),
  userId: varchar("userId", { length: 64 }).notNull(),
  userName: text("userName").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  details: json("details").$type<{ description?: string; before?: any; after?: any; reason?: string; metadata?: any; changes?: any[] }>(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

/**
 * Unified Account table - الحساب الموحد
 * حساب رئيسي واحد يجمع كل الإيرادات والمصروفات
 */
export const unifiedAccount = mysqlTable("unified_account", {
  id: varchar("id", { length: 64 }).primaryKey(),
  accountType: mysqlEnum("accountType", ["main"]).default("main").notNull(),
  // الأرصدة
  balanceLYD: decimal("balanceLYD", { precision: 15, scale: 2 }).default("0").notNull(),
  balanceUSD: decimal("balanceUSD", { precision: 15, scale: 2 }).default("0").notNull(),
  balanceUSDT: decimal("balanceUSDT", { precision: 15, scale: 2 }).default("0").notNull(),
  // الإحصائيات
  totalRevenueLYD: decimal("totalRevenueLYD", { precision: 15, scale: 2 }).default("0").notNull(),
  totalRevenueUSD: decimal("totalRevenueUSD", { precision: 15, scale: 2 }).default("0").notNull(),
  totalRevenueUSDT: decimal("totalRevenueUSDT", { precision: 15, scale: 2 }).default("0").notNull(),
  totalExpensesLYD: decimal("totalExpensesLYD", { precision: 15, scale: 2 }).default("0").notNull(),
  totalExpensesUSD: decimal("totalExpensesUSD", { precision: 15, scale: 2 }).default("0").notNull(),
  totalExpensesUSDT: decimal("totalExpensesUSDT", { precision: 15, scale: 2 }).default("0").notNull(),
  // التفاصيل
  lastUpdated: timestamp("lastUpdated").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UnifiedAccount = typeof unifiedAccount.$inferSelect;
export type InsertUnifiedAccount = typeof unifiedAccount.$inferInsert;

/**
 * Unified Transactions table - معاملات الحساب الموحد
 * سجل جميع العمليات المالية (إيرادات ومصروفات)
 */
export const unifiedTransactions = mysqlTable("unified_transactions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  transactionType: mysqlEnum("transactionType", ["revenue", "expense"]).notNull(),
  category: varchar("category", { length: 100 }).notNull(), // 'capital_deposit', 'daily_operation_profit', 'card_profit', 'expense', 'salary', 'custody_add', 'custody_return', etc.
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  currency: mysqlEnum("currency", ["LYD", "USD", "USDT"]).notNull(),
  description: text("description").notNull(),
  relatedEntityType: varchar("relatedEntityType", { length: 50 }), // 'operation', 'expense', 'salary', 'custody', 'capital', etc.
  relatedEntityId: varchar("relatedEntityId", { length: 64 }), // ID of related entity
  processedBy: varchar("processedBy", { length: 64 }).notNull(),
  processedByName: text("processedByName").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  notes: text("notes"),
  metadata: json("metadata"), // بيانات إضافية حسب نوع العملية
});

export type UnifiedTransaction = typeof unifiedTransactions.$inferSelect;
export type InsertUnifiedTransaction = typeof unifiedTransactions.$inferInsert;

/**
 * Capital Account table - حساب رأس المال
 * حساب محاسبي يمثل رأس المال الكلي للشركة
 */
export const capitalAccount = mysqlTable("capital_account", {
  id: varchar("id", { length: 64 }).primaryKey(),
  accountName: varchar("accountName", { length: 100 }).default("رأس المال").notNull(),
  // الأرصدة
  totalCapitalLYD: decimal("totalCapitalLYD", { precision: 15, scale: 2 }).default("0").notNull(),
  totalCapitalUSD: decimal("totalCapitalUSD", { precision: 15, scale: 2 }).default("0").notNull(),
  totalCapitalUSDT: decimal("totalCapitalUSDT", { precision: 15, scale: 2 }).default("0").notNull(),
  // التفاصيل
  lastUpdated: timestamp("lastUpdated").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: varchar("createdBy", { length: 64 }).notNull(),
});

export type CapitalAccount = typeof capitalAccount.$inferSelect;
export type InsertCapitalAccount = typeof capitalAccount.$inferInsert;

/**
 * Intermediary Account table - الحساب الوسطي للتوزيع
 * حساب محاسبي داخلي يُستخدم عند بدء تشغيل النظام أو عند زيادة رأس المال
 */
export const intermediaryAccount = mysqlTable("intermediary_account", {
  id: varchar("id", { length: 64 }).primaryKey(),
  accountName: varchar("accountName", { length: 100 }).default("الحساب الوسطي").notNull(),
  // الأرصدة
  balanceLYD: decimal("balanceLYD", { precision: 15, scale: 2 }).default("0").notNull(),
  balanceUSD: decimal("balanceUSD", { precision: 15, scale: 2 }).default("0").notNull(),
  balanceUSDT: decimal("balanceUSDT", { precision: 15, scale: 2 }).default("0").notNull(),
  // الحالة
  isLocked: boolean("isLocked").default(false).notNull(), // true = مقفول (بعد التوزيع)
  // التفاصيل
  lastUpdated: timestamp("lastUpdated").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: varchar("createdBy", { length: 64 }).notNull(),
});

export type IntermediaryAccount = typeof intermediaryAccount.$inferSelect;
export type InsertIntermediaryAccount = typeof intermediaryAccount.$inferInsert;

/**
 * Treasury Accounts table - حسابات الخزينة
 * حسابات الخزينة الفعلية (كاش دينار، كاش دولار، حسابات بنكية)
 */
export const treasuryAccounts = mysqlTable("treasury_accounts", {
  id: varchar("id", { length: 64 }).primaryKey(),
  accountType: mysqlEnum("accountType", ["capital", "distribution", "profits", "cash", "usdt", "bank"]).notNull(),
  accountName: varchar("accountName", { length: 100 }).notNull(),
  // الأرصدة (عمود منفصل لكل عملة)
  balanceLYD: decimal("balanceLYD", { precision: 15, scale: 2 }).default("0").notNull(),
  balanceUSD: decimal("balanceUSD", { precision: 15, scale: 2 }).default("0").notNull(),
  balanceUSDT: decimal("balanceUSDT", { precision: 15, scale: 2 }).default("0").notNull(),
  // معلومات إضافية (للحسابات البنكية)
  bankName: varchar("bankName", { length: 100 }),
  accountHolder: varchar("accountHolder", { length: 100 }),
  accountNumber: varchar("accountNumber", { length: 100 }),
  // الحالة
  isActive: boolean("isActive").default(true).notNull(),
  // التفاصيل
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: varchar("createdBy", { length: 64 }).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TreasuryAccount = typeof treasuryAccounts.$inferSelect;
export type InsertTreasuryAccount = typeof treasuryAccounts.$inferInsert;

/**
 * Account Transactions table - معاملات الحسابات
 * سجل جميع المعاملات بين الحسابات (رأس المال، الوسطي، الخزينة)
 */
export const accountTransactions = mysqlTable("account_transactions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  transactionType: mysqlEnum("transactionType", [
    "capital_deposit", // إيداع رأس مال (من الكاش إلى رأس المال)
    "capital_to_intermediary", // من رأس المال إلى الوسطي
    "intermediary_to_treasury", // من الوسطي إلى الخزينة
    "treasury_to_treasury", // بين حسابات الخزينة
    "operation_revenue", // إيراد من عملية
    "operation_expense", // مصروف من عملية
    "expense", // مصروف عام
    "salary", // راتب
    "adjustment", // تعديل
    "distribution", // توزيع من حساب التوزيع
    "transfer", // تحويل بين الحسابات
  ]).notNull(),
  // الحساب المصدر
  fromAccountType: mysqlEnum("fromAccountType", ["capital", "intermediary", "treasury", "distribution", "cash_lyd", "cash_usd", "usdt", "bank_lyd", "bank_usd", "profits", "external"]),
  fromAccountId: varchar("fromAccountId", { length: 64 }),
  // الحساب الوجهة
  toAccountType: mysqlEnum("toAccountType", ["capital", "intermediary", "treasury", "distribution", "cash_lyd", "cash_usd", "usdt", "bank_lyd", "bank_usd", "profits", "external"]),
  toAccountId: varchar("toAccountId", { length: 64 }),
  // المبالغ (نظام منفصل لكل عملة)
  amountLYD: decimal("amountLYD", { precision: 15, scale: 2 }).default("0").notNull(),
  amountUSD: decimal("amountUSD", { precision: 15, scale: 2 }).default("0").notNull(),
  amountUSDT: decimal("amountUSDT", { precision: 15, scale: 2 }).default("0").notNull(),
  // اتجاه المعاملة (خصم أو زيادة)
  transactionDirection: mysqlEnum("transactionDirection", ["debit", "credit"]).default("credit"),
  // التفاصيل
  description: text("description").notNull(),
  relatedEntityType: varchar("relatedEntityType", { length: 50 }), // 'operation', 'expense', 'salary', etc.
  relatedEntityId: varchar("relatedEntityId", { length: 64 }),
  processedBy: varchar("processedBy", { length: 64 }).notNull(),
  processedByName: text("processedByName").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  notes: text("notes"),
  metadata: json("metadata"),
});

export type AccountTransaction = typeof accountTransactions.$inferSelect;
export type InsertAccountTransaction = typeof accountTransactions.$inferInsert;

/**
 * Daily Operations table - العمليات اليومية
 * سجل جميع العمليات المالية اليومية (سحب بطاقات، تحويلات، صيرفة، إلخ)
 */
export const dailyOperations = mysqlTable("daily_operations", {
  id: varchar("id", { length: 64 }).primaryKey(),
  
  // نوع العملية - ديناميكي
  operationType: mysqlEnum("operationType", [
    "card_withdrawal",        // سحب بطاقة/LYPay/OnePay/إيفاء/رسائل
    "transfer_deposit",       // تحويلات/إيداعات
    "aman_exchange",          // صيرفة الأمان
    "dollar_buy_cash",        // شراء دولار - كاش
    "dollar_buy_bank",        // شراء دولار - مصرفي
    "dollar_sell_cash",       // بيع دولار - كاش
    "dollar_sell_bank",       // بيع دولار - مصرفي
    "usdt_buy_cash",          // شراء USDT - كاش
    "usdt_buy_bank",          // شراء USDT - مصرفي
    "usdt_sell_cash",         // بيع USDT - كاش
    "usdt_sell_bank",         // بيع USDT - مصرفي
    "dollar_card_withdrawal", // سحب بطاقات الدولار
  ]).notNull(),
  
  // بيانات الزبون
  customerName: text("customerName"),
  customerPhone: varchar("customerPhone", { length: 20 }),
  
  // ========== حقول عامة ==========
  // طريقة الدفع
  paymentMethod: mysqlEnum("paymentMethod", ["cash", "bank"]).default("cash"),
  // الحساب البنكي (للمصرفي)
  bankAccountId: varchar("bankAccountId", { length: 64 }),
  
  // ========== سحب بطاقة ==========
  // القيمة المسلمة للزبون (دينار)
  deliveredToCustomer: decimal("deliveredToCustomer", { precision: 15, scale: 2 }),
  // القيمة يلي بيحولها الزبون
  customerTransferAmount: decimal("customerTransferAmount", { precision: 15, scale: 2 }),
  // نسبة الخصم
  discountPercentage: decimal("discountPercentage", { precision: 5, scale: 2 }),
  
  // ========== تحويلات/إيداعات ==========
  // نوع التحويل: account_to_cash | cash_to_account
  transferType: mysqlEnum("transferType", ["account_to_cash", "cash_to_account"]),
  // القيمة يلي سلمها الزبون
  customerPaidAmount: decimal("customerPaidAmount", { precision: 15, scale: 2 }),
  // نسبة (زيادة أو خصم)
  transferPercentage: decimal("transferPercentage", { precision: 5, scale: 2 }),
  // نوع النسبة: increase | discount
  percentageType: mysqlEnum("percentageType", ["increase", "discount"]),
  // القيمة يلي بنسلموها للزبون
  deliveredToCustomerTransfer: decimal("deliveredToCustomerTransfer", { precision: 15, scale: 2 }),
  
  // ========== شراء/بيع دولار ==========
  // القيمة بالدولار
  dollarAmount: decimal("dollarAmount", { precision: 15, scale: 2 }),
  // القيمة بالدينار المسلمة للزبون
  dinarDeliveredToCustomer: decimal("dinarDeliveredToCustomer", { precision: 15, scale: 2 }),
  // القيمة بالدينار المستلمة من الزبون
  dinarReceivedFromCustomer: decimal("dinarReceivedFromCustomer", { precision: 15, scale: 2 }),
  // سعر الشراء
  buyPrice: decimal("buyPrice", { precision: 10, scale: 4 }),
  // سعر البيع
  sellPrice: decimal("sellPrice", { precision: 10, scale: 4 }),
  // سعر السوق
  marketPrice: decimal("marketPrice", { precision: 10, scale: 4 }),
  // السعر المرجعي (يحدده المدير يومياً)
  referencePrice: decimal("referencePrice", { precision: 10, scale: 4 }),
  
  // ========== USDT ==========
  // القيمة USDT
  usdtAmount: decimal("usdtAmount", { precision: 15, scale: 2 }),
  // عمولة نسبة (خصم أو زيادة)
  usdtCommissionPercentage: decimal("usdtCommissionPercentage", { precision: 5, scale: 2 }),
  // عمولة الشبكة (قيمة ثابتة)
  networkFee: decimal("networkFee", { precision: 15, scale: 2 }),
  // القيمة يلي تدخل لحسابنا (بدون عمولة)
  amountToOurAccount: decimal("amountToOurAccount", { precision: 15, scale: 2 }),
  // القيمة بالدينار المدفوعة للزبون (اختياري)
  dinarPaidToCustomer: decimal("dinarPaidToCustomer", { precision: 15, scale: 2 }),
  // القيمة بالدولار المدفوعة للزبون (اختياري)
  dollarPaidToCustomer: decimal("dollarPaidToCustomer", { precision: 15, scale: 2 }),
  // القيمة الكلية (بعد العمولة)
  totalAmount: decimal("totalAmount", { precision: 15, scale: 2 }),
  
  // ========== سحب بطاقات الدولار ==========
  // دولار مستلم (القيمة المسحوبة)
  withdrawnDollar: decimal("withdrawnDollar", { precision: 15, scale: 2 }),
  // نسبة ماكينة
  machinePercentage: decimal("machinePercentage", { precision: 5, scale: 2 }),
  // نسبة شركة
  companyPercentage: decimal("companyPercentage", { precision: 5, scale: 2 }),
  // النسبة الإجمالية (تلقائي)
  totalPercentage: decimal("totalPercentage", { precision: 5, scale: 2 }),
  // سعر بيع لاحق (اختياري)
  laterSellPrice: decimal("laterSellPrice", { precision: 10, scale: 4 }),
  
  // ========== الحسابات التلقائية ==========
  // الربح
  profit: decimal("profit", { precision: 15, scale: 2 }).default("0"),
  
  // ملاحظات
  notes: text("notes"),
  
  // البيانات الإدارية
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: varchar("createdBy", { length: 64 }).notNull(),
  createdByName: text("createdByName").notNull(),
});

export type DailyOperation = typeof dailyOperations.$inferSelect;
export type InsertDailyOperation = typeof dailyOperations.$inferInsert;

/**
 * Expenses table - المصروفات
 * سجل جميع المصروفات (إيجار، كهرباء، ماء، صيانة، إلخ)
 */
export const expenses = mysqlTable("expenses", {
  id: varchar("id", { length: 64 }).primaryKey(),
  // نوع المصروف
  expenseType: mysqlEnum("expenseType", [
    "rent",           // إيجار
    "utilities",      // كهرباء/ماء/غاز
    "maintenance",    // صيانة
    "supplies",       // مستلزمات
    "transportation", // مواصلات
    "communication",  // اتصالات/إنترنت
    "other",          // أخرى
  ]).notNull(),
  // التفاصيل
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  currency: mysqlEnum("currency", ["LYD", "USD", "USDT"]).default("LYD").notNull(),
  // طريقة الدفع
  paymentMethod: mysqlEnum("paymentMethod", ["cash", "bank"]).default("cash"),
  // الربط مع حساب الخزينة
  treasuryAccountId: varchar("treasuryAccountId", { length: 64 }),
  // تاريخ المصروف
  expenseDate: varchar("expenseDate", { length: 20 }).notNull(),
  // ملاحظات
  notes: text("notes"),
  // البيانات الإدارية
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: varchar("createdBy", { length: 64 }).notNull(),
  createdByName: text("createdByName").notNull(),
});

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;

/**
 * Salaries table - الرواتب
 * سجل جميع الرواتب المدفوعة للموظفين
 */
export const salaries = mysqlTable("salaries", {
  id: varchar("id", { length: 64 }).primaryKey(),
  // بيانات الموظف
  employeeId: varchar("employeeId", { length: 64 }).notNull(),
  employeeName: text("employeeName").notNull(),
  // بيانات الراتب
  baseSalary: decimal("baseSalary", { precision: 15, scale: 2 }).notNull(),
  bonuses: decimal("bonuses", { precision: 15, scale: 2 }).default("0"),
  deductions: decimal("deductions", { precision: 15, scale: 2 }).default("0"),
  totalSalary: decimal("totalSalary", { precision: 15, scale: 2 }).notNull(),
  currency: mysqlEnum("currency", ["LYD", "USD", "USDT"]).default("LYD").notNull(),
  // الفترة
  salaryMonth: varchar("salaryMonth", { length: 7 }).notNull(), // YYYY-MM
  // طريقة الدفع
  paymentMethod: mysqlEnum("paymentMethod", ["cash", "bank"]).default("cash"),
  // الربط مع حساب الخزينة
  treasuryAccountId: varchar("treasuryAccountId", { length: 64 }),
  // تاريخ الدفع
  paymentDate: varchar("paymentDate", { length: 20 }).notNull(),
  // ملاحظات
  notes: text("notes"),
  // البيانات الإدارية
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: varchar("createdBy", { length: 64 }).notNull(),
  createdByName: text("createdByName").notNull(),
});

export type Salary = typeof salaries.$inferSelect;
export type InsertSalary = typeof salaries.$inferInsert;

/**
 * Employee Daily Custody table - عهدة الموظف اليومية
 * تتبع الأرصدة الوهمية للموظف خلال اليوم
 */
export const employeeDailyCustody = mysqlTable("employee_daily_custody", {
  id: varchar("id", { length: 64 }).primaryKey(),
  
  // بيانات الموظف
  employeeId: varchar("employeeId", { length: 64 }).notNull(),
  employeeName: text("employeeName").notNull(),
  
  // تاريخ اليوم
  custodyDate: varchar("custodyDate", { length: 20 }).notNull(), // YYYY-MM-DD
  
  // الرصيد الابتدائي (عند فتح اليوم)
  initialBalanceLYDCash: decimal("initialBalanceLYDCash", { precision: 15, scale: 2 }).default("0"),
  initialBalanceLYDBank: decimal("initialBalanceLYDBank", { precision: 15, scale: 2 }).default("0"),
  initialBalanceUSDCash: decimal("initialBalanceUSDCash", { precision: 15, scale: 2 }).default("0"),
  initialBalanceUSDT: decimal("initialBalanceUSDT", { precision: 15, scale: 2 }).default("0"),
  
  // الرصيد الحالي (يتحدث مع كل عملية)
  currentBalanceLYDCash: decimal("currentBalanceLYDCash", { precision: 15, scale: 2 }).default("0"),
  currentBalanceLYDBank: decimal("currentBalanceLYDBank", { precision: 15, scale: 2 }).default("0"),
  currentBalanceUSDCash: decimal("currentBalanceUSDCash", { precision: 15, scale: 2 }).default("0"),
  currentBalanceUSDT: decimal("currentBalanceUSDT", { precision: 15, scale: 2 }).default("0"),
  
  // إجمالي الأرباح اليومية
  totalDailyProfit: decimal("totalDailyProfit", { precision: 15, scale: 2 }).default("0"),
  
  // الحالة
  status: mysqlEnum("status", ["open", "closed"]).default("open").notNull(),
  
  // ملاحظات المدير عند الإغلاق
  managerNotes: text("managerNotes"),
  
  // بيانات الإغلاق
  closedAt: timestamp("closedAt"),
  closedBy: varchar("closedBy", { length: 64 }),
  closedByName: text("closedByName"),
  
  // البيانات الإدارية
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: varchar("createdBy", { length: 64 }).notNull(),
  createdByName: text("createdByName").notNull(),
});

export type EmployeeDailyCustody = typeof employeeDailyCustody.$inferSelect;
export type InsertEmployeeDailyCustody = typeof employeeDailyCustody.$inferInsert;


/**
 * Bank Accounts table - الحسابات البنكية
 */
export const bankAccounts = mysqlTable("bank_accounts", {
  id: varchar("id", { length: 64 }).primaryKey(),
  bankName: text("bankName").notNull(),
  accountNumber: varchar("accountNumber", { length: 64 }).notNull(),
  accountName: text("accountName").notNull(),
  currency: mysqlEnum("currency", ["LYD", "USD"]).notNull(),
  balanceLYD: decimal("balanceLYD", { precision: 15, scale: 2 }).default("0"),
  balanceUSD: decimal("balanceUSD", { precision: 15, scale: 2 }).default("0"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: varchar("createdBy", { length: 64 }).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BankAccount = typeof bankAccounts.$inferSelect;
export type InsertBankAccount = typeof bankAccounts.$inferInsert;

/**
 * Delegates table - المندوبين
 */
export const delegates = mysqlTable("delegates", {
  id: varchar("id", { length: 64 }).primaryKey(),
  fullName: text("fullName").notNull(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  address: text("address"),
  status: mysqlEnum("status", ["active", "disabled"]).default("active").notNull(),
  totalCustomers: int("totalCustomers").default(0).notNull(),
  totalCommissions: decimal("totalCommissions", { precision: 15, scale: 2 }).default("0").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: varchar("createdBy", { length: 64 }).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Delegate = typeof delegates.$inferSelect;
export type InsertDelegate = typeof delegates.$inferInsert;

/**
 * Delegate Commissions table - عمولات المندوبين
 */
export const delegateCommissions = mysqlTable("delegate_commissions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  delegateId: varchar("delegateId", { length: 64 }).notNull(),
  customerId: varchar("customerId", { length: 64 }).notNull(),
  customerName: text("customerName").notNull(),
  bankName: text("bankName").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "paid"]).default("pending").notNull(),
  paidAt: timestamp("paidAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DelegateCommission = typeof delegateCommissions.$inferSelect;
export type InsertDelegateCommission = typeof delegateCommissions.$inferInsert;


/**
 * Company Settings table - إعدادات الشركة
 * يخزن بيانات الشركة التي تظهر في جميع أنحاء التطبيق
 * يمكن تخصيصها لكل شركة تشتري النظام
 */
export const companySettings = mysqlTable("company_settings", {
  id: varchar("id", { length: 64 }).primaryKey().default("default"),
  // المعلومات الأساسية
  companyName: text("company_name").notNull().default("شركة ليبيا للخدمات المالية"),
  companyNameEn: text("company_name_en"),
  slogan: text("slogan").default("حلول مالية احترافية موثوقة وآمنة"),
  // الشعار والهوية البصرية
  logoUrl: text("logo_url"),
  faviconUrl: text("favicon_url"),
  primaryColor: varchar("primary_color", { length: 20 }).default("#1E2E3D"),
  accentColor: varchar("accent_color", { length: 20 }).default("#C9A34D"),
  // بيانات التواصل
  phone: varchar("phone", { length: 50 }).default("0920563695"),
  phone2: varchar("phone2", { length: 50 }),
  email: varchar("email", { length: 255 }),
  website: varchar("website", { length: 255 }),
  // العنوان
  address: text("address").default("صبراته - ليبيا"),
  city: varchar("city", { length: 100 }).default("صبراته"),
  country: varchar("country", { length: 100 }).default("ليبيا"),
  // بيانات قانونية
  licenseNumber: varchar("license_number", { length: 100 }),
  taxNumber: varchar("tax_number", { length: 100 }),
  // إعدادات النظام
  currency: varchar("currency", { length: 10 }).default("LYD"),
  currencySymbol: varchar("currency_symbol", { length: 10 }).default("د.ل"),
  // ميتا
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type CompanySettings = typeof companySettings.$inferSelect;
export type InsertCompanySettings = typeof companySettings.$inferInsert;

// جدول اشتراكات Push Notifications
export const pushSubscriptions = mysqlTable("push_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: varchar("employeeId", { length: 100 }).notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("user_agent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;
