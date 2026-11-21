'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { notify } from '@/lib/notify';
import { Eye, EyeOff } from 'lucide-react';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      notify.error('New passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Password update failed.');
      notify.success('Password updated. Sign in with your new password.');
      router.replace('/login');
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Password update failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-7 shadow-xl dark:border-slate-800 dark:bg-slate-900"
      >
        <h1 className="text-xl font-bold">Change your password</h1>
        <p className="text-sm text-slate-500">
          Your administrator provided a temporary password. Set a new password to continue.
        </p>

        <label className="block text-sm">
          Current password
          <div className="relative mt-1">
            <input
              required
              type={showCurrent ? 'text' : 'password'}
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded border p-2 pr-10 text-slate-900 dark:text-white dark:bg-slate-950 dark:border-slate-700"
            />
            <button
              type="button"
              onClick={() => setShowCurrent((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
              aria-label={showCurrent ? 'Hide password' : 'Show password'}
              title={showCurrent ? 'Hide password' : 'Show password'}
            >
              {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>

        <label className="block text-sm">
          New password
          <div className="relative mt-1">
            <input
              required
              minLength={12}
              maxLength={128}
              type={showNew ? 'text' : 'password'}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded border p-2 pr-10 text-slate-900 dark:text-white dark:bg-slate-950 dark:border-slate-700"
            />
            <button
              type="button"
              onClick={() => setShowNew((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
              aria-label={showNew ? 'Hide password' : 'Show password'}
              title={showNew ? 'Hide password' : 'Show password'}
            >
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <span className="text-xs text-slate-500">Use at least 12 characters.</span>
        </label>

        <label className="block text-sm">
          Confirm new password
          <div className="relative mt-1">
            <input
              required
              minLength={12}
              maxLength={128}
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded border p-2 pr-10 text-slate-900 dark:text-white dark:bg-slate-950 dark:border-slate-700"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
              aria-label={showConfirm ? 'Hide password' : 'Show password'}
              title={showConfirm ? 'Hide password' : 'Show password'}
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>

        <button
          disabled={busy}
          className="w-full rounded bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:bg-emerald-800 transition-colors"
        >
          {busy ? 'Updating...' : 'Update password'}
        </button>
      </form>
    </main>
  );
}
