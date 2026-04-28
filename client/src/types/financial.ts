/**
 * أنواع بيانات المصاريف والرواتب والتقارير
 * Expenses, Salaries, and Reports Types
 */

// ============ EXPENSES ============
export interface Expense {
  id: string;
  date: Date;
  category: ExpenseCategoryType;
  description: string;
  amount: number;
  currency: 'LYD' | 'USD' | 'USDT';
  vendor?: string;
  invoiceNumber?: string;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  approvedBy?: string;
  approvedDate?: Date;
  paidDate?: Date;
  notes?: string;
  attachments?: string[];
  createdBy: string;
  createdDate: Date;
  updatedAt: Date;
}

export type ExpenseCategoryType = 
  | 'rent'
  | 'utilities'
  | 'salaries'
  | 'office_supplies'
  | 'maintenance'
  | 'transportation'
  | 'insurance'
  | 'marketing'
  | 'technology'
  | 'training'
  | 'other';

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  budget?: number;
  spent: number;
  currency: 'LYD' | 'USD' | 'USDT';
}

// ============ SALARIES ============
export interface Salary {
  id: string;
  employeeId: string;
  month: number;
  year: number;
  baseSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  currency: 'LYD' | 'USD' | 'USDT';
  status: 'draft' | 'approved' | 'paid' | 'pending';
  paymentDate?: Date;
  paymentMethod: 'cash' | 'bank' | 'check';
  notes?: string;
  createdBy: string;
  createdDate: Date;
  approvedBy?: string;
  approvedDate?: Date;
}

export interface SalaryComponent {
  id: string;
  name: string;
  type: 'allowance' | 'deduction';
  amount: number;
  percentage?: number;
  isFixed: boolean;
  description?: string;
}

export interface Payroll {
  id: string;
  month: number;
  year: number;
  status: 'draft' | 'approved' | 'processed' | 'paid';
  totalBaseSalary: number;
  totalAllowances: number;
  totalDeductions: number;
  totalNetSalary: number;
  employeeCount: number;
  processedDate?: Date;
  processedBy?: string;
  paidDate?: Date;
  paidBy?: string;
  notes?: string;
  salaries: Salary[];
}

// ============ REPORTS ============
export interface Report {
  id: string;
  type: ReportType;
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  startDate: Date;
  endDate: Date;
  generatedDate: Date;
  generatedBy: string;
  status: 'draft' | 'finalized' | 'archived';
  data: ReportData;
  summary: ReportSummary;
  notes?: string;
}

export type ReportType = 
  | 'financial_summary'
  | 'cash_flow'
  | 'income_statement'
  | 'balance_sheet'
  | 'customer_activity'
  | 'transaction_summary'
  | 'expense_breakdown'
  | 'payroll_summary'
  | 'audit_trail';

export interface ReportData {
  totalDeposits: number;
  totalWithdrawals: number;
  totalTransfers: number;
  totalExpenses: number;
  totalSalaries: number;
  netIncome: number;
  cashBalance: number;
  bankBalance: number;
  customerCount: number;
  transactionCount: number;
  [key: string]: any;
}

export interface ReportSummary {
  title: string;
  description: string;
  keyMetrics: {
    label: string;
    value: number | string;
    change?: number;
  }[];
  highlights: string[];
  warnings?: string[];
}

export interface FinancialStatement {
  id: string;
  type: 'income_statement' | 'balance_sheet' | 'cash_flow';
  period: string;
  date: Date;
  items: FinancialItem[];
  totals: {
    revenue: number;
    expenses: number;
    netIncome: number;
    assets?: number;
    liabilities?: number;
    equity?: number;
  };
  generatedBy: string;
  generatedDate: Date;
}

export interface FinancialItem {
  id: string;
  category: string;
  subcategory?: string;
  description: string;
  amount: number;
  percentage?: number;
  trend?: 'up' | 'down' | 'stable';
}

export interface AuditReport {
  id: string;
  date: Date;
  period: string;
  auditorName: string;
  findings: AuditFinding[];
  recommendations: string[];
  status: 'pending' | 'completed' | 'approved';
  approvedBy?: string;
  approvedDate?: Date;
  notes?: string;
}

export interface AuditFinding {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  description: string;
  impact?: string;
  recommendedAction?: string;
  status: 'open' | 'in_progress' | 'resolved';
}

export interface BudgetPlan {
  id: string;
  year: number;
  month?: number;
  categories: {
    category: string;
    budgetAmount: number;
    actualAmount: number;
    variance: number;
    percentage: number;
  }[];
  totalBudget: number;
  totalActual: number;
  totalVariance: number;
  status: 'draft' | 'approved' | 'active' | 'closed';
  createdBy: string;
  createdDate: Date;
  approvedBy?: string;
  approvedDate?: Date;
}

export interface FinancialMetrics {
  profitMargin: number;
  returnOnAssets: number;
  debtToEquity: number;
  currentRatio: number;
  quickRatio: number;
  workingCapital: number;
  cashConversionCycle: number;
  assetTurnover: number;
  [key: string]: number;
}
