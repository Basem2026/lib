import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trpc } from '../utils/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { useToast } from '../hooks/use-toast';
import { Plus, Eye, CheckCircle, XCircle, Send as SendIcon, Printer, Download } from 'lucide-react';
import { formatDate, formatCurrency } from '../lib/utils';
import AddTransferDialog from '../components/AddTransferDialog';
import TransferTimeline from '../components/TransferTimeline';
import { useGranularPermissions } from '../hooks/useGranularPermissions';

export default function TransfersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { canViewModule, canPerformAction } = useGranularPermissions();
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // التحقق من صلاحية الوصول للقسم
  if (!canViewModule('transfers')) {
    return <div className="p-8 text-center">ليس لديك صلاحية لعرض الحوالات المالية</div>;
  }

  const { data, refetch, isLoading } = trpc.transfers.list.useQuery({ 
    limit: 100, 
    status: statusFilter || undefined 
  });
  
  const updateStatus = trpc.transfers.updateStatus.useMutation({
    onSuccess: () => {
      refetch();
      toast({ title: 'تم تحديث حالة الحوالة' });
    },
  });

  const handleStatusChange = (id: string, newStatus: string, note?: string) => {
    if (window.confirm(`هل أنت متأكد من تغيير الحالة إلى ${newStatus}؟`)) {
      updateStatus.mutate({ transferId: id, newStatus: newStatus as any, note });
    }
  };

  const filteredData = data?.items.filter(t => 
    t.transferNumber.includes(search) || 
    t.senderName.includes(search) || 
    t.receiverName.includes(search)
  ) || [];

  if (isLoading) return <div className="p-8">جاري التحميل...</div>;

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">الحوالات المالية</h1>
        {canPerformAction('transfers', 'transfers_table', 'add') && (
          <AddTransferDialog onSuccess={() => refetch()} />
        )}
      </div>

      {/* فلاتر */}
      <Card>
        <CardContent className="pt-4 flex flex-wrap gap-4">
          <Input 
            placeholder="بحث برقم الحوالة أو الاسم" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="w-64" 
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="جميع الحالات" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">الكل</SelectItem>
              <SelectItem value="created">تم الإنشاء</SelectItem>
              <SelectItem value="pending_approval">انتظار موافقة</SelectItem>
              <SelectItem value="ready_for_payout">جاهزة للصرف</SelectItem>
              <SelectItem value="paid_full">تم الصرف</SelectItem>
              <SelectItem value="cancelled">ملغاة</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* جدول الحوالات */}
      <Card>
        <CardHeader><CardTitle>قائمة الحوالات</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الحوالة</TableHead>
                  <TableHead>المرسل</TableHead>
                  <TableHead>المستلم</TableHead>
                  <TableHead>القيمة</TableHead>
                  <TableHead>العمولة</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((transfer) => (
                  <TableRow key={transfer.id}>
                    <TableCell className="font-mono">{transfer.transferNumber}</TableCell>
                    <TableCell>{transfer.senderName}</TableCell>
                    <TableCell>{transfer.receiverName}</TableCell>
                    <TableCell>{transfer.sendAmount} {transfer.sendCurrency}</TableCell>
                    <TableCell>{transfer.totalFee} {transfer.sendCurrency}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${
                        transfer.status === 'paid_full' ? 'bg-green-100 text-green-800' :
                        transfer.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        transfer.status === 'pending_approval' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {transfer.status}
                      </span>
                    </TableCell>
                    <TableCell>{formatDate(transfer.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setSelectedTransferId(transfer.id)}>
                          <Eye />
                        </Button>
                        {canPerformAction('transfers', 'transfers_table', 'change_status') && (
                          <>
                            {transfer.status === 'pending_approval' && (
                              <Button variant="ghost" size="icon" onClick={() => handleStatusChange(transfer.id, 'approved')}>
                                <CheckCircle className="text-green-600" />
                              </Button>
                            )}
                            {transfer.status === 'ready_for_payout' && (
                              <Button variant="ghost" size="icon" onClick={() => handleStatusChange(transfer.id, 'paid_full')}>
                                <SendIcon className="text-blue-600" />
                              </Button>
                            )}
                            {transfer.status !== 'cancelled' && transfer.status !== 'paid_full' && (
                              <Button variant="ghost" size="icon" onClick={() => handleStatusChange(transfer.id, 'cancelled', 'إلغاء من قبل المستخدم')}>
                                <XCircle className="text-red-600" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* نافذة التفاصيل */}
      {selectedTransferId && (
        <Dialog open={!!selectedTransferId} onOpenChange={() => setSelectedTransferId(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>تفاصيل الحوالة</DialogTitle></DialogHeader>
            <TransferDetails transferId={selectedTransferId} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}