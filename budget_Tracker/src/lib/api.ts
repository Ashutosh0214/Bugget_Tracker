const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(message: string, public fieldErrors: Record<string, string> = {}, public status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface User {
  id: string | number;
  name: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  message?: string;
}

export interface TransactionData {
  id?: number | string;
  name: string;
  category: string;
  amount: number;
  date: string;
  status: string;
  icon: string;
  source?: 'manual' | 'monthly_setup' | string;
}

export type TransactionWriteData = Omit<TransactionData, 'id'>;

export interface MonthlySetupWriteData {
  month: number;
  year: number;
  transactions: TransactionWriteData[];
  allow_duplicates?: boolean;
}

export interface BulkTransactionResponse {
  transactions: TransactionData[];
  count: number;
  message: string;
}

export interface BudgetData {
  id: number | string;
  category: string;
  amount: number;
  month: number;
  year: number;
  spent: number;
  created_at?: string;
  updated_at?: string;
}

export type BudgetWriteData = Pick<BudgetData, 'category' | 'amount' | 'month' | 'year'>;

export interface UserProfileResponse {
  user: User;
}

export interface TransactionsResponse {
  transactions: TransactionData[];
  message?: string;
}

export interface SingleTransactionResponse {
  transaction: TransactionData;
  message?: string;
}

const getHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('spendzy_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const apiFetch = async <T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`;
  const config: RequestInit = {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options.headers || {}),
    },
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch((error: unknown) => {
      // Preserve HTTP failures even when a proxy/server returns a non-JSON body.
      if (!response.ok) throw new ApiError('An error occurred with the request', {}, response.status);
      throw error;
    });

    if (!response.ok) {
      const fieldErrors: Record<string, string> = {};
      if (Array.isArray(data?.errors)) {
        for (const error of data.errors) {
          if (typeof error?.field === 'string' && typeof error?.message === 'string') {
            fieldErrors[error.field] = error.message;
          }
        }
      }
      const details = Object.entries(fieldErrors).map(([field, message]) => `${field}: ${message}`);
      throw new ApiError(
        [data?.message || 'An error occurred with the request', ...details].join('. '),
        fieldErrors,
        response.status,
      );
    }

    return data as T;
  } catch (error: unknown) {
    console.warn(`API Error [${endpoint}]:`, error instanceof Error ? error.message : 'Unknown API error');
    throw error;
  }
};

export const authApi = {
  signup: (userData: { name?: string; email?: string; password?: string }): Promise<AuthResponse> =>
    apiFetch<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),
  login: (credentials: { email?: string; password?: string }): Promise<AuthResponse> =>
    apiFetch<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  getMe: (): Promise<UserProfileResponse> => apiFetch<UserProfileResponse>('/auth/me'),
};

export const transactionApi = {
  getAll: (): Promise<TransactionsResponse> => apiFetch<TransactionsResponse>('/transactions'),
  create: (txData: TransactionWriteData): Promise<SingleTransactionResponse> =>
    apiFetch<SingleTransactionResponse>('/transactions', {
      method: 'POST',
      body: JSON.stringify(txData),
    }),
  createMonthlySetup: (data: MonthlySetupWriteData): Promise<BulkTransactionResponse> =>
    apiFetch<BulkTransactionResponse>('/transactions/bulk', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string | number, txData: TransactionWriteData): Promise<SingleTransactionResponse> =>
    apiFetch<SingleTransactionResponse>(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(txData),
    }),
  delete: (id: string | number): Promise<{ message?: string }> =>
    apiFetch<{ message?: string }>(`/transactions/${id}`, {
      method: 'DELETE',
    }),
};

export const budgetApi = {
  getAll: (month: number, year: number): Promise<{ budgets: BudgetData[] }> =>
    apiFetch<{ budgets: BudgetData[] }>(`/budgets?month=${month}&year=${year}`),
  create: (data: BudgetWriteData): Promise<{ budget: BudgetData }> =>
    apiFetch<{ budget: BudgetData }>('/budgets', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string | number, data: BudgetWriteData): Promise<{ budget: BudgetData }> =>
    apiFetch<{ budget: BudgetData }>(`/budgets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string | number): Promise<{ message: string; id: number }> =>
    apiFetch<{ message: string; id: number }>(`/budgets/${id}`, { method: 'DELETE' }),
};

export interface AIChatResponse {
  reply: string;
  source: 'deterministic' | 'gemini' | 'fallback';
  forecast_warning: boolean;
  context: {
    lastIntent?: string;
    lastCategory?: string;
  };
}

interface AIChatApiResponse extends Omit<AIChatResponse, 'context'> {
  context: {
    last_intent?: string;
    last_category?: string;
  };
}

export const aiApi = {
  chat: (
    message: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
    context: { lastIntent?: string; lastCategory?: string } = {},
  ): Promise<AIChatResponse> =>
    apiFetch<AIChatApiResponse>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        history: history.slice(-10),
        context: { last_intent: context.lastIntent, last_category: context.lastCategory },
      }),
    }).then((response) => ({
      ...response,
      context: {
        lastIntent: response.context.last_intent,
        lastCategory: response.context.last_category,
      },
    })),
};
