/**
 * أنواع بيانات السجلات والتدقيق
 * Logs and Audit Types
 */

export interface AuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  action: AuditAction;
  module: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  oldValue?: any;
  newValue?: any;
  changes?: AuditChange[];
  status: 'success' | 'failure' | 'warning';
  ipAddress?: string;
  userAgent?: string;
  details?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export type AuditAction = 
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'approve'
  | 'reject'
  | 'publish'
  | 'archive'
  | 'export'
  | 'import'
  | 'login'
  | 'logout'
  | 'permission_change'
  | 'config_change'
  | 'payment'
  | 'transfer'
  | 'deposit'
  | 'withdrawal'
  | 'other';

export interface AuditChange {
  field: string;
  oldValue: any;
  newValue: any;
  changeType: 'added' | 'removed' | 'modified';
}

export interface SystemLog {
  id: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  module: string;
  message: string;
  details?: string;
  stackTrace?: string;
  metadata?: {
    [key: string]: any;
  };
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface UserActivityLog {
  id: string;
  userId: string;
  userName: string;
  timestamp: Date;
  activity: string;
  module: string;
  duration?: number;
  status: 'success' | 'failure' | 'pending';
  details?: string;
  ipAddress?: string;
  sessionId?: string;
}

export interface TransactionLog {
  id: string;
  transactionId: string;
  transactionType: string;
  timestamp: Date;
  status: 'initiated' | 'processing' | 'completed' | 'failed' | 'cancelled';
  amount: number;
  currency: string;
  initiatedBy: string;
  approvedBy?: string;
  processedBy?: string;
  fromAccount?: string;
  toAccount?: string;
  reference?: string;
  errorMessage?: string;
  retryCount: number;
  metadata?: {
    [key: string]: any;
  };
}

export interface SecurityLog {
  id: string;
  timestamp: Date;
  eventType: SecurityEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  userName?: string;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  details?: string;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  action?: string;
}

export type SecurityEventType =
  | 'failed_login'
  | 'successful_login'
  | 'password_change'
  | 'permission_change'
  | 'unauthorized_access'
  | 'suspicious_activity'
  | 'data_access'
  | 'configuration_change'
  | 'backup_created'
  | 'backup_restored'
  | 'system_update'
  | 'security_alert'
  | 'other';

export interface ComplianceLog {
  id: string;
  timestamp: Date;
  complianceType: string;
  status: 'compliant' | 'non_compliant' | 'warning' | 'pending_review';
  description: string;
  affectedRecords: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action?: string;
  actionTakenAt?: Date;
  actionTakenBy?: string;
  notes?: string;
  evidence?: string[];
}

export interface DataIntegrityLog {
  id: string;
  timestamp: Date;
  checkType: string;
  status: 'passed' | 'failed' | 'warning';
  recordsChecked: number;
  issuesFound: number;
  issues?: DataIntegrityIssue[];
  correctedAt?: Date;
  correctedBy?: string;
  details?: string;
}

export interface DataIntegrityIssue {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedRecords: string[];
  suggestedAction?: string;
  resolved: boolean;
}

export interface PerformanceLog {
  id: string;
  timestamp: Date;
  module: string;
  operation: string;
  duration: number; // in milliseconds
  status: 'success' | 'failure' | 'timeout';
  recordsProcessed?: number;
  memoryUsed?: number;
  cpuUsed?: number;
  details?: string;
}

export interface BackupLog {
  id: string;
  timestamp: Date;
  backupType: 'full' | 'incremental' | 'differential';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  sizeBytes?: number;
  recordsBackedUp?: number;
  location?: string;
  verificationStatus?: 'pending' | 'verified' | 'failed';
  verifiedAt?: Date;
  verifiedBy?: string;
  notes?: string;
  initiatedBy: string;
}

export interface AuditReport {
  id: string;
  generatedDate: Date;
  generatedBy: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  summary: {
    totalLogs: number;
    totalActions: number;
    totalUsers: number;
    successRate: number;
    failureRate: number;
  };
  topUsers: {
    userId: string;
    userName: string;
    actionCount: number;
  }[];
  topModules: {
    module: string;
    actionCount: number;
  }[];
  securityEvents: number;
  complianceIssues: number;
  dataIntegrityIssues: number;
  recommendations: string[];
  status: 'draft' | 'finalized' | 'approved' | 'archived';
  approvedBy?: string;
  approvedDate?: Date;
}

export interface LogFilter {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  action?: string;
  module?: string;
  status?: string;
  severity?: string;
  searchText?: string;
}

export interface LogStatistics {
  totalLogs: number;
  logsByLevel: {
    [key: string]: number;
  };
  logsByModule: {
    [key: string]: number;
  };
  logsByAction: {
    [key: string]: number;
  };
  successRate: number;
  failureRate: number;
  averageResponseTime: number;
  peakHour: number;
}
