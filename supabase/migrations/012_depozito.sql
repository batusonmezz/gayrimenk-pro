-- 012_depozito.sql
-- Faz 3.5c-1: payments tablosuna depozito destegi

-- 1) tip kolonu
ALTER TABLE payments
  ADD COLUMN tip TEXT NOT NULL DEFAULT 'kira'
  CHECK (tip IN ('kira', 'depozito'));

-- 2) Depozitonun tutari/donemi/vadesi YOK -> nullable
ALTER TABLE payments ALTER COLUMN donem       DROP NOT NULL;
ALTER TABLE payments ALTER COLUMN vade_tarihi DROP NOT NULL;
ALTER TABLE payments ALTER COLUMN tutar_kurus DROP NOT NULL;

-- 3) tutar_kurus CHECK'i (isimsiz/inline) bul -> NULL'a izin verir sekilde yenile
DO $$
DECLARE
  v_conname TEXT;
BEGIN
  SELECT conname INTO v_conname
  FROM pg_constraint
  WHERE conrelid = 'payments'::regclass
    AND contype  = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%tutar_kurus%';
  IF v_conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE payments DROP CONSTRAINT %I', v_conname);
  END IF;
END $$;

ALTER TABLE payments
  ADD CONSTRAINT payments_tutar_kurus_check
  CHECK (tutar_kurus IS NULL OR tutar_kurus > 0);

-- 4) Kontrat basina tek depozito
CREATE UNIQUE INDEX payments_one_depozito_per_contract
  ON payments(contract_id)
  WHERE tip = 'depozito';

-- 5) Mevcut sozlesmeler icin depozito satiri (yoksa)
INSERT INTO payments (contract_id, organization_id, tip, durum)
SELECT DISTINCT p.contract_id, p.organization_id, 'depozito', 'beklemede'
FROM payments p
WHERE p.tip = 'kira'
  AND NOT EXISTS (
    SELECT 1 FROM payments d
    WHERE d.contract_id = p.contract_id AND d.tip = 'depozito'
  );

-- 6) create_payment_schedule: 12 kira + 1 depozito
CREATE OR REPLACE FUNCTION create_payment_schedule(p_contract_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid              UUID;
  v_role             TEXT;
  v_org_id           UUID;
  v_contract         contracts%ROWTYPE;
  v_baslangic        DATE;
  v_aylik_kira_kurus INTEGER;
  v_vade_gun         INTEGER;
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

  v_baslangic := v_contract.tarih;
  IF v_baslangic IS NULL THEN
    RAISE EXCEPTION 'Sözleşme başlangıç tarihi eksik';
  END IF;

  v_aylik_kira_kurus := v_contract.aylik_kira_kurus;
  IF v_aylik_kira_kurus IS NULL OR v_aylik_kira_kurus <= 0 THEN
    RAISE EXCEPTION 'Geçersiz aylık kira tutarı: %', v_contract.aylik_kira_kurus;
  END IF;

  v_vade_gun := EXTRACT(DAY FROM v_baslangic)::INTEGER;

  INSERT INTO payments (contract_id, organization_id, donem, tutar_kurus, vade_tarihi, durum)
  SELECT
    p_contract_id,
    v_org_id,
    (date_trunc('month', v_baslangic) + (gs.n || ' months')::INTERVAL)::DATE,
    v_aylik_kira_kurus,
    (
      date_trunc('month', v_baslangic) + (gs.n || ' months')::INTERVAL
      + (
          LEAST(
            v_vade_gun,
            EXTRACT(DAY FROM (
              date_trunc('month', v_baslangic)
              + ((gs.n + 1) || ' months')::INTERVAL
              - INTERVAL '1 day'
            ))::INTEGER
          ) - 1
        ) * INTERVAL '1 day'
    )::DATE,
    'beklemede'
  FROM generate_series(0, 11) AS gs(n);

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  INSERT INTO payments (contract_id, organization_id, tip, durum)
  VALUES (p_contract_id, v_org_id, 'depozito', 'beklemede');

  RETURN v_inserted;

EXCEPTION
  WHEN unique_violation THEN
    RETURN 0;
END;
$$;
