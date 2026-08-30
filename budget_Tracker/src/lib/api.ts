const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(message: string, public fieldErrors: Record<string, string> = {}) {
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

export const apiFetch = async <T = any>(endpoint: string, options: RequestInit = {}): Promise<T> => {
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
    const data = await response.json();

    if (!response.ok) {
      const fieldErrors: Record<string, string> = {};
      if (Array.isArray(data.errors)) {
        for (const error of data.errors) {
          if (typeof error.field === 'string' && typeof error.message === 'string') {
            fieldErrors[error.field] = error.message;
          }
        }
      }
      const details = Object.entries(fieldErrors).map(([field, message]) => `${field}: ${message}`);
      throw new ApiError(
        [data.message || 'An error occurred with the request', ...details].join('. '),
        fieldErrors,
      );
    }

    return data as T;
  } catch (error: any) {
    console.warn(`API Error [${endpoint}]:`, error.message);
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
  getMe: (): Promise<AuthResponse> => apiFetch<AuthResponse>('/auth/me'),
};

export const transactionApi = {
  getAll: (): Promise<TransactionsResponse> => apiFetch<TransactionsResponse>('/transactions'),
  create: (txData: TransactionData): Promise<SingleTransactionResponse> =>
    apiFetch<SingleTransactionResponse>('/transactions', {
      method: 'POST',
      body: JSON.stringify(txData),
    }),
  delete: (id: string | number): Promise<{ message?: string }> =>
    apiFetch<{ message?: string }>(`/transactions/${id}`, {
      method: 'DELETE',
    }),
};
