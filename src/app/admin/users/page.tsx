'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

type Group = { _id: string; name: string };
type Facility = { facilityId: string; name: string };
type Account = { _id: string; name: string; email: string; role: 'ADMIN'|'CONSULTANT'|'CLIENT'; status?: string; designation?: string; clientGroupId?: string; authorizedFacilityIds?: string[] };

export default function AdminUsersPage() {
  const { currentRole, currentUser } = useAuth();
  const [users, setUsers] = useState<Account[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'CONSULTANT' as Account['role'], designation: '', clientGroupId: '', authorizedFacilityIds: '' });

  async function load() {
    const [u, g, f] = await Promise.all([fetch('/api/admin/users', { cache: 'no-store' }), fetch('/api/client-groups', { cache: 'no-store' }), fetch('/api/facilities', { cache: 'no-store' })]);
    if (u.ok) setUsers((await u.json()).data || []);
    if (g.ok) setGroups((await g.json()).data || []);
    if (f.ok) setFacilities((await f.json()).data || []);
  }
  useEffect(() => { if (currentRole === 'ADMIN') void load(); }, [currentRole]);

  async function createAccount(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const payload: Record<string, unknown> = { ...form };
      if (form.role === 'CONSULTANT') payload.authorizedFacilityIds = form.authorizedFacilityIds.split(',').map((x) => x.trim()).filter(Boolean);
      if (form.role !== 'CLIENT') delete payload.clientGroupId;
      if (form.role !== 'CONSULTANT') delete payload.authorizedFacilityIds;
      const response = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to create account.');
      setMessage(`Created ${data.data.email}. The user must change the temporary password after signing in.`);
      setForm({ name: '', email: '', password: '', role: 'CONSULTANT', designation: '', clientGroupId: '', authorizedFacilityIds: '' });
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to create account.'); }
    finally { setBusy(false); }
  }

  async function editAssignments(user: Account) {
    const value = window.prompt('Enter the consultant facility IDs separated by commas:', (user.authorizedFacilityIds || []).join(', '));
    if (value === null) return;
    const ids = value.split(',').map((x) => x.trim()).filter(Boolean);
    const response = await fetch(`/api/admin/users/${user._id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ authorizedFacilityIds: ids }) });
    const data = await response.json(); setMessage(response.ok ? `Updated facility assignments for ${user.email}.` : data.error || 'Assignment update failed.'); await load();
  }

  async function resetPassword(user: Account) {
    const password = window.prompt(`Set a temporary password for ${user.email} (minimum 12 characters):`);
    if (password === null) return;
    if (password.length < 12) { setMessage('Temporary password must be at least 12 characters.'); return; }
    const response = await fetch(`/api/admin/users/${user._id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
    const data = await response.json(); setMessage(response.ok ? `Password reset for ${user.email}. They must change it at next login.` : data.error || 'Password reset failed.');
  }

  async function changeStatus(user: Account, status: string) {
    const response = await fetch(`/api/admin/users/${user._id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    const data = await response.json(); setMessage(response.ok ? `Updated ${user.email}.` : data.error || 'Update failed.'); await load();
  }

  if (currentRole !== 'ADMIN') return <main className="mx-auto max-w-4xl p-8">You do not have permission to manage accounts.</main>;
  return <main className="mx-auto max-w-7xl space-y-8 p-5 sm:p-8">
    <header><h1 className="text-2xl font-bold">User Management</h1><p className="mt-1 text-sm text-slate-500">Create and manage database-backed administrator, consultant and client accounts.</p></header>
    {message && <div role="status" className="rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-900">{message}</div>}
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-4 text-lg font-semibold">Create account</h2>
      <form onSubmit={createAccount} className="grid gap-4 md:grid-cols-2">
        <label className="text-sm">Full name<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="mt-1 w-full rounded border p-2 text-slate-900" /></label>
        <label className="text-sm">Email<input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className="mt-1 w-full rounded border p-2 text-slate-900" /></label>
        <label className="text-sm">Temporary password (minimum 12 characters)<input required type="password" minLength={12} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} className="mt-1 w-full rounded border p-2 text-slate-900" /></label>
        <label className="text-sm">Role<select value={form.role} onChange={e=>setForm({...form,role:e.target.value as Account['role']})} className="mt-1 w-full rounded border p-2 text-slate-900"><option value="CONSULTANT">Consultant</option><option value="CLIENT">Client</option></select></label>
        <label className="text-sm">Designation<input value={form.designation} onChange={e=>setForm({...form,designation:e.target.value})} className="mt-1 w-full rounded border p-2 text-slate-900" /></label>
        {form.role === 'CLIENT' && <label className="text-sm">Company group<select required value={form.clientGroupId} onChange={e=>setForm({...form,clientGroupId:e.target.value})} className="mt-1 w-full rounded border p-2 text-slate-900"><option value="">Select company</option>{groups.map(g=><option key={g._id} value={g._id}>{g.name}</option>)}</select></label>}
        {form.role === 'CONSULTANT' && <label className="text-sm md:col-span-2">Assigned facility IDs (comma-separated)<textarea required value={form.authorizedFacilityIds} onChange={e=>setForm({...form,authorizedFacilityIds:e.target.value})} placeholder="TRIDENT_PAPER, TRIDENT_YARN" className="mt-1 min-h-20 w-full rounded border p-2 font-mono text-slate-900" /><span className="mt-1 block text-xs text-slate-500">Available: {facilities.map(f=>f.facilityId).join(', ')}</span></label>}
        <div className="md:col-span-2"><button disabled={busy} className="rounded-lg bg-emerald-700 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Creating...' : 'Create account'}</button></div>
      </form>
    </section>
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-200 p-5 dark:border-slate-800"><h2 className="text-lg font-semibold">Existing accounts ({users.length})</h2></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-950"><tr><th className="p-3">User</th><th className="p-3">Role</th><th className="p-3">Facilities</th><th className="p-3">Status</th><th className="p-3">Action</th></tr></thead><tbody>{users.map(user=><tr key={user._id} className="border-t border-slate-100 dark:border-slate-800"><td className="p-3"><div className="font-medium">{user.name}</div><div className="text-xs text-slate-500">{user.email}</div></td><td className="p-3">{user.role}</td><td className="p-3">{user.role === 'ADMIN' ? 'All' : user.authorizedFacilityIds?.length || 0}</td><td className="p-3">{user.status || 'ACTIVE'}</td><td className="p-3"><div className="flex gap-2"><button onClick={()=>resetPassword(user)} className="rounded border px-3 py-1 text-xs">Reset password</button>{user.role === 'CONSULTANT' && <button onClick={()=>editAssignments(user)} className="rounded border px-3 py-1 text-xs">Facilities</button>}{user._id !== currentUser?._id && <button onClick={()=>changeStatus(user,(user.status || 'ACTIVE') === 'ACTIVE' ? 'DISABLED' : 'ACTIVE')} className="rounded border px-3 py-1 text-xs">{(user.status || 'ACTIVE') === 'ACTIVE' ? 'Disable' : 'Enable'}</button>}</div></td></tr>)}</tbody></table></div>
    </section>
  </main>;
}
