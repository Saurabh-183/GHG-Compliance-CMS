'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types';
import {
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
  Layers,
} from 'lucide-react';
import { NotificationBell } from '@/components/common/NotificationBell';

export const Navbar: React.FC = () => {
  const pathname = usePathname();

  const {
    currentRole,
    currentUser,
    switchRole,
    reseedData,
    logout,
    theme,
    toggleTheme,
  } = useAuth();

  const [isReseeding, setIsReseeding] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Do not show the header on the login page.
  if (pathname === '/login') {
    return null;
  }

  const isClientPortal =
    currentRole === 'CLIENT' || pathname.startsWith('/portal');

  const isLight = theme === 'light';

  const handleReseed = async () => {
    setIsReseeding(true);

    try {
      const ok = await reseedData();

      if (ok) {
        setTimeout(() => {
          window.location.reload();
        }, 800);
      }
    } finally {
      setIsReseeding(false);
    }
  };

  const getNavItems = () => {
    if (isClientPortal) {
      return [
        { label: 'Client Overview', href: '/portal', icon: Layers },
        {
          label: 'Trident Paper',
          href: '/portal/facilities/TRIDENT_PAPER',
          icon: Building2,
        },
        {
          label: 'Data Requests',
          href: '/portal/requests',
          icon: FileSpreadsheet,
        },
        {
          label: 'Clarifications',
          href: '/portal/submissions',
          icon: CheckCircle2,
        },
        {
          label: 'Approved History',
          href: '/portal/history',
          icon: CheckCircle2,
        },
      ];
    }

    const items = [
      { label: 'Workspace', href: '/dashboard', icon: Layers },
      { label: 'Clients & Units', href: '/clients', icon: Building2 },
    ];

    if (
      currentRole === 'ADMIN' ||
      currentRole === 'CONSULTANT'
    ) {
      items.push({
        label: 'Approvals Queue',
        href: '/approvals',
        icon: CheckCircle2,
      });
    }

    items.push({
      label: 'Compliance Calendar',
      href: '/calendar',
      icon: Calendar,
    });

    return items;
  };

  const navItems = getNavItems();

  const getNavLinkClass = (isActive: boolean) => {
    if (isActive) {
      return isLight
        ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold shadow-2xs'
        : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 font-semibold';
    }

    return isLight
      ? '   hover:text-slate-900 hover:bg-slate-100'
      : 'text-slate-300 hover:text-white hover:bg-slate-800/60';
  };

  return (
    <header
      className={`sticky top-0 z-40 w-full backdrop-blur-md transition-colors ${
        isLight
          ? 'border-b border-slate-200 bg-white/95 shadow-xs text-slate-900'
          : 'border-b border-slate-800 bg-slate-950/90 text-white'
      }`}
    >
      {/* Top status bar */}
      <div
        className={`px-3 py-1.5 text-xs transition-colors sm:px-4 ${
          isLight
            ? 'border-b border-slate-200 bg-slate-100/90 text-slate-700'
            : 'border-b border-slate-800/80 bg-slate-950/90 text-slate-300'
        }`}
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-x-auto py-0.5">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
            </span>

            <span
              className={`text-[11px] font-medium ${
                isLight ? '  ' : 'text-slate-300'
              }`}
            >
              Active User:{' '}
              <strong
                className={
                  isLight
                    ? 'font-bold text-slate-900'
                    : 'font-bold text-white'
                }
              >
                {currentUser?.name}
              </strong>
            </span>

            <span
              className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                isLight
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                  : 'border-emerald-800/60 bg-emerald-950/60 text-emerald-300'
              }`}
            >
              {currentRole}
            </span>

            {currentRole === 'CLIENT' && (
              <span
                className={`hidden text-[10px] font-medium sm:inline ${
                  isLight ? 'text-slate-500' : ' '
                }`}
              >
                (Client Portal Protected Workspace)
              </span>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <NotificationBell />

            <button
              type="button"
              onClick={toggleTheme}
              className={`rounded-lg border p-1.5 transition-colors ${
                isLight
                  ? 'border-slate-300 bg-white text-slate-700 shadow-2xs hover:bg-slate-100 hover:text-emerald-700'
                  : 'border-slate-700 bg-slate-800/90 text-slate-300 hover:bg-slate-700 hover:text-emerald-400'
              }`}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="h-3.5 w-3.5 text-amber-400" />
              ) : (
                <Moon className="h-3.5 w-3.5 text-slate-700" />
              )}
            </button>

            <button
              type="button"
              onClick={handleReseed}
              disabled={isReseeding}
              className={`inline-flex items-center gap-1 rounded border px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-50 ${
                isLight
                  ? 'border-slate-300 bg-white text-slate-700 shadow-2xs hover:bg-slate-100 hover:text-emerald-700'
                  : 'border-slate-700 bg-slate-800/90 text-slate-300 hover:bg-slate-700 hover:text-emerald-300'
              }`}
              title="Reset database to Trident Paper demo state"
            >
              <RotateCcw
                className={`h-3 w-3 ${
                  isReseeding
                    ? 'animate-spin text-emerald-600'
                    : ''
                }`}
              />
              <span className="hidden xs:inline">
                {isReseeding ? 'Resetting...' : 'Reset Demo'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main navigation */}
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link
            href={isClientPortal ? '/portal' : '/dashboard'}
            className="group flex items-center gap-2.5"
          >
            {/* Carbon Crunch logo replaces ShieldCheck */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center">
              <Image
                src="/carbon-crunch-logo.png"
                alt="Carbon Crunch"
                width={40}
                height={40}
                className="h-10 w-10 object-contain"
                priority
              />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-sm font-bold tracking-tight ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`}
                >
                  Carbon
                </span>

                <span
                  className={`text-sm font-bold tracking-tight ${
                    isLight ? 'text-emerald-700' : 'text-emerald-500'
                  }`}
                >
                  Crunch
                </span>

                {isClientPortal && (
                  <span
                    className={`rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                      isLight
                        ? 'border-slate-300 bg-slate-100 text-slate-700'
                        : 'border-slate-700 bg-slate-800 text-slate-300'
                    }`}
                  >
                    Client Portal
                  </span>
                )}
              </div>

              <p
                className={`hidden text-[10px] font-normal tracking-wide sm:block ${
                  isLight ? 'text-slate-500' : ' '
                }`}
              >
                Compliance Management Platform
              </p>
            </div>
          </Link>

          {/* Desktop navigation */}
          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => {
              const Icon = item.icon;

              const isActive =
                pathname === item.href ||
                (item.href !== '/dashboard' &&
                  item.href !== '/portal' &&
                  pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-1.5 rounded-md border border-transparent px-3 py-1.5 text-xs font-medium transition-all ${getNavLinkClass(
                    isActive
                  )}`}
                >
                  <Icon
                    className={`h-3.5 w-3.5 ${
                      isActive
                        ? isLight
                          ? 'text-emerald-700'
                          : 'text-emerald-400'
                        : isLight
                          ? 'text-slate-500'
                          : ' '
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden text-right sm:block">
            <div
              className={`text-xs font-semibold ${
                isLight ? 'text-slate-900' : '   dark:text-white'
              }`}
            >
              {currentUser?.name || 'User'}
            </div>

            <div
              className={`text-[10px] ${
                isLight ? 'text-slate-500' : ' '
              }`}
            >
              {currentUser?.designation || currentRole}
            </div>
          </div>

          <div
            className={`flex items-center gap-1.5 rounded-full border p-1 ${
              isLight
                ? 'border-slate-300 bg-slate-100'
                : 'border-slate-700 bg-slate-800'
            }`}
          >
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                isLight
                  ? 'bg-emerald-700 text-white'
                  : 'bg-emerald-800 text-emerald-100'
              }`}
            >
              {currentUser?.name
                ? currentUser.name[0]
                : 'U'}
            </div>

            <span
              className={`mr-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                isLight
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                  : 'border-emerald-800/60 bg-emerald-950/60 text-emerald-300'
              }`}
            >
              {currentRole}
            </span>
          </div>

          <button
            type="button"
            onClick={logout}
            className={`rounded-lg border p-1.5 transition-colors ${
              isLight
                ? 'border-slate-300 bg-white text-slate-500 shadow-2xs hover:bg-rose-50 hover:text-rose-700'
                : 'border-slate-700 bg-slate-800/80   hover:bg-rose-950/60 hover:text-rose-300'
            }`}
            title="Log Out (Clear Session Cookie)"
            aria-label="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() =>
              setMobileMenuOpen((open) => !open)
            }
            className={`rounded-lg border p-1.5 lg:hidden ${
              isLight
                ? 'border-slate-300 bg-white text-slate-700 hover:text-slate-900'
                : 'border-slate-700 bg-slate-800 text-slate-300 hover:text-white'
            }`}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile navigation */}
      {mobileMenuOpen && (
        <div
          className={`animate-fade-in space-y-2 border-t px-4 pb-5 pt-3 shadow-2xl lg:hidden ${
            isLight
              ? 'border-slate-200 bg-white'
              : 'border-slate-800 bg-slate-950/95'
          }`}
        >
          <div
            className={`px-2 pb-1 text-xs font-semibold uppercase tracking-wider ${
              isLight ? 'text-slate-500' : ' '
            }`}
          >
            Navigation Menu
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;

            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' &&
                item.href !== '/portal' &&
                pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  isActive
                    ? isLight
                      ? 'border border-emerald-300 bg-emerald-50 font-semibold text-emerald-800'
                      : 'border border-emerald-800/60 bg-emerald-950/60 text-emerald-300'
                    : isLight
                      ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon
                  className={`h-4 w-4 ${
                    isLight
                      ? 'text-emerald-700'
                      : 'text-emerald-500'
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
};
