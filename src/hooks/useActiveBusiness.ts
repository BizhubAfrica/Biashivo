import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { fetchUserBusinesses, hasBusinessAccess } from '@/services/business';
import type { Business } from '@/types';

const ACTIVE_BUSINESS_KEY = 'biashivo.active_business_id';

interface ActiveBusinessValue {
  businesses: Business[];
  activeBusiness: Business | null;
  loading: boolean;
  error: string | null;
  setActiveBusinessId: (id: string | null) => void;
  refresh: () => Promise<void>;
}

function getStoredBusinessId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_BUSINESS_KEY);
  } catch {
    return null;
  }
}

function storeBusinessId(id: string | null): void {
  try {
    if (id) localStorage.setItem(ACTIVE_BUSINESS_KEY, id);
    else localStorage.removeItem(ACTIVE_BUSINESS_KEY);
  } catch {
    /* ignore storage errors */
  }
}

export function useActiveBusiness(): ActiveBusinessValue {
  const { user, loading: authLoading } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setBusinesses([]);
      setActiveId(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await fetchUserBusinesses();
      setBusinesses(list);

      const stored = getStoredBusinessId();
      let chosenId: string | null = null;

      if (stored) {
        const valid = await hasBusinessAccess(stored);
        chosenId = valid ? stored : null;
      }
      if (!chosenId && list.length > 0) {
        chosenId = list[0].id;
      }

      setActiveId(chosenId);
      storeBusinessId(chosenId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'We couldn’t load your business.');
      setBusinesses([]);
      setActiveId(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    void refresh();
  }, [authLoading, refresh]);

  const setActiveBusinessId = useCallback(
    (id: string | null) => {
      setActiveId(id);
      storeBusinessId(id);
    },
    []
  );

  const activeBusiness = useMemo(
    () => businesses.find((b) => b.id === activeId) ?? null,
    [businesses, activeId]
  );

  return {
    businesses,
    activeBusiness,
    loading: authLoading || loading,
    error,
    setActiveBusinessId,
    refresh,
  };
}
