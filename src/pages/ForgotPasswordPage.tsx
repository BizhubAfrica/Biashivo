import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { CenteredCard } from '@/components/ui/Feedback';
import { requestPasswordReset } from '@/services/auth';
import { validateEmail } from '@/lib/validation';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailErr = validateEmail(email);
    setError(emailErr);
    if (emailErr) return;

    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'We couldn’t send the reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <CenteredCard>
      <div className="mb-6 flex flex-col items-center text-center">
        <Logo size="md" />
        <h1 className="mt-6 text-2xl font-bold text-slate-900">Reset your password</h1>
        <p className="mt-1 text-sm text-slate-500">We’ll email you a secure link to set a new password.</p>
      </div>

      {sent ? (
        <Alert variant="success">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>If an account exists for {email}, a reset link is on its way. Check your inbox and spam folder.</span>
          </div>
        </Alert>
      ) : (
        <>
          {error && <Alert variant="error" className="mb-4">{error}</Alert>}
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
              error={error}
              required
            />
            <Button type="submit" fullWidth loading={loading}>Send reset link</Button>
          </form>
        </>
      )}

      <div className="mt-6 text-center">
        <Link to="/login" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
        </Link>
      </div>
    </CenteredCard>
  );
}
