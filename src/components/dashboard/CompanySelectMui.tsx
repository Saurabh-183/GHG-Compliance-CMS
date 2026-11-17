'use client';

import React from 'react';
import { Select, MenuItem, FormControl, SelectChangeEvent, Box, Typography } from '@mui/material';
import { Building2, ChevronDown, Check } from 'lucide-react';
import { IClientGroup } from '@/types';
import { useAuth } from '@/context/AuthContext';

interface CompanySelectMuiProps {
  groups: IClientGroup[];
  selectedCompanyId: string;
  onCompanyChange: (companyId: string) => void;
}

export const CompanySelectMui: React.FC<CompanySelectMuiProps> = ({
  groups,
  selectedCompanyId,
  onCompanyChange,
}) => {
  const { theme } = useAuth();
  const isDark = theme === 'dark';

  const handleChange = (event: SelectChangeEvent<string>) => {
    onCompanyChange(event.target.value);
  };

  const selectedGroup = groups.find((g) => g._id === selectedCompanyId);
  const totalUnits = groups.reduce(
    (sum, g) => sum + (g.totalFacilitiesCount || g.facilities?.length || 0),
    0
  );

  return (
    <FormControl size="small" sx={{ minWidth: 260, maxWidth: 360 }}>
      <Select
        value={selectedCompanyId}
        onChange={handleChange}
        displayEmpty
        IconComponent={() => (
          <ChevronDown
            className="w-4 h-4 pointer-events-none"
            style={{
              color: isDark ? '#D99B7F' : '#596579',
              marginRight: 10,
            }}
          />
        )}
        renderValue={(selected) => {
          if (selected === 'ALL') {
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <Building2
                  className="w-4 h-4 shrink-0"
                  style={{ color: isDark ? '#D99B7F' : '#17365D' }}
                />
                <Box sx={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                  <Typography
                    sx={{
                      fontSize: '9px',
                      textTransform: 'uppercase',
                      fontWeight: 800,
                      letterSpacing: '0.06em',
                      color: isDark ? '#D99B7F' : '#697586',
                      lineHeight: 1,
                    }}
                  >
                    Select Company
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: isDark ? '#FFFFFF' : '#1E293B',
                      lineHeight: 1.3,
                    }}
                  >
                    All Client Companies ({groups.length || 15} Groups)
                  </Typography>
                </Box>
              </Box>
            );
          }

          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <Building2
                className="w-4 h-4 shrink-0"
                style={{ color: isDark ? '#D99B7F' : '#17365D' }}
              />
              <Box sx={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                <Typography
                  sx={{
                    fontSize: '9px',
                    textTransform: 'uppercase',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    color: isDark ? '#D99B7F' : '#697586',
                    lineHeight: 1,
                  }}
                >
                  Selected Company
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
                  {selectedGroup?.name || 'Select Company'}
                </Typography>
              </Box>
            </Box>
          );
        }}
        sx={{
          height: 42,
          borderRadius: '10px',
          backgroundColor: isDark ? '#464858' : '#FFFFFF',
          color: isDark ? '#FFFFFF' : '#1E293B',
          transition: 'all 0.2s ease',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#D5DCE5',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: isDark ? '#D99B7F' : '#17365D',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: isDark ? '#D99B7F' : '#17365D',
            borderWidth: '1.5px',
          },
          '& .MuiSelect-select': {
            padding: '4px 12px',
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
                maxHeight: 380,
                borderRadius: '12px',
                backgroundColor: isDark ? '#464858' : '#FFFFFF',
                border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.15)' : '#E2E8F0'}`,
                boxShadow: isDark
                  ? '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)'
                  : '0 10px 25px -5px rgba(23, 54, 93, 0.12), 0 8px 10px -6px rgba(23, 54, 93, 0.08)',
                '& .MuiList-root': {
                  padding: '6px',
                },
              },
            },
          },
        }}
      >
        <MenuItem
          value="ALL"
          sx={{
            borderRadius: '8px',
            my: 0.25,
            py: 1,
            px: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: selectedCompanyId === 'ALL'
              ? isDark ? '#0F3040' : '#EAF1F8'
              : 'transparent',
            color: selectedCompanyId === 'ALL'
              ? isDark ? '#FFFFFF' : '#17365D'
              : isDark ? '#FFFFFF' : '#343A40',
            fontWeight: selectedCompanyId === 'ALL' ? 700 : 500,
            '&:hover': {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F4F7',
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Building2 className="w-3.5 h-3.5 shrink-0" />
            <Typography sx={{ fontSize: '12px', fontWeight: 'inherit' }}>
              All Client Companies ({groups.length || 15} Groups)
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                fontSize: '10px',
                fontWeight: 700,
                px: 1,
                py: 0.25,
                borderRadius: '6px',
                backgroundColor: isDark ? 'rgba(217, 155, 127, 0.2)' : '#E5EAF0',
                color: isDark ? '#D99B7F' : '#17365D',
              }}
            >
              {totalUnits || 109} Units
            </Box>
            {selectedCompanyId === 'ALL' && (
              <Check className="w-3.5 h-3.5 shrink-0" style={{ color: isDark ? '#D99B7F' : '#17365D' }} />
            )}
          </Box>
        </MenuItem>

        {groups.map((group) => {
          const isSelected = selectedCompanyId === group._id;
          const count = group.totalFacilitiesCount || group.facilities?.length || 0;

          return (
            <MenuItem
              key={group._id}
              value={group._id}
              sx={{
                borderRadius: '8px',
                my: 0.25,
                py: 1,
                px: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: isSelected
                  ? isDark ? '#0F3040' : '#EAF1F8'
                  : 'transparent',
                color: isSelected
                  ? isDark ? '#FFFFFF' : '#17365D'
                  : isDark ? '#FFFFFF' : '#343A40',
                fontWeight: isSelected ? 700 : 500,
                '&:hover': {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F4F7',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: '12px', fontWeight: 'inherit' }} noWrap>
                  {group.name}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2, shrink: 0 }}>
                <Box
                  sx={{
                    fontSize: '10px',
                    fontWeight: 600,
                    px: 1,
                    py: 0.25,
                    borderRadius: '6px',
                    backgroundColor: isDark ? 'rgba(217, 155, 127, 0.15)' : '#E5EAF0',
                    color: isDark ? '#D99B7F' : '#596579',
                  }}
                >
                  {count} {count === 1 ? 'Unit' : 'Units'}
                </Box>
                {isSelected && (
                  <Check className="w-3.5 h-3.5 shrink-0" style={{ color: isDark ? '#D99B7F' : '#17365D' }} />
                )}
              </Box>
            </MenuItem>
          );
        })}
      </Select>
    </FormControl>
  );
};
