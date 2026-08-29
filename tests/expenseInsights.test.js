import getExpenseInsights from '../utils/expenseInsights';

describe('journey expense insights', () => {
  test('returns a safe empty summary for empty or malformed input', () => {
    expect(getExpenseInsights()).toEqual({
      calculatedTotal: 0,
      categoryTotals: [],
      largestCategory: null,
      validExpenseCount: 0,
    });
    expect(getExpenseInsights('not-an-array').validExpenseCount).toBe(0);
  });

  test('summarizes one valid expense', () => {
    expect(getExpenseInsights([{ category: 'Food', amount: 24.5 }])).toEqual({
      calculatedTotal: 24.5,
      categoryTotals: [{ amount: 24.5, category: 'Food', count: 1 }],
      largestCategory: { amount: 24.5, category: 'Food', count: 1 },
      validExpenseCount: 1,
    });
  });

  test('aggregates duplicate categories and calculates the total', () => {
    const result = getExpenseInsights([
      { category: 'Food', amount: 20 },
      { category: 'Transport', amount: 40 },
      { category: 'Food', amount: 35 },
    ]);
    expect(result.calculatedTotal).toBe(95);
    expect(result.validExpenseCount).toBe(3);
    expect(result.categoryTotals).toEqual([
      { amount: 55, category: 'Food', count: 2 },
      { amount: 40, category: 'Transport', count: 1 },
    ]);
    expect(result.largestCategory.category).toBe('Food');
  });

  test('uses first appearance as deterministic tie behavior', () => {
    const expenses = [
      { category: 'Museums', amount: 30 },
      { category: 'Food', amount: 30 },
      { category: 'Stay', amount: 10 },
    ];
    expect(getExpenseInsights(expenses).categoryTotals.map((item) => item.category))
      .toEqual(['Museums', 'Food', 'Stay']);
  });

  test('ignores malformed entries, missing categories, negative and non-finite amounts', () => {
    const result = getExpenseInsights([
      null,
      {},
      { category: '', amount: 10 },
      { category: 'Food', amount: -1 },
      { category: 'Food', amount: Number.NaN },
      { category: 'Food', amount: Number.POSITIVE_INFINITY },
      { category: 'Activities', amount: 0 },
    ]);
    expect(result.validExpenseCount).toBe(1);
    expect(result.calculatedTotal).toBe(0);
    expect(result.largestCategory.category).toBe('Activities');
  });

  test('does not mutate the source array or its entries', () => {
    const expenses = [{ category: ' Food ', amount: 15 }, { category: 'Stay', amount: 40 }];
    const copy = JSON.parse(JSON.stringify(expenses));
    getExpenseInsights(expenses);
    expect(expenses).toEqual(copy);
  });

  test('keeps derived totals rounded to cents', () => {
    expect(getExpenseInsights([
      { category: 'Food', amount: 0.1 },
      { category: 'Food', amount: 0.2 },
    ])).toMatchObject({
      calculatedTotal: 0.3,
      largestCategory: { amount: 0.3, category: 'Food' },
    });
  });
});
