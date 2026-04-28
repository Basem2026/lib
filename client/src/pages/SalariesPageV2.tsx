import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyBankAccounts } from '@/contexts/CompanyBankAccountsContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, DollarSign, Users } from 'lucide-react';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDate } from '@/lib/utils';

/**
 * صفحة الرواتب V2 - مع دعم tRPC وربط حسابات الخزينة
 */
export default function SalariesPageV2() {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const utils = trpc.useUtils();
  
  // جلب البيانات
  const { data: salaries = [] } = trpc.salaries.getAll.useQuery();
  const { accounts: companyBankAccounts } = useCompanyBankAccounts();
  const { data: treasuryAccounts = [] } = trpc.accounts.getTreasuryAccounts.useQuery();
  
  // Mutations
  const createSalary = trpc.salaries.create.useMutation({
    onSuccess: () => {
      toast.success('تمت إضافة الراتب بنجاح');
      utils.salaries.getAll.invalidate();
      utils.accounts.getTreasuryAccounts.invalidate();
      setShowAddDialog(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`خطأ: ${error.message}`);
    },
  });
  
  // States
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [employeeName, setEmployeeName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [baseSalary, setBaseSalary] = useState('');
  const [bonuses, setBonuses] = useState('');
  const [deductions, setDeductions] = useState('');
  const [currency, setCurrency] = useState<'LYD' | 'USD' | 'USDT'>('LYD');
  const [salaryMonth, setSalaryMonth] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [treasuryAccountId, setTreasuryAccountId] = useState('');
  const [amountLYD, setAmountLYD] = useState('');
  const [amountUSD, setAmountUSD] = useState('');
  const [amountUSDT, setAmountUSDT] = useState('');
  const [notes, setNotes] = useState('');
  
  const resetForm = () => {
    setEmployeeName('');
    setEmployeeId('');
    setBaseSalary('');
    setBonuses('');
    setDeductions('');
    setCurrency('LYD');
    setSalaryMonth('');
    setPaymentDate('');
    setTreasuryAccountId('');
    setAmountLYD('');
    setAmountUSD('');
    setAmountUSDT('');
    setNotes('');
  };
  
  const handleSubmit = () => {
    if (!employeeName || !employeeId || !baseSalary || !treasuryAccountId || !salaryMonth || !paymentDate) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    
    const base = parseFloat(baseSalary);
    const bonus = parseFloat(bonuses || '0');
    const deduct = parseFloat(deductions || '0');
    const total = base + bonus - deduct;
    
    createSalary.mutate({
      employeeId,
      employeeName,
      baseSalary: base,
      bonuses: bonus,
      deductions: deduct,
      totalSalary: total,
      currency,
      salaryMonth,
      paymentDate,
      paymentMethod: 'cash',
      treasuryAccountId,
      notes,
      createdBy: user?.id?.toString() || '',
      createdByName: user?.fullName || 'مستخدم',
    });
  };
  
  // حساب الإحصائيات
  const stats = {
    totalSalaries: salaries.length,
    totalAmountLYD: salaries.filter(s => s.currency === 'LYD').reduce((sum, sal) => sum + parseFloat(sal.totalSalary || '0'), 0),
    totalAmountUSD: salaries.filter(s => s.currency === 'USD').reduce((sum, sal) => sum + parseFloat(sal.totalSalary || '0'), 0),
    totalAmountUSDT: salaries.filter(s => s.currency === 'USDT').reduce((sum, sal) => sum + parseFloat(sal.totalSalary || '0'), 0),
  };
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">الرواتب</h1>
          <p className="text-muted-foreground">إدارة رواتب الموظفين</p>
        </div>
        {hasPermission('add_salary') && (
          <Button onClick={() => setShowAddDialog(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            إضافة راتب جديد
          </Button>
        )}
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">عدد الرواتب</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSalaries}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الرواتب (د.ل)</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.totalAmountLYD.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الرواتب ($)</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">${stats.totalAmountUSD.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الرواتب (USDT)</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.totalAmountUSDT.toFixed(2)} USDT</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Salaries Table */}
      <Card>
        <CardHeader>
          <CardTitle>جميع الرواتب</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم الموظف</TableHead>
                <TableHead>المنصب</TableHead>
                <TableHead>المبلغ (د.ل)</TableHead>
                <TableHead>المبلغ ($)</TableHead>
                <TableHead>المبلغ (USDT)</TableHead>
                <TableHead>حساب الخزينة</TableHead>
                <TableHead>ملاحظات</TableHead>
                <TableHead>التاريخ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salaries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    لا توجد رواتب
                  </TableCell>
                </TableRow>
              ) : (
                salaries.map((salary) => (
                  <TableRow key={salary.id}>
                    <TableCell>{salary.employeeName}</TableCell>

                    <TableCell className="text-red-600">
                      {parseFloat(salary.totalSalary).toFixed(2)} {salary.currency}
                    </TableCell>
                    <TableCell>
                      {treasuryAccounts.find((acc) => acc.id === salary.treasuryAccountId)?.accountName || '-'}
                    </TableCell>
                    <TableCell>{salary.notes || '-'}</TableCell>
                    <TableCell>{formatDate(salary.paymentDate!)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Add Salary Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>إضافة راتب جديد</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="employeeName">اسم الموظف *</Label>
              <Input
                id="employeeName"
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                placeholder="مثال: أحمد محمد"
              />
            </div>
            

            
            <div className="grid gap-2">
              <Label htmlFor="treasuryAccount">حساب الخزينة (كاش دينار) *</Label>
              <Select value={treasuryAccountId} onValueChange={setTreasuryAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر حساب الخزينة" />
                </SelectTrigger>
                <SelectContent>
                  {treasuryAccounts.filter(acc => acc.accountType === 'cash').map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.accountName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="amountLYD">المبلغ (د.ل)</Label>
                <Input
                  id="amountLYD"
                  type="number"
                  step="0.01"
                  value={amountLYD}
                  onChange={(e) => setAmountLYD(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="amountUSD">المبلغ ($)</Label>
                <Input
                  id="amountUSD"
                  type="number"
                  step="0.01"
                  value={amountUSD}
                  onChange={(e) => setAmountUSD(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="amountUSDT">المبلغ (USDT)</Label>
                <Input
                  id="amountUSDT"
                  type="number"
                  step="0.01"
                  value={amountUSDT}
                  onChange={(e) => setAmountUSDT(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="notes">ملاحظات</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ملاحظات إضافية..."
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSubmit} disabled={createSalary.isPending}>
              {createSalary.isPending ? 'جاري الحفظ...' : 'حفظ الراتب'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
