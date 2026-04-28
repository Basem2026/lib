/**
 * ألوان الهوية البصرية لشركة ليبيا للخدمات المالية
 * مستخلصة من الشعار الرسمي
 */
export const BRAND_COLORS = {
  // ألوان الشعار الرئيسية
  navy: '#1E2E3D',      // أزرق بحري داكن - للخلفيات الرئيسية والعناوين
  gold: '#C9A34D',      // ذهبي - للإطارات والتفاصيل المميزة والأزرار الرئيسية
  silver: '#6E7C87',    // فضي/رمادي - للعناصر الثانوية والنصوص الفرعية
  
  // ألوان الخلفيات
  background: '#F9FBFD', // أبيض مزرق فاتح - خلفية الصفحات
  white: '#FFFFFF',      // أبيض نقي - خلفية البطاقات
  
  // ألوان الحالات (يمكن استخدامها بجانب ألوان الشعار)
  success: '#10B981',    // أخضر - للعمليات الناجحة
  error: '#EF4444',      // أحمر - للأخطاء
  warning: '#F59E0B',    // برتقالي - للتحذيرات
  info: '#3B82F6',       // أزرق - للمعلومات
  
  // ألوان النصوص
  textPrimary: '#1E2E3D',   // نص رئيسي - نفس الأزرق البحري
  textSecondary: '#6E7C87', // نص ثانوي - نفس الفضي
  textLight: '#DCE3EA',     // نص فاتح - للنصوص على خلفيات داكنة
} as const;

/**
 * أمثلة الاستخدام:
 * 
 * // في Tailwind:
 * <div className="bg-[#1E2E3D] border-b-4 border-[#C9A34D]">
 * 
 * // في inline styles:
 * <div style={{ backgroundColor: BRAND_COLORS.navy, borderBottomColor: BRAND_COLORS.gold }}>
 * 
 * // في الرسوم البيانية:
 * const CHART_COLORS = [BRAND_COLORS.navy, BRAND_COLORS.gold, BRAND_COLORS.silver, BRAND_COLORS.success];
 */
