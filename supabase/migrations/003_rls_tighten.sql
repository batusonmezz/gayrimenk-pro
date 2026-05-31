BEGIN;

-- ============================================================
-- DROP: Eski gevşek policy'ler (her iki isim, IF EXISTS güvenli)
-- ============================================================
DROP POLICY IF EXISTS "authenticated_all"      ON users;
DROP POLICY IF EXISTS "anon_authenticated_all" ON users;

DROP POLICY IF EXISTS "authenticated_all"      ON organizations;
DROP POLICY IF EXISTS "anon_authenticated_all" ON organizations;

DROP POLICY IF EXISTS "authenticated_all"      ON contracts;
DROP POLICY IF EXISTS "anon_authenticated_all" ON contracts;

DROP POLICY IF EXISTS "authenticated_all"      ON contract_items;
DROP POLICY IF EXISTS "anon_authenticated_all" ON contract_items;

DROP POLICY IF EXISTS "authenticated_all"      ON contract_photos;
DROP POLICY IF EXISTS "anon_authenticated_all" ON contract_photos;

-- ============================================================
-- users: SADECE auth.uid() — users'a subquery YOK (recursion riski)
-- ============================================================
CREATE POLICY "users_select"
  ON users FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "users_insert"
  ON users FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "users_update"
  ON users FOR UPDATE TO authenticated
  USING     (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "users_delete"
  ON users FOR DELETE TO authenticated
  USING (id = auth.uid());

-- ============================================================
-- organizations
-- ============================================================
CREATE POLICY "orgs_select"
  ON organizations FOR SELECT TO authenticated
  USING (id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Signup akışı: users satırı henüz yok → NOT EXISTS TRUE → INSERT izni
-- Mevcut kullanıcı: users satırı var, org dolu → FALSE → engel
CREATE POLICY "orgs_insert"
  ON organizations FOR INSERT TO authenticated
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM users
      WHERE id              = auth.uid()
        AND organization_id IS NOT NULL
    )
  );

CREATE POLICY "orgs_update"
  ON organizations FOR UPDATE TO authenticated
  USING     (id = (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Sadece orphan org silinebilir (signup rollback için)
CREATE POLICY "orgs_delete"
  ON organizations FOR DELETE TO authenticated
  USING (
    NOT EXISTS (
      SELECT 1 FROM users
      WHERE organization_id = id
    )
  );

-- ============================================================
-- contracts (organization_id migration 002'de eklendi)
-- ============================================================
CREATE POLICY "contracts_select"
  ON contracts FOR SELECT TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "contracts_insert"
  ON contracts FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "contracts_update"
  ON contracts FOR UPDATE TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
  WITH CHECK (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "contracts_delete"
  ON contracts FOR DELETE TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- ============================================================
-- contract_items (organization_id yok — contract_id üzerinden)
-- ============================================================
CREATE POLICY "contract_items_select"
  ON contract_items FOR SELECT TO authenticated
  USING (
    contract_id IN (
      SELECT id FROM contracts
      WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "contract_items_insert"
  ON contract_items FOR INSERT TO authenticated
  WITH CHECK (
    contract_id IN (
      SELECT id FROM contracts
      WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "contract_items_update"
  ON contract_items FOR UPDATE TO authenticated
  USING (
    contract_id IN (
      SELECT id FROM contracts
      WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    contract_id IN (
      SELECT id FROM contracts
      WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "contract_items_delete"
  ON contract_items FOR DELETE TO authenticated
  USING (
    contract_id IN (
      SELECT id FROM contracts
      WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  );

-- ============================================================
-- contract_photos (contract_items ile aynı mantık)
-- ============================================================
CREATE POLICY "contract_photos_select"
  ON contract_photos FOR SELECT TO authenticated
  USING (
    contract_id IN (
      SELECT id FROM contracts
      WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "contract_photos_insert"
  ON contract_photos FOR INSERT TO authenticated
  WITH CHECK (
    contract_id IN (
      SELECT id FROM contracts
      WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "contract_photos_update"
  ON contract_photos FOR UPDATE TO authenticated
  USING (
    contract_id IN (
      SELECT id FROM contracts
      WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    contract_id IN (
      SELECT id FROM contracts
      WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "contract_photos_delete"
  ON contract_photos FOR DELETE TO authenticated
  USING (
    contract_id IN (
      SELECT id FROM contracts
      WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  );

COMMIT;

/*
============================================================
ROLLBACK 003 — Eski gevşek policy'lere geri dönmek için:
============================================================

BEGIN;

DROP POLICY IF EXISTS "users_select"           ON users;
DROP POLICY IF EXISTS "users_insert"           ON users;
DROP POLICY IF EXISTS "users_update"           ON users;
DROP POLICY IF EXISTS "users_delete"           ON users;

DROP POLICY IF EXISTS "orgs_select"            ON organizations;
DROP POLICY IF EXISTS "orgs_insert"            ON organizations;
DROP POLICY IF EXISTS "orgs_update"            ON organizations;
DROP POLICY IF EXISTS "orgs_delete"            ON organizations;

DROP POLICY IF EXISTS "contracts_select"       ON contracts;
DROP POLICY IF EXISTS "contracts_insert"       ON contracts;
DROP POLICY IF EXISTS "contracts_update"       ON contracts;
DROP POLICY IF EXISTS "contracts_delete"       ON contracts;

DROP POLICY IF EXISTS "contract_items_select"  ON contract_items;
DROP POLICY IF EXISTS "contract_items_insert"  ON contract_items;
DROP POLICY IF EXISTS "contract_items_update"  ON contract_items;
DROP POLICY IF EXISTS "contract_items_delete"  ON contract_items;

DROP POLICY IF EXISTS "contract_photos_select" ON contract_photos;
DROP POLICY IF EXISTS "contract_photos_insert" ON contract_photos;
DROP POLICY IF EXISTS "contract_photos_update" ON contract_photos;
DROP POLICY IF EXISTS "contract_photos_delete" ON contract_photos;

CREATE POLICY "authenticated_all" ON users           FOR ALL TO authenticated USING (true);
CREATE POLICY "authenticated_all" ON organizations   FOR ALL TO authenticated USING (true);
CREATE POLICY "authenticated_all" ON contracts       FOR ALL TO authenticated USING (true);
CREATE POLICY "authenticated_all" ON contract_items  FOR ALL TO authenticated USING (true);
CREATE POLICY "authenticated_all" ON contract_photos FOR ALL TO authenticated USING (true);

COMMIT;

============================================================
*/
