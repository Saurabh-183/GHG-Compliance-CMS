'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IUser, UserRole } from '@/types';
import { notify } from '@/lib/notify';

interface AuthContextType {
  currentUser: IUser | null; currentRole: UserRole; isLoading: boolean;
  theme: 'dark' | 'light'; toggleTheme: () => void;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [currentRole, setCurrentRole] = useState<UserRole>('CLIENT');
  const [currentUser, setCurrentUser] = useState<IUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('cc_theme') as 'dark' | 'light' | null;
    const initialTheme = savedTheme || 'light'; setTheme(initialTheme);
    document.documentElement.classList.toggle('dark', initialTheme === 'dark');
    document.documentElement.classList.toggle('light', initialTheme === 'light');
    (async () => {
      try {
        const response = await fetch('/api/auth/me', { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          if (data.user) { setCurrentUser(data.user); setCurrentRole(data.user.role); }
        } else setCurrentUser(null);
      } catch { setCurrentUser(null); }
      finally { setIsLoading(false); }
    })();
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'; setTheme(next);
    localStorage.setItem('cc_theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    document.documentElement.classList.toggle('light', next === 'light');
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const data = await response.json();
      if (!response.ok) { notify.error(data.error || 'Unable to sign in.'); return false; }
      setCurrentUser(data.user); setCurrentRole(data.user.role);
      notify.success(`Welcome back, ${data.user.name}!`); return true;
    } catch { notify.error('Network error during authentication.'); return false; }
    finally { setIsLoading(false); }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      notify.info('Signed out successfully.');
    } finally {
      setCurrentUser(null);
      setCurrentRole('CLIENT');
      setIsLoading(false);
      router.replace('/login');
    }
  };



  return <AuthContext.Provider value={{ currentUser, currentRole, isLoading, theme, toggleTheme, login, logout }}>{children}</AuthContext.Provider>;
};
export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error('useAuth must be used within an AuthProvider'); return context; }
