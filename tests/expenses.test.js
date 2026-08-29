import {
  addExpense,
  createExpenseId,
  deleteExpense,
  normalizeExpenses,
  updateExpense,
  validateExpenseInput,
} from '../utils/expenses';
import getExpenseInsights from '../utils/expenseInsights';

describe('Expense normalization and validation', () => {
  test('normalizes legacy expenses with deterministic stable IDs', () => {
    expect(normalizeExpenses([
      { category: 'Food', amount: 12.5 },
      { category: 'Transportation', amount: 4 },
    ])).toEqual([
      { id: 'expense-1', category: 'Food', amount: 12.5 },
      { id: 'expense-2', category: 'Transportation', amount: 4 },
    ]);
  });

  test('rejects missing categories and unsafe amounts', () => {
    expect(validateExpenseInput({ category: '', amount: '10' }).isValid).toBe(false);
    expect(validateExpenseInput({ category: 'Food', amount: '-1' }).isValid).toBe(false);
    expect(validateExpenseInput({ category: 'Food', amount: '12.345' }).isValid).toBe(false);
    expect(validateExpenseInput({ category: 'Food', amount: '12.34' })).toMatchObject({
      isValid: true,
      values: { amount: 12.34, category: 'Food' },
    });
  });

  test('creates deterministic IDs when time and randomness are supplied', () => {
    expect(createExpenseId(1000, 0)).toBe('expense-rs-0');
  });
});

describe('Expense CRUD transformations and summaries', () => {
  test('creates, updates, and deletes without mutating source data', () => {
    const source = [{ id: 'stay', category: 'Accommodation', amount: 100 }];
    const sourceCopy = JSON.parse(JSON.stringify(source));
    const added = addExpense(source, { category: 'Food', amount: '20.25' }, { id: 'meal' });
    const updated = updateExpense(added.expenses, 'meal', { category: 'Food', amount: '25.50' });
    const deleted = deleteExpense(updated.expenses, 'stay');

    expect(added.expense).toEqual({ id: 'meal', category: 'Food', amount: 20.25 });
    expect(updated.expense).toEqual({ id: 'meal', category: 'Food', amount: 25.5 });
    expect(deleted).toEqual({ deleted: true, expenses: [{ id: 'meal', category: 'Food', amount: 25.5 }] });
    expect(source).toEqual(sourceCopy);
  });

  test('failed update/delete leaves normalized data intact', () => {
    const expenses = [{ id: 'meal', category: 'Food', amount: 20 }];
    expect(updateExpense(expenses, 'missing', { category: 'Food', amount: '30' })).toMatchObject({
      found: false,
      expenses,
    });
    expect(deleteExpense(expenses, 'missing')).toEqual({ deleted: false, expenses });
  });

  test('derived summary recalculates after create, update, and delete', () => {
    const created = addExpense([], { category: 'Food', amount: '10.10' }, { id: 'one' });
    const createdAgain = addExpense(created.expenses, { category: 'Food', amount: '20.20' }, { id: 'two' });
    expect(getExpenseInsights(createdAgain.expenses)).toMatchObject({
      calculatedTotal: 30.3,
      largestCategory: { amount: 30.3, category: 'Food', count: 2 },
      validExpenseCount: 2,
    });

    const updated = updateExpense(createdAgain.expenses, 'two', { category: 'Activities', amount: '40.40' });
    expect(getExpenseInsights(updated.expenses).categoryTotals).toEqual([
      { amount: 40.4, category: 'Activities', count: 1 },
      { amount: 10.1, category: 'Food', count: 1 },
    ]);

    const deleted = deleteExpense(updated.expenses, 'one');
    expect(getExpenseInsights(deleted.expenses)).toMatchObject({ calculatedTotal: 40.4, validExpenseCount: 1 });
  });

  test('manual totalCost remains distinct from the calculated summary', () => {
    const journey = { totalCost: 500, expenses: [{ id: 'meal', category: 'Food', amount: 25 }] };
    expect(getExpenseInsights(journey.expenses).calculatedTotal).toBe(25);
    expect(journey.totalCost).toBe(500);
  });
});
