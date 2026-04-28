import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useToast } from '../hooks/use-toast';
import { trpc } from '../utils/trpc';
import { Plus } from 'lucide-react';

export default function AddTransferDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const createMutation = trpc.transfers.create.useMutation({
    onSuccess: () => {
      toast({ title: 'تم إنشاء الحوالة بنجاح' });
      setOpen(false);
      onSuccess();
    },
    onError: (err) => toast({ title: 'خطأ', description: err.message, variant: 'destructive' }),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      senderName: formData.get('senderName') as string,
      senderPhone: formData.get('senderPhone') as string,
      receiverName: formData.get('receiverName') as string,
      receiverPhone: formData.get('receiverPhone') as string,
      sendAmount: parseFloat(formData.get('sendAmount') as string),
      sendCurrency: formData.get('sendCurrency') as any,
      feeType: formData.get('feeType') as any,
      feeValue: parseFloat(formData.get('feeValue') as string),
      paymentMethod: formData.get('paymentMethod') as any,
      payoutMethod: formData.get('payoutMethod') as any,
      transferType: formData.get('transferType') as any,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="ml-2 h-4 w-4" /> حوالة جديدة</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>إنشاء حوالة مالية جديدة</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>اسم المرسل</Label><Input name="senderName" required /></div>
            <div><Label>رقم هاتف المرسل</Label><Input name="senderPhone" required /></div>
            <div><Label>اسم المستلم</Label><Input name="receiverName" required /></div>
            <div><Label>رقم هاتف المستلم</Label><Input name="receiverPhone" required /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><Label>قيمة الحوالة</Label><Input name="sendAmount" type="number" step="0.01" required /></div>
            <div><Label>العملة</Label><Select name="sendCurrency" defaultValue="LYD">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="LYD">دينار</SelectItem><SelectItem value="USD">دولار</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>نوع العمولة</Label><Select name="feeType" defaultValue="fixed">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="fixed">ثابت</SelectItem><SelectItem value="percentage">نسبة</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>قيمة العمولة</Label><Input name="feeValue" type="number" step="0.01" defaultValue="10" required /></div>
            <div><Label>طريقة الدفع</Label><Select name="paymentMethod" defaultValue="cash">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="cash">كاش</SelectItem><SelectItem value="bank">بنك</SelectItem><SelectItem value="usdt">USDT</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>طريقة الصرف</Label><Select name="payoutMethod" defaultValue="cash">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="cash">كاش</SelectItem><SelectItem value="bank">بنك</SelectItem><SelectItem value="usdt">USDT</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>نوع الحوالة</Label><Select name="transferType" defaultValue="internal">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">داخلية (بين الفروع)</SelectItem>
                  <SelectItem value="partner">عبر شريك</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" disabled={createMutation.isLoading}>إنشاء الحوالة</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}