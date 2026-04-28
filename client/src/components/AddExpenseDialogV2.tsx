import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface AddExpenseDialogV2Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function AddExpenseDialogV2({ open, onOpenChange, onSuccess }: AddExpenseDialogV2Props) {
  const [form, setForm] = useState({
    title: "",
    amount: "",
    currency: "LYD",
    category: "",
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
          <DialogTitle>إضافة مصروف جديد</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>العنوان</Label>
            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
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
              </select>
            </div>
          </div>
          <div>
            <Label>التصنيف</Label>
            <Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
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
