import type { BudgetData, TransactionData } from './api';
import { calculateFinancialForecast } from './financialForecast';
import { generateFinancialInsights } from './financialInsights';
import { BudgetUsageStatus, classifyBudgetUsage } from './budgetStatus';

export type AssistantIntent =
  | 'summary' | 'total_expense' | 'income' | 'savings' | 'savings_rate'
  | 'category_spending' | 'top_category' | 'budget_status' | 'budget_remaining'
  | 'budget_risk' | 'safe_daily_spend' | 'forecast_expense' | 'forecast_savings'
  | 'largest_expense' | 'recent_transactions' | 'month_comparison' | 'help'
  | 'non_financial' | 'unknown';

export interface DetectedIntent {
  intent: AssistantIntent;
  category?: string;
}

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const categoryToken = (value: string) => normalize(value).replace(/ies$/, 'y').replace(/s$/, '');

const joinNames = (names: string[]) => names.length <= 1 ? names[0] ?? '' : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
const displayPercent = (percent: number) => percent.toFixed(1).replace(/\.0$/, '');

const describeBudgetGroup = (budgets: BudgetData[], status: BudgetUsageStatus): string => {
  const items = budgets.map((budget) => ({ budget, percent: classifyBudgetUsage(budget.spent, budget.amount).percent }));
  const descriptor = status === 'exceeded' ? 'over their limits' : status === 'almost-reached' ? 'almost at their limits' : 'getting close to their limits';
  if (items.length === 1) return `Your ${items[0].budget.category} budget is at ${displayPercent(items[0].percent)}% usage and is ${status === 'exceeded' ? 'over its limit' : status === 'almost-reached' ? 'almost at its limit' : 'getting close to its limit'}.`;
  const rounded = items.map(({ percent }) => displayPercent(percent));
  if (new Set(rounded).size === 1) return `Your ${joinNames(items.map(({ budget }) => budget.category))} budgets are ${items.length === 2 ? 'both ' : ''}at ${rounded[0]}% usage and are ${descriptor}.`;
  return `Your ${joinNames(items.map(({ budget, percent }) => `${budget.category} (${displayPercent(percent)}%)`))} budgets are ${descriptor}.`;
};

const describeBudgetAttention = (budgets: BudgetData[]): string => {
  const byStatus = (status: BudgetUsageStatus) => budgets.filter((budget) => classifyBudgetUsage(budget.spent, budget.amount).status === status);
  const exceeded = byStatus('exceeded');
  if (exceeded.length > 0) return describeBudgetGroup(exceeded, 'exceeded');
  const almostReached = byStatus('almost-reached');
  if (almostReached.length > 0) return describeBudgetGroup(almostReached, 'almost-reached');
  const gettingClose = byStatus('getting-close');
  if (gettingClose.length > 0) return describeBudgetGroup(gettingClose, 'getting-close');
  return 'No budgets are currently close to or over their limits.';
};

export function detectFinancialIntent(question: string, categories: string[]): DetectedIntent {
  const text = normalize(question);
  const category = categories.find((candidate) => text.includes(categoryToken(candidate)) || text.includes(normalize(candidate)));
  if (/prime minister|president|write (code|python)|joke|weather|sports|movie|recipe/.test(text)) return { intent: 'non_financial' };
  if (/how much.*(per day|daily)|spend daily|daily.*stay within/.test(text) && /budget|spend/.test(text)) return { intent: 'safe_daily_spend', category };
  if (/which budget.*(exceed|risk)|likely.*exceed.*budget|budget.*might.*exceed/.test(text)) return { intent: 'budget_risk', category };
  if (/will i exceed|projected.*budget/.test(text)) return { intent: 'budget_risk', category };
  if (/projected spending|how much will i spend|month.end spending|spending forecast/.test(text)) return { intent: 'forecast_expense' };
  if (/projected savings|savings.*month end|what will my savings/.test(text)) return { intent: 'forecast_savings' };
  if (/compare.*last month|more than last month|less than last month|month.*comparison/.test(text)) return { intent: 'month_comparison' };
  if (/largest expense|biggest expense|biggest transaction/.test(text)) return { intent: 'largest_expense' };
  if (/recent expense|spent recently|recent transaction/.test(text)) return { intent: 'recent_transactions' };
  if (/where.*spending.*most|top spending category|biggest spending category|which category.*most|category uses most/.test(text)) return { intent: 'top_category' };
  if (/exceeded any budget|budgets? almost used|how are my budgets|budget status/.test(text)) return { intent: 'budget_status', category };
  if (/budget.*left|remaining.*budget|how much.*budget.*left/.test(text)) return { intent: 'budget_remaining', category };
  if (category && /budget|close to/.test(text)) return { intent: 'budget_status', category };
  if (category && /spend|spent|expense|how much/.test(text)) return { intent: 'category_spending', category };
  if (/savings rate|rate.*saving/.test(text)) return { intent: 'savings_rate' };
  if (/how much.*sav|what are my savings|net savings/.test(text)) return { intent: 'savings' };
  if (/income|how much.*earn|earned/.test(text)) return { intent: 'income' };
  if (/how much.*spent|total expense|money did i spend|my expenses/.test(text)) return { intent: 'total_expense' };
  if (/summary|how am i doing|money looking|how are my finances/.test(text)) return { intent: 'summary' };
  if (/what can.*ask|help|capabilit/.test(text)) return { intent: 'help' };
  return { intent: 'unknown', category };
}

const periodOf = (date: string) => {
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(date);
  return match ? { year: Number(match[1]), month: Number(match[2]) } : null;
};

export function answerFinancialQuestion(
  question: string,
  transactions: TransactionData[],
  budgets: BudgetData[],
  now: Date,
  formatAmount: (amount: number) => string,
): string {
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const current = transactions.filter((transaction) => { const period = periodOf(transaction.date); return period?.month === month && period.year === year; });
  const expenses = current.filter((transaction) => Number(transaction.amount) < 0);
  const categories = Array.from(new Set([...transactions.map((item) => item.category), ...budgets.map((item) => item.category)].filter(Boolean)));
  const detected = detectFinancialIntent(question, categories);
  const insightResult = generateFinancialInsights(transactions, budgets, month, year, formatAmount);
  const forecast = calculateFinancialForecast(transactions, budgets, month, year, now);
  const summary = insightResult.summary;
  const category = detected.category;
  const selectedBudget = category ? budgets.find((budget) => categoryToken(budget.category) === categoryToken(category)) : undefined;
  const selectedCategorySpend = category ? expenses.filter((transaction) => categoryToken(transaction.category) === categoryToken(category)).reduce((sum, transaction) => sum + Math.abs(Number(transaction.amount) || 0), 0) : 0;

  if (detected.intent === 'non_financial') return "I'm currently focused on your Spendze finances. Ask me about your spending, income, budgets, savings, or forecasts.";
  if (detected.intent === 'help' || detected.intent === 'unknown') return "I can't answer that from your Spendze data yet. You can ask me about spending, income, savings, budgets, categories, recent transactions, or month-end forecasts.";
  if (current.length === 0 && !['budget_status', 'budget_remaining', 'budget_risk', 'safe_daily_spend'].includes(detected.intent)) return "I don't have current-month transaction data to answer that yet. Add a transaction and try again.";

  switch (detected.intent) {
    case 'summary': {
      const top = summary.topCategory ? `${summary.topCategory.name} is your top category at ${formatAmount(summary.topCategory.amount)}.` : 'There are no expense categories yet.';
      const rate = summary.savingsRate === null ? 'A savings rate is unavailable because no income is recorded.' : `Your savings rate is ${summary.savingsRate.toFixed(1)}%.`;
      return `This month you've recorded ${formatAmount(summary.monthlyIncome)} in income and ${formatAmount(summary.monthlyExpense)} in expenses, leaving net savings of ${formatAmount(summary.netSavings)}. ${rate} ${top} ${describeBudgetAttention(budgets)}`;
    }
    case 'total_expense': return `You've spent ${formatAmount(summary.monthlyExpense)} this month.`;
    case 'income': return `You've recorded ${formatAmount(summary.monthlyIncome)} in income this month.`;
    case 'savings': return summary.savingsRate === null ? `Your current net savings are ${formatAmount(summary.netSavings)}, but a savings rate is unavailable because no income is recorded.` : `Your net savings this month are ${formatAmount(summary.netSavings)}, which is ${summary.savingsRate.toFixed(1)}% of recorded income.`;
    case 'savings_rate': return summary.savingsRate === null ? "I can't calculate a savings rate because no income is recorded this month." : `Your savings rate this month is ${summary.savingsRate.toFixed(1)}%, based on ${formatAmount(summary.netSavings)} in net savings.`;
    case 'category_spending': return category ? `You've spent ${formatAmount(selectedCategorySpend)} on ${category} this month${summary.monthlyExpense > 0 ? `, about ${((selectedCategorySpend / summary.monthlyExpense) * 100).toFixed(1)}% of your total expenses` : ''}.` : 'Tell me which spending category you want to check.';
    case 'top_category': return summary.topCategory ? `${summary.topCategory.name} is your largest spending category this month at ${formatAmount(summary.topCategory.amount)}, representing about ${summary.topCategory.percent.toFixed(1)}% of expenses.` : 'There are no current-month expenses to identify a top category.';
    case 'budget_remaining':
    case 'budget_status': {
      if (category && !selectedBudget) return `I couldn't find a ${category} budget for this month.`;
      if (selectedBudget) { const remaining = Math.max(0, selectedBudget.amount - selectedBudget.spent); const { percent: usage, status } = classifyBudgetUsage(selectedBudget.spent, selectedBudget.amount); const statusText = status === 'exceeded' ? 'This budget is exceeded.' : status === 'almost-reached' ? 'This budget is almost at its limit.' : status === 'getting-close' ? 'This budget is getting close to its limit.' : 'This budget is within its normal range.'; return `Your ${selectedBudget.category} budget is ${formatAmount(selectedBudget.amount)}. You've spent ${formatAmount(selectedBudget.spent)} (${displayPercent(usage)}%), ${selectedBudget.spent >= selectedBudget.amount ? 'with nothing remaining.' : `leaving ${formatAmount(remaining)}.`} ${statusText}`; }
      if (budgets.length === 0) return "You don't have any budgets for this month yet.";
      return describeBudgetAttention(budgets);
    }
    case 'safe_daily_spend': {
      if (!category) return 'Tell me which category budget you want a safe daily amount for.';
      const item = forecast.categoryForecasts.find((entry) => categoryToken(entry.category) === categoryToken(category));
      if (!item?.budget) return `I couldn't find a ${category} budget for this month.`;
      if (item.risk === 'already-exceeded') return `Your ${item.category} budget has already been exceeded.`;
      return `To stay within your ${item.category} budget, average no more than approximately ${formatAmount(item.safeDailySpend ?? 0)} per day for the remaining ${forecast.daysRemaining} days.`;
    }
    case 'forecast_expense': return forecast.hasForecastData ? `At your current recorded pace, month-end spending is projected around ${formatAmount(forecast.projectedExpense)}. Forecast confidence is ${forecast.confidence}.` : 'I do not have enough current-month expense data to forecast spending yet.';
    case 'forecast_savings': return forecast.hasForecastData ? `At your current recorded pace, projected month-end net savings are ${formatAmount(forecast.projectedSavings)}${forecast.projectedSavingsRate === null ? '. No savings rate is available because no income is recorded.' : `, with a projected savings rate of ${forecast.projectedSavingsRate.toFixed(1)}%.`} Forecast confidence is ${forecast.confidence}.` : 'I do not have enough current-month expense data to forecast savings yet.';
    case 'budget_risk': {
      const risky = forecast.categoryForecasts.filter((item) => item.risk === 'likely-to-exceed' || item.risk === 'already-exceeded').filter((item) => !category || categoryToken(item.category) === categoryToken(category));
      if (risky.length === 0) return category ? `Your current pace does not indicate that the ${category} budget will be exceeded.` : 'No current budgets are projected to be exceeded at your recorded pace.';
      return `${risky.map((item) => item.risk === 'already-exceeded' ? `${item.category} is already over its ${formatAmount(item.budget ?? 0)} budget` : `${item.category} may exceed its ${formatAmount(item.budget ?? 0)} budget`).join('; ')}. This pace forecast currently has ${forecast.confidence} confidence.`;
    }
    case 'largest_expense': {
      const largest = [...expenses].sort((a, b) => Math.abs(Number(b.amount)) - Math.abs(Number(a.amount)))[0];
      return largest ? `Your largest expense this month is “${largest.name}” in ${largest.category} for ${formatAmount(Math.abs(Number(largest.amount)))} on ${largest.date}.` : 'There are no current-month expenses to compare.';
    }
    case 'recent_transactions': {
      const recent = [...expenses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
      return recent.length ? `Your recent expenses are:\n${recent.map((item) => `• ${item.name} — ${formatAmount(Math.abs(Number(item.amount)))} (${item.category}, ${item.date})`).join('\n')}` : 'There are no current-month expenses to show.';
    }
    case 'month_comparison': {
      const previous = new Date(year, month - 2, 1);
      const previousExpense = transactions.reduce((sum, transaction) => { const period = periodOf(transaction.date); return period?.year === previous.getFullYear() && period.month === previous.getMonth() + 1 && Number(transaction.amount) < 0 ? sum + Math.abs(Number(transaction.amount) || 0) : sum; }, 0);
      if (previousExpense === 0) return "I don't have enough previous-month transaction data to make that comparison yet.";
      const change = ((summary.monthlyExpense - previousExpense) / previousExpense) * 100;
      return `You spent ${formatAmount(summary.monthlyExpense)} this month versus ${formatAmount(previousExpense)} last month — ${Math.abs(change).toFixed(1)}% ${change >= 0 ? 'more' : 'less'}.`;
    }
    default: return "I can't answer that from your Spendze data yet.";
  }
}
