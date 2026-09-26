-- Close the client-write path to audit_logs and make business profile updates
-- and their audit entries one database transaction.
REVOKE EXECUTE ON FUNCTION public.write_audit_log(uuid, text, text, uuid, jsonb)
  FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "update_owner_business" ON public.businesses;
REVOKE UPDATE ON TABLE public.businesses FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.update_business_profile(
  p_business_id uuid,
  p_name text,
  p_business_type text,
  p_country text,
  p_currency text,
  p_phone text,
  p_email text,
  p_address text,
  p_tax_pin text
)
RETURNS public.businesses
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_business public.businesses;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.business_members
    WHERE business_id = p_business_id
      AND user_id = auth.uid()
      AND role = 'BUSINESS_OWNER'
      AND status = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'Only an active business owner can update this business.';
  END IF;

  UPDATE public.businesses SET
    name = btrim(p_name),
    business_type = NULLIF(btrim(p_business_type), ''),
    country = upper(btrim(p_country)),
    currency = upper(btrim(p_currency)),
    phone = NULLIF(btrim(p_phone), ''),
    email = NULLIF(btrim(p_email), ''),
    address = NULLIF(btrim(p_address), ''),
    tax_pin = NULLIF(btrim(p_tax_pin), '')
  WHERE id = p_business_id
  RETURNING * INTO v_business;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Business not found.';
  END IF;

  INSERT INTO public.audit_logs (business_id, user_id, action, entity_type, entity_id, metadata)
  VALUES (p_business_id, auth.uid(), 'business.settings_updated', 'business', p_business_id, '{}'::jsonb);

  RETURN v_business;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_business_profile(uuid, text, text, text, text, text, text, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_business_profile(uuid, text, text, text, text, text, text, text, text)
  TO authenticated;
