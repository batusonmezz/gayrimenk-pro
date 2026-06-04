# Gayrimenk Pro — Claude Çalışma Notu

React Native / Expo gayrimenkul sözleşme yönetim uygulaması.
Multi-tenant SaaS mimarisi (Supabase + Claude API).

---

## Faz 3 Durumu (04.06.2026)

### TAMAMLANAN

**Faz 3.1 — DB şeması** (commit `38e7872`)
- Migration `004_roles_and_contract_parties.sql`
- `users.role` sütunu: `TEXT NOT NULL DEFAULT 'emlakci'` CHECK `(emlakci|mal_sahibi|kiraci)`
- `contracts.mal_sahibi_user_id` + `kiraci_user_id`: `UUID, ON DELETE SET NULL`
- `idx_contracts_mal_sahibi` + `idx_contracts_kiraci` index'leri

**Signup bug fix — DB trigger** (commit `e9de6f5`, `3d3180a`)
- Migration `006_signup_trigger.sql`
- `handle_new_user()` SECURITY DEFINER + trigger `on_auth_user_created` (AFTER INSERT ON auth.users)
- `auth.users` INSERT'te otomatik `public.organizations` + `public.users` (role=emlakci) oluşturur
- Atomik transaction: org/users/auth ya hep ya hiç — yarım hesap artık imkansız
- Kök sebep: client `organizations INSERT` sırasında `auth.uid()` timing kaynaklı
  "violates RLS" hatası. Trigger (SECURITY DEFINER) bu bağımlılığı ortadan kaldırdı.
- `src/services/auth.ts` `signUp()`: client org/users INSERT kaldırıldı, trigger sonrası
  `users` tablosundan `org_id` fetch edilir.

**Faz 3.2 — Rol bazlı RLS** (commit `42eb7f1`)
- Migration `005_role_based_rls.sql`
- `auth_org_id()` + `auth_role()` — STABLE SECURITY DEFINER helper fonksiyonlar, `SET search_path = public, pg_temp`
- `contracts` SELECT: org izolasyonu + rol dallanması
  - `emlakci` → org'daki tüm sözleşmeler
  - `mal_sahibi` → sadece `mal_sahibi_user_id = auth.uid()` olanlar
  - `kiraci` → sadece `kiraci_user_id = auth.uid()` olanlar
- `contracts` INSERT/UPDATE/DELETE: sadece `emlakci`
- `contract_items` / `contract_photos`: değişmedi — contracts SELECT üzerinden otomatik filtreleniyor
- **Test edildi:** mal sahibi 1 sözleşme görüyor, cloud'a yazamıyor (42501 RLS reddi)

**Faz 3.4a — HomeScreen kullanıcı bilgisi** (commit `630fc6d`)
- `authState.ts`: role + email getter/setter eklendi
- `auth.ts`: `AuthUser.role`, `getCurrentUser`/`signIn`/`signUp` SELECT role + `setRole`/`setEmail`
- `App.tsx`: INITIAL_SESSION `setRole`
- `HomeScreen.tsx`: header'da email + Türkçe rol badge, timing fallback (cache/getCurrentUser)
- `roleTurkce` helper: `emlakci`→Emlakçı, `mal_sahibi`→Mal Sahibi, `kiraci`→Kiracı
- **Test edildi:** email + rol badge görünüyor. tsc temiz.

**Faz 3.4b — Rol bazlı buton görünürlüğü** (commit `c82db8e`)
- "Sözleşme Oluştur" butonu sadece `emlakci` rolünde görünüyor

**Faz 3.4c — Mal Sahipleri kartı rol bazlı** (commit `36e9c99`)
- Mal sahibi / kiracı rolleri Mal Sahipleri kartını göremez

**Production fix — Düzenleme veri kaybı + loading** (commit `5d24c2a`)
- `KayitlarScreen` düzenle navigate'ine `fotograflar` + `esyaListesi` eklendi
- `FormScreen` route.params'tan bunları okuyup useState başlangıcına veriyor
- `SupabaseStorageService`: `fotograflar` guard güçlendirildi (boş `{}` gelince mevcut korunur)
- `KayitlarScreen` + `ListeScreen`: loading state + `ActivityIndicator` + catch
- **Test edildi:** eşyalar düzenlemede dolu geliyor, kaydedince korunuyor, spinner çalışıyor. tsc temiz.
- **Açık:** fotoğraflar düzenlemede görünmüyor (veri korunuyor, sadece görüntüleme — ileride)

### GIT / PLAY DURUMU

- `origin/main` = `0c3ca52` (versionCode 12)
- **Play Store versionCode 12** yüklendi (04.06.2026): rol UI + eşya fix + loading
- Tüm Faz 3 commit'leri push edildi

### TEST VERİSİ (Supabase)

- `malsahibi@gmail.com` → `role=mal_sahibi`, `org_id=fd36bc75` (test1 org'u)
- test1'in sözleşmesi `81ea6596`'ya `mal_sahibi_user_id` olarak bağlı
- Faz 3.4 testinde bu hesapla mal sahibi UI'sini test edebilirsin

---

## Sıradaki

**Faz 3.5a — Ödeme takip sistemi (SONRAKİ):**
- `payments` tablosu migration: `contract_id`, `ay`, `tutar_kurus`, `odendi_mi`, `odeme_tarihi`
- 12 ay otomatik oluşturma (sözleşme kaydedilince)
- UI: ödeme listesi + işaretle

**Açık borçlar:**
- Fotoğraflar düzenlemede görünmüyor (veri korunuyor, sadece FormScreen UI — ayrı faz)
- Mal sahibi/kiracı karşı taraf görünürlüğü (kişi görünürlüğü)
- `ListeScreen` + `MalSahibiScreen` rol uyarlama

**Ertelenmiş:**
- **Faz 3.3** — Davet sistemi: `inviteUserByEmail` + SMTP
- **Faz 3.4 kalan** — `FormScreen` rol uyarlama (çok kompleks, ayrı faz)

---

## Teknik Notlar

- **Email onayı:** Şu an KAPALI (Supabase Auth settings). Production'da açılacak.
  Trigger zaten `needsEmailConfirmation` durumunu handle ediyor — sorun olmayacak.
- **Storage:** `USE_CLOUD_STORAGE=true` — HybridStorageService (Supabase önce, local fallback)
- **AI:** Claude Sonnet 4.6 via Supabase Edge Function proxy (+ direct fallback)
- **Migrations sırası:** 001 → 002 → 003 → 004 → 005 → 006 (hepsi Supabase'de çalıştırıldı)
