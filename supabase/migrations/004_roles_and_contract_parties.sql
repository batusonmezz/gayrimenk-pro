BEGIN;

-- 1. users tablosuna role sütunu
--    Mevcut kullanıcılar otomatik 'emlakci' olur (DEFAULT)
ALTER TABLE users
  ADD COLUMN role TEXT NOT NULL DEFAULT 'emlakci'
    CHECK (role IN ('emlakci', 'mal_sahibi', 'kiraci'));

-- 2. contracts tablosuna kişi bağları
--    ON DELETE SET NULL: kullanıcı silinse sözleşme kalır, bağ kopar
ALTER TABLE contracts
  ADD COLUMN mal_sahibi_user_id UUID
    REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE contracts
  ADD COLUMN kiraci_user_id UUID
    REFERENCES users(id) ON DELETE SET NULL;

-- 3. Index (RLS bu sütunlara bakacak — performans)
CREATE INDEX idx_contracts_mal_sahibi ON contracts(mal_sahibi_user_id);
CREATE INDEX idx_contracts_kiraci    ON contracts(kiraci_user_id);

COMMIT;

/*
-- ROLLBACK (gerekirse elle çalıştır):

DROP INDEX IF EXISTS idx_contracts_kiraci;
DROP INDEX IF EXISTS idx_contracts_mal_sahibi;
ALTER TABLE contracts DROP COLUMN IF EXISTS kiraci_user_id;
ALTER TABLE contracts DROP COLUMN IF EXISTS mal_sahibi_user_id;
ALTER TABLE users     DROP COLUMN IF EXISTS role;
*/
