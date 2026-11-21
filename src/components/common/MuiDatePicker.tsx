'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Popover, Box, Typography, Button, IconButton } from '@mui/material';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export interface MuiDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  fullWidth?: boolean;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAY_NAMES = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

// Helpers for date conversions
function parseIsoDate(isoStr?: string): { year: number; month: number; day: number } | null {
  if (!isoStr || !/^\d{4}-\d{2}-\d{2}$/.test(isoStr)) return null;
  const [y, m, d] = isoStr.split('-').map(Number);
  if (!y || !m || !d) return null;
  return { year: y, month: m - 1, day: d };
}

function formatIso(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

function formatDisplayDate(isoStr?: string): string {
  const parsed = parseIsoDate(isoStr);
  if (!parsed) return '';
  const dd = String(parsed.day).padStart(2, '0');
  const mm = String(parsed.month + 1).padStart(2, '0');
  return `${dd}-${mm}-${parsed.year}`;
}

export function MuiDatePicker({
  value,
  onChange,
  label,
  placeholder = 'dd-mm-yyyy',
  disabled = false,
  error = false,
  className = '',
  fullWidth = true,
}: MuiDatePickerProps) {
  const { theme } = useAuth();
  const isDark = theme === 'dark';

  const anchorRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  // Initialize view year and month
  const today = useMemo(() => new Date(), []);
  const parsedValue = useMemo(() => parseIsoDate(value), [value]);

  const [viewYear, setViewYear] = useState(() => parsedValue?.year ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => parsedValue?.month ?? today.getMonth());

  // Keep view synchronized when value changes from outside
  useEffect(() => {
    if (parsedValue) {
      setViewYear(parsedValue.year);
      setViewMonth(parsedValue.month);
    }
  }, [value, parsedValue]);

  const handleOpen = () => {
    if (disabled) return;
    if (parsedValue) {
      setViewYear(parsedValue.year);
      setViewMonth(parsedValue.month);
    } else {
      setViewYear(today.getFullYear());
      setViewMonth(today.getMonth());
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const handleSelectDay = (year: number, month: number, day: number) => {
    const formatted = formatIso(year, month, day);
    onChange(formatted);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setOpen(false);
  };

  const handleToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const tYear = today.getFullYear();
    const tMonth = today.getMonth();
    const tDay = today.getDate();
    const formatted = formatIso(tYear, tMonth, tDay);
    onChange(formatted);
    setOpen(false);
  };

  // Calendar calculations
  // Sunday is 0 in JS Date. We want Monday as index 0.
  const firstDayOfWeek = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
  const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const prevMonthDays = useMemo(() => {
    const days: number[] = [];
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      days.push(daysInPrevMonth - i);
    }
    return days;
  }, [firstDayOfWeek, daysInPrevMonth]);

  const currentMonthDays = useMemo(() => {
    const days: number[] = [];
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      days.push(i);
    }
    return days;
  }, [daysInCurrentMonth]);

  const nextMonthDays = useMemo(() => {
    const totalFilled = prevMonthDays.length + currentMonthDays.length;
    const remaining = (7 - (totalFilled % 7)) % 7;
    // Always show at least 35 or 42 grid cells for consistent height
    const targetRows = totalFilled + remaining <= 35 ? 35 : 42;
    const paddingCount = targetRows - totalFilled;
    const days: number[] = [];
    for (let i = 1; i <= paddingCount; i++) {
      days.push(i);
    }
    return days;
  }, [prevMonthDays.length, currentMonthDays.length]);

  // Year options for the quick dropdown
  const yearOptions = useMemo(() => {
    const currentY = today.getFullYear();
    const list: number[] = [];
    for (let y = currentY - 5; y <= currentY + 10; y++) {
      list.push(y);
    }
    return list;
  }, [today]);

  const displayString = formatDisplayDate(value);

  return (
    <div className={`relative ${fullWidth ? 'w-full' : ''} ${className}`}>
      {label && (
        <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}

      {/* Styled MUI-like input trigger */}
      <div
        ref={anchorRef}
        onClick={handleOpen}
        className={`group flex items-center justify-between rounded-lg border px-3 py-[7px] text-xs transition-colors cursor-pointer select-none ${
          disabled
            ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
            : isDark
            ? 'bg-[#0F172A] border-[#334155] hover:border-[#475569] text-[#F8FAFC]'
            : 'bg-white border-[#CBD5E1] hover:border-[#94A3B8] text-[#0F172A]'
        } ${open ? (isDark ? 'border-[#34D399] ring-1 ring-[#34D399]' : 'border-[#059669] ring-1 ring-[#059669]') : ''} ${
          error ? 'border-red-500' : ''
        }`}
      >
        <span className={displayString ? 'font-mono text-xs font-medium' : 'text-slate-400 dark:text-slate-500'}>
          {displayString || placeholder}
        </span>

        <div className="flex items-center gap-1.5 ml-2">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              title="Clear date"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <CalendarIcon
            className={`h-4 w-4 transition-colors ${
              open
                ? isDark
                  ? 'text-emerald-400'
                  : 'text-emerald-600'
                : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
            }`}
          />
        </div>
      </div>

      {/* Material UI Popover */}
      <Popover
        open={open}
        anchorEl={anchorRef.current}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              p: 2,
              width: 300,
              borderRadius: '12px',
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              color: isDark ? '#F8FAFC' : '#0F172A',
              border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
              boxShadow: isDark
                ? '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)'
                : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
            },
          },
        }}
      >
        {/* Popover Header: Month & Year Selector with Navigation Arrows */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <select
              value={viewMonth}
              onChange={(e) => setViewMonth(Number(e.target.value))}
              className={`rounded border px-1.5 py-1 text-xs font-bold outline-none cursor-pointer transition-colors ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-slate-100'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              {MONTH_NAMES.map((name, index) => (
                <option key={name} value={index}>
                  {name}
                </option>
              ))}
            </select>

            <select
              value={viewYear}
              onChange={(e) => setViewYear(Number(e.target.value))}
              className={`rounded border px-1.5 py-1 text-xs font-bold outline-none cursor-pointer transition-colors ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-slate-100'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IconButton
              size="small"
              onClick={handlePrevMonth}
              sx={{
                p: 0.5,
                color: isDark ? '#94A3B8' : '#64748B',
                '&:hover': {
                  backgroundColor: isDark ? '#334155' : '#F1F5F9',
                  color: isDark ? '#F8FAFC' : '#0F172A',
                },
              }}
              title="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </IconButton>

            <IconButton
              size="small"
              onClick={handleNextMonth}
              sx={{
                p: 0.5,
                color: isDark ? '#94A3B8' : '#64748B',
                '&:hover': {
                  backgroundColor: isDark ? '#334155' : '#F1F5F9',
                  color: isDark ? '#F8FAFC' : '#0F172A',
                },
              }}
              title="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </IconButton>
          </Box>
        </Box>

        {/* Days of week header */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, mb: 1, textAlign: 'center' }}>
          {WEEKDAY_NAMES.map((day) => (
            <Typography
              key={day}
              variant="caption"
              sx={{
                fontSize: '11px',
                fontWeight: 600,
                color: isDark ? '#64748B' : '#94A3B8',
              }}
            >
              {day}
            </Typography>
          ))}
        </Box>

        {/* Dates grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
          {/* Previous month leading days */}
          {prevMonthDays.map((day) => {
            const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
            const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
            return (
              <button
                key={`prev-${day}`}
                type="button"
                onClick={() => handleSelectDay(prevYear, prevMonth, day)}
                className="h-8 w-8 rounded-full flex items-center justify-center text-xs text-slate-400 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mx-auto"
              >
                {day}
              </button>
            );
          })}

          {/* Current month days */}
          {currentMonthDays.map((day) => {
            const isSelected =
              parsedValue !== null &&
              parsedValue.year === viewYear &&
              parsedValue.month === viewMonth &&
              parsedValue.day === day;

            const isToday =
              today.getFullYear() === viewYear &&
              today.getMonth() === viewMonth &&
              today.getDate() === day;

            return (
              <button
                key={`current-${day}`}
                type="button"
                onClick={() => handleSelectDay(viewYear, viewMonth, day)}
                className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium transition-all mx-auto ${
                  isSelected
                    ? 'bg-emerald-600 text-white font-bold shadow-sm hover:bg-emerald-700'
                    : isToday
                    ? 'border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                }`}
              >
                {day}
              </button>
            );
          })}

          {/* Next month trailing days */}
          {nextMonthDays.map((day) => {
            const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
            const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
            return (
              <button
                key={`next-${day}`}
                type="button"
                onClick={() => handleSelectDay(nextYear, nextMonth, day)}
                className="h-8 w-8 rounded-full flex items-center justify-center text-xs text-slate-400 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mx-auto"
              >
                {day}
              </button>
            );
          })}
        </Box>

        {/* Footer toolbar: Clear and Today */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mt: 2,
            pt: 1.5,
            borderTop: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
          }}
        >
          <Button
            size="small"
            onClick={handleClear}
            sx={{
              textTransform: 'none',
              fontSize: '11px',
              fontWeight: 600,
              color: isDark ? '#94A3B8' : '#64748B',
              '&:hover': {
                color: isDark ? '#F8FAFC' : '#0F172A',
                backgroundColor: 'transparent',
              },
            }}
          >
            Clear
          </Button>

          <Button
            size="small"
            onClick={handleToday}
            sx={{
              textTransform: 'none',
              fontSize: '11px',
              fontWeight: 600,
              color: isDark ? '#34D399' : '#059669',
              '&:hover': {
                backgroundColor: isDark ? 'rgba(52, 211, 153, 0.1)' : 'rgba(5, 150, 105, 0.1)',
              },
            }}
          >
            Today
          </Button>
        </Box>
      </Popover>
    </div>
  );
}
