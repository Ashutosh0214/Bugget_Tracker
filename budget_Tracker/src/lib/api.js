const API_BASE_URL = 'http://localhost:5000/api';

const getHeaders = () => {
  const token = localStorage.getItem('spendzy_token');
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const apiFetch = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'An error occurred with the request');
    }

    return data;
  } catch (error) {
    console.warn(`API Error [${endpoint}]:`, error.message);
    throw error;
  }
};

export const authApi = {
  signup: (userData) =>
    apiFetch('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),
  login: (credentials) =>
    apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  getMe: () => apiFetch('/auth/me'),
};

export const transactionApi = {
  getAll: () => apiFetch('/transactions'),
  create: (txData) =>
    apiFetch('/transactions', {
      method: 'POST',
      body: JSON.stringify(txData),
    }),
  delete: (id) =>
    apiFetch(`/transactions/${id}`, {
      method: 'DELETE',
    }),
};
