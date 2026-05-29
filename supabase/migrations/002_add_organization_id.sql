-- ============================================================
-- Faz 2.5 — contracts tablosuna organization_id eklendi
-- (Supabase'de manuel çalıştırıldı, bu dosya kayıt amaçlı)
-- ============================================================

-- contracts tablosuna organization_id sütunu
ALTER TABLE contracts
  ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- organization_id için index (RLS sorguları için)
CREATE INDEX idx_contracts_organization_id ON contracts(organization_id);
