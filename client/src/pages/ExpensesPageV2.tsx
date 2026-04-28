import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trpc } from '../utils/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { useToast } from '../hooks/use-toast';
import { Plus, Edit, Trash2, Eye, BarChart3 } from 'lucide-react';
import { useGranularPermissions } from '../hooks/useGranularPermissions';
import AddExpenseDialogV2 from '../components/AddExpenseDialogV2';
import ExpenseStats from '../components/ExpenseStats';
import { EXPENSE_CATEGORIES, type Expense } from '../types/expenses';
import { formatCurrency, formatDate } from '../lib/utils';

export default function ExpensesPageV2() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { canViewModule, canViewTable, getVisibleColumns, canPerformAction } = useGranularPermissions();
  
  // ✅ منع الوصول إذا لم تكن هناك صلاحية
  if (!canViewModule('expenses')) {
    return <div className="p-8 text-center text-red-600">غير مصرح لك بالوصول إلى هذا القسم</div>;
  }

  const [activeTab, setActiveTab] = useState<'list' | 'stats'>('list');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({ from: null, to: null });

  const { data, isLoading } = trpc.expenses.list.useQuery({ limit: 500 });
  const deleteMutation = trpc.expenses.delete.useMutation({
    onSuccess: () => {
      toast({ title: 'تم الحذف' });
      queryClient.invalidateQueries({ queryKey: [['expenses', 'list']] });
    },
  });

  // ✅ الأعمدة المسموحة بناءً على الصلاحيات
  const allColumns = [
    { id: 'date', label: 'التاريخ', type: 'date' },
    { id: 'category', label: 'التصنيف', type: 'string' },
    { id: 'description', label: 'الوصف', type: 'string' },
    { id: 'amount', label: 'المبلغ', type: 'currency', sensitive: false },
    { id: 'currency', label: 'العملة', type: 'string' },
    { id: 'paymentMethod', label: 'طريقة الدفع', type: 'string' },
    { id: 'accountName', label: 'الحساب', type: 'string' },
    { id: 'profitImpact', label: 'تأثير الربح', type: 'boolean', sensitive: true },
    { id: 'attachments', label: 'المرفقات', type: 'boolean', sensitive: false },
    { id: 'createdBy', label: 'الموظف', type: 'string' },
  ];

  const visibleColumns = getVisibleColumns('expenses', 'expenses_table');
  const filteredColumns = visibleColumns
    ? allColumns.filter(col => visibleColumns.includes(col.id))
    : allColumns;

  // تصفية البيانات
  const filteredExpenses = useMemo(() => {
    if (!data?.items) return [];
    return data.items.filter(exp => {
      const matchSearch = exp.description?.toLowerCase().includes(search.toLowerCase()) ||
                          exp.category?.toLowerCase().includes(search.toLowerCase());
      const matchCategory = !categoryFilter || exp.category === categoryFilter;
      let matchDate = true;
      if (dateRange.from) {
        const expDate = new Date(exp.date);
        matchDate = expDate >= dateRange.from;
      }
      if (dateRange.to) {
        const expDate = new Date(exp.date);
        matchDate = matchDate && expDate <= dateRange.to;
      }
      return matchSearch && matchCategory && matchDate;
    });
  }, [data?.items, search, categoryFilter, dateRange]);

  const canAdd = canPerformAction('expenses', 'expenses_table', 'add');
  const canEdit = canPerformAction('expenses', 'expenses_table', 'edit');
  const canDelete = canPerformAction('expenses', 'expenses_table', 'delete');
  const canViewStats = canPerformAction('expenses', 'expenses_table', 'view');

  const handleDelete = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المصروف؟')) {
      deleteMutation.mutate({ id });
    }
  };

  if (isLoading) return <div className="p-8">جاري التحميل...</div>;

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">المصروفات (V2)</h1>
        {canAdd && <AddExpenseDialogV2 onSuccess={() => queryClient.invalidateQueries({ queryKey: [['expenses', 'list']] })} />}
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="list">القائمة</TabsTrigger>
          {canViewStats && <TabsTrigger value="stats">الإحصائيات</TabsTrigger>}
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {/* شريط الفلترة */}
          <Card>
            <CardContent className="pt-4 flex flex-wrap gap-4">
              <Input placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="border rounded p-2"
              >
                <option value="">كل التصنيفات</option>
                {EXPENSE_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
              <input
                type="date"
                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value ? new Date(e.target.value) : null }))}
                className="border rounded p-2"
                placeholder="من تاريخ"
              />
              <input
                type="date"
                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value ? new Date(e.target.value) : null }))}
                className="border rounded p-2"
                placeholder="إلى تاريخ"
              />
            </CardContent>
          </Card>

          {/* الجدول */}
          <Card>
            <CardHeader><CardTitle>سجل المصروفات</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {filteredColumns.map(col => (
                        <TableHead key={col.id}>{col.label}</TableHead>
                      ))}
                      {(canEdit || canDelete) && <TableHead>الإجراءات</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.map(exp => (
                      <TableRow key={exp.id}>
                        {filteredColumns.map(col => {
                          let value = exp[col.id as keyof Expense];
                          if (col.type === 'date') value = formatDate(value as string);
                          if (col.type === 'currency') value = formatCurrency(value as number);
                          if (col.id === 'category') value = EXPENSE_CATEGORIES.find(c => c.value === value)?.label || value;
                          if (col.id === 'profitImpact') value = value ? 'يؤثر' : 'لا يؤثر';
                          if (col.id === 'attachments') value = value ? 'نعم' : 'لا';
                          return <TableCell key={col.id}>{value as string}</TableCell>;
                        })}
                        {(canEdit || canDelete) && (
                          <TableCell>
                            <div className="flex gap-2">
                              {canEdit && (
                                <Button variant="ghost" size="icon">
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {canViewStats && (
          <TabsContent value="stats">
            <ExpenseStats expenses={filteredExpenses} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}