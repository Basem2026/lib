interface ExpenseStatsProps {
  totalExpenses?: number;
  totalAmount?: number;
  currency?: string;
}

export default function ExpenseStats({ totalExpenses = 0, totalAmount = 0, currency = "LYD" }: ExpenseStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      <div className="bg-white rounded-lg p-4 shadow">
        <p className="text-sm text-gray-500">إجمالي المصروفات</p>
        <p className="text-2xl font-bold">{totalExpenses}</p>
      </div>
      <div className="bg-white rounded-lg p-4 shadow">
        <p className="text-sm text-gray-500">إجمالي المبلغ</p>
        <p className="text-2xl font-bold">{totalAmount.toLocaleString()} {currency}</p>
      </div>
    </div>
  );
}
