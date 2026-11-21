'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Lock,
  Mail,
  ArrowRight,
  Sun,
  Moon,
  Eye,
  EyeOff,
} from 'lucide-react';
import { notify } from '@/lib/notify';
import CarbonCrunchLogo from '@/components/common/CarbonCrunchLogo';

export default function LoginPage() {
  const router = useRouter();
  const { login, theme, toggleTheme } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const ok = await login(email, password);

      if (ok) {
        notify.success(`Signed in successfully as ${email}`);
        router.push('/');
      } else {
        const errMsg =
          'Invalid credentials. Please verify your email and password.';
        setError(errMsg);
        notify.error(errMsg);
      }
    } catch {
      const errMsg = 'Network error during authentication';
      setError(errMsg);
      notify.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };



  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
      {/* Dark / Light Mode Toggle */}
      <div className="absolute right-5 top-5">
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-md border border-slate-300 dark:border-slate-700/80 bg-white dark:bg-slate-900/80 p-2 text-slate-700 dark:text-slate-300 shadow-md backdrop-blur-md transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4 text-slate-600" />
          )}
        </button>
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* Carbon Crunch Logo & Header */}
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center">
            <CarbonCrunchLogo
              size={96}
              className="h-24 w-24 object-contain"
            />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Carbon <span className="text-emerald-700 dark:text-emerald-500">Crunch</span>
          </h1>

          <p className="mx-auto max-w-xs text-xs text-slate-600 dark:text-slate-400">
            Sign in to access your statutory compliance register,
            evidence verification, and audit workspace.
          </p>
        </div>

        {/* Login Box */}
        <div className="space-y-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-6 shadow-2xl backdrop-blur-md sm:p-8">
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-rose-500/40 bg-rose-50 dark:bg-rose-950/60 p-3 text-xs text-rose-700 dark:text-rose-300"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Email Address:
              </label>

              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />

                <input
                  id="email"
                  name="email"
                  placeholder="Enter your email address"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-2 pl-9 pr-3 text-xs text-slate-900 dark:text-white focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Password:
              </label>

              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />

                <input
                  id="password"
                  name="password"
                  placeholder="Enter your password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-2 pl-9 pr-10 text-xs text-slate-900 dark:text-white focus:border-emerald-600 focus:outline-none"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors focus:outline-none"
                  aria-label={
                    showPassword ? 'Hide password' : 'Show password'
                  }
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Sign In */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Signing in...' : 'Sign In'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>


        </div>
      </div>
    </div>
  );
}
