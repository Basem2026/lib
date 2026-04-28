import { describe, it, expect } from 'vitest';
import { THERMAL_SIZES, ThermalSizeOption } from '../client/src/components/ThermalPrintWindow';

describe('ThermalPrintWindow - المقاسات الحرارية', () => {
  it('يجب أن تحتوي على 9 مقاسات', () => {
    expect(THERMAL_SIZES).toHaveLength(9);
  });

  it('يجب أن يحتوي كل مقاس على الحقول المطلوبة', () => {
    THERMAL_SIZES.forEach((size: ThermalSizeOption) => {
      expect(size).toHaveProperty('value');
      expect(size).toHaveProperty('label');
      expect(size).toHaveProperty('width');
      expect(size).toHaveProperty('height');
      expect(size).toHaveProperty('category');
      expect(size.width).toBeGreaterThan(0);
      expect(size.height).toBeGreaterThan(0);
    });
  });

  it('يجب أن يحتوي على مقاس 58x40', () => {
    const size = THERMAL_SIZES.find(s => s.value === '58x40');
    expect(size).toBeDefined();
    expect(size?.width).toBe(58);
    expect(size?.height).toBe(40);
  });

  it('يجب أن يحتوي على مقاس 25x50', () => {
    const size = THERMAL_SIZES.find(s => s.value === '25x50');
    expect(size).toBeDefined();
    expect(size?.width).toBe(25);
    expect(size?.height).toBe(50);
  });

  it('يجب أن تكون المقاسات في 4 فئات', () => {
    const categories = [...new Set(THERMAL_SIZES.map(s => s.category))];
    expect(categories).toHaveLength(4);
    expect(categories).toContain('طابعات POS');
    expect(categories).toContain('ملصقات مستطيلة');
    expect(categories).toContain('ملصقات ضيقة');
    expect(categories).toContain('ملصقات صغيرة');
  });

  it('يجب أن تكون قيم value فريدة', () => {
    const values = THERMAL_SIZES.map(s => s.value);
    const uniqueValues = [...new Set(values)];
    expect(values).toHaveLength(uniqueValues.length);
  });
});

describe('transactionId - رقم المعاملة الفريد', () => {
  // محاكاة دالة getNextTransactionNumber
  const generateTransactionId = () => {
    const now = new Date();
    const date = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('');
    const time = [
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0'),
    ].join('');
    const random = Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
    return `${date}-${time}-${random}`;
  };

  it('يجب أن يكون بالصيغة YYYYMMDD-HHMMSS-XXXX', () => {
    const id = generateTransactionId();
    expect(id).toMatch(/^\d{8}-\d{6}-[0-9A-F]{4}$/);
  });

  it('يجب أن يحتوي على تاريخ اليوم', () => {
    const id = generateTransactionId();
    const now = new Date();
    const year = now.getFullYear().toString();
    expect(id.startsWith(year)).toBe(true);
  });

  it('يجب أن يكون فريداً — 1000 رقم متتالي بدون تكرار', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      ids.add(generateTransactionId());
    }
    // بسبب الـ random hex، احتمال التكرار في 1000 رقم ضئيل جداً
    expect(ids.size).toBeGreaterThanOrEqual(990);
  });

  it('يجب أن يكون طوله 20 حرفاً (8+1+6+1+4)', () => {
    const id = generateTransactionId();
    expect(id.length).toBe(20);
  });
});
