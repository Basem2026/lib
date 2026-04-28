import { useServices } from "@/contexts/ServicesContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, CreditCard, TrendingUp, Zap, Edit, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { useDollarRates } from "@/contexts/DollarRatesContext";
import { useBankCards } from "@/contexts/BankCardsContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { toast } from "sonner";
import { useNotifications } from "@/contexts/NotificationsContext";
import { useEmployees } from "@/contexts/EmployeesContext";

/**
 * صفحة إدارة الخدمات - للمدير فقط
 * تتيح للمدير تعديل بيانات الخدمات الأربع
 * التعديلات تظهر مباشرة في الصفحة الرئيسية
 */

export default function ServicesManagement() {
  const { services, updateDollarWithdrawal, updatePersonalCards, updateTransfers, updateLocalWithdrawal } = useServices();
  const { rates, addRate, updateRate, deleteRate } = useDollarRates();
  const { cards, addCard, updateCard, deleteCard, toggleVisibility } = useBankCards();
  const { sendPushToManagers } = useNotifications();
  const { employees } = useEmployees();

  // الحصول على IDs المدير ونائب المدير
  const getManagerIds = () =>
    employees
      .filter(e => (e.jobTitle === 'manager' || e.jobTitle === 'deputy_manager') && e.status === 'active')
      .map(e => e.id);
  
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  // نماذج أسعار الدولار
  const [showDollarDialog, setShowDollarDialog] = useState(false);
  const [editingDollarId, setEditingDollarId] = useState<string | null>(null);
  const [dollarRateForm, setDollarRateForm] = useState({
    bankName: '',
    dollarValue: 0,
    cashRate: 0,
    checkRate: 0,
  });
  
  // نماذج أسعار البطاقات
  const [showCardDialog, setShowCardDialog] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [cardPriceForm, setCardPriceForm] = useState({
    bankName: '',
    price: 0,
    isVisible: true,
  });
  
  // نماذج التعديل
  const [dollarForm, setDollarForm] = useState({ withdrawalRate: services.dollarWithdrawal.withdrawalRate });
  const [personalForm, setPersonalForm] = useState({ 
    purchasePrice: services.personalCards.purchasePrice,
    bankName: services.personalCards.bankName 
  });
  const [transfersForm, setTransfersForm] = useState({ types: services.transfers.types });
  const [localForm, setLocalForm] = useState({ withdrawalRate: services.localWithdrawal.withdrawalRate });

  const handleEdit = (serviceId: string) => {
    setSelectedService(serviceId);
    // تحديث النماذج بالبيانات الحالية
    if (serviceId === 'dollar_withdrawal') {
      setDollarForm({ withdrawalRate: services.dollarWithdrawal.withdrawalRate });
    } else if (serviceId === 'personal_cards') {
      setPersonalForm({ 
        purchasePrice: services.personalCards.purchasePrice,
        bankName: services.personalCards.bankName 
      });
    } else if (serviceId === 'transfers') {
      setTransfersForm({ types: [...services.transfers.types] });
    } else if (serviceId === 'local_withdrawal') {
      setLocalForm({ withdrawalRate: services.localWithdrawal.withdrawalRate });
    }
    setShowEditDialog(true);
  };

  const handleSave = () => {
    if (selectedService === 'dollar_withdrawal') {
      updateDollarWithdrawal({ withdrawalRate: dollarForm.withdrawalRate });
      toast.success('تم تحديث نسبة سحب الدولار بنجاح');
    } else if (selectedService === 'personal_cards') {
      updatePersonalCards({ 
        purchasePrice: personalForm.purchasePrice,
        bankName: personalForm.bankName 
      });
      toast.success('تم تحديث بيانات بطاقات الأغراض الشخصية بنجاح');
    } else if (selectedService === 'transfers') {
      updateTransfers({ types: transfersForm.types });
      toast.success('تم تحديث بيانات التحويلات بنجاح');
    } else if (selectedService === 'local_withdrawal') {
      updateLocalWithdrawal({ withdrawalRate: localForm.withdrawalRate });
      toast.success('تم تحديث نسبة السحب المحلي بنجاح');
    }
    setShowEditDialog(false);
    setSelectedService(null);
  };

  const handleAddTransferType = () => {
    setTransfersForm(prev => ({
      types: [...prev.types, { name: '', price: 0, rate: 0 }]
    }));
  };

  const handleRemoveTransferType = (index: number) => {
    setTransfersForm(prev => ({
      types: prev.types.filter((_, i) => i !== index)
    }));
  };

  const handleUpdateTransferType = (index: number, field: 'name' | 'price' | 'rate', value: string | number) => {
    setTransfersForm(prev => ({
      types: prev.types.map((type, i) => 
        i === index ? { ...type, [field]: value } : type
      )
    }));
  };

  // وظائف أسعار الدولار
  const handleAddDollarRate = () => {
    setEditingDollarId(null);
    setDollarRateForm({ bankName: '', dollarValue: 0, cashRate: 0, checkRate: 0 });
    setShowDollarDialog(true);
  };

  const handleEditDollarRate = (rate: any) => {
    setEditingDollarId(rate.id);
    setDollarRateForm({
      bankName: rate.bankName,
      dollarValue: rate.dollarValue,
      cashRate: rate.cashRate,
      checkRate: rate.checkRate,
    });
    setShowDollarDialog(true);
  };

  const handleSaveDollarRate = () => {
    if (!dollarRateForm.bankName || dollarRateForm.dollarValue <= 0) {
      toast.error('يرجى ملء جميع الحقول بشكل صحيح');
      return;
    }
    if (editingDollarId) {
      updateRate(editingDollarId, dollarRateForm);
      toast.success('تم تحديث سعر الدولار بنجاح');
      // إرسال Push للمدير ونائب المدير
      sendPushToManagers(
        'تحديث أسعار الدولار',
        `تم تحديث سعر دولار ${dollarRateForm.bankName}: ${dollarRateForm.dollarValue} د.ل (كاش: ${dollarRateForm.cashRate} | شيك: ${dollarRateForm.checkRate})`,
        getManagerIds(),
        '/services-management'
      );
    } else {
      addRate(dollarRateForm);
      toast.success('تم إضافة سعر الدولار بنجاح');
      // إرسال Push للمدير ونائب المدير
      sendPushToManagers(
        'إضافة سعر دولار جديد',
        `تم إضافة سعر دولار ${dollarRateForm.bankName}: ${dollarRateForm.dollarValue} د.ل (كاش: ${dollarRateForm.cashRate} | شيك: ${dollarRateForm.checkRate})`,
        getManagerIds(),
        '/services-management'
      );
    }
    setShowDollarDialog(false);
  };

  const handleDeleteDollarRate = (id: string) => {
    deleteRate(id);
    toast.success('تم حذف سعر الدولار بنجاح');
  };

  // وظائف أسعار البطاقات
  const handleAddCardPrice = () => {
    setEditingCardId(null);
    setCardPriceForm({ bankName: '', price: 0, isVisible: true });
    setShowCardDialog(true);
  };

  const handleEditCardPrice = (card: any) => {
    setEditingCardId(card.id);
    setCardPriceForm({
      bankName: card.bankName,
      price: card.price,
      isVisible: card.isVisible,
    });
    setShowCardDialog(true);
  };

  const handleSaveCardPrice = () => {
    if (!cardPriceForm.bankName || cardPriceForm.price <= 0) {
      toast.error('يرجى ملء جميع الحقول بشكل صحيح');
      return;
    }
    if (editingCardId) {
      updateCard(editingCardId, cardPriceForm);
      toast.success('تم تحديث سعر البطاقة بنجاح');
    } else {
      addCard(cardPriceForm);
      toast.success('تم إضافة سعر البطاقة بنجاح');
    }
    setShowCardDialog(false);
  };

  const handleDeleteCardPrice = (id: string) => {
    deleteCard(id);
    toast.success('تم حذف سعر البطاقة بنجاح');
  };

  const servicesData = [
    {
      id: "dollar_withdrawal",
      title: "سحب بطاقات الدولار",
      description: "إدارة نسبة سحب الدولار",
      currentValue: `${services.dollarWithdrawal.withdrawalRate}%`,
      icon: <DollarSign className="w-6 h-6" />,
    },
    {
      id: "personal_cards",
      title: "بطاقات الأغراض الشخصية",
      description: "إدارة سعر الشراء والمصرف",
      currentValue: services.personalCards.purchasePrice > 0 
        ? `${services.personalCards.purchasePrice} د.ل - ${services.personalCards.bankName}`
        : `حسب السعر الحالي - ${services.personalCards.bankName}`,
      icon: <CreditCard className="w-6 h-6" />,
    },
    {
      id: "local_withdrawal",
      title: "سحب البطاقات المحلية",
      description: "إدارة نسبة السحب المحلي",
      currentValue: `${services.localWithdrawal.withdrawalRate}%`,
      icon: <TrendingUp className="w-6 h-6" />,
    },
    {
      id: "transfers",
      title: "التحويلات والخدمات الأخرى",
      description: "إدارة أنواع التحويلات والأسعار",
      currentValue: `${services.transfers.types.length} نوع خدمة`,
      icon: <Zap className="w-6 h-6" />,
    },
  ];

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ color: '#1E2E3D' }}>إدارة الخدمات</h1>
        <p className="text-sm mt-2" style={{ color: '#6E7C87' }}>
          تعديل بيانات الخدمات والأسعار المعروضة في الصفحة الرئيسية
        </p>
      </div>

      {/* جدول أسعار الدولار */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>أسعار الدولار</CardTitle>
              <CardDescription>إدارة أسعار الدولار للمصارف المختلفة</CardDescription>
            </div>
            <Button onClick={handleAddDollarRate} style={{ backgroundColor: '#C9A34D', color: '#FFFFFF' }}>
              <Plus className="w-4 h-4 mr-2" />
              إضافة سعر
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {rates.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">لم يتم إضافة أي أسعار بعد</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المصرف</TableHead>
                  <TableHead>قيمة الدولار</TableHead>
                  <TableHead>السعر كاش</TableHead>
                  <TableHead>السعر بالشيك</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates.map((rate) => (
                  <TableRow key={rate.id}>
                    <TableCell className="font-medium">{rate.bankName}</TableCell>
                    <TableCell>{rate.dollarValue.toFixed(2)} د.ل</TableCell>
                    <TableCell>{rate.cashRate.toFixed(2)} د.ل</TableCell>
                    <TableCell>{rate.checkRate.toFixed(2)} د.ل</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEditDollarRate(rate)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteDollarRate(rate.id)}>
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

      {/* جدول أسعار البطاقات */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>أسعار البطاقات</CardTitle>
              <CardDescription>إدارة أسعار البطاقات للمصارف المختلفة</CardDescription>
            </div>
            <Button onClick={handleAddCardPrice} style={{ backgroundColor: '#C9A34D', color: '#FFFFFF' }}>
              <Plus className="w-4 h-4 mr-2" />
              إضافة سعر
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {cards.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">لم يتم إضافة أي أسعار بعد</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المصرف</TableHead>
                  <TableHead>السعر</TableHead>
                  <TableHead>العرض</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cards.map((card) => (
                  <TableRow key={card.id}>
                    <TableCell className="font-medium">{card.bankName}</TableCell>
                    <TableCell>{card.price.toFixed(2)} د.ل</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleVisibility(card.id)}
                      >
                        {card.isVisible ? <Eye className="w-4 h-4 text-green-600" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEditCardPrice(card)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteCardPrice(card.id)}>
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


      <div className="grid md:grid-cols-2 gap-6">
        {servicesData.map((service) => (
          <Card 
            key={service.id}
            className="border-t-4"
            style={{ borderTopColor: '#C9A34D' }}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-xl">{service.title}</CardTitle>
                  <CardDescription className="mt-2">
                    {service.description}
                  </CardDescription>
                </div>
                <div className="ml-4" style={{ color: '#C9A34D' }}>
                  {service.icon}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <p className="text-sm font-semibold mb-1" style={{ color: '#6E7C87' }}>القيمة الحالية:</p>
                <p className="text-lg font-bold" style={{ color: '#1E2E3D' }}>
                  {service.currentValue}
                </p>
              </div>
              <Button 
                className="w-full gap-2"
                style={{ backgroundColor: '#C9A34D', color: '#FFFFFF' }}
                onClick={() => handleEdit(service.id)}
              >
                <Edit className="w-4 h-4" />
                تعديل البيانات
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* نافذة التعديل */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedService === 'dollar_withdrawal' && (
            <>
              <DialogHeader>
                <DialogTitle>تعديل بيانات سحب الدولار</DialogTitle>
                <DialogDescription>
                  تعديل نسبة سحب بطاقات الدولار
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="withdrawalRate">نسبة السحب (%)</Label>
                  <Input
                    id="withdrawalRate"
                    type="number"
                    step="0.1"
                    value={dollarForm.withdrawalRate}
                    onChange={(e) => setDollarForm({ withdrawalRate: parseFloat(e.target.value) })}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    💡 النسبة الحالية: {services.dollarWithdrawal.withdrawalRate}%
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  إلغاء
                </Button>
                <Button style={{ backgroundColor: '#C9A34D', color: '#FFFFFF' }} onClick={handleSave}>
                  حفظ التعديلات
                </Button>
              </DialogFooter>
            </>
          )}

          {selectedService === 'personal_cards' && (
            <>
              <DialogHeader>
                <DialogTitle>تعديل بيانات بطاقات الأغراض الشخصية</DialogTitle>
                <DialogDescription>
                  تعديل سعر الشراء واسم المصرف
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="purchasePrice">سعر الشراء (د.ل)</Label>
                  <Input
                    id="purchasePrice"
                    type="number"
                    step="0.01"
                    value={personalForm.purchasePrice}
                    onChange={(e) => setPersonalForm(prev => ({ ...prev, purchasePrice: parseFloat(e.target.value) }))}
                    placeholder="اترك 0 لعرض 'حسب السعر الحالي'"
                  />
                </div>
                <div>
                  <Label htmlFor="bankName">اسم المصرف</Label>
                  <Input
                    id="bankName"
                    type="text"
                    value={personalForm.bankName}
                    onChange={(e) => setPersonalForm(prev => ({ ...prev, bankName: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  إلغاء
                </Button>
                <Button style={{ backgroundColor: '#C9A34D', color: '#FFFFFF' }} onClick={handleSave}>
                  حفظ التعديلات
                </Button>
              </DialogFooter>
            </>
          )}

          {selectedService === 'local_withdrawal' && (
            <>
              <DialogHeader>
                <DialogTitle>تعديل بيانات السحب المحلي</DialogTitle>
                <DialogDescription>
                  تعديل نسبة سحب البطاقات المحلية
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="localRate">نسبة السحب (%)</Label>
                  <Input
                    id="localRate"
                    type="number"
                    step="0.1"
                    value={localForm.withdrawalRate}
                    onChange={(e) => setLocalForm({ withdrawalRate: parseFloat(e.target.value) })}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    💡 النسبة الحالية: {services.localWithdrawal.withdrawalRate}%
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  إلغاء
                </Button>
                <Button style={{ backgroundColor: '#C9A34D', color: '#FFFFFF' }} onClick={handleSave}>
                  حفظ التعديلات
                </Button>
              </DialogFooter>
            </>
          )}

          {selectedService === 'transfers' && (
            <>
              <DialogHeader>
                <DialogTitle>تعديل بيانات التحويلات</DialogTitle>
                <DialogDescription>
                  إضافة أو تعديل أو حذف أنواع التحويلات
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {transfersForm.types.map((type, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">نوع التحويل {index + 1}</h4>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveTransferType(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div>
                      <Label>اسم الخدمة</Label>
                      <Input
                        value={type.name}
                        onChange={(e) => handleUpdateTransferType(index, 'name', e.target.value)}
                        placeholder="مثال: تحويل بنكي"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>السعر (د.ل)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={type.price}
                          onChange={(e) => handleUpdateTransferType(index, 'price', parseFloat(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label>النسبة (%)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={type.rate}
                          onChange={(e) => handleUpdateTransferType(index, 'rate', parseFloat(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleAddTransferType}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  إضافة نوع تحويل جديد
                </Button>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  إلغاء
                </Button>
                <Button style={{ backgroundColor: '#C9A34D', color: '#FFFFFF' }} onClick={handleSave}>
                  حفظ التعديلات
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog أسعار الدولار */}
      <Dialog open={showDollarDialog} onOpenChange={setShowDollarDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDollarId ? 'تعديل سعر الدولار' : 'إضافة سعر دولار جديد'}</DialogTitle>
            <DialogDescription>
              إدخال بيانات سعر الدولار للمصرف
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="bankName">اسم المصرف</Label>
              <Input
                id="bankName"
                value={dollarRateForm.bankName}
                onChange={(e) => setDollarRateForm(prev => ({ ...prev, bankName: e.target.value }))}
                placeholder="مثال: مصرف الأمان"
              />
            </div>
            <div>
              <Label htmlFor="dollarValue">قيمة الدولار (د.ل)</Label>
              <Input
                id="dollarValue"
                type="number"
                step="0.01"
                value={dollarRateForm.dollarValue}
                onChange={(e) => setDollarRateForm(prev => ({ ...prev, dollarValue: parseFloat(e.target.value) }))}
              />
            </div>
            <div>
              <Label htmlFor="cashRate">السعر كاش (د.ل)</Label>
              <Input
                id="cashRate"
                type="number"
                step="0.01"
                value={dollarRateForm.cashRate}
                onChange={(e) => setDollarRateForm(prev => ({ ...prev, cashRate: parseFloat(e.target.value) }))}
              />
            </div>
            <div>
              <Label htmlFor="checkRate">السعر بالشيك (د.ل)</Label>
              <Input
                id="checkRate"
                type="number"
                step="0.01"
                value={dollarRateForm.checkRate}
                onChange={(e) => setDollarRateForm(prev => ({ ...prev, checkRate: parseFloat(e.target.value) }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDollarDialog(false)}>
              إلغاء
            </Button>
            <Button style={{ backgroundColor: '#C9A34D', color: '#FFFFFF' }} onClick={handleSaveDollarRate}>
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog أسعار البطاقات */}
      <Dialog open={showCardDialog} onOpenChange={setShowCardDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCardId ? 'تعديل سعر البطاقة' : 'إضافة سعر بطاقة جديد'}</DialogTitle>
            <DialogDescription>
              إدخال بيانات سعر البطاقة للمصرف
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="cardBankName">اسم المصرف</Label>
              <Input
                id="cardBankName"
                value={cardPriceForm.bankName}
                onChange={(e) => setCardPriceForm(prev => ({ ...prev, bankName: e.target.value }))}
                placeholder="مثال: مصرف الأمان"
              />
            </div>
            <div>
              <Label htmlFor="cardPrice">السعر (د.ل)</Label>
              <Input
                id="cardPrice"
                type="number"
                step="0.01"
                value={cardPriceForm.price}
                onChange={(e) => setCardPriceForm(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isVisible"
                checked={cardPriceForm.isVisible}
                onChange={(e) => setCardPriceForm(prev => ({ ...prev, isVisible: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="isVisible">عرض في الصفحة الرئيسية</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCardDialog(false)}>
              إلغاء
            </Button>
            <Button style={{ backgroundColor: '#C9A34D', color: '#FFFFFF' }} onClick={handleSaveCardPrice}>
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
