/*
# Phase 0 security hardening — explicit anon function revokes

The default Postgres `PUBLIC` role grant still lets `anon` execute functions
even after `REVOKE ... FROM anon`. Explicitly revoke from `PUBLIC` and re-grant
to `authenticated` only, so unauthenticated callers truly cannot invoke any
SECURITY DEFINER function.
*/

REVOKE EXECUTE ON FUNCTION onboard_business(text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION onboard_business(text, text, text, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION add_business_member(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION add_business_member(uuid, uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION update_business_member_role(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION update_business_member_role(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION remove_business_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION remove_business_member(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION write_audit_log(uuid, text, text, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION write_audit_log(uuid, text, text, uuid, jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION user_has_business_access(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION user_has_business_access(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION current_user_business_role(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION current_user_business_role(uuid) TO authenticated;
