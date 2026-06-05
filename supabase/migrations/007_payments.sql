-- Faz 3.5a: Ödeme Takip Sistemi — payments tablosu + RLS + RPC

-- a) payments tablosu
CREATE TABLE payments (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id         UUID         NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  organization_id     UUID         NOT NULL REFERENCES organizations(id),
  donem               DATE         NOT NULL,         -- ayın 1'i (ör: 2026-03-01)
  tutar_kurus         INTEGER      NOT NULL CHECK (tutar_kurus > 0),
  vade_tarihi         DATE         NOT NULL,         -- gerçek vade günü (ay-sonu clamp'li)
  durum               TEXT         NOT NULL DEFAULT 'beklemede'
                        CHECK (durum IN ('beklemede', 'odendi', 'reddedildi')),
  dekont_url          TEXT         NULL,
  odeme_tarihi        DATE         NULL,
  onaylayan_user_id   UUID         NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT payments_contract_donem_unique UNIQUE (contract_id, donem)
);

-- b) Indexler
CREATE INDEX idx_payments_contract_id     ON payments(contract_id);
CREATE INDEX idx_payments_organization_id ON payments(organization_id);
CREATE INDEX idx_payments_contract_vade   ON payments(contract_id, vade_tarihi);

-- c) RLS aç (INSERT policy yok → default deny; tek insert yolu RPC)
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- d) Helper: user_can_access_contract
--    contracts tablosunun SELECT RLS policy'sindeki bağ mantığını birebir yansıtır.
--    SECURITY DEFINER: payments RLS'den çağrılırken contracts'a erişmek için gerekli.
CREATE OR REPLACE FUNCTION user_can_access_contract(p_contract_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM contracts c
    WHERE c.id = p_contract_id
      AND c.organization_id = auth_org_id()
      AND (
        auth_role() = 'emlakci'
        OR c.mal_sahibi_user_id = auth.uid()
        OR c.kiraci_user_id     = auth.uid()
      )
  )
$$;

-- e) SELECT policy — emlakci: org'daki tüm ödemeler
CREATE POLICY "payments_select_emlakci"
  ON payments FOR SELECT TO authenticated
  USING (
    organization_id = auth_org_id()
    AND auth_role() = 'emlakci'
  );

-- e) SELECT policy — mal_sahibi / kiraci: sadece kendi sözleşmesinin ödemeleri
CREATE POLICY "payments_select_taraflar"
  ON payments FOR SELECT TO authenticated
  USING (
    auth_role() IN ('mal_sahibi', 'kiraci')
    AND user_can_access_contract(contract_id)
  );

-- f) INSERT policy YOK → RLS ON + policy yok = default deny (sadece RPC insert edebilir)

-- g) RPC: create_payment_schedule(p_contract_id UUID) → INTEGER
--    SECURITY DEFINER: RLS'i bypass eder; yetki içeride elle doğrulanır.
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
  -- 1. Kimlik doğrulama
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Kimlik doğrulama gerekli';
  END IF;

  -- 2. Rol kontrolü
  v_role := auth_role();
  IF v_role <> 'emlakci' THEN
    RAISE EXCEPTION 'Sadece emlakçı ödeme planı oluşturabilir';
  END IF;

  -- 3. Sözleşmeyi çek; cross-org engeli
  SELECT * INTO v_contract FROM contracts WHERE id = p_contract_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sözleşme bulunamadı: %', p_contract_id;
  END IF;

  v_org_id := auth_org_id();
  IF v_contract.organization_id <> v_org_id THEN
    RAISE EXCEPTION 'Bu sözleşmeye erişim yetkiniz yok';
  END IF;

  -- 4. Guard: bu sözleşmede zaten ödeme kaydı varsa 0 dön
  IF EXISTS (SELECT 1 FROM payments WHERE contract_id = p_contract_id) THEN
    RETURN 0;
  END IF;

  -- 5. Başlangıç tarihi + kira tutarını doğrula
  v_baslangic := v_contract.tarih;
  IF v_baslangic IS NULL THEN
    RAISE EXCEPTION 'Sözleşme başlangıç tarihi eksik';
  END IF;

  v_aylik_kira_kurus := v_contract.aylik_kira_kurus;
  IF v_aylik_kira_kurus IS NULL OR v_aylik_kira_kurus <= 0 THEN
    RAISE EXCEPTION 'Geçersiz aylık kira tutarı: %', v_contract.aylik_kira_kurus;
  END IF;

  -- 6. Vade günü: başlangıç tarihinin günü (ay-sonu clamp aşağıdaki INSERT'te)
  v_vade_gun := EXTRACT(DAY FROM v_baslangic)::INTEGER;

  -- 7. 12 aylık plan — set-based, atomik INSERT
  --
  --    donem      = ayın ilk günü (date_trunc + n ay)
  --    vade_tarihi = LEAST(vade_gun, son_gün_o_ay) → ay-sonu clamp
  --
  --    Clamp örneği: 2026-03-31 başlangıç, n=1 (Nisan)
  --      donem = 2026-04-01
  --      son_gün_nisan = EXTRACT(DAY FROM 2026-05-01 - 1 gün) = 30
  --      LEAST(31, 30) = 30 → vade = 2026-04-01 + 29 gün = 2026-04-30
  --
  --    Artık yıl: 2028-01-31, n=1 (Şubat)
  --      son_gün_şubat_2028 = 29 → vade = 2028-02-29
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
  RETURN v_inserted;

EXCEPTION
  -- Eşzamanlı çift basış EXISTS guard'ı geçip UNIQUE'e çarparsa 0 dön.
  -- Auth/yetki RAISE'leri (raise_exception class) bu bloktan geçmez.
  WHEN unique_violation THEN
    RETURN 0;
END;
$$;

-- h) Grant / Revoke
GRANT  EXECUTE ON FUNCTION user_can_access_contract(UUID) TO authenticated;
GRANT  EXECUTE ON FUNCTION create_payment_schedule(UUID)  TO authenticated;
REVOKE EXECUTE ON FUNCTION user_can_access_contract(UUID) FROM public;
REVOKE EXECUTE ON FUNCTION create_payment_schedule(UUID)  FROM public;
