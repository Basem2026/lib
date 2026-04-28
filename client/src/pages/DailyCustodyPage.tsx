import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useEmployees } from '@/contexts/EmployeesContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Lock, Unlock, FileText, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/PageHeader';
import { BRAND_COLORS } from '@/lib/colors';

/**
 * صفحة إدارة العهدة اليومية
 * فتح/إغلاق العهدة + تقرير اليوم
 */
export default function DailyCustodyPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { sendPushToManagers } = useNotifications();
  const { employees: allEmployees } = useEmployees();
  const getManagerIds = () =>
    allEmployees
      .filter(e => (e.jobTitle === 'manager' || e.jobTitle === 'deputy_manager') && e.status === 'active')
      .map(e => e.id);
  
  // جلب البيانات
  const { data: custodies = [] } = trpc.custody.getAllCustodies.useQuery();
  const { data: employees = [] } = trpc.employees.getAll.useQuery();
  const todayDate = new Date().toISOString().split('T')[0];
  const { data: todayCustody } = trpc.custody.getOpenCustody.useQuery({
    employeeId: user?.id || '',
    custodyDate: todayDate,
  });
  
  // Mutations
  const openCustody = trpc.custody.openDailyCustody.useMutation({
    onSuccess: (_data, variables) => {
      toast.success('تم فتح العهدة اليومية بنجاح');
      utils.custody.getAllCustodies.invalidate();
      utils.custody.getOpenCustody.invalidate();
      setShowOpenDialog(false);
      resetOpenForm();
      // إرسال Web Push للمدير ونائبه
      const emp = employees.find((e: any) => e.id === variables.employeeId);
      sendPushToManagers(
        '🟢 فتح عهدة يومية',
        `الموظف: ${emp?.fullName || variables.employeeId} | كاش د.ل: ${variables.initialBalanceLYDCash || 0} | مصرفي: ${variables.initialBalanceLYDBank || 0} | دولار: ${variables.initialBalanceUSDCash || 0}`,
        getManagerIds(),
        '/daily-custody'
      );
    },
    onError: (error) => {
      toast.error(`خطأ: ${error.message}`);
    },
  });
  
  const closeCustody = trpc.custody.closeDailyCustody.useMutation({
    onSuccess: (data, variables) => {
      toast.success('تم إغلاق العهدة اليومية بنجاح');
      setClosureResult(data);
      utils.custody.getAllCustodies.invalidate();
      utils.custody.getOpenCustody.invalidate();
      setShowCloseDialog(false);
      setShowResultDialog(true);
      // إرسال Web Push للمدير ونائبه
      sendPushToManagers(
        '🔴 إغلاق عهدة يومية',
        `المدير: ${user?.fullName || 'admin'} | رقم العهدة: ${variables.custodyId}${variables.managerNotes ? ' | ملاحظة: ' + variables.managerNotes : ''}`,
        getManagerIds(),
        '/daily-custody'
      );
    },
    onError: (error) => {
      toast.error(`خطأ: ${error.message}`);
    },
  });
  
  // States - فتح العهدة
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [initialLYDCash, setInitialLYDCash] = useState('');
  const [initialLYDBank, setInitialLYDBank] = useState('');
  const [initialUSDCash, setInitialUSDCash] = useState('');
  const [initialUSDT, setInitialUSDT] = useState('');
  
  // States - إغلاق العهدة
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [selectedCustodyId, setSelectedCustodyId] = useState('');
  const [managerNotes, setManagerNotes] = useState('');
  
  // States - نتيجة الإغلاق
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [closureResult, setClosureResult] = useState<any>(null);
  
  const resetOpenForm = () => {
    setSelectedEmployeeId('');
    setInitialLYDCash('');
    setInitialLYDBank('');
    setInitialUSDCash('');
    setInitialUSDT('');
  };
  
  const handleOpenCustody = () => {
    if (!selectedEmployeeId) {
      toast.error('يرجى اختيار الموظف');
      return;
    }
    
    const employee = employees.find(e => e.id === selectedEmployeeId);
    if (!employee) return;
    
    openCustody.mutate({
      employeeId: employee.id,
      employeeName: employee.fullName,
      custodyDate: todayDate,
      initialBalanceLYDCash: parseFloat(initialLYDCash || '0'),
      initialBalanceLYDBank: parseFloat(initialLYDBank || '0'),
      initialBalanceUSDCash: parseFloat(initialUSDCash || '0'),
      initialBalanceUSDT: parseFloat(initialUSDT || '0'),
      createdBy: user?.id || '',
      createdByName: user?.fullName || '',
    });
  };
  
  const handleCloseCustody = (custodyId: string) => {
    setSelectedCustodyId(custodyId);
    setShowCloseDialog(true);
  };
  
  const confirmCloseCustody = () => {
    closeCustody.mutate({
      custodyId: selectedCustodyId,
      managerNotes,
      closedBy: user?.id || '',
      closedByName: user?.fullName || '',
    });
  };
  
  const generateDailyReport = () => {
    // TODO: إنشاء PDF تقرير اليوم
    toast.info('جاري إنشاء التقرير...');
  };
  
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F9FBFD' }}>
      <PageHeader title="إدارة العهدة اليومية" />
      
      <div className="container mx-auto p-2 md:p-6 space-y-6">
        {/* العهدة الحالية */}
        {todayCustody ? (
          <Card style={{ borderTop: `4px solid ${BRAND_COLORS.gold}` }}>
            <CardHeader style={{ backgroundColor: BRAND_COLORS.navy }}>
              <CardTitle className="text-white flex items-center gap-2">
                <Unlock className="w-5 h-5" />
                العهدة المفتوحة اليوم
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 md:p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">الموظف</p>
                  <p className="font-bold" style={{ color: BRAND_COLORS.navy }}>
                    {todayCustody.employeeName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">دينار كاش</p>
                  <p className="font-bold text-green-600">
                    {parseFloat(todayCustody.currentBalanceLYDCash || '0').toFixed(2)} د.ل
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">دينار مصرفي</p>
                  <p className="font-bold text-blue-600">
                    {parseFloat(todayCustody.currentBalanceLYDBank || '0').toFixed(2)} د.ل
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">دولار كاش</p>
                  <p className="font-bold text-purple-600">
                    ${parseFloat(todayCustody.currentBalanceUSDCash || '0').toFixed(2)}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => handleCloseCustody(todayCustody.id)}
                style={{ backgroundColor: BRAND_COLORS.gold, color: '#FFFFFF' }}
                className="w-full"
              >
                <Lock className="w-4 h-4 mr-2" />
                إغلاق العهدة اليومية
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card style={{ borderTop: `4px solid ${BRAND_COLORS.navy}` }}>
            <CardContent className="p-2 md:p-6 text-center">
              <p className="text-gray-600 mb-4">لا توجد عهدة مفتوحة اليوم</p>
              <Button
                onClick={() => setShowOpenDialog(true)}
                style={{ backgroundColor: BRAND_COLORS.navy, color: '#FFFFFF' }}
              >
                <Unlock className="w-4 h-4 mr-2" />
                فتح عهدة يومية جديدة
              </Button>
            </CardContent>
          </Card>
        )}
        
        {/* سجل العهد */}
        <Card>
          <CardHeader>
            <CardTitle style={{ color: BRAND_COLORS.navy }}>سجل العهد السابقة</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الموظف</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>إجمالي الأرباح</TableHead>
                  <TableHead>الأرصدة النهائية</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {custodies.map((custody) => (
                  <TableRow key={custody.id}>
                    <TableCell>{custody.custodyDate}</TableCell>
                    <TableCell>{custody.employeeName}</TableCell>
                    <TableCell>
                      {custody.status === 'open' ? (
                        <span className="text-green-600 font-bold">مفتوحة</span>
                      ) : (
                        <span className="text-gray-600">مقفولة</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {parseFloat(custody.totalDailyProfit || '0').toFixed(2)} د.ل
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>كاش: {parseFloat(custody.currentBalanceLYDCash || '0').toFixed(2)}</div>
                      <div>مصرفي: {parseFloat(custody.currentBalanceLYDBank || '0').toFixed(2)}</div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      
      {/* Dialog فتح العهدة */}
      <Dialog open={showOpenDialog} onOpenChange={setShowOpenDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle style={{ color: BRAND_COLORS.navy }}>فتح عهدة يومية جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label className="text-xs md:text-sm">الموظف *</Label>
              <select
                className="w-full p-2 border rounded"
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
              >
                <option value="">اختر الموظف</option>
                {employees.filter(e => e.status === 'active').map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} - {emp.jobTitle}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="p-4 rounded-lg" style={{ backgroundColor: '#F1F4F8' }}>
              <h4 className="font-bold mb-3" style={{ color: BRAND_COLORS.navy }}>
                الأرصدة الابتدائية (العهدة المسلمة)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div className="grid gap-2">
                  <Label className="text-xs md:text-sm">دينار كاش</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={initialLYDCash}
                    onChange={(e) => setInitialLYDCash(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs md:text-sm">دينار مصرفي</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={initialLYDBank}
                    onChange={(e) => setInitialLYDBank(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs md:text-sm">دولار كاش</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={initialUSDCash}
                    onChange={(e) => setInitialUSDCash(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs md:text-sm">USDT</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={initialUSDT}
                    onChange={(e) => setInitialUSDT(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={handleOpenCustody}
                style={{ backgroundColor: BRAND_COLORS.navy, color: '#FFFFFF' }}
                className="flex-1"
                disabled={openCustody.isPending}
              >
                {openCustody.isPending ? 'جاري الفتح...' : 'فتح العهدة'}
              </Button>
              <Button
                onClick={() => setShowOpenDialog(false)}
                variant="outline"
                className="flex-1"
              >
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Dialog إغلاق العهدة */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ color: BRAND_COLORS.navy }}>إغلاق العهدة اليومية</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 rounded-lg" style={{ backgroundColor: '#FFF3CD' }}>
              <p className="text-sm">
                ⚠️ تأكد من مطابقة الأرصدة الفعلية مع الأرصدة في النظام قبل الإغلاق
              </p>
            </div>
            
            <div className="grid gap-2">
              <Label className="text-xs md:text-sm">ملاحظات المدير (اختياري)</Label>
              <Textarea
                value={managerNotes}
                onChange={(e) => setManagerNotes(e.target.value)}
                placeholder="أي ملاحظات على العهدة..."
                rows={3}
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={confirmCloseCustody}
                style={{ backgroundColor: BRAND_COLORS.gold, color: '#FFFFFF' }}
                className="flex-1"
                disabled={closeCustody.isPending}
              >
                {closeCustody.isPending ? 'جاري الإغلاق...' : 'تأكيد الإغلاق'}
              </Button>
              <Button
                onClick={() => setShowCloseDialog(false)}
                variant="outline"
                className="flex-1"
              >
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Dialog نتيجة الإغلاق */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: BRAND_COLORS.navy }}>
              <CheckCircle className="w-6 h-6 text-green-600" />
              تم إغلاق العهدة بنجاح
            </DialogTitle>
          </DialogHeader>
          {closureResult && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg" style={{ backgroundColor: '#E8F5E9' }}>
                <h4 className="font-bold mb-3" style={{ color: BRAND_COLORS.navy }}>
                  الأرصدة النهائية
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <p className="text-sm text-gray-600">دينار كاش</p>
                    <p className="text-xl font-bold text-green-600">
                      {closureResult.finalBalances.lydCash.toFixed(2)} د.ل
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">دينار مصرفي</p>
                    <p className="text-xl font-bold text-blue-600">
                      {closureResult.finalBalances.lydBank.toFixed(2)} د.ل
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">دولار كاش</p>
                    <p className="text-xl font-bold text-purple-600">
                      ${closureResult.finalBalances.usdCash.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">USDT</p>
                    <p className="text-xl font-bold text-orange-600">
                      {closureResult.finalBalances.usdt.toFixed(2)} USDT
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 rounded-lg" style={{ backgroundColor: '#FFF3CD' }}>
                <h4 className="font-bold mb-2" style={{ color: BRAND_COLORS.navy }}>
                  إجمالي الأرباح اليومية
                </h4>
                <p className="text-2xl font-bold text-green-600">
                  {closureResult.totalProfit.toFixed(2)} د.ل
                </p>
              </div>
              
              <Button
                onClick={generateDailyReport}
                style={{ backgroundColor: BRAND_COLORS.navy, color: '#FFFFFF' }}
                className="w-full"
              >
                <FileText className="w-4 h-4 mr-2" />
                طباعة تقرير اليوم (PDF)
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
