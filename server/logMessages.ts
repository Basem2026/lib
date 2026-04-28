/**
 * مولّد نصوص السجلات العربية
 * يحوّل كل عملية إلى جملة عربية واضحة ومقروءة
 */

// ترجمة أنواع العمليات
export const ACTION_LABELS: Record<string, string> = {
  create: 'إضافة',
  update: 'تعديل',
  delete: 'حذف',
  print: 'طباعة',
  close_day: 'إغلاق يوم',
  approve_close: 'اعتماد إغلاق',
  reject_close: 'رفض إغلاق',
  permission_change: 'تغيير صلاحية',
  login: 'تسجيل دخول',
  logout: 'تسجيل خروج',
  block: 'حظر',
  unblock: 'رفع حظر',
  deposit: 'إيداع',
  withdraw: 'سحب',
  transfer: 'تحويل',
  approve: 'اعتماد',
  reject: 'رفض',
};

// ترجمة أنواع الكيانات
export const ENTITY_LABELS: Record<string, string> = {
  customer: 'زبون',
  card: 'بطاقة',
  operation: 'عملية',
  expense: 'مصروف',
  salary: 'راتب',
  employee: 'موظف',
  daily_close: 'إغلاق يومي',
  treasury: 'خزينة',
  system: 'النظام',
  account: 'حساب',
  delegate: 'مندوب',
  service: 'خدمة',
  permission: 'صلاحية',
};

// ترجمة حقول الزبون
export const CUSTOMER_FIELD_LABELS: Record<string, string> = {
  name: 'الاسم',
  phone: 'رقم الهاتف',
  idNumber: 'رقم الهوية',
  address: 'العنوان',
  status: 'الحالة',
  cardType: 'نوع البطاقة',
  purchasePrice: 'سعر الشراء',
  totalPrice: 'السعر الإجمالي',
  totalBalance: 'الرصيد الإجمالي',
  notes: 'الملاحظات',
  delegateShare: 'حصة المندوب',
  delegateName: 'اسم المندوب',
  serviceType: 'نوع الخدمة',
  passportExpiry: 'تاريخ انتهاء الجواز',
  cardExpiry: 'تاريخ انتهاء البطاقة',
  withdrawalStatus: 'حالة السحب',
  isBlocked: 'محظور',
  blockReason: 'سبب الحظر',
};

// ترجمة حقول البطاقة
export const CARD_FIELD_LABELS: Record<string, string> = {
  cardNumber: 'رقم البطاقة',
  cardType: 'نوع البطاقة',
  status: 'الحالة',
  balance: 'الرصيد',
  expiryDate: 'تاريخ الانتهاء',
  isActive: 'نشطة',
  notes: 'الملاحظات',
};

// ترجمة قيم الحالة
export const STATUS_LABELS: Record<string, string> = {
  active: 'نشط',
  inactive: 'غير نشط',
  suspended: 'موقوف',
  blocked: 'محظور',
  pending: 'قيد الانتظار',
  approved: 'معتمد',
  rejected: 'مرفوض',
  completed: 'مكتمل',
  cancelled: 'ملغي',
  true: 'نعم',
  false: 'لا',
};

/**
 * توليد نص وصف السجل للزبون
 */
export function buildCustomerLog(
  action: 'create' | 'update' | 'delete',
  customerName: string,
  userName: string,
  changes?: Array<{ field: string; oldValue: any; newValue: any }>
): string {
  switch (action) {
    case 'create':
      return `قام ${userName} بإضافة زبون جديد: ${customerName}`;
    case 'delete':
      return `قام ${userName} بحذف الزبون: ${customerName}`;
    case 'update': {
      if (!changes || changes.length === 0) {
        return `قام ${userName} بتعديل بيانات الزبون: ${customerName}`;
      }
      const changeTexts = changes.map(c => {
        const fieldLabel = CUSTOMER_FIELD_LABELS[c.field] || c.field;
        const oldVal = translateValue(c.oldValue);
        const newVal = translateValue(c.newValue);
        return `${fieldLabel} من "${oldVal}" إلى "${newVal}"`;
      });
      return `قام ${userName} بتعديل بيانات الزبون ${customerName}: تغيير ${changeTexts.join('، ')}`;
    }
  }
}

/**
 * توليد نص وصف السجل للبطاقة
 */
export function buildCardLog(
  action: 'create' | 'update' | 'delete',
  cardNumber: string,
  customerName: string,
  userName: string,
  changes?: Array<{ field: string; oldValue: any; newValue: any }>
): string {
  switch (action) {
    case 'create':
      return `قام ${userName} بإضافة بطاقة جديدة رقم ${cardNumber} للزبون ${customerName}`;
    case 'delete':
      return `قام ${userName} بحذف البطاقة رقم ${cardNumber} للزبون ${customerName}`;
    case 'update': {
      if (!changes || changes.length === 0) {
        return `قام ${userName} بتعديل بيانات البطاقة رقم ${cardNumber} للزبون ${customerName}`;
      }
      const changeTexts = changes.map(c => {
        const fieldLabel = CARD_FIELD_LABELS[c.field] || c.field;
        const oldVal = translateValue(c.oldValue);
        const newVal = translateValue(c.newValue);
        return `${fieldLabel} من "${oldVal}" إلى "${newVal}"`;
      });
      return `قام ${userName} بتعديل البطاقة رقم ${cardNumber} للزبون ${customerName}: تغيير ${changeTexts.join('، ')}`;
    }
  }
}

/**
 * توليد نص وصف السجل للموظف
 */
export function buildEmployeeLog(
  action: 'create' | 'update' | 'delete' | 'block' | 'unblock' | 'permission_change',
  employeeName: string,
  userName: string,
  extra?: string
): string {
  switch (action) {
    case 'create':
      return `قام ${userName} بإضافة موظف جديد: ${employeeName}`;
    case 'delete':
      return `قام ${userName} بحذف الموظف: ${employeeName}`;
    case 'update':
      return `قام ${userName} بتعديل بيانات الموظف: ${employeeName}${extra ? ` (${extra})` : ''}`;
    case 'block':
      return `قام ${userName} بحظر الموظف: ${employeeName}${extra ? ` - السبب: ${extra}` : ''}`;
    case 'unblock':
      return `قام ${userName} برفع الحظر عن الموظف: ${employeeName}`;
    case 'permission_change':
      return `قام ${userName} بتغيير صلاحيات الموظف: ${employeeName}${extra ? ` - ${extra}` : ''}`;
  }
}

/**
 * توليد نص وصف السجل للعمليات المالية
 */
export function buildOperationLog(
  type: string,
  amount: number,
  currency: string,
  userName: string,
  customerName?: string,
  notes?: string
): string {
  const typeLabel = ACTION_LABELS[type] || type;
  const amountStr = `${amount.toLocaleString('ar-LY')} ${currency}`;
  let text = `قام ${userName} بعملية ${typeLabel} بمبلغ ${amountStr}`;
  if (customerName) text += ` للزبون ${customerName}`;
  if (notes) text += ` - ملاحظة: ${notes}`;
  return text;
}

/**
 * توليد نص وصف السجل للمصاريف
 */
export function buildExpenseLog(
  action: 'create' | 'update' | 'delete',
  expenseName: string,
  amount: number,
  userName: string
): string {
  const amountStr = amount.toLocaleString('ar-LY');
  switch (action) {
    case 'create':
      return `قام ${userName} بتسجيل مصروف جديد: ${expenseName} بمبلغ ${amountStr} دينار`;
    case 'update':
      return `قام ${userName} بتعديل المصروف: ${expenseName} (المبلغ: ${amountStr} دينار)`;
    case 'delete':
      return `قام ${userName} بحذف المصروف: ${expenseName} (المبلغ: ${amountStr} دينار)`;
  }
}

/**
 * توليد نص وصف السجل للرواتب
 */
export function buildSalaryLog(
  action: 'create' | 'update' | 'delete',
  employeeName: string,
  amount: number,
  userName: string,
  month?: string
): string {
  const amountStr = amount.toLocaleString('ar-LY');
  const monthStr = month ? ` لشهر ${month}` : '';
  switch (action) {
    case 'create':
      return `قام ${userName} بصرف راتب للموظف ${employeeName}${monthStr} بمبلغ ${amountStr} دينار`;
    case 'update':
      return `قام ${userName} بتعديل راتب الموظف ${employeeName}${monthStr} إلى ${amountStr} دينار`;
    case 'delete':
      return `قام ${userName} بحذف راتب الموظف ${employeeName}${monthStr} (المبلغ: ${amountStr} دينار)`;
  }
}

/**
 * توليد نص وصف السجل للخزينة
 */
export function buildTreasuryLog(
  action: string,
  amount: number,
  currency: string,
  userName: string,
  description?: string
): string {
  const amountStr = `${amount.toLocaleString('ar-LY')} ${currency}`;
  const actionLabel = ACTION_LABELS[action] || action;
  let text = `قام ${userName} بعملية ${actionLabel} في الخزينة بمبلغ ${amountStr}`;
  if (description) text += ` - ${description}`;
  return text;
}

/**
 * توليد نص وصف السجل لإغلاق اليوم
 */
export function buildDayCloseLog(
  action: 'close_day' | 'approve_close' | 'reject_close',
  date: string,
  userName: string,
  notes?: string
): string {
  switch (action) {
    case 'close_day':
      return `قام ${userName} بطلب إغلاق يوم ${date}${notes ? ` - ملاحظة: ${notes}` : ''}`;
    case 'approve_close':
      return `قام ${userName} باعتماد إغلاق يوم ${date}`;
    case 'reject_close':
      return `قام ${userName} برفض إغلاق يوم ${date}${notes ? ` - السبب: ${notes}` : ''}`;
  }
}

/**
 * ترجمة القيم الشائعة إلى عربي
 */
export function translateValue(value: any): string {
  if (value === null || value === undefined || value === '') return 'فارغ';
  const str = String(value);
  return STATUS_LABELS[str] || str;
}

/**
 * مقارنة كائنين واستخراج التغييرات
 */
export function extractChanges(
  before: Record<string, any>,
  after: Record<string, any>,
  fieldLabels: Record<string, string> = {}
): Array<{ field: string; fieldLabel: string; oldValue: any; newValue: any }> {
  const changes: Array<{ field: string; fieldLabel: string; oldValue: any; newValue: any }> = [];
  
  const allKeys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
  const skipFields = ['id', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'createdByName', 'updatedByName'];
  
  for (const key of allKeys) {
    if (skipFields.includes(key)) continue;
    const oldVal = before[key];
    const newVal = after[key];
    if (String(oldVal) !== String(newVal)) {
      changes.push({
        field: key,
        fieldLabel: fieldLabels[key] || CUSTOMER_FIELD_LABELS[key] || CARD_FIELD_LABELS[key] || key,
        oldValue: oldVal,
        newValue: newVal,
      });
    }
  }
  
  return changes;
}
