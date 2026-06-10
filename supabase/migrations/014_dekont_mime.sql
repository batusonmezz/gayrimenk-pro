-- 014_dekont_mime.sql
-- Faz 3.5c-2b: dekont icin dosya turu (foto / PDF)

ALTER TABLE payments ADD COLUMN dekont_mime TEXT;

DROP FUNCTION IF EXISTS upload_dekont(UUID, TEXT);

CREATE OR REPLACE FUNCTION upload_dekont(p_payment_id UUID, p_dekont TEXT, p_mime TEXT)
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

  IF p_mime IS NULL OR (p_mime NOT LIKE 'image/%' AND p_mime <> 'application/pdf') THEN
    RAISE EXCEPTION 'Desteklenmeyen dosya türü: %', p_mime;
  END IF;

  IF v_payment.durum = 'odendi' THEN
    RAISE EXCEPTION 'Onaylanmış ödemenin dekontu değiştirilemez';
  END IF;

  UPDATE payments
  SET dekont_url  = p_dekont,
      dekont_mime = p_mime,
      durum       = 'beklemede'
  WHERE id = p_payment_id;
END;
$$;

REVOKE ALL ON FUNCTION upload_dekont(UUID, TEXT, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION upload_dekont(UUID, TEXT, TEXT) TO authenticated;
