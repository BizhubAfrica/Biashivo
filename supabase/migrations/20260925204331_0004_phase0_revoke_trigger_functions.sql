/*
# Phase 0 security hardening — revoke PUBLIC execute on trigger/helper functions

Revoke PUBLIC execute on `guard_business_owner` and `handle_new_user` — these
are trigger functions and should not be callable via the REST API by any role.
*/

REVOKE EXECUTE ON FUNCTION guard_business_owner() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION guard_business_owner() FROM anon;
REVOKE EXECUTE ON FUNCTION handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION set_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION set_updated_at() FROM anon;
