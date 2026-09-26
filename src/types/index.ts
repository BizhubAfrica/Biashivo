export type BusinessRole = 'SUPER_ADMIN' | 'BUSINESS_OWNER' | 'BUSINESS_STAFF';

export type MemberStatus = 'ACTIVE' | 'INVITED' | 'REMOVED';

export type BusinessType =
  | 'Retail'
  | 'Bakery'
  | 'Salon'
  | 'Service Business'
  | 'Wholesale/Distribution'
  | 'Other';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Business {
  id: string;
  name: string;
  business_type: string | null;
  country: string;
  currency: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  tax_pin: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface BusinessMember {
  id: string;
  business_id: string;
  user_id: string;
  role: BusinessRole;
  status: MemberStatus;
  created_at: string;
  updated_at: string;
}

export interface BusinessMemberWithProfile extends BusinessMember {
  profile?: Pick<Profile, 'full_name' | 'phone'> | null;
}

export interface AuditLog {
  id: string;
  business_id: string | null;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AuthSession {
  user: {
    id: string;
    email: string | null;
  };
}

export interface OnboardingInput {
  name: string;
  business_type?: BusinessType | null;
  currency?: string;
  country?: string;
  phone?: string | null;
}
