import { supabase } from '@/lib/supabase/client';
import { friendlyError } from '@/lib/security';
import type { Business, BusinessMember, BusinessMemberWithProfile, OnboardingInput } from '@/types';

export async function onboardBusiness(input: OnboardingInput): Promise<string> {
  const { data, error } = await supabase.rpc('onboard_business', {
    p_name: input.name.trim(),
    p_business_type: input.business_type ?? null,
    p_currency: input.currency ?? 'KES',
    p_country: input.country ?? 'KE',
    p_phone: input.phone ?? null,
  });
  if (error) throw new Error(friendlyError(error));
  return data as string;
}

export async function fetchUserBusinesses(): Promise<Business[]> {
  const { data, error } = await supabase
    .from('businesses')
    .select('id, name, business_type, country, currency, phone, email, address, tax_pin, logo_url, created_at, updated_at')
    .order('created_at', { ascending: true });
  if (error) throw new Error(friendlyError(error));
  return (data as Business[]) ?? [];
}

export async function fetchBusinessById(id: string): Promise<Business | null> {
  const { data, error } = await supabase
    .from('businesses')
    .select('id, name, business_type, country, currency, phone, email, address, tax_pin, logo_url, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(friendlyError(error));
  return (data as Business) ?? null;
}

export interface BusinessUpdateInput {
  name?: string;
  business_type?: string | null;
  country?: string;
  currency?: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  tax_pin?: string | null;
  logo_url?: string | null;
}

export async function updateBusiness(id: string, patch: BusinessUpdateInput): Promise<Business> {
  const { data, error } = await supabase.rpc('update_business_profile', {
    p_business_id: id,
    p_name: patch.name,
    p_business_type: patch.business_type ?? null,
    p_country: patch.country,
    p_currency: patch.currency,
    p_phone: patch.phone ?? null,
    p_email: patch.email ?? null,
    p_address: patch.address ?? null,
    p_tax_pin: patch.tax_pin ?? null,
  });
  if (error) throw new Error(friendlyError(error));
  if (!data) throw new Error('We couldn’t save those changes. Please try again.');
  return data as Business;
}

export async function fetchBusinessMembers(businessId: string): Promise<BusinessMemberWithProfile[]> {
  const { data, error } = await supabase
    .from('business_members')
    .select(`
      id, business_id, user_id, role, status, created_at, updated_at,
      profile:profiles!business_members_user_id_fkey(full_name, phone)
    `)
    .eq('business_id', businessId)
    .eq('status', 'ACTIVE')
    .order('created_at', { ascending: true });
  if (error) throw new Error(friendlyError(error));
  return (data as unknown as BusinessMemberWithProfile[]) ?? [];
}

export async function addBusinessMember(
  businessId: string,
  userId: string,
  role: 'BUSINESS_OWNER' | 'BUSINESS_STAFF'
): Promise<string> {
  const { data, error } = await supabase.rpc('add_business_member', {
    p_business_id: businessId,
    p_user_id: userId,
    p_role: role,
  });
  if (error) throw new Error(friendlyError(error));
  return data as string;
}

export async function updateMemberRole(memberId: string, role: 'BUSINESS_OWNER' | 'BUSINESS_STAFF'): Promise<void> {
  const { error } = await supabase.rpc('update_business_member_role', {
    p_member_id: memberId,
    p_role: role,
  });
  if (error) throw new Error(friendlyError(error));
}

export async function removeMember(memberId: string): Promise<void> {
  const { error } = await supabase.rpc('remove_business_member', {
    p_member_id: memberId,
  });
  if (error) throw new Error(friendlyError(error));
}

export async function hasBusinessAccess(businessId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('user_has_business_access', {
    p_business_id: businessId,
  });
  if (error) return false;
  return Boolean(data);
}

export async function currentUserBusinessRole(businessId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('current_user_business_role', {
    p_business_id: businessId,
  });
  if (error) return null;
  return (data as string) ?? null;
}

export type { BusinessMember };
