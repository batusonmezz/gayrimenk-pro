// =============================================================================
// src/storage/eskiVeriTemizle.ts  (YENI DOSYA)
//
// TEK SEFERLIK TEMIZLIK — guvenlik bulgusu O3.
//
// SORUN: LocalStorageService sozlesmeleri cihazda DUZ METIN bir JSON dosyasina
// yaziyordu (sozlesmeler.json / web'de localStorage). Icinde TC kimlik
// numaralari, adresler, telefonlar ve base64 kimlik fotograflari vardi.
// Sifreleme yoktu. KVKK acisindan kabul edilemez.
//
// Kod kaldirildi ama KOD KALDIRMAK DOSYAYI SILMEZ. Daha once bir bulut yazmasi
// basarisiz oldugu icin dosya olusmus cihazlarda o veri durmaya devam eder.
// Bu fonksiyon uygulama acilisinda dosyayi siler.
//
// KARAR (Eylul 2026): dosya YUKLENMEDEN siliniyor. Teorik olarak senkronize
// olmamis bir sozlesme yok edilebilir; ancak o sozlesme zaten uygulamada
// hic goruunmuyordu (okuma yolu bulut basarili olunca lokale hic bakmiyordu),
// yani kullanici acisindan coktan kayipti. Yukleme yolu, kacindigimiz
// senkronizasyon mekanizmasinin kucuk bir hali olurdu.
//
// Idempotent: her acilista guvenle calisir, dosya yoksa hicbir sey yapmaz.
// =============================================================================

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

const ESKI_DOSYA = FileSystem.documentDirectory + 'sozlesmeler.json';
const ESKI_WEB_ANAHTARI = 'sozlesmeler';

/**
 * Kac kayit oldugunu en iyi cabayla sayar. SADECE SAYI loglanir —
 * dosyanin icerigi (TC, ad, foto) HICBIR ZAMAN loglanmaz.
 */
function kayitSayisi(icerik: string): number | null {
  try {
    const veri = JSON.parse(icerik);
    return Array.isArray(veri) ? veri.length : null;
  } catch {
    return null;
  }
}

export async function eskiLokalVeriyiTemizle(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage === 'undefined') return;
      const icerik = localStorage.getItem(ESKI_WEB_ANAHTARI);
      if (icerik === null) return;
      const adet = kayitSayisi(icerik);
      localStorage.removeItem(ESKI_WEB_ANAHTARI);
      console.log(`[temizlik] Eski lokal sozlesme verisi silindi (web), kayit: ${adet ?? 'okunamadi'}`);
      return;
    }

    const bilgi = await FileSystem.getInfoAsync(ESKI_DOSYA);
    if (!bilgi.exists) return;

    // Sayim en iyi caba — okunamazsa yine de silinir.
    let adet: number | null = null;
    try {
      adet = kayitSayisi(await FileSystem.readAsStringAsync(ESKI_DOSYA));
    } catch { /* bozuk dosya — sayilamadi, sorun degil */ }

    await FileSystem.deleteAsync(ESKI_DOSYA, { idempotent: true });
    console.log(`[temizlik] Eski lokal sozlesme dosyasi silindi, kayit: ${adet ?? 'okunamadi'}`);
  } catch (e) {
    // Silinemezse uygulama yine de calismali; bir sonraki aciliste tekrar denenir.
    console.warn('[temizlik] Eski lokal veri silinemedi:', e);
  }
}
