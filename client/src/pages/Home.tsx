import { useServices } from "@/contexts/ServicesContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, CreditCard, TrendingUp, Zap } from "lucide-react";
import { useDollarRates } from "@/contexts/DollarRatesContext";
import { useBankCards } from "@/contexts/BankCardsContext";
import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * الصفحة الرئيسية - شركة ليبيا للخدمات المالية
 * Design Philosophy: Luxury Finance - Gold & White Professional Theme
 * - ألوان: أزرق بحري (#1E2E3D)، ذهبي (#C9A34D)، أبيض (#FFFFFF)
 * - تصميم احترافي وموثوق
 * - واجهة سهلة الاستخدام
 */

export default function Home() {
  const [, setLocation] = useLocation();
  const { services } = useServices();
  const { rates } = useDollarRates();
  const { cards } = useBankCards();
  const visibleCards = cards.filter(c => c.isVisible);

  // Redirect to login if accessed from staff app
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('app') === 'staff') {
      setLocation('/login');
    }
  }, [setLocation]);

  // Return early if redirecting
  const params = new URLSearchParams(window.location.search);
  if (params.get('app') === 'staff') {
    return null; // Will redirect via useEffect
  }

  const servicesData = [
    {
      id: "personal_cards",
      title: "بطاقات الأغراض الشخصية",
      description: "بطاقات الدولار الخاصة بمصرف الأمان",
      price: services.personalCards.purchasePrice > 0 
        ? `${services.personalCards.purchasePrice} د.ل` 
        : "حسب السعر الحالي",
      icon: <CreditCard className="w-6 h-6" />,
      details: `فتح ملفات البطاقات ومعالجة طلباتها مع متابعة دقيقة لحالات الإيداع والسحب. المصرف: ${services.personalCards.bankName}`,
      image: services.personalCards.image,
    },
    {
      id: "dollar_withdrawal",
      title: "سحب بطاقات الدولار",
      description: "خدمات مصرف الأمان المتكاملة",
      price: `${services.dollarWithdrawal.withdrawalRate}%`,
      icon: <DollarSign className="w-6 h-6" />,
      details: "السحب بالرسائل، السحب بالبطاقة، سحب منحة الأبناء، إصدار بطاقات الماستر كارد مع إدارة ومطابقة المعاملات المرفوضة.",
      image: services.dollarWithdrawal.image,
    },
    {
      id: "local_withdrawal",
      title: "سحب البطاقات المحلية",
      description: "خدمات السحب من الحسابات المحلية",
      price: `${services.localWithdrawal.withdrawalRate}%`,
      icon: <TrendingUp className="w-6 h-6" />,
      details: "سحب آمن وسريع من البطاقات المحلية مع ضمانات كاملة. تسجيل فوري لجميع العمليات وإدارة دقيقة للأرصدة.",
      image: services.localWithdrawal.image,
    },
    {
      id: "transfers",
      title: "التحويلات والخدمات الأخرى",
      description: "خدمات التحويلات والإيداعات",
      price: services.transfers.types.length > 0 
        ? `${Math.min(...services.transfers.types.map(t => t.rate))}% - ${Math.max(...services.transfers.types.map(t => t.rate))}%`
        : "0.5% - 1%",
      icon: <Zap className="w-6 h-6" />,
      details: "تحويل من وإلى الحسابات مع دعم حسابات متعددة. نظام رقابي محكم للأرصدة وتقارير مفصلة لكل عملية.",
      image: services.transfers.image,
    },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F9FBFD' }}>
      {/* Header - Logo and Company Name */}
      <header className="text-white py-12 px-4 border-b-4" style={{ backgroundColor: '#1E2E3D', borderBottomColor: '#C9A34D' }}>
        <div className="container max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <img 
              src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663215657361/vIZHXrYYZVlqpxRj.png" 
              alt="شركة ليبيا للخدمات المالية" 
              className="w-24 h-24 rounded-full shadow-lg hover:scale-105 transition-transform duration-300"
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-2 drop-shadow-lg">
            شركة ليبيا للخدمات المالية
          </h1>
          <p className="text-lg font-semibold" style={{ color: '#C9A34D' }}>
            حلول مالية احترافية موثوقة وآمنة
          </p>
          <p className="text-sm mt-3" style={{ color: '#DCE3EA' }}>
            📍 صبراته - ليبيا | 📞 0920563695
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-6xl mx-auto py-16 px-4">
        {/* About Section */}
        <section className="mb-16 p-8 rounded-lg border-l-4" style={{ backgroundColor: '#FFFFFF', borderLeftColor: '#C9A34D' }}>
          <h2 className="text-3xl font-bold mb-4" style={{ color: '#1E2E3D' }}>عن الشركة</h2>
          <p className="leading-relaxed mb-4" style={{ color: '#6E7C87' }}>
            شركة ليبيا للخدمات المالية هي شركة ليبية رائدة مقرّها صبراته، متخصصة في تقديم حلول مالية احترافية للأفراد والتجار، مع تركيز استراتيجي على خدمات مصرف الأمان وبطاقات الأغراض الشخصية بالدولار.
          </p>
          <p className="leading-relaxed" style={{ color: '#6E7C87' }}>
            نُعد اليوم من الجهات القليلة في المنطقة التي تجمع بين الخبرة العملية في إجراءات مصرف الأمان، والمنظومات الرقمية الدقيقة التي تضمن سرعة التنفيذ وحماية حقوق الزبائن.
          </p>
        </section>

        {/* Dollar Rates Table */}
        {rates.length > 0 && (
          <section className="mb-16 p-8 rounded-lg" style={{ backgroundColor: '#FFFFFF' }}>
            <h2 className="text-3xl font-bold mb-6 text-center" style={{ color: '#1E2E3D' }}>أسعار الدولار</h2>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow style={{ backgroundColor: '#1E2E3D' }}>
                    <TableHead className="text-white text-right">المصرف</TableHead>
                    <TableHead className="text-white text-right">قيمة الدولار</TableHead>
                    <TableHead className="text-white text-right">السعر كاش</TableHead>
                    <TableHead className="text-white text-right">السعر بالشيك</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rates.map((rate) => (
                    <TableRow key={rate.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium" style={{ color: '#1E2E3D' }}>{rate.bankName}</TableCell>
                      <TableCell style={{ color: '#6E7C87' }}>{rate.dollarValue.toFixed(2)} د.ل</TableCell>
                      <TableCell style={{ color: '#6E7C87' }}>{rate.cashRate.toFixed(2)} د.ل</TableCell>
                      <TableCell style={{ color: '#6E7C87' }}>{rate.checkRate.toFixed(2)} د.ل</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        )}

        {/* Bank Cards Prices */}
        {visibleCards.length > 0 && (
          <section className="mb-16 p-8 rounded-lg" style={{ backgroundColor: '#FFFFFF' }}>
            <h2 className="text-3xl font-bold mb-6 text-center" style={{ color: '#1E2E3D' }}>أسعار البطاقات</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleCards.map((card) => (
                <div 
                  key={card.id} 
                  className="p-6 rounded-lg border-2 hover:shadow-lg transition-shadow"
                  style={{ borderColor: '#C9A34D', backgroundColor: '#F9FBFD' }}
                >
                  <h3 className="text-xl font-bold mb-2" style={{ color: '#1E2E3D' }}>{card.bankName}</h3>
                  <p className="text-2xl font-bold" style={{ color: '#C9A34D' }}>{card.price.toFixed(2)} د.ل</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Services Grid */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center" style={{ color: '#1E2E3D' }}>خدماتنا</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {servicesData.map((service) => (
              <Card 
                key={service.id}
                className="hover:shadow-xl transition-all duration-300 border-t-4"
                style={{ 
                  backgroundColor: '#FFFFFF',
                  borderTopColor: '#C9A34D'
                }}
              >
                <CardHeader style={{ backgroundColor: '#1E2E3D', color: '#FFFFFF' }}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl">{service.title}</CardTitle>
                      <CardDescription className="mt-2" style={{ color: '#DCE3EA' }}>
                        {service.description}
                      </CardDescription>
                    </div>
                    <div className="ml-4" style={{ color: '#C9A34D' }}>
                      {service.icon}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="mb-4 text-center">
                    <p className="text-2xl font-bold" style={{ color: '#C9A34D' }}>
                      {service.price}
                    </p>
                  </div>
                  <p className="text-sm text-center" style={{ color: '#6E7C87' }}>
                    {service.details}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Features Section */}
        <section className="text-white py-12 px-8 rounded-lg mb-16" style={{ backgroundColor: '#1E2E3D' }}>
          <h2 className="text-3xl font-bold mb-8 text-center">لماذا نحن؟</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="text-xl font-bold mb-2">آمن وموثوق</h3>
              <p style={{ color: '#DCE3EA' }}>
                أعلى معايير الأمان والخصوصية لحماية بيانات ومعاملات عملائنا
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-bold mb-2">سريع وفعال</h3>
              <p style={{ color: '#DCE3EA' }}>
                معالجة فورية للطلبات مع تتبع شامل لكل معاملة
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">👥</div>
              <h3 className="text-xl font-bold mb-2">فريق احترافي</h3>
              <p style={{ color: '#DCE3EA' }}>
                خبراء متخصصون في الخدمات المالية والعمليات المصرفية
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-white py-12 px-8 rounded-lg" style={{ backgroundColor: '#C9A34D' }}>
          <h2 className="text-3xl font-bold mb-4">هل تريد معرفة المزيد؟</h2>
          <p className="text-lg mb-6" style={{ color: '#1E2E3D' }}>
            تواصل معنا الآن للحصول على أفضل الخدمات المالية
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="tel:0920563695" className="inline-block">
              <button 
                className="px-8 py-3 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#1E2E3D' }}
              >
                اتصل بنا: 0920563695
              </button>
            </a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="text-white py-8 mt-16 border-t-4" style={{ backgroundColor: '#1E2E3D', borderTopColor: '#C9A34D' }}>
        <div className="container max-w-6xl mx-auto px-4 text-center">
          <p className="mb-2">© 2026 شركة ليبيا للخدمات المالية. جميع الحقوق محفوظة.</p>
          <p style={{ color: '#DCE3EA' }}>
            📍 صبراته - ليبيا | 📞 0920563695
          </p>
          <p className="text-sm mt-4" style={{ color: '#DCE3EA' }}>
            منظومة متكاملة للخدمات المالية والعمليات المصرفية
          </p>
        </div>
      </footer>
    </div>
  );
}
