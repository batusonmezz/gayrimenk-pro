# Gayrimenk Pro — Claude Çalışma Notu

React Native / Expo gayrimenkul sözleşme yönetim uygulaması.
Multi-tenant SaaS mimarisi (Supabase + Claude API).

---

## Faz 3 Durumu (01.06.2026)

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

### GIT DURUMU

- `origin/main` = `e5bd9f2` (Faz 2 sonu)
- Lokal Faz 3 commit'leri **henüz push edilmedi**: `38e7872`, `e9de6f5`, `3d3180a`, `42eb7f1`
- Faz 3 sonunda toplu push planlanıyor

### TEST VERİSİ (Supabase)

- `malsahibi@gmail.com` → `role=mal_sahibi`, `org_id=fd36bc75` (test1 org'u)
- test1'in sözleşmesi `81ea6596`'ya `mal_sahibi_user_id` olarak bağlı
- Faz 3.4 testinde bu hesapla mal sahibi UI'sini test edebilirsin

---

## Sıradaki — Faz 3.4: Rol Bazlı UI

**HomeScreen — kullanıcı bilgisi:**
- Giriş yapan email + rolü göster (Türkçe: `emlakci`→Emlakçı, `mal_sahibi`→Mal Sahibi, `kiraci`→Kiracı)

**Rol bazlı görünürlük:**
- `mal_sahibi` / `kiraci`: "sözleşme oluştur" butonlarını GÖRMEMELİ
  (şu an görüyor, lokale hayalet yazıyor — RLS engelliyor ama UI açık)
- `mal_sahibi` / `kiraci`: sadeleştirilmiş Home (kendi sözleşmeleri + kira takibi)

**KİŞİ GÖRÜNÜRLÜĞÜ:**
- Mal sahibi/kiracı sözleşmedeki karşı tarafı görebilmeli

**Geliştirilen ekranlar** (sıfırdan değil):
- `ListeScreen` (excel tablo görünümü)
- `MalSahibiScreen` (mal sahibi → mülk gruplama)
- `FormScreen`'e DOKUNMA (çok kompleks, ayrı faz)

---

## Sonraki Fazlar

- **Faz 3.3** — Davet sistemi: `inviteUserByEmail` + SMTP, mal sahibi/kiracıyı org'a davet
- **Faz 3.5** — Dekont / ödeme takip sistemi

---

## Teknik Notlar

- **Email onayı:** Şu an KAPALI (Supabase Auth settings). Production'da açılacak.
  Trigger zaten `needsEmailConfirmation` durumunu handle ediyor — sorun olmayacak.
- **Storage:** `USE_CLOUD_STORAGE=true` — HybridStorageService (Supabase önce, local fallback)
- **AI:** Claude Sonnet 4.6 via Supabase Edge Function proxy (+ direct fallback)
- **Migrations sırası:** 001 → 002 → 003 → 004 → 005 → 006 (hepsi Supabase'de çalıştırıldı)
