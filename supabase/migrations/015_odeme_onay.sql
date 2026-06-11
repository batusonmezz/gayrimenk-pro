-- 015_odeme_onay.sql
-- Faz 3.5d: odeme onay/red (mal sahibi + emlakci)

CREATE OR REPLACE FUNCTION approve_payment(p_payment_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID; v_role TEXT; v_org_id UUID; v_payment payments%ROWTYPE;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Kimlik doğrulama gerekli'; END IF;
  v_role := auth_role();
  v_org_id := auth_org_id();
  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ödeme kaydı bulunamadı'; END IF;
  IF v_payment.organization_id <> v_org_id THEN RAISE EXCEPTION 'Bu kayda erişim yetkiniz yok'; END IF;
  IF v_role NOT IN ('mal_sahibi','emlakci') THEN RAISE EXCEPTION 'Onaylama yetkiniz yok'; END IF;
  IF v_role = 'mal_sahibi' AND NOT user_can_access_contract(v_payment.contract_id) THEN
    RAISE EXCEPTION 'Bu sözleşmeye erişiminiz yok';
  END IF;
  UPDATE payments
  SET durum = 'odendi', onaylayan_user_id = v_uid, odeme_tarihi = CURRENT_DATE
  WHERE id = p_payment_id;
END;
$$;

CREATE OR REPLACE FUNCTION reject_payment(p_payment_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID; v_role TEXT; v_org_id UUID; v_payment payments%ROWTYPE;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Kimlik doğrulama gerekli'; END IF;
  v_role := auth_role();
  v_org_id := auth_org_id();
  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ödeme kaydı bulunamadı'; END IF;
  IF v_payment.organization_id <> v_org_id THEN RAISE EXCEPTION 'Bu kayda erişim yetkiniz yok'; END IF;
  IF v_role NOT IN ('mal_sahibi','emlakci') THEN RAISE EXCEPTION 'Reddetme yetkiniz yok'; END IF;
  IF v_role = 'mal_sahibi' AND NOT user_can_access_contract(v_payment.contract_id) THEN
    RAISE EXCEPTION 'Bu sözleşmeye erişiminiz yok';
  END IF;
  UPDATE payments
  SET durum = 'reddedildi', onaylayan_user_id = v_uid, odeme_tarihi = NULL
  WHERE id = p_payment_id;
END;
$$;

REVOKE ALL ON FUNCTION approve_payment(UUID) FROM public;
GRANT EXECUTE ON FUNCTION approve_payment(UUID) TO authenticated;
REVOKE ALL ON FUNCTION reject_payment(UUID) FROM public;
GRANT EXECUTE ON FUNCTION reject_payment(UUID) TO authenticated;
