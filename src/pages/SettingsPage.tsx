import { useEffect, useState } from 'react';
import { Save, Plus, Trash2, ShieldCheck, Plug } from 'lucide-react';
import { updatePassword } from '@/services/auth';
import { validatePassword, validatePasswordMatch } from '@/lib/validation';
import { AppLayout } from '@/layouts/AppLayout';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Feedback';
import { useAuth } from '@/hooks/useAuth';
import { useActiveBusiness } from '@/hooks/useActiveBusiness';
import {
  updateBusiness,
  fetchBusinessMembers,
  addBusinessMember,
  removeMember,
  currentUserBusinessRole,
} from '@/services/business';
import { fetchProfile, updateProfile } from '@/services/users';
import { writeAuditLog } from '@/services/audit';
import {
  BUSINESS_TYPE_OPTIONS,
  CURRENCY_OPTIONS,
  SUPPORTED_COUNTRIES,
  validateRequiredString,
  validatePhone,
  validateEmail,
} from '@/lib/validation';
import type { Business, BusinessMemberWithProfile, Profile, BusinessRole } from '@/types';

type Tab = 'business' | 'account' | 'security' | 'team' | 'integrations';

const TABS: { id: Tab; label: string }[] = [
  { id: 'business', label: 'Business Profile' },
  { id: 'account', label: 'Account' },
  { id: 'security', label: 'Security' },
  { id: 'team', label: 'Team' },
  { id: 'integrations', label: 'Integrations' },
];

export function SettingsPage() {
  const { user } = useAuth();
  const { activeBusiness, loading: bizLoading, refresh } = useActiveBusiness();
  const [tab, setTab] = useState<Tab>('business');
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    if (!activeBusiness) return;
    currentUserBusinessRole(activeBusiness.id).then(setRole).catch(() => setRole(null));
  }, [activeBusiness]);

  const isOwner = role === 'BUSINESS_OWNER';

  if (bizLoading || !activeBusiness) {
    return (
      <AppLayout>
        <div className="flex items-center gap-3 text-slate-500"><Spinner /> Loading settings…</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your business, account, and team.</p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={[
                'whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
                tab === t.id ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700',
              ].join(' ')}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'business' && <BusinessTab business={activeBusiness} canEdit={isOwner} onSaved={refresh} />}
        {tab === 'account' && <AccountTab userId={user?.id ?? ''} />}
        {tab === 'security' && <SecurityTab email={user?.email ?? ''} />}
        {tab === 'team' && <TeamTab businessId={activeBusiness.id} canManage={isOwner} />}
        {tab === 'integrations' && <IntegrationsTab />}
      </div>
    </AppLayout>
  );
}

// ---- Business Profile ----
function BusinessTab({ business, canEdit, onSaved }: { business: Business; canEdit: boolean; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState({
    name: business.name,
    business_type: business.business_type ?? '',
    phone: business.phone ?? '',
    email: business.email ?? '',
    address: business.address ?? '',
    country: business.country,
    currency: business.currency,
    tax_pin: business.tax_pin ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string | null | undefined>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string | null | undefined> = {
      name: validateRequiredString(form.name, 'Business name'),
      phone: validatePhone(form.phone),
      email: form.email ? validateEmail(form.email) : null,
    };
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;

    setSaving(true);
    setMessage(null);
    try {
      await updateBusiness(business.id, {
        name: form.name.trim(),
        business_type: form.business_type || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        country: form.country,
        currency: form.currency,
        tax_pin: form.tax_pin.trim() || null,
      });
      await writeAuditLog(business.id, 'business.settings_updated', { entityType: 'business', entityId: business.id });
      await onSaved();
      setMessage({ type: 'success', text: 'Business profile saved.' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'We couldn’t save your changes.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {!canEdit && (
        <Alert variant="warning">Only the business owner can edit these settings. You can view them below.</Alert>
      )}
      {message && <Alert variant={message.type === 'success' ? 'success' : 'error'}>{message.text}</Alert>}

      <Card>
        <CardHeader title="Business profile" subtitle="Information about your business" />
        <CardBody className="space-y-4">
          <Input label="Business name" name="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} disabled={!canEdit || saving} required />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Business type" name="business_type" value={form.business_type} onChange={(e) => setForm({ ...form, business_type: e.target.value })} placeholder="Choose a type" options={BUSINESS_TYPE_OPTIONS.map((t) => ({ value: t, label: t }))} disabled={!canEdit || saving} />
            <Select label="Currency" name="currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} options={CURRENCY_OPTIONS.map((c) => ({ value: c, label: c }))} disabled={!canEdit || saving} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Phone" name="phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} error={errors.phone} disabled={!canEdit || saving} />
            <Input label="Email" name="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} disabled={!canEdit || saving} />
          </div>
          <Input label="Address" name="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} disabled={!canEdit || saving} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Country" name="country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} options={SUPPORTED_COUNTRIES.map((c) => ({ value: c, label: c }))} disabled={!canEdit || saving} />
            <Input label="Tax PIN (optional)" name="tax_pin" value={form.tax_pin} onChange={(e) => setForm({ ...form, tax_pin: e.target.value })} disabled={!canEdit || saving} hint="Stored for future use — no tax features yet." />
          </div>
        </CardBody>
      </Card>

      {canEdit && (
        <div className="flex justify-end">
          <Button type="submit" loading={saving} icon={<Save className="h-4 w-4" />}>Save changes</Button>
        </div>
      )}
    </form>
  );
}

// ---- Account ----
function AccountTab({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({ full_name: '', phone: '' });
  const [errors, setErrors] = useState<Record<string, string | null | undefined>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchProfile().then((p) => {
      setProfile(p);
      setForm({ full_name: p?.full_name ?? '', phone: p?.phone ?? '' });
    }).catch(() => null).finally(() => setLoading(false));
  }, [userId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string | null | undefined> = {
      full_name: validateRequiredString(form.full_name, 'Full name'),
      phone: validatePhone(form.phone),
    };
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;

    setSaving(true);
    setMessage(null);
    try {
      await updateProfile({ full_name: form.full_name.trim(), phone: form.phone.trim() || null });
      setMessage({ type: 'success', text: 'Account details saved.' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'We couldn’t save your details.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center gap-2 text-sm text-slate-500"><Spinner className="h-4 w-4" /> Loading…</div>;

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {message && <Alert variant={message.type === 'success' ? 'success' : 'error'}>{message.text}</Alert>}
      <Card>
        <CardHeader title="Account" subtitle="Your personal account details" />
        <CardBody className="space-y-4">
          <Input label="Full name" name="full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} error={errors.full_name} disabled={saving} required />
          <Input label="Phone" name="phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} error={errors.phone} disabled={saving} />
          <Input label="Email" name="email" value={profile?.user_id ? '' : ''} defaultValue="" disabled hint="Email is managed by your sign-in and can’t be changed here." />
        </CardBody>
      </Card>
      <div className="flex justify-end">
        <Button type="submit" loading={saving} icon={<Save className="h-4 w-4" />}>Save details</Button>
      </div>
    </form>
  );
}

// ---- Security ----
function SecurityTab({ email }: { email: string }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string | null; confirm?: string | null; form?: string | null }>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChange = async (e: React.FormEvent) => {
    e.preventDefault();
    const passwordErr = validatePassword(password);
    const confirmErr = validatePasswordMatch(password, confirm);
    setErrors({ password: passwordErr, confirm: confirmErr });
    if (passwordErr || confirmErr) return;

    setSaving(true);
    setMessage(null);
    try {
      await updatePassword(password);
      setMessage({ type: 'success', text: 'Password updated.' });
      setPassword('');
      setConfirm('');
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'We couldn’t change your password.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Session" subtitle="Current sign-in information" />
        <CardBody>
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-sm font-medium text-slate-900">Signed in as {email || 'your account'}</p>
              <p className="text-xs text-slate-500">Your session is kept active on this device.</p>
            </div>
          </div>
        </CardBody>
      </Card>

      <form onSubmit={handleChange} className="space-y-4">
        {errors.form && <Alert variant="error">{errors.form}</Alert>}
        {message && <Alert variant="success">{message.text}</Alert>}
        <Card>
          <CardHeader title="Change password" subtitle="Choose a new password for your account" />
          <CardBody className="space-y-4">
            <Input label="New password" name="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} disabled={saving} required />
            <Input label="Confirm password" name="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} disabled={saving} required />
          </CardBody>
        </Card>
        <div className="flex justify-end">
          <Button type="submit" loading={saving} icon={<Save className="h-4 w-4" />}>Update password</Button>
        </div>
      </form>
    </div>
  );
}

// ---- Team ----
function TeamTab({ businessId, canManage }: { businessId: string; canManage: boolean }) {
  const [members, setMembers] = useState<BusinessMemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newUserId, setNewUserId] = useState('');
  const [newRole, setNewRole] = useState<BusinessRole>('BUSINESS_STAFF');
  const [actionError, setActionError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  const load = () => {
    setLoading(true);
    fetchBusinessMembers(businessId)
      .then(setMembers)
      .catch((err) => setError(err instanceof Error ? err.message : 'We couldn’t load the team.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [businessId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserId.trim()) {
      setActionError('Enter a user ID to add a member.');
      return;
    }
    setActing(true);
    setActionError(null);
    try {
      await addBusinessMember(businessId, newUserId.trim(), newRole === 'BUSINESS_OWNER' ? 'BUSINESS_OWNER' : 'BUSINESS_STAFF');
      setNewUserId('');
      load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'We couldn’t add that member.');
    } finally {
      setActing(false);
    }
  };

  const handleRemove = async (memberId: string) => {
    setActing(true);
    setActionError(null);
    try {
      await removeMember(memberId);
      load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'We couldn’t remove that member.');
    } finally {
      setActing(false);
    }
  };

  if (loading) return <div className="flex items-center gap-2 text-sm text-slate-500"><Spinner className="h-4 w-4" /> Loading team…</div>;
  if (error) return <Alert variant="error">{error}</Alert>;

  return (
    <div className="space-y-4">
      {actionError && <Alert variant="error">{actionError}</Alert>}

      <Card>
        <CardHeader title="Team members" subtitle="People with access to this business" />
        <CardBody>
          {members.length === 0 ? (
            <p className="text-sm text-slate-500">No active members yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {members.map((m) => (
                <li key={m.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{m.profile?.full_name || 'Team member'}</p>
                    <p className="text-xs text-slate-500">
                      <span className={`mr-2 rounded-full px-2 py-0.5 text-xs font-medium ${m.role === 'BUSINESS_OWNER' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {m.role.replace('BUSINESS_', '').toLowerCase()}
                      </span>
                      {m.profile?.phone || ''}
                    </p>
                  </div>
                  {canManage && m.role !== 'BUSINESS_OWNER' && (
                    <Button variant="ghost" size="sm" icon={<Trash2 className="h-4 w-4" />} onClick={() => handleRemove(m.id)} disabled={acting}>
                      Remove
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {canManage && (
        <Card>
          <CardHeader title="Add a member" subtitle="Add an existing Biashivo user by their user ID" />
          <CardBody>
            <form onSubmit={handleAdd} className="space-y-4">
              <Input label="User ID" name="newUserId" placeholder="UUID of the user to add" value={newUserId} onChange={(e) => setNewUserId(e.target.value)} disabled={acting} />
              <Select label="Role" name="newRole" value={newRole} onChange={(e) => setNewRole(e.target.value as BusinessRole)} options={[{ value: 'BUSINESS_STAFF', label: 'Staff' }, { value: 'BUSINESS_OWNER', label: 'Owner' }]} disabled={acting} />
              <div className="flex justify-end">
                <Button type="submit" loading={acting} icon={<Plus className="h-4 w-4" />}>Add member</Button>
              </div>
            </form>
            <p className="mt-3 text-xs text-slate-400">Team invitations by email are coming in a future phase.</p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

// ---- Integrations ----
function IntegrationsTab() {
  const integrations = [
    { name: 'M-Pesa', desc: 'Accept mobile money payments' },
    { name: 'WhatsApp', desc: 'Send receipts and updates to customers' },
    { name: 'eTIMS', desc: 'KRA tax reporting' },
  ];
  return (
    <Card>
      <CardHeader title="Integrations" subtitle="Connect Biashivo with the tools you use" />
      <CardBody>
        <div className="space-y-3">
          {integrations.map((i) => (
            <div key={i.name} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <Plug className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="text-sm font-medium text-slate-800">{i.name}</p>
                  <p className="text-xs text-slate-500">{i.desc}</p>
                </div>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">Coming Soon</span>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
