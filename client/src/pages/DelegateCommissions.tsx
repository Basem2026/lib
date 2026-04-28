import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, DollarSign, TrendingUp, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function DelegateCommissions() {
  const [selectedCommission, setSelectedCommission] = useState<any>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  const utils = trpc.useUtils();
  const { data: delegatesData = [], isLoading } = trpc.delegateCommissions.getByDelegate.useQuery();

  const updateStatusMutation = trpc.delegateCommissions.updateStatus.useMutation({
    onSuccess: () => {
      toast.success('تم تحديث حالة العمولة بنجاح');
      utils.delegateCommissions.getByDelegate.invalidate();
      setIsPaymentDialogOpen(false);
      setSelectedCommission(null);
    },
    onError: (error) => {
      toast.error(`فشل تحديث حالة العمولة: ${error.message}`);
    },
  });

  const handleMarkAsPaid = (commission: any) => {
    setSelectedCommission(commission);
    setIsPaymentDialogOpen(true);
  };

  const confirmPayment = () => {
    if (!selectedCommission) return;

    updateStatusMutation.mutate({
      id: selectedCommission.id,
      status: 'paid',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">عمولات المندوبين</h1>
        <p className="text-muted-foreground">
          عرض وإدارة عمولات المندوبين مع إحصائيات تفصيلية لكل مندوب
        </p>
      </div>

      {delegatesData.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">لا توجد عمولات مسجلة</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {delegatesData.map((delegateData: any) => (
            <Card key={delegateData.delegate.id} className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <Users className="w-6 h-6" />
                      {delegateData.delegate.fullName}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      📞 {delegateData.delegate.phone}
                      {delegateData.delegate.address && ` | 📍 ${delegateData.delegate.address}`}
                    </CardDescription>
                  </div>
                  <Badge variant={delegateData.delegate.status === 'active' ? 'default' : 'secondary'}>
                    {delegateData.delegate.status === 'active' ? 'نشط' : 'معطل'}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-6">
                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                          <Users className="w-6 h-6 text-blue-600 dark:text-blue-300" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">عدد الزبائن</p>
                          <p className="text-2xl font-bold">{delegateData.stats.totalCustomers}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                          <DollarSign className="w-6 h-6 text-green-600 dark:text-green-300" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">إجمالي العمولات</p>
                          <p className="text-2xl font-bold">{delegateData.stats.totalAmount} د.ل</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                          <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-300" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">معلقة</p>
                          <p className="text-2xl font-bold">{delegateData.stats.totalPending} د.ل</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                          <CheckCircle className="w-6 h-6 text-purple-600 dark:text-purple-300" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">مدفوعة</p>
                          <p className="text-2xl font-bold">{delegateData.stats.totalPaid} د.ل</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Commissions Table */}
                {delegateData.commissions.length > 0 ? (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>التاريخ</TableHead>
                          <TableHead>اسم الزبون</TableHead>
                          <TableHead>المصرف</TableHead>
                          <TableHead>المبلغ</TableHead>
                          <TableHead>الحالة</TableHead>
                          <TableHead>الإجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {delegateData.commissions.map((commission: any) => (
                          <TableRow key={commission.id}>
                            <TableCell>
                              {new Date(commission.createdAt).toLocaleDateString('ar-LY', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                              })}
                            </TableCell>
                            <TableCell className="font-medium">{commission.customerName}</TableCell>
                            <TableCell>{commission.bankName}</TableCell>
                            <TableCell className="font-bold text-green-600">
                              {commission.amount.toFixed(2)} د.ل
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={commission.status === 'paid' ? 'default' : 'secondary'}
                              >
                                {commission.status === 'paid' ? 'مدفوعة' : 'معلقة'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {commission.status === 'pending' && (
                                <Button
                                  size="sm"
                                  onClick={() => handleMarkAsPaid(commission)}
                                >
                                  تسجيل دفع
                                </Button>
                              )}
                              {commission.status === 'paid' && commission.paidAt && (
                                <span className="text-sm text-muted-foreground">
                                  دُفعت في{' '}
                                  {new Date(commission.paidAt).toLocaleDateString('ar-LY')}
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    لا توجد عمولات لهذا المندوب
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Payment Confirmation Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد دفع العمولة</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من تسجيل دفع هذه العمولة؟
            </DialogDescription>
          </DialogHeader>
          {selectedCommission && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الزبون:</span>
                  <span className="font-medium">{selectedCommission.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المبلغ:</span>
                  <span className="font-bold text-green-600">
                    {selectedCommission.amount.toFixed(2)} د.ل
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المصرف:</span>
                  <span className="font-medium">{selectedCommission.bankName}</span>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsPaymentDialogOpen(false)}
                >
                  إلغاء
                </Button>
                <Button
                  onClick={confirmPayment}
                  disabled={updateStatusMutation.isPending}
                >
                  {updateStatusMutation.isPending ? 'جاري التسجيل...' : 'تأكيد الدفع'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
