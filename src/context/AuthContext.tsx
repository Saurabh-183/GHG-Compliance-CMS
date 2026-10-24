'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IUser, UserRole } from '@/types';
import { notify } from '@/lib/notify';

interface AuthContextType {
  currentUser: IUser | null;
  currentRole: UserRole;
  isLoading: boolean;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  switchRole: (role: UserRole) => Promise<void>;
  login: (email: string, role?: UserRole) => Promise<boolean>;
  logout: () => Promise<void>;
  reseedData: () => Promise<boolean>;
}

const defaultUserForRole: Record<UserRole, IUser> = {
  ADMIN: {
    _id: 'USR_ADMIN_01',
    name: 'Saurabh Agnihotri',
    email: 'admin@carboncrunch.com',
    role: 'ADMIN',
    designation: 'Principal Compliance Architect',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
  },
  CONSULTANT: {
    _id: 'USR_CONS_01',
    name: 'Priya Sharma',
    email: 'consultant@carboncrunch.com',
    role: 'CONSULTANT',
    designation: 'Senior Energy & Carbon Consultant',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=faces',
  },
  REVIEWER: {
    _id: 'USR_REV_01',
    name: 'Dr. Rajesh Nair',
    email: 'reviewer@carboncrunch.com',
    role: 'REVIEWER',
    designation: 'Chief Compliance Auditor & Reviewer',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces',
  },
  CLIENT: {
    _id: 'USR_CLIENT_01',
    name: 'Vikram Singh',
    email: 'client@tridentindia.com',
    role: 'CLIENT',
    clientGroupId: 'TRIDENT',
    authorizedFacilityIds: ['TRIDENT_PAPER', 'TRIDENT_YARN', 'TRIDENT_TEXTILES'],
    designation: 'Head of Regulatory Affairs & Sustainability',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces',
  },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [currentRole, setCurrentRole] = useState<UserRole>('CONSULTANT');
  const [currentUser, setCurrentUser] = useState<IUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Initialize theme and role on mount
  useEffect(() => {
    // 1. Theme initialization
    const savedTheme = localStorage.getItem('cc_theme') as 'dark' | 'light' | null;
    const initialTheme = savedTheme || 'dark';
    setTheme(initialTheme);
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }

    // 2. Fetch current authenticated session from cookie
    async function initSession() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = (await res.json()) as { user: IUser };
          if (data.user) {
            setCurrentUser(data.user);
            setCurrentRole(data.user.role);
            localStorage.setItem('cc_active_role', data.user.role);
          }
        } else {
          // No active session in cookie -> user is unauthenticated
          setCurrentUser(null);
        }
      } catch (e) {
        console.warn('Session init error:', e);
        setCurrentUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    initSession();
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('cc_theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      notify.info('Switched to Dark Mode');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
      notify.info('Switched to Light Mode');
    }
  };

  const switchRole = async (role: UserRole, showToast = true) => {
    setIsLoading(true);
    setCurrentRole(role);
    setCurrentUser(defaultUserForRole[role]);
    localStorage.setItem('cc_active_role', role);

    try {
      // Call login endpoint so real JWT is written to cc_auth_token cookie
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        const data = (await res.json()) as { user: IUser };
        setCurrentUser(data.user);
        if (showToast) {
          notify.success(`Role switched to ${role} (${data.user.name})`);
        }
      }
    } catch (e) {
      console.warn('Could not sync cookie on role switch:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, role?: UserRole): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });
      if (res.ok) {
        const data = (await res.json()) as { user: IUser };
        setCurrentUser(data.user);
        setCurrentRole(data.user.role);
        localStorage.setItem('cc_active_role', data.user.role);
        notify.success(`Welcome back, ${data.user.name}!`);
        return true;
      }
      notify.error('Invalid email or password credentials');
      return false;
    } catch {
      notify.error('Network error during authentication');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setCurrentUser(null);
      localStorage.removeItem('cc_active_role');
      notify.info('Logged out. Session cookie cleared.');
      router.push('/login');
    } catch {
      notify.error('Failed to log out properly');
    } finally {
      setIsLoading(false);
    }
  };

  const reseedData = async (): Promise<boolean> => {
    try {
      notify.info('Resetting and seeding demo database with Trident Group data...');
      const res = await fetch('/api/seed', { method: 'POST' });
      if (res.ok) {
        notify.success('Database reset & seeded successfully!');
        return true;
      }
      notify.error('Failed to reseed database');
      return false;
    } catch {
      notify.error('Network error while resetting database');
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole,
        isLoading,
        theme,
        toggleTheme,
        switchRole,
        login,
        logout,
        reseedData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
