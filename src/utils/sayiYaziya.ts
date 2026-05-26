export function sayiYaziya(sayi: number): string {
  const birler = ['', 'BİR', 'İKİ', 'ÜÇ', 'DÖRT', 'BEŞ', 'ALTI', 'YEDİ', 'SEKİZ', 'DOKUZ'];
  const onlar = ['', 'ON', 'YİRMİ', 'OTUZ', 'KIRK', 'ELLİ', 'ALTMIŞ', 'YETMİŞ', 'SEKSEN', 'DOKSAN'];

  if (sayi === 0) return 'SIFIR';
  if (sayi < 10) return birler[sayi];
  if (sayi < 100) {
    const on = Math.floor(sayi / 10);
    const bir = sayi % 10;
    return onlar[on] + (bir > 0 ? ' ' + birler[bir] : '');
  }
  return sayi.toString();
}
