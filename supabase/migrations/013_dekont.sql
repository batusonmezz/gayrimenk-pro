-- 013_dekont.sql
-- Faz 3.5c-2: dekont yukleme

ALTER TABLE payments
  ADD COLUMN dekont_var BOOLEAN
  GENERATED ALWAYS AS (dekont_url IS NOT NULL) STORED;

CREATE OR REPLACE FUNCTION upload_dekont(p_payment_id UUID, p_dekont TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid     UUID;
  v_role    TEXT;
  v_org_id  UUID;
  v_payment payments%ROWTYPE;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Kimlik doğrulama gerekli';
  END IF;

  v_role   := auth_role();
  v_org_id := auth_org_id();

  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ödeme kaydı bulunamadı';
  END IF;

  IF v_payment.organization_id <> v_org_id THEN
    RAISE EXCEPTION 'Bu kayda erişim yetkiniz yok';
  END IF;

  IF v_role NOT IN ('kiraci', 'emlakci') THEN
    RAISE EXCEPTION 'Dekont yükleme yetkiniz yok';
  END IF;

  IF v_role = 'kiraci' AND NOT user_can_access_contract(v_payment.contract_id) THEN
    RAISE EXCEPTION 'Bu sözleşmeye erişiminiz yok';
  END IF;

  IF p_dekont IS NULL OR length(p_dekont) = 0 THEN
    RAISE EXCEPTION 'Dekont boş olamaz';
  END IF;

  IF v_payment.durum = 'odendi' THEN
    RAISE EXCEPTION 'Onaylanmış ödemenin dekontu değiştirilemez';
  END IF;

  UPDATE payments
  SET dekont_url = p_dekont,
      durum      = 'beklemede'
  WHERE id = p_payment_id;
END;
$$;

REVOKE ALL ON FUNCTION upload_dekont(UUID, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION upload_dekont(UUID, TEXT) TO authenticated;
