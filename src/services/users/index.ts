import { supabase } from '@/lib/supabase/client';
import { friendlyError } from '@/lib/security';
import type { Profile } from '@/types';

export async function fetchProfile(): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, user_id, full_name, phone, avatar_url, created_at, updated_at')
    .maybeSingle();
  if (error) throw new Error(friendlyError(error));
  return (data as Profile) ?? null;
}

export interface ProfileUpdateInput {
  full_name?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
}

export async function updateProfile(patch: ProfileUpdateInput): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .select('id, user_id, full_name, phone, avatar_url, created_at, updated_at')
    .maybeSingle();
  if (error) throw new Error(friendlyError(error));
  if (!data) throw new Error('We couldn’t save your profile. Please try again.');
  return data as Profile;
}
