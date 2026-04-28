/**
 * أنواع بيانات نظام الموافقات (Approvals System)
 * يتضمن طلبات إغلاق اليوم والموافقات الأخرى
 */

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface DailyCloseRequest {
  id: string;
  date: Date;
  requestedBy: string; // اسم الموظف
  requestedById: string; // معرف الموظف
  requestedAt: Date;
  
  // بيانات العمليات اليومية
  totalOperations: number;
  totalRevenue: number;
  totalProfit: number;
  openingBalance: number;
  closingBalance: number;
  
  // حالة الطلب
  status: ApprovalStatus;
  
  // بيانات الموافقة/الرفض
  reviewedBy?: string; // اسم المدير
  reviewedById?: string; // معرف المدير
  reviewedAt?: Date;
  rejectionReason?: string;
  
  // ملاحظات
  notes?: string;
}

export interface ApprovalStats {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}
