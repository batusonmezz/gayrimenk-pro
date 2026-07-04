-- Geriye donuk belgeleme: bu migration canliya Dashboard uzerinden
-- daha once uygulandi (orijinal ad: 016_storage_buckets). Repo senkronu icin
-- buraya yazildi. Idempotent olmasi icin IF NOT EXISTS / DROP POLICY IF EXISTS kullan.

-- Bucket'lar (avatars 019'da var, tekrar eklenmez)
INSERT INTO storage.buckets (id, name, public)
VALUES ('kimlik-belgeleri', 'kimlik-belgeleri', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('dekontlar', 'dekontlar', false)
ON CONFLICT (id) DO NOTHING;

-- kimlik-belgeleri: emlakci-only (4 policy)
DROP POLICY IF EXISTS "kimlik_emlakci_select" ON storage.objects;
CREATE POLICY "kimlik_emlakci_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'kimlik-belgeleri'
    AND (storage.foldername(name))[1] = auth_org_id()::text
    AND auth_role() = 'emlakci'
  );

DROP POLICY IF EXISTS "kimlik_emlakci_insert" ON storage.objects;
CREATE POLICY "kimlik_emlakci_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'kimlik-belgeleri'
    AND (storage.foldername(name))[1] = auth_org_id()::text
    AND auth_role() = 'emlakci'
  );

DROP POLICY IF EXISTS "kimlik_emlakci_update" ON storage.objects;
CREATE POLICY "kimlik_emlakci_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'kimlik-belgeleri'
    AND (storage.foldername(name))[1] = auth_org_id()::text
    AND auth_role() = 'emlakci'
  )
  WITH CHECK (
    bucket_id = 'kimlik-belgeleri'
    AND (storage.foldername(name))[1] = auth_org_id()::text
    AND auth_role() = 'emlakci'
  );

DROP POLICY IF EXISTS "kimlik_emlakci_delete" ON storage.objects;
CREATE POLICY "kimlik_emlakci_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'kimlik-belgeleri'
    AND (storage.foldername(name))[1] = auth_org_id()::text
    AND auth_role() = 'emlakci'
  );

-- dekontlar: taraflar okur/yazar, sadece emlakci siler (4 policy)
DROP POLICY IF EXISTS "dekont_taraf_select" ON storage.objects;
CREATE POLICY "dekont_taraf_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'dekontlar'
    AND (storage.foldername(name))[1] = auth_org_id()::text
    AND user_can_access_contract(((storage.foldername(name))[2])::uuid)
  );

DROP POLICY IF EXISTS "dekont_taraf_insert" ON storage.objects;
CREATE POLICY "dekont_taraf_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'dekontlar'
    AND (storage.foldername(name))[1] = auth_org_id()::text
    AND user_can_access_contract(((storage.foldername(name))[2])::uuid)
  );

DROP POLICY IF EXISTS "dekont_taraf_update" ON storage.objects;
CREATE POLICY "dekont_taraf_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'dekontlar'
    AND (storage.foldername(name))[1] = auth_org_id()::text
    AND user_can_access_contract(((storage.foldername(name))[2])::uuid)
  )
  WITH CHECK (
    bucket_id = 'dekontlar'
    AND (storage.foldername(name))[1] = auth_org_id()::text
    AND user_can_access_contract(((storage.foldername(name))[2])::uuid)
  );

DROP POLICY IF EXISTS "dekont_emlakci_delete" ON storage.objects;
CREATE POLICY "dekont_emlakci_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'dekontlar'
    AND (storage.foldername(name))[1] = auth_org_id()::text
    AND auth_role() = 'emlakci'
  );
