-- ============================================================
-- Gayrimenk Pro – Initial Schema (Faz 1.2)
-- Supabase SQL Editor'da çalıştır.
-- RLS politikaları Faz 2'de tenant izolasyonuna göre güncellenecek.
-- ============================================================

-- updated_at otomatik güncelleme fonksiyonu
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- organizations (Faz 2 placeholder – multi-tenant zemin)
-- ------------------------------------------------------------
CREATE TABLE organizations (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ------------------------------------------------------------
-- users (Supabase auth.users ile eşleşir, Faz 2'de aktif olur)
-- ------------------------------------------------------------
CREATE TABLE users (
  id              UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID        REFERENCES organizations(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ------------------------------------------------------------
-- contracts (SozlesmeKayit'in Postgres karşılığı)
-- ------------------------------------------------------------
CREATE TABLE contracts (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tur              TEXT        NOT NULL,
  tarih            DATE        NOT NULL,
  kiraci_ad        TEXT        NOT NULL,
  kiraya_veren_ad  TEXT        NOT NULL,
  aylik_kira_kurus INTEGER     NOT NULL,           -- kuruş (TL * 100), decimal yok
  form_data        JSONB       NOT NULL DEFAULT '{}',  -- formData: Record<string,string>
  sozlesme_metni   TEXT        NOT NULL DEFAULT '',
  ozel_maddeler    TEXT[]      NOT NULL DEFAULT '{}',
  genel_maddeler   TEXT[]      NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ------------------------------------------------------------
-- contract_photos (fotograflar – Supabase Storage path referansları)
-- ------------------------------------------------------------
CREATE TABLE contract_photos (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id  UUID        NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  photo_key    TEXT        NOT NULL,    -- ör: 'kimlik_on', 'kimlik_arka', 'tapu'
  storage_path TEXT        NOT NULL,   -- Supabase Storage bucket içindeki path
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON contract_photos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ------------------------------------------------------------
-- contract_items (esyaListesi – demirbaş/eşya tablosu)
-- ------------------------------------------------------------
CREATE TABLE contract_items (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID        NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  ad          TEXT        NOT NULL,
  marka       TEXT        NOT NULL DEFAULT '',
  adet        INTEGER     NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON contract_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Row Level Security (İlk versiyon – Faz 2'de tenant'a göre daraltılacak)
-- ============================================================
ALTER TABLE organizations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_photos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_items   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_all" ON organizations   FOR ALL TO authenticated USING (true);
CREATE POLICY "authenticated_all" ON users           FOR ALL TO authenticated USING (true);
CREATE POLICY "authenticated_all" ON contracts       FOR ALL TO authenticated USING (true);
CREATE POLICY "authenticated_all" ON contract_photos FOR ALL TO authenticated USING (true);
CREATE POLICY "authenticated_all" ON contract_items  FOR ALL TO authenticated USING (true);

-- ============================================================
-- Indexes (performance optimization)
-- ============================================================
CREATE INDEX idx_users_organization_id     ON users(organization_id);
CREATE INDEX idx_contracts_tarih           ON contracts(tarih DESC);
CREATE INDEX idx_contracts_kiraci_ad       ON contracts(kiraci_ad);
CREATE INDEX idx_contract_photos_contract  ON contract_photos(contract_id);
CREATE INDEX idx_contract_items_contract   ON contract_items(contract_id);
