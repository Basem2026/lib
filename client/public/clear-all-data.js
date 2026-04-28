/**
 * سكريبت تنظيف شامل لجميع البيانات
 * يتم تشغيله من Console في المتصفح
 */

console.log("🧹 بدء عملية التنظيف الشاملة...\n");

// قائمة جميع مفاتيح localStorage المطلوب مسحها
const keysToDelete = [
  // بيانات الزباين والبطاقات
  'customers_data',
  'cards_data',
  'transactions_data',
  'accounts_data',
  
  // بيانات الموظفين (سيتم الاحتفاظ بالمدير فقط)
  'employees',
  'auditLogs',
  'dailyCloses',
  
  // البيانات المالية
  'treasury_data',
  'expenses_data',
  'salaries_data',
  'financial_data',
  'banking_treasury_data',
  'bank_accounts_data',
  
  // السجلات والعمليات
  'logs_data',
  'operations_data',
  'audit_data',
  
  // الإشعارات
  'notifications_data',
  
  // أي بيانات أخرى
  'delegates_data',
  'balances_data'
];

console.log("📋 المفاتيح المطلوب مسحها:");
keysToDelete.forEach(key => console.log(`   - ${key}`));
console.log("");

// مسح جميع البيانات
let deletedCount = 0;
keysToDelete.forEach(key => {
  if (localStorage.getItem(key)) {
    localStorage.removeItem(key);
    console.log(`✅ تم مسح: ${key}`);
    deletedCount++;
  }
});

console.log(`\n📊 تم مسح ${deletedCount} مفتاح من localStorage\n`);

// تعيين قيم افتراضية فارغة
console.log("🔧 تعيين القيم الافتراضية الفارغة...");

localStorage.setItem('customers_data', JSON.stringify([]));
localStorage.setItem('cards_data', JSON.stringify([]));
localStorage.setItem('transactions_data', JSON.stringify([]));
localStorage.setItem('accounts_data', JSON.stringify([]));
localStorage.setItem('logs_data', JSON.stringify([]));
localStorage.setItem('operations_data', JSON.stringify([]));
localStorage.setItem('expenses_data', JSON.stringify([]));
localStorage.setItem('bank_accounts_data', JSON.stringify([]));

// إعادة تعيين الموظفين (المدير فقط)
const managerOnly = [{
  id: '1',
  employeeCode: 'LY-MGR-00001',
  phone: '0920563695',
  fullName: 'محمد مصطفى زهمول',
  jobTitle: 'manager',
  passwordHash: 'password123',
  status: 'active',
  permissions: ['add_customer', 'view_customers', 'edit_customer', 'delete_customer', 'print_customer_receipt', 'view_cards', 'add_card', 'edit_card', 'delete_card', 'view_operations', 'add_operation', 'edit_operation', 'delete_operation', 'view_operation_profit', 'print_operation_receipt', 'view_expenses', 'add_expense', 'view_salaries', 'add_salary', 'view_treasury', 'view_reports', 'view_financial_summary', 'submit_daily_close', 'approve_daily_close', 'reject_daily_close', 'manage_users', 'manage_permissions', 'edit_user', 'delete_user', 'view_logs', 'view_audit_trail', 'print_receipts', 'print_reports'],
  createdAt: new Date().toISOString(),
  createdBy: 'system',
  updatedAt: new Date().toISOString()
}];

localStorage.setItem('employees', JSON.stringify(managerOnly));
console.log("✅ تم إعادة تعيين الموظفين (المدير فقط)");

// إعادة تعيين الخزينة للقيم الافتراضية
const defaultTreasury = {
  cash: 0,
  bankAccounts: [],
  totalIncome: 0,
  totalExpenses: 0,
  transactions: []
};
localStorage.setItem('treasury_data', JSON.stringify(defaultTreasury));
console.log("✅ تم إعادة تعيين الخزينة للقيم الافتراضية");

console.log("\n✅ تم تنظيف النظام بنجاح!");
console.log("🔄 يرجى إعادة تحميل الصفحة (F5) لتطبيق التغييرات\n");
console.log("📝 ملاحظة: المدير الوحيد المتبقي:");
console.log("   - الاسم: محمد مصطفى زهمول");
console.log("   - رقم الهاتف: 0920563695");
console.log("   - كلمة المرور: password123");
