import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldX, Phone, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * صفحة الحظر - تظهر للموظفين المحظورين من قبل الإدارة
 * 
 * الهدف:
 * - إعلام الموظف بأنه محظور من الوصول للنظام
 * - توجيهه لمراجعة الإدارة لمعرفة السبب
 * - منع الوصول لأي صفحة أخرى في النظام
 */
export default function Blocked() {
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
      <Card className="max-w-2xl w-full border-red-200 shadow-xl">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
            <ShieldX className="w-12 h-12 text-red-600" />
          </div>
          
          <CardTitle className="text-3xl font-bold text-red-700">
            حسابك محظور
          </CardTitle>
          
          <CardDescription className="text-lg text-gray-700">
            تم حظر حسابك من قبل الإدارة
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* معلومات الموظف */}
          {user && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-600 mb-2">معلومات الحساب:</p>
              <div className="space-y-1">
                <p className="font-semibold text-gray-800">{user.fullName || 'غير محدد'}</p>
                <p className="text-sm text-gray-600">رقم الهاتف: {user.phone}</p>
                <p className="text-sm text-gray-600">الرمز الوظيفي: {user.employeeCode}</p>
              </div>
            </div>
          )}

          {/* رسالة التنبيه */}
          <div className="bg-red-50 border-r-4 border-red-500 p-4 rounded">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-800 mb-2">
                  لا يمكنك الوصول إلى النظام
                </h3>
                <p className="text-sm text-red-700 leading-relaxed">
                  تم حظر حسابك من قبل الإدارة ولا يمكنك الوصول إلى أي من صفحات النظام. 
                  يرجى التواصل مع الإدارة مباشرة لمعرفة سبب الحظر وكيفية إعادة تفعيل حسابك.
                </p>
              </div>
            </div>
          </div>

          {/* معلومات التواصل */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Phone className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-blue-900">للتواصل مع الإدارة:</h3>
            </div>
            <div className="space-y-2 text-sm text-blue-800">
              <p className="flex items-center gap-2">
                <span className="font-semibold">📞 الهاتف:</span>
                <a href="tel:0920563695" className="hover:underline font-medium">
                  0920563695
                </a>
              </p>
              <p className="flex items-center gap-2">
                <span className="font-semibold">📍 العنوان:</span>
                <span>صبراته - ليبيا</span>
              </p>
              <p className="text-xs text-blue-600 mt-3">
                يرجى ذكر رقم هاتفك ({user?.phone}) عند التواصل مع الإدارة
              </p>
            </div>
          </div>

          {/* زر تسجيل الخروج */}
          <div className="pt-4">
            <Button
              onClick={handleLogout}
              className="w-full bg-gray-700 hover:bg-gray-800 text-white"
              size="lg"
            >
              تسجيل الخروج
            </Button>
          </div>

          {/* ملاحظة إضافية */}
          <p className="text-xs text-center text-gray-500 pt-2">
            إذا كنت تعتقد أن هذا خطأ، يرجى التواصل مع الإدارة فوراً
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
