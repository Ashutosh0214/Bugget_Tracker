import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from './sideBar';
import CustomSelect from './ui/CustomSelect';
import TextAnimation from '@/components/ui/staggerText';
import { useAuth } from '../context/AuthContext';
import { budgetApi, BudgetData, BudgetWriteData, transactionApi, TransactionData, TransactionWriteData } from '../lib/api';

import { 
  Search, 
  Bell, 
  Plus, 
  ArrowDownRight, 
  Wallet, 
  PiggyBank, 
  Sparkles, 
  Send, 
  Bot,
  ArrowRight,
  DollarSign,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';

export interface DashboardLayoutProps {
  mode?: 'light' | 'dark';
  onToggleMode?: () => void;
  onExitDashboard?: () => void;
}

export interface ChatMessage {
  sender: 'ai' | 'user';
  text: string;
}

type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP';

const CURRENCY_STORAGE_KEY = 'spendzy_currency';
const SUPPORTED_CURRENCIES: CurrencyCode[] = ['INR', 'USD', 'EUR', 'GBP'];
const CURRENCY_LOCALES: Record<CurrencyCode, string> = {
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
};

const getInitialCurrency = (): CurrencyCode => {
  const savedCurrency = localStorage.getItem(CURRENCY_STORAGE_KEY);
  return SUPPORTED_CURRENCIES.includes(savedCurrency as CurrencyCode)
    ? (savedCurrency as CurrencyCode)
    : 'INR';
};

interface DashboardSummary {
  netWorth: number;
  monthlyExpense: number;
  monthlyIncome: number;
  savingsRate: number;
}

interface MonthlyCashFlow {
  key: string;
  month: string;
  income: number;
  expense: number;
}

interface CategoryBreakdown {
  category: string;
  amount: number;
  percent: number;
  color: string;
}

const ANALYTICS_COLORS = ['#7c3aed', '#4f46e5', '#f59e0b', '#f43f5e', '#10b981', '#06b6d4', '#8b5cf6', '#64748b'];

const getDatePeriod = (date: string): { month: number; year: number } | null => {
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(date);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]) };
};

interface TransactionFormState {
  name: string;
  amount: string;
  category: string;
  type: 'income' | 'expense';
}

interface BudgetFormState extends Omit<BudgetWriteData, 'amount'> {
  amount: string;
}

const EMPTY_TRANSACTION_FORM: TransactionFormState = {
  name: '',
  amount: '',
  category: 'Groceries',
  type: 'expense',
};

const DEFAULT_CATEGORIES = [
  'Groceries',
  'Shopping',
  'Miscellaneous',
  'Technology',
  'Entertainment',
  'Transport',
  'Income',
];
const BUDGET_CATEGORIES = ['Groceries', 'Entertainment', 'Transport', 'Shopping', 'Bills', 'Dining', 'Health', 'Education', 'Miscellaneous', 'Other'];
const MONTH_NAMES = Array.from({ length: 12 }, (_, index) =>
  new Date(2026, index, 1).toLocaleDateString('en-IN', { month: 'long' }),
);

const formatDisplayLabel = (value: string): string =>
  value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value;

const getTransactionType = (transaction: TransactionData): 'income' | 'expense' =>
  transaction.amount >= 0 ? 'income' : 'expense';

const parseTransactionDate = (date: string): Date | null => {
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getInitials = (name?: string): string => {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length === 0) return 'U';
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase();
};

const getBudgetStatus = (percent: number) => {
  if (percent >= 100) return { label: 'Exceeded', bar: 'bg-rose-500', badge: 'bg-rose-500/10 text-rose-500 border-rose-500/20' };
  if (percent >= 90) return { label: 'Warning', bar: 'bg-amber-500', badge: 'bg-amber-500/10 text-amber-500 border-amber-500/20' };
  if (percent >= 70) return { label: 'Getting close', bar: 'bg-violet-500', badge: 'bg-violet-500/10 text-violet-500 border-violet-500/20' };
  return { label: 'Safe', bar: 'bg-emerald-500', badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' };
};

export default function DashboardLayout({ mode = 'light', onToggleMode, onExitDashboard }: DashboardLayoutProps) {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState<boolean>(true);
  const [transactionsError, setTransactionsError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [currency, setCurrency] = useState<CurrencyCode>(getInitialCurrency);
  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat(CURRENCY_LOCALES[currency], {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    [currency],
  );
  const formatCurrency = (amount: number) => currencyFormatter.format(amount);
  const formatSignedCurrency = (amount: number) =>
    `${amount > 0 ? '+' : '-'}${formatCurrency(Math.abs(amount))}`;
  
  // New Transaction Form State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newTx, setNewTx] = useState<TransactionFormState>(EMPTY_TRANSACTION_FORM);
  const [editingTransaction, setEditingTransaction] = useState<TransactionData | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<TransactionData | null>(null);
  const [openActionId, setOpenActionId] = useState<string | number | null>(null);
  const [transactionMutationError, setTransactionMutationError] = useState<string>('');
  const [isSavingTransaction, setIsSavingTransaction] = useState<boolean>(false);
  const [isDeletingTransaction, setIsDeletingTransaction] = useState<boolean>(false);
  const currentDate = new Date();
  const [selectedBudgetMonth, setSelectedBudgetMonth] = useState(currentDate.getMonth() + 1);
  const [selectedBudgetYear, setSelectedBudgetYear] = useState(currentDate.getFullYear());
  const [budgets, setBudgets] = useState<BudgetData[]>([]);
  const [budgetsLoading, setBudgetsLoading] = useState(false);
  const [budgetsError, setBudgetsError] = useState('');
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetData | null>(null);
  const [deletingBudget, setDeletingBudget] = useState<BudgetData | null>(null);
  const [budgetForm, setBudgetForm] = useState<BudgetFormState>({
    category: 'Groceries', amount: '5000', month: currentDate.getMonth() + 1, year: currentDate.getFullYear(),
  });
  const [budgetMutationError, setBudgetMutationError] = useState('');
  const [isSavingBudget, setIsSavingBudget] = useState(false);
  const [isDeletingBudget, setIsDeletingBudget] = useState(false);
  const [openBudgetActionId, setOpenBudgetActionId] = useState<string | number | null>(null);

  const userFirstName = user?.name.trim().split(/\s+/)[0] || 'there';
  const userInitials = getInitials(user?.name);

  // AI Assistant Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { sender: 'ai', text: 'I am your Spendzy AI Assistant. Add transactions to unlock personalized financial insights.' }
  ]);
  const [chatInput, setChatInput] = useState<string>('');

  // Fetch only the authenticated user's transactions from the existing API.
  useEffect(() => {
    let cancelled = false;

    if (!isAuthenticated) {
      setTransactions([]);
      setTransactionsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setTransactionsLoading(true);
    setTransactionsError('');
    transactionApi
      .getAll()
      .then((res) => {
        if (!cancelled) setTransactions(Array.isArray(res.transactions) ? res.transactions : []);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error('Failed to load transactions:', error);
        setTransactions([]);
        setTransactionsError('We could not load your transactions. Please try again later.');
      })
      .finally(() => {
        if (!cancelled) setTransactionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated || (activeTab !== 'budgets' && activeTab !== 'analytics')) return;
    setBudgetsLoading(true);
    setBudgetsError('');
    budgetApi.getAll(selectedBudgetMonth, selectedBudgetYear)
      .then((response) => {
        if (!cancelled) setBudgets(response.budgets);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error('Failed to load budgets:', error);
        setBudgetsError('Unable to load budgets. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setBudgetsLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeTab, isAuthenticated, selectedBudgetMonth, selectedBudgetYear, transactions]);

  const summary = useMemo<DashboardSummary>(() => {
    const now = new Date();
    let totalIncome = 0;
    let totalExpenses = 0;
    let monthlyIncome = 0;
    let monthlyExpense = 0;

    for (const transaction of transactions) {
      const amount = Number(transaction.amount);
      if (!Number.isFinite(amount)) continue;

      const type = getTransactionType(transaction);
      const absoluteAmount = Math.abs(amount);
      if (type === 'income') totalIncome += absoluteAmount;
      else totalExpenses += absoluteAmount;

      const transactionDate = parseTransactionDate(transaction.date);
      const isCurrentMonth = transactionDate
        && transactionDate.getFullYear() === now.getFullYear()
        && transactionDate.getMonth() === now.getMonth();
      if (!isCurrentMonth) continue;

      if (type === 'income') monthlyIncome += absoluteAmount;
      else monthlyExpense += absoluteAmount;
    }

    const rawSavingsRate = monthlyIncome > 0
      ? ((monthlyIncome - monthlyExpense) / monthlyIncome) * 100
      : 0;

    return {
      netWorth: totalIncome - totalExpenses,
      monthlyExpense,
      monthlyIncome,
      savingsRate: Number.isFinite(rawSavingsRate) ? Math.max(0, Math.min(100, rawSavingsRate)) : 0,
    };
  }, [transactions]);

  const cashFlow = useMemo<MonthlyCashFlow[]>(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      return {
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        month: date.toLocaleDateString('en-IN', { month: 'short' }),
        income: 0,
        expense: 0,
      };
    });
    const byMonth = new Map(months.map((month) => [month.key, month]));

    for (const transaction of transactions) {
      const date = parseTransactionDate(transaction.date);
      const amount = Number(transaction.amount);
      if (!date || !Number.isFinite(amount)) continue;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const month = byMonth.get(key);
      if (!month) continue;
      month[getTransactionType(transaction)] += Math.abs(amount);
    }

    return months;
  }, [transactions]);

  const cashFlowMaximum = useMemo(
    () => Math.max(0, ...cashFlow.flatMap((month) => [month.income, month.expense])),
    [cashFlow],
  );
  const sixMonthIncome = cashFlow.reduce((total, month) => total + month.income, 0);
  const sixMonthExpense = cashFlow.reduce((total, month) => total + month.expense, 0);

  const transactionCategories = useMemo(() => {
    const categoryMap = new Map<string, string>();
    for (const category of DEFAULT_CATEGORIES) categoryMap.set(category.toLowerCase(), category);
    for (const transaction of transactions) {
      const category = transaction.category.trim();
      if (category) categoryMap.set(category.toLowerCase(), formatDisplayLabel(category));
    }
    return Array.from(categoryMap.values()).sort((first, second) => first.localeCompare(second));
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return transactions.filter((transaction) => {
      const matchesCategory = categoryFilter === 'All'
        || transaction.category.toLowerCase() === categoryFilter.toLowerCase();
      const matchesSearch = !normalizedSearch
        || transaction.name.toLowerCase().includes(normalizedSearch)
        || transaction.category.toLowerCase().includes(normalizedSearch);
      return matchesCategory && matchesSearch;
    });
  }, [categoryFilter, searchTerm, transactions]);

  const analytics = useMemo(() => {
    const selected = transactions.filter((transaction) => {
      const period = getDatePeriod(transaction.date);
      return period?.month === selectedBudgetMonth && period.year === selectedBudgetYear;
    });
    const expenses = selected.filter((transaction) => getTransactionType(transaction) === 'expense');
    const income = selected
      .filter((transaction) => getTransactionType(transaction) === 'income')
      .reduce((total, transaction) => total + Math.abs(Number(transaction.amount) || 0), 0);
    const expense = expenses.reduce((total, transaction) => total + Math.abs(Number(transaction.amount) || 0), 0);
    const netSavings = income - expense;
    const savingsRate = income > 0 ? (netSavings / income) * 100 : 0;

    const categoryTotals = new Map<string, { label: string; amount: number }>();
    for (const transaction of expenses) {
      const key = transaction.category.trim().toLowerCase() || 'other';
      const current = categoryTotals.get(key);
      categoryTotals.set(key, {
        label: current?.label ?? formatDisplayLabel(transaction.category.trim() || 'Other'),
        amount: (current?.amount ?? 0) + Math.abs(Number(transaction.amount) || 0),
      });
    }
    const categories: CategoryBreakdown[] = Array.from(categoryTotals.entries())
      .map(([key, item]) => ({
        category: item.label,
        amount: item.amount,
        percent: expense > 0 ? (item.amount / expense) * 100 : 0,
        color: ANALYTICS_COLORS[[...key].reduce((sum, character) => sum + character.charCodeAt(0), 0) % ANALYTICS_COLORS.length],
      }))
      .sort((first, second) => second.amount - first.amount);

    const trend: MonthlyCashFlow[] = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(selectedBudgetYear, selectedBudgetMonth - 1 - (5 - index), 1);
      return {
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        month: date.toLocaleDateString('en-IN', { month: 'short' }),
        income: 0,
        expense: 0,
      };
    });
    const trendByKey = new Map(trend.map((item) => [item.key, item]));
    for (const transaction of transactions) {
      const period = getDatePeriod(transaction.date);
      if (!period) continue;
      const item = trendByKey.get(`${period.year}-${String(period.month).padStart(2, '0')}`);
      if (!item) continue;
      item[getTransactionType(transaction)] += Math.abs(Number(transaction.amount) || 0);
    }

    const previousDate = new Date(selectedBudgetYear, selectedBudgetMonth - 2, 1);
    const previousExpense = transactions.reduce((total, transaction) => {
      const period = getDatePeriod(transaction.date);
      return period?.month === previousDate.getMonth() + 1
        && period.year === previousDate.getFullYear()
        && getTransactionType(transaction) === 'expense'
        ? total + Math.abs(Number(transaction.amount) || 0)
        : total;
    }, 0);
    const selectedPeriodStart = new Date(selectedBudgetYear, selectedBudgetMonth - 1, 1);
    const currentPeriodStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const daysForAverage = selectedPeriodStart.getTime() === currentPeriodStart.getTime()
      ? currentDate.getDate()
      : new Date(selectedBudgetYear, selectedBudgetMonth, 0).getDate();

    return {
      selected,
      income,
      expense,
      netSavings,
      savingsRate,
      categories,
      trend,
      trendMaximum: Math.max(0, ...trend.flatMap((item) => [item.income, item.expense])),
      previousExpense,
      topCategory: categories[0] ?? null,
      largestExpense: Math.max(0, ...expenses.map((transaction) => Math.abs(Number(transaction.amount) || 0))),
      averageDailySpend: expense / Math.max(1, daysForAverage),
      expenseCount: expenses.length,
    };
  }, [currentDate, selectedBudgetMonth, selectedBudgetYear, transactions]);

  const analyticsDonut = useMemo(() => {
    if (analytics.categories.length === 0) return 'conic-gradient(hsl(var(--muted)) 0 100%)';
    let offset = 0;
    const stops = analytics.categories.map((category) => {
      const start = offset;
      offset += category.percent;
      return `${category.color} ${start}% ${offset}%`;
    });
    return `conic-gradient(${stops.join(', ')})`;
  }, [analytics.categories]);

  useEffect(() => {
    localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
  }, [currency]);

  const openAddTransaction = () => {
    setEditingTransaction(null);
    setNewTx(EMPTY_TRANSACTION_FORM);
    setTransactionMutationError('');
    setOpenActionId(null);
    setShowAddModal(true);
  };

  const openEditTransaction = (transaction: TransactionData) => {
    setEditingTransaction(transaction);
    setNewTx({
      name: transaction.name,
      amount: String(Math.abs(Number(transaction.amount))),
      category: transaction.category,
      type: getTransactionType(transaction),
    });
    setTransactionMutationError('');
    setOpenActionId(null);
    setShowAddModal(true);
  };

  const closeTransactionModal = () => {
    if (isSavingTransaction) return;
    setShowAddModal(false);
    setEditingTransaction(null);
    setNewTx(EMPTY_TRANSACTION_FORM);
    setTransactionMutationError('');
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTx.name.trim() || !newTx.amount || isSavingTransaction) return;

    const numAmount = parseFloat(newTx.amount);
    if (!Number.isFinite(numAmount) || numAmount < 0) {
      setTransactionMutationError('Please enter a valid positive amount.');
      return;
    }
    const finalAmount = newTx.type === 'expense' ? -Math.abs(numAmount) : Math.abs(numAmount);

    const createdData: TransactionWriteData = {
      name: newTx.name.trim(),
      category: newTx.category,
      amount: finalAmount,
      date: editingTransaction?.date || new Date().toISOString().split('T')[0],
      status: editingTransaction?.status || 'Completed',
      icon: newTx.type === 'expense' ? '💸' : '💰',
    };

    if (!isAuthenticated) return;

    setIsSavingTransaction(true);
    setTransactionMutationError('');
    try {
      const res = editingTransaction?.id !== undefined
        ? await transactionApi.update(editingTransaction.id, createdData)
        : await transactionApi.create(createdData);
      if (res.transaction) {
        setTransactions((current) => editingTransaction?.id !== undefined
          ? current.map((transaction) => transaction.id === editingTransaction.id ? res.transaction : transaction)
          : [res.transaction, ...current]);
        setTransactionsError('');
      }
    } catch (error: unknown) {
      console.error(`Failed to ${editingTransaction ? 'update' : 'create'} transaction:`, error);
      setTransactionMutationError(
        editingTransaction ? 'Unable to update transaction. Please try again.' : 'Unable to add transaction. Please try again.',
      );
      return;
    } finally {
      setIsSavingTransaction(false);
    }

    setShowAddModal(false);
    setEditingTransaction(null);
    setNewTx(EMPTY_TRANSACTION_FORM);
  };

  const handleDeleteTransaction = async () => {
    if (deletingTransaction?.id === undefined || isDeletingTransaction) return;
    setIsDeletingTransaction(true);
    setTransactionMutationError('');
    try {
      await transactionApi.delete(deletingTransaction.id);
      setTransactions((current) => current.filter((transaction) => transaction.id !== deletingTransaction.id));
      setTransactionsError('');
      setDeletingTransaction(null);
    } catch (error: unknown) {
      console.error('Failed to delete transaction:', error);
      setTransactionMutationError('Unable to delete transaction. Please try again.');
    } finally {
      setIsDeletingTransaction(false);
    }
  };

  const openCreateBudget = () => {
    setEditingBudget(null);
    setBudgetForm({ category: 'Groceries', amount: '5000', month: selectedBudgetMonth, year: selectedBudgetYear });
    setBudgetMutationError('');
    setShowBudgetModal(true);
  };

  const openEditBudget = (budget: BudgetData) => {
    setEditingBudget(budget);
    setBudgetForm({ category: budget.category, amount: String(budget.amount), month: budget.month, year: budget.year });
    setBudgetMutationError('');
    setOpenBudgetActionId(null);
    setShowBudgetModal(true);
  };

  const handleSaveBudget = async (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(budgetForm.amount);
    if (!Number.isFinite(amount) || amount <= 0 || isSavingBudget) {
      setBudgetMutationError('Monthly limit must be greater than zero.');
      return;
    }
    const payload: BudgetWriteData = { ...budgetForm, amount };
    setIsSavingBudget(true);
    setBudgetMutationError('');
    try {
      const response = editingBudget
        ? await budgetApi.update(editingBudget.id, payload)
        : await budgetApi.create(payload);
      if (response.budget.month === selectedBudgetMonth && response.budget.year === selectedBudgetYear) {
        setBudgets((current) => editingBudget
          ? current.map((budget) => budget.id === editingBudget.id ? response.budget : budget)
          : [...current, response.budget].sort((a, b) => a.category.localeCompare(b.category)));
      } else if (editingBudget) {
        setBudgets((current) => current.filter((budget) => budget.id !== editingBudget.id));
      }
      setShowBudgetModal(false);
      setEditingBudget(null);
    } catch (error: unknown) {
      console.error(`Failed to ${editingBudget ? 'update' : 'create'} budget:`, error);
      const message = error instanceof Error && error.message.includes('already exists')
        ? 'A budget already exists for this category and month.'
        : `Unable to ${editingBudget ? 'update' : 'create'} budget. Please try again.`;
      setBudgetMutationError(message);
    } finally {
      setIsSavingBudget(false);
    }
  };

  const handleDeleteBudget = async () => {
    if (!deletingBudget || isDeletingBudget) return;
    setIsDeletingBudget(true);
    setBudgetMutationError('');
    try {
      await budgetApi.delete(deletingBudget.id);
      setBudgets((current) => current.filter((budget) => budget.id !== deletingBudget.id));
      setDeletingBudget(null);
    } catch (error: unknown) {
      console.error('Failed to delete budget:', error);
      setBudgetMutationError('Unable to delete budget. Please try again.');
    } finally {
      setIsDeletingBudget(false);
    }
  };

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg: ChatMessage = { sender: 'user', text: chatInput };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');

    // Real AI analysis is not connected yet, so never invent financial advice.
    setTimeout(() => {
      const aiText = transactions.length === 0
        ? 'Add some transactions to unlock personalized insights.'
        : 'Personalized AI analysis is not available yet. Your dashboard totals are calculated from your saved transactions.';
      setChatMessages((prev) => [...prev, { sender: 'ai', text: aiText }]);
    }, 800);
  };

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden font-sans">
      {/* Left Sidebar */}
      <Sidebar 
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        mode={mode}
        onToggleMode={onToggleMode}
        onExitDashboard={onExitDashboard}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-muted/20">
        
        {/* Top Header Bar */}
        <header className="h-16 px-6 border-b border-border bg-card/80 backdrop-blur-md flex items-center justify-between gap-4 shrink-0 z-20">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search transactions, budgets, or ask AI..."
                className="w-full rounded-xl border border-border bg-muted/40 pl-10 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Action Button */}
            <button
              onClick={openAddTransaction}
              className="flex items-center gap-2 rounded-xl bg-violet-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-violet-600/30 hover:bg-violet-700 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Expense</span>
            </button>

            {/* Notification Bell */}
            <button className="relative p-2 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-violet-500 ring-2 ring-card" />
            </button>

            {/* User Profile */}
            <div className="flex items-center gap-2 pl-2 border-l border-border">
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-md">
                {userInitials}
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Tab Body */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TAB 1: DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Welcome Banner */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 rounded-3xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-700 text-white shadow-xl shadow-violet-600/20">
                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-violet-200 bg-white/10 px-3 py-1 rounded-full border border-white/20">
                    Financial Overview
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    <TextAnimation divideBy="word" delay={0.1}>
                      {`Welcome back, ${userFirstName}! 👋`}
                    </TextAnimation>
                  </h1>
                  <p className="text-xs sm:text-sm text-violet-100/90">
                    <TextAnimation divideBy="word" delay={0.25}>
                      Here is your real-time financial status & AI smart suggestions.
                    </TextAnimation>
                  </p>
                </div>
                <button 
                  onClick={() => setActiveTab('ai-insights')}
                  className="group flex items-center gap-2 rounded-xl bg-white text-violet-950 px-4 py-2.5 text-xs font-bold shadow-lg hover:bg-violet-50 transition-all cursor-pointer"
                >
                  <Sparkles className="h-4 w-4 text-violet-600 group-hover:rotate-12 transition-transform" />
                  <span>View AI Insights</span>
                </button>
              </div>

              {/* Stat Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                
                {/* Total Balance */}
                <div className="p-5 rounded-2xl border border-border bg-card shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-muted-foreground">Total Net Worth</span>
                    <div className="p-2 rounded-xl bg-violet-500/10 text-violet-500">
                      <Wallet className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-foreground tracking-tight">
                      {transactionsLoading ? '—' : formatCurrency(summary.netWorth)}
                    </h3>
                    <div className="h-4 mt-1" />
                  </div>
                </div>

                {/* Monthly Spend */}
                <div className="p-5 rounded-2xl border border-border bg-card shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-muted-foreground">Monthly Expense</span>
                    <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
                      <ArrowDownRight className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-foreground tracking-tight">
                      {transactionsLoading ? '—' : formatCurrency(summary.monthlyExpense)}
                    </h3>
                    <div className="h-4 mt-1" />
                  </div>
                </div>

                {/* Monthly Income */}
                <div className="p-5 rounded-2xl border border-border bg-card shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-muted-foreground">Monthly Income</span>
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                      <DollarSign className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-foreground tracking-tight">
                      {transactionsLoading ? '—' : formatCurrency(summary.monthlyIncome)}
                    </h3>
                    <div className="h-4 mt-1" />
                  </div>
                </div>

                {/* Savings Goal */}
                <div className="p-5 rounded-2xl border border-border bg-card shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-muted-foreground">Savings Rate</span>
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                      <PiggyBank className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-foreground tracking-tight">
                      {transactionsLoading ? '—' : `${summary.savingsRate.toFixed(1).replace(/\.0$/, '')}%`}
                    </h3>
                    <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden mt-2">
                      <div
                        className="bg-amber-500 h-full rounded-full transition-all duration-500"
                        style={{ width: transactionsLoading ? '0%' : `${summary.savingsRate}%` }}
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Main Visual Section: Income vs Expense Chart & Quick Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Cash Flow Visualizer Chart */}
                <div className="lg:col-span-2 p-6 rounded-3xl border border-border bg-card shadow-sm space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-base font-bold text-foreground">Cash Flow Overview</h2>
                      <p className="text-xs text-muted-foreground">Income vs Expenses over the past 6 months</p>
                    </div>
                    <span className="text-xs font-semibold bg-violet-500/10 text-violet-500 px-2.5 py-1 rounded-lg border border-violet-500/20">
                      {new Date().getFullYear()} YTD
                    </span>
                  </div>

                  {transactionsLoading ? (
                    <div className="h-56 rounded-2xl bg-muted/40 animate-pulse" aria-label="Loading cash-flow data" />
                  ) : cashFlowMaximum === 0 ? (
                    <div className="h-56 flex flex-col items-center justify-center text-center px-6">
                      <p className="text-sm font-bold text-foreground">No cash-flow data yet</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Add your first income or expense to start tracking your finances.
                      </p>
                    </div>
                  ) : (
                    <div className="h-56 flex items-end justify-between gap-3 pt-6 px-2">
                      {cashFlow.map((item) => (
                        <div key={item.key} className="flex-1 flex flex-col items-center gap-2 group">
                          <div className="w-full flex justify-center items-end gap-1.5 h-44">
                            <div
                              style={{ height: `${(item.income / cashFlowMaximum) * 100}%` }}
                              className="w-1/2 max-w-[20px] bg-violet-600 rounded-t-md group-hover:bg-violet-500 transition-all shadow-sm"
                              title={`Income: ${formatCurrency(item.income)}`}
                            />
                            <div
                              style={{ height: `${(item.expense / cashFlowMaximum) * 100}%` }}
                              className="w-1/2 max-w-[20px] bg-rose-500/80 rounded-t-md group-hover:bg-rose-500 transition-all shadow-sm"
                              title={`Expense: ${formatCurrency(item.expense)}`}
                            />
                          </div>
                          <span className="text-[11px] font-semibold text-muted-foreground">{item.month}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-6 pt-2 border-t border-border/60 text-xs font-medium">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-violet-600" />
                      <span>Income ({transactionsLoading ? '—' : formatCurrency(sixMonthIncome)})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-rose-500" />
                      <span>Expenses ({transactionsLoading ? '—' : formatCurrency(sixMonthExpense)})</span>
                    </div>
                  </div>
                </div>

                {/* AI Budget Alert Widget */}
                <div className="p-6 rounded-3xl border border-border bg-card shadow-sm space-y-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 rounded-xl bg-violet-500/10 text-violet-500">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <h2 className="text-base font-bold text-foreground">AI Budget Insights</h2>
                    </div>

                    <div className="space-y-3">
                      <div className="p-3.5 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-xs space-y-1">
                        <p className="font-bold text-violet-600 dark:text-violet-300">
                          {transactionsLoading ? 'Loading your financial activity…' : 'Personalized insights'}
                        </p>
                        <p className="text-muted-foreground leading-relaxed">
                          {transactionsLoading
                            ? 'Your insights will appear once your transactions are ready.'
                            : transactions.length === 0
                              ? 'Add some transactions to unlock personalized insights.'
                              : 'Personalized AI insights are not available yet.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => setActiveTab('ai-assistant')}
                    className="w-full py-2.5 rounded-xl border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-violet-300 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Ask AI Assistant</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>

              </div>

              {/* Recent Transactions Section */}
              <div className="p-6 rounded-3xl border border-border bg-card shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-base font-bold text-foreground">Recent Activity</h2>
                    <p className="text-xs text-muted-foreground">Latest transactions across all connected accounts</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('transactions')}
                    className="text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
                  >
                    View All
                  </button>
                </div>

                <div className="overflow-x-auto">
                  {transactionsError && (
                    <p role="alert" className="mb-3 text-xs font-medium text-rose-500">{transactionsError}</p>
                  )}
                  {!transactionsLoading && transactions.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-sm font-bold text-foreground">No transactions yet</p>
                      <p className="mt-1 text-xs text-muted-foreground">Add your first income or expense to see it here.</p>
                    </div>
                  ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        <th className="py-3 px-4">Transaction</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 text-xs font-medium">
                      {transactions.slice(0, 5).map((tx, idx) => (
                        <tr key={tx.id || idx} className="hover:bg-muted/50 transition-colors">
                          <td className="py-3 px-4 flex items-center gap-3">
                            <span className="text-base">{tx.icon}</span>
                            <span className="font-semibold text-foreground">{tx.name}</span>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">{tx.category}</td>
                          <td className="py-3 px-4 text-muted-foreground">{tx.date}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              tx.status === 'Completed'
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            }`}>
                              {tx.status}
                            </span>
                          </td>
                          <td className={`py-3 px-4 text-right font-bold ${
                            tx.amount > 0 ? 'text-emerald-500' : 'text-foreground'
                          }`}>
                            {formatSignedCurrency(tx.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: TRANSACTIONS */}
          {activeTab === 'transactions' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">💳 Transactions</h1>
                  <p className="text-xs text-muted-foreground">Manage and track your income & expenses</p>
                </div>
                <button
                  onClick={openAddTransaction}
                  className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-violet-600/30 hover:bg-violet-700 transition-all cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add New Transaction</span>
                </button>
              </div>

              {/* Transactions Table Panel */}
              <div className="p-6 rounded-3xl border border-border bg-card shadow-sm space-y-4">
                {transactionsError && (
                  <p role="alert" className="text-xs font-medium text-rose-500">{transactionsError}</p>
                )}
                <div className="flex flex-col sm:flex-row gap-3 justify-between">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Filter by name or category..."
                      className="w-full rounded-xl border border-border bg-muted/40 pl-10 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-violet-500 transition-all"
                    />
                  </div>
                  <CustomSelect
                    value={categoryFilter}
                    onChange={setCategoryFilter}
                    options={[
                      { value: 'All', label: 'All Categories', icon: '🔍' },
                      ...transactionCategories,
                    ]}
                    className="w-full sm:w-48"
                  />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        <th className="py-3.5 px-4">Transaction</th>
                        <th className="py-3.5 px-4">Category</th>
                        <th className="py-3.5 px-4">Date</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Amount</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 text-xs font-medium">
                      {transactionsLoading ? (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-xs text-muted-foreground">
                            Loading transactions…
                          </td>
                        </tr>
                      ) : transactions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-10 text-center">
                            <p className="text-sm font-bold text-foreground">No transactions yet</p>
                            <p className="mt-1 text-xs text-muted-foreground">Add your first income or expense to start tracking your money.</p>
                            <button type="button" onClick={openAddTransaction} className="mt-3 text-xs font-bold text-violet-600 hover:text-violet-500">
                              Add Transaction
                            </button>
                          </td>
                        </tr>
                      ) : filteredTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-sm font-semibold text-muted-foreground">
                            No matching transactions found.
                          </td>
                        </tr>
                      ) : filteredTransactions.map((tx, idx) => (
                          <tr key={tx.id || idx} className="hover:bg-muted/50 transition-colors">
                            <td className="py-3.5 px-4 flex items-center gap-3">
                              <span className="text-lg">{tx.icon}</span>
                              <span className="font-semibold text-foreground">{formatDisplayLabel(tx.name)}</span>
                            </td>
                            <td className="py-3.5 px-4 text-muted-foreground">{formatDisplayLabel(tx.category)}</td>
                            <td className="py-3.5 px-4 text-muted-foreground">{tx.date}</td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                tx.status === 'Completed'
                                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                              }`}>
                                {tx.status}
                              </span>
                            </td>
                            <td className={`py-3.5 px-4 text-right font-bold ${
                              tx.amount > 0 ? 'text-emerald-500' : 'text-foreground'
                            }`}>
                              {formatSignedCurrency(tx.amount)}
                            </td>
                            <td className="relative py-3.5 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => setOpenActionId((current) => current === tx.id ? null : (tx.id ?? null))}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                aria-label={`Actions for ${tx.name}`}
                                aria-expanded={openActionId === tx.id}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                              {openActionId === tx.id && (
                                <div className={`absolute right-4 z-30 w-28 rounded-xl border border-border bg-popover p-1.5 text-left shadow-xl ${
                                  idx === filteredTransactions.length - 1 ? 'bottom-11' : 'top-11'
                                }`}>
                                  <button
                                    type="button"
                                    onClick={() => openEditTransaction(tx)}
                                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-popover-foreground hover:bg-muted"
                                  >
                                    <Pencil className="h-3.5 w-3.5" /> Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionId(null);
                                      setTransactionMutationError('');
                                      setDeletingTransaction(tx);
                                    }}
                                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" /> Delete
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BUDGETS */}
          {activeTab === 'budgets' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">🎯 Budgets & Limits</h1>
                  <p className="text-xs text-muted-foreground">Keep your spending on track with custom target caps</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select value={selectedBudgetMonth} onChange={(event) => setSelectedBudgetMonth(Number(event.target.value))} className="rounded-xl border border-border bg-card px-3 py-2.5 text-xs font-semibold text-foreground focus:outline-none focus:border-violet-500">
                    {MONTH_NAMES.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
                  </select>
                  <input type="number" min="2000" max="2200" value={selectedBudgetYear} onChange={(event) => setSelectedBudgetYear(Number(event.target.value))} className="w-24 rounded-xl border border-border bg-card px-3 py-2.5 text-xs font-semibold text-foreground focus:outline-none focus:border-violet-500" aria-label="Budget year" />
                  <button type="button" onClick={openCreateBudget} className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-violet-600/30 hover:bg-violet-700">
                    <Plus className="h-4 w-4" /> Add Budget
                  </button>
                </div>
              </div>

              {budgetsError && <p role="alert" className="text-xs font-medium text-rose-500">{budgetsError}</p>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {budgetsLoading ? (
                  [0, 1].map((item) => <div key={item} className="h-52 rounded-3xl border border-border bg-card animate-pulse" />)
                ) : budgets.length === 0 ? (
                  <div className="md:col-span-2 p-8 rounded-3xl border border-border bg-card shadow-sm text-center">
                    <p className="text-sm font-bold text-foreground">No budgets configured yet</p>
                    <p className="mt-1 text-xs text-muted-foreground">Set monthly category limits to start tracking your spending.</p>
                    <button type="button" onClick={openCreateBudget} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-semibold text-white">
                      <Plus className="h-4 w-4" /> Create Your First Budget
                    </button>
                  </div>
                ) : budgets.map((budget) => {
                  const percent = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;
                  const statusInfo = getBudgetStatus(percent);
                  const overBudget = Math.max(0, budget.spent - budget.amount);
                  const remaining = Math.max(0, budget.amount - budget.spent);
                  return (
                    <div key={budget.id} className="relative p-6 rounded-3xl border border-border bg-card shadow-sm space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-bold text-foreground">{formatDisplayLabel(budget.category)}</h3>
                          <p className="text-xs text-muted-foreground">{MONTH_NAMES[budget.month - 1]} {budget.year}</p>
                        </div>
                        <div className="relative">
                          <button type="button" onClick={() => setOpenBudgetActionId((current) => current === budget.id ? null : budget.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`Actions for ${budget.category} budget`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          {openBudgetActionId === budget.id && (
                            <div className="absolute right-0 top-9 z-30 w-28 rounded-xl border border-border bg-popover p-1.5 shadow-xl">
                              <button type="button" onClick={() => openEditBudget(budget)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold hover:bg-muted"><Pencil className="h-3.5 w-3.5" /> Edit</button>
                              <button type="button" onClick={() => { setOpenBudgetActionId(null); setBudgetMutationError(''); setDeletingBudget(budget); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-end justify-between gap-3">
                        <p className="text-xs text-muted-foreground"><span className="font-bold text-foreground">{formatCurrency(budget.spent)}</span> spent of {formatCurrency(budget.amount)}</p>
                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusInfo.badge}`}>{statusInfo.label}</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${statusInfo.bar}`} style={{ width: `${Math.min(100, percent)}%` }} /></div>
                      <div className="flex justify-between text-xs font-semibold">
                        <span>{percent.toFixed(2).replace(/\.00$/, '')}% used</span>
                        <span className={overBudget > 0 ? 'text-rose-500' : 'text-muted-foreground'}>{overBudget > 0 ? `${formatCurrency(overBudget)} over budget` : `${formatCurrency(remaining)} remaining`}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">📈 Spending Analytics</h1>
                  <p className="text-xs text-muted-foreground">Real insights from your transactions and budgets</p>
                </div>
                <div className="flex gap-2">
                  <select value={selectedBudgetMonth} onChange={(event) => setSelectedBudgetMonth(Number(event.target.value))} className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-violet-500">
                    {MONTH_NAMES.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
                  </select>
                  <select value={selectedBudgetYear} onChange={(event) => setSelectedBudgetYear(Number(event.target.value))} className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-violet-500">
                    {Array.from({ length: 5 }, (_, index) => currentDate.getFullYear() - 2 + index).map((year) => <option key={year} value={year}>{year}</option>)}
                  </select>
                </div>
              </div>

              {transactionsLoading || budgetsLoading ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-3xl border border-border bg-muted/50" />)}
                </div>
              ) : transactionsError ? (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">Unable to load analytics because transactions could not be loaded.</div>
              ) : analytics.selected.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center shadow-sm">
                  <p className="font-bold text-foreground">No activity for {MONTH_NAMES[selectedBudgetMonth - 1]} {selectedBudgetYear}</p>
                  <p className="mt-2 text-xs text-muted-foreground">Add a transaction for this month to see analytics.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                      ['Total Income', analytics.income, 'text-emerald-500'],
                      ['Total Expense', analytics.expense, 'text-rose-500'],
                      ['Net Savings', analytics.netSavings, analytics.netSavings >= 0 ? 'text-violet-500' : 'text-rose-500'],
                    ].map(([label, amount, color]) => (
                      <div key={String(label)} className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
                        <p className={`mt-2 text-xl font-extrabold ${color}`}>{formatCurrency(Number(amount))}</p>
                      </div>
                    ))}
                    <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                      <p className="text-xs font-semibold text-muted-foreground">Savings Rate</p>
                      <p className={`mt-2 text-xl font-extrabold ${analytics.savingsRate >= 0 ? 'text-indigo-500' : 'text-rose-500'}`}>{analytics.savingsRate.toFixed(1)}%</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                      <h2 className="text-sm font-bold text-foreground">Spending by Category</h2>
                      {analytics.categories.length === 0 ? <p className="mt-8 text-center text-xs text-muted-foreground">No expenses in this period.</p> : (
                        <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row">
                          <div className="flex h-44 w-44 shrink-0 items-center justify-center rounded-full" style={{ background: analyticsDonut }}>
                            <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-card shadow-inner">
                              <span className="text-[10px] text-muted-foreground">Total spent</span>
                              <span className="text-sm font-extrabold text-foreground">{formatCurrency(analytics.expense)}</span>
                            </div>
                          </div>
                          <div className="w-full space-y-3">
                            {analytics.categories.map((category) => (
                              <div key={category.category} className="flex items-center justify-between gap-3 text-xs">
                                <span className="flex min-w-0 items-center gap-2 font-semibold text-foreground"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />{category.category}</span>
                                <span className="whitespace-nowrap text-muted-foreground">{formatCurrency(category.amount)} · {category.percent.toFixed(1)}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                      <div className="flex items-center justify-between"><h2 className="text-sm font-bold text-foreground">Six-Month Cash Flow</h2><span className="text-[10px] text-muted-foreground">Income / Expense</span></div>
                      {analytics.trendMaximum === 0 ? <p className="mt-8 text-center text-xs text-muted-foreground">No cash-flow history available.</p> : (
                        <div className="mt-6 flex h-48 items-end gap-3 border-b border-border px-1">
                          {analytics.trend.map((item) => (
                            <div key={item.key} className="flex h-full flex-1 flex-col justify-end gap-2 text-center">
                              <div className="flex flex-1 items-end justify-center gap-1">
                                <div title={`Income: ${formatCurrency(item.income)}`} className="w-3 rounded-t bg-emerald-500" style={{ height: `${(item.income / analytics.trendMaximum) * 100}%` }} />
                                <div title={`Expense: ${formatCurrency(item.expense)}`} className="w-3 rounded-t bg-rose-500" style={{ height: `${(item.expense / analytics.trendMaximum) * 100}%` }} />
                              </div>
                              <span className="pb-2 text-[10px] font-semibold text-muted-foreground">{item.month}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                      <h2 className="text-sm font-bold text-foreground">Budget vs Actual</h2>
                      {budgetsError ? <p className="mt-4 text-xs text-destructive">{budgetsError}</p> : budgets.length === 0 ? <p className="mt-4 text-xs text-muted-foreground">No budgets set for this month.</p> : (
                        <div className="mt-5 space-y-4">
                          {budgets.map((budget) => {
                            const percent = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;
                            return <div key={budget.id} className="space-y-2"><div className="flex justify-between gap-3 text-xs"><span className="font-semibold text-foreground">{budget.category}</span><span className="text-muted-foreground">{formatCurrency(budget.spent)} / {formatCurrency(budget.amount)}</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${percent > 100 ? 'bg-rose-500' : 'bg-violet-500'}`} style={{ width: `${Math.min(100, percent)}%` }} /></div></div>;
                          })}
                        </div>
                      )}
                    </div>

                    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                      <h2 className="text-sm font-bold text-foreground">Key Metrics</h2>
                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-muted/50 p-4"><p className="text-[10px] text-muted-foreground">Top category</p><p className="mt-1 text-sm font-bold text-foreground">{analytics.topCategory?.category ?? '—'}</p></div>
                        <div className="rounded-2xl bg-muted/50 p-4"><p className="text-[10px] text-muted-foreground">Largest expense</p><p className="mt-1 text-sm font-bold text-foreground">{formatCurrency(analytics.largestExpense)}</p></div>
                        <div className="rounded-2xl bg-muted/50 p-4"><p className="text-[10px] text-muted-foreground">Average daily spend</p><p className="mt-1 text-sm font-bold text-foreground">{formatCurrency(analytics.averageDailySpend)}</p></div>
                        <div className="rounded-2xl bg-muted/50 p-4"><p className="text-[10px] text-muted-foreground">Expense transactions</p><p className="mt-1 text-sm font-bold text-foreground">{analytics.expenseCount}</p></div>
                      </div>
                      <p className="mt-4 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
                        {analytics.previousExpense === 0 ? 'Not enough historical data for comparison.' : (() => { const change = ((analytics.expense - analytics.previousExpense) / analytics.previousExpense) * 100; return change === 0 ? 'Spending is unchanged from last month.' : `Spending ${change > 0 ? 'increased' : 'decreased'} ${Math.abs(change).toFixed(1)}% from last month.`; })()}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 5: AI INSIGHTS */}
          {activeTab === 'ai-insights' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <span>🤖 AI Financial Insights</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-500 border border-violet-500/30 uppercase font-mono">Powered by Spendzy AI</span>
                </h1>
                <p className="text-xs text-muted-foreground">Automated recommendations generated for your profile</p>
              </div>

              <div className="p-6 rounded-3xl border border-violet-500/30 bg-gradient-to-br from-violet-600/10 to-indigo-600/10 shadow-sm space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-violet-600 text-white">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-foreground">Personalized insights</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {transactions.length === 0
                    ? 'Add some transactions to unlock personalized insights.'
                    : 'Personalized AI insights are not available yet.'}
                </p>
              </div>
            </div>
          )}

          {/* TAB 6: PREDICTIONS */}
          {activeTab === 'predictions' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">🔮 Predictive Forecasting</h1>
                <p className="text-xs text-muted-foreground">AI-driven projections for your balance at month end</p>
              </div>

              <div className="p-8 rounded-3xl border border-border bg-card shadow-sm space-y-6 text-center">
                <div className="max-w-md mx-auto space-y-2">
                  <span className="text-xs font-semibold text-violet-500 uppercase tracking-widest bg-violet-500/10 px-3 py-1 rounded-full border border-violet-500/20">
                    Forecast unavailable
                  </span>
                  <p className="text-xs text-muted-foreground">Predictions will appear when a real forecasting service is connected.</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: AI ASSISTANT */}
          {activeTab === 'ai-assistant' && (
            <div className="h-[calc(100vh-8rem)] flex flex-col rounded-3xl border border-border bg-card shadow-sm overflow-hidden animate-in fade-in duration-300">
              {/* Header */}
              <div className="p-4 border-b border-border bg-muted/30 flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">Spendzy AI Assistant</h2>
                  <span className="text-[11px] text-emerald-500 font-medium flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Active & ready
                  </span>
                </div>
              </div>

              {/* Message List */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                {chatMessages.map((msg, idx) => (
                  <div 
                    key={idx}
                    className={`flex items-start gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      msg.sender === 'user'
                        ? 'bg-violet-600 text-white'
                        : 'bg-muted text-foreground border border-border'
                    }`}>
                      {msg.sender === 'user' ? userInitials : '🤖'}
                    </div>
                    <div className={`p-4 rounded-2xl max-w-md text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-violet-600 text-white rounded-tr-none shadow-md'
                        : 'bg-muted/80 text-foreground border border-border rounded-tl-none'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendChatMessage} className="p-4 border-t border-border bg-card flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask Spendzy AI anything about your money flow..."
                  className="flex-1 rounded-xl border border-border bg-muted/40 px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-violet-600 text-white text-xs font-bold shadow-md hover:bg-violet-700 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span>Send</span>
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          )}

          {/* TAB 8: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-3xl animate-in fade-in duration-300">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">⚙ Settings & Preferences</h1>
                <p className="text-xs text-muted-foreground">Manage your Spendzy dashboard configuration</p>
              </div>

              <div className="p-6 rounded-3xl border border-border bg-card shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Theme Mode</h3>
                    <p className="text-xs text-muted-foreground">Toggle between Light and Dark interface mode</p>
                  </div>
                  <button
                    onClick={onToggleMode}
                    className="px-4 py-2 rounded-xl border border-border bg-muted text-xs font-semibold text-foreground hover:bg-muted/80 cursor-pointer"
                  >
                    Switch to {mode === 'dark' ? 'Light' : 'Dark'}
                  </button>
                </div>

                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Currency Preference</h3>
                    <p className="text-xs text-muted-foreground">Display currency symbol across dashboard</p>
                  </div>
                  <CustomSelect
                    value={currency}
                    onChange={(value) => setCurrency(value as CurrencyCode)}
                    options={[
                      { value: 'USD', label: 'USD ($)', icon: '💵' },
                      { value: 'EUR', label: 'EUR (€)', icon: '💶' },
                      { value: 'INR', label: 'INR (₹)', icon: '₹' },
                      { value: 'GBP', label: 'GBP (£)', icon: '💷' },
                    ]}
                    className="w-36"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Exit Dashboard</h3>
                    <p className="text-xs text-muted-foreground">Return back to home landing page</p>
                  </div>
                  <button
                    onClick={onExitDashboard}
                    className="px-4 py-2 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 text-xs font-semibold hover:bg-destructive/20 transition-colors cursor-pointer"
                  >
                    Exit to Landing
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Add/Edit Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-3xl border border-border bg-card shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">
                {editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}
              </h2>
              <button type="button" onClick={closeTransactionModal} disabled={isSavingTransaction} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50" aria-label="Close transaction form">
                <X className="h-4 w-4" />
              </button>
            </div>

            {transactionMutationError && (
              <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive">
                {transactionMutationError}
              </p>
            )}

            <form onSubmit={handleSaveTransaction} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newTx.name}
                  onChange={(e) => setNewTx({ ...newTx, name: e.target.value })}
                  placeholder="e.g. Grocery Shopping"
                  className="w-full rounded-xl border border-border bg-muted/40 px-3.5 py-2 text-xs text-foreground focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Amount ({currency})</label>
                  <input
                   type="number"
                    min="0"
                    step="0.01"
                    required
                    value={newTx.amount}
                    onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
                    placeholder="99.99"
                    className="w-full rounded-xl border border-border bg-muted/40 px-3.5 py-2 text-xs text-foreground focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Type</label>
                  <select
                    value={newTx.type}
                    onChange={(e) => setNewTx({ ...newTx, type: e.target.value as TransactionFormState['type'] })}
                    className="w-full rounded-xl border border-border bg-muted/40 px-3.5 py-2 text-xs text-foreground focus:outline-none focus:border-violet-500"
                  >
                    <option value="expense">Expense (-)</option>
                    <option value="income">Income (+)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Category</label>
                  <CustomSelect
                    value={newTx.category}
                    onChange={(val) => setNewTx({ ...newTx, category: val })}
                    options={transactionCategories}
                  />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeTransactionModal}
                  disabled={isSavingTransaction}
                  className="flex-1 py-2.5 rounded-xl border border-border bg-muted text-xs font-semibold text-foreground hover:bg-muted/80 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingTransaction}
                  className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white text-xs font-bold shadow-md shadow-violet-600/30 hover:bg-violet-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingTransaction ? 'Saving...' : editingTransaction ? 'Save Changes' : 'Save Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deletingTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div role="dialog" aria-modal="true" aria-labelledby="delete-transaction-title" className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <Trash2 className="h-5 w-5" />
            </div>
            <h2 id="delete-transaction-title" className="text-lg font-bold text-foreground">Delete transaction?</h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Are you sure you want to delete “{deletingTransaction.name}”? This action cannot be undone.
            </p>
            {transactionMutationError && (
              <p role="alert" className="mt-3 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive">
                {transactionMutationError}
              </p>
            )}
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!isDeletingTransaction) {
                    setDeletingTransaction(null);
                    setTransactionMutationError('');
                  }
                }}
                disabled={isDeletingTransaction}
                className="flex-1 rounded-xl border border-border bg-muted py-2.5 text-xs font-semibold text-foreground hover:bg-muted/80 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteTransaction}
                disabled={isDeletingTransaction}
                className="flex-1 rounded-xl bg-destructive py-2.5 text-xs font-bold text-destructive-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeletingTransaction ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBudgetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">{editingBudget ? 'Edit Budget' : 'Add Budget'}</h2>
              <button type="button" onClick={() => !isSavingBudget && setShowBudgetModal(false)} disabled={isSavingBudget} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label="Close budget form"><X className="h-4 w-4" /></button>
            </div>
            {budgetMutationError && <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive">{budgetMutationError}</p>}
            <form onSubmit={handleSaveBudget} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Category</label>
                <CustomSelect value={budgetForm.category} onChange={(category) => setBudgetForm((current) => ({ ...current, category }))} options={BUDGET_CATEGORIES} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Monthly Limit (INR)</label>
                <input type="number" min="0.01" step="0.01" required value={budgetForm.amount} onChange={(event) => setBudgetForm((current) => ({ ...current, amount: event.target.value }))} className="w-full rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:border-violet-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Month</label>
                  <select value={budgetForm.month} onChange={(event) => setBudgetForm((current) => ({ ...current, month: Number(event.target.value) }))} className="w-full rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:border-violet-500">
                    {MONTH_NAMES.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Year</label>
                  <input type="number" min="2000" max="2200" required value={budgetForm.year} onChange={(event) => setBudgetForm((current) => ({ ...current, year: Number(event.target.value) }))} className="w-full rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:border-violet-500" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => !isSavingBudget && setShowBudgetModal(false)} disabled={isSavingBudget} className="flex-1 rounded-xl border border-border bg-muted py-2.5 text-xs font-semibold text-foreground disabled:opacity-60">Cancel</button>
                <button type="submit" disabled={isSavingBudget} className="flex-1 rounded-xl bg-violet-600 py-2.5 text-xs font-bold text-white shadow-md shadow-violet-600/30 disabled:opacity-60">{isSavingBudget ? 'Saving...' : editingBudget ? 'Save Changes' : 'Create Budget'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div role="dialog" aria-modal="true" aria-labelledby="delete-budget-title" className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive"><Trash2 className="h-5 w-5" /></div>
            <h2 id="delete-budget-title" className="text-lg font-bold text-foreground">Delete budget?</h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Are you sure you want to delete the {deletingBudget.category} budget for {MONTH_NAMES[deletingBudget.month - 1]} {deletingBudget.year}?</p>
            <p className="mt-2 text-xs font-semibold text-foreground">This will remove the budget limit only. Your transactions will NOT be deleted.</p>
            {budgetMutationError && <p role="alert" className="mt-3 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive">{budgetMutationError}</p>}
            <div className="mt-6 flex gap-2">
              <button type="button" onClick={() => !isDeletingBudget && setDeletingBudget(null)} disabled={isDeletingBudget} className="flex-1 rounded-xl border border-border bg-muted py-2.5 text-xs font-semibold text-foreground disabled:opacity-60">Cancel</button>
              <button type="button" onClick={handleDeleteBudget} disabled={isDeletingBudget} className="flex-1 rounded-xl bg-destructive py-2.5 text-xs font-bold text-destructive-foreground disabled:opacity-60">{isDeletingBudget ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
