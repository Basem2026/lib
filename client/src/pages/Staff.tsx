import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * صفحة خاصة بالموظفين - تحول تلقائياً إلى صفحة Login
 * يتم استخدام هذه الصفحة كـ entry point لتطبيق الموظفين المنفصل
 */
export default function Staff() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // التحويل التلقائي إلى صفحة Login
    setLocation("/login");
  }, [setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1E2E3D]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-[#C9A34D] mx-auto mb-4"></div>
        <p className="text-white text-lg">جاري التحويل إلى صفحة تسجيل الدخول...</p>
      </div>
    </div>
  );
}
