/*
# Biashivo Phase 0 — Secure Multi-Tenant Foundation

## Purpose
Establishes the secure, multi-tenant database foundation for the Biashivo SaaS
platform (African SME business management). This migration creates the core
identity, tenancy, and audit infrastructure only. No transactional/financial
tables are created in this phase.

## 1. New Tables

### profiles
- `id` uuid PK (defaults to gen_random_uuid())
- `user_id` uuid UNIQUE NOT NULL, references auth.users(id) ON DELETE CASCADE
- `full_name` text (nullable)
- `phone` text (nullable)
- `avatar_url` text (nullable)
- `created_at` timestamptz default now()
- `updated_at` timestamptz default now()
- One profile per authenticated Supabase user.

### businesses
- `id` uuid PK
- `name` text NOT NULL
- `business_type` text (nullable)
- `country` text NOT NULL default 'KE'
- `currency` text NOT NULL default 'KES'
- `phone` text, `email` text, `address` text, `tax_pin` text, `logo_url` text
- `created_at`, `updated_at` timestamptz
- A business is a tenant. Creation is ONLY allowed through the
  `onboard_business` SECURITY DEFINER function (no direct client INSERT policy).

### business_members
- `id` uuid PK
- `business_id` uuid NOT NULL references businesses(id) ON DELETE CASCADE
- `user_id` uuid NOT NULL references auth.users(id) ON DELETE CASCADE
- `role` text NOT NULL (CHECK in SUPER_ADMIN, BUSINESS_OWNER, BUSINESS_STAFF)
- `status` text NOT NULL default 'ACTIVE' (CHECK in ACTIVE, INVITED, REMOVED)
- `created_at`, `updated_at` timestamptz
- UNIQUE(business_id, user_id)
- Links users to businesses (tenant membership). A user may belong to multiple
  businesses.

### audit_logs
- `id` uuid PK
- `business_id` uuid (nullable, references businesses ON DELETE CASCADE)
- `user_id` uuid (nullable, references auth.users ON DELETE SET NULL)
- `action` text NOT NULL
- `entity_type` text, `entity_id` uuid
- `metadata` jsonb default '{}'
- `created_at` timestamptz default now()
- Immutable append-only log of important foundation events.

## 2. Indexes
- profiles(user_id)
- business_members(user_id)
- business_members(business_id)
- audit_logs(business_id)
- audit_logs(user_id)
- audit_logs(created_at)

## 3. Security — Row Level Security
RLS enabled on ALL four tables.

### profiles
- A user may SELECT/INSERT/UPDATE/DELETE only their own profile (auth.uid() = user_id).

### businesses
- SELECT: only active members of the business.
- UPDATE/DELETE: only an active BUSINESS_OWNER of the business.
- INSERT: NO direct client insert policy. Business creation is enforced
  server-side via the `onboard_business` SECURITY DEFINER function, which
  bypasses RLS and atomically creates the business + owner membership + audit log.

### business_members
- SELECT: only active members of the same business.
- INSERT/UPDATE/DELETE: only an active BUSINESS_OWNER of that business, and
  the role can never be set to SUPER_ADMIN via these policies (SUPER_ADMIN is a
  platform-level role managed outside the client).
- A trigger (`guard_business_owner`) prevents removing or demoting the sole
  BUSINESS_OWNER of a business.

### audit_logs
- SELECT: only active members of the business_id.
- INSERT: only through SECURITY DEFINER functions (no client INSERT policy).
- UPDATE/DELETE: not allowed (immutable).

## 4. Helper Functions
- `user_has_business_access(p_business_id uuid)` -> boolean
  SECURITY DEFINER, STABLE. Returns true if auth.uid() has an ACTIVE membership
  in the given business. Used as the reusable tenant-access check.
- `current_user_business_role(p_business_id uuid)` -> text
  SECURITY DEFINER, STABLE. Returns the caller's role for a business, or NULL.
- `onboard_business(p_name, p_type, p_currency, p_country, p_phone)` -> uuid
  SECURITY DEFINER. Atomically creates a business, an ACTIVE BUSINESS_OWNER
  membership for the caller, and an audit log entry. Returns the new business id.
- `add_business_member(p_business_id, p_user_id, p_role)` -> uuid
  SECURITY DEFINER. Lets an owner add a member (never SUPER_ADMIN). Audited.
- `update_business_member_role(p_member_id, p_role)` -> void
  SECURITY DEFINER. Lets an owner change a member's role (never SUPER_ADMIN;
  cannot demote the sole owner). Audited.
- `remove_business_member(p_member_id)` -> void
  SECURITY DEFINER. Lets an owner remove a member (cannot remove the sole
  owner). Audited.
- `handle_new_user()` trigger function — auto-creates a profile row when a new
  auth.users row is inserted.

## 5. Triggers
- `on_auth_user_created` AFTER INSERT ON auth.users -> `handle_new_user()`
- `set_updated_at` BEFORE UPDATE on profiles, businesses, business_members.
- `guard_business_owner` BEFORE DELETE/UPDATE ON business_members.

## Important Notes
- The service-role key is NEVER used in frontend code. All privileged writes
  go through SECURITY DEFINER functions invoked with the user's JWT.
- SUPER_ADMIN is never assignable through client-facing policies/functions in
  Phase 0; it is a platform-level role reserved for future admin tooling.
- No transactional/financial tables are created in this phase.
*/

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- PROFILES
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- ============================================================================
-- BUSINESSES
-- ============================================================================
CREATE TABLE IF NOT EXISTS businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  business_type text,
  country text NOT NULL DEFAULT 'KE',
  currency text NOT NULL DEFAULT 'KES',
  phone text,
  email text,
  address text,
  tax_pin text,
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- BUSINESS MEMBERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS business_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('SUPER_ADMIN', 'BUSINESS_OWNER', 'BUSINESS_STAFF')),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INVITED', 'REMOVED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_members_business_user_key UNIQUE (business_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_business_members_user_id ON business_members(user_id);
CREATE INDEX IF NOT EXISTS idx_business_members_business_id ON business_members(business_id);

-- ============================================================================
-- AUDIT LOGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_business_id ON audit_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================================================
-- UPDATED_AT helper
-- ============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_businesses_updated_at ON businesses;
CREATE TRIGGER trg_businesses_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_business_members_updated_at ON business_members;
CREATE TRIGGER trg_business_members_updated_at
  BEFORE UPDATE ON business_members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- HELPER: user_has_business_access
-- ============================================================================
CREATE OR REPLACE FUNCTION user_has_business_access(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_members
    WHERE business_id = p_business_id
      AND user_id = auth.uid()
      AND status = 'ACTIVE'
  );
$$;

-- ============================================================================
-- HELPER: current_user_business_role
-- ============================================================================
CREATE OR REPLACE FUNCTION current_user_business_role(p_business_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.business_members
  WHERE business_id = p_business_id
    AND user_id = auth.uid()
    AND status = 'ACTIVE';
$$;

-- ============================================================================
-- GUARD: prevent removing/demoting the sole BUSINESS_OWNER
-- ============================================================================
CREATE OR REPLACE FUNCTION guard_business_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_count int;
BEGIN
  -- For DELETE: block if this row is an active owner and no other active owner exists.
  IF TG_OP = 'DELETE' THEN
    IF OLD.role = 'BUSINESS_OWNER' AND OLD.status = 'ACTIVE' THEN
      SELECT count(*) INTO owner_count
      FROM public.business_members
      WHERE business_id = OLD.business_id
        AND role = 'BUSINESS_OWNER'
        AND status = 'ACTIVE'
        AND id <> OLD.id;
      IF owner_count = 0 THEN
        RAISE EXCEPTION 'Cannot remove the sole business owner.';
      END IF;
    END IF;
    RETURN OLD;
  END IF;

  -- For UPDATE: block demotion of the sole owner.
  IF TG_OP = 'UPDATE' THEN
    IF OLD.role = 'BUSINESS_OWNER' AND OLD.status = 'ACTIVE'
       AND (NEW.role <> 'BUSINESS_OWNER' OR NEW.status <> 'ACTIVE') THEN
      SELECT count(*) INTO owner_count
      FROM public.business_members
      WHERE business_id = NEW.business_id
        AND role = 'BUSINESS_OWNER'
        AND status = 'ACTIVE'
        AND id <> OLD.id;
      IF owner_count = 0 THEN
        RAISE EXCEPTION 'Cannot demote the sole business owner.';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_business_owner ON business_members;
CREATE TRIGGER trg_guard_business_owner
  BEFORE DELETE OR UPDATE ON business_members
  FOR EACH ROW EXECUTE FUNCTION guard_business_owner();

-- ============================================================================
-- ONBOARDING: create business + owner membership atomically
-- ============================================================================
CREATE OR REPLACE FUNCTION onboard_business(
  p_name text,
  p_business_type text DEFAULT NULL,
  p_currency text DEFAULT 'KES',
  p_country text DEFAULT 'KE',
  p_phone text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RAISE EXCEPTION 'Business name is required';
  END IF;

  INSERT INTO public.businesses (name, business_type, currency, country, phone)
  VALUES (p_name, p_business_type, p_currency, p_country, p_phone)
  RETURNING id INTO v_business_id;

  INSERT INTO public.business_members (business_id, user_id, role, status)
  VALUES (v_business_id, v_user_id, 'BUSINESS_OWNER', 'ACTIVE');

  INSERT INTO public.audit_logs (business_id, user_id, action, entity_type, entity_id, metadata)
  VALUES (
    v_business_id, v_user_id, 'business.created', 'business', v_business_id,
    jsonb_build_object('name', p_name, 'business_type', p_business_type, 'currency', p_currency)
  );

  RETURN v_business_id;
END;
$$;

GRANT EXECUTE ON FUNCTION onboard_business(text, text, text, text, text) TO authenticated;

-- ============================================================================
-- MEMBER MANAGEMENT (owner only, never SUPER_ADMIN)
-- ============================================================================
CREATE OR REPLACE FUNCTION add_business_member(
  p_business_id uuid,
  p_user_id uuid,
  p_role text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_id uuid;
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM public.business_members
  WHERE business_id = p_business_id AND user_id = auth.uid() AND status = 'ACTIVE';

  IF v_caller_role IS NULL OR v_caller_role = 'BUSINESS_STAFF' THEN
    RAISE EXCEPTION 'Only a business owner can add members.';
  END IF;
  IF p_role = 'SUPER_ADMIN' THEN
    RAISE EXCEPTION 'SUPER_ADMIN cannot be assigned from the application.';
  END IF;
  IF p_role NOT IN ('BUSINESS_OWNER', 'BUSINESS_STAFF') THEN
    RAISE EXCEPTION 'Invalid role.';
  END IF;

  INSERT INTO public.business_members (business_id, user_id, role, status)
  VALUES (p_business_id, p_user_id, p_role, 'ACTIVE')
  RETURNING id INTO v_member_id;

  INSERT INTO public.audit_logs (business_id, user_id, action, entity_type, entity_id, metadata)
  VALUES (p_business_id, auth.uid(), 'member.added', 'business_member', v_member_id,
          jsonb_build_object('added_user_id', p_user_id, 'role', p_role));

  RETURN v_member_id;
END;
$$;

GRANT EXECUTE ON FUNCTION add_business_member(uuid, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION update_business_member_role(
  p_member_id uuid,
  p_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
  v_caller_role text;
BEGIN
  SELECT business_id INTO v_business_id FROM public.business_members WHERE id = p_member_id;
  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  SELECT role INTO v_caller_role FROM public.business_members
  WHERE business_id = v_business_id AND user_id = auth.uid() AND status = 'ACTIVE';

  IF v_caller_role IS NULL OR v_caller_role = 'BUSINESS_STAFF' THEN
    RAISE EXCEPTION 'Only a business owner can change member roles.';
  END IF;
  IF p_role = 'SUPER_ADMIN' THEN
    RAISE EXCEPTION 'SUPER_ADMIN cannot be assigned from the application.';
  END IF;
  IF p_role NOT IN ('BUSINESS_OWNER', 'BUSINESS_STAFF') THEN
    RAISE EXCEPTION 'Invalid role.';
  END IF;

  UPDATE public.business_members SET role = p_role WHERE id = p_member_id;

  INSERT INTO public.audit_logs (business_id, user_id, action, entity_type, entity_id, metadata)
  VALUES (v_business_id, auth.uid(), 'member.role_changed', 'business_member', p_member_id,
          jsonb_build_object('new_role', p_role));
END;
$$;

GRANT EXECUTE ON FUNCTION update_business_member_role(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION remove_business_member(p_member_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
  v_caller_role text;
BEGIN
  SELECT business_id INTO v_business_id FROM public.business_members WHERE id = p_member_id;
  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  SELECT role INTO v_caller_role FROM public.business_members
  WHERE business_id = v_business_id AND user_id = auth.uid() AND status = 'ACTIVE';

  IF v_caller_role IS NULL OR v_caller_role = 'BUSINESS_STAFF' THEN
    RAISE EXCEPTION 'Only a business owner can remove members.';
  END IF;

  DELETE FROM public.business_members WHERE id = p_member_id;

  INSERT INTO public.audit_logs (business_id, user_id, action, entity_type, entity_id, metadata)
  VALUES (v_business_id, auth.uid(), 'member.removed', 'business_member', p_member_id, '{}'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION remove_business_member(uuid) TO authenticated;

-- ============================================================================
-- AUDIT HELPER (callable by authenticated users for audited settings changes)
-- ============================================================================
CREATE OR REPLACE FUNCTION write_audit_log(
  p_business_id uuid,
  p_action text,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT public.user_has_business_access(p_business_id) THEN
    RAISE EXCEPTION 'No access to this business';
  END IF;

  INSERT INTO public.audit_logs (business_id, user_id, action, entity_type, entity_id, metadata)
  VALUES (p_business_id, auth.uid(), p_action, p_entity_type, p_entity_id, p_metadata)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION write_audit_log(uuid, text, text, uuid, jsonb) TO authenticated;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ---- profiles ----
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ---- businesses ----
DROP POLICY IF EXISTS "select_member_businesses" ON businesses;
CREATE POLICY "select_member_businesses" ON businesses
  FOR SELECT TO authenticated
  USING (public.user_has_business_access(id));

DROP POLICY IF EXISTS "update_owner_business" ON businesses;
CREATE POLICY "update_owner_business" ON businesses
  FOR UPDATE TO authenticated
  USING (public.current_user_business_role(id) = 'BUSINESS_OWNER')
  WITH CHECK (public.current_user_business_role(id) = 'BUSINESS_OWNER');

DROP POLICY IF EXISTS "delete_owner_business" ON businesses;
CREATE POLICY "delete_owner_business" ON businesses
  FOR DELETE TO authenticated
  USING (public.current_user_business_role(id) = 'BUSINESS_OWNER');

-- No INSERT policy: business creation is enforced via onboard_business().

-- ---- business_members ----
DROP POLICY IF EXISTS "select_own_business_members" ON business_members;
CREATE POLICY "select_own_business_members" ON business_members
  FOR SELECT TO authenticated
  USING (public.user_has_business_access(business_id));

DROP POLICY IF EXISTS "insert_owner_members" ON business_members;
CREATE POLICY "insert_owner_members" ON business_members
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_business_role(business_id) = 'BUSINESS_OWNER'
    AND role IN ('BUSINESS_OWNER', 'BUSINESS_STAFF')
  );

DROP POLICY IF EXISTS "update_owner_members" ON business_members;
CREATE POLICY "update_owner_members" ON business_members
  FOR UPDATE TO authenticated
  USING (public.current_user_business_role(business_id) = 'BUSINESS_OWNER')
  WITH CHECK (
    public.current_user_business_role(business_id) = 'BUSINESS_OWNER'
    AND role IN ('BUSINESS_OWNER', 'BUSINESS_STAFF')
  );

DROP POLICY IF EXISTS "delete_owner_members" ON business_members;
CREATE POLICY "delete_owner_members" ON business_members
  FOR DELETE TO authenticated
  USING (public.current_user_business_role(business_id) = 'BUSINESS_OWNER');

-- ---- audit_logs ----
DROP POLICY IF EXISTS "select_member_audit_logs" ON audit_logs;
CREATE POLICY "select_member_audit_logs" ON audit_logs
  FOR SELECT TO authenticated
  USING (public.user_has_business_access(business_id));

-- No INSERT/UPDATE/DELETE policies: audit logs are written only via
-- SECURITY DEFINER functions and are immutable from the client.
