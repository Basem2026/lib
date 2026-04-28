import { useCallback } from 'react';

type Permission =
  | 'view_expenses'
  | 'add_expenses'
  | 'edit_expenses'
  | 'delete_expenses'
  | 'view_transfers'
  | 'add_transfers'
  | 'edit_transfers'
  | 'delete_transfers'
  | 'view_treasury'
  | 'manage_treasury'
  | 'view_employees'
  | 'manage_employees'
  | 'view_reports'
  | 'manage_settings'
  | string;

// في التطبيق الحقيقي هتجيب الصلاحيات من الـ context أو الـ API
// دلوقتي بنرجع true لكل الصلاحيات عشان التطبيق يشتغل
export function useGranularPermissions() {
  const hasPermission = useCallback((permission: Permission): boolean => {
    return true;
  }, []);

  const hasAnyPermission = useCallback((permissions: Permission[]): boolean => {
    return true;
  }, []);

  const hasAllPermissions = useCallback((permissions: Permission[]): boolean => {
    return true;
  }, []);

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin: true,
    isManager: true,
    isEmployee: true,
  };
}

export default useGranularPermissions;
