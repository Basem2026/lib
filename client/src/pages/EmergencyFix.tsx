import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useEmployees } from "@/contexts/EmployeesContext";

/**
 * صفحة إصلاح طارئة لإلغاء حظر المدير
 * Emergency Fix Page - للحالات الطارئة فقط
 */
export default function EmergencyFix() {
  const { employees, updateEmployee } = useEmployees();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isFixed, setIsFixed] = useState(false);

  const handleFix = () => {
    if (!phone.trim()) {
      toast.error("الرجاء إدخال رقم الهاتف");
      return;
    }

    if (!password.trim()) {
      toast.error("الرجاء إدخال كلمة المرور");
      return;
    }

    // البحث عن الموظف
    const employee = employees.find(emp => emp.phone === phone);

    if (!employee) {
      toast.error("رقم الهاتف غير موجود");
      return;
    }

    // التحقق من كلمة المرور
    if (employee.passwordHash !== password) {
      toast.error("كلمة المرور غير صحيحة");
      return;
    }

    // التحقق من أنه مدير
    if (employee.jobTitle !== "manager") {
      toast.error("هذه الصفحة للمدراء فقط");
      return;
    }

    // إلغاء الحظر
    updateEmployee(employee.id, { status: "active" });
    
    toast.success("تم إلغاء الحظر بنجاح! يمكنك الآن تسجيل الدخول");
    setIsFixed(true);
  };

  if (isFixed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-green-200">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-green-700">تم الإصلاح بنجاح!</CardTitle>
            <CardDescription className="text-lg">
              تم إلغاء حظر حسابك. يمكنك الآن تسجيل الدخول بشكل طبيعي.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button
              onClick={() => window.location.href = "/login"}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-6 text-lg"
            >
              الذهاب إلى صفحة تسجيل الدخول
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-red-200">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
            <AlertTriangle className="w-12 h-12 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-red-700">إصلاح طارئ</CardTitle>
          <CardDescription className="text-lg">
            صفحة إصلاح طارئة لإلغاء حظر حساب المدير
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800 text-center">
              ⚠️ هذه الصفحة للحالات الطارئة فقط
              <br />
              للمدراء المحظورين بالخطأ
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium">
                رقم الهاتف
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="0920563695"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="text-lg"
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                كلمة المرور
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="text-lg"
              />
            </div>

            <Button
              onClick={handleFix}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-6 text-lg"
            >
              إلغاء الحظر وتفعيل الحساب
            </Button>
          </div>

          <div className="text-center text-sm text-gray-500">
            <p>بعد إلغاء الحظر، يمكنك تسجيل الدخول بشكل طبيعي</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
