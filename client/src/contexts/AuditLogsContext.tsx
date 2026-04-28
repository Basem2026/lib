import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc';

// Types
export type LogType = 'management' | 'employee';
export type ActionType = 'add' | 'edit' | 'delete' | 'block' | 'unblock' | 'disable' | 'enable';
export type EntityType = 'employee' | 'customer' | 'card' | 'operation' | 'expense' | 'salary' | 'permission' | 'service';

export interface ChangeDetail {
  field: string;
  fieldLabel: string;
  oldValue: any;
  newValue: any;
}

export interface AuditLog {
  id: string;
  logType: LogType;
  actionType: ActionType;
  entityType: EntityType;
  entityId: string;
  entityName: string;
  
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  
  timestamp: number;
  date: string;
  time: string;
  
  description: string;
  before?: Record<string, any>;
  after?: Record<string, any>;
  changes?: ChangeDetail[];
}

interface AuditLogsContextType {
  managementLogs: AuditLog[];
  employeeLogs: AuditLog[];
  addLog: (log: Omit<AuditLog, 'id' | 'employeeId' | 'employeeName' | 'employeeRole' | 'timestamp' | 'date' | 'time'>) => void;
  clearLogs: (logType: LogType) => void;
}

const AuditLogsContext = createContext<AuditLogsContextType | undefined>(undefined);

const MAX_LOGS = 1000;

// Map local actionType to DB action enum
function mapActionToDb(actionType: ActionType): string {
  const map: Record<ActionType, string> = {
    add: 'create',
    edit: 'update',
    delete: 'delete',
    block: 'update',
    unblock: 'update',
    disable: 'update',
    enable: 'update',
  };
  return map[actionType] || 'update';
}

// Map local entityType to DB entityType enum
function mapEntityTypeToDb(entityType: EntityType): string {
  const map: Record<EntityType, string> = {
    employee: 'employee',
    customer: 'customer',
    card: 'card',
    operation: 'operation',
    expense: 'expense',
    salary: 'salary',
    permission: 'employee',
    service: 'settings',
  };
  return map[entityType] || 'system';
}

export function AuditLogsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [managementLogs, setManagementLogs] = useState<AuditLog[]>([]);
  const [employeeLogs, setEmployeeLogs] = useState<AuditLog[]>([]);
  const migrationDoneRef = useRef(false);

  const addLogMutation = trpc.auditLogs.addLog.useMutation();
  const bulkInsertMutation = trpc.auditLogs.bulkInsert.useMutation();

  // Load logs from localStorage
  useEffect(() => {
    const savedManagementLogs = localStorage.getItem('audit_logs_management');
    const savedEmployeeLogs = localStorage.getItem('audit_logs_employee');
    
    if (savedManagementLogs) {
      try {
        setManagementLogs(JSON.parse(savedManagementLogs));
      } catch (e) {
        console.error('Failed to parse management logs:', e);
      }
    }
    
    if (savedEmployeeLogs) {
      try {
        setEmployeeLogs(JSON.parse(savedEmployeeLogs));
      } catch (e) {
        console.error('Failed to parse employee logs:', e);
      }
    }
  }, []);

  // Save logs to localStorage (keep as backup)
  useEffect(() => {
    localStorage.setItem('audit_logs_management', JSON.stringify(managementLogs));
  }, [managementLogs]);

  useEffect(() => {
    localStorage.setItem('audit_logs_employee', JSON.stringify(employeeLogs));
  }, [employeeLogs]);

  // Migrate old logs from localStorage to DB once
  useEffect(() => {
    if (migrationDoneRef.current) return;
    const migrationKey = 'audit_logs_migrated_v1';
    if (localStorage.getItem(migrationKey)) return;

    const allLocalLogs = [...managementLogs, ...employeeLogs];
    if (allLocalLogs.length === 0) {
      localStorage.setItem(migrationKey, '1');
      return;
    }

    migrationDoneRef.current = true;

    // Convert to DB format
    const dbLogs = allLocalLogs.map(log => ({
      id: log.id,
      action: mapActionToDb(log.actionType) as any,
      entityType: mapEntityTypeToDb(log.entityType) as any,
      entityId: log.entityId || undefined,
      userId: log.employeeId || 'unknown',
      userName: log.employeeName || 'مجهول',
      timestamp: log.timestamp,
      details: {
        description: log.description,
        before: log.before,
        after: log.after,
        metadata: { entityName: log.entityName, employeeRole: log.employeeRole },
      },
    }));

    bulkInsertMutation.mutate(
      { logs: dbLogs },
      {
        onSuccess: (result) => {
          console.log(`[AuditLogs] Migrated ${result.inserted} logs to DB`);
          localStorage.setItem(migrationKey, '1');
        },
        onError: (err) => {
          console.error('[AuditLogs] Migration failed:', err);
          migrationDoneRef.current = false;
        },
      }
    );
  }, [managementLogs, employeeLogs]);

  const addLog = (logData: Omit<AuditLog, 'id' | 'employeeId' | 'employeeName' | 'employeeRole' | 'timestamp' | 'date' | 'time'>) => {
    
    if (!user) {
      console.warn('Cannot add log: user not authenticated');
      return;
    }

    const now = new Date();
    const timestamp = now.getTime();
    const date = now.toLocaleDateString('ar-LY', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/');
    const time = now.toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

    const employeeName = (user as any).fullName || (user as any).name || 'مجهول';
    const employeeId = user.id?.toString() || 'unknown';

    const newLog: AuditLog = {
      ...logData,
      id: `log_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
      employeeId,
      employeeName,
      employeeRole: (user as any).jobTitle || (user as any).role || 'موظف',
      timestamp,
      date,
      time,
    };

    // Save to localStorage (local state)
    if (logData.logType === 'management') {
      setManagementLogs(prev => {
        const updated = [newLog, ...prev];
        return updated.slice(0, MAX_LOGS);
      });
    } else {
      setEmployeeLogs(prev => {
        const updated = [newLog, ...prev];
        return updated.slice(0, MAX_LOGS);
      });
    }

    // Also save to DB
    addLogMutation.mutate({
      id: newLog.id,
      action: mapActionToDb(logData.actionType) as any,
      entityType: mapEntityTypeToDb(logData.entityType) as any,
      entityId: logData.entityId || undefined,
      userId: employeeId,
      userName: employeeName,
      timestamp,
      details: {
        description: logData.description,
        before: logData.before,
        after: logData.after,
        metadata: {
          entityName: logData.entityName,
          employeeRole: (user as any).jobTitle || 'موظف',
          logType: logData.logType,
        },
      },
    });
  };

  const clearLogs = (logType: LogType) => {
    if (logType === 'management') {
      setManagementLogs([]);
      localStorage.removeItem('audit_logs_management');
    } else {
      setEmployeeLogs([]);
      localStorage.removeItem('audit_logs_employee');
    }
  };

  return (
    <AuditLogsContext.Provider value={{ managementLogs, employeeLogs, addLog, clearLogs }}>
      {children}
    </AuditLogsContext.Provider>
  );
}

export function useAuditLogs() {
  const context = useContext(AuditLogsContext);
  if (!context) {
    throw new Error('useAuditLogs must be used within AuditLogsProvider');
  }
  return context;
}
