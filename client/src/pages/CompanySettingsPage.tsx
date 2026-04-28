import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Building2, Phone, MapPin, Upload, ArrowRight, Palette, FileText, Save, Loader2 } from "lucide-react";

/**
 * صفحة إعدادات الشركة
 * متاحة للمدير فقط (role === 'admin')
 * تتيح تخصيص اسم الشركة، الشعار، بيانات التواصل
 * مما يجعل النظام قابلاً للبيع لأي شركة
 */

export default function CompanySettingsPage() {
  const [, setLocation] = useLocation();
  const { company, refetch } = useCompany();
  const { user } = useAuth();

  // حالة النموذج
  const [form, setForm] = useState({
    companyName: company?.companyName ?? "",
    companyNameEn: company?.companyNameEn ?? "",
    slogan: company?.slogan ?? "",
    phone: company?.phone ?? "",
    phone2: company?.phone2 ?? "",
    email: company?.email ?? "",
    website: company?.website ?? "",
    address: company?.address ?? "",
    city: company?.city ?? "",
    country: company?.country ?? "",
    licenseNumber: company?.licenseNumber ?? "",
    taxNumber: company?.taxNumber ?? "",
    currency: company?.currency ?? "LYD",
    currencySymbol: company?.currencySymbol ?? "د.ل",
    primaryColor: company?.primaryColor ?? "#1E2E3D",
    accentColor: company?.accentColor ?? "#C9A34D",
  });

  const [logoPreview, setLogoPreview] = useState<string | null>(company?.logoUrl ?? null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mutations
  const updateMutation = trpc.companySettings.update.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ إعدادات الشركة بنجاح");
      refetch();
    },
    onError: (err) => {
      toast.error("فشل حفظ الإعدادات: " + err.message);
    },
  });

  const uploadLogoMutation = trpc.companySettings.uploadLogo.useMutation({
    onSuccess: (data) => {
      toast.success("تم رفع الشعار بنجاح");
      setLogoPreview(data.logoUrl);
      refetch();
    },
    onError: (err) => {
      toast.error("فشل رفع الشعار: " + err.message);
    },
  });

  // التحقق من صلاحية المدير (jobTitle === 'manager' في نظام الموظفين)
  const isManager = user?.jobTitle === 'manager';
  if (!isManager) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#F9FBFD" }}>
        <div className="text-center p-8">
          <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold mb-2" style={{ color: "#1E2E3D" }}>
            غير مصرح
          </h2>
          <p className="text-gray-500 mb-4">هذه الصفحة متاحة للمدير فقط</p>
          <Button onClick={() => setLocation("/dashboard")} style={{ backgroundColor: "#1E2E3D" }} className="text-white">
            <ArrowRight className="w-4 h-4 ml-2" />
            العودة للوحة التحكم
          </Button>
        </div>
      </div>
    );
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("حجم الشعار يجب أن يكون أقل من 2 ميجابايت");
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleUploadLogo = async () => {
    if (!logoFile) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1];
      await uploadLogoMutation.mutateAsync({
        imageBase64: base64,
        mimeType: logoFile.type as "image/png" | "image/jpeg" | "image/webp",
      });
      setLogoFile(null);
    };
    reader.readAsDataURL(logoFile);
  };

  const handleSave = async () => {
    await updateMutation.mutateAsync({
      companyName: form.companyName || undefined,
      companyNameEn: form.companyNameEn || null,
      slogan: form.slogan || null,
      phone: form.phone || null,
      phone2: form.phone2 || null,
      email: form.email || null,
      website: form.website || null,
      address: form.address || null,
      city: form.city || null,
      country: form.country || null,
      licenseNumber: form.licenseNumber || null,
      taxNumber: form.taxNumber || null,
      currency: form.currency || undefined,
      currencySymbol: form.currencySymbol || undefined,
      primaryColor: form.primaryColor || undefined,
      accentColor: form.accentColor || undefined,
    });
  };

  const isSaving = updateMutation.isPending;
  const isUploading = uploadLogoMutation.isPending;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F9FBFD" }}>
      {/* Header */}
      <header
        className="text-white py-6 px-6 border-b-4"
        style={{ backgroundColor: "#1E2E3D", borderBottomColor: "#C9A34D" }}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8" style={{ color: "#C9A34D" }} />
            <div>
              <h1 className="text-2xl font-bold">إعدادات الشركة</h1>
              <p className="text-sm" style={{ color: "#DCE3EA" }}>
                تخصيص هوية الشركة وبياناتها
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => setLocation("/dashboard")}
            className="border-white text-white hover:bg-white/10"
          >
            <ArrowRight className="w-4 h-4 ml-2" />
            العودة
          </Button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto py-8 px-6">
        <Tabs defaultValue="identity" dir="rtl">
          <TabsList className="mb-6 w-full grid grid-cols-4">
            <TabsTrigger value="identity">
              <Building2 className="w-4 h-4 ml-1" />
              الهوية
            </TabsTrigger>
            <TabsTrigger value="contact">
              <Phone className="w-4 h-4 ml-1" />
              التواصل
            </TabsTrigger>
            <TabsTrigger value="address">
              <MapPin className="w-4 h-4 ml-1" />
              العنوان
            </TabsTrigger>
            <TabsTrigger value="legal">
              <FileText className="w-4 h-4 ml-1" />
              القانوني
            </TabsTrigger>
          </TabsList>

          {/* تبويب الهوية */}
          <TabsContent value="identity">
            <div className="grid md:grid-cols-2 gap-6">
              {/* الشعار */}
              <Card>
                <CardHeader>
                  <CardTitle>شعار الشركة</CardTitle>
                  <CardDescription>يظهر في الصفحة الرئيسية والتقارير (PNG, JPG, WEBP - أقل من 2MB)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-center">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="شعار الشركة"
                        className="w-32 h-32 object-contain rounded-lg border-2 p-2"
                        style={{ borderColor: "#C9A34D" }}
                      />
                    ) : (
                      <div
                        className="w-32 h-32 rounded-lg border-2 border-dashed flex items-center justify-center"
                        style={{ borderColor: "#C9A34D" }}
                      >
                        <Building2 className="w-12 h-12 text-gray-300" />
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 ml-2" />
                      اختيار شعار
                    </Button>
                    {logoFile && (
                      <Button
                        className="flex-1 text-white"
                        style={{ backgroundColor: "#1E2E3D" }}
                        onClick={handleUploadLogo}
                        disabled={isUploading}
                      >
                        {isUploading ? (
                          <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 ml-2" />
                        )}
                        رفع الشعار
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* اسم الشركة والشعار */}
              <Card>
                <CardHeader>
                  <CardTitle>اسم الشركة</CardTitle>
                  <CardDescription>يظهر في جميع أنحاء التطبيق</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="companyName">الاسم بالعربية *</Label>
                    <Input
                      id="companyName"
                      value={form.companyName}
                      onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                      placeholder="شركة ليبيا للخدمات المالية"
                      className="mt-1"
                      dir="rtl"
                    />
                  </div>
                  <div>
                    <Label htmlFor="companyNameEn">الاسم بالإنجليزية</Label>
                    <Input
                      id="companyNameEn"
                      value={form.companyNameEn}
                      onChange={(e) => setForm({ ...form, companyNameEn: e.target.value })}
                      placeholder="Libya Financial Services"
                      className="mt-1"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <Label htmlFor="slogan">الشعار / الوصف المختصر</Label>
                    <Textarea
                      id="slogan"
                      value={form.slogan}
                      onChange={(e) => setForm({ ...form, slogan: e.target.value })}
                      placeholder="حلول مالية احترافية موثوقة وآمنة"
                      className="mt-1"
                      rows={2}
                      dir="rtl"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* الألوان */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="w-5 h-5" />
                    الألوان والهوية البصرية
                  </CardTitle>
                  <CardDescription>ألوان الشركة التي تظهر في الرأس والتصميم</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="primaryColor">اللون الأساسي</Label>
                      <div className="flex items-center gap-3 mt-1">
                        <input
                          type="color"
                          id="primaryColor"
                          value={form.primaryColor}
                          onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                          className="w-12 h-10 rounded cursor-pointer border"
                        />
                        <Input
                          value={form.primaryColor}
                          onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                          placeholder="#1E2E3D"
                          className="flex-1"
                          dir="ltr"
                        />
                        <div
                          className="w-10 h-10 rounded border"
                          style={{ backgroundColor: form.primaryColor }}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="accentColor">لون التمييز (الذهبي)</Label>
                      <div className="flex items-center gap-3 mt-1">
                        <input
                          type="color"
                          id="accentColor"
                          value={form.accentColor}
                          onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                          className="w-12 h-10 rounded cursor-pointer border"
                        />
                        <Input
                          value={form.accentColor}
                          onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                          placeholder="#C9A34D"
                          className="flex-1"
                          dir="ltr"
                        />
                        <div
                          className="w-10 h-10 rounded border"
                          style={{ backgroundColor: form.accentColor }}
                        />
                      </div>
                    </div>
                  </div>
                  {/* معاينة */}
                  <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: form.primaryColor }}>
                    <p className="text-white font-bold text-lg">{form.companyName || "اسم الشركة"}</p>
                    <p style={{ color: form.accentColor }}>{form.slogan || "شعار الشركة"}</p>
                  </div>
                </CardContent>
              </Card>

              {/* العملة */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>العملة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="currency">رمز العملة</Label>
                      <Input
                        id="currency"
                        value={form.currency}
                        onChange={(e) => setForm({ ...form, currency: e.target.value })}
                        placeholder="LYD"
                        className="mt-1"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <Label htmlFor="currencySymbol">رمز العملة المختصر</Label>
                      <Input
                        id="currencySymbol"
                        value={form.currencySymbol}
                        onChange={(e) => setForm({ ...form, currencySymbol: e.target.value })}
                        placeholder="د.ل"
                        className="mt-1"
                        dir="rtl"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* تبويب التواصل */}
          <TabsContent value="contact">
            <Card>
              <CardHeader>
                <CardTitle>بيانات التواصل</CardTitle>
                <CardDescription>تظهر في الصفحة الرئيسية والتذييل</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">رقم الهاتف الرئيسي</Label>
                    <Input
                      id="phone"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="0920563695"
                      className="mt-1"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone2">رقم الهاتف الثاني</Label>
                    <Input
                      id="phone2"
                      value={form.phone2}
                      onChange={(e) => setForm({ ...form, phone2: e.target.value })}
                      placeholder="اختياري"
                      className="mt-1"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">البريد الإلكتروني</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="info@company.com"
                      className="mt-1"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <Label htmlFor="website">الموقع الإلكتروني</Label>
                    <Input
                      id="website"
                      value={form.website}
                      onChange={(e) => setForm({ ...form, website: e.target.value })}
                      placeholder="https://www.company.com"
                      className="mt-1"
                      dir="ltr"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* تبويب العنوان */}
          <TabsContent value="address">
            <Card>
              <CardHeader>
                <CardTitle>العنوان</CardTitle>
                <CardDescription>يظهر في الصفحة الرئيسية والتقارير الرسمية</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="address">العنوان الكامل</Label>
                  <Textarea
                    id="address"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="صبراته - ليبيا"
                    className="mt-1"
                    rows={2}
                    dir="rtl"
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">المدينة</Label>
                    <Input
                      id="city"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      placeholder="صبراته"
                      className="mt-1"
                      dir="rtl"
                    />
                  </div>
                  <div>
                    <Label htmlFor="country">الدولة</Label>
                    <Input
                      id="country"
                      value={form.country}
                      onChange={(e) => setForm({ ...form, country: e.target.value })}
                      placeholder="ليبيا"
                      className="mt-1"
                      dir="rtl"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* تبويب القانوني */}
          <TabsContent value="legal">
            <Card>
              <CardHeader>
                <CardTitle>البيانات القانونية</CardTitle>
                <CardDescription>تستخدم في التقارير الرسمية والفواتير</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="licenseNumber">رقم الترخيص</Label>
                    <Input
                      id="licenseNumber"
                      value={form.licenseNumber}
                      onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                      placeholder="اختياري"
                      className="mt-1"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <Label htmlFor="taxNumber">الرقم الضريبي</Label>
                    <Input
                      id="taxNumber"
                      value={form.taxNumber}
                      onChange={(e) => setForm({ ...form, taxNumber: e.target.value })}
                      placeholder="اختياري"
                      className="mt-1"
                      dir="ltr"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* زر الحفظ */}
        <div className="mt-8 flex justify-end">
          <Button
            className="text-white px-8 py-3 text-lg"
            style={{ backgroundColor: "#1E2E3D" }}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="w-5 h-5 ml-2 animate-spin" />
            ) : (
              <Save className="w-5 h-5 ml-2" />
            )}
            حفظ جميع الإعدادات
          </Button>
        </div>
      </div>
    </div>
  );
}
