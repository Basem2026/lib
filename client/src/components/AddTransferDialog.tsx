import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface AddTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function AddTransferDialog({ open, onOpenChange, onSuccess }: AddTransferDialogProps) {
  const [form, setForm] = useState({
    senderName: "",
    senderPhone: "",
    receiverName: "",
    receiverPhone: "",
    amount: "",
    currency: "LYD",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>إضافة حوالة جديدة</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>اسم المرسل</Label>
              <Input value={form.senderName} onChange={e => setForm({ ...form, senderName: e.target.value })} required />
            </div>
            <div>
              <Label>هاتف المرسل</Label>
              <Input value={form.senderPhone} onChange={e => setForm({ ...form, senderPhone: e.target.value })} required />
            </div>
            <div>
              <Label>اسم المستلم</Label>
              <Input value={form.receiverName} onChange={e => setForm({ ...form, receiverName: e.target.value })} required />
            </div>
            <div>
              <Label>هاتف المستلم</Label>
              <Input value={form.receiverPhone} onChange={e => setForm({ ...form, receiverPhone: e.target.value })} required />
            </div>
            <div>
              <Label>المبلغ</Label>
              <Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
            </div>
            <div>
              <Label>العملة</Label>
              <select className="w-full border rounded p-2" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
                <option value="LYD">دينار ليبي</option>
                <option value="USD">دولار</option>
                <option value="EUR">يورو</option>
                <option value="USDT">USDT</option>
              </select>
            </div>
          </div>
          <div>
            <Label>ملاحظات</Label>
            <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
            <Button type="submit">إضافة</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
