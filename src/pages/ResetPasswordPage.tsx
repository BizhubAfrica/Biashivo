import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { CenteredCard } from '@/components/ui/Feedback';
import { updatePassword } from '@/services/auth';
import { validatePassword, validatePasswordMatch } from '@/lib/validation';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string | null; confirm?: string | null; form?: string | null }>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const passwordErr = validatePassword(password);
    const confirmErr = validatePasswordMatch(password, confirm);
    setErrors({ password: passwordErr, confirm: confirmErr });
    if (passwordErr || confirmErr) return;

    setLoading(true);
    try {
      await updatePassword(password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'We couldn’t reset your password. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <CenteredCard>
      <div className="mb-6 flex flex-col items-center text-center">
        <Logo size="md" />
        <h1 className="mt-6 text-2xl font-bold text-slate-900">Set a new password</h1>
        <p className="mt-1 text-sm text-slate-500">Choose a strong password for your account.</p>
      </div>

      {errors.form && <Alert variant="error" className="mb-4">{errors.form}</Alert>}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="New password"
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
        <Button type="submit" fullWidth loading={loading}>Update password</Button>
      </form>

      <div className="mt-6 text-center">
        <Link to="/login" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
        </Link>
      </div>
    </CenteredCard>
  );
}
