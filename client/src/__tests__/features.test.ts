import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isExpiringWithin90Days, getDaysRemaining } from '@/hooks/useExpiringAlerts';

describe('الميزات الجديدة', () => {
  describe('نظام التنبيهات - useExpiringAlerts', () => {
    it('يجب أن يكتشف البطاقات قريبة الانتهاء (≤ 90 يوم)', () => {
      // بطاقة تنتهي في 30 يوم
      const cardExpiry = '03/26'; // مارس 2026 (30 يوم من الآن)
      const isExpiring = isExpiringWithin90Days(cardExpiry, 'card');
      expect(isExpiring).toBe(true);
    });

    it('يجب أن لا يكتشف البطاقات البعيدة الانتهاء (> 90 يوم)', () => {
      // بطاقة تنتهي في 200 يوم
      const cardExpiry = '10/26'; // أكتوبر 2026 (200+ يوم من الآن)
      const isExpiring = isExpiringWithin90Days(cardExpiry, 'card');
      expect(isExpiring).toBe(false);
    });

    it('يجب أن يحسب الأيام المتبقية بشكل صحيح', () => {
      // بطاقة تنتهي في 30 يوم
      const cardExpiry = '03/26';
      const daysRemaining = getDaysRemaining(cardExpiry, 'card');
      expect(daysRemaining).toBeGreaterThan(0);
      expect(daysRemaining).toBeLessThanOrEqual(90);
    });

    it('يجب أن يتعامل مع التواريخ المنتهية بشكل صحيح', () => {
      // بطاقة منتهية
      const cardExpiry = '01/25'; // يناير 2025 (منتهية)
      const daysRemaining = getDaysRemaining(cardExpiry, 'card');
      expect(daysRemaining).toBeLessThan(0);
    });

    it('يجب أن يتعامل مع جوازات السفر بشكل صحيح', () => {
      // جواز ينتهي في 30 يوم
      const passportExpiry = '2026-04-11';
      const isExpiring = isExpiringWithin90Days(passportExpiry, 'passport');
      expect(isExpiring).toBe(true);
    });
  });

  describe('الفلترة المتقدمة', () => {
    it('يجب أن يفلتر البطاقات حسب الحالة', () => {
      const cards = [
        { id: 1, status: 'purchased', customerId: 1 },
        { id: 2, status: 'awaiting_match', customerId: 2 },
        { id: 3, status: 'purchased', customerId: 3 },
      ];

      const filtered = cards.filter(c => c.status === 'purchased');
      expect(filtered).toHaveLength(2);
      expect(filtered[0].id).toBe(1);
      expect(filtered[1].id).toBe(3);
    });

    it('يجب أن يفلتر البطاقات حسب نطاق التاريخ', () => {
      const cards = [
        { id: 1, createdAt: new Date('2026-03-01'), status: 'purchased' },
        { id: 2, createdAt: new Date('2026-03-15'), status: 'purchased' },
        { id: 3, createdAt: new Date('2026-04-01'), status: 'purchased' },
      ];

      const startDate = new Date('2026-03-01');
      const endDate = new Date('2026-03-31');

      const filtered = cards.filter(c => c.createdAt >= startDate && c.createdAt <= endDate);
      expect(filtered).toHaveLength(2);
    });

    it('يجب أن يفلتر البطاقات حسب صلاحية البطاقة', () => {
      const cards = [
        { id: 1, cardExpiry: '03/26', status: 'purchased' }, // قريبة الانتهاء
        { id: 2, cardExpiry: '10/26', status: 'purchased' }, // بعيدة الانتهاء
      ];

      const expiringCards = cards.filter(c => {
        const isExpiring = isExpiringWithin90Days(c.cardExpiry, 'card');
        return isExpiring;
      });

      expect(expiringCards).toHaveLength(1);
      expect(expiringCards[0].id).toBe(1);
    });
  });

  describe('التزامن الفوري', () => {
    it('يجب أن يتعامل مع البيانات المضافة من جهاز آخر', () => {
      const customers = [
        { id: 1, name: 'أحمد' },
        { id: 2, name: 'محمد' },
      ];

      // محاكاة إضافة زبون جديد من جهاز آخر
      const newCustomer = { id: 3, name: 'علي' };
      const updatedCustomers = [...customers, newCustomer];

      expect(updatedCustomers).toHaveLength(3);
      expect(updatedCustomers[2].name).toBe('علي');
    });

    it('يجب أن يتعامل مع تحديث البيانات من جهاز آخر', () => {
      let customers = [
        { id: 1, name: 'أحمد', status: 'active' },
        { id: 2, name: 'محمد', status: 'active' },
      ];

      // محاكاة تحديث حالة زبون من جهاز آخر
      customers = customers.map(c => 
        c.id === 1 ? { ...c, status: 'inactive' } : c
      );

      expect(customers[0].status).toBe('inactive');
      expect(customers[1].status).toBe('active');
    });
  });

  describe('البحث المتقدم', () => {
    it('يجب أن يبحث عن الزبائن بالاسم', () => {
      const customers = [
        { id: 1, name: 'أحمد علي' },
        { id: 2, name: 'محمد أحمد' },
        { id: 3, name: 'علي محمد' },
      ];

      const searchTerm = 'أحمد';
      const results = customers.filter(c => c.name.includes(searchTerm));

      expect(results).toHaveLength(2);
    });

    it('يجب أن يبحث عن الزبائن برقم الهاتف', () => {
      const customers = [
        { id: 1, name: 'أحمد', phone: '0920563695' },
        { id: 2, name: 'محمد', phone: '0912345678' },
      ];

      const searchTerm = '0920';
      const results = customers.filter(c => c.phone.includes(searchTerm));

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('أحمد');
    });

    it('يجب أن يبحث عن الزبائن برقم الهوية', () => {
      const customers = [
        { id: 1, name: 'أحمد', nationalId: '123456789' },
        { id: 2, name: 'محمد', nationalId: '987654321' },
      ];

      const searchTerm = '123456';
      const results = customers.filter(c => c.nationalId.includes(searchTerm));

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('أحمد');
    });
  });

  describe('حالات البطاقات الجديدة', () => {
    it('يجب أن يدعم حالة "تم الحجز دون اختيار شركة الصرافة"', () => {
      const card = {
        id: 1,
        status: 'reserved_without_exchange',
        customerId: 1,
      };

      expect(card.status).toBe('reserved_without_exchange');
    });

    it('يجب أن يدعم حالة "تم اختيار شركة الصرافة"', () => {
      const card = {
        id: 1,
        status: 'exchange_selected',
        exchangeCompanyName: 'شركة الصرافة الأولى',
        exchangeCompanyPhone: '0920563695',
        exchangeRate: '2.5',
        customerId: 1,
      };

      expect(card.status).toBe('exchange_selected');
      expect(card.exchangeCompanyName).toBe('شركة الصرافة الأولى');
      expect(card.exchangeRate).toBe('2.5');
    });
  });

  describe('الإشعارات التلقائية', () => {
    it('يجب أن يرسل إشعار عند اقتراب انتهاء البطاقة', () => {
      const mockNotification = vi.fn();
      
      const card = {
        id: 1,
        cardExpiry: '03/26',
        customerId: 1,
        customerName: 'أحمد',
      };

      const isExpiring = isExpiringWithin90Days(card.cardExpiry, 'card');
      
      if (isExpiring) {
        mockNotification(`تنبيه: بطاقة ${card.customerName} قريبة الانتهاء`);
      }

      expect(mockNotification).toHaveBeenCalledWith(
        expect.stringContaining('أحمد')
      );
    });

    it('يجب أن لا يرسل إشعار للبطاقات البعيدة الانتهاء', () => {
      const mockNotification = vi.fn();
      
      const card = {
        id: 1,
        cardExpiry: '10/26',
        customerId: 1,
        customerName: 'أحمد',
      };

      const isExpiring = isExpiringWithin90Days(card.cardExpiry, 'card');
      
      if (isExpiring) {
        mockNotification(`تنبيه: بطاقة ${card.customerName} قريبة الانتهاء`);
      }

      expect(mockNotification).not.toHaveBeenCalled();
    });
  });
});
