export type BudgetUsageStatus = 'normal' | 'getting-close' | 'almost-reached' | 'exceeded';

export const classifyBudgetUsage = (spent: number, amount: number): { percent: number; status: BudgetUsageStatus } => {
  const percent = amount > 0 ? (spent / amount) * 100 : 0;
  if (percent >= 100) return { percent, status: 'exceeded' };
  if (percent >= 90) return { percent, status: 'almost-reached' };
  if (percent >= 70) return { percent, status: 'getting-close' };
  return { percent, status: 'normal' };
};
