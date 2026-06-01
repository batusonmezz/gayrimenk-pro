BEGIN;

-- ============================================================
-- Yardımcı fonksiyon: yeni auth.users satırında org + user oluştur
-- SECURITY DEFINER → RLS bypass (client session bağlamına bağımlılık yok)
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_org_id UUID;
  org_name   TEXT;
BEGIN
  org_name := COALESCE(NULLIF(split_part(NEW.email, '@', 1), ''), 'Yeni Organizasyon');

  INSERT INTO public.organizations (name)
  VALUES (org_name)
  RETURNING id INTO new_org_id;

  INSERT INTO public.users (id, organization_id, role)
  VALUES (NEW.id, new_org_id, 'emlakci');

  RETURN NEW;
END;
$$;

-- ============================================================
-- Trigger: auth.users'a yeni satır eklenince handle_new_user() tetiklenir
-- AFTER INSERT → auth.users commit'iyle aynı transaction,
-- client signUp() yanıtı geldiğinde public.users/organizations garantili hazır
-- ============================================================

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

COMMIT;

/*
-- ROLLBACK (gerekirse elle çalıştır):

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();
*/
