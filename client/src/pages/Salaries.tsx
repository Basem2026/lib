// داخل handleAddSalary
const addSalaryMutation = trpc.salaries.create.useMutation({
  onSuccess: async () => {
    // خصم من كاش دينار فقط
    await trpc.treasury.distribute.mutate({
      fromAccountId: 'capital_distribution',
      toAccountId: 'cash_lyd',
      toAccountType: 'cash_lyd',
      amount: -salaryAmount,
      currency: 'LYD',
      description: `راتب الموظف ${employeeName} - شهر ${month}`
    });
    toast({ title: 'تم إضافة الراتب' });
  }
});