import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Menu, X, LogOut, Settings, LayoutDashboard } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { useActiveBusiness } from '@/hooks/useActiveBusiness';
import { signOut } from '@/services/auth';

export function AppLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { activeBusiness, businesses, setActiveBusinessId } = useActiveBusiness();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/dashboard')} className="flex items-center" aria-label="Biashivo home">
              <Logo size="sm" />
            </button>
            {businesses.length > 1 && (
              <select
                value={activeBusiness?.id ?? ''}
                onChange={(e) => setActiveBusinessId(e.target.value || null)}
                className="hidden h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-200 sm:block"
                aria-label="Switch business"
              >
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}
          </div>

          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <button
                key={link.to}
                onClick={() => navigate(link.to)}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </button>
            ))}
            <div className="mx-2 h-6 w-px bg-slate-200" />
            <span className="text-sm text-slate-500">{user?.email}</span>
            <Button variant="ghost" size="sm" icon={<LogOut className="h-4 w-4" />} onClick={handleSignOut}>
              Sign out
            </Button>
          </div>

          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 md:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
            {businesses.length > 1 && (
              <select
                value={activeBusiness?.id ?? ''}
                onChange={(e) => setActiveBusinessId(e.target.value || null)}
                className="mb-3 h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-700"
                aria-label="Switch business"
              >
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}
            {navLinks.map((link) => (
              <button
                key={link.to}
                onClick={() => { navigate(link.to); setMenuOpen(false); }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </button>
            ))}
            <div className="my-2 h-px bg-slate-100" />
            <p className="px-3 py-1 text-xs text-slate-400">{user?.email}</p>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
