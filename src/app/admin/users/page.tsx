'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { notify } from '@/lib/notify';
import { ComplianceType } from '@/types';
import FacilityComplianceYearSettings from '@/components/admin/FacilityComplianceYearSettings';
import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Box,
} from '@mui/material';
import {
  Building2,
  UserPlus,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Factory,
  Users,
  Search,
  X,
} from 'lucide-react';

type Group = { _id: string; name: string; code?: string; industry?: string; enabledFrameworks?: ComplianceType[] };
type Facility = { facilityId: string; name: string; clientGroupId?: string; clientGroupName?: string; enabledFrameworks?: ComplianceType[] };
type Account = {
  _id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'CONSULTANT' | 'CLIENT';
  status?: string;
  designation?: string;
  mobileNo?: string;
  managerName?: string;
  capacity?: string;
  clientGroupId?: string;
  clientGroupIds?: string[];
  authorizedFacilityIds?: string[];
  createdAt?: string;
};

const getMuiInputSx = (isDark: boolean) => ({
  width: '100%',
  '& .MuiOutlinedInput-root': {
    height: '48px',
    minHeight: '48px',
    maxHeight: '48px',
    borderRadius: '8px',
    backgroundColor: isDark ? '#020617' : '#FFFFFF',
    color: isDark ? '#FFFFFF' : '#0F172A',
    fontSize: '13px',
    boxSizing: 'border-box',
    padding: '0 !important',
    '& fieldset': {
      borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#CBD5E1',
    },
    '&:hover fieldset': {
      borderColor: isDark ? '#34D399' : '#059669',
    },
    '&.Mui-focused fieldset': {
      borderColor: isDark ? '#34D399' : '#059669',
      borderWidth: '1.5px',
    },
    '& input': {
      height: '48px',
      lineHeight: '48px',
      boxSizing: 'border-box',
      padding: '0 14px !important',
      color: isDark ? '#FFFFFF' : '#0F172A',
      fontSize: '13px',
    },
    '& .MuiAutocomplete-input': {
      height: '48px',
      lineHeight: '48px',
      boxSizing: 'border-box',
      padding: '0 36px 0 14px !important',
      color: isDark ? '#FFFFFF' : '#0F172A',
      fontSize: '13px',
    },
    '& .MuiInputAdornment-root': {
      marginRight: '8px',
    },
  },
  '& .MuiInputLabel-root': {
    color: isDark ? '#94A3B8' : '#64748B',
    fontSize: '13px',
    transform: 'translate(14px, 14px) scale(1)',
    '&.MuiInputLabel-shrink': {
      transform: 'translate(14px, -9px) scale(0.75)',
      color: isDark ? '#34D399' : '#059669',
    },
  },
  '& .MuiSvgIcon-root': {
    color: isDark ? '#94A3B8' : '#64748B',
  },
  '& .MuiAutocomplete-clearIndicator': {
    color: isDark ? '#94A3B8' : '#64748B',
  },
  '& .MuiAutocomplete-popupIndicator': {
    color: isDark ? '#94A3B8' : '#64748B',
  },
});

const getMuiMultipleAutocompleteSx = (isDark: boolean) => ({
  width: '100%',
  '& .MuiOutlinedInput-root': {
    minHeight: '48px',
    height: 'auto',
    borderRadius: '8px',
    backgroundColor: isDark ? '#020617' : '#FFFFFF',
    color: isDark ? '#FFFFFF' : '#0F172A',
    fontSize: '13px',
    boxSizing: 'border-box',
    padding: '6px 12px !important',
    gap: '6px',
    '& fieldset': {
      borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#CBD5E1',
    },
    '&:hover fieldset': {
      borderColor: isDark ? '#34D399' : '#059669',
    },
    '&.Mui-focused fieldset': {
      borderColor: isDark ? '#34D399' : '#059669',
      borderWidth: '1.5px',
    },
    '& input': {
      minHeight: '34px',
      boxSizing: 'border-box',
      padding: '0 8px !important',
      color: isDark ? '#FFFFFF' : '#0F172A',
      fontSize: '13px',
    },
    '& .MuiChip-root': {
      borderRadius: '6px',
      fontSize: '12px',
      height: '28px',
      backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : '#E6F4EA',
      color: isDark ? '#34D399' : '#059669',
      borderColor: isDark ? 'rgba(52, 211, 153, 0.3)' : '#A7F3D0',
    },
  },
  '& .MuiInputLabel-root': {
    color: isDark ? '#94A3B8' : '#64748B',
    fontSize: '13px',
    transform: 'translate(14px, 14px) scale(1)',
    '&.MuiInputLabel-shrink': {
      transform: 'translate(14px, -9px) scale(0.75)',
      color: isDark ? '#34D399' : '#059669',
    },
  },
  '& .MuiSvgIcon-root': {
    color: isDark ? '#94A3B8' : '#64748B',
  },
});

const getMuiSelectSx = (isDark: boolean) => ({
  height: '48px',
  minHeight: '48px',
  maxHeight: '48px',
  fontSize: '13px',
  fontWeight: 500,
  borderRadius: '8px',
  backgroundColor: isDark ? '#020617' : '#FFFFFF',
  color: isDark ? '#FFFFFF' : '#0F172A',
  boxSizing: 'border-box',
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
    height: '48px !important',
    lineHeight: '48px !important',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    padding: '0 14px !important',
    fontSize: '13px',
  },
  '& .MuiSelect-icon': {
    color: isDark ? '#94A3B8' : '#64748B',
    right: '8px',
  },
});

const getMuiFormControlSx = (isDark: boolean) => ({
  width: '100%',
  '& .MuiInputLabel-root': {
    color: isDark ? '#94A3B8' : '#64748B',
    fontSize: '13px',
    transform: 'translate(14px, 14px) scale(1)',
    '&.MuiInputLabel-shrink': {
      transform: 'translate(14px, -9px) scale(0.75)',
      color: isDark ? '#34D399' : '#059669',
    },
  },
});

const getMuiMenuProps = (isDark: boolean) => ({
  slotProps: {
    paper: {
      sx: {
        mt: 0.5,
        maxHeight: 280,
        borderRadius: '8px',
        backgroundColor: isDark ? '#0F172A !important' : '#FFFFFF !important',
        color: isDark ? '#FFFFFF' : '#0F172A',
        border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.15)' : '#E2E8F0'}`,
        boxShadow: isDark
          ? '0 10px 25px -5px rgba(0, 0, 0, 0.7)'
          : '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
        '& .MuiMenuItem-root': {
          fontSize: '13px',
          color: isDark ? '#E2E8F0' : '#0F172A',
          '&:hover, &.Mui-focusVisible': {
            backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
            color: isDark ? '#34D399' : '#059669',
          },
          '&.Mui-selected': {
            backgroundColor: isDark ? '#1E293B !important' : '#E2E8F0 !important',
            color: isDark ? '#34D399' : '#059669',
            fontWeight: 600,
          },
        },
      },
    },
  },
});

const getMuiAutocompleteSlotProps = (isDark: boolean) => ({
  paper: {
    sx: {
      mt: 0.5,
      maxHeight: 300,
      borderRadius: '8px',
      backgroundColor: isDark ? '#0F172A !important' : '#FFFFFF !important',
      color: isDark ? '#FFFFFF' : '#0F172A',
      border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.15)' : '#E2E8F0'}`,
      boxShadow: isDark
        ? '0 10px 25px -5px rgba(0, 0, 0, 0.7)'
        : '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
      '& .MuiAutocomplete-option': {
        fontSize: '13px',
        color: isDark ? '#E2E8F0' : '#0F172A',
        '&:hover, &.Mui-focused': {
          backgroundColor: isDark ? '#1E293B !important' : '#F1F5F9 !important',
          color: isDark ? '#34D399' : '#059669',
        },
        '&[aria-selected="true"]': {
          backgroundColor: isDark ? '#1E293B !important' : '#E2E8F0 !important',
          color: isDark ? '#34D399' : '#059669',
          fontWeight: 600,
        },
      },
      '& .MuiAutocomplete-noOptions': {
        color: isDark ? '#94A3B8' : '#64748B',
        fontSize: '12px',
        py: 2,
        textAlign: 'center',
      },
    },
  },
});

export default function AdminUsersPage() {
  const { currentRole, currentUser, theme } = useAuth();
  const isDark = theme === 'dark';

  const [users, setUsers] = useState<Account[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // 3-way Creation Tab Switch: 1st (Left) Client | 2nd (Middle) Facility | 3rd (Right) Consultant
  type ActiveCreationTab = 'CLIENT' | 'FACILITY' | 'CONSULTANT';
  const [activeTab, setActiveTab] = useState<ActiveCreationTab>('CLIENT');

  // Main Form State (Client & Consultant)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'CLIENT' as Account['role'],
    mobileNo: '',
    managerName: '',
    capacity: '',
    companyName: '',
    clientGroupId: '',
    industry: 'Industrial / Manufacturing',
    headquarters: '',
    assignedConsultantId: '',
    selectedClientGroupIds: [] as string[],
  });

  const [showPassword, setShowPassword] = useState(false);

  // Facility Form State (Middle Tab)
  const [facilityForm, setFacilityForm] = useState({
    name: '',
    facilityId: '',
    clientGroupId: '',
    location: '',
    category: '',
    consumerAccountNumber: '',
    contractDemand: '',
  });
  const [facilityCodeManuallyEdited, setFacilityCodeManuallyEdited] = useState(false);
  const [facilityBusy, setFacilityBusy] = useState(false);

  // Edit Client Assignments Modal State
  const [editFacilityUser, setEditFacilityUser] = useState<Account | null>(null);
  const [editingClientGroupIds, setEditingClientGroupIds] = useState<string[]>([]);
  const [editingBusy, setEditingBusy] = useState(false);

  // Edit Client Frameworks Modal State
  const [frameworkModalGroup, setFrameworkModalGroup] = useState<Group | null>(null);
  const [modalFrameworks, setModalFrameworks] = useState<ComplianceType[]>([]);
  const [frameworkSaving, setFrameworkSaving] = useState(false);

  // Reset Password Modal State
  const [resetPasswordUser, setResetPasswordUser] = useState<Account | null>(null);
  const [newTempPassword, setNewTempPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);

  // Delete User State
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<Account | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Debounced Search State for Existing Accounts
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredUsers = useMemo(() => {
    if (!debouncedSearch) return users;
    const q = debouncedSearch.toLowerCase();
    return users.filter((user) => {
      const userGroup = groups.find((g) => g._id === user.clientGroupId);
      const companyName = userGroup?.name?.toLowerCase() || '';
      const name = user.name?.toLowerCase() || '';
      const email = user.email?.toLowerCase() || '';
      const mobile = user.mobileNo?.toLowerCase() || '';
      const manager = user.managerName?.toLowerCase() || '';
      const role = user.role?.toLowerCase() || '';
      const designation = user.designation?.toLowerCase() || '';
      const status = (user.status || 'ACTIVE').toLowerCase();
      const capacity = user.capacity?.toLowerCase() || '';

      return (
        name.includes(q) ||
        email.includes(q) ||
        companyName.includes(q) ||
        mobile.includes(q) ||
        manager.includes(q) ||
        role.includes(q) ||
        designation.includes(q) ||
        status.includes(q) ||
        capacity.includes(q)
      );
    });
  }, [users, groups, debouncedSearch]);

  async function handleDeleteUser() {
    if (!deleteConfirmUser) return;
    setIsDeletingUser(true);
    try {
      const res = await fetch(`/api/admin/users/${deleteConfirmUser._id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to delete user');
      notify.success(`User ${deleteConfirmUser.email} deleted successfully`);
      setUsers((prev) => prev.filter((u) => u._id !== deleteConfirmUser._id));
      setDeleteConfirmUser(null);
      void load();
    } catch (err: any) {
      notify.error(err.message || 'Error deleting user');
    } finally {
      setIsDeletingUser(false);
    }
  }

  async function load() {
    try {
      const [u, g, f] = await Promise.all([
        fetch('/api/admin/users', { cache: 'no-store' }),
        fetch('/api/client-groups', { cache: 'no-store' }),
        fetch('/api/facilities', { cache: 'no-store' }),
      ]);
      if (u.ok) setUsers((await u.json()).data || []);
      if (g.ok) setGroups((await g.json()).data || []);
      if (f.ok) setFacilities((await f.json()).data || []);
    } catch (err) {
      console.error('Error loading admin user data:', err);
    }
  }

  useEffect(() => {
    if (currentRole === 'ADMIN') void load();
  }, [currentRole]);

  async function createAccount(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    const targetRole: Account['role'] = activeTab === 'CLIENT' ? 'CLIENT' : 'CONSULTANT';

    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: targetRole,
        mobileNo: form.mobileNo.trim(),
      };

      if (targetRole === 'CLIENT') {
        if (!form.companyName.trim() && !form.clientGroupId) {
          throw new Error('Please enter the client company name.');
        }
        payload.companyName = form.companyName.trim();
        if (form.clientGroupId) payload.clientGroupId = form.clientGroupId;
        if (form.industry) payload.industry = form.industry;
        if (form.headquarters) payload.headquarters = form.headquarters;
        if (form.managerName.trim()) payload.managerName = form.managerName.trim();
        if (form.capacity.trim()) payload.capacity = form.capacity.trim();
        if (form.assignedConsultantId) payload.assignedConsultantId = form.assignedConsultantId;
      } else if (targetRole === 'CONSULTANT') {
        if (form.selectedClientGroupIds.length === 0) {
          throw new Error('Please select at least one client company for the consultant.');
        }
        payload.clientGroupIds = form.selectedClientGroupIds;
      }

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to create account.');

      notify.success(`Account created successfully for ${data.data.email}`);
      setMessage({
        text: `Successfully created ${targetRole.toLowerCase()} account for ${data.data.email}. The user can sign in using this temporary password.`,
        type: 'success',
      });

      // Reset form
      setForm({
        name: '',
        email: '',
        password: '',
        role: targetRole,
        mobileNo: '',
        managerName: '',
        capacity: '',
        companyName: '',
        clientGroupId: '',
        industry: 'Industrial / Manufacturing',
        headquarters: '',
        assignedConsultantId: '',
        selectedClientGroupIds: [],
      });

      await load();
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unable to create account.';
      setMessage({
        text: errMsg,
        type: 'error',
      });
      notify.error(errMsg);
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateFacility(event: React.FormEvent) {
    event.preventDefault();
    if (!facilityForm.name.trim()) {
      notify.error('Facility name is required.');
      return;
    }
    if (!facilityForm.clientGroupId) {
      notify.error('Please select the Client Company for this facility.');
      return;
    }
    setFacilityBusy(true);
    setMessage(null);
    try {
      const payload: Record<string, unknown> = {
        name: facilityForm.name.trim(),
        facilityId: facilityForm.facilityId.trim().toUpperCase() || undefined,
        clientGroupId: facilityForm.clientGroupId,
        location: facilityForm.location.trim() || undefined,
        category: facilityForm.category || undefined,
        enabledFrameworks: [],
        utilityConnection: {
          consumerAccountNumber: facilityForm.consumerAccountNumber.trim() || undefined,
          contractDemand: facilityForm.contractDemand.trim() || undefined,
        },
      };

      const res = await fetch('/api/facilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to register facility.');

      notify.success(`Operating facility "${data.data?.name || payload.name}" registered successfully!`);
      setMessage({
        text: `Operating facility "${data.data?.name || payload.name}" (${data.data?.facilityId}) registered successfully!`,
        type: 'success',
      });

      setFacilityForm({
        name: '',
        facilityId: '',
        clientGroupId: '',
        location: '',
        category: '',
        consumerAccountNumber: '',
        contractDemand: '',
      });
      setFacilityCodeManuallyEdited(false);

      await load();
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unable to register facility.';
      notify.error(errMsg);
      setMessage({ text: errMsg, type: 'error' });
    } finally {
      setFacilityBusy(false);
    }
  }

  async function saveClientAssignments() {
    if (!editFacilityUser) return;
    setEditingBusy(true);
    try {
      const response = await fetch(`/api/admin/users/${editFacilityUser._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientGroupIds: editingClientGroupIds }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Assignment update failed.');
      setMessage({
        text: `Updated client assignments for ${editFacilityUser.email}.`,
        type: 'success',
      });
      notify.success(`Updated client assignments for ${editFacilityUser.email}`);
      setEditFacilityUser(null);
      await load();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Assignment update failed.';
      setMessage({
        text: errMsg,
        type: 'error',
      });
      notify.error(errMsg);
    } finally {
      setEditingBusy(false);
    }
  }

  async function savePasswordReset() {
    if (!resetPasswordUser) return;
    if (newTempPassword.length < 12) {
      const errMsg = 'Temporary password must be at least 12 characters.';
      setMessage({ text: errMsg, type: 'error' });
      notify.error(errMsg);
      return;
    }
    setResetBusy(true);
    try {
      const response = await fetch(`/api/admin/users/${resetPasswordUser._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newTempPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Password reset failed.');
      setMessage({
        text: `Temporary password reset for ${resetPasswordUser.email}.`,
        type: 'success',
      });
      notify.success(`Temporary password reset for ${resetPasswordUser.email}`);
      setResetPasswordUser(null);
      setNewTempPassword('');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Password reset failed.';
      setMessage({
        text: errMsg,
        type: 'error',
      });
      notify.error(errMsg);
    } finally {
      setResetBusy(false);
    }
  }

  async function changeStatus(user: Account, status: string) {
    try {
      const response = await fetch(`/api/admin/users/${user._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Update failed.');
      setMessage({ text: `Updated account status for ${user.email}.`, type: 'success' });
      notify.success(`Account status updated for ${user.email}`);
      await load();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Update failed.';
      setMessage({
        text: errMsg,
        type: 'error',
      });
      notify.error(errMsg);
    }
  }

  if (currentRole !== 'ADMIN') {
    return (
      <main className="mx-auto max-w-4xl p-8 text-center text-slate-500">
        You do not have permission to manage accounts. Please sign in as an Administrator.
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-8xl space-y-8 p-5 sm:p-8">
      {/* Header */}
      <header className="p-4  rounded-lg border border-slate-200 pb-5 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">User Management</h1>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Create and manage database-backed administrator, consultant and client accounts.
            </p>
          </div>
        </div>
      </header>

      {/* Status Notification Message */}
      {message && (
        <div
          role="status"
          className={`flex items-center gap-3 rounded-xl border p-4 text-xs font-medium ${
            message.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Creation Section with 3 Switches: 1st (Left) Client | 2nd (Middle) Facility | 3rd (Right) Consultant */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 shrink-0">
              {activeTab === 'CLIENT' && <Building2 className="h-5 w-5" />}
              {activeTab === 'FACILITY' && <Factory className="h-5 w-5" />}
              {activeTab === 'CONSULTANT' && <Shield className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {activeTab === 'CLIENT' && 'Register Client Organization & Account'}
                {activeTab === 'FACILITY' && 'Register New Facility (Operating Unit)'}
                {activeTab === 'CONSULTANT' && 'Register Consultant Account'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {activeTab === 'CLIENT' && 'Create client organization representative account and company group.'}
                {activeTab === 'FACILITY' && 'Add an operating facility and link it to an existing Client Company.'}
                {activeTab === 'CONSULTANT' && 'Create internal compliance reviewer account and assign authorized client companies.'}
              </p>
            </div>
          </div>

          {/* 3 Switches: Client (Left), Facility (Middle), Consultant (Right) */}
          <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 self-start sm:self-center shrink-0 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab('CLIENT')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'CLIENT'
                  ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Building2 className="h-4 w-4" />
              <span>Client</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('FACILITY')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'FACILITY'
                  ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Factory className="h-4 w-4" />
              <span>Facility</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('CONSULTANT')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'CONSULTANT'
                  ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Shield className="h-4 w-4" />
              <span>Consultant</span>
            </button>
          </div>
        </div>

        {/* 1. Client Form */}
        {activeTab === 'CLIENT' && (
          <form onSubmit={createAccount} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <TextField
                required
                fullWidth
                label="Full Name"
                placeholder="e.g. Vikram Singh"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                sx={getMuiInputSx(isDark)}
              />

              <TextField
                required
                fullWidth
                type="email"
                label="Work Email Address"
                placeholder="e.g. client@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                sx={getMuiInputSx(isDark)}
              />

              <TextField
                required
                fullWidth
                type={showPassword ? 'text' : 'password'}
                label="Temporary Password (min. 12 chars)"
                placeholder="Minimum 12 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          size="small"
                          sx={{ color: isDark ? '#94A3B8' : '#64748B' }}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
                sx={getMuiInputSx(isDark)}
              />

              <TextField
                required
                fullWidth
                label="Client Company Name"
                placeholder="e.g. ABC Impex or Trident Group"
                value={form.companyName}
                onChange={(e) => {
                  const val = e.target.value;
                  const matched = groups.find(
                    (g) => g.name.toLowerCase() === val.trim().toLowerCase()
                  );
                  setForm({
                    ...form,
                    companyName: val,
                    clientGroupId: matched ? matched._id : '',
                    industry: matched?.industry || form.industry,
                  });
                }}
                sx={getMuiInputSx(isDark)}
              />

              <TextField
                fullWidth
                label="Mobile Number"
                placeholder="e.g. +91 98765 43210"
                value={form.mobileNo}
                onChange={(e) => setForm({ ...form, mobileNo: e.target.value })}
                sx={getMuiInputSx(isDark)}
              />

              <TextField
                fullWidth
                label="Manager Name"
                placeholder="e.g. Rajesh Kumar"
                value={form.managerName}
                onChange={(e) => setForm({ ...form, managerName: e.target.value })}
                sx={getMuiInputSx(isDark)}
              />

              <TextField
                fullWidth
                label="Capacity (Optional)"
                placeholder="e.g. 150,000 MT/year or 25 MW"
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                sx={getMuiInputSx(isDark)}
              />

              <FormControl fullWidth sx={getMuiFormControlSx(isDark)}>
                <InputLabel id="industry-select-label">Company Industry</InputLabel>
                <Select
                  labelId="industry-select-label"
                  label="Company Industry"
                  value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                  sx={getMuiSelectSx(isDark)}
                  MenuProps={getMuiMenuProps(isDark)}
                >
                  <MenuItem value="Industrial / Manufacturing">Industrial / Manufacturing</MenuItem>
                  <MenuItem value="Textiles & Apparel">Textiles & Apparel</MenuItem>
                  <MenuItem value="Pulp & Paper">Pulp & Paper</MenuItem>
                  <MenuItem value="Iron & Steel">Iron & Steel</MenuItem>
                  <MenuItem value="Chemicals & Fertilizers">Chemicals & Fertilizers</MenuItem>
                  <MenuItem value="Cement & Building Materials">Cement & Building Materials</MenuItem>
                  <MenuItem value="Power Generation">Power Generation</MenuItem>
                  <MenuItem value="Food & Agro Products">Food & Agro Products</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Headquarters / City"
                placeholder="e.g. Ludhiana, Punjab or Mumbai, Maharashtra"
                value={form.headquarters}
                onChange={(e) => setForm({ ...form, headquarters: e.target.value })}
                sx={getMuiInputSx(isDark)}
              />

              <FormControl fullWidth sx={getMuiFormControlSx(isDark)}>
                <InputLabel id="client-consultant-label">Assigned Consultant (Optional)</InputLabel>
                <Select
                  labelId="client-consultant-label"
                  label="Assigned Consultant (Optional)"
                  value={form.assignedConsultantId}
                  onChange={(e) => setForm({ ...form, assignedConsultantId: e.target.value })}
                  sx={getMuiSelectSx(isDark)}
                  MenuProps={getMuiMenuProps(isDark)}
                >
                  <MenuItem value="">Unassigned (Assign later)</MenuItem>
                  {users
                    .filter((u) => u.role === 'CONSULTANT')
                    .map((c) => (
                      <MenuItem key={c._id} value={c._id}>
                        {c.name} ({c.email})
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-6 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-50 cursor-pointer"
              >
                {busy ? (
                  <>
                    <CircularProgress size={14} color="inherit" />
                    <span>Creating Client...</span>
                  </>
                ) : (
                  <>
                    <Building2 className="h-4 w-4" />
                    <span>Create Client Account</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* 2. Facility Form (With Client Dropdown) */}
        {activeTab === 'FACILITY' && (
          <form onSubmit={handleCreateFacility} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              {/* Client Company Dropdown */}
              <FormControl fullWidth required sx={getMuiFormControlSx(isDark)}>
                <InputLabel id="facility-client-select-label">Client Company *</InputLabel>
                <Select
                  labelId="facility-client-select-label"
                  label="Client Company *"
                  value={facilityForm.clientGroupId}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    const matched = groups.find((g) => g._id === selectedId);
                    setFacilityForm((prev) => ({
                      ...prev,
                      clientGroupId: selectedId,
                      category: matched?.industry || prev.category || '',
                    }));
                  }}
                  sx={getMuiSelectSx(isDark)}
                  MenuProps={getMuiMenuProps(isDark)}
                >
                  {groups.length === 0 ? (
                    <MenuItem disabled value="">No Client Companies registered yet</MenuItem>
                  ) : (
                    groups.map((g) => (
                      <MenuItem key={g._id} value={g._id}>
                        {g.name} {g.industry ? `(${g.industry})` : ''}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>

              {/* Facility Name */}
              <TextField
                required
                fullWidth
                label="Facility Name"
                placeholder="e.g. Trident Paper Division Unit 1"
                value={facilityForm.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setFacilityForm((prev) => ({
                    ...prev,
                    name,
                    facilityId: facilityCodeManuallyEdited
                      ? prev.facilityId
                      : name
                          .replace(/[^a-zA-Z0-9]/g, '_')
                          .toUpperCase()
                          .slice(0, 24),
                  }));
                }}
                sx={getMuiInputSx(isDark)}
              />

              {/* Facility Code / ID */}
              <TextField
                required
                fullWidth
                label="Facility Code / ID"
                placeholder="e.g. TRIDENT_PAPER_1"
                value={facilityForm.facilityId}
                onChange={(e) => {
                  setFacilityCodeManuallyEdited(true);
                  setFacilityForm({ ...facilityForm, facilityId: e.target.value.toUpperCase() });
                }}
                sx={getMuiInputSx(isDark)}
              />

              {/* Sector / Category (Auto-fetched from Client Company Industry) */}
              <TextField
                required
                fullWidth
                label="Sector / Category"
                placeholder="Auto-fetched when Client Company is selected"
                value={facilityForm.category}
                onChange={(e) => setFacilityForm({ ...facilityForm, category: e.target.value })}
                sx={getMuiInputSx(isDark)}
                slotProps={{
                  input: {
                    endAdornment: facilityForm.category ? (
                      <InputAdornment position="end">
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 shrink-0">
                          Auto-fetched
                        </span>
                      </InputAdornment>
                    ) : undefined,
                  },
                }}
              />

              {/* Operating Location / State */}
              <TextField
                required
                fullWidth
                label="Operating Location / State"
                placeholder="e.g. Dhaula, Punjab or Mumbai, Maharashtra"
                value={facilityForm.location}
                onChange={(e) => setFacilityForm({ ...facilityForm, location: e.target.value })}
                sx={getMuiInputSx(isDark)}
              />

              {/* Consumer Account Number */}
              <TextField
                fullWidth
                label="Consumer Account Number (Optional)"
                placeholder="e.g. CA-98421094"
                value={facilityForm.consumerAccountNumber}
                onChange={(e) => setFacilityForm({ ...facilityForm, consumerAccountNumber: e.target.value })}
                sx={getMuiInputSx(isDark)}
              />

              {/* Contract Demand / Capacity */}
              <TextField
                fullWidth
                label="Contract Demand / Capacity (Optional)"
                placeholder="e.g. 25 MVA or 150,000 MT/year"
                value={facilityForm.contractDemand}
                onChange={(e) => setFacilityForm({ ...facilityForm, contractDemand: e.target.value })}
                sx={getMuiInputSx(isDark)}
              />
            </div>

            <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
              Register the facility first. You can configure its compliance frameworks by financial year in the panel below, including for existing facilities and multiple facilities together.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="submit"
                disabled={facilityBusy}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-6 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {facilityBusy ? (
                  <>
                    <CircularProgress size={14} color="inherit" />
                    <span>Registering Facility...</span>
                  </>
                ) : (
                  <>
                    <Factory className="h-4 w-4" />
                    <span>Register Facility</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
        {activeTab === 'FACILITY' && <FacilityComplianceYearSettings />}

        {/* 3. Consultant Form */}
        {activeTab === 'CONSULTANT' && (
          <form onSubmit={createAccount} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <TextField
                required
                fullWidth
                label="Full Name"
                placeholder="e.g. Priya Sharma"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                sx={getMuiInputSx(isDark)}
              />

              <TextField
                required
                fullWidth
                type="email"
                label="Work Email Address"
                placeholder="e.g. consultant@carboncrunch.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                sx={getMuiInputSx(isDark)}
              />

              <TextField
                required
                fullWidth
                type={showPassword ? 'text' : 'password'}
                label="Temporary Password (min. 12 chars)"
                placeholder="Minimum 12 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          size="small"
                          sx={{ color: isDark ? '#94A3B8' : '#64748B' }}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
                sx={getMuiInputSx(isDark)}
              />

              <TextField
                fullWidth
                label="Mobile Number"
                placeholder="e.g. +91 98765 43210"
                value={form.mobileNo}
                onChange={(e) => setForm({ ...form, mobileNo: e.target.value })}
                sx={getMuiInputSx(isDark)}
              />

              <div className="md:col-span-2">
                <Autocomplete
                  multiple
                  fullWidth
                  className="w-full"
                  options={groups}
                  getOptionLabel={(option) => `${option.name} (${option.industry || 'Client Company'})`}
                  value={groups.filter((g) => form.selectedClientGroupIds.includes(g._id))}
                  slotProps={getMuiAutocompleteSlotProps(isDark)}
                  onChange={(_, newValue) => {
                    setForm({
                      ...form,
                      selectedClientGroupIds: newValue.map((g) => g._id),
                    });
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      fullWidth
                      label="Assigned Client Companies (Select multiple) *"
                      placeholder="Click to search and select client companies..."
                      sx={getMuiMultipleAutocompleteSx(isDark)}
                    />
                  )}
                />
                <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  Select client companies. All operating units and facilities belonging to these clients will be managed by this consultant.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-6 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-50 cursor-pointer"
              >
                {busy ? (
                  <>
                    <CircularProgress size={14} color="inherit" />
                    <span>Creating Consultant...</span>
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4" />
                    <span>Create Consultant Account</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Existing Accounts Table Section */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 p-5 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Existing Accounts ({debouncedSearch ? `${filteredUsers.length} of ${users.length}` : users.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Active directory of administrative, consultant and client accounts.
            </p>
          </div>

          {/* Search Filter Input with Debounce */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search user, email, company, role..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-8 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800/60 dark:text-white dark:focus:border-emerald-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                title="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-slate-50 uppercase text-slate-500 dark:bg-slate-950 dark:text-slate-400 font-semibold tracking-wider">
              <tr>
                <th className="p-4">User</th>
                <th className="p-4">Role</th>
                <th className="p-4">Company / Facilities</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-8 h-8 text-slate-400 opacity-60" />
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {debouncedSearch
                          ? `No accounts found matching "${debouncedSearch}"`
                          : 'No accounts registered yet.'}
                      </p>
                      {debouncedSearch && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium cursor-pointer"
                        >
                          Clear search filter
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                const isClient = user.role === 'CLIENT';
                const isConsultant = user.role === 'CONSULTANT';
                const userGroup = groups.find((g) => g._id === user.clientGroupId);

                return (
                  <tr
                    key={user._id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="p-4">
                      <div className="font-bold text-slate-900 dark:text-white">{user.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{user.email}</div>
                      {user.mobileNo && (
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                          Ph: {user.mobileNo}
                        </div>
                      )}
                    </td>

                    <td className="p-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          user.role === 'ADMIN'
                            ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                            : user.role === 'CONSULTANT'
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>

                    <td className="p-4">
                      {isClient ? (
                        <div className="space-y-0.5">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {userGroup?.name || 'Company Assigned'}
                          </div>
                          {user.managerName && (
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                              Manager: <strong className="text-slate-700 dark:text-slate-300">{user.managerName}</strong>
                            </div>
                          )}
                          {user.capacity && (
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                              Capacity: {user.capacity}
                            </div>
                          )}
                          <div className="text-[10px] text-slate-400">
                            {user.authorizedFacilityIds?.length || 0} unit(s) linked
                          </div>
                          {/* Enabled Frameworks Badges */}
                          <div className="flex flex-wrap items-center gap-1 pt-1">
                            {(() => {
                              const userFacs = facilities.filter(
                                (f) =>
                                  (user.authorizedFacilityIds && user.authorizedFacilityIds.includes(f.facilityId)) ||
                                  (user.clientGroupId && (f.clientGroupId === user.clientGroupId || (f as any).clientGroupId?._id === user.clientGroupId))
                              );
                              const facFws = Array.from(
                                new Set(
                                  userFacs.flatMap((f: any) =>
                                    Array.isArray(f.enabledFrameworks) && f.enabledFrameworks.length > 0
                                      ? f.enabledFrameworks
                                      : []
                                  )
                                )
                              ) as ComplianceType[];

                              const effectiveFws =
                                facFws.length > 0
                                  ? facFws
                                  : Array.isArray(userGroup?.enabledFrameworks) && userGroup.enabledFrameworks.length > 0
                                  ? userGroup.enabledFrameworks
                                  : ['RCO', 'PAT', 'CCTS'];

                              return effectiveFws.map((fw) => (
                                <span
                                  key={fw}
                                  title={`${fw}: Active statutory compliance obligation for this client`}
                                  className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs"
                                >
                                  {fw}
                                </span>
                              ));
                            })()}
                          </div>
                        </div>
                      ) : isConsultant ? (
                        <div className="space-y-1">
                          {(() => {
                            const consultantGroupIds = user.clientGroupIds?.length
                              ? user.clientGroupIds
                              : Array.from(
                                  new Set(
                                    facilities
                                      .filter((f) => user.authorizedFacilityIds?.includes(f.facilityId))
                                      .map((f) => f.clientGroupId)
                                      .filter(Boolean)
                                  )
                                );
                            const assignedGroups = groups.filter((g) => consultantGroupIds.includes(g._id));
                            return (
                              <>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  {assignedGroups.length} Client Compan{assignedGroups.length === 1 ? 'y' : 'ies'}
                                </span>
                                {assignedGroups.length > 0 ? (
                                  <div className="flex flex-wrap gap-1 max-w-xs">
                                    {assignedGroups.slice(0, 3).map((grp) => (
                                      <span
                                        key={grp._id}
                                        className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                                      >
                                        {grp.name}
                                      </span>
                                    ))}
                                    {assignedGroups.length > 3 && (
                                      <span className="text-[9px] text-slate-400">
                                        +{assignedGroups.length - 3} more
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-slate-400">
                                    {user.authorizedFacilityIds?.length || 0} unit(s) linked
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      ) : (
                        <span className="text-slate-500">All System Facilities</span>
                      )}
                    </td>

                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          (user.status || 'ACTIVE') === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            (user.status || 'ACTIVE') === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                        {user.status || 'ACTIVE'}
                      </span>
                    </td>

                    <td className="p-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setResetPasswordUser(user);
                            setNewTempPassword('');
                          }}
                          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-[11px] font-medium transition cursor-pointer"
                        >
                          Reset Password
                        </button>


                        {isConsultant && (
                          <button
                            type="button"
                            onClick={() => {
                              const consultantGroupIds = user.clientGroupIds?.length
                                ? user.clientGroupIds
                                : Array.from(
                                    new Set(
                                      facilities
                                        .filter((f) => user.authorizedFacilityIds?.includes(f.facilityId))
                                        .map((f) => f.clientGroupId)
                                        .filter(Boolean)
                                    )
                                  );
                              setEditFacilityUser(user);
                              setEditingClientGroupIds(consultantGroupIds as string[]);
                            }}
                            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-[11px] font-medium transition cursor-pointer"
                          >
                            Clients
                          </button>
                        )}

                        {user._id !== currentUser?._id && (
                          <button
                            type="button"
                            onClick={() =>
                              changeStatus(
                                user,
                                (user.status || 'ACTIVE') === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
                              )
                            }
                            className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition cursor-pointer ${
                              (user.status || 'ACTIVE') === 'ACTIVE'
                                ? 'border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-900/60 dark:text-amber-400 dark:hover:bg-amber-950/50'
                                : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/60 dark:text-emerald-400 dark:hover:bg-emerald-950/50'
                            }`}
                          >
                            {(user.status || 'ACTIVE') === 'ACTIVE' ? 'Disable' : 'Enable'}
                          </button>
                        )}

                        {user._id !== currentUser?._id && (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmUser(user)}
                            className="rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/50 px-2.5 py-1 text-[11px] font-medium transition cursor-pointer"
                            title="Delete User"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal 0: Delete User Confirmation via MUI Dialog */}
      <Dialog
        open={Boolean(deleteConfirmUser)}
        onClose={() => setDeleteConfirmUser(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '16px',
              backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
              color: isDark ? '#FFFFFF' : '#0F172A',
              border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.15)' : '#E2E8F0'}`,
              p: 1,
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 600, color: isDark ? '#FFFFFF' : '#0F172A' }}>
          Delete User Account
        </DialogTitle>
        <DialogContent>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            Are you sure you want to delete <strong>{deleteConfirmUser?.name}</strong> ({deleteConfirmUser?.email})?
          </p>
          <p className="text-xs text-rose-600 dark:text-rose-400 mt-2 font-medium">
            {deleteConfirmUser?.role === 'CLIENT'
              ? 'This action will permanently delete the client user account, their company profile, and associated facility records from Clients & Units.'
              : 'This action will permanently delete the user account and clear all their facility assignment mappings.'}
          </p>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            onClick={() => setDeleteConfirmUser(null)}
            color="inherit"
            disabled={isDeletingUser}
            sx={{ textTransform: 'none', borderRadius: '8px' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteUser}
            variant="contained"
            color="error"
            disabled={isDeletingUser}
            sx={{ textTransform: 'none', borderRadius: '8px', fontWeight: 600 }}
          >
            {isDeletingUser ? 'Deleting...' : 'Delete User'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal 1: Edit Consultant Facility Assignments via MUI Dialog */}
      <Dialog
        open={Boolean(editFacilityUser)}
        onClose={() => setEditFacilityUser(null)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '16px',
              backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
              color: isDark ? '#FFFFFF' : '#0F172A',
              border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.15)' : '#E2E8F0'}`,
              p: 1,
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '16px' }}>
          Assign Client Companies for {editFacilityUser?.name}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Select the client companies this consultant is responsible for. All operating facilities under these clients are automatically assigned to this consultant.
          </p>
          <Autocomplete
            multiple
            options={groups}
            getOptionLabel={(option) => `${option.name} (${option.industry || 'Client Company'})`}
            value={groups.filter((g) => editingClientGroupIds.includes(g._id))}
            slotProps={getMuiAutocompleteSlotProps(isDark)}
            onChange={(_, newValue) => {
              setEditingClientGroupIds(newValue.map((g) => g._id));
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                fullWidth
                label="Assigned Client Companies *"
                placeholder="Select client companies..."
                sx={getMuiMultipleAutocompleteSx(isDark)}
              />
            )}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <button
            type="button"
            onClick={() => setEditFacilityUser(null)}
            className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={editingBusy}
            onClick={saveClientAssignments}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition disabled:opacity-50 cursor-pointer"
          >
            {editingBusy ? 'Saving...' : 'Save Assignments'}
          </button>
        </DialogActions>
      </Dialog>

      {/* Modal 2: Reset Temporary Password via MUI Dialog */}
      <Dialog
        open={Boolean(resetPasswordUser)}
        onClose={() => setResetPasswordUser(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '16px',
              backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
              color: isDark ? '#FFFFFF' : '#0F172A',
              border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.15)' : '#E2E8F0'}`,
              p: 1,
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '16px' }}>
          Reset Password for {resetPasswordUser?.email}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Enter a temporary password. The user will be required to change it upon signing in.
          </p>
          <TextField
            fullWidth
            type={showResetPassword ? 'text' : 'password'}
            label="New Temporary Password (min. 12 chars)"
            placeholder="Minimum 12 characters"
            value={newTempPassword}
            onChange={(e) => setNewTempPassword(e.target.value)}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowResetPassword(!showResetPassword)}
                      edge="end"
                      size="small"
                      sx={{ color: isDark ? '#94A3B8' : '#64748B' }}
                    >
                      {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
            sx={getMuiInputSx(isDark)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <button
            type="button"
            onClick={() => setResetPasswordUser(null)}
            className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={resetBusy || newTempPassword.length < 12}
            onClick={savePasswordReset}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition disabled:opacity-50 cursor-pointer"
          >
            {resetBusy ? 'Resetting...' : 'Reset Password'}
          </button>
        </DialogActions>
      </Dialog>

      {/* Modal 3: Manage Client Frameworks via MUI Dialog */}
      <Dialog
        open={Boolean(frameworkModalGroup)}
        onClose={() => setFrameworkModalGroup(null)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '16px',
              backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
              color: isDark ? '#FFFFFF' : '#0F172A',
              border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.15)' : '#E2E8F0'}`,
              p: 1,
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '16px' }}>
          Compliance Frameworks for {frameworkModalGroup?.name}
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Admin decision: Enable or disable statutory frameworks for this client organization. Disabled frameworks are automatically marked non-applicable across all facilities of this organization.
          </p>

          <div className="space-y-3">
            {[
              {
                type: 'RCO' as const,
                title: 'RCO / RPO (Renewable Consumption Obligation)',
                desc: 'Mandatory renewable electricity purchase & consumption targets under Ministry of Power regulations.',
              },
              {
                type: 'PAT' as const,
                title: 'PAT Scheme (Perform, Achieve and Trade)',
                desc: 'Bureau of Energy Efficiency (BEE) specific energy consumption targets, M&V audit cycles, and ESCerts.',
              },
              {
                type: 'CCTS' as const,
                title: 'CCTS (Carbon Credit Trading Scheme)',
                desc: 'National carbon market framework, GHG emission intensity targets, and Carbon Credit Certificates (CCCs).',
              },
            ].map((fw) => {
              const isEnabled = modalFrameworks.includes(fw.type);
              return (
                <div
                  key={fw.type}
                  onClick={() => {
                    const next = isEnabled
                      ? modalFrameworks.filter((f) => f !== fw.type)
                      : [...modalFrameworks, fw.type];
                    if (next.length === 0) {
                      notify.warning('At least one statutory framework must remain active.');
                      return;
                    }
                    setModalFrameworks(next);
                  }}
                  className={`flex items-start justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isEnabled
                      ? 'border-emerald-500 bg-emerald-50/40 dark:border-emerald-600 dark:bg-emerald-950/30'
                      : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{fw.title}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded transition-colors ${
                          isEnabled
                            ? 'framework-badge-enabled !bg-emerald-600 !text-white'
                            : '!bg-slate-200 dark:!bg-slate-800 text-slate-500'
                        }`}
                        style={
                          isEnabled
                            ? { color: '#FFFFFF', backgroundColor: '#059669' }
                            : undefined
                        }
                      >
                        {isEnabled ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{fw.desc}</p>
                  </div>

                  <div className="shrink-0 pt-0.5">
                    <div
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                        isEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-transform ${
                          isEnabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <button
            type="button"
            onClick={() => setFrameworkModalGroup(null)}
            className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={frameworkSaving}
            onClick={async () => {
              if (!frameworkModalGroup) return;
              setFrameworkSaving(true);
              try {
                const res = await fetch(`/api/client-groups/${frameworkModalGroup._id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ enabledFrameworks: modalFrameworks }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to update frameworks.');
                notify.success(`Frameworks updated for ${frameworkModalGroup.name}`);
                setFrameworkModalGroup(null);
                await load();
              } catch (err) {
                notify.error(err instanceof Error ? err.message : 'Failed to update frameworks.');
              } finally {
                setFrameworkSaving(false);
              }
            }}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition disabled:opacity-50 cursor-pointer"
          >
            {frameworkSaving ? 'Saving...' : 'Save Frameworks'}
          </button>
        </DialogActions>
      </Dialog>
    </main>
  );
}
