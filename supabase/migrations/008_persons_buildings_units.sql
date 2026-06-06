-- Faz 4: Mülk & Kişi Modeli — persons + buildings + units + contracts additive kolonları

-- ── a) persons ────────────────────────────────────────────────────────────────
CREATE TABLE persons (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID        NOT NULL REFERENCES organizations(id),
  ad_soyad          TEXT        NOT NULL,
  tc_kimlik         TEXT        NULL,
  telefon           TEXT        NULL,
  adres             TEXT        NULL,
  kimlik_foto_url   TEXT        NULL,
  user_id           UUID        NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── b) buildings ──────────────────────────────────────────────────────────────
CREATE TABLE buildings (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID        NOT NULL REFERENCES organizations(id),
  ad                TEXT        NOT NULL,
  il                TEXT        NULL,
  ilce              TEXT        NULL,
  mahalle           TEXT        NULL,
  acik_adres        TEXT        NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── c) units ──────────────────────────────────────────────────────────────────
CREATE TABLE units (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID        NOT NULL REFERENCES organizations(id),
  building_id           UUID        NOT NULL REFERENCES buildings(id) ON DELETE RESTRICT,
  blok                  TEXT        NULL,
  kat                   TEXT        NULL,
  daire_no              TEXT        NULL,
  mal_sahibi_person_id  UUID        NULL REFERENCES persons(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── d) contracts: additive nullable kolonlar ──────────────────────────────────
--    NULL + DEFAULT yok → mevcut satırlar NULL kalır, sıfır bozulma
ALTER TABLE contracts
  ADD COLUMN unit_id          UUID NULL REFERENCES units(id)   ON DELETE SET NULL,
  ADD COLUMN kiraci_person_id UUID NULL REFERENCES persons(id) ON DELETE SET NULL;

-- ── e) Indexler ───────────────────────────────────────────────────────────────
CREATE INDEX idx_persons_organization_id   ON persons(organization_id);
CREATE INDEX idx_buildings_organization_id ON buildings(organization_id);
CREATE INDEX idx_units_organization_id     ON units(organization_id);
CREATE INDEX idx_units_building_id         ON units(building_id);
CREATE INDEX idx_units_mal_sahibi          ON units(mal_sahibi_person_id);
CREATE INDEX idx_contracts_unit_id         ON contracts(unit_id);
CREATE INDEX idx_contracts_kiraci_person   ON contracts(kiraci_person_id);

-- Partial unique: aynı org'da aynı TC iki kişide olamaz (NULL'lar hariç)
CREATE UNIQUE INDEX idx_persons_org_tc
  ON persons(organization_id, tc_kimlik)
  WHERE tc_kimlik IS NOT NULL;

-- ── f) RLS — persons ──────────────────────────────────────────────────────────
--    Faz 4: emlakci-only. Taraf (mal_sahibi/kiraci) erişimi ertelendi (Faz 3.3 davet).
ALTER TABLE persons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "persons_select"
  ON persons FOR SELECT TO authenticated
  USING (organization_id = auth_org_id() AND auth_role() = 'emlakci');

CREATE POLICY "persons_insert"
  ON persons FOR INSERT TO authenticated
  WITH CHECK (organization_id = auth_org_id() AND auth_role() = 'emlakci');

CREATE POLICY "persons_update"
  ON persons FOR UPDATE TO authenticated
  USING  (organization_id = auth_org_id() AND auth_role() = 'emlakci')
  WITH CHECK (organization_id = auth_org_id() AND auth_role() = 'emlakci');

CREATE POLICY "persons_delete"
  ON persons FOR DELETE TO authenticated
  USING (organization_id = auth_org_id() AND auth_role() = 'emlakci');

-- ── g) RLS — buildings ────────────────────────────────────────────────────────
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "buildings_select"
  ON buildings FOR SELECT TO authenticated
  USING (organization_id = auth_org_id() AND auth_role() = 'emlakci');

CREATE POLICY "buildings_insert"
  ON buildings FOR INSERT TO authenticated
  WITH CHECK (organization_id = auth_org_id() AND auth_role() = 'emlakci');

CREATE POLICY "buildings_update"
  ON buildings FOR UPDATE TO authenticated
  USING  (organization_id = auth_org_id() AND auth_role() = 'emlakci')
  WITH CHECK (organization_id = auth_org_id() AND auth_role() = 'emlakci');

CREATE POLICY "buildings_delete"
  ON buildings FOR DELETE TO authenticated
  USING (organization_id = auth_org_id() AND auth_role() = 'emlakci');

-- ── h) RLS — units ────────────────────────────────────────────────────────────
ALTER TABLE units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "units_select"
  ON units FOR SELECT TO authenticated
  USING (organization_id = auth_org_id() AND auth_role() = 'emlakci');

CREATE POLICY "units_insert"
  ON units FOR INSERT TO authenticated
  WITH CHECK (organization_id = auth_org_id() AND auth_role() = 'emlakci');

CREATE POLICY "units_update"
  ON units FOR UPDATE TO authenticated
  USING  (organization_id = auth_org_id() AND auth_role() = 'emlakci')
  WITH CHECK (organization_id = auth_org_id() AND auth_role() = 'emlakci');

CREATE POLICY "units_delete"
  ON units FOR DELETE TO authenticated
  USING (organization_id = auth_org_id() AND auth_role() = 'emlakci');
