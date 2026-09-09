// =============================================================================
// src/utils/uyari.ts  (YENI DOSYA)
//
// NEDEN VAR: react-native-web'in Alert implementasyonu bos bir fonksiyon
// (class Alert { static alert() {} }). Tarayicida Alert.alert(...) sessizce
// hicbir sey yapiyor. Bu yuzden platforma gore dogru olani cagiran ince bir
// sarmalayici. (Bulgu O3-c, Eylul 2026.)
// =============================================================================

import { Alert, Platform } from 'react-native';

/** Tek butonlu bilgi/hata uyarisi. */
export function uyari(baslik: string, mesaj: string): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(`${baslik}\n\n${mesaj}`);
    } else {
      console.warn(`[uyari] ${baslik}: ${mesaj}`);
    }
    return;
  }
  Alert.alert(baslik, mesaj);
}

/** Onay kutusu. onayla() SADECE kullanici onay verirse calisir. */
export function onay(
  baslik: string,
  mesaj: string,
  onayla: () => void,
  onayMetni = 'Tamam'
): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      if (window.confirm(`${baslik}\n\n${mesaj}`)) onayla();
    }
    return;
  }
  Alert.alert(baslik, mesaj, [
    { text: 'İptal', style: 'cancel' },
    { text: onayMetni, style: 'destructive', onPress: onayla },
  ]);
}

/** Hata nesnesinden kisa, okunabilir teknik detay cikarir. */
export function hataMetni(e: unknown): string {
  if (!e) return 'bilinmeyen hata';
  if (typeof e === 'string') return e;
  const o = e as { message?: string; code?: string; details?: string; hint?: string };
  return [o.code, o.message ?? o.details ?? o.hint].filter(Boolean).join(' — ') || String(e);
}
