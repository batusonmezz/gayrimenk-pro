BEGIN;

-- ============================================================
-- Yardımcı fonksiyonlar (STABLE + SECURITY DEFINER + sabit search_path)
-- ============================================================

CREATE OR REPLACE FUNCTION auth_org_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT organization_id FROM users WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION auth_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT role FROM users WHERE id = auth.uid()
$$;

-- ============================================================
-- contracts: 003'teki 4 policy DROP
-- ============================================================

DROP POLICY "contracts_select" ON contracts;
DROP POLICY "contracts_insert" ON contracts;
DROP POLICY "contracts_update" ON contracts;
DROP POLICY "contracts_delete" ON contracts;

-- ============================================================
-- contracts: Rol bazlı yeni 4 policy
-- ============================================================

-- SELECT: org izolasyonu + rol dallanması
--   emlakci    → org'daki tüm sözleşmeler
--   mal_sahibi → sadece mal_sahibi_user_id = auth.uid() olanlar
--   kiraci     → sadece kiraci_user_id = auth.uid() olanlar
CREATE POLICY "contracts_select"
  ON contracts FOR SELECT TO authenticated
  USING (
    organization_id = auth_org_id()
    AND (
      auth_role() = 'emlakci'
      OR mal_sahibi_user_id = auth.uid()
      OR kiraci_user_id     = auth.uid()
    )
  );

-- INSERT: sadece emlakci
CREATE POLICY "contracts_insert"
  ON contracts FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = auth_org_id()
    AND auth_role() = 'emlakci'
  );

-- UPDATE: sadece emlakci (hem mevcut satır hem yeni değer kontrol edilir)
CREATE POLICY "contracts_update"
  ON contracts FOR UPDATE TO authenticated
  USING (
    organization_id = auth_org_id()
    AND auth_role() = 'emlakci'
  )
  WITH CHECK (
    organization_id = auth_org_id()
    AND auth_role() = 'emlakci'
  );

-- DELETE: sadece emlakci
CREATE POLICY "contracts_delete"
  ON contracts FOR DELETE TO authenticated
  USING (
    organization_id = auth_org_id()
    AND auth_role() = 'emlakci'
  );

-- ============================================================
-- contract_items + contract_photos: DOKUNULMUYOR
-- PostgreSQL, contract_items/photos policy'lerindeki
-- "contract_id IN (SELECT id FROM contracts WHERE ...)" subquery'sini
-- contracts_select policy'sine tabi çalıştırır.
-- mal_sahibi/kiraci, kendi görebildiği sözleşmelerin items/photos'larını
-- otomatik olarak görür — ek policy değişikliği gerekmez.
-- ============================================================

COMMIT;

/*
-- ROLLBACK (003'teki haline dön — gerekirse elle çalıştır):

DROP FUNCTION IF EXISTS auth_org_id();
DROP FUNCTION IF EXISTS auth_role();

DROP POLICY IF EXISTS "contracts_select" ON contracts;
DROP POLICY IF EXISTS "contracts_insert" ON contracts;
DROP POLICY IF EXISTS "contracts_update" ON contracts;
DROP POLICY IF EXISTS "contracts_delete" ON contracts;

CREATE POLICY "contracts_select"
  ON contracts FOR SELECT TO authenticated
  USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "contracts_insert"
  ON contracts FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "contracts_update"
  ON contracts FOR UPDATE TO authenticated
  USING     (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "contracts_delete"
  ON contracts FOR DELETE TO authenticated
  USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));
*/
