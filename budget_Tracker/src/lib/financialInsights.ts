import type { BudgetData, TransactionData } from './api';
import { classifyBudgetUsage } from './budgetStatus';

export type InsightType = 'budget' | 'spending' | 'saving' | 'category' | 'trend';
export type InsightSeverity = 'positive' | 'info' | 'warning' | 'critical';

export interface FinancialInsight {
  id: string;
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  message: string;
  metric?: string;
  action?: string;
}

export interface FinancialSummary {
  monthlyIncome: number;
  monthlyExpense: number;
  netSavings: number;
  savingsRate: number | null;
  topCategory: { name: string; amount: number; percent: number } | null;
  budgetsExceeded: number;
  budgetsNearLimit: number;
  budgetsGettingClose: number;
  health: 'excellent' | 'good' | 'fair' | 'needs-attention' | null;
  healthReason: string;
}

export interface FinancialInsightResult {
  summary: FinancialSummary;
  insights: FinancialInsight[];
  transactionCount: number;
}

const periodOf = (value: string) => {
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(value);
  return match ? { year: Number(match[1]), month: Number(match[2]) } : null;
};

const isExpense = (transaction: TransactionData) => Number(transaction.amount) < 0;
const normalizedCategory = (category: string) => category.trim().toLowerCase() || 'other';
const DISCRETIONARY_CATEGORIES = new Set(['shopping', 'entertainment', 'dining', 'technology']);

export function generateFinancialInsights(
  transactions: TransactionData[],
  budgets: BudgetData[],
  month: number,
  year: number,
  formatAmount: (amount: number) => string,
): FinancialInsightResult {
  const currentTransactions = transactions.filter((transaction) => {
    const period = periodOf(transaction.date);
    return period?.month === month && period.year === year;
  });
  const expenses = currentTransactions.filter(isExpense);
  const monthlyIncome = currentTransactions.filter((transaction) => !isExpense(transaction))
    .reduce((total, transaction) => total + Math.abs(Number(transaction.amount) || 0), 0);
  const monthlyExpense = expenses.reduce((total, transaction) => total + Math.abs(Number(transaction.amount) || 0), 0);
  const netSavings = monthlyIncome - monthlyExpense;
  const savingsRate = monthlyIncome > 0 ? (netSavings / monthlyIncome) * 100 : null;

  const categoryTotals = new Map<string, { name: string; amount: number }>();
  for (const transaction of expenses) {
    const key = normalizedCategory(transaction.category);
    const existing = categoryTotals.get(key);
    categoryTotals.set(key, {
      name: existing?.name ?? (transaction.category.trim() || 'Other'),
      amount: (existing?.amount ?? 0) + Math.abs(Number(transaction.amount) || 0),
    });
  }
  const topEntry = Array.from(categoryTotals.values()).sort((a, b) => b.amount - a.amount)[0];
  const topCategory = topEntry ? { ...topEntry, percent: monthlyExpense > 0 ? (topEntry.amount / monthlyExpense) * 100 : 0 } : null;

  const budgetUsage = budgets.map((budget) => ({
    budget,
    ...classifyBudgetUsage(budget.spent, budget.amount),
    remaining: Math.max(0, budget.amount - budget.spent),
  }));
  const budgetsExceeded = budgetUsage.filter(({ status }) => status === 'exceeded').length;
  const budgetsNearLimit = budgetUsage.filter(({ status }) => status === 'almost-reached').length;
  const budgetsGettingClose = budgetUsage.filter(({ status }) => status === 'getting-close').length;

  let health: FinancialSummary['health'] = null;
  let healthReason = 'Add income and expense activity to calculate your financial health.';
  if (currentTransactions.length > 0 && monthlyIncome > 0 && savingsRate !== null) {
    if (savingsRate >= 30 && budgetsExceeded === 0) health = 'excellent';
    else if (savingsRate >= 20 && budgetsExceeded <= 1) health = 'good';
    else if (savingsRate >= 10 && budgetsExceeded < 2) health = 'fair';
    else health = 'needs-attention';
    const budgetReason = budgetsExceeded === 0
      ? 'no active budgets are exceeded'
      : `${budgetsExceeded} ${budgetsExceeded === 1 ? 'budget is' : 'budgets are'} exceeded`;
    healthReason = `Your savings rate is ${savingsRate.toFixed(1)}% and ${budgetReason}.`;
  }

  const ranked: Array<FinancialInsight & { priority: number }> = [];
  for (const { budget, percent, remaining, status } of budgetUsage) {
    if (status === 'exceeded') ranked.push({ id: `budget-exceeded-${budget.id}`, type: 'budget', severity: 'critical', priority: 1, title: `${budget.category} budget exceeded`, message: `You've spent ${formatAmount(budget.spent)} against your ${formatAmount(budget.amount)} ${budget.category} budget.`, metric: `${percent.toFixed(0)}% used`, action: `Review recent ${budget.category} transactions.` });
    else if (status === 'almost-reached') ranked.push({ id: `budget-near-${budget.id}`, type: 'budget', severity: 'warning', priority: 3, title: `${budget.category} budget almost reached`, message: `You've used ${percent.toFixed(0)}% of your ${budget.category} budget with ${formatAmount(remaining)} remaining.`, metric: `${percent.toFixed(0)}% used`, action: `Review recent ${budget.category} transactions.` });
    else if (status === 'getting-close') ranked.push({ id: `budget-close-${budget.id}`, type: 'budget', severity: 'info', priority: 5, title: `${budget.category} spending is getting close`, message: `You've used ${percent.toFixed(0)}% of your monthly ${budget.category} budget.`, metric: `${formatAmount(budget.spent)} / ${formatAmount(budget.amount)}`, ...(DISCRETIONARY_CATEGORIES.has(normalizedCategory(budget.category)) ? { action: `Review recent ${budget.category} transactions.` } : {}) });
  }

  if (monthlyIncome > 0 && monthlyExpense > monthlyIncome) ranked.push({ id: 'expenses-exceeded-income', type: 'saving', severity: 'critical', priority: 2, title: 'Expenses exceeded income', message: `You spent ${formatAmount(monthlyExpense - monthlyIncome)} more than your income this month.`, metric: formatAmount(netSavings) });

  const previousDate = new Date(year, month - 2, 1);
  const previousExpense = transactions.reduce((total, transaction) => {
    const period = periodOf(transaction.date);
    return period?.month === previousDate.getMonth() + 1 && period.year === previousDate.getFullYear() && isExpense(transaction)
      ? total + Math.abs(Number(transaction.amount) || 0) : total;
  }, 0);
  if (previousExpense > 0) {
    const change = ((monthlyExpense - previousExpense) / previousExpense) * 100;
    if (change >= 20) ranked.push({ id: 'spending-increase', type: 'trend', severity: budgetsExceeded > 0 || (savingsRate !== null && savingsRate < 10) ? 'warning' : 'info', priority: 4, title: 'Monthly spending increased', message: `Your spending increased by ${change.toFixed(1)}% compared with last month.`, metric: `${change.toFixed(1)}%` });
    else if (change <= -20) ranked.push({ id: 'spending-decrease', type: 'trend', severity: 'positive', priority: 4, title: 'Monthly spending decreased', message: `Your spending decreased by ${Math.abs(change).toFixed(1)}% compared with last month.`, metric: `${Math.abs(change).toFixed(1)}% lower` });
  }

  if (topCategory) ranked.push({ id: 'top-category', type: 'category', severity: 'info', priority: 6, title: `${topCategory.name} is your top spending category`, message: `${topCategory.name} accounts for ${topCategory.percent.toFixed(1)}% of your spending this month (${formatAmount(topCategory.amount)}).`, metric: `${topCategory.percent.toFixed(1)}% of expenses` });

  if (savingsRate !== null && monthlyExpense <= monthlyIncome) {
    if (savingsRate >= 30) ranked.push({ id: 'strong-savings', type: 'saving', severity: 'positive', priority: 7, title: 'Strong savings month', message: `You retained ${savingsRate.toFixed(1)}% of your income this month.`, metric: formatAmount(netSavings) });
    else if (savingsRate >= 20) ranked.push({ id: 'positive-savings', type: 'saving', severity: 'positive', priority: 7, title: 'Positive savings progress', message: `You retained ${savingsRate.toFixed(1)}% of your income this month.`, metric: `${savingsRate.toFixed(1)}% saved` });
    else if (savingsRate >= 10) ranked.push({ id: 'steady-savings', type: 'saving', severity: 'info', priority: 7, title: 'Steady savings', message: `You retained ${savingsRate.toFixed(1)}% of your income this month.`, metric: `${savingsRate.toFixed(1)}% saved` });
    else ranked.push({ id: 'low-savings', type: 'saving', severity: 'warning', priority: 3, title: 'Savings need attention', message: `You retained ${savingsRate.toFixed(1)}% of your income this month.`, metric: `${savingsRate.toFixed(1)}% saved` });
  }

  const largestExpense = [...expenses].sort((a, b) => Math.abs(Number(b.amount)) - Math.abs(Number(a.amount)))[0];
  if (largestExpense) ranked.push({ id: 'largest-expense', type: 'spending', severity: 'info', priority: 8, title: 'Largest expense this month', message: `${largestExpense.category} — ${formatAmount(Math.abs(Number(largestExpense.amount)))} was your largest expense.`, metric: largestExpense.name });

  const selectedStart = new Date(year, month - 1, 1).getTime();
  const anomaly = expenses.map((transaction) => {
    const prior = transactions.filter((candidate) => {
      const date = periodOf(candidate.date);
      return isExpense(candidate) && normalizedCategory(candidate.category) === normalizedCategory(transaction.category) && date && new Date(date.year, date.month - 1, 1).getTime() < selectedStart;
    });
    const average = prior.length >= 3 ? prior.reduce((sum, item) => sum + Math.abs(Number(item.amount) || 0), 0) / prior.length : 0;
    return { transaction, average, ratio: average > 0 ? Math.abs(Number(transaction.amount)) / average : 0 };
  }).filter(({ ratio }) => ratio > 2).sort((a, b) => b.ratio - a.ratio)[0];
  if (anomaly) ranked.push({ id: `unusual-${anomaly.transaction.id ?? anomaly.transaction.name}`, type: 'spending', severity: 'warning', priority: 5, title: `Higher-than-usual ${anomaly.transaction.category} expense`, message: `This ${formatAmount(Math.abs(Number(anomaly.transaction.amount)))} transaction is significantly above your recent ${anomaly.transaction.category} average.`, metric: `${anomaly.ratio.toFixed(1)}× recent average` });

  const seen = new Set<string>();
  const insights = ranked.sort((a, b) => a.priority - b.priority).filter((item) => !seen.has(item.id) && seen.add(item.id)).slice(0, 6).map(({ priority: _priority, ...item }) => item);
  return { summary: { monthlyIncome, monthlyExpense, netSavings, savingsRate, topCategory, budgetsExceeded, budgetsNearLimit, budgetsGettingClose, health, healthReason }, insights, transactionCount: currentTransactions.length };
}
