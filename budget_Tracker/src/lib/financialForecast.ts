import type { BudgetData, TransactionData } from './api';

export type ForecastConfidence = 'low' | 'medium' | 'high';
export type BudgetRisk = 'on-track' | 'at-risk' | 'likely-to-exceed' | 'already-exceeded';

export interface CategoryForecast {
  category: string;
  current: number;
  projected: number;
  budget?: number;
  risk?: BudgetRisk;
  safeDailySpend?: number;
}

export interface FinancialForecast {
  isCurrentMonth: boolean;
  isPastMonth: boolean;
  hasForecastData: boolean;
  currentExpense: number;
  projectedExpense: number;
  recordedIncome: number;
  projectedIncome: number;
  projectedSavings: number;
  projectedSavingsRate: number | null;
  averageDailyExpense: number;
  daysInMonth: number;
  daysElapsed: number;
  daysRemaining: number;
  activityDays: number;
  expenseCount: number;
  confidence: ForecastConfidence;
  confidenceReason: string;
  categoryForecasts: CategoryForecast[];
  recentMonthlyAverage: number | null;
  historicalMonthsUsed: number;
}

const getPeriod = (date: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  return match ? { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) } : null;
};

const categoryKey = (category: string) => category.trim().toLowerCase() || 'other';

export function calculateFinancialForecast(
  transactions: TransactionData[],
  budgets: BudgetData[],
  month: number,
  year: number,
  now: Date,
): FinancialForecast {
  const selectedStart = new Date(year, month - 1, 1);
  const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const isCurrentMonth = selectedStart.getTime() === currentStart.getTime();
  const isPastMonth = selectedStart.getTime() < currentStart.getTime();
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysElapsed = isCurrentMonth ? Math.min(now.getDate(), daysInMonth) : daysInMonth;
  const daysRemaining = isCurrentMonth ? Math.max(0, daysInMonth - daysElapsed) : 0;
  const selected = transactions.filter((transaction) => {
    const period = getPeriod(transaction.date);
    return period?.month === month && period.year === year;
  });
  const expenses = selected.filter((transaction) => Number(transaction.amount) < 0);
  const currentExpense = expenses.reduce((sum, transaction) => sum + Math.abs(Number(transaction.amount) || 0), 0);
  const recordedIncome = selected.filter((transaction) => Number(transaction.amount) >= 0)
    .reduce((sum, transaction) => sum + Math.abs(Number(transaction.amount) || 0), 0);
  const averageDailyExpense = currentExpense / Math.max(1, daysElapsed);
  const projectedExpense = isCurrentMonth ? averageDailyExpense * daysInMonth : currentExpense;
  const projectedIncome = recordedIncome;
  const projectedSavings = projectedIncome - projectedExpense;
  const projectedSavingsRate = projectedIncome > 0 ? (projectedSavings / projectedIncome) * 100 : null;
  const activityDays = new Set(selected.map((transaction) => getPeriod(transaction.date)?.day).filter(Boolean)).size;

  let confidence: ForecastConfidence = 'low';
  let confidenceReason = `Low confidence — only ${activityDays} ${activityDays === 1 ? 'day' : 'days'} of recorded activity and ${expenses.length} expense ${expenses.length === 1 ? 'transaction is' : 'transactions are'} available.`;
  const historicalMonthTotals: number[] = [];
  for (let offset = 1; offset <= 3; offset += 1) {
    const date = new Date(year, month - 1 - offset, 1);
    const total = transactions.reduce((sum, transaction) => {
      const period = getPeriod(transaction.date);
      return period?.year === date.getFullYear() && period.month === date.getMonth() + 1 && Number(transaction.amount) < 0
        ? sum + Math.abs(Number(transaction.amount) || 0) : sum;
    }, 0);
    if (total > 0) historicalMonthTotals.push(total);
  }
  if (activityDays >= 15 && expenses.length >= 8 && historicalMonthTotals.length > 0) {
    confidence = 'high';
    confidenceReason = `High confidence — ${activityDays} activity days, ${expenses.length} expenses, and ${historicalMonthTotals.length} prior ${historicalMonthTotals.length === 1 ? 'month' : 'months'} of history are available.`;
  } else if (activityDays >= 7 && expenses.length >= 4) {
    confidence = 'medium';
    confidenceReason = `Medium confidence — ${activityDays} activity days and ${expenses.length} expense transactions are available.`;
  }

  const categoryMap = new Map<string, { category: string; current: number }>();
  for (const transaction of expenses) {
    const key = categoryKey(transaction.category);
    const existing = categoryMap.get(key);
    categoryMap.set(key, { category: existing?.category ?? (transaction.category.trim() || 'Other'), current: (existing?.current ?? 0) + Math.abs(Number(transaction.amount) || 0) });
  }
  const budgetMap = new Map(budgets.map((budget) => [categoryKey(budget.category), budget]));
  const allKeys = new Set([...categoryMap.keys(), ...budgetMap.keys()]);
  const categoryForecasts = Array.from(allKeys).map((key): CategoryForecast => {
    const categoryExpense = categoryMap.get(key);
    const budget = budgetMap.get(key);
    const current = categoryExpense?.current ?? budget?.spent ?? 0;
    const projected = isCurrentMonth ? (current / Math.max(1, daysElapsed)) * daysInMonth : current;
    if (!budget) return { category: categoryExpense?.category ?? 'Other', current, projected };
    const risk: BudgetRisk = current >= budget.amount
      ? 'already-exceeded'
      : projected > budget.amount
        ? 'likely-to-exceed'
        : projected > budget.amount * 0.9 ? 'at-risk' : 'on-track';
    return {
      category: budget.category,
      current,
      projected,
      budget: budget.amount,
      risk,
      safeDailySpend: current >= budget.amount ? 0 : (budget.amount - current) / Math.max(1, daysRemaining),
    };
  }).filter((category) => category.current > 0 || category.budget !== undefined).sort((a, b) => b.projected - a.projected);

  return {
    isCurrentMonth, isPastMonth, hasForecastData: isCurrentMonth && expenses.length > 0,
    currentExpense, projectedExpense, recordedIncome, projectedIncome, projectedSavings, projectedSavingsRate,
    averageDailyExpense, daysInMonth, daysElapsed, daysRemaining, activityDays, expenseCount: expenses.length,
    confidence, confidenceReason, categoryForecasts,
    recentMonthlyAverage: historicalMonthTotals.length > 0 ? historicalMonthTotals.reduce((sum, value) => sum + value, 0) / historicalMonthTotals.length : null,
    historicalMonthsUsed: historicalMonthTotals.length,
  };
}
