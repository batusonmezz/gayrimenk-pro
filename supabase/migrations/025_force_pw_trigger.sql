-- =============================================================================
-- 025_force_pw_trigger.sql  —  Y4: zorunlu sifre degistirme kapisini gercekten
--                              zorunlu yap (sunucu tarafi)
--
-- SORUN (Agustos denetimi Y4):
--   011_force_pw.sql'deki clear_must_change_password() parametresiz, kontrolsuz
--   ve authenticated'a acik. Giris yapmis herkes kendi JWT'siyle cagirip
--   bayragi dusurebiliyor — sifre degistirmeye gerek yok.
--
--   Ayrica ForcePasswordChangeScreen bayragi sifreyi degistirmeden ONCE
--   temizliyor: updateUser patlarsa (sifre politikasi, sebeke, ya da kullanici
--   kendisine verilen gecici sifreyi tekrar yazarsa) bayrak zaten silinmis
--   oluyor. Saldiri degil, normal kullanimda olusan siralama hatasi.
--
-- COZUM:
--   Bayrak artik istemcinin basabilecegi bir dugme degil; sifrenin GERCEKTEN
--   degismesinin SONUCU. auth.users uzerinde bir trigger, encrypted_password
--   degistiginde bayragi dusuruyor.
--
-- RPC NEDEN SILINMIYOR:
--   YAYINDAKI iOS build'i clear_must_change_password'u cagiriyor ve hata
--   alirsa updateUser'a HIC gecmiyor (ForcePasswordChangeScreen:42-43).
--   Fonksiyon silinirse davet edilen kullanicilar o build'de sifrelerini
--   degistiremez, kapida kilitli kalir. Bu yuzden fonksiyon NO-OP'a cevriliyor:
--   eski build hatasiz devam eder, sifreyi degistirir, trigger bayragi duser.
--   updateUser patlarsa bayrak DURUR — yani 4. yol eski build'de de kapanir.
--   Fonksiyon, build 4 kullanicilara yayildiktan SONRA silinebilir (acik borc).
-- =============================================================================

BEGIN;

-- 1) Sifre degisince bayragi dusuren fonksiyon
CREATE OR REPLACE FUNCTION public.handle_password_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.users
     SET must_change_password = false
   WHERE id = NEW.id
     AND must_change_password = true;
  RETURN NEW;
END;
$$;

-- 2) Trigger — yalnizca sifre GERCEKTEN degistiginde ateslenir.
--    WHEN kosulu sayesinde e-posta onayi, son giris zamani gibi diger
--    auth.users guncellemelerinde calismaz.
DROP TRIGGER IF EXISTS on_auth_password_changed ON auth.users;
CREATE TRIGGER on_auth_password_changed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.encrypted_password IS DISTINCT FROM NEW.encrypted_password)
  EXECUTE FUNCTION public.handle_password_changed();

-- 3) Eski RPC NO-OP'a cevriliyor (silinmiyor — yukaridaki gerekceye bak).
--    Imza ayni kaliyor: clear_must_change_password() RETURNS void.
CREATE OR REPLACE FUNCTION public.clear_must_change_password()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- NO-OP. Bayrak artik yalnizca on_auth_password_changed trigger'i ile
  -- temizlenir. Bu fonksiyon sadece YAYINDAKI eski build kirilmasin diye
  -- duruyor; build 4 yayilinca DROP edilecek.
  RETURN;
END;
$$;

COMMIT;

-- =============================================================================
-- DOGRULAMA (Dashboard SQL Editor'de, TEST org'unda)
--
-- 1) Trigger kuruldu mu:
--    SELECT tgname, tgenabled FROM pg_trigger
--     WHERE tgrelid = 'auth.users'::regclass AND NOT tgisinternal;
--    -> on_auth_user_created ve on_auth_password_changed goruunmeli
--
-- 2) RPC artik hicbir sey yapmiyor mu:
--    Bir test kullanicisinin bayragini true yap:
--      UPDATE public.users SET must_change_password = true WHERE id = '<test-user-id>';
--    Uygulamadan (o kullanici olarak) rpc('clear_must_change_password') cagir.
--    Sonra:
--      SELECT must_change_password FROM public.users WHERE id = '<test-user-id>';
--    -> HALA true olmali. false donduyse NO-OP uygulanmamis demektir.
--
-- 3) Sifre degisince bayrak dusuyor mu:
--    Bayrak true iken uygulamadan sifreyi degistir.
--    -> must_change_password false olmali.
--
-- DIKKAT: K1 duzeltmesinde eklenen protect_user_privileges_trg (BEFORE UPDATE
-- ON public.users) bu UPDATE'i engelleyebilir. O trigger yalnizca role ve
-- organization_id degisimini reddediyorsa sorun yok. 3. adim calismazsa once
-- o trigger'in tanimina bakilmali:
--   SELECT pg_get_functiondef(p.oid) FROM pg_proc p
--    JOIN pg_trigger t ON t.tgfoid = p.oid
--   WHERE t.tgname = 'protect_user_privileges_trg';
-- =============================================================================
