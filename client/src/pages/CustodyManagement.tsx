import { useState } from 'react';
import { useEmployees, type HandoverCustodyData } from '@/contexts/EmployeesContext';
import { useDepartments } from '@/contexts/DepartmentsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAccounts } from '@/contexts/AccountsContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Wallet, Plus, History } from 'lucide-react';
import { toast } from 'sonner';

/**
 * صفحة إدارة العهدة للموظفين
 * نموذج واحد مع حقول اختيارية لتسليم العهدة
 */

export default function CustodyManagement() {
  const { employees, handoverCustody, getCustodyTransactionsByEmployee } = useEmployees();
  const { withdraw } = useDepartments();
  const { user } = useAuth();
  const accountsCtx = useAccounts();
  const [showHandoverDialog, setShowHandoverDialog] = useState(false);
  const [selectedEmployeeForHistory, setSelectedEmployeeForHistory] = useState<string | null>(null);
  const [formData, setFormData] = useState<HandoverCustodyData>({
    employeeId: '',
    cashLYD: undefined,
    cashUSD: undefined,
    supportedUSDRate: undefined,
    referenceUSDCashSellRate: undefined,
    bankLYD: undefined,
    referenceUSDBankSellRate: undefined,
    notes: '',
  });

  // تصفية الموظفين (موظف مكتب + مشرف مكتب فقط)
  const officeEmployees = employees.filter(
    e => e.jobTitle === 'operations' || e.jobTitle === 'supervisor'
  );

  const handleHandoverCustody = async () => {
    if (!formData.employeeId) {
      toast.error('يرجى اختيار الموظف');
      return;
    }

    // التحقق من وجود حقل واحد على الأقل معبأ
    if (!formData.cashLYD && !formData.cashUSD && !formData.bankLYD) {
      toast.error('يرجى ملء حقل واحد على الأقل');
      return;
    }

    // خصم من قسم العمليات اليومية
    try {
      if (formData.cashLYD && formData.cashLYD > 0) {
        const withdrawResult = await withdraw(
          'daily_operations',
          'cash_lyd',
          formData.cashLYD,
          formData.employeeId,
          'custody',
          `تسليم عهدة - كاش دينار`,
          user?.fullName || 'system'
        );
        if (!withdrawResult.success) {
          toast.error(`فشل خصم كاش الدينار: ${withdrawResult.error}`);
          return;
        }
      }

      if (formData.cashUSD && formData.cashUSD > 0) {
        const withdrawResult = await withdraw(
          'daily_operations',
          'cash_usd',
          formData.cashUSD,
          formData.employeeId,
          'custody',
          `تسليم عهدة - كاش دولار`,
          user?.fullName || 'system'
        );
        if (!withdrawResult.success) {
          toast.error(`فشل خصم كاش الدولار: ${withdrawResult.error}`);
          return;
        }
      }

      if (formData.bankLYD && formData.bankLYD > 0) {
        const withdrawResult = await withdraw(
          'daily_operations',
          'bank_other',
          formData.bankLYD,
          formData.employeeId,
          'custody',
          `تسليم عهدة - مصرف دينار`,
          user?.fullName || 'system'
        );
        if (!withdrawResult.success) {
          toast.error(`فشل خصم مصرف الدينار: ${withdrawResult.error}`);
          return;
        }
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء خصم المبالغ من المالية');
      return;
    }

    // إضافة لعهدة الموظف
    const result = await handoverCustody(formData, user?.fullName || 'system');
    
    if (result.success) {
      // ربط تلقائي مع الخزينة
      try {
        const employeeName = employees.find(e => e.id === formData.employeeId)?.fullName || 'غير معروف';
        
        // تسليم كاش دينار (ينقص من الخزينة)
        if (formData.cashLYD && formData.cashLYD > 0) {
          accountsCtx.addTransaction({
            type: 'withdrawal',
            accountType: 'cash_lyd',
            amount: formData.cashLYD,
            currency: 'LYD',
            description: `تسليم عهدة كاش دينار - ${employeeName}`,
            reference: `CUSTODY-${formData.employeeId}-${Date.now()}`,
            date: new Date(),
            createdBy: user?.fullName || 'system',
          });
        }
        
        // تسليم كاش دولار (ينقص من الخزينة)
        if (formData.cashUSD && formData.cashUSD > 0) {
          accountsCtx.addTransaction({
            type: 'withdrawal',
            accountType: 'cash_usd',
            amount: formData.cashUSD,
            currency: 'USD',
            description: `تسليم عهدة كاش دولار - ${employeeName}`,
            reference: `CUSTODY-${formData.employeeId}-${Date.now()}`,
            date: new Date(),
            createdBy: user?.fullName || 'system',
          });
        }
        
        // تسليم مصرف دينار (ينقص من الخزينة)
        if (formData.bankLYD && formData.bankLYD > 0) {
          accountsCtx.addTransaction({
            type: 'withdrawal',
            accountType: 'bank_lyd',
            amount: formData.bankLYD,
            currency: 'LYD',
            description: `تسليم عهدة مصرف دينار - ${employeeName}`,
            reference: `CUSTODY-${formData.employeeId}-${Date.now()}`,
            date: new Date(),
            createdBy: user?.fullName || 'system',
          });
        }
      } catch {
        // لا نوقف العملية إذا فشل ربط الخزينة فقط
      }
      
      toast.success('تم تسليم العهدة وربطها بالخزينة بنجاح');
      setShowHandoverDialog(false);
      setFormData({
        employeeId: '',
        cashLYD: undefined,
        cashUSD: undefined,
        supportedUSDRate: undefined,
        referenceUSDCashSellRate: undefined,
        bankLYD: undefined,
        referenceUSDBankSellRate: undefined,
        notes: '',
      });
    } else {
      toast.error(result.error || 'فشل تسليم العهدة');
    }
  };

  const getAccountLabel = (accountType: string): string => {
    const labels: Record<string, string> = {
      cashLYD: 'كاش دينار',
      cashUSD: 'كاش دولار',
      bankLYD: 'مصرف دينار',
      bankUSD: 'مصرف دولار',
    };
    return labels[accountType] || accountType;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-800 to-slate-900 text-white py-8 px-4 shadow-lg">
        <div className="container max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Wallet className="w-8 h-8 text-amber-400" />
            <h1 className="text-3xl font-bold">إدارة العهدة</h1>
          </div>
          <p className="text-slate-300">نظام تسليم العهدة للموظفين</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-7xl mx-auto px-4 py-8">
        {/* Actions */}
        <div className="mb-8 flex gap-4">
          <Button
            onClick={() => setShowHandoverDialog(true)}
            className="gap-2 bg-green-600 hover:bg-green-700"
            size="lg"
          >
            <Plus className="w-5 h-5" />
            تسليم عهدة
          </Button>
        </div>

        {/* جدول الموظفين */}
        <Card className="overflow-hidden shadow-lg mb-8">
          <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white p-6">
            <h2 className="text-2xl font-bold">أرصدة الموظفين</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-100 border-b-2 border-slate-300">
                <tr>
                  <th className="px-6 py-4 text-right text-sm font-bold text-slate-900">الموظف</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-slate-900">كاش دينار</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-slate-900">كاش دولار</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-slate-900">مصرف دينار</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-slate-900">مصرف دولار</th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-slate-900">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {officeEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      لا يوجد موظفين
                    </td>
                  </tr>
                ) : (
                  officeEmployees.map((employee, index) => {
                    const accounts = employee.custodyAccounts || { cashLYD: 0, cashUSD: 0, bankLYD: 0, bankUSD: 0 };
                    return (
                      <tr 
                        key={employee.id} 
                        className={`hover:bg-slate-50 transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                        }`}
                      >
                        <td className="px-6 py-4 border-r border-slate-200">
                          <div className="font-semibold text-slate-900">{employee.fullName}</div>
                          <div className="text-sm text-slate-600 mt-0.5">{employee.employeeCode}</div>
                        </td>
                        <td className="px-6 py-4 text-center text-slate-900 font-medium border-r border-slate-200">
                          {accounts.cashLYD.toLocaleString()} د.ل
                        </td>
                        <td className="px-6 py-4 text-center text-slate-900 font-medium border-r border-slate-200">
                          ${accounts.cashUSD.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-center text-slate-900 font-medium border-r border-slate-200">
                          {accounts.bankLYD.toLocaleString()} د.ل
                        </td>
                        <td className="px-6 py-4 text-center text-slate-900 font-medium border-r border-slate-200">
                          ${accounts.bankUSD.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedEmployeeForHistory(employee.id)}
                            className="gap-2 hover:bg-[#2C3E50] hover:text-white transition-colors"
                          >
                            <History className="w-4 h-4" />
                            السجل
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* نموذج تسليم العهدة */}
        <Dialog open={showHandoverDialog} onOpenChange={setShowHandoverDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Wallet className="w-6 h-6 text-amber-500" />
                تسليم عهدة
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* اختيار الموظف */}
              <div>
                <Label className="text-base font-semibold">الموظف *</Label>
                <Select
                  value={formData.employeeId}
                  onValueChange={(value) => setFormData({ ...formData, employeeId: value })}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="اختر الموظف" />
                  </SelectTrigger>
                  <SelectContent>
                    {officeEmployees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.fullName} - {emp.employeeCode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-lg mb-4 text-slate-700">المبالغ (جميع الحقول اختيارية)</h3>
                
                {/* كاش دينار */}
                <div className="mb-4">
                  <Label>القيمة بالدينار الكاش</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={formData.cashLYD || ''}
                    onChange={(e) => setFormData({ ...formData, cashLYD: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="mt-2"
                  />
                </div>

                {/* كاش دولار */}
                <div className="mb-4">
                  <Label>القيمة بالدولار بالكاش</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={formData.cashUSD || ''}
                    onChange={(e) => setFormData({ ...formData, cashUSD: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="mt-2"
                  />
                </div>

                {/* سعر مدعي للدولار */}
                <div className="mb-4">
                  <Label>سعر مدعي للدولار الكاش</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={formData.supportedUSDRate || ''}
                    onChange={(e) => setFormData({ ...formData, supportedUSDRate: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="mt-2"
                  />
                </div>

                {/* سعر مرجعي للبيع بالكاش */}
                <div className="mb-4">
                  <Label>سعر مرجعي للدولار للبيع بالكاش</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={formData.referenceUSDCashSellRate || ''}
                    onChange={(e) => setFormData({ ...formData, referenceUSDCashSellRate: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="mt-2"
                  />
                </div>

                {/* مصرف دينار */}
                <div className="mb-4">
                  <Label>القيمة بالمصرف بالدينار</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={formData.bankLYD || ''}
                    onChange={(e) => setFormData({ ...formData, bankLYD: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="mt-2"
                  />
                </div>

                {/* سعر مرجعي للبيع بالمصرف */}
                <div className="mb-4">
                  <Label>سعر مرجعي لبيع الدولار بالمصرف</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={formData.referenceUSDBankSellRate || ''}
                    onChange={(e) => setFormData({ ...formData, referenceUSDBankSellRate: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="mt-2"
                  />
                </div>

                {/* ملاحظات */}
                <div>
                  <Label>ملاحظات</Label>
                  <Textarea
                    placeholder="ملاحظات إضافية (اختياري)"
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="mt-2"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => setShowHandoverDialog(false)}>
                  إلغاء
                </Button>
                <Button onClick={handleHandoverCustody} className="bg-green-600 hover:bg-green-700">
                  تسليم العهدة
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* نافذة سجل العمليات */}
        <Dialog open={!!selectedEmployeeForHistory} onOpenChange={() => setSelectedEmployeeForHistory(null)}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                سجل العمليات - {employees.find(e => e.id === selectedEmployeeForHistory)?.fullName}
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-100 border-b">
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">التاريخ</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">النوع</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">الحساب</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">المبلغ</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">الرصيد قبل</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">الرصيد بعد</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">بواسطة</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedEmployeeForHistory && getCustodyTransactionsByEmployee(selectedEmployeeForHistory).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        لا توجد عمليات
                      </td>
                    </tr>
                  ) : (
                    selectedEmployeeForHistory &&
                    getCustodyTransactionsByEmployee(selectedEmployeeForHistory)
                      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((transaction: any) => (
                        <tr key={transaction.id} className="border-b hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm text-slate-900">
                            {new Date(transaction.createdAt).toLocaleString('ar-LY')}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${
                                transaction.type === 'deposit'
                                  ? 'bg-green-100 text-green-800'
                                  : transaction.type === 'withdraw'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {transaction.type === 'deposit' ? 'إيداع' : transaction.type === 'withdraw' ? 'سحب' : 'تحويل'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-900">
                            {getAccountLabel(transaction.accountType)}
                            {transaction.toAccountType && ` → ${getAccountLabel(transaction.toAccountType)}`}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-slate-900">
                            {transaction.amount.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {transaction.balanceBefore.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {transaction.balanceAfter.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {transaction.createdBy}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
