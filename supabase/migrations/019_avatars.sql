-- 019_avatars.sql
-- Step 4-1: Profil fotografi altyapisi
-- Supabase Dashboard'da uygulandi (avatars public bucket + users.avatar_url).
-- Bu dosya repo kaydi icindir.

-- 1. users.avatar_url kolonu
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. avatars bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 3. RLS policy'leri (storage.objects uzerinde)

-- SELECT: public okuma
DROP POLICY IF EXISTS "avatars_select_public" ON storage.objects;
CREATE POLICY "avatars_select_public"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

-- INSERT: sadece kendi user_id'siyle baslayan dosya
DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
CREATE POLICY "avatars_insert_own"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND name LIKE auth.uid()::text || '.%'
  );

-- UPDATE: sadece kendi dosyasi (upsert icin gerekli)
DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
CREATE POLICY "avatars_update_own"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND name LIKE auth.uid()::text || '.%'
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND name LIKE auth.uid()::text || '.%'
  );

-- DELETE: sadece kendi dosyasi
DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
CREATE POLICY "avatars_delete_own"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND name LIKE auth.uid()::text || '.%'
  );
