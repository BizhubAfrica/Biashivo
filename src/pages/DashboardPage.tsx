import { useEffect, useState } from 'react';
import { Check, Circle, Lock } from 'lucide-react';
import { AppLayout } from '@/layouts/AppLayout';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Feedback';
import { useAuth } from '@/hooks/useAuth';
import { useActiveBusiness } from '@/hooks/useActiveBusiness';
import { fetchProfile } from '@/services/users';
import { fetchBusinessMembers } from '@/services/business';
import type { Profile } from '@/types';

interface SetupStep {
  label: string;
  done?: boolean;
  coming?: boolean;
}

export function DashboardPage() {
  const { user } = useAuth();
  const { activeBusiness, loading } = useActiveBusiness();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!activeBusiness) return;
    setProfileLoading(true);
    Promise.all([
      fetchProfile().catch(() => null),
      fetchBusinessMembers(activeBusiness.id).catch(() => []),
    ]).then(([p, members]) => {
      setProfile(p);
      setMemberCount(members.length);
    }).finally(() => setProfileLoading(false));
  }, [activeBusiness]);

  if (loading || !activeBusiness) {
    return (
      <AppLayout>
        <div className="flex items-center gap-3 text-slate-500">
          <Spinner /> Loading your dashboard…
        </div>
      </AppLayout>
    );
  }

  const steps: SetupStep[] = [
    { label: 'Business profile', done: true },
    { label: 'Account security', done: Boolean(user) },
    { label: 'Team setup', done: memberCount > 1 },
    { label: 'Products', coming: true, done: false },
    { label: 'Customers', coming: true, done: false },
    { label: 'Sales', coming: true, done: false },
  ];

  const firstName = profile?.full_name?.split(' ')[0] || 'there';

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome to Biashivo, {firstName}.</h1>
          <p className="mt-1 text-sm text-slate-500">
            Here’s a snapshot of your business and what’s coming next.
          </p>
        </div>

        <Card>
          <CardHeader title="Business" subtitle="Your business overview" />
          <CardBody>
            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Business name</dt>
                <dd className="mt-1 text-sm font-medium text-slate-900">{activeBusiness.name}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Business type</dt>
                <dd className="mt-1 text-sm font-medium text-slate-900">{activeBusiness.business_type ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Currency</dt>
                <dd className="mt-1 text-sm font-medium text-slate-900">{activeBusiness.currency}</dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Setup progress" subtitle="Complete these steps to get the most out of Biashivo" />
          <CardBody>
            {profileLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500"><Spinner className="h-4 w-4" /> Loading…</div>
            ) : (
              <ul className="space-y-3">
                {steps.map((s) => (
                  <li key={s.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {s.coming ? (
                        <Lock className="h-4 w-4 text-slate-300" />
                      ) : s.done ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Circle className="h-4 w-4 text-slate-300" />
                      )}
                      <span className={s.coming ? 'text-sm text-slate-400' : 'text-sm text-slate-700'}>
                        {s.label}
                      </span>
                    </div>
                    {s.coming && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                        Coming in the next phase
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="What’s next" subtitle="Features we’re building for future phases" />
          <CardBody>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {['Sales', 'Orders', 'Customers', 'Products', 'Expenses', 'Payments', 'Business Health', 'Business Brain'].map((f) => (
                <div key={f} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-3 text-center">
                  <p className="text-sm font-medium text-slate-600">{f}</p>
                  <p className="mt-0.5 text-xs text-slate-400">Coming Soon</p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  );
}
