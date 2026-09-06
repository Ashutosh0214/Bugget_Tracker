import React, { useMemo, useState } from 'react';
import { CalendarDays, X } from 'lucide-react';
import { ApiError, transactionApi, TransactionData, TransactionWriteData } from '../lib/api';

interface SetupField {
  key: string;
  title: string;
  category: string;
  type: 'income' | 'expense';
}

interface SetupSection {
  title: string;
  fields: SetupField[];
}

const SETUP_SECTIONS: SetupSection[] = [
  {
    title: 'Income',
    fields: [
      { key: 'monthlyIncome', title: 'Monthly Income', category: 'Income', type: 'income' },
      { key: 'otherIncome', title: 'Other Income', category: 'Income', type: 'income' },
    ],
  },
  {
    title: 'Fixed Expenses',
    fields: [
      { key: 'houseRent', title: 'House Rent', category: 'Bills', type: 'expense' },
      { key: 'electricityBill', title: 'Electricity Bill', category: 'Bills', type: 'expense' },
      { key: 'waterBill', title: 'Water Bill', category: 'Bills', type: 'expense' },
      { key: 'internetWifi', title: 'Internet / Wi-Fi', category: 'Bills', type: 'expense' },
      { key: 'mobileBill', title: 'Mobile Bill', category: 'Bills', type: 'expense' },
      { key: 'emiLoan', title: 'EMI / Loan', category: 'Bills', type: 'expense' },
      { key: 'subscriptions', title: 'Subscriptions', category: 'Bills', type: 'expense' },
    ],
  },
  {
    title: 'Living Expenses',
    fields: [
      { key: 'groceries', title: 'Groceries', category: 'Groceries', type: 'expense' },
      { key: 'travelTransport', title: 'Travel / Transport', category: 'Transport', type: 'expense' },
      { key: 'fuel', title: 'Fuel', category: 'Transport', type: 'expense' },
      { key: 'healthMedical', title: 'Health / Medical', category: 'Health', type: 'expense' },
      { key: 'education', title: 'Education', category: 'Education', type: 'expense' },
    ],
  },
  {
    title: 'Lifestyle / Flexible Expenses',
    fields: [
      { key: 'entertainment', title: 'Entertainment', category: 'Entertainment', type: 'expense' },
      { key: 'shopping', title: 'Shopping', category: 'Shopping', type: 'expense' },
      { key: 'diningOut', title: 'Dining / Eating Out', category: 'Dining', type: 'expense' },
      { key: 'miscellaneous', title: 'Miscellaneous', category: 'Miscellaneous', type: 'expense' },
    ],
  },
];

const ALL_FIELDS = SETUP_SECTIONS.flatMap((section) => section.fields);
const EMPTY_AMOUNTS = Object.fromEntries(ALL_FIELDS.map((field) => [field.key, ''])) as Record<string, string>;
const MONTH_NAMES = Array.from({ length: 12 }, (_, index) =>
  new Date(2026, index, 1).toLocaleDateString('en-IN', { month: 'long' }),
);

export interface MonthlySetupModalProps {
  onClose: () => void;
  onSaved: (transactions: TransactionData[], message: string) => void;
}

export default function MonthlySetupModal({ onClose, onSaved }: MonthlySetupModalProps) {
  const today = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [amounts, setAmounts] = useState<Record<string, string>>(EMPTY_AMOUNTS);
  const [error, setError] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const liveSummary = useMemo(() => {
    let income = 0;
    let expenses = 0;
    for (const field of ALL_FIELDS) {
      const amount = Number(amounts[field.key]);
      if (!Number.isFinite(amount) || amount <= 0) continue;
      if (field.type === 'income') income += amount;
      else expenses += amount;
    }
    return { income, expenses, savings: income - expenses };
  }, [amounts]);
  const formatINR = (amount: number) => new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

  const saveSetup = async (allowDuplicates = false) => {
    if (isSaving) return;

    const selected: TransactionWriteData[] = [];
    for (const field of ALL_FIELDS) {
      const rawValue = amounts[field.key].trim();
      if (!rawValue) continue;
      const amount = Number(rawValue);
      if (!Number.isFinite(amount) || amount < 0) {
        setError(`${field.title} must be a valid amount of zero or more.`);
        return;
      }
      if (amount === 0) continue;
      selected.push({
        name: field.title,
        category: field.category,
        amount: field.type === 'income' ? amount : -amount,
        date: `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-01`,
        status: 'Completed',
        icon: field.type === 'income' ? '💰' : '💸',
      });
    }

    if (selected.length === 0) {
      setError('Enter at least one income or expense amount.');
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      const result = await transactionApi.createMonthlySetup({
        month,
        year,
        transactions: selected,
        allow_duplicates: allowDuplicates,
      });
      onSaved(
        result.transactions,
        `${result.count} ${result.count === 1 ? 'transaction' : 'transactions'} added for ${MONTH_NAMES[month - 1]} ${year}.`,
      );
    } catch (caught: unknown) {
      if (caught instanceof ApiError && caught.status === 409) {
        setDuplicateWarning(true);
        setError(`Monthly setup entries already exist for ${MONTH_NAMES[month - 1]} ${year}.`);
      } else {
        setError('Monthly setup could not be saved. No transactions were added.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void saveSetup(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm animate-in fade-in sm:p-5">
      <div role="dialog" aria-modal="true" aria-labelledby="monthly-setup-title" className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
        <div className="flex shrink-0 items-start justify-between border-b border-border px-5 py-4 sm:px-6">
          <div>
            <h2 id="monthly-setup-title" className="text-lg font-bold text-foreground">Monthly Financial Setup</h2>
            <p className="mt-1 text-xs text-muted-foreground">Add your common income and monthly expenses in one go.</p>
          </div>
          <button type="button" onClick={onClose} disabled={isSaving} aria-label="Close monthly setup" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 pb-6 sm:px-6">
            <div className="grid grid-cols-1 gap-3 rounded-2xl border border-border bg-muted/25 p-4 sm:grid-cols-2">
              <div>
                <label htmlFor="monthly-setup-month" className="mb-1 block text-xs font-semibold text-muted-foreground">Month</label>
                <select id="monthly-setup-month" value={month} onChange={(event) => { setMonth(Number(event.target.value)); setDuplicateWarning(false); setError(''); }} className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs text-foreground outline-none focus:border-violet-500">
                  {MONTH_NAMES.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="monthly-setup-year" className="mb-1 block text-xs font-semibold text-muted-foreground">Year</label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input id="monthly-setup-year" type="number" min="2000" max="2200" required value={year} onChange={(event) => { setYear(Number(event.target.value)); setDuplicateWarning(false); setError(''); }} className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3.5 text-xs text-foreground outline-none focus:border-violet-500" />
                </div>
              </div>
            </div>

            {error && (
              <p role="alert" className={`rounded-xl border p-3 text-xs font-medium ${duplicateWarning ? 'border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'border-destructive/20 bg-destructive/10 text-destructive'}`}>
                {error}
              </p>
            )}

            {SETUP_SECTIONS.map((section) => (
              <section key={section.title}>
                <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-violet-500">{section.title}</h3>
                <div className="grid grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-2">
                  {section.fields.map((field) => (
                    <label key={field.key} className="block">
                      <span className="mb-1 block text-xs font-semibold text-muted-foreground">{field.title}</span>
                      <span className="block">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          value={amounts[field.key]}
                          onChange={(event) => { setAmounts((current) => ({ ...current, [field.key]: event.target.value })); setDuplicateWarning(false); setError(''); }}
                          placeholder="₹ 0"
                          aria-label={`${field.title} amount in INR`}
                          className="w-full appearance-none rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-violet-500 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                      </span>
                    </label>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="flex shrink-0 flex-col gap-3 border-t border-border bg-card px-5 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
            <p aria-live="polite" className="text-[11px] font-semibold leading-relaxed text-muted-foreground">
              <span className="text-emerald-600 dark:text-emerald-400">Income {formatINR(liveSummary.income)}</span>
              <span aria-hidden="true"> • </span>
              <span>Expenses {formatINR(liveSummary.expenses)}</span>
              <span aria-hidden="true"> • </span>
              <span className={liveSummary.savings < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-violet-600 dark:text-violet-300'}>
                Expected Savings {formatINR(liveSummary.savings)}{liveSummary.savings < 0 ? ' (overspending)' : ''}
              </span>
            </p>
            <div className="flex shrink-0 gap-2">
              <button type="button" onClick={onClose} disabled={isSaving} className="flex-1 rounded-xl border border-border bg-muted px-5 py-2.5 text-xs font-semibold text-foreground hover:bg-muted/80 disabled:opacity-60 sm:flex-none">Cancel</button>
              {duplicateWarning && (
                <button type="button" onClick={() => void saveSetup(true)} disabled={isSaving} className="flex-1 rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-2.5 text-xs font-bold text-amber-600 hover:bg-amber-500/15 disabled:opacity-60 dark:text-amber-400 sm:flex-none">
                  {isSaving ? 'Saving...' : 'Add Anyway'}
                </button>
              )}
              {!duplicateWarning && (
                <button type="submit" disabled={isSaving} className="flex-1 rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-violet-600/30 hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none">
                  {isSaving ? 'Saving Setup...' : 'Save Monthly Setup'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
