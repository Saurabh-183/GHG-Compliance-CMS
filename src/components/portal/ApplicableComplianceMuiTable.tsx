'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
} from '@mui/material';
import { ShieldCheck, Calendar, Building2 } from 'lucide-react';
import { IComplianceApplicability } from '@/types';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { StatusBadge } from '@/components/common/StatusBadge';

interface ApplicableComplianceMuiTableProps {
  applicabilities: IComplianceApplicability[];
}

export const ApplicableComplianceMuiTable: React.FC<ApplicableComplianceMuiTableProps> = ({
  applicabilities,
}) => {
  const { theme } = useAuth();
  const isDark = theme === 'dark';

  return (
    <TableContainer
      component={Paper}
      elevation={0}
      sx={{
        borderRadius: '12px',
        border: '1px solid',
        borderColor: isDark ? '#334155' : '#E2E8F0',
        backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
        overflowX: 'auto',
        boxShadow: isDark
          ? '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.3)'
          : '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
      }}
    >
      <Table sx={{ minWidth: 700 }} aria-label="Applicable Compliance Obligations Table" size="medium">
        <TableHead>
          <TableRow
            sx={{
              backgroundColor: isDark ? '#0B1120' : '#F8FAFC',
            }}
          >
            <TableCell
              sx={{
                py: 1.75,
                px: 2,
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: isDark ? '#94A3B8' : '#475569',
                borderBottom: '2px solid',
                borderBottomColor: isDark ? '#334155' : '#E2E8F0',
              }}
            >
              Framework
            </TableCell>

            <TableCell
              sx={{
                py: 1.75,
                px: 2,
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: isDark ? '#94A3B8' : '#475569',
                borderBottom: '2px solid',
                borderBottomColor: isDark ? '#334155' : '#E2E8F0',
              }}
            >
              Period
            </TableCell>

            <TableCell
              sx={{
                py: 1.75,
                px: 2,
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: isDark ? '#94A3B8' : '#475569',
                borderBottom: '2px solid',
                borderBottomColor: isDark ? '#334155' : '#E2E8F0',
              }}
            >
              Regulator / Authority
            </TableCell>

            <TableCell
              sx={{
                py: 1.75,
                px: 2,
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: isDark ? '#94A3B8' : '#475569',
                borderBottom: '2px solid',
                borderBottomColor: isDark ? '#334155' : '#E2E8F0',
              }}
            >
              Mandate Target
            </TableCell>

            <TableCell
              sx={{
                py: 1.75,
                px: 2,
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: isDark ? '#94A3B8' : '#475569',
                borderBottom: '2px solid',
                borderBottomColor: isDark ? '#334155' : '#E2E8F0',
              }}
            >
              Filing Deadline
            </TableCell>

            <TableCell
              align="center"
              sx={{
                py: 1.75,
                px: 2,
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: isDark ? '#94A3B8' : '#475569',
                borderBottom: '2px solid',
                borderBottomColor: isDark ? '#334155' : '#E2E8F0',
              }}
            >
              Outcome
            </TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {applicabilities.map((app) => (
            <TableRow
              key={app._id}
              sx={{
                transition: 'background-color 0.15s ease',
                backgroundColor: 'transparent',
                '&:hover': {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.04) !important'
                    : '#F1F5F9 !important',
                },
              }}
            >
              {/* Framework */}
              <TableCell
                sx={{
                  py: 1.5,
                  px: 2,
                  borderBottom: '1px solid',
                  borderBottomColor: isDark ? '#1E293B' : '#F1F5F9',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ShieldCheck
                    className="w-4 h-4 shrink-0"
                    style={{ color: isDark ? '#34D399' : '#047857' }}
                  />
                  <Typography
                    component="span"
                    sx={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: isDark ? '#FFFFFF' : '#0F172A',
                    }}
                  >
                    {app.complianceType}
                  </Typography>
                </Box>
              </TableCell>

              {/* Period */}
              <TableCell
                sx={{
                  py: 1.5,
                  px: 2,
                  borderBottom: '1px solid',
                  borderBottomColor: isDark ? '#1E293B' : '#F1F5F9',
                }}
              >
                <Typography
                  component="span"
                  sx={{
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: isDark ? '#CBD5E1' : '#334155',
                  }}
                >
                  {app.period}
                </Typography>
              </TableCell>

              {/* Authority */}
              <TableCell
                sx={{
                  py: 1.5,
                  px: 2,
                  borderBottom: '1px solid',
                  borderBottomColor: isDark ? '#1E293B' : '#F1F5F9',
                }}
              >
                <Typography
                  component="span"
                  sx={{
                    fontSize: '12px',
                    color: isDark ? '#94A3B8' : '#475569',
                  }}
                >
                  {app.authority}
                </Typography>
              </TableCell>

              {/* Target */}
              <TableCell
                sx={{
                  py: 1.5,
                  px: 2,
                  borderBottom: '1px solid',
                  borderBottomColor: isDark ? '#1E293B' : '#F1F5F9',
                }}
              >
                <Typography
                  component="span"
                  sx={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: isDark ? '#34D399' : '#047857',
                  }}
                >
                  {app.targetValue !== null ? `${app.targetValue} ${app.targetUnit}` : 'Monthly Returns'}
                </Typography>
              </TableCell>

              {/* Deadline */}
              <TableCell
                sx={{
                  py: 1.5,
                  px: 2,
                  borderBottom: '1px solid',
                  borderBottomColor: isDark ? '#1E293B' : '#F1F5F9',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Calendar
                    className="w-3.5 h-3.5 shrink-0"
                    style={{ color: isDark ? '#94A3B8' : '#64748B' }}
                  />
                  <Typography
                    component="span"
                    sx={{
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      fontSize: '12px',
                      color: isDark ? '#CBD5E1' : '#334155',
                    }}
                  >
                    {formatDate(app.deadline)}
                  </Typography>
                </Box>
              </TableCell>

              {/* Outcome */}
              <TableCell
                align="center"
                sx={{
                  py: 1.5,
                  px: 2,
                  borderBottom: '1px solid',
                  borderBottomColor: isDark ? '#1E293B' : '#F1F5F9',
                }}
              >
                <StatusBadge status={app.complianceOutcome} type="outcome" size="sm" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
