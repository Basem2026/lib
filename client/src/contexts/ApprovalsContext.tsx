import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DailyCloseRequest, ApprovalStats } from '@/types/approvals';

interface ApprovalsContextType {
  requests: DailyCloseRequest[];
  addRequest: (request: Omit<DailyCloseRequest, 'id' | 'requestedAt' | 'status'>) => void;
  approveRequest: (id: string, reviewedBy: string, reviewedById: string) => void;
  rejectRequest: (id: string, reviewedBy: string, reviewedById: string, reason: string) => void;
  getPendingRequests: () => DailyCloseRequest[];
  getRequestById: (id: string) => DailyCloseRequest | undefined;
  getStats: () => ApprovalStats;
}

const ApprovalsContext = createContext<ApprovalsContextType | undefined>(undefined);

export const ApprovalsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [requests, setRequests] = useState<DailyCloseRequest[]>([]);

  // تحميل البيانات من localStorage
  useEffect(() => {
    const stored = localStorage.getItem('dailyCloseRequests');
    if (stored) {
      const parsed = JSON.parse(stored);
      // تحويل التواريخ من string إلى Date
      const withDates = parsed.map((req: any) => ({
        ...req,
        date: new Date(req.date),
        requestedAt: new Date(req.requestedAt),
        reviewedAt: req.reviewedAt ? new Date(req.reviewedAt) : undefined,
      }));
      setRequests(withDates);
    }
  }, []);

  // حفظ البيانات في localStorage
  useEffect(() => {
    localStorage.setItem('dailyCloseRequests', JSON.stringify(requests));
  }, [requests]);

  const addRequest = useCallback((request: Omit<DailyCloseRequest, 'id' | 'requestedAt' | 'status'>) => {
    const newRequest: DailyCloseRequest = {
      ...request,
      id: Date.now().toString(),
      requestedAt: new Date(),
      status: 'pending',
    };
    setRequests(prev => [...prev, newRequest]);
  }, []);

  const approveRequest = useCallback((id: string, reviewedBy: string, reviewedById: string) => {
    setRequests(prev => prev.map(req => 
      req.id === id 
        ? { 
            ...req, 
            status: 'approved' as const,
            reviewedBy,
            reviewedById,
            reviewedAt: new Date(),
          }
        : req
    ));
  }, []);

  const rejectRequest = useCallback((id: string, reviewedBy: string, reviewedById: string, reason: string) => {
    setRequests(prev => prev.map(req => 
      req.id === id 
        ? { 
            ...req, 
            status: 'rejected' as const,
            reviewedBy,
            reviewedById,
            reviewedAt: new Date(),
            rejectionReason: reason,
          }
        : req
    ));
  }, []);

  const getPendingRequests = useCallback(() => {
    return requests.filter(req => req.status === 'pending');
  }, [requests]);

  const getRequestById = useCallback((id: string) => {
    return requests.find(req => req.id === id);
  }, [requests]);

  const getStats = useCallback((): ApprovalStats => {
    return {
      pending: requests.filter(r => r.status === 'pending').length,
      approved: requests.filter(r => r.status === 'approved').length,
      rejected: requests.filter(r => r.status === 'rejected').length,
      total: requests.length,
    };
  }, [requests]);

  return (
    <ApprovalsContext.Provider value={{
      requests,
      addRequest,
      approveRequest,
      rejectRequest,
      getPendingRequests,
      getRequestById,
      getStats,
    }}>
      {children}
    </ApprovalsContext.Provider>
  );
};

export const useApprovals = () => {
  const context = useContext(ApprovalsContext);
  if (!context) {
    throw new Error('useApprovals must be used within ApprovalsProvider');
  }
  return context;
};
