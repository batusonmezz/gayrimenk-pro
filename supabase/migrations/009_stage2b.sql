-- persons: arka kimlik foto slotu + banka/ödeme bilgisi
ALTER TABLE persons
  ADD COLUMN kimlik_foto_arka_url TEXT NULL,
  ADD COLUMN odeme_bilgisi        TEXT NULL;

-- buildings: sözleşme form alanlarıyla 1:1 yeni kolonlar
-- (008'den il, ilce, acik_adres kolonları atıl kalır — tablo boş olduğu için sorun yok)
ALTER TABLE buildings
  ADD COLUMN il_ilce     TEXT NULL,
  ADD COLUMN cadde_sokak TEXT NULL,
  ADD COLUMN kapi_no     TEXT NULL;

-- contracts: site + mal sahibi FK'ları
-- (unit_id 008'den kaldı; bu akışta kullanılmaz)
ALTER TABLE contracts
  ADD COLUMN building_id          UUID NULL REFERENCES buildings(id) ON DELETE SET NULL,
  ADD COLUMN mal_sahibi_person_id UUID NULL REFERENCES persons(id)   ON DELETE SET NULL;
