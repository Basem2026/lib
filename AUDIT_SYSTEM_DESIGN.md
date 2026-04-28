# تصميم نظام التسجيل الشامل المتقدم

## البنية الأساسية

### نوع السجل (Log Type)
```typescript
type LogType = 'management' | 'employee';
```

- **management**: سجلات الإدارة (عمليات إدارية: موظفين، صلاحيات، إعدادات)
- **employee**: سجلات الموظفين (عمليات يومية: زبائن، بطاقات، عمليات، مصروفات)

### نوع العملية (Action Type)
```typescript
type ActionType = 'add' | 'edit' | 'delete' | 'block' | 'unblock' | 'disable' | 'enable';
```

- **add** ➕: إضافة عنصر جديد
- **edit** ✏️: تعديل عنصر موجود
- **delete** 🗑️: حذف عنصر
- **block** 🚫: حظر موظف
- **unblock** ✅: فك حظر موظف
- **disable** ⏸️: تعطيل موظف
- **enable** ▶️: تفعيل موظف

### نوع الكيان (Entity Type)
```typescript
type EntityType = 
  | 'employee'      // موظف
  | 'customer'      // زبون
  | 'card'          // بطاقة
  | 'operation'     // عملية
  | 'expense'       // مصروف
  | 'salary'        // راتب
  | 'permission'    // صلاحية
  | 'service';      // خدمة
```

### بنية السجل (Audit Log Structure)
```typescript
interface AuditLog {
  id: string;                    // معرف فريد
  logType: LogType;              // نوع السجل (إدارة/موظفين)
  actionType: ActionType;        // نوع العملية
  entityType: EntityType;        // نوع الكيان
  entityId: string;              // معرف الكيان
  entityName: string;            // اسم الكيان (للعرض)
  
  // معلومات الموظف
  employeeId: string;            // معرف الموظف
  employeeName: string;          // اسم الموظف
  employeeRole: string;          // دور الموظف (مدير، موظف...)
  
  // التوقيت
  timestamp: number;             // Unix timestamp (milliseconds)
  date: string;                  // DD/MM/YYYY
  time: string;                  // HH:MM:SS
  
  // التفاصيل
  description: string;           // وصف العملية
  before?: Record<string, any>;  // البيانات قبل التعديل (للتعديل والحذف)
  after?: Record<string, any>;   // البيانات بعد التعديل (للإضافة والتعديل)
  changes?: Array<{              // قائمة التغييرات (للتعديل فقط)
    field: string;               // اسم الحقل
    fieldLabel: string;          // تسمية الحقل بالعربية
    oldValue: any;               // القيمة القديمة
    newValue: any;               // القيمة الجديدة
  }>;
}
```

## أمثلة

### مثال 1: إضافة زبون
```json
{
  "id": "log_001",
  "logType": "employee",
  "actionType": "add",
  "entityType": "customer",
  "entityId": "cust_123",
  "entityName": "أحمد علي المبروك",
  
  "employeeId": "LY-M-00001",
  "employeeName": "محمد مصطفى زهمول",
  "employeeRole": "مدير",
  
  "timestamp": 1707912645000,
  "date": "14/02/2026",
  "time": "10:30:45",
  
  "description": "إضافة زبون جديد: أحمد علي المبروك",
  "after": {
    "name": "أحمد علي المبروك",
    "phone": "0912345678",
    "passportNumber": "A123456"
  }
}
```

### مثال 2: تعديل بيانات زبون
```json
{
  "id": "log_002",
  "logType": "employee",
  "actionType": "edit",
  "entityType": "customer",
  "entityId": "cust_123",
  "entityName": "أحمد علي المبروك",
  
  "employeeId": "LY-IN-00002",
  "employeeName": "موظف اختبار",
  "employeeRole": "موظف إدخال",
  
  "timestamp": 1707913245000,
  "date": "14/02/2026",
  "time": "10:40:45",
  
  "description": "تعديل بيانات زبون: أحمد علي المبروك",
  "before": {
    "name": "أحمد علي",
    "phone": "0912345678"
  },
  "after": {
    "name": "أحمد علي المبروك",
    "phone": "0913456789"
  },
  "changes": [
    {
      "field": "name",
      "fieldLabel": "الاسم",
      "oldValue": "أحمد علي",
      "newValue": "أحمد علي المبروك"
    },
    {
      "field": "phone",
      "fieldLabel": "رقم الهاتف",
      "oldValue": "0912345678",
      "newValue": "0913456789"
    }
  ]
}
```

### مثال 3: حظر موظف
```json
{
  "id": "log_003",
  "logType": "management",
  "actionType": "block",
  "entityType": "employee",
  "entityId": "LY-IN-00002",
  "entityName": "موظف اختبار",
  
  "employeeId": "LY-M-00001",
  "employeeName": "محمد مصطفى زهمول",
  "employeeRole": "مدير",
  
  "timestamp": 1707914445000,
  "date": "14/02/2026",
  "time": "11:00:45",
  
  "description": "حظر موظف: موظف اختبار",
  "before": {
    "status": "active"
  },
  "after": {
    "status": "blocked"
  },
  "changes": [
    {
      "field": "status",
      "fieldLabel": "الحالة",
      "oldValue": "نشط",
      "newValue": "محظور"
    }
  ]
}
```

## التخزين

- **localStorage** للنظام الحالي (لا يستخدم قاعدة بيانات)
- المفتاح: `audit_logs_management` و `audit_logs_employee`
- الحد الأقصى: 1000 سجل لكل نوع (يتم حذف الأقدم تلقائياً)

## الفلترة والبحث

- فلترة حسب نوع العملية (إضافة، تعديل، حذف...)
- فلترة حسب نوع الكيان (موظف، زبون، بطاقة...)
- فلترة حسب الموظف
- فلترة حسب الفترة الزمنية (اليوم، الأسبوع، الشهر، مخصص)
- بحث نصي في الوصف والأسماء

## العرض

- جدول مع أعمدة: التاريخ والوقت، نوع العملية، العملية، الموظف، التفاصيل
- نافذة منبثقة لعرض التفاصيل الكاملة (قبل/بعد التعديل)
- أيقونات ملونة لكل نوع عملية
- تصدير إلى JSON/CSV
