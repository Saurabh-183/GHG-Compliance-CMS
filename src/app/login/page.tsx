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
  ShieldCheck,
  FileSpreadsheet,
  Folder,
  CheckCircle2,
  Building2,
  Sparkles,
  KeyRound,
  Fingerprint,
} from 'lucide-react';
import { notify } from '@/lib/notify';
import CarbonCrunchLogo from '@/components/common/CarbonCrunchLogo';

export default function LoginPage() {
  const router = useRouter();
  const { login, theme, toggleTheme } = useAuth();
  const isDark = theme === 'dark';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const ok = await login(email, password);

      if (ok) {
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
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Dark / Light Mode Floating Toggle */}
      <div className="absolute right-4 top-4 z-30">
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-2.5 text-slate-600 dark:text-slate-300 shadow-sm backdrop-blur-md transition-all hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
          title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
          aria-label="Toggle theme"
        >
          {isDark ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4 text-slate-600" />
          )}
        </button>
      </div>

      {/* Left Column: Enterprise Value Proposition & Trust Showcase */}
      <div
        className="login-showcase-panel relative hidden lg:flex lg:w-1/2 xl:w-7/12 flex-col justify-between p-10 xl:p-14 text-white overflow-hidden border-r border-slate-800"
        style={{
          background: 'linear-gradient(155deg, #070F1E 0%, #0D1C34 50%, #091526 100%)',
        }}
      >
        {/* Subtle geometric dot grid overlay - clean & crisp, no distracting bright spotlights */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Top Header */}
        <div className="relative z-10 flex items-center gap-3.5">
          <div
            className="w-12 h-12 rounded-xl p-1.5 flex items-center justify-center shadow-md shrink-0"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
            }}
          >
            <CarbonCrunchLogo size={42} className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-tight text-gray-200 dark:text-white">
                Carbon <span className="text-emerald-400">Crunch</span>
              </span>
              <span
                className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full text-emerald-300 shrink-0"
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                }}
              >
                Enterprise Platform
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Statutory GHG Compliance & ESG Assurance Platform
            </p>
          </div>
        </div>

        {/* Center Content: Enterprise Hero & 3 Pillars */}
        <div className="relative z-10 my-auto py-8 space-y-6 max-w-xl">
          <div className="space-y-3">
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-emerald-300 text-xs font-semibold"
              style={{
                backgroundColor: 'rgba(6, 78, 59, 0.6)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
              }}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>BEE PAT Scheme & GHG Protocol Compliant</span>
            </div>
            <h2 className="text-2xl xl:text-3xl font-extrabold tracking-tight text-gray-100 dark:text-white leading-snug">
              Enterprise Compliance Registers, Automated Vaults & Auditor Provenance.
            </h2>
            <p className="text-xs xl:text-sm text-slate-300 leading-relaxed">
              Engineered for Designated Consumers, multi-facility industrial conglomerates, and environmental verifiers to streamline statutory reporting and audit filings with 100% transparency.
            </p>
          </div>

          {/* 3 Core Capability Cards */}
          <div className="space-y-3">
            <div
              className="showcase-card flex items-start gap-3.5 p-3.5 rounded-xl transition-all"
              style={{
                backgroundColor: '#112038',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <div
                className="p-2 rounded-lg text-emerald-400 shrink-0"
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                }}
              >
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-100 dark:text-white">Statutory Compliance Registers</h3>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-normal">
                  Pre-configured baseline parameters for PAT cycles, DISCOM electricity verification, turbine efficiency, and fuel combustion registers.
                </p>
              </div>
            </div>

            <div
              className="showcase-card flex items-start gap-3.5 p-3.5 rounded-xl transition-all"
              style={{
                backgroundColor: '#112038',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <div
                className="p-2 rounded-lg text-emerald-400 shrink-0"
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                }}
              >
                <Folder className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-100 dark:text-white">Automated Google Drive Evidence Vault</h3>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-normal">
                  Secure bi-directional syncing into target Google Drive folders with immutable audit logging and spreadsheet cell-level previews.
                </p>
              </div>
            </div>

            <div
              className="showcase-card flex items-start gap-3.5 p-3.5 rounded-xl transition-all"
              style={{
                backgroundColor: '#112038',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <div
                className="p-2 rounded-lg text-emerald-400 shrink-0"
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                }}
              >
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-100 dark:text-white">Segregated Multi-Tier Verification</h3>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-normal">
                  Certified segregation of duties between Facility Engineers, Lead Consultants, and Audit Reviewers for compliant Form-1 verification.
                </p>
              </div>
            </div>
          </div>

          {/* Key Assurance Metrics Row */}
          <div className="grid grid-cols-3 gap-3 pt-1">
            <div
              className="showcase-stat-box p-3 rounded-xl text-center"
              style={{
                backgroundColor: '#0F1E33',
                border: '1px solid rgba(255, 255, 255, 0.12)',
              }}
            >
              <div className="text-lg xl:text-xl font-extrabold text-emerald-400 font-mono">100%</div>
              <div className="text-[10px] text-slate-300 uppercase font-semibold tracking-wider mt-1">Audit Provenance</div>
            </div>
            <div
              className="showcase-stat-box p-3 rounded-xl text-center"
              style={{
                backgroundColor: '#0F1E33',
                border: '1px solid rgba(255, 255, 255, 0.12)',
              }}
            >
              <div className="text-lg xl:text-xl font-extrabold text-emerald-400 font-mono">PAT & BEE</div>
              <div className="text-[10px] text-slate-300 uppercase font-semibold tracking-wider mt-1">Statutory Logic</div>
            </div>
            <div
              className="showcase-stat-box p-3 rounded-xl text-center"
              style={{
                backgroundColor: '#0F1E33',
                border: '1px solid rgba(255, 255, 255, 0.12)',
              }}
            >
              <div className="text-lg xl:text-xl font-extrabold text-emerald-400 font-mono">256-Bit</div>
              <div className="text-[10px] text-slate-300 uppercase font-semibold tracking-wider mt-1">Vault Encryption</div>
            </div>
          </div>
        </div>

        {/* Bottom Trust & Compliance Footer */}
        <div
          className="relative z-10 pt-5 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-300"
          style={{ borderTop: '1px solid rgba(255, 255, 255, 0.12)' }}
        >
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <span>Trusted by Designated Consumers & Industrial Groups in India</span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[10px] text-slate-400">
            <span>ISO 14064-1</span>
            <span>·</span>
            <span>GHG PROTOCOL</span>
            <span>·</span>
            <span>SOC-2 READY</span>
          </div>
        </div>
      </div>

      {/* Right Column: Authentication Card */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-12 xl:p-16">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile Header (Visible only on smaller screens) */}
          <div className="lg:hidden text-center space-y-2 mb-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center">
              <CarbonCrunchLogo size={64} className="h-16 w-16 object-contain" />
            </div>
            <p className="text-xl font-extrabold text-red-200 dark:text-red-400">
              Carbon <span className="text-emerald-400 dark:text-red-300">Crunch</span>
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Statutory GHG Compliance & ESG Assurance Platform
            </p>
          </div>

          {/* Form Header */}
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
              <KeyRound className="w-3 h-3" />
              <span>Enterprise Sign-In</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Sign In to Your Workspace
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter your corporate credentials to access your facilities, compliance registers, and audit records.
            </p>
          </div>

          {/* Authentication Form Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-xl space-y-5">
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/60 p-3.5 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2.5"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Corporate Email */}
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Corporate Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 dark:text-slate-500" />
                  <input
                    id="email"
                    name="email"
                    placeholder="name@company.com"
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-2.5 pl-10 pr-3.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => notify.info('Please contact your organization compliance administrator to initiate a verified password reset.')}
                    className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>

                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 dark:text-slate-500" />
                  <input
                    id="password"
                    name="password"
                    placeholder="••••••••••••"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-2.5 pl-10 pr-11 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors focus:outline-none p-0.5"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me & SSO Options */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 dark:text-slate-400">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-[11px]">Remember this device</span>
                </label>

                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Fingerprint className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  256-bit TLS
                </span>
              </div>

              {/* Primary Action Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 px-4 py-3 text-xs font-bold text-white shadow-md shadow-emerald-700/20 transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                <span>{isSubmitting ? 'Authenticating with Compliance Vault...' : 'Sign In to Workspace'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>

          {/* Security & Regulatory Notice */}
          <div className="text-center space-y-2 text-[11px] text-slate-500 dark:text-slate-400">
            <p className="flex items-center justify-center gap-1.5 text-[10px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Authorized personnel access only. Sessions are audited & recorded.</span>
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              © {new Date().getFullYear()} Carbon Crunch · Statutory Compliance Management Platform. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

