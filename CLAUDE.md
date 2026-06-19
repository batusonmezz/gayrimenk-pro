# Gayrimenk Pro — Claude Çalışma Notu

React Native / Expo gayrimenkul sözleşme yönetim uygulaması.
Multi-tenant SaaS mimarisi (Supabase + Claude API).

---

## Faz 3 Durumu (06.06.2026)

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

**Faz 3.3 — Davet sistemi + zorunlu şifre** (Migration 010 + 011)
- `010_invite.sql`: `person_belongs_to_user(UUID)` helper (STABLE SECURITY DEFINER); `handle_new_user` davetli akışı (`raw_app_meta_data.organization_id` varsa role+person_id bağlar, yoksa 006 emlakçı akışı); `contracts_select` + `user_can_access_contract()` fonksiyonlarına `person_belongs_to_user(mal_sahibi_person_id / kiraci_person_id)` OR dalları eklendi
- `011_force_pw.sql`: `users.must_change_password BOOLEAN NOT NULL DEFAULT false` + `clear_must_change_password()` RPC (SECURITY DEFINER)
- `invite-user` Edge Function (`supabase/functions/invite-user/index.ts`): Deno, POST-only, Authorization header zorunlu
- `KisilerScreen.tsx` mevcut + App.tsx authenticated stack'te kayıtlı
- `ForcePasswordChangeScreen.tsx` mevcut + App.tsx'te login sonrası gate (mustChangePassword ? ForcePasswordChange : normal stack)
- **DURUM:** Kod tam + bağlı. Runtime teyidi (deployed mi + uçtan uca test) ayrıca yapılacak.

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

**Faz 3.5a — Ödeme takip sistemi altyapısı** (commit `54d2f3e`)
- Migration `007_payments.sql`: `payments` tablosu (`donem DATE`, `tutar_kurus INTEGER`, `vade_tarihi DATE`, `durum: beklemede|odendi|reddedildi`)
- RLS: `payments_select_emlakci` (org scope) + `payments_select_taraflar` (`user_can_access_contract` helper)
- `create_payment_schedule` RPC: emlakci-only SECURITY DEFINER, 12 ay set-based INSERT, ay-sonu clamp
- `KayitlarScreen`: "Ödeme Tablosu Oluştur" butonu (emlakci, count=0)
- **Test edildi:** 12 aylık plan oluşturuluyor, RLS reddi taraflarda doğrulandı

**Faz 3.5b — Ödeme takip ekranı** (commit `1cfeb03`)
- `src/screens/OdemeTakipScreen.tsx`: yeni ekran — contract bazlı ödeme listesi
  - RLS auto-scope: emlakci/kiraci/mal_sahibi tek sorgu, taraf yalnız kendi sözleşmesini görür
  - Özet kart: Tahsil Edilen / Kalan tutar + Ödendi/Bekliyor/Gecikti rozetleri
  - `gecikti` client-side hesaplanan: `durum==='beklemede' && vade < bugun` (DB'ye yazılmaz)
  - `parseYerelTarih`: local Date ctor — UTC/+3 kayması yok; `vade < bugun` strict (bugün vadeli = Bekliyor)
  - `formatTL`: integer kuruş arithmetic, float hatası imkansız
  - FlatList `flex:1` — özet sabit, liste scroll
  - Loading / hata / boş durum yönetimi
- `KayitlarScreen`: odemeCount gate `role===null`'a gevşetildi (taraflar da count çeker), buton 3'e bölündü (Oluştur emlakci-only / Takibi count>0 herkes)
- `App.tsx`: `OdemeTakip` stack kaydı
- Sıfır migration, versionCode değişmedi
- **Test edildi:** emlakçı 12 satır + özet, kiraci/mal_sahibi RLS gerçek-auth, gecikti/bugün/ödendi ayrımı, taraflarda "Oluştur" yok

**Faz 3.5c-1 — Payments depozito desteği** (10.06.2026)
- Migration `012_depozito.sql`: `tip` kolonu (`kira`|`depozito`), `donem`/`vade_tarihi`/`tutar_kurus` nullable, `tutar_kurus` CHECK yenilendi (NULL OR > 0), kontrat başına tek depozito partial unique index, mevcut sözleşmeler backfill
- `create_payment_schedule` güncellendi: 12 kira satırı + 1 depozito satırı oluşturur
- `OdemeTakipScreen`: `tip` kolonu çekilir; depozito satırı kira listesinin üstünde ayrı `hesaplaDepozitoDurum` helper ile gösterilir; özet kart sadece kiralardan hesaplanır (NaN riski yok)
- `KayitlarScreen`: `useSafeAreaInsets` — son kartın Android nav çubuğu arkasında kalması giderildi

**Faz 3.5c-2 — Dekont yükleme** (10.06.2026)
- Migration `013_dekont.sql`: `dekont_var` generated boolean kolon (`dekont_url IS NOT NULL STORED`) + `upload_dekont(p_payment_id, p_dekont)` RPC (SECURITY DEFINER; kiraci/emlakci yükleyebilir, onaylı ödeme korunur)
- `OdemeTakipScreen`: `dekont_var` çekilir; kira + depozito satırlarına `dekontAksiyon` — "Dekont Yükle" (kiraci/emlakci, dekont yoksa) / "Dekontu Gör" (herkese, dekont varsa); modal: slide + pageSheet, base64 Image; optimistik güncelleme (refetch yok)

**Faz 3.5c-2b — WebView dekont görüntüleme + PDF yükleme** (10.06.2026)
- Migration `014_dekont_mime.sql`: `payments.dekont_mime TEXT` kolonu + `upload_dekont` 3-arg (`p_mime`) olarak yeniden oluşturuldu; `image/*` veya `application/pdf` zorunlu
- `OdemeTakipScreen`: "Dekont Yükle" Alert menüsü → Fotoğraf (`expo-image-picker`) / PDF (`expo-document-picker` + `expo-file-system/legacy` base64) seçimi; `dekontGonder` ortak göndericiye `p_mime` eklendi
- Dekont görüntüleme: `ScrollView+Image` → `WebView`; foto için inline HTML + `maximum-scale=6` pinch-zoom; PDF için pdf.js 3.11 canvas render (tüm sayfalar)
- Yeni paketler: `react-native-webview`, `expo-document-picker`, `expo-dev-client`
- tsc temiz (pre-existing `.finally` latent hatası hariç)

**Faz 3.5d — Ödeme onay/red UI** (11.06.2026)
- Migration `015_odeme_onay.sql`: `approve_payment` + `reject_payment` RPC (SECURITY DEFINER, mal_sahibi + emlakci yetkili; `onaylayan_user_id` + `odeme_tarihi` yazımı)
- `OdemeTakipScreen`: `odemeDurumDegistir` ortak handler + `handleOnayla` / `handleReddet`; `dekontAksiyon` buton satırına dönüştürüldü (`aksiyonRow` + yeni `onayBtn`/`redBtn` stiller)
- Guard'lar: Onayla → `durum !== 'odendi'`; Reddet → yalnızca `beklemede`; Dekont Yükle → reddedilmişte "Yeniden Yükle" etiketi + `dekont_var` olsa bile yeniden yüklenebilir
- Optimistik güncelleme: RPC başarısında `setOdemeler` local state'i günceller, refetch yok
- Dekont/ödeme çekirdeği (3.5a–d) tamamlandı

### GIT / PLAY DURUMU

- `origin/main` = `1cfeb03` (versionCode 12)
- **Play Store versionCode 12** yüklendi (04.06.2026): rol UI + eşya fix + loading
- Faz 3.5a+3.5b push edildi (06.06.2026)

### BUILD / VARIANT SİSTEMİ (12.06.2026)

- `app.json` → `app.config.js`'e çevrildi. `APP_VARIANT` env ile 3 variant:
  - `production` (variant yok): `com.batusonmez.gayrimenkpro` / "Gayrimenk Pro" — Play'deki gerçek uygulama
  - `development`: `com.batusonmez.gayrimenkpro.dev` / "Gayrimenk Pro (Dev)" — dev-client APK
  - `preview`: `com.batusonmez.gayrimenkpro.preview` / "Gayrimenk Pro (Preview)"
- **versionCode 13** (sonraki Play gönderimi: 14). `appVersionSource: local`.
- `eas.json` `development`/`preview` profillerine `APP_VARIANT` env eklendi; `production: {}` değişmedi.
- `.dev` keystore production'dan AYRI (yeni üretildi); production keystore `Y-EnWS1ynJ` korundu.
- Production AAB (vc13) Play Console'a yüklendi; Internal testing rollout + telefona kurulum 12.06.
- Dev çalıştırma: `npx expo start --dev-client` (local `.env`'den `EXPO_PUBLIC_SUPABASE_URL` + `ANON_KEY` okunur).

### TEST VERİSİ (Supabase)

- `malsahibi@gmail.com` → `role=mal_sahibi`, `org_id=fd36bc75` (test1 org'u)
- test1'in sözleşmesi `81ea6596`'ya `mal_sahibi_user_id` olarak bağlı
- Faz 3.4 testinde bu hesapla mal sahibi UI'sini test edebilirsin

---

## Sıradaki

**✅ Push 1 — Giriş akışı görsel yenileme** (commit `f162159`, 18.06.2026)
- WelcomeScreen (rol seçim ekranı, Ionicons), roleLabel helper, LoginScreen role-param + göz ikonu + footer, ForcePasswordChangeScreen göz ikonu, HomeScreen yeni rol etiketleri, self-signup kapalı. @expo/vector-icons eklendi.

**Push 2 — Şifremi unuttum**
- `supabase.auth.resetPasswordForEmail` + deep-link (Expo Linking) + SMTP (Resend vb.)
- Var olan hesabın şifresini sıfırlar — re-invite DEĞİL (re-invite person↔user bağını koparır, sözleşmeleri kaybettirir)
- SMTP kurulumu Faz 6 e-posta onayı için de gerekli (ortak altyapı)

**Push 3 — Hesabımı sil**
- Apple App Store 5.1.1(v) zorunluluğu (iOS çıkışından önce şart)
- KVKK uyumu
- Arkadaki "kullanıcı sil" yolu ileride tahliye erişim iptalinde de kullanılacak
- Android çıkışını bloklamaz

**Sonra (sırasıyla):**
- Tahliye protokolü + erişim iptali (bkz. Gelecek bölümü)
- Logo yenileme (acele yok)

**Açık borçlar:**
- Mal sahibi/kiracı karşı taraf görünürlüğü (kişi görünürlüğü — ad+telefon, kimlik foto HAYIR)
- `ListeScreen` + `MalSahibiScreen` rol uyarlama

**Ertelenmiş:**
- **Faz 3.4 kalan** — `FormScreen` rol uyarlama (çok kompleks, ayrı faz)

---

## Gelecek — Tahliye protokolü (uygulama aktif kullanıma geçtikten SONRA)
Yeni bir sözleşme/belge tipi. Akış:
- Emlakçı "Tahliye"ye basar -> sistem "tahliye protokolü olusturulsun mu?" diye sorar
- İstenirse depozito bedeli vb. bilgiler sorulur
- İki taraf (mal sahibi + kiracı) için tahliye protokolü düzenlenir
Erişim iptaliyle baglantılı: tahliye = kiracının daireye erisiminin kesilmesi.
Batu'da örnek metinler var. Öncelik: uygulama yayınlanıp tam kullanıma geçince.

---

## Faz 4 — Mülk & Kişi Modeli (PLANLANDI)

> Amaç: Kişi ve mülk verisini sözleşmeden ayırıp tekrar kullanılabilir hale getirmek.
> Bilgi bir kez girilir, sözleşme bağlar. Ana plandaki Faz 3 (buildings+units+tenants+leases)
> modelinin gerçekleşmesi. (Numara: ödemeler 3.5'te yapıldığı için ana planla birebir değil.)

### Strateji: ADDITIVE (sıfır bozulma)
- Yeni tablolar eklenir; mevcut contracts.form_data ve eski sözleşmeler DOKUNULMAZ.
- Eski sözleşmeler unit_id=NULL kalır, eskisi gibi çalışır.
- Yeni sözleşmeler yeni modeli kullanır. Eski veri backfill'i sonraki adım (string dedup elle).

### Yeni tablolar (hepsi org-scoped, RLS)
**persons (kişiler):** id, organization_id, ad_soyad, tc_kimlik, telefon, adres,
  kimlik_foto_url, user_id (NULL → davet/profil için), created_at
  - Rol kişide değil; aynı kişi farklı sözleşmede farklı rolde olabilir
  - KVKK: TC UI'da maskelenir, kimlik_foto hassas veri
**buildings (binalar):** id, organization_id, ad, il, ilce, mahalle, acik_adres, created_at
**units (daireler):** id, organization_id, building_id (FK), blok, kat, daire_no,
  mal_sahibi_person_id (FK persons — MAL SAHİBİ DAİRE DÜZEYİNDE), created_at
  - Aynı binada farklı dairelerin farklı sahibi olabilir
**contracts (ekleme):** += unit_id UUID NULL (FK units), += kiraci_person_id UUID NULL (FK persons)
  - Eski kayıtlar ikisi de NULL

### İlişkiler
- building 1—N units · person 1—N units (mal sahibi) · person 1—N contracts (kiracı)
- unit 1—N contracts (zaman içinde) · contract 1—N payments (mevcut)

### RLS
- persons/buildings/units: organization_id = auth_org_id() (emlakçı yönetir)
- Taraf erişimi/profil = person.user_id üzerinden, ama DAVET sistemine (Faz 3.3) bağlı → BU FAZDA ERTELENDİ
- Mevcut taraf erişimi (contracts.mal_sahibi_user_id) korunur

### Akış (yeni sözleşme — FormScreen)
1. Bina seç/oluştur → 2. Daire seç/oluştur (mal sahibi kişiyi ata) →
3. Kiracı kişi seç/oluştur → 4. Kira + alanlar → unit_id + kiraci_person_id ile kaydet
- Mevcut kişi/daire seçilince bilgiler otomatik dolar (TC, tel, adres, foto)

### MalSahibiScreen
- String GROUP BY (B1) yerine persons/units'ten okur — isim çakışması yok

### Aşamalı implementasyon
1. ✅ Migration 008 — uygulandı + doğrulandı (3 tablo, 12 policy, eski sözleşmeler bozulmadı, 06.06)
2a. ✅ Kiracı kişisi — PersonPicker + persons upsert + contracts.kiraci_person_id bağlama. tsc temiz (2a'dan 0 hata), 4 senaryo cihazda geçti (07.06).
2b. ✅ Site + Mal Sahibi entegrasyonu — Migration 009 (persons banka/arka foto, buildings adres, contracts building_id+mal_sahibi_person_id), SitelerScreen (liste + ekle/düzenle/sil), site picker (adres aynen) + mal sahibi picker (kiraya veren+banka+ön/arka foto otomatik), mal sahibi otomatik yakalama (coalesce wipe-guard), edit rehydration + wipe-guard, KimlikFoto initialOn/initialArka (edit modu + picker sonrası thumbnail). tsc temiz, cihazda test edildi (07.06).
B4.1. ✅ Storage altyapısı — Migration 016_storage_buckets.sql (16.06). 2 private bucket: `kimlik-belgeleri` (emlakçı-only) + `dekontlar` (sözleşme tarafları). `storage.objects` RLS: 8 policy; `auth_org_id`/`auth_role`/`user_can_access_contract` üzerine. Path şeması: `{org_id}` ilk segment; kimlik `{org}/persons|contracts/…`, dekont `{org}/{contract_id}/{payment_id}`. `contract_photos` (kimlik fotoları) → `kimlik-belgeleri`'ne maplendi; `sozlesme-belgeleri` bucket açılmadı. ADDITIVE: mevcut base64 verisi dokunulmadı; cutover + test temizliği B4.2+'de.
B4.2. ✅ Dekont Storage'a — Migration 017 (record_dekont RPC: upload_dekont guard'larının aynısı, base64 yerine path, durum='beklemede'). OdemeTakipScreen: yükleme -> dekontlar {org}/{contract}/{payment}.{ext} + record_dekont; görüntüleme -> storage.download -> base64 -> mevcut WebView. :137 .finally fix. Dekont base64 temizlendi, base64-arraybuffer eklendi. Cihazda test (foto+PDF). upload_dekont DROP edilecek (B4.5).
B4.3. ✅ Kimlik fotoları Storage'a — kimlik-belgeleri bucket (emlakci-only). SupabaseStorageService: persons kimlik (UPDATE/INSERT, insert->id->upload->update) + contract_photos -> Storage upload + path; sozlesmeleriGetir async map, path->download->base64. PersonPicker + KimlikFoto: path->download. contentType image/jpeg|png. Backward-compat UUID-prefix. pdfTemplate/PreviewScreen değişmedi. Kimlik base64 temizlendi. Cihazda test: Storage dosyası, thumbnail, PDF gömme ✓.
B4.5. ✅ Storage cleanup + production — upload_dekont(uuid,text,text) drop (018). versionCode 14 / versionName 7.3.0 production AAB build edilip Play Internal Testing'e çıkıldı (18.06). B4 (dekont+kimlik+sozlesme fotolari) base64->Storage gocu TAMAMEN bitti, production'da canli.
3. MalSahibiScreen persons/units'ten okuma
4. (Ayrı/sonra) Eski form_data → persons/units backfill (elle onaylı)
5. (Ayrı/sonra) Taraf erişimi + profil = davet sistemi (Faz 3.3)

### Keşif bulguları (06.06.2026)
- Mevcut: sözleşme-merkezli, kişi/mülk verisi contracts.form_data JSONB'de gömülü
- B1: MalSahibiScreen kiraya_veren_ad string'iyle gruplanıyor (isim çakışması)
- B2: Çok daireli mal sahibi bilgisi her sözleşmede tekrar
- B3: Bina/blok/kat formda yok, kapi_no serbest text
- B4: ✅ Storage bucket oluşturuldu (B4.1); base64→path cutover B4.2+'de
- B5: mal_sahibi_user_id prod'da boş (davet yok)

---

## Teknik Notlar

- **Email onayı:** Şu an KAPALI (Supabase Auth settings). Production'da açılacak.
  Trigger zaten `needsEmailConfirmation` durumunu handle ediyor — sorun olmayacak.
- **Storage:** `USE_CLOUD_STORAGE=true` — HybridStorageService (Supabase önce, local fallback)
- **AI:** Claude Sonnet 4.6 via Supabase Edge Function proxy (+ direct fallback)
- **Migrations sırası:** 001 → 002 → 003 → 004 → 005 → 006 → 007 → 008 → 009 → 010 → 011 → 012 → 013 → 014 → 015 (hepsi Supabase'de çalıştırıldı)

---

## Ana Uygulama Yenilemesi (Navigasyon + Profil/Ayarlar + Dashboard + Gece Modu)

**Durum:** Planlandı, adım adım yapılacak. (Login redesign Push 1–2 bitti; Push 3 = hesap silme bu plana taşındı.)

### Navigasyon — alt sekme çubuğu (Instagram tarzı)
- Alt tab bar, **ikon bazlı**, sade. Aktif = dolu ikon, pasif = outline. Flat, açık/koyu temaya uyumlu, ince üst çizgi.
- **Profil sekmesi = kullanıcı avatarı** (yuvarlak foto). Ayarlar bu sekmenin içinde (IG gibi: profil → ayarlar).
- Sekmeler **role göre** değişir:
  - **Emlakçı:** Ana Sayfa · Sözleşmeler · Kişiler · Ödemeler · Profil
  - **Mal Sahibi:** Ana Sayfa · Sözleşmeler · Ödemeler · Profil
  - **Kiracı:** Ana Sayfa · Ödemeler · Profil
- Mevcut ekranlar (Kişiler, Ödeme Takip, sözleşme) sekmelere taşınır.
- (Opsiyonel/ileride: emlakçı için ortada "+" yeni sözleşme aksiyonu.)

### Profil / Ayarlar (avatar sekmesi)
Üstte profil bilgisi (foto, ad, email, rol), altta ayarlar listesi:
- **Profil fotoğrafı** (avatar upload — Supabase Storage)
- **Gece modu** (toggle)
- **Hesabımı Sil** (Push 3 — delete-account Edge Function + güçlü onay)
- **Çıkış**
- **Gizlilik / KVKK metni** (App Store gizlilik gerekliliği)
- **Hakkında** (versiyon)
- **Destek / İletişim** (WhatsApp)
- (Bildirim ayarı — push ertelendiği için sonraya.)

### Ana Sayfa — Dashboard (role göre)
Veriler `payments` + `contracts`'tan hesaplanır.
- **Emlakçı:** Bu ay tahsil edilecek kira · Bu ay tahsil edilen · Geciken (tutar + adet) · Aktif kiracı/sözleşme sayısı · Yaklaşan ödemeler (liste)
- **Mal Sahibi:** kendi mülklerine gelecek / gelen / geciken kira
- **Kiracı:** sıradaki kendi ödemesi (ne zaman, ne kadar, durum)
- **AÇIK SORU:** "toplam toplanacak kira" tanımı netleşecek — bu ay beklenen / şu an ödenmemiş toplam (geciken dahil) / tüm aktif sözleşmelerin aylık hacmi.
- İleride: "Hatırlatmalar / Görevler" (sözleşme yenileme, kira artışı) kartı/sekmesi olabilir.

### Gece Modu (en ağır iş — kendi adımı)
Sadece toggle değil: açık/koyu **tema setleri** + tema context'i + tüm ekranların renkleri **tokendan** alması + tercihin **kaydedilmesi** (local). Bütün olarak yapılacak, yarım kalırsa ekranlar karışır.

### Sıra (tek seferde değil — kontrollü)
1. **Navigasyon + Profil/Ayarlar iskeleti** (çıkış buraya taşınır) — temel.
2. **Hesabımı Sil** (delete-account Edge Function + UI) — Apple gerekliliği.
3. **Ana Sayfa dashboard** — istatistikler.
4. **Profil fotoğrafı** — avatar upload (Storage hazır).
5. **Gece modu** — tema sistemi.

### Apple hedefi
Bu yenileme + hesap silme, Apple'ın istediği büyük şeyleri (uygulama içi gerçek hesap silme + gizlilik politikası) kapatır. Apple Developer üyeliği onaylanınca iOS build + App Store submit kalır.
