import type { ReactNode } from 'react';

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      className={[
        'inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent text-emerald-600',
        className,
      ].join(' ')}
      aria-hidden="true"
    />
  );
}

export function FullPageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50">
      <Spinner className="h-8 w-8" />
      <p className="mt-3 text-sm text-slate-500">{label}</p>
    </div>
  );
}

export function CenteredCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
