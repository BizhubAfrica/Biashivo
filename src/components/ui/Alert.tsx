import type { ReactNode } from 'react';

type Variant = 'info' | 'success' | 'warning' | 'error';

const variantClasses: Record<Variant, string> = {
  info: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  success: 'bg-green-50 border-green-200 text-green-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  error: 'bg-red-50 border-red-200 text-red-800',
};

export function Alert({
  variant = 'info',
  children,
  className = '',
}: {
  variant?: Variant;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={[variantClasses[variant], 'rounded-lg border px-4 py-3 text-sm', className].join(' ')}
    >
      {children}
    </div>
  );
}
