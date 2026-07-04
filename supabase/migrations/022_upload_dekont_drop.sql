-- Geriye donuk belgeleme (orijinal ad: 018_upload_dekont_drop).
-- Eski base64-tabanli upload_dekont fonksiyonunu kaldirir; yerine record_dekont
-- (Storage path tabanli) kullaniliyor.
--
-- Imza gecmisi:
--   013: upload_dekont(uuid, text)        olusturuldu
--   014: upload_dekont(uuid, text)        DROP; (uuid, text, text) olusturuldu
--   022: upload_dekont(uuid, text, text)  DROP  <-- bu migration

DROP FUNCTION IF EXISTS upload_dekont(uuid, text, text);
