import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { CenteredCard } from '@/components/ui/Feedback';
import { signInWithEmail } from '@/services/auth';
import { validateEmail, validatePassword } from '@/lib/validation';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string | null; password?: string | null; form?: string | null }>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);
    setErrors({ email: emailErr, password: passwordErr });
    if (emailErr || passwordErr) return;

    setLoading(true);
    try {
      await signInWithEmail({ email, password });
      const dest = (location.state as { from?: string } | null)?.from ?? '/dashboard';
      navigate(dest, { replace: true });
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'We couldn’t sign you in. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <CenteredCard>
      <div className="mb-6 flex flex-col items-center text-center">
        <Logo size="md" />
        <h1 className="mt-6 text-2xl font-bold text-slate-900">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-500">Sign in to your Biashivo account.</p>
      </div>

      {errors.form && <Alert variant="error" className="mb-4">{errors.form}</Alert>}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
          autoComplete="current-password"
          placeholder="••••••••"
          icon={<Lock className="h-4 w-4" />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          required
        />
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" fullWidth loading={loading}>Sign in</Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Don’t have an account?{' '}
        <Link to="/register" className="font-medium text-emerald-600 hover:text-emerald-700">Create one</Link>
      </p>

      <div className="mt-6 text-center">
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600">
          <ArrowLeft className="h-3 w-3" /> Back to home
        </Link>
      </div>
    </CenteredCard>
  );
}
