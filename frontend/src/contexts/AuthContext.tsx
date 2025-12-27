import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '../api';
import type { Plan } from '../types';

export interface User {
  id: string;
  email: string;
  plan: Plan;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  created?: string;
  updated?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, passwordConfirm: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('autoiq_token');
    if (storedToken) {
      setToken(storedToken);
      // Verify token and load user
      loadUser(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const loadUser = async (authToken: string) => {
    try {
      const userData = await apiClient.getCurrentUser(authToken);
      // Convert snake_case to camelCase for User interface
      const user: User = {
        id: userData.id,
        email: userData.email,
        plan: userData.plan,
        stripeCustomerId: userData.stripe_customer_id,
        stripeSubscriptionId: userData.stripe_subscription_id,
        created: userData.created,
        updated: userData.updated,
      };
      setUser(user);
      setToken(authToken);
      localStorage.setItem('autoiq_token', authToken);
    } catch (error) {
      console.error('Failed to load user:', error);
      // Token invalid, clear it
      setToken(null);
      setUser(null);
      localStorage.removeItem('autoiq_token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await apiClient.login({ email, password });
    // Convert snake_case to camelCase for User interface
    const user: User = {
      id: response.user.id,
      email: response.user.email,
      plan: response.user.plan,
      stripeCustomerId: response.user.stripe_customer_id,
      stripeSubscriptionId: response.user.stripe_subscription_id,
      created: response.user.created,
      updated: response.user.updated,
    };
    setToken(response.token);
    setUser(user);
    localStorage.setItem('autoiq_token', response.token);
  };

  const register = async (email: string, password: string, passwordConfirm: string) => {
    const response = await apiClient.register({ email, password, passwordConfirm });
    // Convert snake_case to camelCase for User interface
    const user: User = {
      id: response.user.id,
      email: response.user.email,
      plan: response.user.plan,
      stripeCustomerId: response.user.stripe_customer_id,
      stripeSubscriptionId: response.user.stripe_subscription_id,
      created: response.user.created,
      updated: response.user.updated,
    };
    setToken(response.token);
    setUser(user);
    localStorage.setItem('autoiq_token', response.token);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('autoiq_token');
  };

  const refreshUser = async () => {
    if (token) {
      await loadUser(token);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

