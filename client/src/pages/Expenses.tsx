import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trpc } from '../utils/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useToast } from '../hooks/use-toast';
import { Plus, Edit, Trash2, Printer, Download } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';
import { useGranularPermissions } from '../hooks/useGranularPermissions';
import AddExpenseDialog from '../components/AddExpenseDialog';
import { EXPENSE_CATEGORIES } from '../types/expenses';

export default function ExpensesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { canViewModule, canViewTable, getVisibleColumns, canPerformAction } = useGranularPermissions();
  
  // ✅ صلاحية الوصول للقسم ككل
  if (!canViewModule('expenses')) {
    return <div className="p-8 text-center">ليس لديك صلاحية لعرض المصروفات</div>;
  }

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const { data, isLoading } = trpc.expenses.list.useQuery({ limit: 200 });
  const deleteMutation = trpc.expenses.delete.useMutation({
    onSuccess: () => {
      toast({ title: 'تم الحذف', description: 'تم حذف المصروف بنجاح' });
      queryClient.invalidateQueries({ queryKey: [['expenses', 'list']] });
    },
  });

  // ✅ الأعمدة المسموحة (من الصلاحيات)
  const allColumns = [
    { key: 'date', label: 'التاريخ', visible: true },
    { key: 'category', label: 'التصنيف', visible: true },
    { key: 'description', label: 'الوصف', visible: true },
    { key: 'amount', label: 'المبلغ', visible: true },
    { key: 'currency', label: 'العملة', visible: true },
    { key: 'paymentMethod', label: 'طريقة الدفع', visible: true },
    { key: 'accountName', label: 'الحساب', sensitive: false },
    { key: 'profitImpact', label: 'تأثير على الربح', sensitive: true }, // حساس
    { key: 'createdBy', label: 'أضيف بواسطة', sensitive: false },
  ];

  const visibleColumns = getVisibleColumns('expenses', 'expenses_table');
  const filteredColumns = visibleColumns
    ? allColumns.filter(col => visibleColumns.includes(col.key))
    : allColumns;

  // فلترة البيانات
  const filteredExpenses = data?.items?.filter(exp => {
    const matchSearch = exp.description?.toLowerCase().includes(search.toLowerCase()) ||
                        exp.category?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !categoryFilter || exp.category === categoryFilter;
    return matchSearch && matchCategory;
  }) || [];

  // ✅ التحقق من صلاحية الإجراءات
  const canAdd = canPerformAction('expenses', 'expenses_table', 'add');
  const canEdit = canPerformAction('expenses', 'expenses_table', 'edit');
  const canDelete = canPerformAction('expenses', 'expenses_table', 'delete');
  const canPrint = canPerformAction('expenses', 'expenses_table', 'print');
  const canExport = canPerformAction('expenses', 'expenses_table', 'export');

  const handleDelete = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا المصروف؟')) {
      deleteMutation.mutate({ id });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    // تصدير CSV
    const headers = filteredColumns.map(c => c.label).join(',');
    const rows = filteredExpenses.map(exp => {
      return filteredColumns.map(col => {
        let val = exp[col.key as keyof typeof exp];
        if (col.key === 'date') val = formatDate(val as string);
        if (col.key === 'amount') val = formatCurrency(val as number);
        return `"${val}"`;
      }).join(',');
    }).join('\n');
    const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `expenses_${formatDate(new Date())}.csv`;
    link.click();
  };

  if (isLoading) return <div className="p-8">جاري التحميل...</div>;

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">المصروفات</h1>
        {canAdd && <AddExpenseDialog onSuccess={() => queryClient.invalidateQueries({ queryKey: [['expenses', 'list']] })} />}
      </div>

      {/* الفلاتر */}
      <Card>
        <CardContent className="pt-4 flex flex-wrap gap-4">
          <Input placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="كل التصنيفات" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">الكل</SelectItem>
              {EXPENSE_CATEGORIES.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canPrint && <Button variant="outline" onClick={handlePrint}><Printer /> طباعة</Button>}
          {canExport && <Button variant="outline" onClick={handleExport}><Download /> تصدير Excel</Button>}
        </CardContent>
      </Card>

      {/* الجدول */}
      <Card>
        <CardHeader><CardTitle>قائمة المصروفات</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {filteredColumns.map(col => (
                  <TableHead key={col.key}>{col.label}</TableHead>
                ))}
                {(canEdit || canDelete) && <TableHead>الإجراءات</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.map(exp => (
                <TableRow key={exp.id}>
                  {filteredColumns.map(col => {
                    let value = exp[col.key as keyof typeof exp];
                    if (col.key === 'date') value = formatDate(value as string);
                    if (col.key === 'amount') value = formatCurrency(value as number);
                    if (col.key === 'category') value = EXPENSE_CATEGORIES.find(c => c.value === value)?.label || value;
                    if (col.key === 'profitImpact') value = value ? 'يؤثر' : 'لا يؤثر';
                    return <TableCell key={col.key}>{value as string}</TableCell>;
                  })}
                  {(canEdit || canDelete) && (
                    <TableCell>
                      <div className="flex gap-2">
                        {canEdit && (
                          <Button variant="ghost" size="icon" onClick={() => {}}>
                            <Edit />
                          </Button>
                        )}
                        {canDelete && (
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(exp.id)}>
                            <Trash2 className="text-red-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}