// =============================================================================
// src/utils/escapeHtml.ts  (YENI DOSYA)
//
// NEDEN VAR: pdfTemplate.ts ve MalSahibiScreen.tsx HTML'i string birlestirmeyle
// kuruyor ve kullanicinin yazdigi metni dogrudan iceri koyuyor. Metinde < veya >
// varsa etiket olarak yorumlaniyor.
//
// ASIL RISK script degil, BELGE BUTUNLUGU: kiraci adi alanina HTML yazan biri
// uretilen sozlesmenin gorunumunu degistirebilir — metin gizleyebilir,
// ekleyebilir, tabloyu bozabilir. Imzalanacak bir belgede kabul edilemez.
// (Guvenlik denetimi Agustos 2026, bulgu O2.)
// =============================================================================

/**
 * Tek bir degeri HTML'e guvenli hale getirir.
 * null/undefined -> '' (cagri yerlerindeki `|| '...'` varsayilanlari calismaya devam eder)
 */
export function escapeHtml(deger: unknown): string {
  if (deger === null || deger === undefined) return '';
  return String(deger)
    .replace(/&/g, '&amp;')   // & ILK sirada olmali, yoksa asagidakilerin ciktisini bozar
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Bir nesnenin TUM degerlerini kacislar.
 * pdfTemplate'te formData'yi girişte bir kez gecirmek icin — boylece
 * sablondaki onlarca ${data.x} noktasi tek tek sarilmak zorunda kalmiyor.
 */
export function escapeAll(obj: Record<string, string> | undefined | null): Record<string, string> {
  if (!obj) return {};
  const cikti: Record<string, string> = {};
  for (const anahtar of Object.keys(obj)) {
    cikti[anahtar] = escapeHtml(obj[anahtar]);
  }
  return cikti;
}
