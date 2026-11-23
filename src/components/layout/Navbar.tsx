'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
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
  HardDrive,
} from 'lucide-react';
import { NotificationBell } from '@/components/common/NotificationBell';
import { PortalFacilityNavDropdown } from '@/components/portal/PortalFacilityNavDropdown';
import { buildPortalScopeQuery, readPortalFacilityId, readPortalPeriod } from '@/lib/portalScope';

export const Navbar: React.FC = () => {
  const pathname = usePathname();

  const {
    currentRole,
    currentUser,
    logout,
    theme,
    toggleTheme,
  } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [portalScopeQs, setPortalScopeQs] = useState('');

  const isClientPortal =
    currentRole === 'CLIENT' || pathname.startsWith('/portal');

  useEffect(() => {
    if (!isClientPortal) return;
    setPortalScopeQs(buildPortalScopeQuery(readPortalFacilityId(), readPortalPeriod()));
  }, [isClientPortal, pathname]);

  // Do not show the header on the login page.
  if (pathname === '/login') {
    return null;
  }

  const isLight = theme === 'light';



  const getNavItems = () => {
    if (isClientPortal) {
      return [
        { label: 'Client Overview', href: '/portal', icon: Layers },
        { label: 'Data Requests', href: `/portal/requests${portalScopeQs}`, icon: FileSpreadsheet },
        { label: 'Approved History', href: '/portal/history', icon: CheckCircle2 },
        { label: 'Drive Documents', href: `/drive-explorer${portalScopeQs}`, icon: HardDrive },
      ];
    }

    const items = [
      { label: 'Workspace', href: '/dashboard', icon: Layers },
      { label: 'Clients & Units', href: '/clients', icon: Building2 },
      { label: 'Drive Explorer', href: '/drive-explorer', icon: HardDrive },
    ];

    if (currentRole === 'ADMIN') {
      items.push({
        label: 'Checklist Config',
        href: '/admin/data-requirements',
        icon: FileSpreadsheet,
      });
    }

    if (currentRole === 'CONSULTANT') {
      items.push({
        label: 'Data Requests',
        href: '/data-requests',
        icon: FileSpreadsheet,
      });
    }

    if (
      currentRole === 'ADMIN' ||
      currentRole === 'CONSULTANT'
    ) {
      items.push({
        label: 'Data Review',
        href: '/data-review',
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
        ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold'
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
      {/* Main navigation */}
      <div className="mx-auto flex h-16 w-full max-w-[96rem] items-center justify-between px-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5 sm:gap-4 xl:gap-6 min-w-0">
          <Link
            href={isClientPortal ? '/portal' : '/dashboard'}
            className="group flex items-center gap-2.5 shrink-0"
          >
            {/* Carbon Crunch logo */}
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

            <div className="shrink-0">
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
                className={`hidden text-[9px] mt-0.5 font-normal tracking-wide xl:block ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                Compliance Management Platform
              </p>
            </div>
          </Link>

          {/* Desktop navigation */}
          <nav className="hidden items-center gap-1 lg:flex shrink-0">
            {isClientPortal && (
              <>
                {navItems
                  .filter((item) => item.href === '/portal')
                  .map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === '/portal';
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`inline-flex items-center gap-1.5 rounded-md border border-transparent px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${getNavLinkClass(
                          isActive
                        )}`}
                      >
                        <Icon
                          className={`h-3.5 w-3.5 shrink-0 ${
                            isActive
                              ? isLight
                                ? 'text-emerald-700'
                                : 'text-emerald-400'
                              : isLight
                                ? 'text-slate-500'
                                : 'text-slate-400'
                          }`}
                        />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                <PortalFacilityNavDropdown isLight={isLight} getNavLinkClass={getNavLinkClass} />
              </>
            )}
            {(isClientPortal ? navItems.filter((item) => item.href !== '/portal') : navItems).map((item) => {
              const Icon = item.icon;

              const isActive =
                pathname === item.href ||
                (item.href !== '/dashboard' &&
                  item.href !== '/portal' &&
                  pathname.startsWith(item.href.split('?')[0] || item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-1.5 rounded-md border border-transparent px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${getNavLinkClass(
                    isActive
                  )}`}
                >
                  <Icon
                    className={`h-3.5 w-3.5 shrink-0 ${
                      isActive
                        ? isLight
                          ? 'text-emerald-700'
                          : 'text-emerald-400'
                        : isLight
                          ? 'text-slate-500'
                          : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 ml-2 sm:ml-4">
          <NotificationBell />

          <button
            type="button"
            onClick={toggleTheme}
            className={`rounded-lg border p-1.5 transition-colors ${
              isLight
                ? 'border-slate-200 bg-white text-slate-600 shadow-2xs hover:bg-slate-100 hover:text-emerald-700'
                : 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-emerald-400'
            }`}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-600" />
            )}
          </button>

          <div className="hidden h-5 w-px bg-slate-200 dark:bg-slate-800 sm:block" />

          {/* User badge */}
          <div
            className={`flex items-center gap-2 rounded-full border px-2.5 py-1 transition-colors ${
              isLight
                ? 'border-slate-200 bg-slate-50 shadow-2xs'
                : 'border-slate-800 bg-slate-900'
            }`}
          >
            <div className="relative">
              <div
                className={`user-avatar flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shrink-0 ${
                  isLight
                    ? 'bg-[#17365D] text-white'
                    : 'bg-emerald-800 text-emerald-100'
                }`}
                style={isLight ? { backgroundColor: '#17365D', color: '#FFFFFF' } : undefined}
              >
                <span style={isLight ? { color: '#FFFFFF' } : undefined} className="text-white">
                  {currentUser?.name ? currentUser.name[0] : 'U'}
                </span>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-950" />
            </div>

            <div className="hidden text-left sm:block">
              <div
                className={`text-xs font-semibold whitespace-nowrap leading-tight ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}
              >
                {currentUser?.name || 'User'}
              </div>

              {currentUser?.designation && (
                <div
                  className="hidden 2xl:block text-[10px] text-slate-500 dark:text-slate-400 max-w-[130px] truncate leading-none mt-0.5"
                  title={currentUser.designation}
                >
                  {currentUser.designation}
                </div>
              )}
            </div>

            <span
              className={`rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
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
                ? 'border-slate-200 bg-white text-slate-500 shadow-2xs hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'
                : 'border-slate-800 bg-slate-900 text-slate-400 hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-900'
            }`}
            title="Log Out"
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
                ? 'border-slate-200 bg-white text-slate-700 hover:text-slate-900'
                : 'border-slate-800 bg-slate-900 text-slate-300 hover:text-white'
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

          {isClientPortal ? (
            <>
              {navItems
                .filter((item) => item.href === '/portal')
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === '/portal';
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
                      <Icon className={`h-4 w-4 ${isLight ? 'text-emerald-700' : 'text-emerald-500'}`} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              <PortalFacilityNavDropdown
                isLight={isLight}
                getNavLinkClass={getNavLinkClass}
                variant="mobile"
                onNavigate={() => setMobileMenuOpen(false)}
              />
              {navItems
                .filter((item) => item.href !== '/portal')
                .map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(item.href.split('?')[0] || item.href);
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
                        className={`h-4 w-4 ${isLight ? 'text-emerald-700' : 'text-emerald-500'}`}
                      />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
            </>
          ) : (
            navItems.map((item) => {
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
                    className={`h-4 w-4 ${isLight ? 'text-emerald-700' : 'text-emerald-500'}`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })
          )}
        </div>
      )}
    </header>
  );
};
