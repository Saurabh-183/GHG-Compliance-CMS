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
  Chip,
  Box,
  Typography,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import { FileSpreadsheet, ExternalLink, Calendar, Check, AlertTriangle, Clock, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { ClientMonthlyEvidenceRow } from '@/lib/clientMonthlyEvidenceRows';
import { summarizeEvidenceRows } from '@/lib/clientMonthlyEvidenceRows';
import { formatDate } from '@/lib/utils';

interface EnergyRecordsMuiTableProps {
  records: ClientMonthlyEvidenceRow[];
  periodLabel?: string;
}

const STATUS_META: Record<
  ClientMonthlyEvidenceRow['status'],
  { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }
> = {
  ACCEPTED: { label: 'Accepted', tone: 'success' },
  UNDER_REVIEW: { label: 'Under review', tone: 'warning' },
  UPLOADED: { label: 'Submitted', tone: 'success' },
  MISSING: { label: 'Not uploaded', tone: 'danger' },
};

function chipColors(
  tone: (typeof STATUS_META)[ClientMonthlyEvidenceRow['status']]['tone'],
  isDark: boolean
) {
  if (tone === 'success') {
    return {
      bg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
      border: isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0',
      color: isDark ? '#34D399' : '#065F46',
    };
  }
  if (tone === 'warning') {
    return {
      bg: isDark ? 'rgba(251, 191, 36, 0.12)' : '#FFFBEB',
      border: isDark ? 'rgba(251, 191, 36, 0.35)' : '#FDE68A',
      color: isDark ? '#FCD34D' : '#92400E',
    };
  }
  if (tone === 'danger') {
    return {
      bg: isDark ? 'rgba(244, 63, 94, 0.15)' : '#FEF2F2',
      border: isDark ? 'rgba(244, 63, 94, 0.3)' : '#FECACA',
      color: isDark ? '#FB7185' : '#991B1B',
    };
  }
  return {
    bg: isDark ? 'rgba(148, 163, 184, 0.12)' : '#F8FAFC',
    border: isDark ? '#334155' : '#E2E8F0',
    color: isDark ? '#94A3B8' : '#475569',
  };
}

export const EnergyRecordsMuiTable: React.FC<EnergyRecordsMuiTableProps> = ({ records, periodLabel }) => {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const summary = summarizeEvidenceRows(records);

  if (!records.length) {
    return (
      <Box
        sx={{
          borderRadius: 2,
          border: '1px dashed',
          borderColor: isDark ? '#475569' : '#CBD5E1',
          py: 6,
          px: 3,
          textAlign: 'center',
        }}
      >
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: isDark ? '#E2E8F0' : '#334155' }}>
          No monthly evidence mapped yet for {periodLabel || 'this period'}.
        </Typography>
        <Typography sx={{ fontSize: 12, mt: 1, color: isDark ? '#94A3B8' : '#64748B' }}>
          Open Data Requests, pick a monthly item, select the billing month, and submit your file or Drive link.
        </Typography>
      </Box>
    );
  }

  return (
    <Box className="space-y-4">
      <Box
        sx={{
          borderRadius: 2,
          border: '1px solid',
          borderColor: isDark ? '#334155' : '#E2E8F0',
          bgcolor: isDark ? '#0B1120' : '#F8FAFC',
          p: 2,
        }}
      >
        <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 2, mb: 1 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: isDark ? '#E2E8F0' : '#0F172A' }}>
            Client upload coverage — {periodLabel || 'selected FY'}
          </Typography>
          <Typography sx={{ fontSize: 11, color: isDark ? '#94A3B8' : '#64748B' }}>
            {summary.uploadedMonths}/{summary.totalMonths} months with file · {summary.acceptedMonths} accepted
            {summary.otherSubmissions > 0 ? ` · ${summary.otherSubmissions} other request(s)` : ''}
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={summary.uploadPct}
          sx={{
            height: 8,
            borderRadius: 4,
            bgcolor: isDark ? '#1E293B' : '#E2E8F0',
            '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: '#059669' },
          }}
        />
        <Typography sx={{ fontSize: 10, mt: 0.75, color: isDark ? '#64748B' : '#94A3B8' }}>
          {summary.uploadPct}% months have client-uploaded evidence (from live data requests)
        </Typography>
      </Box>

      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          borderRadius: '12px',
          border: '1px solid',
          borderColor: isDark ? '#334155' : '#E2E8F0',
          backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
          overflowX: 'auto',
        }}
      >
        <Table sx={{ minWidth: 640 }} size="medium">
          <TableHead>
            <TableRow sx={{ backgroundColor: isDark ? '#0B1120' : '#F8FAFC' }}>
              {['Billing month', 'Status', 'Drive Excel Log evidence'].map((heading, index) => (
                <TableCell
                  key={heading}
                  align={index === 2 ? 'left' : index === 0 ? 'left' : 'center'}
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
                    width: index === 2 ? '48%' : undefined,
                  }}
                >
                  {heading}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {records.map((row) => {
              const statusMeta = STATUS_META[row.status];
              const colors = chipColors(statusMeta.tone, isDark);

              return (
                <TableRow
                  key={row.month}
                  sx={{
                    '&:hover': {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC',
                    },
                  }}
                >
                  <TableCell sx={{ py: 1.75, px: 2, verticalAlign: 'top' }}>
                    <Box sx={{ display: 'flex', gap: 1.25 }}>
                      <Calendar className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#059669' }} />
                      <Box>
                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: isDark ? '#FFF' : '#0F172A' }}>
                          {row.monthLabel}
                        </Typography>
                        {/^\d{4}-\d{2}$/.test(row.month) && (
                          <Typography
                            sx={{
                              fontSize: 10,
                              fontFamily: 'monospace',
                              color: isDark ? '#64748B' : '#94A3B8',
                            }}
                          >
                            {row.month}
                          </Typography>
                        )}
                        {row.requestTitle && (
                          <Typography sx={{ fontSize: 10, mt: 0.5, color: isDark ? '#94A3B8' : '#64748B' }}>
                            {row.requestId ? `${row.requestId} · ` : ''}
                            {row.requestTitle}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>

                  <TableCell align="center" sx={{ py: 1.75, px: 2, verticalAlign: 'middle' }}>
                    <Chip
                      size="small"
                      label={statusMeta.label}
                      sx={{
                        fontSize: '10px',
                        fontWeight: 700,
                        height: 26,
                        bgcolor: colors.bg,
                        color: colors.color,
                        border: `1px solid ${colors.border}`,
                      }}
                      icon={
                        row.status === 'ACCEPTED' || row.status === 'UPLOADED' ? (
                          <Check size={12} color={colors.color} />
                        ) : row.status === 'UNDER_REVIEW' ? (
                          <Clock size={12} color={colors.color} />
                        ) : (
                          <AlertTriangle size={12} color={colors.color} />
                        )
                      }
                    />
                  </TableCell>

                  <TableCell sx={{ py: 1.75, px: 2, verticalAlign: 'middle' }}>
                    {row.evidenceUrl ? (
                      <Box>
                        <Tooltip title="Open client-uploaded file" arrow>
                          <Box
                            component="a"
                            href={row.evidenceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 1,
                              px: 1.5,
                              py: 0.75,
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: 600,
                              textDecoration: 'none',
                              color: isDark ? '#6EE7B7' : '#047857',
                              bgcolor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5',
                              border: '1px solid',
                              borderColor: isDark ? 'rgba(16,185,129,0.35)' : '#A7F3D0',
                              maxWidth: '100%',
                              '&:hover': { bgcolor: isDark ? 'rgba(16,185,129,0.2)' : '#D1FAE5' },
                            }}
                          >
                            <FileSpreadsheet size={16} />
                            <Typography
                              component="span"
                              sx={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: 240,
                              }}
                            >
                              {row.evidenceLabel || 'Open evidence'}
                            </Typography>
                            <ExternalLink size={12} style={{ opacity: 0.7, flexShrink: 0 }} />
                          </Box>
                        </Tooltip>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 1 }}>
                          {row.submittedAt && (
                            <Typography sx={{ fontSize: 10, color: isDark ? '#94A3B8' : '#64748B' }}>
                              {formatDate(row.submittedAt)}
                            </Typography>
                          )}
                          {row.submittedBy && (
                            <Typography
                              sx={{
                                fontSize: 10,
                                color: isDark ? '#94A3B8' : '#64748B',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 0.5,
                              }}
                            >
                              <User size={10} />
                              {row.submittedBy}
                            </Typography>
                          )}
                          {(row.linkCount ?? 0) > 1 && (
                            <Typography sx={{ fontSize: 10, color: isDark ? '#94A3B8' : '#64748B' }}>
                              {row.linkCount} files (latest shown)
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    ) : (
                      <Typography sx={{ fontSize: 12, color: isDark ? '#64748B' : '#94A3B8' }}>—</Typography>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};