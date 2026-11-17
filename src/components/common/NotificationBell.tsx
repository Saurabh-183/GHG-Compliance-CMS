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
  ExternalLink,
  Check,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

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
  createdAt: string;
}

export const NotificationBell: React.FC = () => {
  const router = useRouter();
  const { currentRole, theme } = useAuth();
  const isLight = theme === 'light';
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`/api/notifications?role=${currentRole}`);
      if (res.ok) {
        const json = await res.json();
        setNotifications(json.data || []);
        setUnreadCount(json.unreadCount || 0);
      }
    } catch (e) {
      console.warn('Failed to fetch notifications:', e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, [currentRole]);

  // Close dropdown on click outside
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
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setIsOpen(false);
      router.push(linkUrl);
    } catch (e) {
      console.error(e);
      router.push(linkUrl);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications/mark-all', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: currentRole }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
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
        return <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
      default:
        return <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-1.5 rounded-lg border transition-colors ${
          isLight
            ? 'bg-white text-slate-700 hover:text-emerald-700 hover:bg-slate-100 border-slate-300 shadow-2xs'
            : 'bg-slate-800/90 text-slate-300 hover:text-emerald-400 hover:bg-slate-700 border-slate-700'
        }`}
        title="Audit & Compliance Notifications"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-700 text-[10px] font-semibold text-white shadow-sm">
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
                No notifications for your role.
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item._id}
                  onClick={() => handleMarkAsRead(item._id, item.linkUrl)}
                  className={`p-3.5 cursor-pointer transition-colors space-y-1.5 ${
                    isLight
                      ? !item.isRead
                        ? 'bg-emerald-50/50 border-l-2 border-emerald-600 hover:bg-emerald-50'
                        : 'opacity-85 hover:bg-slate-50'
                      : !item.isRead
                        ? 'bg-slate-800/25 border-l-2 border-emerald-500 hover:bg-slate-800/50'
                        : 'opacity-80 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`p-1 rounded shrink-0 ${isLight ? 'bg-slate-100' : 'bg-slate-800'}`}>
                        {getTypeIcon(item.type)}
                      </span>
                      <span className={`font-semibold text-xs line-clamp-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {item.title}
                      </span>
                    </div>

                    {!item.isRead && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1"></span>
                    )}
                  </div>

                  <p className={`text-[11px] line-clamp-2 pl-7 ${isLight ? '  ' : ' '}`}>
                    {item.message}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pl-7 pt-0.5">
                    <span className={`font-medium truncate max-w-[180px] ${isLight ? '  ' : ' '}`}>
                      From: {item.senderName}
                    </span>
                    <span>{formatDate(item.createdAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Info */}
          <div className={`px-4 py-2 border-t text-center text-[10px] text-slate-500 ${
            isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800/80 bg-slate-950/60'
          }`}>
            Cross-role triggers between Consultant, Reviewer & Client
          </div>
        </div>
      )}
    </div>
  );
};
