/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../lib/api';

export interface User {
  id: string;
  email: string;
  name: string;
  subscriptionTier: 'FREE' | 'PREMIUM';
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  upgradeTier: (tier: 'FREE' | 'PREMIUM') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(() => !!localStorage.getItem('accessToken'));

  // Try to restore session on mount
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      // Try refreshing the token to validate session
      api.post('/auth/refresh')
        .then(({ data }) => {
          localStorage.setItem('accessToken', data.data.accessToken);
          setUser(data.data.user);
          setIsLoading(false);
        })
        .catch(() => {
          localStorage.removeItem('accessToken');
          setIsLoading(false);
        });
    }
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', data.data.accessToken);
    setUser(data.data.user);
  };

  const signup = async (email: string, password: string, name: string) => {
    const { data } = await api.post('/auth/signup', { email, password, name });
    localStorage.setItem('accessToken', data.data.accessToken);
    setUser(data.data.user);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore logout errors
    }
    localStorage.removeItem('accessToken');
    setUser(null);
  };

  const upgradeTier = async (tier: 'FREE' | 'PREMIUM') => {
    const { data } = await api.patch('/auth/upgrade', { tier });
    setUser(data.data.user);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      signup,
      logout,
      upgradeTier,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
