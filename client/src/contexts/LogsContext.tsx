import React, { createContext, useContext, useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';

/**
 * نظام السجلات والتدقيق (Logs & Audit Trail System)
 * Comprehensive logging system for all operations
 */

export type LogAction = 
  | 'create' | 'update' | 'delete' | 'print' | 'close_day' | 'approve_close' | 'reject_close' | 'permission_change' | 'login' | 'logout'
  | 'add_customer' | 'edit_customer' | 'delete_customer' | 'view_customer'
  | 'add_card' | 'edit_card' | 'delete_card' | 'view_card'
  | 'change_card_status' | 'update_card_balance' | 'update_deposit_balance'
  | 'bulk_status_change' | 'bulk_withdrawal' | 'withdraw_pending' | 'card_sale_cash' | 'card_sale_bank'
  | 'add_operation' | 'edit_operation' | 'delete_operation' | 'view_operation'
  | 'add_expense' | 'edit_expense' | 'delete_expense'
  | 'add_salary' | 'edit_salary' | 'delete_salary'
  | 'submit_daily_close' | 'approve_daily_close' | 'reject_daily_close'
  | 'add_employee' | 'edit_employee' | 'delete_employee' | 'update_permissions'
  | 'print_receipt' | 'print_report' | 'export_data'
  | 'change_password'
  | 'system_backup' | 'system_restore';

export type EntityType = 
  | 'customer' | 'card' | 'operation' | 'expense' | 'salary' 
  | 'employee' | 'daily_close' | 'system';

export interface AuditTrail {
  id: string;
  action: LogAction;
  entityType: EntityType;
  entityId: string;
  userId: string;
  userName: string;
  timestamp: Date;
  ipAddress?: string;
  details: {
    before?: any;
    after?: any;
    reason?: string;
    description?: string;
  };
  status: 'success' | 'failed';
  errorMessage?: string;
}

export interface SystemLog {
  id: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: Date;
  userId?: string;
  userName?: string;
  details?: any;
}

interface LogsContextType {
  auditTrails: AuditTrail[];
  systemLogs: SystemLog[];
  addAuditTrail: (trail: Omit<AuditTrail, 'id' | 'timestamp'>) => Promise<void>;
  addSystemLog: (log: Omit<SystemLog, 'id' | 'timestamp'>) => void;
  getAuditTrailsByUser: (userId: string) => AuditTrail[];
  getAuditTrailsByEntity: (entityType: EntityType, entityId: string) => AuditTrail[];
  getAuditTrailsByAction: (action: LogAction) => AuditTrail[];
  getAuditTrailsByDateRange: (startDate: Date, endDate: Date) => AuditTrail[];
  getSystemLogsByLevel: (level: 'info' | 'warning' | 'error' | 'critical') => SystemLog[];
  getSystemLogsByDateRange: (startDate: Date, endDate: Date) => SystemLog[];
  exportAuditTrails: (format: 'json' | 'csv') => string;
  clearOldLogs: (daysToKeep: number) => Promise<void>;
  getLogStatistics: () => {
    totalAuditTrails: number;
    totalSystemLogs: number;
    failedOperations: number;
    criticalErrors: number;
    lastActivityTime: Date | null;
  };
  isLoading: boolean;
}

const LogsContext = createContext<LogsContextType | undefined>(undefined);

export const LogsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [auditTrails, setAuditTrails] = useState<AuditTrail[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);

  const [isLoading, setIsLoading] = useState(false);

  // تحميل البيانات من localStorage
  useEffect(() => {
    try {
      // تحميل auditTrails
      const savedTrails = localStorage.getItem('auditTrails');
      if (savedTrails) {
        const parsed = JSON.parse(savedTrails);
        const trails = parsed.map((trail: any) => ({
          ...trail,
          timestamp: trail.timestamp ? new Date(trail.timestamp) : new Date(),
        }));
        setAuditTrails(trails);
      }

      // تحميل systemLogs
      const savedLogs = localStorage.getItem('systemLogs');
      if (savedLogs) {
        const parsed = JSON.parse(savedLogs);
        const logs = parsed.map((log: any) => ({
          ...log,
          timestamp: log.timestamp ? new Date(log.timestamp) : new Date(),
        }));
        setSystemLogs(logs);
      }
    } catch (e) {
      console.error('Failed to load logs from localStorage:', e);
    }
  }, []);

  const addAuditTrail = async (trail: Omit<AuditTrail, 'id' | 'timestamp'>) => {
    const newTrail: AuditTrail = {
      ...trail,
      id: Date.now().toString(),
      timestamp: new Date(),
    };

    const updated = [...auditTrails, newTrail];
    setAuditTrails(updated);
    localStorage.setItem('auditTrails', JSON.stringify(updated));
  };

  const addSystemLog = (log: Omit<SystemLog, 'id' | 'timestamp'>) => {
    const newLog: SystemLog = {
      ...log,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    setSystemLogs([...systemLogs, newLog]);
    
    // حفظ في localStorage مؤقتاً (SystemLogs ليست حرجة)
    localStorage.setItem('systemLogs', JSON.stringify([...systemLogs, newLog]));
  };

  const getAuditTrailsByUser = (userId: string): AuditTrail[] => {
    return auditTrails.filter(trail => trail.userId === userId);
  };

  const getAuditTrailsByEntity = (entityType: EntityType, entityId: string): AuditTrail[] => {
    return auditTrails.filter(trail => trail.entityType === entityType && trail.entityId === entityId);
  };

  const getAuditTrailsByAction = (action: LogAction): AuditTrail[] => {
    return auditTrails.filter(trail => trail.action === action);
  };

  const getAuditTrailsByDateRange = (startDate: Date, endDate: Date): AuditTrail[] => {
    return auditTrails.filter(trail => {
      const trailDate = new Date(trail.timestamp);
      return trailDate >= startDate && trailDate <= endDate;
    });
  };

  const getSystemLogsByLevel = (level: 'info' | 'warning' | 'error' | 'critical'): SystemLog[] => {
    return systemLogs.filter(log => log.level === level);
  };

  const getSystemLogsByDateRange = (startDate: Date, endDate: Date): SystemLog[] => {
    return systemLogs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= startDate && logDate <= endDate;
    });
  };

  const exportAuditTrails = (format: 'json' | 'csv'): string => {
    if (format === 'json') {
      return JSON.stringify(auditTrails, null, 2);
    } else {
      // CSV format
      const headers = ['ID', 'Action', 'Entity Type', 'Entity ID', 'User', 'Timestamp', 'Status'];
      const rows = auditTrails.map(trail => [
        trail.id,
        trail.action,
        trail.entityType,
        trail.entityId,
        trail.userName,
        new Date(trail.timestamp).toLocaleString('ar-LY'),
        trail.status,
      ]);
      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
      return csv;
    }
  };

  const clearOldLogs = async (daysToKeep: number) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    // حذف السجلات القديمة
    const filteredTrails = auditTrails.filter(trail => new Date(trail.timestamp) > cutoffDate);
    const filteredLogs = systemLogs.filter(log => new Date(log.timestamp) > cutoffDate);
    
    setAuditTrails(filteredTrails);
    setSystemLogs(filteredLogs);
    
    localStorage.setItem('auditTrails', JSON.stringify(filteredTrails));
    localStorage.setItem('systemLogs', JSON.stringify(filteredLogs));
  };

  const getLogStatistics = () => {
    const failedOperations = auditTrails.filter(trail => trail.status === 'failed').length;
    const criticalErrors = systemLogs.filter(log => log.level === 'critical').length;
    const lastActivityTime = auditTrails.length > 0 
      ? new Date(auditTrails[auditTrails.length - 1].timestamp)
      : null;

    return {
      totalAuditTrails: auditTrails.length,
      totalSystemLogs: systemLogs.length,
      failedOperations,
      criticalErrors,
      lastActivityTime,
    };
  };

  return (
    <LogsContext.Provider
      value={{
        auditTrails,
        systemLogs,
        addAuditTrail,
        addSystemLog,
        getAuditTrailsByUser,
        getAuditTrailsByEntity,
        getAuditTrailsByAction,
        getAuditTrailsByDateRange,
        getSystemLogsByLevel,
        getSystemLogsByDateRange,
        exportAuditTrails,
        clearOldLogs,
        getLogStatistics,
        isLoading,
      }}
    >
      {children}
    </LogsContext.Provider>
  );
};

export const useLogs = () => {
  const context = useContext(LogsContext);
  if (!context) {
    throw new Error('useLogs must be used within LogsProvider');
  }
  return context;
};
