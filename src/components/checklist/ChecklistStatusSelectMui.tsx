'use client';

import React from 'react';
import {
  Select,
  MenuItem,
  FormControl,
  SelectChangeEvent,
  Box,
  Typography,
} from '@mui/material';
import { ChevronDown, Check } from 'lucide-react';
import { DataChecklistItemStatus } from '@/types';
import { useAuth } from '@/context/AuthContext';

interface ChecklistStatusSelectMuiProps {
  value: DataChecklistItemStatus;
  onChange: (status: DataChecklistItemStatus) => void;
  disabled?: boolean;
}

interface StatusConfig {
  label: string;
  lightBg: string;
  lightColor: string;
  lightBorder: string;
  lightDot: string;
  darkBg: string;
  darkColor: string;
  darkBorder: string;
  darkDot: string;
}

const STATUS_CONFIGS: Record<DataChecklistItemStatus, StatusConfig> = {
  DUE: {
    label: 'Due',
    lightBg: '#FEF3C7',
    lightColor: '#92400E',
    lightBorder: '#FCD34D',
    lightDot: '#D97706',
    darkBg: 'rgba(120, 53, 15, 0.45)',
    darkColor: '#FDE68A',
    darkBorder: 'rgba(217, 119, 6, 0.55)',
    darkDot: '#F59E0B',
  },
  NEEDS_VERIFICATION: {
    label: 'Needs Verification',
    lightBg: '#FEF3C7',
    lightColor: '#92400E',
    lightBorder: '#FCD34D',
    lightDot: '#D97706',
    darkBg: 'rgba(120, 53, 15, 0.45)',
    darkColor: '#FDE68A',
    darkBorder: 'rgba(217, 119, 6, 0.55)',
    darkDot: '#F59E0B',
  },
  RECEIVED: {
    label: 'Received',
    lightBg: '#D1FAE5',
    lightColor: '#065F46',
    lightBorder: '#6EE7B7',
    lightDot: '#059669',
    darkBg: 'rgba(6, 78, 59, 0.5)',
    darkColor: '#6EE7B7',
    darkBorder: 'rgba(16, 185, 129, 0.55)',
    darkDot: '#34D399',
  },
  NOT_APPLICABLE: {
    label: 'Not Applicable',
    lightBg: '#F1F5F9',
    lightColor: '#475569',
    lightBorder: '#CBD5E1',
    lightDot: '#64748B',
    darkBg: 'rgba(30, 41, 59, 0.75)',
    darkColor: '#94A3B8',
    darkBorder: 'rgba(71, 85, 105, 0.65)',
    darkDot: '#64748B',
  },
  NOT_REQUIRED: {
    label: 'Not Required',
    lightBg: '#F1F5F9',
    lightColor: '#475569',
    lightBorder: '#CBD5E1',
    lightDot: '#64748B',
    darkBg: 'rgba(30, 41, 59, 0.75)',
    darkColor: '#94A3B8',
    darkBorder: 'rgba(71, 85, 105, 0.65)',
    darkDot: '#64748B',
  },
};

const ORDERED_STATUSES: DataChecklistItemStatus[] = [
  'DUE',
  'NEEDS_VERIFICATION',
  'RECEIVED',
  'NOT_APPLICABLE',
  'NOT_REQUIRED',
];

export const ChecklistStatusSelectMui: React.FC<ChecklistStatusSelectMuiProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const { theme } = useAuth();
  const isDark = theme === 'dark';

  const currentConfig = STATUS_CONFIGS[value] || STATUS_CONFIGS.DUE;

  const handleChange = (event: SelectChangeEvent<string>) => {
    onChange(event.target.value as DataChecklistItemStatus);
  };

  return (
    <FormControl size="small" fullWidth sx={{ minWidth: 120 }}>
      <Select
        value={value}
        onChange={handleChange}
        disabled={disabled}
        IconComponent={() => (
          <ChevronDown
            className="w-3.5 h-3.5 pointer-events-none"
            style={{
              color: isDark ? currentConfig.darkColor : currentConfig.lightColor,
              marginRight: 6,
              opacity: 0.85,
            }}
          />
        )}
        renderValue={() => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: isDark ? currentConfig.darkDot : currentConfig.lightDot,
                flexShrink: 0,
              }}
            />
            <Typography
              component="span"
              sx={{
                fontSize: '11px',
                fontWeight: 700,
                color: isDark ? currentConfig.darkColor : currentConfig.lightColor,
                lineHeight: 1,
                whiteSpace: 'nowrap',
              }}
            >
              {currentConfig.label}
            </Typography>
          </Box>
        )}
        sx={{
          height: 28,
          borderRadius: '6px',
          backgroundColor: isDark ? currentConfig.darkBg : currentConfig.lightBg,
          transition: 'all 0.15s ease',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: isDark ? currentConfig.darkBorder : currentConfig.lightBorder,
            borderWidth: '1px',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: isDark ? currentConfig.darkDot : currentConfig.lightDot,
            borderWidth: '1.2px',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: isDark ? currentConfig.darkDot : currentConfig.lightDot,
            borderWidth: '1.5px',
          },
          '& .MuiSelect-select': {
            padding: '2px 8px !important',
            display: 'flex',
            alignItems: 'center',
          },
        }}
        MenuProps={{
          slotProps: {
            paper: {
              elevation: 8,
              sx: {
                mt: 0.5,
                borderRadius: '8px',
                backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.15)' : '#E2E8F0'}`,
                boxShadow: isDark
                  ? '0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.5)'
                  : '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',
                '& .MuiList-root': {
                  padding: '4px',
                },
              },
            },
          },
        }}
      >
        {ORDERED_STATUSES.map((statusKey) => {
          const config = STATUS_CONFIGS[statusKey];
          const isSelected = value === statusKey;

          return (
            <MenuItem
              key={statusKey}
              value={statusKey}
              sx={{
                borderRadius: '6px',
                my: 0.25,
                py: 0.75,
                px: 1.25,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: isSelected
                  ? isDark
                    ? config.darkBg
                    : config.lightBg
                  : 'transparent',
                '&:hover': {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.08)'
                    : '#F1F5F9',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    backgroundColor: isDark ? config.darkDot : config.lightDot,
                    flexShrink: 0,
                  }}
                />
                <Typography
                  component="span"
                  sx={{
                    fontSize: '11px',
                    fontWeight: isSelected ? 700 : 500,
                    color: isDark ? (isSelected ? config.darkColor : '#F8FAFC') : (isSelected ? config.lightColor : '#1E293B'),
                  }}
                >
                  {config.label}
                </Typography>
              </Box>

              {isSelected && (
                <Check
                  className="w-3.5 h-3.5 shrink-0 ml-2"
                  style={{
                    color: isDark ? config.darkColor : config.lightColor,
                  }}
                />
              )}
            </MenuItem>
          );
        })}
      </Select>
    </FormControl>
  );
};
