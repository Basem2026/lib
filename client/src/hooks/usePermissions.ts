import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook للفحص صلاحيات المستخدم الحالي
 * 
 * @example
 * const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();
 * 
 * // فحص صلاحية واحدة
 * if (hasPermission('add_customer')) {
 *   // عرض زر "إضافة زبون"
 * }
 * 
 * // فحص أي صلاحية من قائمة
 * if (hasAnyPermission(['edit_customer', 'delete_customer'])) {
 *   // عرض أزرار التعديل أو الحذف
 * }
 * 
 * // فحص جميع الصلاحيات
 * if (hasAllPermissions(['view_customers', 'add_customer'])) {
 *   // عرض قسم الزبائن الكامل
 * }
 */
export function usePermissions() {
  const { user } = useAuth();

  /**
   * فحص صلاحية واحدة
   * @param permission - اسم الصلاحية
   * @returns true إذا كان المستخدم لديه الصلاحية
   */
  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    
    // المدير لديه جميع الصلاحيات
    if (user.jobTitle === 'manager') return true;
    
    // نحتاج جلب Employee الكامل من localStorage للحصول على permissions
    const employees = JSON.parse(localStorage.getItem('employees') || '[]');
    const employee = employees.find((e: any) => e.id === user.id);
    
    if (!employee) return false;
    
    // فحص الصلاحية في قائمة صلاحيات المستخدم
    return employee.permissions?.includes(permission) ?? false;
  };

  /**
   * فحص أي صلاحية من قائمة
   * @param permissions - قائمة الصلاحيات
   * @returns true إذا كان المستخدم لديه أي صلاحية من القائمة
   */
  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!user) return false;
    
    // المدير لديه جميع الصلاحيات
    if (user.jobTitle === 'manager') return true;
    
    // نحتاج جلب Employee الكامل من localStorage للحصول على permissions
    const employees = JSON.parse(localStorage.getItem('employees') || '[]');
    const employee = employees.find((e: any) => e.id === user.id);
    
    if (!employee) return false;
    
    // فحص أي صلاحية من القائمة
    return permissions.some(permission => 
      employee.permissions?.includes(permission) ?? false
    );
  };

  /**
   * فحص جميع الصلاحيات
   * @param permissions - قائمة الصلاحيات
   * @returns true إذا كان المستخدم لديه جميع الصلاحيات في القائمة
   */
  const hasAllPermissions = (permissions: string[]): boolean => {
    if (!user) return false;
    
    // المدير لديه جميع الصلاحيات
    if (user.jobTitle === 'manager') return true;
    
    // نحتاج جلب Employee الكامل من localStorage للحصول على permissions
    const employees = JSON.parse(localStorage.getItem('employees') || '[]');
    const employee = employees.find((e: any) => e.id === user.id);
    
    if (!employee) return false;
    
    // فحص جميع الصلاحيات
    return permissions.every(permission => 
      employee.permissions?.includes(permission) ?? false
    );
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
}
