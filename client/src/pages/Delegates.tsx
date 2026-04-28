import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

interface DelegateFormData {
  fullName: string;
  phone: string;
  address: string;
  notes: string;
}

export default function Delegates() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedDelegate, setSelectedDelegate] = useState<any>(null);
  const [formData, setFormData] = useState<DelegateFormData>({
    fullName: '',
    phone: '',
    address: '',
    notes: '',
  });

  const utils = trpc.useUtils();
  const { data: delegates = [], isLoading } = trpc.delegates.list.useQuery();
  const createMutation = trpc.delegates.create.useMutation({
    onSuccess: () => {
      utils.delegates.list.invalidate();
      setIsAddDialogOpen(false);
      resetForm();
      toast.success('تم إضافة المندوب بنجاح');
    },
    onError: (error) => {
      toast.error('فشل في إضافة المندوب: ' + error.message);
    },
  });

  const updateMutation = trpc.delegates.update.useMutation({
    onSuccess: () => {
      utils.delegates.list.invalidate();
      setIsEditDialogOpen(false);
      resetForm();
      toast.success('تم تعديل المندوب بنجاح');
    },
    onError: (error) => {
      toast.error('فشل في تعديل المندوب: ' + error.message);
    },
  });

  const deleteMutation = trpc.delegates.delete.useMutation({
    onSuccess: () => {
      utils.delegates.list.invalidate();
      toast.success('تم حذف المندوب بنجاح');
    },
    onError: (error) => {
      toast.error('فشل في حذف المندوب: ' + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      fullName: '',
      phone: '',
      address: '',
      notes: '',
    });
    setSelectedDelegate(null);
  };

  const handleAdd = () => {
    if (!formData.fullName || !formData.phone) {
      toast.error('الرجاء ملء جميع الحقول المطلوبة');
      return;
    }

    createMutation.mutate({
      fullName: formData.fullName,
      phone: formData.phone,
      address: formData.address,
      notes: formData.notes,
      createdBy: 'admin', // TODO: استخدام معرف المستخدم الحالي
    });
  };

  const handleEdit = () => {
    if (!selectedDelegate || !formData.fullName || !formData.phone) {
      toast.error('الرجاء ملء جميع الحقول المطلوبة');
      return;
    }

    updateMutation.mutate({
      id: selectedDelegate.id,
      fullName: formData.fullName,
      phone: formData.phone,
      address: formData.address,
      notes: formData.notes,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا المندوب؟')) {
      deleteMutation.mutate({ id });
    }
  };

  const openEditDialog = (delegate: any) => {
    setSelectedDelegate(delegate);
    setFormData({
      fullName: delegate.fullName,
      phone: delegate.phone,
      address: delegate.address || '',
      notes: delegate.notes || '',
    });
    setIsEditDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Users className="w-6 h-6" />
                إدارة المندوبين
              </CardTitle>
              <CardDescription>
                إضافة وإدارة المندوبين مع معلومات الاتصال والعنوان
              </CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="w-4 h-4 mr-2" />
                  إضافة مندوب
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>إضافة مندوب جديد</DialogTitle>
                  <DialogDescription>
                    أدخل بيانات المندوب الجديد
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="fullName">الاسم الكامل *</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) =>
                        setFormData({ ...formData, fullName: e.target.value })
                      }
                      placeholder="أدخل الاسم الكامل"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">رقم الهاتف *</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="أدخل رقم الهاتف"
                    />
                  </div>
                  <div>
                    <Label htmlFor="address">العنوان</Label>
                    <Input
                      id="address"
                      type="text"
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address: e.target.value,
                        })
                      }
                      placeholder="أدخل العنوان"
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes">ملاحظات</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      placeholder="ملاحظات إضافية (اختياري)"
                    />
                  </div>
                  <Button
                    onClick={handleAdd}
                    disabled={createMutation.isPending}
                    className="w-full"
                  >
                    {createMutation.isPending ? 'جاري الإضافة...' : 'إضافة'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {delegates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>لا يوجد مندوبين حالياً</p>
              <p className="text-sm mt-2">اضغط على "إضافة مندوب" لإضافة مندوب جديد</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>رقم الهاتف</TableHead>
                  <TableHead>العنوان</TableHead>
                  <TableHead>عدد الزبائن</TableHead>
                  <TableHead>إجمالي العمولات</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {delegates.map((delegate: any) => (
                  <TableRow key={delegate.id}>
                    <TableCell className="font-medium">{delegate.fullName}</TableCell>
                    <TableCell>{delegate.phone}</TableCell>
                    <TableCell>{delegate.address || '-'}</TableCell>
                    <TableCell>{delegate.totalCustomers}</TableCell>
                    <TableCell>{delegate.totalCommissions} د.ل</TableCell>
                    <TableCell>
                      <Badge variant={delegate.status === 'active' ? 'default' : 'secondary'}>
                        {delegate.status === 'active' ? 'نشط' : 'معطل'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(delegate)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(delegate.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل المندوب</DialogTitle>
            <DialogDescription>
              تعديل بيانات المندوب
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-fullName">الاسم الكامل *</Label>
              <Input
                id="edit-fullName"
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
                placeholder="أدخل الاسم الكامل"
              />
            </div>
            <div>
              <Label htmlFor="edit-phone">رقم الهاتف *</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="أدخل رقم الهاتف"
              />
            </div>
            <div>
              <Label htmlFor="edit-address">العنوان</Label>
              <Input
                id="edit-address"
                type="text"
                value={formData.address}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    address: e.target.value,
                  })
                }
                placeholder="أدخل العنوان"
              />
            </div>
            <div>
              <Label htmlFor="edit-notes">ملاحظات</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="ملاحظات إضافية (اختياري)"
              />
            </div>
            <Button
              onClick={handleEdit}
              disabled={updateMutation.isPending}
              className="w-full"
            >
              {updateMutation.isPending ? 'جاري التعديل...' : 'حفظ التعديلات'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
