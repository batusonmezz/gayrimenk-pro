# Gayrimenk Pro → KiraApp SaaS Dönüşüm Planı

> **Karar tarihi:** 25 Mayıs 2026
> **Strateji:** Mevcut Gayrimenk Pro uygulamasını sıfırdan yazmadan, kademeli olarak multi-tenant SaaS platformuna dönüştürmek.
> **Garanti:** Mevcut sözleşme özellikleri her aşamada çalışmaya devam edecek.

-----

> **GÜNCEL DURUM NOTU (06.06.2026)** — Bu doküman 25 Mayıs vizyonudur. Uygulama bazı yerlerde bilinçli olarak saptı. Operasyonel gerçek için CLAUDE.md esastır; bu doküman büyük resim/vizyon olarak kalır.

## Uygulama Durumu / Sapmalar (06.06.2026)

**Tamamlanan (gerçek sıra):**
- Faz 0 ✅ git tag v1.0-pre-saas, storage abstraction
- Faz 1 ✅ Supabase backend, cloud storage, API key sunucuya
- Faz 2 ✅ auth + multi-tenancy — SMS OTP yerine EMAIL auth ile
- Faz 3 ✅ (gerçekte yapılan) — planlanan "buildings/units/tenants" DEĞİL; bunun yerine rol sistemi + rol bazlı RLS + rol bazlı UI + ödeme takip sistemi (3.5a/b)

**Sapmalar:**
1. Faz numaraları kaydı: ana plan Faz 3 = mülk modeli; fiilen Faz 3 = roller/RLS/ödeme oldu. Mülk modeli artık "Faz 4 — Mülk & Kişi Modeli" olarak planlandı (bkz CLAUDE.md), şimdi yapılıyor.
2. Auth: SMS OTP → Email (Supabase). Email onayı şu an kapalı, production'da açılacak.
3. Şema: "22 tablo" → ~7 tablo, sözleşme-merkezli yalın model. Kişi/mülk verisi şu an contracts.form_data JSONB'de; Faz 4'te persons/buildings/units'e ayrılacak.
4. Ödemeler kısmen erken geldi: ödeme TAKİBİ (manuel durum, in-app) 3.5'te yapıldı; ama iyzico/PayTR/Param TAHSİLATI + mobil imza HENÜZ YOK (ileride).
5. Storage: kimlik foto/dekont hâlâ base64/DB'de; gerçek Supabase Storage bucket henüz yok.

**Plana uyanlar:** INTEGER kuruş ✅, multi-tenant org_id + RLS ✅, Supabase Frankfurt ✅, git tag/branch güvenlik ağı ✅, USE_CLOUD_STORAGE flag ✅.

**Hâlâ ertelenmiş (Bölüm 7 geçerli):** aidat/apartman yönetimi, NES e-imza, web paneli, e-fatura, in-app mesajlaşma, çoklu dil.

-----

## 1. Proje özeti

**Mevcut durum:** Gayrimenk Pro — Expo + React Native + TypeScript ile yazılmış, Google Play’de dahili testte olan tek kullanıcılı sözleşme uygulaması. Lokal storage kullanıyor (expo-file-system + localStorage). Anthropic Claude Sonnet API’sine bağlı.

**Hedef:** Aynı uygulamayı, mevcut tüm özellikleri koruyarak, çoklu mal sahibinin kullanabileceği SaaS platformuna dönüştürmek.

**Eklenen özellikler:**

- Multi-tenant cloud backend (Supabase + Türkiye’de NestJS mikroservis)
- Kullanıcı sistemi (SMS OTP girişi)
- Mülk + daire + kiracı yönetimi
- Kira tahsilatı (iyzico + PayTR + Param marketplace)
- Mobil imza ile dijital sözleşme imzalama
- Otomatik gecikme yönetimi + KEP üzerinden e-tebligat
- GMSİ vergi raporu (e-Beyanname uyumlu)
- SaaS abonelik sistemi (daire başına 100 TL/ay veya 1000 TL/yıl)

**Tahmini süre:** 13-15 hafta (3-4 ay), tek geliştirici Claude Code ile.

**Geri dönüş garantisi:** Her faz git branch’inde geliştirilir, sorun çıkarsa 30 dakikada eski sürüm yayına alınır.

-----

## 2. Korunması garanti edilen mevcut özellikler

Bu liste **regression test base**’idir. Her faz tamamlandığında bu maddelerin tamamı hâlâ çalışıyor olmalı.

### 2.1 Sözleşme oluşturma

- [ ] Kira sözleşmesi tam şablon (tüm maddeler eksiksiz)
- [ ] Eşyalı daire seçeneği aktif/pasif yapılabilir
- [ ] Eşyalı daire seçildiğinde demirbaş listesi ekrana gelir
- [ ] Anahtar teslim tutanağı eklenir
- [ ] Kefil sistemi 1 kefilden 2 kefile dinamik geçiş yapar
- [ ] Vekalet sistemi (vekil ile sözleşme)
- [ ] Madde ekleme/kaldırma (genel koşullar)
- [ ] Kimlik fotoğrafı ekleme

### 2.2 Ekranlar (mevcut işlevsellik)

- [ ] HomeScreen — ana navigasyon
- [ ] FormScreen — sözleşme formu doldurma
- [ ] PreviewScreen — sözleşme önizleme
- [ ] KayitlarScreen — kayıtlar listesi
- [ ] ListeScreen — sözleşme listesi (filtreli: Bitiyor, Süresi Geçmiş)
- [ ] MalSahibiScreen — mal sahibi takip + rapor
- [ ] ResearchScreen — araştırma fonksiyonu

### 2.3 PDF çıktısı

- [ ] Tüm PDF sayfalarında dış çerçeve görünür
- [ ] Türkçe karakterler (ç, ğ, ı, ö, ş, ü) doğru çıkar
- [ ] Sözleşme + demirbaş + anahtar tutanağı + kimlik aynı PDF’te
- [ ] PDF mobilden paylaşılabilir (expo-sharing)

### 2.4 Entegrasyonlar

- [ ] Anthropic Claude Sonnet API çağrıları çalışır
- [ ] expo-print PDF üretimi
- [ ] expo-sharing PDF paylaşımı
- [ ] expo-file-system lokal kayıt (Faz 1’de cloud’a taşınır ama davranış aynı kalmalı)

### 2.5 Mal sahibi modülü

- [ ] Mal sahibi ekleme/düzenleme
- [ ] Mal sahibi raporu üretimi
- [ ] Mal sahibi listesi

> **Test yöntemi:** Her faz sonunda yukarıdaki listeyi sırayla test et. Bir tek madde başarısız olursa o faz tamamlanmış sayılmaz.

-----

## 3. Faz 0 — Hazırlık (1 hafta)

Bu fazda **hiçbir özellik değişmez, hiçbir kullanıcı arayüzü değişmez**. Sadece güvenlik ağı kurulur.

### 3.1 Mevcut sürümü Git ile dondur

Terminal’de proje dizinine git, aşağıdakileri sırayla çalıştır:

```bash
cd C:\Users\Lenovo\Desktop\gayrimenk-sozlesme
git status
git add -A
git commit -m "v1.0 stable - SaaS donusumu oncesi son surum"
git tag -a v1.0-pre-saas -m "Pre-SaaS conversion stable version"
git push origin --tags
```

> Bu komutlar mevcut çalışan kodu donduruyor. Bir şey bozulursa `git checkout v1.0-pre-saas` ile geri dönülür.

### 3.2 GitHub yedek

Eğer proje henüz GitHub’da değilse:

1. github.com’da yeni private repository aç: `gayrimenk-pro`
1. Terminal’de:

```bash
git remote add origin https://github.com/batusonmez/gayrimenk-pro.git
git branch -M main
git push -u origin main
git push origin --tags
```

### 3.3 Mevcut özellikler envanteri

Uygulamayı telefonda aç ve yukarıdaki **2. bölümdeki regression test listesini** sırayla test et. Her maddeye ✅ veya ❌ koy. Çalışmayanları ayrıca not al — Faz 1’de onlar da düzeltilecek.

### 3.4 Anthropic API key güvenlik denetimi

Claude Code’a şunu yaz:

```
src/services/anthropic.ts dosyasını oku. API key nereden geliyor — .env'de mi, process.env üzerinden mi, yoksa direkt kodda gömülü mü? 
.env dosyası .gitignore'da mı? 
GitHub'a push edilmiş mi kontrol et.
Sonuçları bana raporla.
```

> Eğer API key kodda gömülüyse veya GitHub’a push edilmişse, **acil olarak rotate edilmeli** (yeni key alınmalı). Faz 1’de zaten API key sunucuya taşınacak.

### 3.5 Storage abstraction katmanı (Faz 0’ın asıl işi)

Claude Code’a şu prompt’u ver:

```
Gayrimenk Pro projesinde storage abstraction katmanı eklemek istiyorum.

Şu an muhtemelen kodda direkt expo-file-system.writeAsync / readAsync 
veya AsyncStorage.setItem / getItem çağrıları var. Bunları tek bir 
wrapper'ın arkasına alacağız.

Yapılacaklar:
1. src/storage/ klasörü oluştur
2. src/storage/index.ts dosyasında bir storage objesi tanımla:
   - saveContract(contract: Contract): Promise<void>
   - loadContract(id: string): Promise<Contract | null>
   - listContracts(): Promise<Contract[]>
   - deleteContract(id: string): Promise<void>
   - saveOwner(owner: Owner): Promise<void>
   - loadOwner(id: string): Promise<Owner | null>
   - listOwners(): Promise<Owner[]>
   - (mevcut kodda ne kullanılıyorsa hepsini ekle)
3. Bu metotların IÇINI mevcut storage çağrılarıyla doldur — yani 
   davranış aynı kalsın, sadece sarmalanmış olsun.
4. Kodun geri kalanında storage çağrılarını teker teker bu wrapper'a 
   yönlendir (refactor).
5. Hiçbir özelliğin çalışması değişmemeli.

Önce projeyi oku: src/ klasörünü tara, mevcut storage çağrılarının 
listesini çıkar, sonra plan sun. Plan'ı onaylayınca refactor'a başla.
```

> Bu adımdan sonra hâlâ uygulamayı aç, regression test listesini bir kez daha geç. Hepsi çalışıyor olmalı.

-----

## 4. Faz 1-6 özet tablosu

|Faz  |Süre     |İçerik                                                       |Risk  |
|-----|---------|-------------------------------------------------------------|------|
|**0**|1 hafta  |Git tag, backup, storage abstraction                         |Sıfır |
|**1**|2 hafta  |Supabase backend, cloud storage, API key sunucuya            |Düşük |
|**2**|2 hafta  |SMS OTP auth + organizations + memberships                   |Orta  |
|**3**|2 hafta  |Buildings + units + tenants + leases ekranları               |Düşük |
|**4**|3-4 hafta|iyzico/PayTR ödeme + mobil imza entegrasyonu                 |Yüksek|
|**5**|2 hafta  |Otomatik gecikme + KEP + GMSİ raporu                         |Düşük |
|**6**|2 hafta  |SaaS abonelik sistemi + Play Store production + iOS App Store|Orta  |

-----

## 5. Risk yönetimi

### 5.1 Branch stratejisi

- `main` → her zaman çalışan, Play Store’a gidebilen kod
- `saas-conversion` → tüm yeni geliştirme
- Her faz bitiminde **regression test geçerse** `main`’e merge, yeni sürüm yayını

### 5.2 Feature flags

Uygulamada şu sabitler tanımlanır:

```typescript
// src/config/features.ts
export const FEATURES = {
  USE_CLOUD_STORAGE: false,    // Faz 1'de açılır
  REQUIRE_LOGIN: false,         // Faz 2'de açılır
  PAYMENT_ENABLED: false,       // Faz 4'te açılır
  MOBILE_SIGNATURE: false,      // Faz 4'te açılır
  DELINQUENCY_AUTO: false,      // Faz 5'te açılır
}
```

Bir özellik production’da bug çıkarırsa flag false yapılır, kullanıcılar eski davranışa döner.

### 5.3 Rollback prosedürü

Acil durumda:

```bash
git checkout v1.0-pre-saas
eas build --platform android --profile production
# Play Store'a yeni build yükle (versionCode +1)
```

Toplam süre: ~30 dakika.

### 5.4 Veri güvenliği

- Mevcut lokal veriler **silinmez** — Faz 1’de buluta kopyalanır
- Migration script tek yönlü: lokal → bulut, bulut → lokal değil
- İlk migration’dan sonra 30 gün boyunca lokal veri saklanır (fallback için)

-----

## 6. Önemli teknik kararlar

### 6.1 Stack

- **Frontend:** React Native + Expo (Development Build) — mevcut stack korunuyor
- **Backend:** Supabase (Frankfurt) + Türkiye’de NestJS mikroservis
- **Veritabanı:** PostgreSQL (Supabase managed) + RLS multi-tenancy
- **Auth:** Supabase Auth (SMS OTP — Türkiye için Twilio/Netgsm)
- **Storage:** Supabase Storage (PDF’ler, kimlik fotoları)

### 6.2 Ödeme entegrasyonları

- **iyzico** (birincil, marketplace API’si en güçlü)
- **PayTR** (alternatif, daha ucuz)
- **Param** (yerli, banka destekli)
- **Strateji:** Adapter pattern — uygulamada `paymentProvider` seçilebilir, sağlayıcı değiştirme kolaylığı

### 6.3 Dijital imza katmanları

1. **Mobil imza** (TÜRKKEP/e-Güven) — yasal olarak ıslak imza eşdeğeri
1. **Basit e-imza** (SMS OTP + ekran imzası) — ticari geçerli, fallback
1. **e-İmza NES** (USB token) — kurumsal kiracılar için Faz 6+’da

### 6.4 Para birimi

- Veritabanında **INTEGER kuruş** olarak saklanır
- 15.000,00 TL → `1500000` (kuruş)
- Float kullanılmaz (yuvarlama hatası yasak)

### 6.5 Türkiye’ye özel alanlar

- `tc_no` — 11 hane, T.C. kimlik no algoritmasıyla doğrulanır
- `tax_id` — 10 hane vergi no veya 11 hane T.C.
- `iban` — TR ile başlayan 26 karakter
- `kep_address` — KEP adresi (örn. [firma@hs01.kep.tr](mailto:firma@hs01.kep.tr))

### 6.6 KVKK uyumluluğu

- Tüm kullanıcılardan açık rıza alınır (`users.kvkk_consent_at`)
- Hassas veri (TC kimlik) maskelenir görsel arayüzde
- Audit log — her sözleşme değişikliği kayıt altında
- Veri saklama süresi politikası tanımlanır (10 yıl — TBK ve TTK gereği)

-----

## 7. Erteleme listesi (v1’de yok, sonra eklenecek)

- **Aidat / apartman yönetimi modülü** — dues_schemes, dues_items, dues_periods, dues_allocations tabloları planlandı ama v1’de devre dışı
- **Kurumsal e-İmza (NES) desteği** — USB token entegrasyonu, Faz 6+
- **Web paneli** — şimdilik sadece mobil; gelecekte mal sahipleri için web admin
- **e-Fatura / e-Arşiv entegrasyonu** — şahıs şirketleri için fatura kesme
- **Mesajlaşma sistemi** — kiracı-mal sahibi in-app chat
- **Çoklu dil** — şimdilik sadece Türkçe; Suriyeli kiracılar için Arapça ileride

-----

## 8. Faz 0 → Faz 1 geçiş prompt’u

Faz 0 tamamlandıktan sonra yeni Claude Code oturumunda şunu yapıştır:

```
Gayrimenk Pro projesinde SaaS dönüşümünün Faz 1'ine başlıyorum.
Proje: C:\Users\Lenovo\Desktop\gayrimenk-sozlesme

Faz 0 durumu (tamamlandı):
- Git tag v1.0-pre-saas konuldu, GitHub'a yedeklendi
- src/storage/ wrapper katmanı yazıldı, tüm storage çağrıları oradan geçiyor
- Mevcut tüm özellikler test edildi, çalışıyor
- Anthropic API key durumu: [açıkla — .env'de mi, kodda mı?]

Faz 1 hedefi: Supabase backend kurulumu, lokal storage'dan cloud'a 
geçiş, API key'in sunucuya taşınması.

Yapılacaklar:
1. Supabase projesi oluştur (region: eu-central-1)
2. Veritabanı şemasını uygula (22 tablo — şema dökümanı paylaşacağım)
3. Row Level Security policy'lerini yaz (multi-tenant izolasyon)
4. src/storage/ wrapper'ının içine Supabase implementation ekle
5. FEATURES.USE_CLOUD_STORAGE feature flag'i tanımla
6. Migration script: lokal veriyi buluta kopyala
7. Anthropic API çağrılarını NestJS backend üzerinden geçir

Önemli kural: Bu faz boyunca hiçbir KULLANICI ÖZELLİĞİ değişmemeli. 
Regression test listesi GAYRIMENK-PRO-SAAS-DONUSUM-PLANI.md'de.

Önce projeyi oku, mevcut yapıyı anla, sonra plan sun.
```

-----

## 9. Acil durum kontak listesi

- **Mevcut çalışan sürüm:** `git tag v1.0-pre-saas` (yerel + GitHub)
- **Play Store yayın hesabı:** batusonmez
- **Expo hesabı:** expo.dev/accounts/batusonmez/projects/gayrimenk-pro
- **Bu doküman:** Proje kök dizinine `GAYRIMENK-PRO-SAAS-DONUSUM-PLANI.md` olarak konulacak, her oturumda referans

-----

*Bu plan canlı bir dokümandır. Faz tamamlandıkça güncellenir, yeni kararlar buraya işlenir.*