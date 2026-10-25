'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types';
import {
  ShieldCheck,
  Building2,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  RotateCcw,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  ExternalLink,
  Layers,
  Sparkles,
} from 'lucide-react';
import { NotificationBell } from '@/components/common/NotificationBell';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { currentRole, currentUser, switchRole, reseedData, logout, theme, toggleTheme } = useAuth();
  const [isReseeding, setIsReseeding] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Do not show header on login page
  if (pathname === '/login') {
    return null;
  }

  const isClientPortal = currentRole === 'CLIENT' || pathname.startsWith('/portal');

  const handleReseed = async () => {
    setIsReseeding(true);
    const ok = await reseedData();
    setIsReseeding(false);
    if (ok) {
      setTimeout(() => {
        window.location.reload();
      }, 800);
    }
  };

  const getNavItems = () => {
    if (isClientPortal) {
      return [
        { label: 'Client Overview', href: '/portal', icon: Layers },
        { label: 'Trident Paper', href: '/portal/facilities/TRIDENT_PAPER', icon: Building2 },
        { label: 'Data Requests', href: '/portal/requests', icon: FileSpreadsheet },
        { label: 'Clarifications', href: '/portal/submissions', icon: CheckCircle2 },
        { label: 'Approved History', href: '/portal/history', icon: ShieldCheck },
      ];
    }

    const items = [
      { label: 'Workspace', href: '/dashboard', icon: Layers },
      { label: 'Clients & Units', href: '/clients', icon: Building2 },
      // { label: 'Trident Paper Matrix', href: '/facilities/TRIDENT_PAPER', icon: FileSpreadsheet },
    ];

    // Consultant and Admin have full access to Approvals Queue
    if (currentRole === 'ADMIN' || currentRole === 'CONSULTANT') {
      items.push({ label: 'Approvals Queue', href: '/approvals', icon: CheckCircle2 });
    }

    items.push({ label: 'Compliance Calendar', href: '/calendar', icon: Calendar });
    return items;
  };

  const navItems = getNavItems();
  const isLight = theme === 'light';

  return (
    <header className={`sticky top-0 z-40 w-full backdrop-blur-md transition-colors ${
      isLight
        ? 'border-b border-slate-200 bg-white/95 shadow-xs text-slate-900'
        : 'border-b border-slate-800 bg-slate-950/90 text-white'
    }`}>
      <div className={`px-3 sm:px-4 py-1.5 text-xs transition-colors ${
        isLight
          ? 'bg-slate-100/90 border-b border-slate-200 text-slate-700'
          : 'bg-slate-950/90 border-b border-slate-800/80 text-slate-300'
      }`}>
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-x-auto py-0.5">
            <span className="flex h-2 w-2 relative shrink-0">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
            </span>
            <span className={`text-[11px] font-medium ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              Active User: <strong className={isLight ? 'text-slate-900 font-bold' : 'text-white'}>{currentUser?.name}</strong>
            </span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
              isLight
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
            }`}>
              {currentRole}
            </span>
            {currentRole === 'CLIENT' && (
              <span className={`text-[10px] font-medium hidden sm:inline ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                (Client Portal Protected Workspace)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <NotificationBell />
            <button
              onClick={toggleTheme}
              className={`p-1.5 rounded-lg transition-colors border ${
                isLight
                  ? 'bg-white text-slate-700 hover:text-emerald-700 hover:bg-slate-100 border-slate-300 shadow-2xs'
                  : 'bg-slate-800/90 text-slate-300 hover:text-emerald-400 hover:bg-slate-700 border-slate-700'
              }`}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-slate-700" />
              )}
            </button>
            <button
              onClick={handleReseed}
              disabled={isReseeding}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-colors border ${
                isLight
                  ? 'bg-white text-slate-700 hover:text-emerald-700 hover:bg-slate-100 border-slate-300 shadow-2xs'
                  : 'bg-slate-800/90 text-slate-300 hover:text-emerald-300 hover:bg-slate-700 border-slate-700'
              }`}
              title="Reset database to Trident Paper demo state"
            >
              <RotateCcw className={`w-3 h-3 ${isReseeding ? 'animate-spin text-emerald-600' : ''}`} />
              <span className="hidden xs:inline">{isReseeding ? 'Resetting...' : 'Reset Demo'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href={isClientPortal ? '/portal' : '/dashboard'} className="flex items-center gap-2.5 group">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
              isLight
                ? 'bg-emerald-50 border border-emerald-300 text-emerald-700 group-hover:border-emerald-600'
                : 'bg-emerald-900/60 border border-emerald-700/60 text-emerald-300 group-hover:border-emerald-600'
            }`}>
              <ShieldCheck className={`w-4.5 h-4.5 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className={`font-bold text-sm tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>Carbon</span>
                <span className={`font-bold text-sm tracking-tight ${isLight ? 'text-emerald-700' : 'text-emerald-500'}`}>Crunch</span>
                {isClientPortal && (
                  <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded uppercase tracking-wider ${
                    isLight
                      ? 'bg-slate-100 text-slate-700 border border-slate-300'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}>
                    Client Portal
                  </span>
                )}
              </div>
              <p className={`text-[10px] tracking-wide font-normal hidden sm:block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Compliance Management Platform
              </p>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== '/dashboard' && item.href !== '/portal' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    isActive
                      ? isLight
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold shadow-2xs'
                        : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 font-semibold'
                      : isLight
                        ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${
                    isActive
                      ? isLight ? 'text-emerald-700' : 'text-emerald-400'
                      : isLight ? 'text-slate-500' : 'text-slate-400'
                  }`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="text-right hidden sm:block">
            <div className={`text-xs font-semibold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
              {currentUser?.name || 'User'}
            </div>
            <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              {currentUser?.designation || currentRole}
            </div>
          </div>

          <div className={`flex items-center gap-1.5 p-1 rounded-full border ${
            isLight
              ? 'bg-slate-100 border-slate-300'
              : 'bg-slate-800 border-slate-700'
          }`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
              isLight ? 'bg-emerald-700 text-white' : 'bg-emerald-800 text-emerald-100'
            }`}>
              {currentUser?.name ? currentUser.name[0] : 'U'}
            </div>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full uppercase tracking-wider mr-1 ${
              isLight
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
            }`}>
              {currentRole}
            </span>
          </div>

          <button
            onClick={logout}
            className={`p-1.5 rounded-lg border transition-colors ${
              isLight
                ? 'bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-700 border-slate-300 shadow-2xs'
                : 'bg-slate-800/80 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border-slate-700'
            }`}
            title="Log Out (Clear Session Cookie)"
          >
            <LogOut className="w-4 h-4" />
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`p-1.5 rounded-lg lg:hidden border ${
              isLight
                ? 'bg-white text-slate-700 hover:text-slate-900 border-slate-300'
                : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
            }`}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className={`lg:hidden border-t px-4 pt-3 pb-5 space-y-2 animate-fade-in shadow-2xl ${
          isLight
            ? 'border-slate-200 bg-white'
            : 'border-slate-800 bg-slate-950/95'
        }`}>
          <div className={`text-xs font-semibold uppercase tracking-wider px-2 pb-1 ${
            isLight ? 'text-slate-500' : 'text-slate-400'
          }`}>
            Navigation Menu
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && item.href !== '/portal' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                  isActive
                    ? isLight
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold'
                      : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                    : isLight
                      ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isLight ? 'text-emerald-700' : 'text-emerald-500'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
};
