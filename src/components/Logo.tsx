import { Store } from 'lucide-react';

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dims = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-12 w-12' }[size];
  const text = { sm: 'text-lg', md: 'text-xl', lg: 'text-2xl' }[size];
  return (
    <div className="flex items-center gap-2.5">
      <div className={[dims, 'flex items-center justify-center rounded-xl bg-emerald-600 text-white'].join(' ')}>
        <Store className="h-1/2 w-1/2" aria-hidden="true" />
      </div>
      <span className={[text, 'font-bold tracking-tight text-slate-900'].join(' ')}>Biashivo</span>
    </div>
  );
}
