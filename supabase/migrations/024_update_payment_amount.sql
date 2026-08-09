-- 024_update_payment_amount.sql
-- Zam uygulama: verilen donemden itibaren, HENUZ ODENMEMIS ve DEKONTU OLMAYAN
-- kira satirlarinin tutarini gunceller. Silme yok, gecmis odeme kaybi yok.
-- Sozlesme kaydindaki aylik_kira_kurus'a DOKUNMAZ - o, FormScreen'den sozlesme
-- duzenlenerek guncellenir (form_data ile birlikte, senkron bozulmasin diye).

BEGIN;

CREATE OR REPLACE FUNCTION public.update_payment_amount(
  p_contract_id      UUID,
  p_yeni_tutar_kurus INTEGER,
  p_baslangic_donem  DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_uid      UUID;
  v_role     TEXT;
  v_org_id   UUID;
  v_contract contracts%ROWTYPE;
  v_donem    DATE;
  v_updated  INTEGER;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Kimlik doğrulama gerekli';
  END IF;

  v_role := auth_role();
  IF v_role <> 'emlakci' THEN
    RAISE EXCEPTION 'Sadece emlakçı kira tutarını güncelleyebilir';
  END IF;

  SELECT * INTO v_contract FROM contracts WHERE id = p_contract_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sözleşme bulunamadı: %', p_contract_id;
  END IF;

  v_org_id := auth_org_id();
  IF v_contract.organization_id <> v_org_id THEN
    RAISE EXCEPTION 'Bu sözleşmeye erişim yetkiniz yok';
  END IF;

  IF p_yeni_tutar_kurus IS NULL OR p_yeni_tutar_kurus <= 0 THEN
    RAISE EXCEPTION 'Geçersiz kira tutarı: %', p_yeni_tutar_kurus;
  END IF;

  IF p_baslangic_donem IS NULL THEN
    RAISE EXCEPTION 'Başlangıç dönemi seçilmeli';
  END IF;

  v_donem := date_trunc('month', p_baslangic_donem)::DATE;

  UPDATE payments
  SET tutar_kurus = p_yeni_tutar_kurus
  WHERE contract_id = p_contract_id
    AND tip = 'kira'
    AND donem >= v_donem
    AND durum = 'beklemede'
    AND dekont_url IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.update_payment_amount(UUID, INTEGER, DATE) TO authenticated;

COMMIT;
