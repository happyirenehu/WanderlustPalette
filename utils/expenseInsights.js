function normalizeExpense(value, index) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const category = typeof value.category === 'string' ? value.category.trim() : '';
  const amount = value.amount;
  if (!category || !Number.isFinite(amount) || amount < 0) return null;
  return { amount, category, index };
}

export function getExpenseInsights(expenses) {
  const validExpenses = Array.isArray(expenses)
    ? expenses.map(normalizeExpense).filter(Boolean)
    : [];
  const totals = validExpenses.reduce((result, expense) => {
    const existing = result.get(expense.category);
    if (existing) {
      existing.amount += expense.amount;
      existing.count += 1;
    } else {
      result.set(expense.category, {
        amount: expense.amount,
        category: expense.category,
        count: 1,
        firstIndex: expense.index,
      });
    }
    return result;
  }, new Map());

  const categoryTotals = [...totals.values()]
    .sort((a, b) => b.amount - a.amount || a.firstIndex - b.firstIndex)
    .map(({ firstIndex, ...item }) => item);
  const calculatedTotal = validExpenses.reduce((total, expense) => total + expense.amount, 0);

  return {
    calculatedTotal,
    categoryTotals,
    largestCategory: categoryTotals[0] || null,
    validExpenseCount: validExpenses.length,
  };
}

export default getExpenseInsights;
