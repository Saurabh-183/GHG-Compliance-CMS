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
import { Factory, ChevronDown, Check } from 'lucide-react';
import { IFacility } from '@/types';
import { useAuth } from '@/context/AuthContext';

const ALL_FACILITIES_VALUE = '__ALL_FACILITIES__';

interface FacilitySelectMuiProps {
  facilities: IFacility[];
  selectedFacilityId: string;
  onFacilityChange: (facilityId: string) => void;
  /** When true, adds “All operating units” for org-scoped lists */
  allowAll?: boolean;
  allValue?: string;
}

export const FacilitySelectMui: React.FC<FacilitySelectMuiProps> = ({
  facilities,
  selectedFacilityId,
  onFacilityChange,
  allowAll = false,
  allValue = ALL_FACILITIES_VALUE,
}) => {
  const { theme } = useAuth();
  const isDark = theme === 'dark';

  const handleChange = (event: SelectChangeEvent<string>) => {
    onFacilityChange(event.target.value);
  };

  const selectedFacility = facilities.find((f) => f.facilityId === selectedFacilityId);

  return (
    <FormControl size="small" sx={{ minWidth: 240, maxWidth: 380 }}>
      <Select
        value={selectedFacilityId}
        onChange={handleChange}
        displayEmpty
        IconComponent={() => (
          <ChevronDown
            className="w-4 h-4 pointer-events-none"
            style={{
              color: isDark ? '#94A3B8' : '#64748B',
              marginRight: 10,
            }}
          />
        )}
        renderValue={() => {
          if (allowAll && selectedFacilityId === allValue) {
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                <Factory
                  className="w-4 h-4 shrink-0"
                  style={{ color: isDark ? '#34D399' : '#059669' }}
                />
                <Box sx={{ display: 'flex', flexDirection: 'column', textAlign: 'left', minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: '9px',
                      textTransform: 'uppercase',
                      fontWeight: 800,
                      letterSpacing: '0.06em',
                      color: isDark ? '#34D399' : '#059669',
                      lineHeight: 1,
                    }}
                  >
                    Facility scope
                  </Typography>
                  <Typography sx={{ fontSize: '12px', fontWeight: 700, lineHeight: 1.3 }}>
                    All operating units ({facilities.length})
                  </Typography>
                </Box>
              </Box>
            );
          }

          if (!selectedFacility) {
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Factory className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <Typography sx={{ fontSize: '12px', color: isDark ? '#94A3B8' : '#64748B' }}>
                  Select Facility
                </Typography>
              </Box>
            );
          }

          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
              <Factory
                className="w-4 h-4 shrink-0"
                style={{ color: isDark ? '#34D399' : '#059669' }}
              />
              <Box sx={{ display: 'flex', flexDirection: 'column', textAlign: 'left', minWidth: 0 }}>
                <Typography
                  sx={{
                    fontSize: '9px',
                    textTransform: 'uppercase',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    color: isDark ? '#34D399' : '#059669',
                    lineHeight: 1,
                  }}
                >
                  Data Checklist Facility
                </Typography>
                <Typography
                  sx={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: isDark ? '#FFFFFF' : '#1E293B',
                    lineHeight: 1.3,
                  }}
                  noWrap
                >
                  {selectedFacility.name} ({selectedFacility.facilityId})
                </Typography>
              </Box>
            </Box>
          );
        }}
        sx={{
          height: 38,
          borderRadius: '8px',
          backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
          color: isDark ? '#FFFFFF' : '#1E293B',
          transition: 'all 0.2s ease',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#CBD5E1',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: isDark ? '#34D399' : '#059669',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: isDark ? '#34D399' : '#059669',
            borderWidth: '1.5px',
          },
          '& .MuiSelect-select': {
            padding: '4px 10px',
            display: 'flex',
            alignItems: 'center',
          },
        }}
        MenuProps={{
          slotProps: {
            paper: {
              elevation: 6,
              sx: {
                mt: 1,
                maxHeight: 340,
                borderRadius: '10px',
                backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.15)' : '#E2E8F0'}`,
                boxShadow: isDark
                  ? '0 10px 25px -5px rgba(0, 0, 0, 0.6)'
                  : '0 10px 25px -5px rgba(16, 185, 129, 0.12)',
                '& .MuiList-root': {
                  padding: '6px',
                },
              },
            },
          },
        }}
      >
        {allowAll && (
          <MenuItem
            value={allValue}
            sx={{
              borderRadius: '6px',
              my: 0.25,
              py: 0.75,
              px: 1.25,
              fontWeight: selectedFacilityId === allValue ? 700 : 500,
              backgroundColor:
                selectedFacilityId === allValue
                  ? isDark
                    ? '#064E3B'
                    : '#ECFDF5'
                  : 'transparent',
            }}
          >
            <Typography sx={{ fontSize: '12px' }}>All operating units ({facilities.length})</Typography>
          </MenuItem>
        )}
        {facilities.map((f) => {
          const isSelected = selectedFacilityId === f.facilityId;
          return (
            <MenuItem
              key={f.facilityId}
              value={f.facilityId}
              sx={{
                borderRadius: '6px',
                my: 0.25,
                py: 0.75,
                px: 1.25,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: isSelected
                  ? isDark ? '#064E3B' : '#ECFDF5'
                  : 'transparent',
                color: isSelected
                  ? isDark ? '#FFFFFF' : '#065F46'
                  : isDark ? '#FFFFFF' : '#334155',
                fontWeight: isSelected ? 700 : 500,
                '&:hover': {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                <Factory className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <Typography sx={{ fontSize: '12px', fontWeight: 'inherit' }} noWrap>
                  {f.name}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '10px',
                    fontFamily: 'monospace',
                    color: isDark ? '#94A3B8' : '#64748B',
                    px: 0.75,
                    py: 0.2,
                    borderRadius: '4px',
                    backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                  }}
                >
                  {f.facilityId}
                </Typography>
              </Box>
              {isSelected && (
                <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400 ml-2" />
              )}
            </MenuItem>
          );
        })}
      </Select>
    </FormControl>
  );
};
