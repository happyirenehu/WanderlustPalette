const MAX_AMOUNT = 999999999.99;

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeAmount(value) {
  return Number.isFinite(value) && value >= 0 && value <= MAX_AMOUNT
    ? Math.round(value * 100) / 100
    : null;
}

export function normalizeExpense(value, fallbackId = '') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const id = cleanText(value.id) || cleanText(fallbackId);
  const category = cleanText(value.category);
  const amount = normalizeAmount(value.amount);
  return id && category && amount !== null ? { id, category, amount } : null;
}

export function normalizeExpenses(value) {
  if (!Array.isArray(value)) return [];
  const usedIds = new Set();
  return value.reduce((result, item, index) => {
    const expense = normalizeExpense(item, `expense-${index + 1}`);
    if (!expense) return result;
    let id = expense.id;
    let suffix = 2;
    while (usedIds.has(id)) {
      id = `${expense.id}-${suffix}`;
      suffix += 1;
    }
    usedIds.add(id);
    result.push({ ...expense, id });
    return result;
  }, []);
}

export function validateExpenseInput(input = {}) {
  const category = cleanText(input.category);
  const amountText = typeof input.amount === 'number' ? String(input.amount) : cleanText(input.amount);
  const amount = /^\d+(?:\.\d{1,2})?$/.test(amountText) ? normalizeAmount(Number(amountText)) : null;
  const errors = {};
  if (!category || category.length > 80) errors.category = 'Expense category is required.';
  if (amount === null) errors.amount = 'Enter a valid non-negative amount with up to two decimal places.';
  return {
    errors,
    isValid: Object.keys(errors).length === 0,
    values: { category, amount },
  };
}

export function createExpenseId(now = Date.now(), random = Math.random()) {
  return `expense-${Math.max(0, Number(now) || 0).toString(36)}-${Math.floor(Math.max(0, Math.min(0.999999, random)) * 0x100000).toString(36)}`;
}

export function addExpense(expenses, input, options = {}) {
  const current = normalizeExpenses(expenses);
  const validation = validateExpenseInput(input);
  if (!validation.isValid) return { expenses: current, expense: null, errors: validation.errors };
  const baseId = cleanText(options.id) || createExpenseId();
  let id = baseId;
  let suffix = 2;
  while (current.some((expense) => expense.id === id)) {
    id = `${baseId}-${suffix}`;
    suffix += 1;
  }
  const expense = { id, ...validation.values };
  return { expenses: [...current, expense], expense, errors: {} };
}

export function updateExpense(expenses, id, input) {
  const current = normalizeExpenses(expenses);
  const targetId = cleanText(id);
  const index = current.findIndex((expense) => expense.id === targetId);
  if (index < 0) return { expenses: current, expense: null, errors: {}, found: false };
  const validation = validateExpenseInput(input);
  if (!validation.isValid) {
    return { expenses: current, expense: null, errors: validation.errors, found: true };
  }
  const expense = { id: targetId, ...validation.values };
  const next = current.slice();
  next[index] = expense;
  return { expenses: next, expense, errors: {}, found: true };
}

export function deleteExpense(expenses, id) {
  const current = normalizeExpenses(expenses);
  const targetId = cleanText(id);
  const next = current.filter((expense) => expense.id !== targetId);
  return { deleted: next.length !== current.length, expenses: next };
}
