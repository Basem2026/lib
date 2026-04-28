// داخل دالة handleSubmit بعد حساب الأرباح والتأثيرات
const updateTreasury = async () => {
  // مثال: بيع دولار - كاش
  if (formData.operationType === 'sell_dollar_cash') {
    // زيادة كاش دينار
    await trpc.treasury.distribute.mutate({
      fromAccountId: 'capital_distribution', // not used but required
      toAccountId: 'cash_lyd',
      toAccountType: 'cash_lyd',
      amount: amountReceivedLYD,
      currency: 'LYD',
      description: `بيع دولار - كاش: ${dollarAmount} $ بسعر ${exchangeRate}`
    });
    // نقص كاش دولار
    await trpc.treasury.distribute.mutate({
      fromAccountId: 'capital_distribution',
      toAccountId: 'cash_usd',
      toAccountType: 'cash_usd',
      amount: -dollarAmount, // سالب يعني خصم
      currency: 'USD',
      description: `سحب دولار للبيع`
    });
    // إضافة الأرباح (حساب خاص)
    await trpc.treasury.depositCapital.mutate({
      amount: profit,
      currency: 'LYD',
      description: `أرباح بيع دولار`
    });
  }
  // باقي أنواع العمليات بنفس المنطق
};