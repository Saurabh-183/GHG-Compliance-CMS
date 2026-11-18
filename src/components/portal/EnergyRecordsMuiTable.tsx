'use client';

import React, { useState } from 'react';
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
} from '@mui/material';
import {
  FileSpreadsheet,
  FileText,
  ExternalLink,
  Check,
  AlertTriangle,
  Calendar,
  Eye,
} from 'lucide-react';
import { IMonthlyRecord } from '@/types';
import { formatNumber } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { EvidenceDocumentModal } from '@/components/common/EvidenceDocumentModal';

interface EnergyRecordsMuiTableProps {
  records: IMonthlyRecord[];
}

export const EnergyRecordsMuiTable: React.FC<EnergyRecordsMuiTableProps> = ({ records }) => {
  const { theme } = useAuth();
  const isDark = theme === 'dark';

  // Preview Modal state for official DISCOM PDF snapshot
  const [selectedPreview, setSelectedPreview] = useState<{
    url: string;
    label: string;
    month?: string;
  } | null>(null);

  // Compute summary totals
  const totalDeclared = records.reduce((sum, r) => sum + (r.declaredValue || 0), 0);
  const totalEvidence = records.reduce((sum, r) => sum + (r.evidenceValue || 0), 0);
  const totalVariance = records.reduce((sum, r) => sum + (r.variance || 0), 0);
  const mismatchCount = records.filter((r) => r.variance !== 0).length;

  return (
    <>
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
        <Table sx={{ minWidth: 780 }} aria-label="Monthly Energy Reconciliation Table" size="medium">
          {/* Table Header */}
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
                Billing Month
              </TableCell>

              <TableCell
                align="right"
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
                Declared (Excel Sheet)
              </TableCell>

              <TableCell
                align="right"
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
                Audited Evidence (DISCOM Bill)
              </TableCell>

              <TableCell
                align="right"
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
                Variance
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
                Status
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
                Drive Excel Log
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
                Drive Utility Bill
              </TableCell>
            </TableRow>
          </TableHead>

          {/* Table Body */}
          <TableBody>
            {records.map((row) => {
              const hasVariance = row.variance !== 0;
              const isMatch = row.result === 'MATCHED';

              return (
                <TableRow
                  key={row.month}
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
                  {/* Billing Month */}
                  <TableCell
                    sx={{
                      py: 1.5,
                      px: 2,
                      borderBottom: '1px solid',
                      borderBottomColor: isDark ? '#1E293B' : '#F1F5F9',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Calendar
                        className="w-3.5 h-3.5 shrink-0"
                        style={{ color: isDark ? '#94A3B8' : '#64748B' }}
                      />
                      <Typography
                        component="span"
                        sx={{
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: isDark ? '#FFFFFF' : '#0F172A',
                        }}
                      >
                        {row.month}
                      </Typography>
                    </Box>
                  </TableCell>

                  {/* Declared (Excel Sheet) */}
                  <TableCell
                    align="right"
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
                        fontWeight: 600,
                        color: isDark ? '#FFFFFF' : '#0F172A',
                      }}
                    >
                      {formatNumber(row.declaredValue)}
                    </Typography>
                    <Typography
                      component="span"
                      sx={{
                        ml: 0.5,
                        fontSize: '11px',
                        fontWeight: 500,
                        color: isDark ? '#94A3B8' : '#64748B',
                      }}
                    >
                      {row.unit}
                    </Typography>
                  </TableCell>

                  {/* Audited Evidence (DISCOM Bill) */}
                  <TableCell
                    align="right"
                    sx={{
                      py: 1.5,
                      px: 2,
                      borderBottom: '1px solid',
                      borderBottomColor: isDark ? '#1E293B' : '#F1F5F9',
                    }}
                  >
                    {row.evidenceValue !== null ? (
                      <>
                        <Typography
                          component="span"
                          sx={{
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: isDark ? '#E2E8F0' : '#1E293B',
                          }}
                        >
                          {formatNumber(row.evidenceValue)}
                        </Typography>
                        <Typography
                          component="span"
                          sx={{
                            ml: 0.5,
                            fontSize: '11px',
                            fontWeight: 500,
                            color: isDark ? '#94A3B8' : '#64748B',
                          }}
                        >
                          {row.unit}
                        </Typography>
                      </>
                    ) : (
                      <Typography
                        component="span"
                        sx={{ fontSize: '12px', color: isDark ? '#64748B' : '#94A3B8' }}
                      >
                        —
                      </Typography>
                    )}
                  </TableCell>

                  {/* Variance */}
                  <TableCell
                    align="right"
                    sx={{
                      py: 1.5,
                      px: 2,
                      borderBottom: '1px solid',
                      borderBottomColor: isDark ? '#1E293B' : '#F1F5F9',
                    }}
                  >
                    {hasVariance ? (
                      <Box
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.5,
                          px: 1.25,
                          py: 0.35,
                          borderRadius: '6px',
                          backgroundColor: isDark ? 'rgba(244, 63, 94, 0.15)' : '#FEF2F2',
                          border: '1px solid',
                          borderColor: isDark ? 'rgba(244, 63, 94, 0.35)' : '#FECACA',
                        }}
                      >
                        <AlertTriangle
                          className="w-3 h-3 shrink-0"
                          style={{ color: isDark ? '#FB7185' : '#DC2626' }}
                        />
                        <Typography
                          component="span"
                          sx={{
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: isDark ? '#FDA4AF' : '#991B1B',
                          }}
                        >
                          +{formatNumber(row.variance)} kWh ({row.variancePercentage}%)
                        </Typography>
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.5,
                          px: 1.25,
                          py: 0.35,
                          borderRadius: '6px',
                          backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#F0FDF4',
                          border: '1px solid',
                          borderColor: isDark ? 'rgba(16, 185, 129, 0.25)' : '#BBF7D0',
                        }}
                      >
                        <Check
                          className="w-3 h-3 shrink-0"
                          style={{ color: isDark ? '#34D399' : '#16A34A' }}
                        />
                        <Typography
                          component="span"
                          sx={{
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: isDark ? '#6EE7B7' : '#166534',
                          }}
                        >
                          0 kWh (0%)
                        </Typography>
                      </Box>
                    )}
                  </TableCell>

                  {/* Status */}
                  <TableCell
                    align="center"
                    sx={{
                      py: 1.5,
                      px: 2,
                      borderBottom: '1px solid',
                      borderBottomColor: isDark ? '#1E293B' : '#F1F5F9',
                    }}
                  >
                    <Chip
                      size="small"
                      icon={
                        isMatch ? (
                          <Check style={{ width: 13, height: 13, color: isDark ? '#34D399' : '#15803D' }} />
                        ) : (
                          <AlertTriangle style={{ width: 13, height: 13, color: isDark ? '#FB7185' : '#B91C1C' }} />
                        )
                      }
                      label={row.result}
                      sx={{
                        fontSize: '10px',
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                        height: 24,
                        px: 0.5,
                        backgroundColor: isMatch
                          ? isDark
                            ? 'rgba(16, 185, 129, 0.15)'
                            : '#ECFDF5'
                          : isDark
                          ? 'rgba(244, 63, 94, 0.15)'
                          : '#FEF2F2',
                        color: isMatch
                          ? isDark
                            ? '#34D399'
                            : '#065F46'
                          : isDark
                          ? '#FB7185'
                          : '#991B1B',
                        border: '1px solid',
                        borderColor: isMatch
                          ? isDark
                            ? 'rgba(16, 185, 129, 0.3)'
                            : '#A7F3D0'
                          : isDark
                          ? 'rgba(244, 63, 94, 0.3)'
                          : '#FECACA',
                        '& .MuiChip-icon': {
                          ml: '4px',
                          mr: '-2px',
                        },
                      }}
                    />
                  </TableCell>

                  {/* Drive Excel Log */}
                  <TableCell
                    align="center"
                    sx={{
                      py: 1.5,
                      px: 2,
                      borderBottom: '1px solid',
                      borderBottomColor: isDark ? '#1E293B' : '#F1F5F9',
                    }}
                  >
                    {row.sourceDocumentUrl ? (
                      <Tooltip title="Open Monthly Excel Consumption Workbook in Google Drive" arrow>
                        <Box
                          component="a"
                          href={row.sourceDocumentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.75,
                            px: 1.25,
                            py: 0.5,
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            textDecoration: 'none',
                            color: isDark ? '#34D399' : '#047857',
                            backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#ECFDF5',
                            border: '1px solid',
                            borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0',
                            transition: 'all 0.15s ease',
                            cursor: 'pointer',
                            '&:hover': {
                              backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5',
                              borderColor: isDark ? '#34D399' : '#059669',
                              color: isDark ? '#6EE7B7' : '#065F46',
                            },
                          }}
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                          <span>Excel</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                        </Box>
                      </Tooltip>
                    ) : (
                      <Typography
                        component="span"
                        sx={{ fontSize: '12px', color: isDark ? '#64748B' : '#94A3B8' }}
                      >
                        —
                      </Typography>
                    )}
                  </TableCell>

                  {/* Drive Utility Bill */}
                  <TableCell
                    align="center"
                    sx={{
                      py: 1.5,
                      px: 2,
                      borderBottom: '1px solid',
                      borderBottomColor: isDark ? '#1E293B' : '#F1F5F9',
                    }}
                  >
                    {row.evidenceDocumentUrl ? (
                      <Tooltip title="Preview Audited PSPCL DISCOM Utility Bill Snapshot" arrow>
                        <Box
                          component="button"
                          type="button"
                          onClick={() =>
                            setSelectedPreview({
                              url: row.evidenceDocumentUrl!,
                              label: `DISCOM Utility Bill · ${row.month}`,
                              month: row.month,
                            })
                          }
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.75,
                            px: 1.25,
                            py: 0.5,
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: isDark ? '#60A5FA' : '#1D4ED8',
                            backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : '#EFF6FF',
                            border: '1px solid',
                            borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE',
                            transition: 'all 0.15s ease',
                            cursor: 'pointer',
                            '&:hover': {
                              backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#DBEAFE',
                              borderColor: isDark ? '#60A5FA' : '#2563EB',
                              color: isDark ? '#93C5FD' : '#1E40AF',
                            },
                          }}
                        >
                          <FileText className="w-3.5 h-3.5 shrink-0" />
                          <span>PDF Bill</span>
                          <Eye className="w-3 h-3 opacity-70" />
                        </Box>
                      </Tooltip>
                    ) : (
                      <Typography
                        component="span"
                        sx={{ fontSize: '12px', color: isDark ? '#64748B' : '#94A3B8' }}
                      >
                        —
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>

          {/* Table Footer: Totals Summary Row */}
          <TableHead>
            <TableRow
              sx={{
                backgroundColor: isDark ? '#0B1120' : '#F8FAFC',
                borderTop: '2px solid',
                borderTopColor: isDark ? '#334155' : '#E2E8F0',
              }}
            >
              <TableCell
                sx={{
                  py: 1.5,
                  px: 2,
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: isDark ? '#E2E8F0' : '#1E293B',
                }}
              >
                Total (12 Months)
              </TableCell>

              <TableCell
                align="right"
                sx={{
                  py: 1.5,
                  px: 2,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: isDark ? '#FFFFFF' : '#0F172A',
                }}
              >
                {formatNumber(totalDeclared)} kWh
              </TableCell>

              <TableCell
                align="right"
                sx={{
                  py: 1.5,
                  px: 2,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: isDark ? '#CBD5E1' : '#1E293B',
                }}
              >
                {formatNumber(totalEvidence)} kWh
              </TableCell>

              <TableCell
                align="right"
                sx={{
                  py: 1.5,
                  px: 2,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: mismatchCount > 0 ? (isDark ? '#FDA4AF' : '#B42318') : (isDark ? '#6EE7B7' : '#166534'),
                }}
              >
                {mismatchCount > 0
                  ? `+${formatNumber(totalVariance)} kWh Net Variance`
                  : '0 kWh Variance'}
              </TableCell>

              <TableCell
                align="center"
                sx={{
                  py: 1.5,
                  px: 2,
                  fontSize: '11px',
                  fontWeight: 600,
                  color: isDark ? '#94A3B8' : '#475569',
                }}
              >
                {records.length - mismatchCount}/{records.length} Matched
              </TableCell>

              <TableCell align="center" sx={{ py: 1.5, px: 2 }}>
                —
              </TableCell>

              <TableCell align="center" sx={{ py: 1.5, px: 2 }}>
                —
              </TableCell>
            </TableRow>
          </TableHead>
        </Table>
      </TableContainer>

      {/* Snapshot Preview Modal */}
      {selectedPreview && (
        <EvidenceDocumentModal
          isOpen={Boolean(selectedPreview)}
          onClose={() => setSelectedPreview(null)}
          url={selectedPreview.url}
          label={selectedPreview.label}
          month={selectedPreview.month}
        />
      )}
    </>
  );
};
