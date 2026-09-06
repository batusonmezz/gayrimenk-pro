// =============================================================================
// src/services/sozlesmeMetni.ts  (YENI DOSYA)
//
// Sozlesmenin DUZ METIN karsiligini uretir. PreviewScreen bunu gosterir.
//
// NEDEN VAR: Onizleme kutusu eskiden modelin urettigi metni gosteriyordu ve o
// metin PDF'e HIC girmiyordu — kullanici bir sey okuyup baska bir sey
// bastiriyordu. Bu fonksiyon PDF ile AYNI kaynaktan (formData + ozelMaddeler +
// genelMaddeler) uretiyor, yani onizleme ile cikti yapisal olarak ayni.
//
// pdfTemplate.ts ile ayni sirayi ve ayni alanlari izler. pdfTemplate HTML
// uretir, bu düz metin uretir; ikisi de ayni veriden beslenir.
// =============================================================================

import { VARSAYILAN_OZEL_MADDELER, VARSAYILAN_GENEL_MADDELER } from '../constants/prompts';
import { sayiYaziya } from '../utils/sayiYaziya';

export type EsyaKalemi = { ad: string; marka: string; adet: string };

// DIKKAT: sayfa sayisi formulu pdfTemplate.ts:11-13 ile AYNI olmak zorunda.
// Ikisi ayrilirsa onizleme ile PDF farkli sayfa sayisi yazar.
// Ileride ortak bir helper'a cikarilmali (acik borc).
function hesaplaSayfaIfade(esyaVar: boolean, fotoVar: boolean): string {
  const sayfaSayisi = 3 + (esyaVar ? 2 : 0) + (fotoVar ? 1 : 0);
  const toplamSayfa = sayfaSayisi * 2;
  return `${toplamSayfa} (${sayiYaziya(toplamSayfa)})`;
}

export function sozlesmeMetniUret(
  data: Record<string, string>,
  ozelMaddeler?: string[],
  genelMaddeler?: string[],
  fotograflar?: Record<string, string>,
  esyaListesi?: EsyaKalemi[]
): string {
  const bos = '............';
  const esyaVar = data.simdiki_durum === 'Eşyalı' && !!esyaListesi && esyaListesi.length > 0;
  const fotoVar = !!fotograflar && !!(fotograflar.kirayanOn || fotograflar.kiraciOn);
  const sayfaIfade = hesaplaSayfaIfade(esyaVar, fotoVar);

  // pdfTemplate.ts:5-7 ile ayni hesap
  const yillikKira = data.aylik_kira
    ? (parseInt(data.aylik_kira.replace(/\./g, ''), 10) * 12).toLocaleString('tr-TR') + ' TL'
    : bos;

  const satir = (etiket: string, deger?: string) => `${etiket}: ${deger || bos}`;

  const bilgiler = [
    satir('Taşınmazın İli / İlçesi', data.il_ilce),
    satir('Taşınmazın Mahallesi', data.mahalle),
    satir('Taşınmazın Caddesi / Sokağı', data.cadde_sokak),
    satir('Taşınmazın Kapı / Ada Parsel Numarası', data.kapi_no),
    satir('Taşınmazın Cinsi', data.tasinmaz_cinsi),
    satir('Kiraya Verenin Adı Soyadı / Ticari Ünvanı', data.kiraya_veren_ad),
    satir('Kiraya Verenin T.C. Kimlik / Vergi Kimlik Numarası', data.kiraya_veren_tc),
    satir('Kiraya Verenin Ev / İş Adresi', data.kiraya_veren_adres),
    satir('Kiraya Verenin Telefon Numarası', data.kiraya_veren_tel),
    satir('Kiracının Adı Soyadı / Ticari Ünvanı', data.kiraci_ad),
    satir('Kiracının T.C. Kimlik / Vergi Kimlik Numarası', data.kiraci_tc),
    satir('Kiracının Ev / İş Adresi', data.kiraci_adres),
    satir('Kiracının Telefon Numarası', data.kiraci_tel),
    satir('Bir Aylık Kira Bedeli', data.aylik_kira ? `${data.aylik_kira} TL` : undefined),
    `Bir Yıllık Kira Bedeli: ${yillikKira}`,
    satir('Kiranın Nasıl Ödeneceği ve Banka Hesap Bilgileri', data.odeme_sekli),
    satir('Kira Başlangıç Tarihi', data.baslangic_tarihi),
    satir('Kira Bitiş Tarihi', data.bitis_tarihi),
    satir('Taşınmazın Şimdiki Durumu', data.simdiki_durum),
    satir('Taşınmazın Kiralanma Amacı', data.kiralama_amaci),
    satir('Teslim Edilen Demirbaş Eşyalar', data.demirbaslar),
  ].join('\n');

  // Imza blogu — pdfTemplate.ts:15-16 ile ayni kefil mantigi
  const kefilSayisi = parseInt(data.kefil_sayisi || '0', 10);
  const kefilVar = data.kefil_var === 'Evet' && kefilSayisi > 0;

  const taraf = (baslik: string, ad?: string, tc?: string, vekilAd?: string) => {
    const vekil = vekilAd ? `\n  Vekaleten: ${vekilAd}` : '';
    return `${baslik}: ${ad || bos} (TC: ${tc || bos})${vekil}`;
  };

  const imzalar = [
    taraf(
      'MAL SAHİBİ',
      data.kiraya_veren_ad,
      data.kiraya_veren_tc,
      data.kirayan_vekalet === 'Evet' ? data.kirayan_vekil_ad || bos : undefined
    ),
    ...(kefilVar ? [taraf('1. KEFİL', data.kefil1_ad, data.kefil1_tc)] : []),
    ...(kefilVar && kefilSayisi === 2 ? [taraf('2. KEFİL', data.kefil2_ad, data.kefil2_tc)] : []),
    taraf(
      'KİRACI',
      data.kiraci_ad,
      data.kiraci_tc,
      data.kiraci_vekalet === 'Evet' ? data.kiraci_vekil_ad || bos : undefined
    ),
  ].join('\n');

  const ozel = (ozelMaddeler && ozelMaddeler.length > 0 ? ozelMaddeler : VARSAYILAN_OZEL_MADDELER(data))
    .map((madde, i) => `${i + 1}- ${madde}`)
    .join('\n\n');

  // pdfTemplate.ts:177-185 ile AYNI iki dalli mantik:
  // yeni kayitlarda {sayfa_sayisi} placeholder'i var, eski kayitlarda yok.
  const genel = (genelMaddeler && genelMaddeler.length > 0 ? genelMaddeler : VARSAYILAN_GENEL_MADDELER(esyaVar, data))
    .map((madde, i) => {
      let metin = madde.replace('{yetkili_mahkeme}', data.yetkili_mahkeme || bos);
      if (metin.includes('{sayfa_sayisi}')) {
        metin = metin.replace('{sayfa_sayisi}', sayfaIfade);
      } else if (metin.startsWith('İşbu kira sözleşmesi 2 (iki) nüsha')) {
        metin = metin.replace('2 (iki) nüsha olarak', `2 (iki) nüsha ve ${sayfaIfade} sayfa olarak`);
      }
      return `${i + 1}- ${metin}`;
    })
    .join('\n\n');

  const bolumler = [
    'KİRA SÖZLEŞMESİ',
    '',
    bilgiler,
    '',
    imzalar,
    '',
    'ÖZEL KOŞULLAR',
    '',
    ozel,
    '',
    'GENEL KOŞULLAR',
    '',
    genel,
  ];

  if (esyaVar) {
    const esyalar = esyaListesi!
      .map((e, i) => `${i + 1}. ${e.ad}${e.marka ? ` / ${e.marka}` : ''} — ${e.adet || '1'} adet`)
      .join('\n');
    bolumler.push('', 'DEMİRBAŞ EŞYA LİSTESİ', '', esyalar);
  }

  bolumler.push('', 'Gayrimenk.com tarafından hazırlanmıştır.');

  return bolumler.join('\n');
}
