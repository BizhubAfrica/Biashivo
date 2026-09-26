import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useActiveBusiness } from '@/hooks/useActiveBusiness';
import { FullPageLoader } from '@/components/ui/Feedback';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageLoader label="Checking your session…" />;
  if (!session) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <>{children}</>;
}

export function RequireOnboarding({ children }: { children: ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const { businesses, loading: bizLoading } = useActiveBusiness();
  const location = useLocation();

  if (authLoading || bizLoading) return <FullPageLoader label="Loading your workspace…" />;
  if (!session) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (businesses.length === 0) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}


