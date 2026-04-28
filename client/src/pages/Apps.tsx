import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, LogIn } from "lucide-react";

/**
 * صفحة التطبيقات - عرض التطبيقات المتاحة للتثبيت على الهاتف
 */
export default function AppsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4" style={{ color: '#1E2E3D' }}>
            تطبيقات ليبيا للخدمات المالية
          </h1>
          <p className="text-lg" style={{ color: '#6E7C87' }}>
            اختر التطبيق المناسب واضغط على "تثبيت" لإضافته إلى هاتفك
          </p>
        </div>

        {/* Apps Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Public App */}
          <Card className="hover:shadow-xl transition-all duration-300 border-t-4" style={{ borderTopColor: '#C9A34D' }}>
            <CardHeader style={{ backgroundColor: '#1E2E3D', color: '#FFFFFF' }}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-2xl">الواجهة العامة</CardTitle>
                  <CardDescription className="mt-2" style={{ color: '#DCE3EA' }}>
                    للزبائن والعملاء
                  </CardDescription>
                </div>
                <div className="ml-4">
                  <img 
                    src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663215657361/EpcRkvqYczsCqRRi.png" 
                    alt="Public App"
                    className="w-16 h-16 rounded-lg"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <p style={{ color: '#6E7C87' }}>
                  تطبيق شركة ليبيا للخدمات المالية للعملاء والزبائن. اعرض خدماتنا وأسعارنا وتواصل معنا.
                </p>
                <div className="flex gap-3">
                  <Button 
                    className="flex-1 text-white gap-2"
                    style={{ backgroundColor: '#1E2E3D' }}
                    onClick={() => {
                      // PWA install logic
                      const link = document.createElement('a');
                      link.href = '/manifest-public.json';
                      link.download = 'manifest.json';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                  >
                    <Download className="w-4 h-4" />
                    تثبيت التطبيق
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => window.location.href = '/'}
                  >
                    <LogIn className="w-4 h-4" />
                    فتح الآن
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Staff App */}
          <Card className="hover:shadow-xl transition-all duration-300 border-t-4" style={{ borderTopColor: '#C9A34D' }}>
            <CardHeader style={{ backgroundColor: '#1E2E3D', color: '#FFFFFF' }}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-2xl">تطبيق الموظفين</CardTitle>
                  <CardDescription className="mt-2" style={{ color: '#DCE3EA' }}>
                    لموظفي الشركة والإدارة
                  </CardDescription>
                </div>
                <div className="ml-4">
                  <img 
                    src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663215657361/hEaRsVNpcGRBTJiI.png" 
                    alt="Staff App"
                    className="w-16 h-16 rounded-lg"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <p style={{ color: '#6E7C87' }}>
                  لوحة تحكم الموظفين والإدارة. إدارة العمليات المالية والزبائن والبطاقات والسجلات.
                </p>
                <div className="flex gap-3">
                  <Button 
                    className="flex-1 text-white gap-2"
                    style={{ backgroundColor: '#1E2E3D' }}
                    onClick={() => {
                      // PWA install logic
                      const link = document.createElement('a');
                      link.href = '/manifest-staff-app.json';
                      link.download = 'manifest.json';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                  >
                    <Download className="w-4 h-4" />
                    تثبيت التطبيق
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => window.location.href = '/login'}
                  >
                    <LogIn className="w-4 h-4" />
                    تسجيل الدخول
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info Section */}
        <div className="mt-12 p-6 rounded-lg border-l-4" style={{ backgroundColor: '#F9FBFD', borderLeftColor: '#C9A34D' }}>
          <h3 className="text-xl font-bold mb-4" style={{ color: '#1E2E3D' }}>
            📱 كيفية تثبيت التطبيق؟
          </h3>
          <ul className="space-y-2" style={{ color: '#6E7C87' }}>
            <li>✅ اضغط على "تثبيت التطبيق" أعلاه</li>
            <li>✅ اختر "إضافة إلى الشاشة الرئيسية" من قائمة المتصفح</li>
            <li>✅ سيظهر التطبيق كأيقونة على هاتفك</li>
            <li>✅ اضغط على الأيقونة لفتح التطبيق مباشرة</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
