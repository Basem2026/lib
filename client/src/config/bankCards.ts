/**
 * تكوين بطاقات المصارف
 * يربط كل مصرف بصورة البطاقة الخاصة به
 */

export interface BankCardConfig {
  id: string;
  nameAr: string;
  nameEn: string;
  cardImage: string;
  cardType: 'mastercard' | 'visa';
}

export const BANK_CARDS: Record<string, BankCardConfig> = {
  aman: {
    id: 'aman',
    nameAr: 'مصرف الأمان',
    nameEn: 'AMAN BANK',
    cardImage: '/images/aman_bank_card.png',
    cardType: 'mastercard',
  },
  nab: {
    id: 'nab',
    nameAr: 'مصرف شمال أفريقيا',
    nameEn: 'NORTH AFRICA BANK',
    cardImage: '/images/nab_card.png',
    cardType: 'visa',
  },
  ncb: {
    id: 'ncb',
    nameAr: 'المصرف التجاري الوطني',
    nameEn: 'NATIONAL COMMERCIAL BANK',
    cardImage: '/images/ncb_card.png',
    cardType: 'mastercard',
  },
  bcd: {
    id: 'bcd',
    nameAr: 'مصرف التجارة والتنمية',
    nameEn: 'COMMERCE & DEVELOPMENT BANK',
    cardImage: '/images/bcd_card.png',
    cardType: 'visa',
  },
  nuran: {
    id: 'nuran',
    nameAr: 'مصرف النوران',
    nameEn: 'AL NURAN BANK',
    cardImage: '/images/nuran_card.png',
    cardType: 'visa',
  },
  jumhouria: {
    id: 'jumhouria',
    nameAr: 'مصرف الجمهورية',
    nameEn: 'JUMHOURIA BANK',
    cardImage: '/images/jumhouria_card.png',
    cardType: 'mastercard',
  },
  sahara: {
    id: 'sahara',
    nameAr: 'مصرف الصحارى',
    nameEn: 'SAHARA BANK',
    cardImage: '/images/sahara_card.png',
    cardType: 'visa',
  },
  wahda: {
    id: 'wahda',
    nameAr: 'مصرف الوحدة',
    nameEn: 'AL WAHDA BANK',
    cardImage: '/images/wahda_card.png',
    cardType: 'mastercard',
  },
  umma: {
    id: 'umma',
    nameAr: 'مصرف الأمة',
    nameEn: 'AL UMMA BANK',
    cardImage: '/images/umma_card.png',
    cardType: 'visa',
  },
  wafa: {
    id: 'wafa',
    nameAr: 'مصرف الوفاء',
    nameEn: 'AL WAFA BANK',
    cardImage: '/images/wafa_card.png',
    cardType: 'mastercard',
  },
  ejtemae: {
    id: 'ejtemae',
    nameAr: 'مصرف الاجتماعي',
    nameEn: 'SOCIAL BANK',
    cardImage: '/images/ejtemae_card.png',
    cardType: 'visa',
  },
  mediterranean: {
    id: 'mediterranean',
    nameAr: 'مصرف المتوسط',
    nameEn: 'MEDITERRANEAN BANK',
    cardImage: '/images/mediterranean_card.png',
    cardType: 'mastercard',
  },
  libya: {
    id: 'libya',
    nameAr: 'مصرف ليبيا',
    nameEn: 'BANK OF LIBYA',
    cardImage: '/images/libya_card.png',
    cardType: 'visa',
  },
  central: {
    id: 'central',
    nameAr: 'المصرف المركزي',
    nameEn: 'CENTRAL BANK',
    cardImage: '/images/central_card.png',
    cardType: 'mastercard',
  },
};

/**
 * الحصول على تكوين بطاقة مصرف معين
 */
export function getBankCardConfig(bankId: string): BankCardConfig {
  return BANK_CARDS[bankId] || BANK_CARDS.aman; // افتراضي: مصرف الأمان
}

/**
 * قائمة جميع المصارف للاستخدام في القوائم المنسدلة
 */
export const BANK_LIST = Object.values(BANK_CARDS);
