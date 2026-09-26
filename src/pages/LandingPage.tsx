import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Users, TrendingUp, Smartphone } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5">
        <Logo size="md" />
        <div className="flex items-center gap-2">
          <Link to="/login" className="hidden sm:block">
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
          <Link to="/register">
            <Button size="sm" icon={<ArrowRight className="h-4 w-4" />}>Get started</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-4 py-12 text-center sm:py-20">
        <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
          Built for African SMEs
        </span>
        <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Run and grow your business with confidence.
        </h1>
        <p className="mt-4 max-w-xl text-base text-slate-600 sm:text-lg">
          Biashivo brings your sales, expenses, payments, and insights together in one
          secure, mobile-first platform — designed for the way African businesses work.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Link to="/register">
            <Button size="lg" icon={<ArrowRight className="h-5 w-5" />}>Create your free account</Button>
          </Link>
          <Link to="/login">
            <Button variant="secondary" size="lg">I already have an account</Button>
          </Link>
        </div>

        <div className="mt-16 grid w-full gap-6 text-left sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Smartphone, title: 'Mobile-first', text: 'Designed for phones first, works beautifully on desktop.' },
            { icon: ShieldCheck, title: 'Secure by default', text: 'Row-level security keeps every business’s data private.' },
            { icon: Users, title: 'Multi-tenant', text: 'Invite your team and manage roles as you grow.' },
            { icon: TrendingUp, title: 'Built to scale', text: 'A foundation ready for the tools you’ll need next.' },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <f.icon className="h-6 w-6 text-emerald-600" />
              <h3 className="mt-3 text-sm font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{f.text}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-slate-100 py-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Biashivo. All rights reserved.
      </footer>
    </div>
  );
}
