import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Home, ArrowLeft, Search } from "lucide-react";
import { BRAND_COLORS } from "@/lib/colors";

/**
 * صفحة 404 - الصفحة غير موجودة
 * تصميم احترافي بالهوية البصرية للشركة
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: BRAND_COLORS.background }}>
      <div className="container max-w-2xl mx-auto px-4 py-16 text-center">
        {/* الشعار */}
        <div className="flex justify-center mb-8">
          <img 
            src="/images/FEEA4B39-043C-4521-B1BB-AE99E9198AD1(1).png" 
            alt="شركة ليبيا للخدمات المالية" 
            className="w-32 h-32 rounded-full shadow-lg"
          />
        </div>

        {/* رقم 404 */}
        <div className="mb-8">
          <h1 
            className="text-9xl font-bold mb-4"
            style={{ color: BRAND_COLORS.navy }}
          >
            404
          </h1>
          <h2 
            className="text-3xl font-bold mb-4"
            style={{ color: BRAND_COLORS.navy }}
          >
            الصفحة غير موجودة
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها إلى موقع آخر.
          </p>
        </div>

        {/* الأزرار */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/">
            <Button 
              className="text-white gap-2 px-6 py-6 text-lg"
              style={{ backgroundColor: BRAND_COLORS.navy }}
            >
              <Home className="w-5 h-5" />
              العودة للصفحة الرئيسية
            </Button>
          </Link>
          
          <Button 
            variant="outline"
            className="gap-2 px-6 py-6 text-lg border-2"
            style={{ 
              borderColor: BRAND_COLORS.navy,
              color: BRAND_COLORS.navy
            }}
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-5 h-5" />
            العودة للصفحة السابقة
          </Button>
        </div>

        {/* معلومات إضافية */}
        <div 
          className="mt-12 p-6 rounded-lg border-r-4"
          style={{ 
            backgroundColor: BRAND_COLORS.white,
            borderRightColor: BRAND_COLORS.gold
          }}
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            <Search className="w-5 h-5" style={{ color: BRAND_COLORS.gold }} />
            <h3 className="text-xl font-bold" style={{ color: BRAND_COLORS.navy }}>
              هل تبحث عن شيء محدد؟
            </h3>
          </div>
          <p className="text-gray-600">
            إذا كنت تواجه مشكلة في الوصول إلى صفحة معينة، يرجى التواصل معنا على:
          </p>
          <p className="text-lg font-bold mt-2" style={{ color: BRAND_COLORS.gold }}>
            📞 0920563695
          </p>
        </div>

        {/* Footer */}
        <div className="mt-12 text-sm text-gray-500">
          <p>© 2026 شركة ليبيا للخدمات المالية. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </div>
  );
}
