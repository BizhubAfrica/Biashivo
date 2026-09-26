/*
# Phase 0 security hardening — advisor fixes

## Changes
1. Revoke EXECUTE on all SECURITY DEFINER functions from the `anon` role so
   unauthenticated callers cannot invoke them. Only `authenticated` retains
   EXECUTE (already granted). These functions all check `auth.uid()` internally,
   but restricting anon is defense-in-depth and clears the linter warning.
2. Set an explicit `search_path` on `set_updated_at()` (the trigger helper) so
   its search_path is not mutable.
3. Revoke all table privileges (SELECT/INSERT/UPDATE/DELETE) from `anon` on all
   four Phase 0 tables. The app requires authentication, so anon should have no
   direct table access — all access is via authenticated + RLS policies.

## Notes
- No data is lost; no columns/tables changed.
- All functions remain SECURITY DEFINER with `SET search_path = public`.
- `authenticated` EXECUTE grants are preserved.
*/

-- Revoke anon execute on all SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION onboard_business(text, text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION add_business_member(uuid, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION update_business_member_role(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION remove_business_member(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION write_audit_log(uuid, text, text, uuid, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION user_has_business_access(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION current_user_business_role(uuid) FROM anon;

-- Fix mutable search_path on set_updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Revoke all table privileges from anon (app requires auth)
REVOKE SELECT, INSERT, UPDATE, DELETE ON profiles FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON businesses FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON business_members FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON audit_logs FROM anon;
