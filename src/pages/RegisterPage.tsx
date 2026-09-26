import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User as UserIcon, Building2, ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { CenteredCard } from '@/components/ui/Feedback';
import { signUpWithEmail } from '@/services/auth';
import {
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  validateRequiredString,
  validateBusinessType,
  BUSINESS_TYPE_OPTIONS,
} from '@/lib/validation';

export function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [errors, setErrors] = useState<Record<string, string | null | undefined>>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string | null | undefined> = {
      fullName: validateRequiredString(fullName, 'Full name'),
      email: validateEmail(email),
      password: validatePassword(password),
      confirm: validatePasswordMatch(password, confirm),
      businessName: validateRequiredString(businessName, 'Business name'),
      businessType: validateBusinessType(businessType),
    };
    setErrors(newErrors);
    if (Object.values(newErrors).some(Boolean)) return;

    setLoading(true);
    try {
      await signUpWithEmail({ fullName: fullName.trim(), email, password });
      navigate('/onboarding', { replace: true });
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'We couldn’t create your account. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <CenteredCard>
      <div className="mb-6 flex flex-col items-center text-center">
        <Logo size="md" />
        <h1 className="mt-6 text-2xl font-bold text-slate-900">Create your account</h1>
        <p className="mt-1 text-sm text-slate-500">Start managing your business in minutes.</p>
      </div>

      {errors.form && <Alert variant="error" className="mb-4">{errors.form}</Alert>}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Full name"
          name="fullName"
          autoComplete="name"
          placeholder="Jane Doe"
          icon={<UserIcon className="h-4 w-4" />}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          error={errors.fullName}
          required
        />
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          icon={<Mail className="h-4 w-4" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          required
        />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          icon={<Lock className="h-4 w-4" />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          required
        />
        <Input
          label="Confirm password"
          name="confirm"
          type="password"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          icon={<Lock className="h-4 w-4" />}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirm}
          required
        />
        <Input
          label="Business name"
          name="businessName"
          placeholder="e.g. Jane’s Bakery"
          icon={<Building2 className="h-4 w-4" />}
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          error={errors.businessName}
          required
        />
        <Select
          label="Business type"
          name="businessType"
          placeholder="Choose a type"
          value={businessType}
          onChange={(e) => setBusinessType(e.target.value)}
          error={errors.businessType}
          options={BUSINESS_TYPE_OPTIONS.map((t) => ({ value: t, label: t }))}
        />
        <Button type="submit" fullWidth loading={loading}>Create account</Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-emerald-600 hover:text-emerald-700">Sign in</Link>
      </p>

      <div className="mt-6 text-center">
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600">
          <ArrowLeft className="h-3 w-3" /> Back to home
        </Link>
      </div>
    </CenteredCard>
  );
}
