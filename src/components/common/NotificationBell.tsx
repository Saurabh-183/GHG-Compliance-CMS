'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  ShieldCheck,
  Send,
  Clock,
  Check,
} from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/utils';

interface NotificationItem {
  _id: string;
  recipientRole: string;
  senderRole: string;
  senderName: string;
  type: string;
  title: string;
  message: string;
  linkUrl: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export const NotificationBell: React.FC = () => {
  const router = useRouter();
  const { currentRole, currentUser, isLoading, theme } = useAuth();
  const isLight = theme === 'light';
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [notificationError, setNotificationError] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    if (isLoading || !currentUser) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store', credentials: 'include' });
      if (res.status === 401 || res.status === 403) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Notification request failed (${res.status})`);
      setNotifications(json.data || []);
      setUnreadCount(json.unreadCount || 0);
      setNotificationError('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load notifications';
      setNotificationError(message);
      console.warn('Notification fetch warning:', message);
    }
  };

  useEffect(() => {
    if (isLoading || !currentUser) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    void fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    const onFocus = () => { void fetchNotifications(); };
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [currentRole, currentUser, isLoading]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string, linkUrl: string) => {
    const clientDestination = currentRole === 'CLIENT'
      ? linkUrl.replace(/^\/assessments\/([^/?#]+).*$/, '/portal/regulatory/$1')
      : linkUrl;
    const destination = clientDestination.startsWith('/') ? clientDestination : '/portal';

    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        credentials: 'include',
        cache: 'no-store',
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        console.error('Unable to mark notification as read:', payload.error || response.statusText);
      } else {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (e) {
      console.error('Notification read request failed:', e);
    } finally {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      const nowIso = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true, readAt: nowIso } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setIsOpen(false);
      router.push(destination);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications/mark-all', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: currentRole }),
      });
      const nowIso = new Date().toISOString();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, readAt: nowIso })));
      setUnreadCount(0);
    } catch (e) {
      console.error(e);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'CLARIFICATION_RAISED':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'CLARIFICATION_RESPONDED':
        return <Send className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'EVIDENCE_SUBMITTED':
        return <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'REVIEW_REQUESTED':
        return <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      case 'DATASET_APPROVED':
        return <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'DATASET_REJECTED':
      case 'REGULATORY_RETURNED':
        return <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
      case 'DEADLINE_REMINDER':
        return <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
      case 'REGULATORY_DATA_REQUESTED':
      case 'REGULATORY_SUBMITTED':
        return <FileSpreadsheet className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'REGULATORY_APPROVED':
        return <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      default:
        return <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
    }
  };

  const hasUrgentDeadlineAlerts = notifications.some(
    (n) => !n.isRead && n.type === 'DEADLINE_REMINDER'
  );

  if (!currentUser) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => {
          setIsOpen((open) => !open);
          void fetchNotifications();
        }}
        className={`relative p-1.5 rounded-lg border transition-colors ${
          hasUrgentDeadlineAlerts
            ? isLight
              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-300 shadow-2xs ring-2 ring-rose-400/40'
              : 'bg-rose-950/40 text-rose-300 hover:bg-rose-900/40 border-rose-800 ring-2 ring-rose-500/40'
            : isLight
              ? 'bg-white text-slate-700 hover:text-emerald-700 hover:bg-slate-100 border-slate-300 shadow-2xs'
              : 'bg-slate-800/90 text-slate-300 hover:text-emerald-400 hover:bg-slate-700 border-slate-700'
        }`}
        title="Audit & Compliance Notifications"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span
            className={`notification-badge absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm ${
              hasUrgentDeadlineAlerts ? 'bg-rose-600 animate-pulse ring-1 ring-rose-300' : 'bg-emerald-700'
            }`}
            style={{ color: '#FFFFFF' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={`absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border shadow-2xl z-50 overflow-hidden animate-fade-in ${
          isLight
            ? 'bg-white border-slate-200'
            : 'bg-slate-900 border-slate-700'
        }`}>
          {/* Header */}
          <div className={`flex items-center justify-between px-4 py-3 border-b ${
            isLight
              ? 'border-slate-200 bg-slate-50'
              : 'border-slate-800 bg-slate-950/80'
          }`}>
            <div className="flex items-center gap-2">
              <span className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>Notifications</span>
              {unreadCount > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  isLight
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}>
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className={`text-[11px] flex items-center gap-1 transition-colors ${
                  isLight
                    ? 'text-slate-500 hover:text-emerald-700'
                    : '  hover:text-emerald-300'
                }`}
              >
                <Check className="w-3 h-3" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className={`max-h-80 overflow-y-auto divide-y ${
            isLight ? 'divide-slate-200' : 'divide-slate-800/60'
          }`}>
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                {notificationError ? notificationError : 'No notifications for your role.'}
              </div>
            ) : (
              notifications.map((item) => {
                const isDeadlineAlert = item.type === 'DEADLINE_REMINDER';
                return (
                  <div
                    key={item._id}
                    onClick={() => handleMarkAsRead(item._id, item.linkUrl)}
                    className={`p-3.5 cursor-pointer transition-colors space-y-1.5 ${
                      isDeadlineAlert
                        ? isLight
                          ? !item.isRead
                            ? 'bg-rose-50/95 border-l-4 border-rose-600 hover:bg-rose-100/90 shadow-2xs'
                            : 'bg-rose-50/40 border-l-2 border-rose-300 opacity-90 hover:bg-rose-50/70'
                          : !item.isRead
                            ? 'bg-rose-950/45 border-l-4 border-rose-500 hover:bg-rose-900/40 shadow-2xs'
                            : 'bg-rose-950/20 border-l-2 border-rose-800/80 opacity-80 hover:bg-rose-950/35'
                        : isLight
                          ? !item.isRead
                            ? 'bg-emerald-50/50 border-l-2 border-emerald-600 hover:bg-emerald-50'
                            : 'opacity-85 hover:bg-slate-50'
                          : !item.isRead
                            ? 'bg-slate-800/25 border-l-2 border-emerald-500 hover:bg-slate-800/50'
                            : 'opacity-80 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`p-1 rounded shrink-0 ${
                            isDeadlineAlert
                              ? isLight
                                ? 'bg-rose-100 text-rose-600'
                                : 'bg-rose-900/60 text-rose-400'
                              : isLight
                                ? 'bg-slate-100'
                                : 'bg-slate-800'
                          }`}
                        >
                          {getTypeIcon(item.type)}
                        </span>
                        <div className="flex items-center gap-1.5 truncate">
                          {isDeadlineAlert && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-rose-600 text-white shrink-0 shadow-2xs">
                              Urgent Alert
                            </span>
                          )}
                          <span
                            className={`font-semibold text-xs line-clamp-1 ${
                              isDeadlineAlert
                                ? isLight
                                  ? 'text-rose-950 font-bold'
                                  : 'text-rose-100 font-bold'
                                : isLight
                                  ? 'text-slate-900'
                                  : 'text-white'
                            }`}
                          >
                            {item.title}
                          </span>
                        </div>
                      </div>

                      {!item.isRead && (
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 mt-1 ${
                            isDeadlineAlert ? 'bg-rose-400 animate-pulse' : 'bg-emerald-500'
                          }`}
                        ></span>
                      )}
                    </div>

                    <p
                      className={`text-[11px] line-clamp-2 pl-7 leading-relaxed ${
                        isDeadlineAlert
                          ? isLight
                            ? 'text-rose-900/90 font-medium'
                            : 'text-rose-200/90 font-medium'
                          : isLight
                            ? 'text-slate-600'
                            : 'text-slate-300'
                      }`}
                    >
                      {item.message}
                    </p>

                    <div className="flex items-center justify-between text-[10px] pl-7 pt-0.5 gap-2">
                      <span
                        className={`truncate max-w-[170px] ${
                          isDeadlineAlert
                            ? isLight
                              ? 'text-rose-700 font-semibold'
                              : 'text-rose-300 font-semibold'
                            : isLight
                              ? 'text-slate-600 font-medium'
                              : 'text-slate-400 font-medium'
                        }`}
                      >
                        From: {item.senderName}
                      </span>
                      <span
                        className={`font-mono text-[9px] shrink-0 ${
                          isDeadlineAlert
                            ? isLight
                              ? 'text-rose-600'
                              : 'text-rose-400'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {formatDateTime(item.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Info */}
          <div className={`px-4 py-2 border-t text-center text-[10px] text-slate-500 ${
            isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800/80 bg-slate-950/60'
          }`}>
           Notifications
          </div>
        </div>
      )}
    </div>
  );
};
