import { Link } from 'react-router-dom';
import { MailCheck, ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { CenteredCard } from '@/components/ui/Feedback';
import { useAuth } from '@/hooks/useAuth';

export function VerifyEmailPage() {
  const { user } = useAuth();

  return (
    <CenteredCard>
      <div className="flex flex-col items-center text-center">
        <Logo size="md" />
        <div className="mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
          <MailCheck className="h-7 w-7 text-emerald-600" />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-slate-900">Verify your email</h1>
        <p className="mt-2 max-w-sm text-sm text-slate-500">
          {user?.email
            ? `We sent a verification link to ${user.email}. Click the link in the email to confirm your address.`
            : 'We sent a verification link to your email. Click the link in the email to confirm your address.'}
        </p>
        <p className="mt-1 text-xs text-slate-400">Didn’t get it? Check your spam folder, then try signing in again.</p>

        <div className="mt-6 flex w-full flex-col gap-3">
          <Link to="/login" className="w-full">
            <Button fullWidth>Continue to sign in</Button>
          </Link>
        </div>

        <div className="mt-6">
          <Link to="/" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600">
            <ArrowLeft className="h-3 w-3" /> Back to home
          </Link>
        </div>
      </div>
    </CenteredCard>
  );
}
