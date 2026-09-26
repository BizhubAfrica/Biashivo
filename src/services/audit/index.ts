import { supabase } from '@/lib/supabase/client';
import { friendlyError } from '@/lib/security';
import type { AuditLog } from '@/types';

export async function fetchAuditLogs(businessId: string, limit = 50): Promise<AuditLog[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('id, business_id, user_id, action, entity_type, entity_id, metadata, created_at')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(friendlyError(error));
  return (data as AuditLog[]) ?? [];
}
