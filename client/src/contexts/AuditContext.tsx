import React, { createContext, useContext, useState, useCallback } from 'react';
import { AuditLog, SystemLog, UserActivityLog, TransactionLog, SecurityLog, BackupLog, AuditReport, LogFilter } from '@/types/audit';

interface AuditContextType {
  // Audit Logs
  auditLogs: AuditLog[];
  addAuditLog: (log: AuditLog) => void;
  getAuditLogsByUser: (userId: string) => AuditLog[];
  getAuditLogsByModule: (module: string) => AuditLog[];
  getAuditLogsByAction: (action: string) => AuditLog[];
  getAuditLogsByDateRange: (startDate: Date, endDate: Date) => AuditLog[];
  filterAuditLogs: (filter: LogFilter) => AuditLog[];
  getTotalAuditLogs: () => number;

  // System Logs
  systemLogs: SystemLog[];
  addSystemLog: (log: SystemLog) => void;
  getSystemLogsByLevel: (level: string) => SystemLog[];
  getSystemLogsByModule: (module: string) => SystemLog[];
  getUnresolvedSystemLogs: () => SystemLog[];
  resolveSystemLog: (id: string, resolvedBy: string) => void;

  // User Activity
  userActivityLogs: UserActivityLog[];
  addUserActivityLog: (log: UserActivityLog) => void;
  getUserActivityByUserId: (userId: string) => UserActivityLog[];
  getUserActivityByModule: (module: string) => UserActivityLog[];
  getTotalUserActivity: () => number;

  // Transaction Logs
  transactionLogs: TransactionLog[];
  addTransactionLog: (log: TransactionLog) => void;
  getTransactionLogsByStatus: (status: string) => TransactionLog[];
  getTransactionLogsByType: (type: string) => TransactionLog[];
  getFailedTransactions: () => TransactionLog[];
  updateTransactionLog: (id: string, updates: Partial<TransactionLog>) => void;

  // Security Logs
  securityLogs: SecurityLog[];
  addSecurityLog: (log: SecurityLog) => void;
  getSecurityLogsByEventType: (eventType: string) => SecurityLog[];
  getCriticalSecurityEvents: () => SecurityLog[];
  getUnresolvedSecurityEvents: () => SecurityLog[];
  resolveSecurityEvent: (id: string, resolvedBy: string, action: string) => void;

  // Backup Logs
  backupLogs: BackupLog[];
  addBackupLog: (log: BackupLog) => void;
  getBackupsByStatus: (status: string) => BackupLog[];
  getLatestBackup: () => BackupLog | null;
  getBackupsByType: (type: string) => BackupLog[];

  // Reports
  auditReports: AuditReport[];
  generateAuditReport: (startDate: Date, endDate: Date, generatedBy: string) => void;
  getAuditReportsByPeriod: (startDate: Date, endDate: Date) => AuditReport[];

  // Statistics
  getLogStatistics: () => {
    totalLogs: number;
    logsByLevel: { [key: string]: number };
    logsByModule: { [key: string]: number };
    successRate: number;
    failureRate: number;
  };
  getSecurityEventsSummary: () => {
    totalEvents: number;
    criticalEvents: number;
    unresolvedEvents: number;
    eventsByType: { [key: string]: number };
  };
  getSystemHealthStatus: () => {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    lastCheck: Date;
  };
}

const AuditContext = createContext<AuditContextType | undefined>(undefined);

export const AuditProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [userActivityLogs, setUserActivityLogs] = useState<UserActivityLog[]>([]);
  const [transactionLogs, setTransactionLogs] = useState<TransactionLog[]>([]);
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [backupLogs, setBackupLogs] = useState<BackupLog[]>([]);
  const [auditReports, setAuditReports] = useState<AuditReport[]>([]);

  // Audit Log functions
  const addAuditLog = useCallback((log: AuditLog) => {
    setAuditLogs(prev => [...prev, log]);
  }, []);

  const getAuditLogsByUser = useCallback((userId: string) => {
    return auditLogs.filter(log => log.userId === userId);
  }, [auditLogs]);

  const getAuditLogsByModule = useCallback((module: string) => {
    return auditLogs.filter(log => log.module === module);
  }, [auditLogs]);

  const getAuditLogsByAction = useCallback((action: string) => {
    return auditLogs.filter(log => log.action === action);
  }, [auditLogs]);

  const getAuditLogsByDateRange = useCallback((startDate: Date, endDate: Date) => {
    return auditLogs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= startDate && logDate <= endDate;
    });
  }, [auditLogs]);

  const filterAuditLogs = useCallback((filter: LogFilter) => {
    return auditLogs.filter(log => {
      if (filter.startDate && new Date(log.timestamp) < filter.startDate) return false;
      if (filter.endDate && new Date(log.timestamp) > filter.endDate) return false;
      if (filter.userId && log.userId !== filter.userId) return false;
      if (filter.action && log.action !== filter.action) return false;
      if (filter.module && log.module !== filter.module) return false;
      if (filter.status && log.status !== filter.status) return false;
      if (filter.severity && log.severity !== filter.severity) return false;
      return true;
    });
  }, [auditLogs]);

  const getTotalAuditLogs = useCallback(() => {
    return auditLogs.length;
  }, [auditLogs]);

  // System Log functions
  const addSystemLog = useCallback((log: SystemLog) => {
    setSystemLogs(prev => [...prev, log]);
  }, []);

  const getSystemLogsByLevel = useCallback((level: string) => {
    return systemLogs.filter(log => log.level === level);
  }, [systemLogs]);

  const getSystemLogsByModule = useCallback((module: string) => {
    return systemLogs.filter(log => log.module === module);
  }, [systemLogs]);

  const getUnresolvedSystemLogs = useCallback(() => {
    return systemLogs.filter(log => !log.resolved);
  }, [systemLogs]);

  const resolveSystemLog = useCallback((id: string, resolvedBy: string) => {
    setSystemLogs(prev =>
      prev.map(log => 
        log.id === id 
          ? { ...log, resolved: true, resolvedAt: new Date(), resolvedBy }
          : log
      )
    );
  }, []);

  // User Activity functions
  const addUserActivityLog = useCallback((log: UserActivityLog) => {
    setUserActivityLogs(prev => [...prev, log]);
  }, []);

  const getUserActivityByUserId = useCallback((userId: string) => {
    return userActivityLogs.filter(log => log.userId === userId);
  }, [userActivityLogs]);

  const getUserActivityByModule = useCallback((module: string) => {
    return userActivityLogs.filter(log => log.module === module);
  }, [userActivityLogs]);

  const getTotalUserActivity = useCallback(() => {
    return userActivityLogs.length;
  }, [userActivityLogs]);

  // Transaction Log functions
  const addTransactionLog = useCallback((log: TransactionLog) => {
    setTransactionLogs(prev => [...prev, log]);
  }, []);

  const getTransactionLogsByStatus = useCallback((status: string) => {
    return transactionLogs.filter(log => log.status === status);
  }, [transactionLogs]);

  const getTransactionLogsByType = useCallback((type: string) => {
    return transactionLogs.filter(log => log.transactionType === type);
  }, [transactionLogs]);

  const getFailedTransactions = useCallback(() => {
    return transactionLogs.filter(log => log.status === 'failed' || log.status === 'cancelled');
  }, [transactionLogs]);

  const updateTransactionLog = useCallback((id: string, updates: Partial<TransactionLog>) => {
    setTransactionLogs(prev =>
      prev.map(log => log.id === id ? { ...log, ...updates } : log)
    );
  }, []);

  // Security Log functions
  const addSecurityLog = useCallback((log: SecurityLog) => {
    setSecurityLogs(prev => [...prev, log]);
  }, []);

  const getSecurityLogsByEventType = useCallback((eventType: string) => {
    return securityLogs.filter(log => log.eventType === eventType);
  }, [securityLogs]);

  const getCriticalSecurityEvents = useCallback(() => {
    return securityLogs.filter(log => log.severity === 'critical');
  }, [securityLogs]);

  const getUnresolvedSecurityEvents = useCallback(() => {
    return securityLogs.filter(log => !log.resolved);
  }, [securityLogs]);

  const resolveSecurityEvent = useCallback((id: string, resolvedBy: string, action: string) => {
    setSecurityLogs(prev =>
      prev.map(log =>
        log.id === id
          ? { ...log, resolved: true, resolvedAt: new Date(), resolvedBy, action }
          : log
      )
    );
  }, []);

  // Backup Log functions
  const addBackupLog = useCallback((log: BackupLog) => {
    setBackupLogs(prev => [...prev, log]);
  }, []);

  const getBackupsByStatus = useCallback((status: string) => {
    return backupLogs.filter(log => log.status === status);
  }, [backupLogs]);

  const getLatestBackup = useCallback(() => {
    const completed = backupLogs.filter(log => log.status === 'completed');
    return completed.length > 0 ? completed[completed.length - 1] : null;
  }, [backupLogs]);

  const getBackupsByType = useCallback((type: string) => {
    return backupLogs.filter(log => log.backupType === type);
  }, [backupLogs]);

  // Report functions
  const generateAuditReport = useCallback((startDate: Date, endDate: Date, generatedBy: string) => {
    const logsInPeriod = getAuditLogsByDateRange(startDate, endDate);
    const report: AuditReport = {
      id: Date.now().toString(),
      generatedDate: new Date(),
      generatedBy,
      period: { startDate, endDate },
      summary: {
        totalLogs: logsInPeriod.length,
        totalActions: new Set(logsInPeriod.map(l => l.action)).size,
        totalUsers: new Set(logsInPeriod.map(l => l.userId)).size,
        successRate: (logsInPeriod.filter(l => l.status === 'success').length / logsInPeriod.length) * 100,
        failureRate: (logsInPeriod.filter(l => l.status === 'failure').length / logsInPeriod.length) * 100,
      },
      topUsers: [],
      topModules: [],
      securityEvents: securityLogs.filter(l => new Date(l.timestamp) >= startDate && new Date(l.timestamp) <= endDate).length,
      complianceIssues: 0,
      dataIntegrityIssues: 0,
      recommendations: [],
      status: 'draft',
    };
    setAuditReports(prev => [...prev, report]);
  }, [getAuditLogsByDateRange, securityLogs]);

  const getAuditReportsByPeriod = useCallback((startDate: Date, endDate: Date) => {
    return auditReports.filter(report => {
      const reportStart = new Date(report.period.startDate);
      const reportEnd = new Date(report.period.endDate);
      return reportStart >= startDate && reportEnd <= endDate;
    });
  }, [auditReports]);

  // Statistics functions
  const getLogStatistics = useCallback(() => {
    const logsByLevel: { [key: string]: number } = {};
    const logsByModule: { [key: string]: number } = {};
    
    systemLogs.forEach(log => {
      logsByLevel[log.level] = (logsByLevel[log.level] || 0) + 1;
      logsByModule[log.module] = (logsByModule[log.module] || 0) + 1;
    });

    const successCount = auditLogs.filter(l => l.status === 'success').length;
    const failureCount = auditLogs.filter(l => l.status === 'failure').length;
    const total = auditLogs.length;

    return {
      totalLogs: total,
      logsByLevel,
      logsByModule,
      successRate: total > 0 ? (successCount / total) * 100 : 0,
      failureRate: total > 0 ? (failureCount / total) * 100 : 0,
    };
  }, [systemLogs, auditLogs]);

  const getSecurityEventsSummary = useCallback(() => {
    const eventsByType: { [key: string]: number } = {};
    securityLogs.forEach(log => {
      eventsByType[log.eventType] = (eventsByType[log.eventType] || 0) + 1;
    });

    return {
      totalEvents: securityLogs.length,
      criticalEvents: getCriticalSecurityEvents().length,
      unresolvedEvents: getUnresolvedSecurityEvents().length,
      eventsByType,
    };
  }, [securityLogs, getCriticalSecurityEvents, getUnresolvedSecurityEvents]);

  const getSystemHealthStatus = useCallback(() => {
    const unresolvedLogs = getUnresolvedSystemLogs();
    const criticalSecurityEvents = getCriticalSecurityEvents();
    const failedTransactions = getFailedTransactions();

    const issues: string[] = [];
    if (unresolvedLogs.length > 0) issues.push(`${unresolvedLogs.length} سجلات نظام غير محلولة`);
    if (criticalSecurityEvents.length > 0) issues.push(`${criticalSecurityEvents.length} أحداث أمان حرجة`);
    if (failedTransactions.length > 0) issues.push(`${failedTransactions.length} معاملات فاشلة`);

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (issues.length > 0) status = 'warning';
    if (criticalSecurityEvents.length > 0 || failedTransactions.length > 5) status = 'critical';

    return {
      status,
      issues,
      lastCheck: new Date(),
    };
  }, [getUnresolvedSystemLogs, getCriticalSecurityEvents, getFailedTransactions]);

  return (
    <AuditContext.Provider
      value={{
        auditLogs,
        addAuditLog,
        getAuditLogsByUser,
        getAuditLogsByModule,
        getAuditLogsByAction,
        getAuditLogsByDateRange,
        filterAuditLogs,
        getTotalAuditLogs,
        systemLogs,
        addSystemLog,
        getSystemLogsByLevel,
        getSystemLogsByModule,
        getUnresolvedSystemLogs,
        resolveSystemLog,
        userActivityLogs,
        addUserActivityLog,
        getUserActivityByUserId,
        getUserActivityByModule,
        getTotalUserActivity,
        transactionLogs,
        addTransactionLog,
        getTransactionLogsByStatus,
        getTransactionLogsByType,
        getFailedTransactions,
        updateTransactionLog,
        securityLogs,
        addSecurityLog,
        getSecurityLogsByEventType,
        getCriticalSecurityEvents,
        getUnresolvedSecurityEvents,
        resolveSecurityEvent,
        backupLogs,
        addBackupLog,
        getBackupsByStatus,
        getLatestBackup,
        getBackupsByType,
        auditReports,
        generateAuditReport,
        getAuditReportsByPeriod,
        getLogStatistics,
        getSecurityEventsSummary,
        getSystemHealthStatus,
      }}
    >
      {children}
    </AuditContext.Provider>
  );
};

export const useAudit = () => {
  const context = useContext(AuditContext);
  if (!context) {
    throw new Error('useAudit must be used within AuditProvider');
  }
  return context;
};
