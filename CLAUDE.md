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

**Faz 3.5e — Ödeme planı UI + tarih düzeltmeleri** (Ağustos 2026)
- `OdemePlanModal.tsx` (yeni): ödeme günü grid (1-31 + "Ayın son günü" = 32),
  ay atlatıcı ilk dönem seçici, 6/12/24 süre segmenti, depozito toggle
  (varsayılan KAPALI), önizleme kutusu. Saf JS, yeni paket yok.
- `ilkDonem` string'i ASLA `new Date('YYYY-MM-01')` ile parse edilmiyor (UTC
  kayması); manuel split + yerel `Date` ctor. `parseYerelTarih` ile aynı kural.
- `SozlesmeKayit`'e `aylikKiraKurus` + `tarihIso` opsiyonel alanları eklendi;
  `SupabaseStorageService` mapper ham değerleri de döndürüyor (sorgu zaten
  `select *`).
- `KayitlarScreen`: buton artık modalı açıyor, RPC 5 parametreyle çağrılıyor.
  Buton görünürlük koşulu (emlakçı + `odemeCount === 0`) değişmedi.
- `OdemeTakipScreen`: emlakçı-only "Ödeme Tablosunu Sil" butonu, iki aşamalı
  Alert, RPC hata mesajı kullanıcıya AYNEN gösteriliyor.
- Safe area (commit `ba38db0`): sil butonu ve modal footer artık Android
  navigasyon çubuğunun üstünde. Modal `pageSheet` olduğu için
  `Math.max(insets.bottom, 12) + 16` taban değerli hesap.
- Cihaz testi GEÇTİ: iki aşamalı onay, koruma reddi ("N kayıtta dekont veya
  onaylanmış ödeme var"), ay sonu clamp (Aralık + "ayın son günü" → Şubat 28).
- Gerçek org veri düzeltmesi: iki sözleşmenin `vade_tarihi` değerleri SQL ile
  YERİNDE güncellendi (silme YOK) — dekont ve ödendi durumu korunsun diye.
  Silme-yeniden kurma yapılsaydı Storage'daki dekont öksüz kalacaktı.
- **Öğrenilen (açık borç):** tek korumalı satırı olan bir sözleşme uygulamada
  kilitlenir — "Oluştur" butonu çıkmaz (`odemeCount > 0`), silme de reddedilir.
  Çıkış yolu şu an sadece SQL. İleride kısmi silme ya da satır bazlı düzeltme
  düşünülebilir.

### Faz 3.6 — Magaza yayin sureci — 10-14 Agustos 2026

**Gizlilik / yasal sayfalar (CANLI)**
- Ayri PUBLIC repo: batusonmezz/gayrimenkpro-legal (kod repo'su private
  kaliyor; GitHub Pages ucretsiz planda sadece public repo'dan yayinliyor)
- https://batusonmezz.github.io/gayrimenkpro-legal/ (gizlilik + KVKK)
- https://batusonmezz.github.io/gayrimenkpro-legal/hesap-silme.html
- Politikada somut saklama sureleri var: sozlesme dosyasi 10 yil
  (TBK 146 / TTK 82), mali kayitlar 5 yil (VUK 253)
- Anthropic'e veri aktarimi, ucuncu kisi verisi sorumlulugu, reklam ve
  izleme yok beyani, cihaz izinleri politikada aciklandi
- Veri sorumlusu e-postasi: batusonmez4108@gmail.com
- ACIK BORC: KVKK'nin istedigi periyodik imha mekanizmasi YOK. Sureler
  taahhut ediliyor ama otomatik silme calismasi yazilmadi. Ticari satistan
  once KVKK avukatina baktirilacak.

**Google Play**
- 10 beyan tamamlandi (veri guvenligi, icerik derecelendirme 3+/herkes,
  hedef kitle 18+, reklam yok, saglik yok, resmi kurum yok, oturum acma
  bilgileri, gizlilik URL'si, finans, reklam kimligi)
- Veri guvenliginde 10 veri turu beyan edildi, hepsi "toplanıyor /
  paylasilmiyor / uygulama islevselligi". Supabase ve Anthropic
  Play tanimina gore "hizmet saglayici", paylasim sayilmiyor
- Magaza girisi: ozgun Turkce metin, 512x512 simge, 1024x500 one cikan
  grafik (bina motifi), 7 adet 1080x1920 ekran gorseli
- Ekran gorselleri test org'undaki temiz veriyle uretildi, gercek kirac
  verisi ve kisisel profil fotografi KULLANILMADI
- Yapay zeka ile uretilmis oge beyani verildi (gorseller AI ile hazirlandi)
- URETIME ERISIM YOK: 13 Kasim 2023 sonrasi kisisel hesap kurali geregi
  kapali test sarti uygulaniyor. Alpha kanalinda 14 tester, 14 gun
  kesintisiz kalmali, sonra uretim erisimi basvurusu (~1 hafta inceleme)
- Kritik: listeye mail eklemek yetmiyor, her tester kendi Android
  telefonundan katilim linkiyle katilmali. Kurulum da yetmiyor, Nisan
  2026'dan beri Google gercek etkilesim ariyor
- versionCode 17 kapali testte yayinda

**App Store**
- iPad destegi KAPATILDI (supportsTablet: false). Tablet duzeni hic
  tasarlanmadi, acik birakmak 4.0 ret riski + ayri gorsel seti demekti
- Surum sayfasi: 7 adet 1290x2796 gorsel (duz RGB, alfa yok), aciklama,
  anahtar kelimeler, kategori Business, yas 4+, fiyat Free, manuel yayin
- Demo hesap: test1@gmail.com — incelemeci bu org'u kullaniyor,
  inceleme suresince VERISINE DOKUNULMAYACAK
- 1. GONDERIM REDDEDILDI (14 Agustos): Guideline 2.1 Information Needed.
  Islevsel ret DEGIL, bilgi talebi. Apple 7 kalem istedi: fiziksel
  cihazda ekran kaydi, test edilen cihaz/OS listesi, islev ve hedef
  kitle, kurulum talimatlari, kullanilan harici servisler, bolgesel
  farklar, duzenlemeye tabi sektor beyani
- Cevap Resolution Center'dan gonderildi (build 3 ile birlikte)

**Bu surecte bulunan ve duzeltilen gercek hatalar (build 3)**
- HEIC: iPhone varsayilan HEIC cekiyor, kimlik-belgeleri ve dekontlar
  bucket'lari sadece jpeg/png/webp kabul ediyordu. Fotograf arsivinden
  kimlik ve dekont yukleme iOS'ta TAMAMEN KIRIKTI. Cozum: expo-image-
  manipulator ile yuklemeden once JPEG'e cevirme (src/utils/imageJpeg.ts,
  hem KimlikFoto hem OdemeTakipScreen kullaniyor). Bucket'a heic EKLENMEDI
  cunku WebView <img> icinde HEIC gosteremiyor
- Dekont yeniden yukleme: reddedilen dekontun yerine yenisi yuklendiginde
  eski goruntu geliyordu. cacheControl: '0' eklendi; asil sebep muhtemelen
  uzanti degisimiydi (.jpg -> .heic), HEIC duzeltmesiyle birlikte cozuldu
- Turkce arama: ListeScreen'deki arama toLowerCase() kullaniyordu,
  Turkce noktali I (U+0130) duz i'ye donusmedigi icin "nilay" yazinca
  "NILAY CEVIK" bulunamiyordu. trNormalize yardimcisi eklendi
- iOS izin metinleri: NSPhotoLibraryUsageDescription ve
  NSCameraUsageDescription yoktu, Expo varsayilani (Ingilizce, genel)
  cikiyordu. Turkce ve aciklayici metinler eklendi
- ONEMLI DERS: Postgres ILIKE de ayni Turkce I sorununu yasiyor.
  SQL'de kiraci_ad ilike '%nilay%' NILAY ile eslesmez

**Gizlilik linkleri uygulama icinde (build 4'e girecek)**
- ProfilScreen'deki devre disi "Gizlilik / KVKK" placeholder'i aktif
  hale getirildi
- DIGER bolumune "Hesap ve Veri Silme" satiri eklendi
- SignupScreen ve ForcePasswordChangeScreen'e bilgilendirme metni
  (onay kutusu YOK)

**Siradaki isler**
1. Apple'dan cevap bekleniyor
2. Kapali testte 14 gunu doldurmak, testerlari dondurmek, geri bildirimleri
   bir dosyada toplamak (uretim erisimi basvurusunda soruluyor)
3. E-posta onayini acmak + Supabase Site URL duzeltmesi (production yol
   haritasinin son maddesi, inceleme bitmeden YAPILMAYACAK)
4. Play Console'da paket adi kaydi kontrolu (son tarih 30 Eylul 2026)
5. Domain: gayrimenk.com (ertelendi)

**Bilinen acik borclar**
- Odeme plani dolduktan sonra yeni donem EKLENEMIYOR: olustur butonu
  sadece 0 satirda cikiyor, silme ise tek dekont varsa reddediliyor.
  Ilk sozlesmeler Agustos 2027'de bu duvara carpacak. Cozum onerisi:
  create_payment_schedule yalnizca eksik donemler icin satir eklesin
- Tek korumali satir sozlesmeyi kilitliyor, cikis yolu sadece SQL
- Ayni isimde ikinci kisi kaydi olusturulabiliyor, picker ayirt etmiyor
- Uygulamada gunluk kullanim dongusu yok. Hatirlatma bildirimleri
  (yaklasan vade, yenilenen sozlesme) gercek cozum
- Mapping dosyasi (R8/proguard) yuklenmiyor, Play'de cokme raporlari
  okunaksiz

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

**SIFRE SIFIRLAMA — COZULDU (Temmuz 2026):** Sorun kodda DEGILDI, iki Supabase
Dashboard ayarindaydi:
1. Email Templates > Reset Password sablonu {{ .ConfirmationURL }} (link)
   kullaniyordu, localhost:3000'e gidiyordu. {{ .Token }} (6 haneli kod) gosteren
   Turkce sablonla degistirildi.
2. Email OTP length 8 idi, ama ResetPasswordScreen 6 haneli bekliyor (maxLength=6,
   validasyon kod.length!==6). Supabase OTP length 8->6 yapildi.
Akis: OTP-kod bazli (deep link YOK). Kullanici e-postadaki 6 haneli kodu elle
girer -> verifyOtp(type:recovery) -> updateUser(password). Cihazda test edildi,
CALISIYOR. Kod degisikligi/yeni build GEREKMEDI (Supabase tarafi ayar).
NOT: Email OTP expiration 3600 (1 saat, iyi). Site URL hala localhost:3000 ama
sifre sifirlama kod-bazli oldugu icin kullanilmiyor. AMA email confirmation
acilmadan ONCE Site URL duzeltilmeli (o zaman dogrulama e-postasi Site URL'ye
link atacak).

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
- **Migration repo senkronu:** ✅ TAMAMLANDI — 020_storage_buckets.sql / 021_record_dekont.sql / 022_upload_dekont_drop.sql repo'ya belgelendi (Temmuz 2026). Canlıya uygulanmadı, sadece referans.

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

**Durum:** Step 1 (navigasyon + profil) + Step 2 (hesap silme) tamamlandı. Sırada Step 3 (Ana Sayfa dashboard).

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
1. ✅ **Navigasyon + Profil/Ayarlar iskeleti** — tamamlandı.
2. ✅ **Hesabımı Sil** (delete-account Edge Function + UI) — tamamlandı.
3. **Ana Sayfa dashboard + Navigasyon yeniden düzeni** — 3a tamamlandı; 3b sırada. ← SIRADA
4. **Profil fotoğrafı** — avatar upload (Storage hazır).
5. **Gece modu** — tema sistemi.

### Apple hedefi
Bu yenileme + hesap silme, Apple'ın istediği büyük şeyleri (uygulama içi gerçek hesap silme + gizlilik politikası) kapatır. Apple Developer üyeliği onaylanınca iOS build + App Store submit kalır.

**Step 2 ile hesap silme blocker'ı karşılandı.** Apple Developer üyeliği onaylanınca iOS build + App Store submit kalır.

### Step 3a — TAMAMLANDI
- `get_dashboard_stats()` RPC (`supabase/migrations/016_dashboard_stats.sql`) deploy edildi: role-aware (`emlakci`/`mal_sahibi`/`kiraci`), `SECURITY DEFINER`, kuruş cinsinden JSONB döner.
- Ödeme kovaları (örtüşmez, sadece `tip='kira'`): tahsil edilen (`durum='odendi'`, `odeme_tarihi` bu ay) · bekleyen (`durum='beklemede'`, vade bu ay/gelecek) · geciken (`durum='beklemede'`, vade geçmiş).
- `HomeScreen` role-aware ikonlu kartlar + yaklaşan ödemeler (7 gün) listesine dönüştü. `useFocusEffect` ile sekme focus'ta otomatik yenileme + pull-to-refresh. Kuruş→TL çevirimi ekranda (`/100`, `tr-TR` format).
- "Aktif sözleşme" yerine **"Toplam Sözleşme"** gösteriliyor — aktiflik kolonu yok; gerçek aktif tanımı TEFE-TUFE kira yenileme adımına ertelendi.
- Eski menü kısayolları ve "Sözleşme oluştur" HomeScreen'de **GEÇİCİ** duruyor; 3b'de kaldırılacak.
- Test edildi (cihaz — emlakçı): kartlar, kuruş formatı doğru, geciken kırmızı, focus-refresh + pull-to-refresh, alttaki menü korundu.

### Step 3b-1 — TAMAMLANDI (Hub ekranları)
- `src/components/HubSegmentBar.tsx`: Underline segment bar bileşeni. Props: `tabs`/`activeIndex`/`onTabPress`. `PRIMARY='#0f6e56'`. Animasyon yok, SafeAreaView yok.
- `src/screens/SozlesmelerHub.tsx`: Kayıtlı | Liste segmentli sarmalayıcı. `KayitlarScreen` + `ListeScreen`'i `navigation` prop geçerek render eder.
- `src/screens/KisilerHub.tsx`: Kişiler | Mal Sahipleri | Mülkler segmentli sarmalayıcı. `KisilerScreen` + `MalSahibiScreen` + `SitelerScreen`'i `navigation` prop geçerek render eder. Rol kısıtı yok — 3b-2'de tab düzeyinde uygulanacak.
- Henüz hiçbir navigator'a bağlı değil. Uygulama davranışı değişmedi. tsc temiz.

### Step 3b-2 — TAMAMLANDI (Tab navigator güncellemesi)
- App.tsx: `KayitlarScreen`/`KisilerScreen` import'ları kaldırıldı, `SozlesmelerHub` + `KisilerHub` eklendi.
- `Kayitlar` Tab.Screen → `SozlesmelerHub` (`headerShown:false`, `tabBarLabel:'Sözleşmeler'`).
- `Kisiler` Tab.Screen → `KisilerHub` (`headerShown:false`, emlakci-only).
- `YeniSozlesme` Tab.Screen eklendi (emlakci-only): `EmptyScreen` + `tabPress` listener → `navigate('Form', {type:'kira'})`. İkon: 52px yeşil circle, Ionicons `add`.
- `tabBarStyle`'a `overflow:'visible'` eklendi (circle kesilmesin).
- tsc temiz, sadece App.tsx değişti.
- AnaSayfa'daki geçici menü kısayolları hâlâ duruyor — 3b-3'te kaldırılacak.

### Step 3b-3 — TAMAMLANDI (HomeScreen temizliği)
- `CONTRACT_TYPES` sabiti, `navigation` prop, `isEmlakci`, `isMalSahibiVeyaEmlakci` değişkenleri kaldırıldı.
- `menuSection` View bloğu ve 6 navigasyon kısayolu (Research, Kayitlar, Liste, MalSahipleri, Siteler, Kisiler) kaldırıldı.
- 13 kullanılmaz stil girdisi kaldırıldı.
- Header title "Sözleşmeler" → "Ana Sayfa" güncellendi.
- HomeScreen artık saf dashboard — navigasyon tab'lardan ve [+] butonundan yapılıyor.
- tsc temiz. 133 satır silindi.

### Step 3b — TAMAMLANDI
- **Tab yapısı:**
  - Emlakçı: Ana Sayfa · Sözleşmeler · **[+]** · Kişiler · Profil. Ortadaki + doğrudan Form (sözleşme oluştur) açar.
  - Mal sahibi / kiracı: Ana Sayfa · Sözleşmeler · Profil (mülk/kişi yönetmez, oluşturamaz; + yok).
- **SözleşmelerHub** (yeni sarmalayıcı): üstte segment kontrolü (Kayıtlı | Liste), seçime göre mevcut KayitlarScreen / ListeScreen render eder. Mevcut ekranlar değişmez.
- **KisilerHub** (sadece emlakci): segment (Kişiler | Mal Sahipleri | Mülkler/Siteler), mevcut Kisiler / MalSahipleri / Siteler ekranlarını render eder. Mevcut ekranlar değişmez.
- 3b'de AnaSayfa'daki geçici menü kısayolları + "Sözleşme oluştur" butonu kaldırılır (artık sekmelerden / +'dan ulaşılır).

### Step 4 — TAMAMLANDI (Profil fotoğrafı / Avatar)

**4-1 — Altyapı (migration 019_avatars.sql):**
- avatars PUBLIC bucket + users.avatar_url TEXT kolonu.
- RLS: okuma public; INSERT/UPDATE/DELETE sadece kendi dosyana (name LIKE auth.uid()::text || '.%').
- Path şeması: {user_id}.{ext}, kök dizinde (klasör yok), upsert ile üzerine yazılır.
- avatar_url kolonunda TAM URL değil path tutulur; client getPublicUrl ile türetir.
- Supabase Dashboard'da uygulandı + repo'ya 019_avatars.sql olarak commit edildi.

**4-2 — authState + auth.ts:**
- AuthUser.avatarUrl alanı eklendi.
- authState: getAvatarUrl/setAvatarUrl + subscribeAvatar mekanizması.
- getCurrentUser + signIn avatar_url SELECT eder ve setAvatarUrl çağırır; signUp/signOut avatarUrl null/temizler.

**4-3 — ProfilScreen avatar + upload:**
- person-circle ikonu → avatar varsa yuvarlak Image, yoksa ikon (TouchableOpacity sarmalı).
- "Profil Fotoğrafı" satırı "Yakında" badge'den TouchableOpacity'ye (chevron).
- handleAvatarPress: expo-image-picker (aspect [1,1], base64) → base64-arraybuffer decode → avatars bucket upload (upsert) → users.avatar_url UPDATE → setAvatarUrl.
- ProfilScreen içi cache-bust (cacheBust state) ile yeni foto anında görünür.

**4b — Tab ikonu avatar (Instagram tarzı):**
- authState'e subscribeAvatar mekanizması (4b-1): setAvatarUrl çağrılınca dinleyiciler tetiklenir, unsubscribe döner.
- App.tsx ProfilTabIcon ayrı bileşen (4b-2): kendi subscribe'ı + state'i ile tab ikonunu reaktif render eder (Navigation options closure sorununu çözer). Avatar varsa yuvarlak foto (focused'da ince çerçeve), yoksa person-circle.
- Cache-bust (4b-3): upsert aynı path'e yazdığı için URL değişmiyordu, Image eski fotoğrafı cache'liyordu. ProfilTabIcon subscribe her tetiklendiğinde cacheBust yenilenir, URL'e ?t={cacheBust} eklenir → fotoğraf değişince tab ikonu anında güncellenir.
- Cihazda test edildi: fotoğraf yükle/değiştir → hem ProfilScreen hem tab ikonu anında güncelleniyor; kapat-aç kalıcı.

### Step 5 — Gece Modu (DEVAM EDIYOR)

**Hedef:** Acik/koyu tema. ThemeContext + useTheme, tum ekranlar token'dan
renk alir, tercih AsyncStorage'da kalici. Toggle ProfilScreen'de (su an
"Yakinda").

**Onaylanan dark palet:** background #121212, surface #1e1e1e, primary
#0d1f0d, primaryAccent #1d9e75, text #e8e8e8, success #4caf50, error
#ef5350, warning #ff9800 (tam set src/theme/colors.ts darkColors'da).

**5-1 — TAMAMLANDI (tema altyapisi):**
- src/theme/colors.ts: lightColors + darkColors (26 anahtar, Record<ColorKey,string>),
  geriye uyumluluk icin `export const colors = lightColors` korundu.
- src/theme/ThemeContext.tsx (YENI): ThemeProvider + useTheme hook.
  mode 'light'|'dark'|'system', useColorScheme (sistem), AsyncStorage
  '@theme_mode' kalici tercih. isDark hesabi + aktif colors secimi.
- src/theme/index.ts: lightColors/darkColors/ThemeProvider/useTheme/ThemeMode
  export edildi, eski colors/ColorKey korundu.
- App.tsx: App -> AppInner, disina ThemeProvider sarmasi.
- AsyncStorage paketi kuruldu (@react-native-async-storage/async-storage@2.2.0).
  Kurulum sirasinda expo-font duplicate sorunu cikti; `npx expo install expo-font`
  + `expo install --fix` + node_modules temiz kurulum ile cozuldu (expo-doctor 18/18).
  Native modul oldugu icin yeni EAS dev-client build alindi.
- Cihazda test: hata yok, gorunum birebir eski (hicbir ekran henuz useTheme
  kullanmiyor, hepsi statik light colors). Avatar calisiyor.

**Kritik prensip — her commit'te tutarli:** Statik `colors` (= lightColors)
hala export ediliyor. Ekranlar useTheme'e GRUP GRUP gecirilecek; her grup
ayri commit + cihaz testi. Toggle EN SONDA baglanacak (o ana kadar tum
ekranlar token'a gecmis olacak, hicbir yer karismayacak).

**Test yontemi:** Toggle bitene kadar dark mode telefon SISTEM temasi ile
test edilir (mode='system' sayesinde useTheme'e gecmis ekranlar otomatik koyu olur).

**5-2 — useTheme gecisi (makeStyles deseni):**
Desen: import { colors } -> import { useTheme }; const styles =
StyleSheet.create({ -> const makeStyles = (colors, isDark) =>
StyleSheet.create({; component basina const { colors, isDark } =
useTheme(); const styles = makeStyles(colors, isDark);. Dark buton
fix: backgroundColor colors.primary -> isDark ? colors.primaryAccent
: colors.primary (dark'ta primary arka plana cok yakin, buton kayboluyor).

- **5-2a — TAMAMLANDI:** 4 auth ekrani (LoginScreen, SignupScreen,
  WelcomeScreen, ForgotPasswordScreen) useTheme'e gecti. 3'unde dark buton
  fix (Welcome'da colors.primary butonu yoktu, dokunulmadi). Cihaz test OK.
- **5-2b — TAMAMLANDI:** ResetPasswordScreen, ForcePasswordChangeScreen,
  ProfilScreen useTheme'e gecti. ProfilScreen'de 2 inline '#fff' ->
  colors.textOnPrimary (Hesabi Sil buton metni + ActivityIndicator);
  rgba(0,0,0,0.5) modal overlay'e dokunulmadi. Avatar calisiyor. Cihaz test OK.
- **5-2c — TAMAMLANDI:** HomeScreen useTheme'e gecti. KRITIK: StatKart +
  YaklasanList sub-komponentleri module-level styles/colors kullaniyordu;
  cozum = her 3 component (HomeScreen + 2 sub) kendi icinde useTheme() +
  makeStyles() cagiriyor, tek makeStyles factory paylasiliyor. 6 hard-coded
  -> token; tekrarBtn dark fix; 3 token'siz renk (userEmail rgba +
  roleBadge rgba x2) header'da koyu yesil zemin oldugu icin DOKUNULMADI.
  Cihaz test OK ama kullanici "dashboard gorunumu tam ice sinmedi" dedi —
  muhtemelen yari-koyu ara durum (diger ekranlar henuz acik) ya da dark
  palet ince ayar gerekebilir. DARK ROTUS olarak en sona not edildi.

**5-2d/e — TAMAMLANDI:** HubSegmentBar useTheme'e gecti. App.tsx MainTabs +
SozlesmelerHub + KisilerHub useTheme + backgroundColor: colors.background
(cerceve dark: tab bar, hub zeminleri, segment cubugu). Cihaz test OK.

**5-3 — AGIR EKRANLAR (token donusumu, makeStyles + hard-coded->token):**
Yeni token eklendi: info (#1a6fa8/dark #5a9fd4) + infoSurface (#e8f4fd/dark
#1a2a3a). Tint'ler mevcut Surface token'larina (successSurface/warningSurface/
errorSurface/accentSurface). Cift-set durum renkleri birlestirildi
(#27ae60/#2e7d32->success vb.).

- **5-3a — TAMAMLANDI:** KayitlarScreen + ListeScreen. ListeScreen'de getDurum
  refactor: renk yerine durumKey ('aktif'|'bitiyor'|'gecmis') donduruyor,
  component icinde durumRenk map ile token'a cevriliyor (pure function useTheme
  cagiramaz). Odeme Takibi mavi info butonu. Cihaz test OK.
- **5-3b — TAMAMLANDI:** KisilerScreen + MalSahibiScreen + SitelerScreen.
  OZEL: KisilerScreen whatsappBtn '#25D366' DOKUNULMADI (WhatsApp marka).
  MalSahibiScreen raporAl HTML template string ATLANDI (PDF CSS'i, RN degil).
  Dark fix butonlari: davetBtn/rolBtnSecili/saveBtn/secili/raporBtn. Cihaz test
  OK (PDF hala beyaz/normal).

- **5-3c — TAMAMLANDI:** FormScreen (en buyuk, ~88 renk). makeStyles + secim
  butonu helper'lari: secimBtnStyle(secili) + secimBtnText(secili) — 6 secim
  grubu (depozito_tur, simdiki_durum, kirayan_vekalet, kiraci_vekalet,
  kefil_var, kefil_sayisi) bu helper'lara baglandi (padding inline korundu).
  Beyaz header -> surface. Pasif buton -> surfaceSubtle. Cihaz test OK
  (6 grup secim calisiyor, sozlesme olusuyor).
- **PersonPicker — TAMAMLANDI:** useTheme + makeStyles. Baslik sabit
  "Kayitli Kisi Sec" yapildi (eskiden hard-coded "Kayitli Kiraci Sec" idi,
  mal sahibi/kiraci ayrimi kaldirildi). header dark fix. Cihaz test OK.
- **PreviewScreen — TAMAMLANDI (5-3d):** sozlesme onizleme + AI chat ekrani.
  makeStyles + token. userMsg/sendBtn/actionBtn dark fix. PDF template AYRI
  DOSYA (pdfTemplate.ts), dokunulmadi. Cihaz test OK.
- **KimlikFoto — TAMAMLANDI:** kimlik fotografi yukleme bileseni useTheme'e
  gecti. Cihaz test OK. (FormScreen akisinin son beyaz parcasiydi.)

**KALAN (yarin buradan devam):**
- **5-3e — OdemeTakipScreen** (523 satir, ~53 renk, EN KARMASIK kalan).
  YENI OTURUM SART. Iki parcaya bolunecek:
  * 5-3e-1: 2 PURE HELPER key refactor (hesaplaDepozitoDurum + hesaplaEtiket ->
    renk string yerine durumKey 'success'|'warning'|'error'|'muted' donduruyor;
    component ici DURUM_RENK map token'a ceviriyor; cagri yerleri satir 325/335
    + 407/417) + StyleSheet token donusumu (2 dark fix: header + modalHeader).
  * 5-3e-2: inline badge'ler (Odendi/Bekliyor/Gecikti — successSurface/success,
    warningSurface/warning, errorSurface/error), inline tutar/ternary
    (#27ae60->success, #e74c3c->error), inline ActivityIndicator'lar
    (#0f6e56->primaryAccent, #1a6fa8->info).
  * DOKUNULMAZ: dekontHtml() WebView template (satir 59-85), dekontWeb.bg
    '#1a1a1a' (satir 521, WebView koordineli), rgba beyazlar (479,519).
  * Ikisi TEK commit, arada cihaz testi yok.
- **ResearchScreen** (~18) + kucuk bilesenler (ChatBox ~4, ContractCard ~2).
- **StatusBar reaktif:** 8 dosyada sabit barStyle, isDark'a gore dinamik.
- **TOGGLE (en son):** ProfilScreen "Gece Modu" satiri ("Yakinda") -> gercek
  toggle, setMode ile light/dark/system. Tum ekranlar token'a gectikten SONRA.
- **DARK ROTUS:** Tum uygulama koyu iken taze gozle palet gozden gecmesi.
  App.tsx loading dali '#f5f5f0' da o zaman.

**Onemli — useColorScheme canli degisimi yakalamiyor:** Dev'de telefon
sistem temasi degisince RELOAD gerekiyor (Android). Gercek kullanimda sorun
degil; toggle baglaninca uygulama icinden aninda degisecek.

**ACIK BORC (onceden):** Migration repo senkronu — 016_storage_buckets/017/018
Dashboard'da var, repo'da .sql yok. 019'dan itibaren senkron.
✅ KAPANDI (Temmuz 2026): 020/021/022 olarak repo'ya belgelendi.

## RLS + STORAGE GUVENLIK DENETIMI (Temmuz 2026) — TAMAMLANDI

Production oncesi tam guvenlik denetimi yapildi. SONUC: "Faz 2 RLS borcu"
korkusu ASILSIZ cikti — hicbir "USING (true)" yok, sistem bastan dogru
kurulmus. Detay:

- **Org izolasyonu:** Tum tablolar auth_org_id() ile korunuyor, NULL'a karsi
  guvenli. Cross-org erisim imkansiz.
- **Rol bazli erisim (contracts):** 005+010 birlesik policy dogru — emlakci
  org bazli, mal_sahibi/kiraci sadece kendi sozlesmesi (user_id VEYA
  person_belongs_to_user).
- **contract_items/photos:** SADECE org bazli gorunuyor AMA PostgreSQL RLS
  cascade sayesinde subquery contracts_select'e tabi — kiraci sadece kendi
  sozlesmesinin esya/foto'sunu gorur. BILINCLI TASARIM, sizinti YOK.
- **Helper fonksiyonlar (hepsi SECURITY DEFINER + STABLE, dogru):**
  auth_org_id(), auth_role(), user_can_access_contract() (4 OR dal: emlakci/
  user_id x2/person x2, outer org guard), person_belongs_to_user() (org guard
  disaridan geliyor).
- **payments yazma:** RLS default-deny, tum yazma SECURITY DEFINER RPC ile:
  create_payment_schedule (emlakci-only), record_dekont/upload_dekont (kiraci+
  emlakci, mal_sahibi HARIC, path guard'lari), approve/reject_payment
  (mal_sahibi+emlakci, kiraci HARIC). Hepsi org + erisim cift kontrollu.
- **Storage (KRITIK — hepsi dogru):**
  * kimlik-belgeleri: PRIVATE + emlakci-only (foldername[1]=org AND
    role=emlakci). TC kimlik fotograflari en siki korumada.
  * dekontlar: PRIVATE + taraf-bazli (user_can_access_contract), emlakci siler.
  * avatars: public, kendi dosyasina yazma.

**REPO SENKRON — TAMAMLANDI:** Eksik uc migration (016_storage/017_record_dekont/
018_upload_dekont_drop) canlidan cekilip repo'ya BELGELENDI: 020_storage_buckets.sql,
021_record_dekont.sql, 022_upload_dekont_drop.sql. Bu dosyalar
canliya UYGULANMADI (zaten canlida vardi), sadece repo referansi.
NOT: repo'da 016 adi iki kez (016_dashboard_stats + eski Dashboard 016_storage);
storage backfill 020 numarasiyla yazildi, cakisma yok.

**GUVENLIK SONUCU: RLS + storage + payments PRODUCTION'A HAZIR.**

## PRODUCTION ONCESI KALAN (guvenlik disi):
- **Email confirmation:** Supabase'de kapali (dev icin). Davet sistemi var ama
  production'da acilmali (Faz 6). Auth trigger handle_new_user() production'da
  test edilmeli.
- **Karsi taraf gorunurlugu (OZELLIK EKSIGI, guvenlik degil):** persons sadece
  emlakci-only. Mal_sahibi/kiraci birbirinin ad+telefonunu persons'tan
  cekemiyor (sadece form_data gomulu metinden). Planlanmisti, eksik kaldi.
  Production'i engellemez.
- **get_dashboard_stats:** mal_sahibi/kiraci dali sadece eski *_user_id
  mekanizmasi kullaniyor; persons.user_id ile davet edilenler bos dashboard
  gorebilir (veri eksikligi, guvenlik degil).
- **Yasal/store:** Gizlilik politikasi URL'si (KVKK — TC kimlik/kira verisi),
  hesap silme dogrulamasi (delete-account var, teyit edilecek), Play/App Store
  data safety formlari, Apple Developer onayi (BEKLIYOR — iOS on kosulu).

## ============================================
## PRODUCTION YOL HARITASI (Temmuz 2026 — guncel)
## ============================================

### BITEN (production-hazir):
- Dark mode (Step 5) TAMAM: tum ekranlar + StatusBar reaktif + toggle
  (Acik/Sistem/Koyu) + loading. app.config.js userInterfaceStyle:automatic.
  versionCode 15, v7.4.0 production build alindi, Play Store internal test'te.
- Guvenlik denetimi TAMAM: RLS + storage + payments hepsi saglam (detay yukarida
  "RLS + STORAGE GUVENLIK DENETIMI" bolumunde). Repo canliyla senkron (020/021/022).
- Sifre sifirlama TAMAM: 6 haneli OTP kod akisi calisiyor (Supabase sablon +
  OTP length 6 ayari).
- Apple Developer onayi GELDI, iOS TestFlight calisiyor.
- Hesap silme calisiyor (ProfilScreen > Hesabi Sil, delete-account Edge Function).
- Gizlilik politikasi HTML taslagi hazir (Batu'nun elinde, onaylandi).

### KALAN — PRODUCTION ICIN (oncelik sirasi):

1. **Gizlilik politikasini bir URL'ye koy** [Batu yapacak, kolay]
   - App/Play Store gizlilik politikasi URL'si ister.
   - GitHub Pages onerildi (ucretsiz, repo var, ~10 dk). Domain BEKLENMEZ.
   - HTML dosyasi hazir, sadece barindirilacak.

2. **Email confirmation ac + Site URL duzelt** [DIKKATLI — birlikte yapilacak]
   - Su an Supabase'de email confirmation KAPALI (dev icin). Production'da acilmali.
   - AMA once Site URL duzeltilmeli: su an localhost:3000. Confirmation acilinca
     dogrulama e-postasi Site URL'ye link atar -> localhost:3000 bozuk olur.
   - Auth trigger handle_new_user() confirmation ACIKKEN de org+user olusturuyor mu
     TEST edilmeli (signup + davet akislari).
   - Bu is Supabase ayari + test, muhtemelen kod degisikligi az/yok.

3. **Store formlari** [Batu dolduracak, Claude ne yazacagini soyleyecek]
   - Play Console: Data Safety formu.
   - App Store Connect: App Privacy.
   - Toplanan veriler: ad-soyad, telefon, e-posta, TC kimlik no, kimlik fotografi,
     IBAN (mal sahibi + kiraci), kira sozlesmesi, odeme/dekont, profil fotografi.
   - Icerik derecelendirme, hedef kitle, kategori.

4. **Domain (gayrimenk.com)** [ERTELENMIS — kritik degil]
   - Su an BOS: sadece NS kayitlari (Turhost'a bagli), A/MX/CNAME/TXT hepsi bos.
   - Web sitesi YOK, e-posta YOK. Turhost panelinde kurulmasi lazim (Batu/arkadasi).
   - Uc olasi kullanim: (a) gizlilik politikasi barindirma — GitHub Pages yeterli,
     domain gerekmez; (b) @gayrimenk.com e-posta — Supabase varsayilani calisiyor,
     zorunlu degil; (c) kurumsal web. Hicbiri kritik yolda DEGIL.

### KALAN — OZELLIK/IYILESTIRME (production'i engellemez):
- Dark rotus: tum app koyuyken taze gozle palet ince ayari (kontrast/ton).
  Toggle calisiyor, uygulama icinden aninda koyuya gecip her ekran incelenebilir.
- Karsi taraf gorunurlugu: persons emlakci-only; mal_sahibi/kiraci birbirinin
  ad+telefonunu goremiyor (sadece form_data). Planlanmisti, eksik.
- get_dashboard_stats: mal_sahibi/kiraci dali sadece eski *_user_id mekanizmasi;
  persons.user_id ile davet edilenler bos dashboard gorebilir.
- ChatBox.tsx + ContractCard.tsx: olu kod, silinebilir (ayri temizlik commit'i).
- ResearchScreen: navigasyona bagli degil; ileride HomeScreen'e buton eklenebilir.
- makeStyles imzalari: bazi ekranlarda (colors: any), digerlerinde ReturnType.
  Tutarli hale getirilebilir (kozmetik).
## ============================================

- **5-3e — TAMAMLANDI:** OdemeTakipScreen (523 satir, en karmasik). 2 pure
  helper key refactor (hesaplaDepozitoDurum + hesaplaEtiket -> durumKey
  'success'|'warning'|'error'|'muted'; component ici DURUM_RENK map).
  StyleSheet + inline badge/tutar/ternary + 3 ActivityIndicator token'a gecti.
  DOKUNULMADI: dekontHtml() WebView template, dekontWeb.bg '#1a1a1a', rgba'lar.
  Cihaz test OK (durum etiketleri, badge'ler, dekont WebView calisiyor).
- **5-3f — ResearchScreen TAMAMLANDI:** hukuk arastirma ekrani useTheme'e
  gecti (researchBtn dark fix, resultTitle->primaryAccent, resultText->
  textSecondary). DIKKAT: ResearchScreen su an HICBIR NAVIGATOR'A BAGLI DEGIL
  (erisilmez). Token'i hazir; ileride HomeScreen'e veya emlakci menusune buton
  eklenerek baglanabilir. Cihaz testi yapilamadi (erisim yok).

**STEP 5 SONRASI TEMIZLIK NOTU (dark mode disi):**
- **ChatBox.tsx + ContractCard.tsx = OLU KOD** (hicbir yerde import/render
  edilmiyor). Dark mode'a GECIRILMEDI (kullanici gormuyor). Karar: ya silinecek
  ya da ileride kullanilacak. Step 5 bitince ayri "dead code" commit'i.
- **ResearchScreen navigasyona bagli degil** — ileride baglanirsa aktif olur.

**KALAN (Step 5):**
- **StatusBar reaktif:** 8 dosyada sabit barStyle (HomeScreen light-content,
  digerleri dark-content) -> isDark'a gore dinamik. (Tab ekranlari StatusBar
  import etmiyor olabilir, kontrol et.)
- **TOGGLE (en son):** ProfilScreen "Gece Modu" satiri ("Yakinda" disabled) ->
  gercek toggle, setMode ile light/dark/system. Tum ekranlar token'a gectikten
  SONRA baglanacak (= SIMDI hazir, StatusBar'dan sonra).
- **DARK ROTUS (toggle sonrasi):** Tum uygulama koyu iken taze gozle dark palet
  gozden gecmesi. App.tsx loading dali '#f5f5f0' da o zaman cevrilecek.

- **StatusBar reaktif — TAMAMLANDI:** 15 dosya. Acik header'li (auth + Form +
  Preview + Profil) reaktif {isDark ? light-content : dark-content}; koyu yesil
  header'li tab ekranlari (Kayitlar/Liste/Kisiler/MalSahibi/Siteler/OdemeTakip)
  sabit light-content. HomeScreen zaten sabit light-content (dokunulmadi).
  Commit 8f23152.
- **TOGGLE — TAMAMLANDI:** ProfilScreen "Gece Modu" satiri 3-buton segment
  (Acik/Sistem/Koyu) oldu, setMode('light'/'system'/'dark'). Aktif buton
  isDark ? primaryAccent : primary. dimmed/soonBadge/soonText KORUNDU (KVKK
  satiri kullaniyor). Commit c234850.
  * CIHAZ TEST: Acik ve Koyu ANINDA calisiyor (reload yok). "Sistem" dev
    client'ta useColorScheme stale kalmasi yuzunden bazen reload istiyor —
    BU DEV-ONLY SORUN, production build'de useColorScheme duzgun calisir.
    Toggle kodu DOGRU, mudahale gerekmez. Production build'de Sistem tekrar
    test edilecek.

**KALAN (Step 5 — SON ADIM):**
- **DARK ROTUS:** Toggle artik calisiyor, uygulama icinden aninda koyuya gecip
  her ekran taze gozle incelenecek. Kontrast/ton ince ayari. App.tsx loading
  dali hard-coded '#f5f5f0' -> dark token (o dal useTheme erisemiyorsa cozum
  bulunacak). Dashboard "ice sinmedi" hissi (onceki not) tum app koyuyken
  yeniden degerlendirilecek.

**STEP 5 OZET:** Tema altyapisi (5-1) + 8 temiz ekran (5-2) + tum agir ekranlar
(5-3a-f: Kayitlar/Liste/Kisiler/MalSahibi/Siteler/Form/Preview/OdemeTakip/
Research) + PersonPicker/KimlikFoto + StatusBar reaktif + TOGGLE = TAMAMLANDI.
Sadece dark rotus kaldi. ChatBox/ContractCard olu kod (Step 5 disi temizlik).

### Step 2 — TAMAMLANDI
- `delete-account` Edge Function deploy edildi (`supabase/functions/delete-account/`, `deno.json` import map ile `esm.sh/@supabase/supabase-js@2`).
- Role-aware silme:
  - **Member (kiraci/mal_sahibi):** auth soft-delete + `persons.user_id` unlink; org kayıtları/sözleşmeler/ödemeler/dekontlar korunur.
  - **Owner (emlakci):** tam org cascade sırası: Storage (`kimlik-belgeleri` + `dekontlar`, orgId prefix) → contracts explicit delete (CASCADE: payments/contract_photos/contract_items) → auth hard-delete tüm org kullanıcıları → units → buildings → persons → organizations.
- Güvenlik: caller JWT doğrulama (`getUser`), bilinmeyen rol guard (400), owner için `confirmation: 'SIL'` (ASCII; UI Türkçe İ'yi ASCII'ye eşler), member için `confirm: true`.
- ProfilScreen "Hesabımı Sil" aktifleştirildi: role-aware onay modali; owner'da "SİL" TextInput (buton eşleşene kadar disabled), member'da basit onay; başarı → signOut → Welcome.
- Test edildi (cihaz): member soft-delete (kiracı hesabı, login kapandı, org ayakta); owner cascade (Dashboard'dan throwaway emlakçı org'u, sözleşme + 2 kimlik foto ile, tam silindi).
- Apple App Store hesap silme zorunluluğu (5.1.1(v)) artık karşılandı.

### Step 1 — TAMAMLANDI (commit 57ed714; docs 1add383)
- Alt sekme çubuğu (IG tarzı, ikon-only, role-aware) + ProfilScreen (avatar placeholder; Çıkış/Destek-WhatsApp/Hakkında aktif; gece modu/profil foto/hesap silme/KVKK "Yakında").
- @react-navigation/bottom-tabs eklendi (JS, native rebuild yok). MainTabs App.tsx'te top-level; passwordRecoveryMode + ForcePasswordChange gate korundu.
- Ödemeler sekmesi step 3'e ertelendi (OdemeTakip contractId zorunlu kılıyor).
- Route 'Home' → 'AnaSayfa' (MainTabs içinde); tüm 'Home' referansları temizlendi (Login, Preview×2, Signup → MainTabs). Çıkış HomeScreen'den ProfilScreen'e taşındı.
- Bug fix: Kişiler sekmesi emlakçıda reopen'da kayboluyordu (getRole senkron okunuyordu) → MainTabs'a reaktif rol yüklemesi (useState + useEffect + getCurrentUser fallback). navigate('Kisiler') hatası da bununla çözüldü.
- tsc temiz (sadece beklenen supabase/functions Deno hataları), cihazda doğrulandı; production build henüz alınmadı.
