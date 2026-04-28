/**
 * أنواع السجلات (Logs)
 * نظام تسجيل شامل لجميع العمليات في النظام
 */

// أنواع السجلات
export type LogType = 'employee' | 'management' | 'audit';

// أنواع العمليات
export type ActionType =
  | 'create'
  | 'update'
  | 'delete'
  | 'status_change'
  | 'print'
  | 'close_day'
  | 'handover_custody'
  | 'financial_operation'
  | 'login'
  | 'logout'
  | 'permission_change'
  | 'other';

// الكيانات المتأثرة
export type EntityType =
  | 'customer'
  | 'card'
  | 'employee'
  | 'operation'
  | 'expense'
  | 'salary'
  | 'department'
  | 'custody'
  | 'daily_operation'
  | 'bank_account'
  | 'other';

// سجل عام
export interface Log {
  id: string;
  type: LogType;
  action: ActionType;
  entity: EntityType;
  entityId: string;
  performedBy: string; // اسم الموظف
  performedById: string; // ID الموظف
  timestamp: Date;
  description: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

// سجل الموظفين
export interface EmployeeLog extends Log {
  type: 'employee';
  // معلومات إضافية خاصة بالموظفين
  customerName?: string;
  amount?: number;
  profit?: number;
}

// سجل الإدارة
export interface ManagementLog extends Log {
  type: 'management';
  // معلومات إضافية خاصة بالإدارة
  targetEmployeeId?: string;
  targetEmployeeName?: string;
  permissionChanges?: string[];
}

// سجل التعديلات (Audit)
export interface AuditLog extends Log {
  type: 'audit';
  // البيانات قبل وبعد التعديل
  before: Record<string, any>;
  after: Record<string, any>;
  changedFields: string[];
}

// فلتر السجلات
export interface LogFilter {
  type?: LogType;
  action?: ActionType;
  entity?: EntityType;
  performedBy?: string;
  startDate?: Date;
  endDate?: Date;
  searchTerm?: string;
}

// إحصائيات السجلات
export interface LogStats {
  totalLogs: number;
  logsByType: Record<LogType, number>;
  logsByAction: Record<ActionType, number>;
  logsByEntity: Record<EntityType, number>;
  mostActiveUsers: Array<{
    userId: string;
    userName: string;
    count: number;
  }>;
}
