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

export async function writeAuditLog(
  businessId: string,
  action: string,
  options?: { entityType?: string; entityId?: string; metadata?: Record<string, unknown> }
): Promise<void> {
  const { error } = await supabase.rpc('write_audit_log', {
    p_business_id: businessId,
    p_action: action,
    p_entity_type: options?.entityType ?? null,
    p_entity_id: options?.entityId ?? null,
    p_metadata: options?.metadata ?? {},
  });
  if (error) throw new Error(friendlyError(error));
}
