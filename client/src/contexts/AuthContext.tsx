import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface User {
  id: string;
  phone: string;
  fullName: string;
  jobTitle: string;
  employeeCode: string;
  status?: 'active' | 'blocked' | 'disabled';
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // تحميل بيانات المستخدم من localStorage عند بدء التطبيق
  useEffect(() => {
    const loadUser = () => {
      try {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          
          // التحقق من حالة الموظف - فقط المحظورين يتم توجيههم لصفحة الحظر
          if (parsedUser.status === 'blocked') {
            setUser(parsedUser); // نحتفظ ببيانات المستخدم لعرضها في صفحة الحظر
            if (window.location.pathname !== '/blocked' && window.location.pathname !== '/login') {
              window.location.href = '/blocked';
            }
          } else {
            setUser(parsedUser);
          }
        }
      } catch (error) {
        console.error('Error loading user from localStorage:', error);
        localStorage.removeItem('currentUser');
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (phone: string, password: string) => {
    // هذه الوظيفة موجودة للتوافق فقط
    // تسجيل الدخول الفعلي يتم في صفحة Login
    throw new Error('يجب استخدام صفحة Login لتسجيل الدخول');
  };

  const logout = () => {
    localStorage.removeItem('currentUser');
    setUser(null);
    window.location.href = '/login';
  };

  const refreshUser = () => {
    try {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  const hasPermission = (permission: string): boolean => {
    // سيتم التحقق من الصلاحيات في ProtectedRoute
    return true;
  };

  const hasRole = (role: string): boolean => {
    if (!user) return false;
    return user.jobTitle === role;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshUser,
        hasPermission,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
