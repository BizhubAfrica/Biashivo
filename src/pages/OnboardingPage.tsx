import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { FullPageLoader } from '@/components/ui/Feedback';
import { useAuth } from '@/hooks/useAuth';
import { useActiveBusiness } from '@/hooks/useActiveBusiness';
import { onboardBusiness } from '@/services/business';
import { writeAuditLog } from '@/services/audit';
import {
  BUSINESS_TYPE_OPTIONS,
  CURRENCY_OPTIONS,
  validateRequiredString,
  validateBusinessType,
  validateCurrency,
  validatePhone,
} from '@/lib/validation';

const STEPS = ['Welcome', 'Business name', 'Business type', 'Currency', 'Business phone', 'Complete'] as const;

export function OnboardingPage() {
  const { user, loading: authLoading } = useAuth();
  const { refresh } = useActiveBusiness();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [currency, setCurrency] = useState('KES');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<Record<string, string | null | undefined>>({});
  const [submitting, setSubmitting] = useState(false);

  if (authLoading) return <FullPageLoader label="Preparing your setup…" />;

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const validateStep = (s: number): boolean => {
    const errs: Record<string, string | null | undefined> = {};
    if (s === 1) errs.name = validateRequiredString(name, 'Business name');
    if (s === 2) errs.type = validateBusinessType(type);
    if (s === 3) errs.currency = validateCurrency(currency);
    if (s === 4) errs.phone = validatePhone(phone);
    setErrors(errs);
    return !Object.values(errs).some(Boolean);
  };

  const handleNext = () => {
    if (validateStep(step)) next();
  };

  const handleFinish = async () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3) || !validateStep(4)) return;
    setSubmitting(true);
    setErrors({});
    try {
      const businessId = await onboardBusiness({
        name: name.trim(),
        business_type: type as typeof BUSINESS_TYPE_OPTIONS[number] | null,
        currency,
        country: 'KE',
        phone: phone.trim() || null,
      });
      await writeAuditLog(businessId, 'onboarding.completed', {
        entityType: 'business',
        entityId: businessId,
        metadata: { name, business_type: type, currency },
      });
      await refresh();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'We couldn’t finish setup. Please try again.' });
      setStep(1);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-5">
        <Logo size="sm" />
        <p className="text-sm text-slate-400">{user?.email}</p>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((label, i) => (
              <div key={label} className="flex flex-1 items-center">
                <div
                  className={[
                    'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors',
                    i < step ? 'bg-emerald-600 text-white' : i === step ? 'bg-emerald-600 text-white ring-4 ring-emerald-100' : 'bg-slate-200 text-slate-500',
                  ].join(' ')}
                  aria-current={i === step ? 'step' : undefined}
                >
                  {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={['h-0.5 flex-1 mx-1', i < step ? 'bg-emerald-600' : 'bg-slate-200'].join(' ')} />
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-sm font-medium text-slate-600">
            Step {step + 1} of {STEPS.length}: {STEPS[step]}
          </p>
        </div>

        {errors.form && <Alert variant="error" className="mb-4">{errors.form}</Alert>}

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {step === 0 && (
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-50">
                <Building2 className="h-7 w-7 text-emerald-600" />
              </div>
              <h1 className="mt-4 text-2xl font-bold text-slate-900">Welcome to Biashivo</h1>
              <p className="mt-2 text-sm text-slate-500">
                Let’s set up your business. This takes less than a minute.
              </p>
              <Button className="mt-6" size="lg" onClick={next} icon={<ArrowRight className="h-5 w-5" />}>
                Let’s go
              </Button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">What’s your business called?</h2>
              <Input
                label="Business name"
                name="name"
                placeholder="e.g. Jane’s Bakery"
                icon={<Building2 className="h-4 w-4" />}
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={errors.name}
                autoFocus
                required
              />
              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={back} icon={<ArrowLeft className="h-4 w-4" />}>Back</Button>
                <Button onClick={handleNext}>Continue</Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">What kind of business is it?</h2>
              <Select
                label="Business type"
                name="type"
                placeholder="Choose a type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                error={errors.type}
                options={BUSINESS_TYPE_OPTIONS.map((t) => ({ value: t, label: t }))}
              />
              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={back} icon={<ArrowLeft className="h-4 w-4" />}>Back</Button>
                <Button onClick={handleNext}>Continue</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Choose your currency</h2>
              <Select
                label="Currency"
                name="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                error={errors.currency}
                options={CURRENCY_OPTIONS.map((c) => ({ value: c, label: c }))}
              />
              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={back} icon={<ArrowLeft className="h-4 w-4" />}>Back</Button>
                <Button onClick={handleNext}>Continue</Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Business phone (optional)</h2>
              <Input
                label="Phone"
                name="phone"
                type="tel"
                placeholder="+254 712 345 678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                error={errors.phone}
                hint="You can skip this and add it later in Settings."
              />
              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={back} icon={<ArrowLeft className="h-4 w-4" />}>Back</Button>
                <Button onClick={handleNext}>Continue</Button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                <Check className="h-7 w-7 text-emerald-600" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-slate-900">Ready to set up your business</h2>
              <p className="mt-2 text-sm text-slate-500">Review your details and complete setup.</p>
              <dl className="mx-auto mt-5 max-w-sm space-y-2 text-left text-sm">
                <div className="flex justify-between"><dt className="text-slate-500">Name</dt><dd className="font-medium text-slate-900">{name}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Type</dt><dd className="font-medium text-slate-900">{type}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Currency</dt><dd className="font-medium text-slate-900">{currency}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Phone</dt><dd className="font-medium text-slate-900">{phone || '—'}</dd></div>
              </dl>
              <div className="mt-6 flex justify-between">
                <Button variant="ghost" onClick={back} icon={<ArrowLeft className="h-4 w-4" />}>Back</Button>
                <Button onClick={handleFinish} loading={submitting}>Complete setup</Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
