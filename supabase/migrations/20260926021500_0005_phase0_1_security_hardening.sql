/*
  # Biashivo Phase 0.1 Security Hardening

  Goals:
  1. Force business membership mutations through audited SECURITY DEFINER RPCs.
  2. Require the caller to be exactly BUSINESS_OWNER for member management.
  3. Add database-side validation for core business fields so API/RPC callers
     cannot bypass the equivalent frontend validation.

  This migration intentionally preserves SELECT access to business_members for
  active members. INSERT/UPDATE/DELETE are RPC-only after this migration.
*/

-- ============================================================================
-- 1. BUSINESS MEMBER MUTATIONS: RPC ONLY
-- ============================================================================
DROP POLICY IF EXISTS "insert_owner_members" ON public.business_members;
DROP POLICY IF EXISTS "update_owner_members" ON public.business_members;
DROP POLICY IF EXISTS "delete_owner_members" ON public.business_members;

-- Defense in depth: even if a permissive RLS policy is accidentally added later,
-- authenticated/anonymous clients do not have table-level mutation privileges.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.business_members FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.business_members FROM anon;

-- Keep read access available; RLS still limits rows to active business members.
GRANT SELECT ON TABLE public.business_members TO authenticated;

-- ============================================================================
-- 2. MEMBER MANAGEMENT RPCs: EXACT OWNER AUTHORIZATION + AUDIT
-- ============================================================================
CREATE OR REPLACE FUNCTION public.add_business_member(
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
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role INTO v_caller_role
  FROM public.business_members
  WHERE business_id = p_business_id
    AND user_id = auth.uid()
    AND status = 'ACTIVE';

  IF v_caller_role IS DISTINCT FROM 'BUSINESS_OWNER' THEN
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
  VALUES (
    p_business_id,
    auth.uid(),
    'member.added',
    'business_member',
    v_member_id,
    jsonb_build_object('added_user_id', p_user_id, 'role', p_role)
  );

  RETURN v_member_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_business_member_role(
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
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT business_id INTO v_business_id
  FROM public.business_members
  WHERE id = p_member_id;

  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  SELECT role INTO v_caller_role
  FROM public.business_members
  WHERE business_id = v_business_id
    AND user_id = auth.uid()
    AND status = 'ACTIVE';

  IF v_caller_role IS DISTINCT FROM 'BUSINESS_OWNER' THEN
    RAISE EXCEPTION 'Only a business owner can change member roles.';
  END IF;
  IF p_role = 'SUPER_ADMIN' THEN
    RAISE EXCEPTION 'SUPER_ADMIN cannot be assigned from the application.';
  END IF;
  IF p_role NOT IN ('BUSINESS_OWNER', 'BUSINESS_STAFF') THEN
    RAISE EXCEPTION 'Invalid role.';
  END IF;

  UPDATE public.business_members
  SET role = p_role
  WHERE id = p_member_id;

  INSERT INTO public.audit_logs (business_id, user_id, action, entity_type, entity_id, metadata)
  VALUES (
    v_business_id,
    auth.uid(),
    'member.role_changed',
    'business_member',
    p_member_id,
    jsonb_build_object('new_role', p_role)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_business_member(p_member_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
  v_caller_role text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT business_id INTO v_business_id
  FROM public.business_members
  WHERE id = p_member_id;

  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  SELECT role INTO v_caller_role
  FROM public.business_members
  WHERE business_id = v_business_id
    AND user_id = auth.uid()
    AND status = 'ACTIVE';

  IF v_caller_role IS DISTINCT FROM 'BUSINESS_OWNER' THEN
    RAISE EXCEPTION 'Only a business owner can remove members.';
  END IF;

  -- The existing guard_business_owner trigger remains the final DB-level
  -- protection against removing the sole active owner.
  DELETE FROM public.business_members
  WHERE id = p_member_id;

  INSERT INTO public.audit_logs (business_id, user_id, action, entity_type, entity_id, metadata)
  VALUES (
    v_business_id,
    auth.uid(),
    'member.removed',
    'business_member',
    p_member_id,
    '{}'::jsonb
  );
END;
$$;

-- Preserve least-privilege execution posture after CREATE OR REPLACE.
REVOKE EXECUTE ON FUNCTION public.add_business_member(uuid, uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_business_member_role(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.remove_business_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_business_member(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_business_member_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_business_member(uuid) TO authenticated;

-- ============================================================================
-- 3. DATABASE-SIDE BUSINESS INPUT VALIDATION
-- ============================================================================
-- NOT VALID avoids failing deployment because of any pre-existing legacy row,
-- while PostgreSQL still enforces these constraints for new/changed rows.
ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_name_valid
  CHECK (char_length(btrim(name)) BETWEEN 1 AND 160) NOT VALID;

ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_type_valid
  CHECK (
    business_type IS NULL OR business_type IN (
      'Retail',
      'Bakery',
      'Salon',
      'Service Business',
      'Wholesale/Distribution',
      'Other'
    )
  ) NOT VALID;

ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_country_valid
  CHECK (country IN ('KE', 'UG', 'TZ', 'NG', 'GH', 'ZA', 'RW')) NOT VALID;

ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_currency_valid
  CHECK (currency IN ('KES', 'UGX', 'TZS', 'NGN', 'GHS', 'ZAR', 'USD', 'EUR', 'GBP')) NOT VALID;

ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_phone_valid
  CHECK (
    phone IS NULL OR (
      char_length(btrim(phone)) BETWEEN 7 AND 20
      AND btrim(phone) ~ '^[0-9+() -]+$'
    )
  ) NOT VALID;

-- ============================================================================
-- 4. ONBOARDING: NORMALIZE + VALIDATE BEFORE INSERT
-- ============================================================================
CREATE OR REPLACE FUNCTION public.onboard_business(
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
  v_name text := btrim(p_name);
  v_business_type text := NULLIF(btrim(p_business_type), '');
  v_currency text := upper(btrim(COALESCE(p_currency, 'KES')));
  v_country text := upper(btrim(COALESCE(p_country, 'KE')));
  v_phone text := NULLIF(btrim(p_phone), '');
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF v_name IS NULL OR char_length(v_name) NOT BETWEEN 1 AND 160 THEN
    RAISE EXCEPTION 'Business name must be between 1 and 160 characters.';
  END IF;
  IF v_business_type IS NOT NULL AND v_business_type NOT IN (
    'Retail', 'Bakery', 'Salon', 'Service Business', 'Wholesale/Distribution', 'Other'
  ) THEN
    RAISE EXCEPTION 'Invalid business type.';
  END IF;
  IF v_currency NOT IN ('KES', 'UGX', 'TZS', 'NGN', 'GHS', 'ZAR', 'USD', 'EUR', 'GBP') THEN
    RAISE EXCEPTION 'Unsupported currency.';
  END IF;
  IF v_country NOT IN ('KE', 'UG', 'TZ', 'NG', 'GH', 'ZA', 'RW') THEN
    RAISE EXCEPTION 'Unsupported country.';
  END IF;
  IF v_phone IS NOT NULL AND (
    char_length(v_phone) NOT BETWEEN 7 AND 20
    OR v_phone !~ '^[0-9+() -]+$'
  ) THEN
    RAISE EXCEPTION 'Invalid phone number.';
  END IF;

  INSERT INTO public.businesses (name, business_type, currency, country, phone)
  VALUES (v_name, v_business_type, v_currency, v_country, v_phone)
  RETURNING id INTO v_business_id;

  INSERT INTO public.business_members (business_id, user_id, role, status)
  VALUES (v_business_id, v_user_id, 'BUSINESS_OWNER', 'ACTIVE');

  INSERT INTO public.audit_logs (business_id, user_id, action, entity_type, entity_id, metadata)
  VALUES (
    v_business_id,
    v_user_id,
    'business.created',
    'business',
    v_business_id,
    jsonb_build_object(
      'name', v_name,
      'business_type', v_business_type,
      'currency', v_currency,
      'country', v_country
    )
  );

  RETURN v_business_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.onboard_business(text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.onboard_business(text, text, text, text, text) TO authenticated;
