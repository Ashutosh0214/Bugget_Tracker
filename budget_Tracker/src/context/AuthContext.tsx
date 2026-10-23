import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { authApi, socialApi, User, AuthResponse, SocialAuthResponse } from '../lib/api';

export interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email?: string, password?: string) => Promise<AuthResponse>;
  signup: (name?: string, email?: string, password?: string) => Promise<AuthResponse>;
  completeSocialLogin: (code: string, verifier: string) => Promise<SocialAuthResponse>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('spendzy_token') || null);
  const [loading, setLoading] = useState<boolean>(true);
  const sessionVersion = useRef(0);
  const initialToken = useRef(token);

  const logout = () => {
    sessionVersion.current += 1;
    try {
      localStorage.removeItem('spendzy_token');
    } finally {
      setToken(null);
      setUser(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const version = sessionVersion.current;
    const initAuth = async () => {
      if (initialToken.current) {
        try {
          const res = await authApi.getMe();
          if (active && version === sessionVersion.current) setUser(res.user);
        } catch (error: unknown) {
          console.warn(
            'Session expired or invalid token:',
            error instanceof Error ? error.message : 'Unknown authentication error',
          );
          if (active && version === sessionVersion.current) logout();
        }
      }
      if (active && version === sessionVersion.current) setLoading(false);
    };
    initAuth();
    return () => { active = false; };
  }, []);

  const establishSession = async (res: AuthResponse): Promise<AuthResponse> => {
    const version = ++sessionVersion.current;
    setLoading(true);
    try {
      if (!res.token || !res.user?.id) throw new Error('Invalid authentication response');
      localStorage.setItem('spendzy_token', res.token);
      // Validate the issued token and load the profile before opening protected UI.
      const profile = await authApi.getMe();
      if (version !== sessionVersion.current) throw new Error('Sign-in was cancelled. Please log in again.');
      if (profile.user.id !== res.user.id) throw new Error('Unexpected account profile');
      setToken(res.token);
      setUser(profile.user);
      return { ...res, user: profile.user };
    } catch (error) {
      if (version === sessionVersion.current) logout();
      throw error;
    } finally {
      if (version === sessionVersion.current) setLoading(false);
    }
  };

  const login = async (email?: string, password?: string): Promise<AuthResponse> => {
    const res = await authApi.login({ email, password });
    return establishSession(res);
  };

  const signup = async (name?: string, email?: string, password?: string): Promise<AuthResponse> => {
    const res = await authApi.signup({ name, email, password });
    try {
      return await establishSession(res);
    } catch {
      throw new Error('Your account was created, but sign-in could not finish. Please log in with your new account; do not register again.');
    }
  };

  const completeSocialLogin = async (code: string, verifier: string): Promise<SocialAuthResponse> => {
    const version = sessionVersion.current;
    const res = await socialApi.exchange(code, verifier);
    if (version !== sessionVersion.current) throw new Error('Sign-in was cancelled. Please start again.');
    try {
      await establishSession(res);
    } catch {
      throw new Error('Provider authentication succeeded, but the session could not be saved. Please start sign-in again.');
    }
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
        completeSocialLogin,
        logout,
        isAuthenticated: !!user && !!token,
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
