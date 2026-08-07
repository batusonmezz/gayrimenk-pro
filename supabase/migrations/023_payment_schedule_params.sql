-- 023_payment_schedule_params.sql
-- 1) create_payment_schedule: odeme gunu / ilk donem / sure / depozito parametreleri.
--    Hepsi DEFAULT'lu; NULL verilirse eski davranis (sozlesme tarihinden turetme) korunur.
-- 2) delete_payment_schedule: hatali kurulmus plani geri alma.
--    Dekontu olan veya odenmis satir varsa REDDEDER.
-- NOT: Eski tek parametreli surum DROP edilmek ZORUNDA; aksi halde tek argumanli
-- cagri iki fonksiyon arasinda belirsiz kalir (function is not unique).

BEGIN;

DROP FUNCTION IF EXISTS public.create_payment_schedule(uuid);

CREATE OR REPLACE FUNCTION public.create_payment_schedule(
  p_contract_id    UUID,
  p_odeme_gunu     INTEGER DEFAULT NULL,
  p_ilk_donem      DATE    DEFAULT NULL,
  p_ay_sayisi      INTEGER DEFAULT 12,
  p_depozito_dahil BOOLEAN DEFAULT TRUE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_uid              UUID;
  v_role             TEXT;
  v_org_id           UUID;
  v_contract         contracts%ROWTYPE;
  v_baslangic        DATE;
  v_aylik_kira_kurus INTEGER;
  v_vade_gun         INTEGER;
  v_ilk_donem        DATE;
  v_ay_sayisi        INTEGER;
  v_inserted         INTEGER;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Kimlik doğrulama gerekli';
  END IF;

  v_role := auth_role();
  IF v_role <> 'emlakci' THEN
    RAISE EXCEPTION 'Sadece emlakçı ödeme planı oluşturabilir';
  END IF;

  SELECT * INTO v_contract FROM contracts WHERE id = p_contract_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sözleşme bulunamadı: %', p_contract_id;
  END IF;

  v_org_id := auth_org_id();
  IF v_contract.organization_id <> v_org_id THEN
    RAISE EXCEPTION 'Bu sözleşmeye erişim yetkiniz yok';
  END IF;

  IF EXISTS (SELECT 1 FROM payments WHERE contract_id = p_contract_id) THEN
    RETURN 0;
  END IF;

  v_ay_sayisi := COALESCE(p_ay_sayisi, 12);
  IF v_ay_sayisi < 1 OR v_ay_sayisi > 60 THEN
    RAISE EXCEPTION 'Geçersiz ay sayısı: %', v_ay_sayisi;
  END IF;

  IF p_odeme_gunu IS NOT NULL AND (p_odeme_gunu < 1 OR p_odeme_gunu > 32) THEN
    RAISE EXCEPTION 'Geçersiz ödeme günü: %', p_odeme_gunu;
  END IF;

  v_baslangic := v_contract.tarih;
  IF v_baslangic IS NULL AND (p_odeme_gunu IS NULL OR p_ilk_donem IS NULL) THEN
    RAISE EXCEPTION 'Sözleşme başlangıç tarihi eksik; ödeme günü ve ilk dönem elle seçilmeli';
  END IF;

  v_aylik_kira_kurus := v_contract.aylik_kira_kurus;
  IF v_aylik_kira_kurus IS NULL OR v_aylik_kira_kurus <= 0 THEN
    RAISE EXCEPTION 'Geçersiz aylık kira tutarı: %', v_contract.aylik_kira_kurus;
  END IF;

  v_vade_gun  := COALESCE(p_odeme_gunu, EXTRACT(DAY FROM v_baslangic)::INTEGER);
  v_ilk_donem := date_trunc('month', COALESCE(p_ilk_donem, v_baslangic))::DATE;

  INSERT INTO payments (contract_id, organization_id, donem, tutar_kurus, vade_tarihi, durum)
  SELECT
    p_contract_id,
    v_org_id,
    (v_ilk_donem + (gs.n || ' months')::INTERVAL)::DATE,
    v_aylik_kira_kurus,
    (
      v_ilk_donem + (gs.n || ' months')::INTERVAL
      + (
          LEAST(
            v_vade_gun,
            EXTRACT(DAY FROM (
              v_ilk_donem + ((gs.n + 1) || ' months')::INTERVAL - INTERVAL '1 day'
            ))::INTEGER
          ) - 1
        ) * INTERVAL '1 day'
    )::DATE,
    'beklemede'
  FROM generate_series(0, v_ay_sayisi - 1) AS gs(n);

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF p_depozito_dahil THEN
    INSERT INTO payments (contract_id, organization_id, tip, durum)
    VALUES (p_contract_id, v_org_id, 'depozito', 'beklemede');
  END IF;

  RETURN v_inserted;
EXCEPTION
  WHEN unique_violation THEN
    RETURN 0;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_payment_schedule(p_contract_id UUID)
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
  v_korumali INTEGER;
  v_deleted  INTEGER;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Kimlik doğrulama gerekli';
  END IF;

  v_role := auth_role();
  IF v_role <> 'emlakci' THEN
    RAISE EXCEPTION 'Sadece emlakçı ödeme planını silebilir';
  END IF;

  SELECT * INTO v_contract FROM contracts WHERE id = p_contract_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sözleşme bulunamadı: %', p_contract_id;
  END IF;

  v_org_id := auth_org_id();
  IF v_contract.organization_id <> v_org_id THEN
    RAISE EXCEPTION 'Bu sözleşmeye erişim yetkiniz yok';
  END IF;

  SELECT COUNT(*) INTO v_korumali
  FROM payments
  WHERE contract_id = p_contract_id
    AND (durum = 'odendi' OR dekont_url IS NOT NULL);

  IF v_korumali > 0 THEN
    RAISE EXCEPTION 'Ödeme planı silinemez: % kayıtta dekont veya onaylanmış ödeme var', v_korumali;
  END IF;

  DELETE FROM payments WHERE contract_id = p_contract_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.create_payment_schedule(UUID, INTEGER, DATE, INTEGER, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_payment_schedule(UUID) TO authenticated;

COMMIT;
