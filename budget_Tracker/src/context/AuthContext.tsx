import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, User, AuthResponse } from '../lib/api';

export interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email?: string, password?: string) => Promise<AuthResponse>;
  signup: (name?: string, email?: string, password?: string) => Promise<AuthResponse>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('spendzy_token') || null);
  const [loading, setLoading] = useState<boolean>(true);

  const logout = () => {
    localStorage.removeItem('spendzy_token');
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const res = await authApi.getMe();
          setUser(res.user);
        } catch (error: unknown) {
          console.warn(
            'Session expired or invalid token:',
            error instanceof Error ? error.message : 'Unknown authentication error',
          );
          logout();
        }
      }
      setLoading(false);
    };
    initAuth();
  }, [token]);

  const login = async (email?: string, password?: string): Promise<AuthResponse> => {
    const res = await authApi.login({ email, password });
    localStorage.setItem('spendzy_token', res.token);
    setToken(res.token);
    setUser(res.user);
    return res;
  };

  const signup = async (name?: string, email?: string, password?: string): Promise<AuthResponse> => {
    const res = await authApi.signup({ name, email, password });
    localStorage.setItem('spendzy_token', res.token);
    setToken(res.token);
    setUser(res.user);
    return res;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        signup,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
