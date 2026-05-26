import { VARSAYILAN_OZEL_MADDELER, VARSAYILAN_GENEL_MADDELER } from '../constants/prompts';
import { sayiYaziya } from '../utils/sayiYaziya';

export function generateKiraSozlesmesiHTML(data: Record<string, string>, ozelMaddeler?: string[], genelMaddeler?: string[], fotograflar?: Record<string, string>, esyaListesi?: { ad: string; marka: string; adet: string }[]): string {
  const yillikKira = data.aylik_kira
    ? (parseInt(data.aylik_kira.replace(/\./g, '')) * 12).toLocaleString('tr-TR') + ' TL'
    : '.....................';

  const esyaVar = data.simdiki_durum === 'Eşyalı' && esyaListesi && esyaListesi.length > 0;
  const fotoVar = fotograflar && (fotograflar.kirayanOn || fotograflar.kiraciOn);
  const sayfaSayisi = 3 + (esyaVar ? 2 : 0) + (fotoVar ? 1 : 0);
  const toplamSayfa = sayfaSayisi * 2;
  const toplamSayfaYazi = sayiYaziya(toplamSayfa);

  const kefilSayisi = parseInt(data.kefil_sayisi || '0');
  const kefilVar = data.kefil_var === 'Evet' && kefilSayisi > 0;
  const sutunGenislik = kefilVar ? (kefilSayisi === 2 ? '25%' : '33%') : '50%';

  const imzaDetayli = `
<table class="imza-table">
  <tr>
    <td style="border:1px solid #000;padding:8px;text-align:center;width:${sutunGenislik};font-size:8pt">
      <b>MAL SAHİBİ</b><br><br>
      ${data.kiraya_veren_ad || '...................'}<br>
      TC: ${data.kiraya_veren_tc || '...................'}<br>
      ${data.kirayan_vekalet === 'Evet' ? `<br><i>Vekaleten:</i><br>${data.kirayan_vekil_ad || '...................'}<br>TC: ${data.kirayan_vekil_tc || '...................'}<br>` : ''}
      <br>İmza: ...................
    </td>
    ${kefilVar ? `<td style="border:1px solid #000;padding:8px;text-align:center;width:${sutunGenislik};font-size:8pt">
      <b>1. KEFİL</b><br>(${data.kefil1_ad || '...................'} / TC: ${data.kefil1_tc || '...................'})
      <br><br>İmza: ...................
    </td>` : ''}
    ${kefilVar && kefilSayisi === 2 ? `<td style="border:1px solid #000;padding:8px;text-align:center;width:${sutunGenislik};font-size:8pt">
      <b>2. KEFİL</b><br>(${data.kefil2_ad || '...................'} / TC: ${data.kefil2_tc || '...................'})
      <br><br>İmza: ...................
    </td>` : ''}
    <td style="border:1px solid #000;padding:8px;text-align:center;width:${sutunGenislik};font-size:8pt">
      <b>KİRACI</b><br><br>
      ${data.kiraci_ad || '...................'}<br>
      TC: ${data.kiraci_tc || '...................'}<br>
      ${data.kiraci_vekalet === 'Evet' ? `<br><i>Vekaleten:</i><br>${data.kiraci_vekil_ad || '...................'}<br>TC: ${data.kiraci_vekil_tc || '...................'}<br>` : ''}
      <br>İmza: ...................
    </td>
  </tr>
</table>`;

  const imzaKisa = `
<table class="imza-table">
  <tr>
    <td style="border:1px solid #000;padding:16px 8px 8px 8px;text-align:center;width:${sutunGenislik}">
      <b>MAL SAHİBİ</b><br>
      ${data.kirayan_vekalet === 'Evet' ? `<i style="font-size:8pt">Vekaleten: ${data.kirayan_vekil_ad || '...................'}</i><br>` : ''}
      <br>İmza: ...................
    </td>
    ${kefilVar ? `<td style="border:1px solid #000;padding:30px 8px 8px 8px;text-align:center;width:${sutunGenislik}">
      <b>1. KEFİL</b><br><br>İmza: ...................
    </td>` : ''}
    ${kefilVar && kefilSayisi === 2 ? `<td style="border:1px solid #000;padding:30px 8px 8px 8px;text-align:center;width:${sutunGenislik}">
      <b>2. KEFİL</b><br><br>İmza: ...................
    </td>` : ''}
    <td style="border:1px solid #000;padding:16px 8px 8px 8px;text-align:center;width:${sutunGenislik}">
      <b>KİRACI</b><br>
      ${data.kiraci_vekalet === 'Evet' ? `<i style="font-size:8pt">Vekaleten: ${data.kiraci_vekil_ad || '...................'}</i><br>` : ''}
      <br>İmza: ...................
    </td>
  </tr>
</table>`;

  const imgSrc = (b64: string) => b64.startsWith('data:image') ? b64 : `data:image/jpeg;base64,${b64}`;
  const imgStyle = `max-width:100%;max-height:280px;object-fit:contain;display:block;margin:auto;border:1px solid #ccc;image-rendering:-webkit-optimize-contrast;image-rendering:high-quality`;

  const fotoBlok = (baslik: string, on: string, arka: string) => `
<div style="border:1px solid #ccc;border-radius:4px;padding:8px;margin-bottom:10px;">
  <div style="font-weight:bold;font-size:10pt;margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid #ddd">${baslik}</div>
  <table style="width:100%;border-collapse:collapse">
    <tr>
      <td style="padding:4px;text-align:center;font-size:8pt;font-weight:bold;width:50%">Ön Yüz</td>
      <td style="padding:4px;text-align:center;font-size:8pt;font-weight:bold;width:50%">Arka Yüz</td>
    </tr>
    <tr>
      <td style="padding:4px;text-align:center">
        <img src="${imgSrc(on)}" style="${imgStyle}"/>
      </td>
      <td style="padding:4px;text-align:center">
        ${arka ? `<img src="${imgSrc(arka)}" style="${imgStyle}"/>` : '<span style="color:#aaa;font-size:8pt">Eklenmedi</span>'}
      </td>
    </tr>
  </table>
</div>`;

  const tbAc = `<table style="width:calc(100% - 16px);border-collapse:collapse;border:2px solid #1a2e1a;margin:0;padding:0"><tr><td style="padding:8px;border:none">`;
  const tbKapat = `</td></tr></table>`;

  const fotografBolumu = fotograflar && (fotograflar.kirayanOn || fotograflar.kiraciOn) ? `
<div class="page-break"></div>
${tbAc}
<div class="section-title">KİMLİK FOTOĞRAFLARI</div>
<table style="width:100%;border-collapse:separate;border-spacing:6px">
  <tr>
    <td style="width:50%;vertical-align:top;border:none;padding:4px">
      ${fotograflar.kirayanOn ? fotoBlok('Kiraya Veren', fotograflar.kirayanOn, fotograflar.kirayanArka || '') : ''}
    </td>
    <td style="width:50%;vertical-align:top;border:none;padding:4px">
      ${fotograflar.kiraciOn ? fotoBlok('Kiracı', fotograflar.kiraciOn, fotograflar.kiraciArka || '') : ''}
    </td>
  </tr>
  ${fotograflar.kefil1On || fotograflar.kefil2On ? `<tr>
    <td style="width:50%;vertical-align:top;border:none;padding:4px">
      ${fotograflar.kefil1On ? fotoBlok('1. Kefil', fotograflar.kefil1On, fotograflar.kefil1Arka || '') : ''}
    </td>
    <td style="width:50%;vertical-align:top;border:none;padding:4px">
      ${fotograflar.kefil2On ? fotoBlok('2. Kefil', fotograflar.kefil2On, fotograflar.kefil2Arka || '') : ''}
    </td>
  </tr>` : ''}
</table>
${tbKapat}
` : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @page { margin: 10mm; size: A4; }
  body { font-family: Arial, sans-serif; font-size: 10pt; color: #000; }
  h1 { text-align: center; font-size: 13pt; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  td { border: 1px solid #000; padding: 5px 8px; font-size: 9.5pt; line-height: normal; }
  .label { font-weight: bold; width: 55%; background: #f5f5f5; }
  .value { width: 45%; }
  .section-title { font-weight: bold; font-size: 11pt; margin: 12px 0 6px 0; text-align: center; }
  .madde { font-size: 8.5pt; margin-bottom: 4px; line-height: 1.4; text-align: justify; }
  .imza-table td { border: 1px solid #000; padding: 30px 8px 8px 8px; text-align: center; font-size: 9pt; }
  .page-break { page-break-before: always; }
</style>
</head>
<body>

${tbAc}
<h1>KİRA SÖZLEŞMESİ</h1>
<table>
  <tr><td class="label">Taşınmazın İli / İlçesi</td><td class="value">${data.il_ilce || ''}</td></tr>
  <tr><td class="label">Taşınmazın Mahallesi</td><td class="value">${data.mahalle || ''}</td></tr>
  <tr><td class="label">Taşınmazın Caddesi / Sokağı</td><td class="value">${data.cadde_sokak || ''}</td></tr>
  <tr><td class="label">Taşınmazın Kapı / Ada Parsel Numarası</td><td class="value">${data.kapi_no || ''}</td></tr>
  <tr><td class="label">Taşınmazın Cinsi</td><td class="value">${data.tasinmaz_cinsi || ''}</td></tr>
  <tr><td class="label">Kiraya Verenin Adı Soyadı / Ticari Ünvanı</td><td class="value">${data.kiraya_veren_ad || ''}</td></tr>
  <tr><td class="label">Kiraya Verenin T.C. Kimlik / Vergi Kimlik Numarası</td><td class="value">${data.kiraya_veren_tc || ''}</td></tr>
  <tr><td class="label">Kiraya Verenin Ev / İş Adresi</td><td class="value">${data.kiraya_veren_adres || ''}</td></tr>
  <tr><td class="label">Kiraya Verenin Telefon Numarası</td><td class="value">${data.kiraya_veren_tel || ''}</td></tr>
  <tr><td class="label">Kiracının Adı Soyadı / Ticari Ünvanı</td><td class="value">${data.kiraci_ad || ''}</td></tr>
  <tr><td class="label">Kiracının T.C. Kimlik / Vergi Kimlik Numarası</td><td class="value">${data.kiraci_tc || ''}</td></tr>
  <tr><td class="label">Kiracının Ev / İş Adresi</td><td class="value">${data.kiraci_adres || ''}</td></tr>
  <tr><td class="label">Kiracının Telefon Numarası</td><td class="value">${data.kiraci_tel || ''}</td></tr>
  <tr><td class="label">Bir Aylık Kira Bedeli</td><td class="value">${data.aylik_kira || ''} TL</td></tr>
  <tr><td class="label">Bir Yıllık Kira Bedeli</td><td class="value">${yillikKira}</td></tr>
  <tr><td class="label">Kiranın Nasıl Ödeneceği ve Banka Hesap Bilgileri</td><td class="value">${data.odeme_sekli || ''}</td></tr>
  <tr><td class="label">Kira Başlangıç Tarihi</td><td class="value">${data.baslangic_tarihi || ''}</td></tr>
  <tr><td class="label">Kira Bitiş Tarihi</td><td class="value">${data.bitis_tarihi || ''}</td></tr>
  <tr><td class="label">Taşınmazın Şimdiki Durumu</td><td class="value">${data.simdiki_durum || ''}</td></tr>
  <tr><td class="label">Taşınmazın Kiralanma Amacı</td><td class="value">${data.kiralama_amaci || ''}</td></tr>
  <tr><td class="label">Teslim Edilen Demirbaş Eşyalar</td><td class="value">${data.demirbaslar || ''}</td></tr>
</table>
${imzaDetayli}
${tbKapat}
<div class="page-break"></div>
${tbAc}
<div class="section-title">ÖZEL KOŞULLAR</div>
${(ozelMaddeler && ozelMaddeler.length > 0 ? ozelMaddeler : VARSAYILAN_OZEL_MADDELER(data))
  .map((madde, i) => `<div class="madde"><b>${i + 1}-</b> ${madde}</div>`).join('\n')}
${imzaKisa}
${tbKapat}
<div class="page-break"></div>
${tbAc}
<div class="section-title">GENEL KOŞULLAR</div>
${(genelMaddeler && genelMaddeler.length > 0 ? genelMaddeler : VARSAYILAN_GENEL_MADDELER(esyaVar, data))
  .map((madde, i) => {
    let metin = madde.replace('{yetkili_mahkeme}', `<b>${data.yetkili_mahkeme || '............'}</b>`);
    if (i === 6) metin = `İşbu kira sözleşmesi 2 (iki) nüsha ve ${toplamSayfa} (${toplamSayfaYazi}) sayfa olarak, taraflarca okunarak serbest iradeleri ile kabul ve taahhüt edilerek imza altına alınmıştır.`;
    return `<div class="madde"><b>${i + 1}-</b> ${metin}</div>`;
  }).join('\n')}
<p style="text-align:center;font-size:8pt;margin-top:16px;color:#555">Gayrimenk.com tarafından hazırlanmıştır.</p>
${imzaKisa}
${tbKapat}

${esyaVar ? `
<div class="page-break"></div>
${tbAc}
<h2 style="text-align:center;font-size:14pt;margin-bottom:16px">EŞYALI KİRALIK DAİRE TESLİM BELGELERİ</h2>
<div style="margin-bottom:12px">
  <h3 style="font-size:8pt;color:#1a2e1a;margin-bottom:6px">KİRALANAN TAŞINMAZ BİLGİLERİ</h3>
  <table style="width:100%;border-collapse:collapse">
    <tr><td style="padding:4px 6px;border:1px solid #ddd;width:40%;background:#f5f5f5;font-weight:bold;font-size:8.5pt">Açık Adres</td><td style="padding:4px 6px;border:1px solid #ddd;font-size:8.5pt">${data.mahalle || ''} ${data.cadde_sokak || ''} ${data.kapi_no || ''} ${data.il_ilce || ''}</td></tr>
    <tr><td style="padding:4px 6px;border:1px solid #ddd;background:#f5f5f5;font-weight:bold;font-size:8.5pt">Ev Sahibi Ad Soyad</td><td style="padding:4px 6px;border:1px solid #ddd;font-size:8.5pt">${data.kiraya_veren_ad || ''}</td></tr>
    <tr><td style="padding:4px 6px;border:1px solid #ddd;background:#f5f5f5;font-weight:bold;font-size:8.5pt">Ev Sahibi TC</td><td style="padding:4px 6px;border:1px solid #ddd;font-size:8.5pt">${data.kiraya_veren_tc || ''}</td></tr>
    <tr><td style="padding:4px 6px;border:1px solid #ddd;background:#f5f5f5;font-weight:bold;font-size:8.5pt">Kiracı Ad Soyad</td><td style="padding:4px 6px;border:1px solid #ddd;font-size:8.5pt">${data.kiraci_ad || ''}</td></tr>
    <tr><td style="padding:4px 6px;border:1px solid #ddd;background:#f5f5f5;font-weight:bold;font-size:8.5pt">Kiracı TC</td><td style="padding:4px 6px;border:1px solid #ddd;font-size:8.5pt">${data.kiraci_tc || ''}</td></tr>
  </table>
</div>
<h3 style="font-size:8pt;color:#1a2e1a;margin-bottom:4px">DEMİRBAŞ (EŞYA) LİSTESİ</h3>
<p style="font-size:8pt;color:#555;margin-bottom:6px">Kiralanan taşınmaz aşağıdaki eşyalar ile birlikte kiracıya teslim edilmiştir.</p>
<table style="width:100%;border-collapse:collapse">
  <tr>
    <th style="background:#1a2e1a;color:#fff;padding:6px;font-size:8pt;text-align:left;width:5%">Sıra</th>
    <th style="background:#1a2e1a;color:#fff;padding:6px;font-size:8pt;text-align:left;width:25%">Eşya Adı</th>
    <th style="background:#1a2e1a;color:#fff;padding:6px;font-size:8pt;text-align:left;width:15%">Marka</th>
    <th style="background:#1a2e1a;color:#fff;padding:6px;font-size:8pt;text-align:center;width:5%">Adet</th>
    <th style="background:#1a2e1a;color:#fff;padding:6px;font-size:8pt;text-align:left;width:5%">Sıra</th>
    <th style="background:#1a2e1a;color:#fff;padding:6px;font-size:8pt;text-align:left;width:25%">Eşya Adı</th>
    <th style="background:#1a2e1a;color:#fff;padding:6px;font-size:8pt;text-align:left;width:15%">Marka</th>
    <th style="background:#1a2e1a;color:#fff;padding:6px;font-size:8pt;text-align:center;width:5%">Adet</th>
  </tr>
  ${esyaListesi!.reduce((rows, esya, i) => {
    if (i % 2 === 0) {
      const sonraki = esyaListesi![i + 1];
      rows.push(`
    <tr style="background:${Math.floor(i / 2) % 2 === 0 ? '#fff' : '#f9f9f9'}">
      <td style="padding:3px 6px;border:1px solid #ddd;font-size:8pt;width:5%">${i + 1}</td>
      <td style="padding:3px 6px;border:1px solid #ddd;font-size:8pt;width:25%">${esya.ad}</td>
      <td style="padding:3px 6px;border:1px solid #ddd;font-size:8pt;width:15%">${esya.marka || '-'}</td>
      <td style="padding:3px 6px;border:1px solid #ddd;font-size:8pt;width:5%;text-align:center">${esya.adet}</td>
      <td style="padding:3px 6px;border:1px solid #ddd;font-size:8pt;width:5%">${sonraki ? i + 2 : ''}</td>
      <td style="padding:3px 6px;border:1px solid #ddd;font-size:8pt;width:25%">${sonraki ? sonraki.ad : ''}</td>
      <td style="padding:3px 6px;border:1px solid #ddd;font-size:8pt;width:15%">${sonraki ? (sonraki.marka || '-') : ''}</td>
      <td style="padding:3px 6px;border:1px solid #ddd;font-size:8pt;width:5%;text-align:center">${sonraki ? sonraki.adet : ''}</td>
    </tr>`);
    }
    return rows;
  }, [] as string[]).join('')}
</table>
<table style="width:100%;border-collapse:collapse;margin-top:16px">
  <tr>
    <td style="border:1px solid #000;padding:16px 8px 8px 8px;text-align:center;width:50%"><b>TESLİM EDEN (MAL SAHİBİ)</b><br><br>${data.kiraya_veren_ad || '...................'}<br><br>İmza: ...................</td>
    <td style="border:1px solid #000;padding:16px 8px 8px 8px;text-align:center;width:50%"><b>TESLİM ALAN (KİRACI)</b><br><br>${data.kiraci_ad || '...................'}<br><br>İmza: ...................</td>
  </tr>
</table>
${tbKapat}
<div class="page-break"></div>
${tbAc}
<h2 style="text-align:center;font-size:14pt;margin-bottom:16px">ANAHTAR TESLİM TUTANAĞI</h2>
<table style="width:100%;border-collapse:collapse;margin-bottom:16px">
  <tr><td style="padding:4px 6px;border:1px solid #ddd;width:40%;background:#f5f5f5;font-weight:bold;font-size:8.5pt">Taşınmaz Adresi</td><td style="padding:4px 6px;border:1px solid #ddd;font-size:8.5pt">${data.mahalle || ''} ${data.cadde_sokak || ''} ${data.kapi_no || ''}</td></tr>
  <tr><td style="padding:4px 6px;border:1px solid #ddd;background:#f5f5f5;font-weight:bold;font-size:8.5pt">Teslim Eden</td><td style="padding:4px 6px;border:1px solid #ddd;font-size:8.5pt">${data.kiraya_veren_ad || ''} (TC: ${data.kiraya_veren_tc || ''})</td></tr>
  <tr><td style="padding:4px 6px;border:1px solid #ddd;background:#f5f5f5;font-weight:bold;font-size:8.5pt">Teslim Alan</td><td style="padding:4px 6px;border:1px solid #ddd;font-size:8.5pt">${data.kiraci_ad || ''} (TC: ${data.kiraci_tc || ''})</td></tr>
  <tr><td style="padding:4px 6px;border:1px solid #ddd;background:#f5f5f5;font-weight:bold;font-size:8.5pt">Teslim Tarihi</td><td style="padding:4px 6px;border:1px solid #ddd;font-size:8.5pt">${data.baslangic_tarihi || ''}</td></tr>
</table>
<table style="width:100%;border-collapse:collapse;margin-bottom:16px">
  <tr>
    <th style="background:#1a2e1a;color:#fff;padding:8px;font-size:9pt;text-align:left;width:60%">Anahtar Türü</th>
    <th style="background:#1a2e1a;color:#fff;padding:8px;font-size:9pt;text-align:center;width:20%">Adet</th>
    <th style="background:#1a2e1a;color:#fff;padding:8px;font-size:9pt;text-align:center;width:20%">İade</th>
  </tr>
  <tr style="background:#fff"><td style="padding:8px;border:1px solid #ddd;font-size:9pt">Daire Anahtarı</td><td style="padding:8px;border:1px solid #ddd;font-size:9pt;text-align:center">............</td><td style="padding:8px;border:1px solid #ddd;font-size:9pt;text-align:center">............</td></tr>
  <tr style="background:#f9f9f9"><td style="padding:8px;border:1px solid #ddd;font-size:9pt">Bina Giriş Anahtarı</td><td style="padding:8px;border:1px solid #ddd;font-size:9pt;text-align:center">............</td><td style="padding:8px;border:1px solid #ddd;font-size:9pt;text-align:center">............</td></tr>
  <tr style="background:#fff"><td style="padding:8px;border:1px solid #ddd;font-size:9pt">Posta Kutusu Anahtarı</td><td style="padding:8px;border:1px solid #ddd;font-size:9pt;text-align:center">............</td><td style="padding:8px;border:1px solid #ddd;font-size:9pt;text-align:center">............</td></tr>
  <tr style="background:#f9f9f9"><td style="padding:8px;border:1px solid #ddd;font-size:9pt">Garaj / Otopark Anahtarı</td><td style="padding:8px;border:1px solid #ddd;font-size:9pt;text-align:center">............</td><td style="padding:8px;border:1px solid #ddd;font-size:9pt;text-align:center">............</td></tr>
  <tr style="background:#fff"><td style="padding:8px;border:1px solid #ddd;font-size:9pt">Diğer</td><td style="padding:8px;border:1px solid #ddd;font-size:9pt;text-align:center">............</td><td style="padding:8px;border:1px solid #ddd;font-size:9pt;text-align:center">............</td></tr>
</table>
<p style="font-size:9pt;margin-bottom:12px">Yukarıda belirtilen anahtarlar tarafımca eksiksiz teslim alınmıştır. Kira süresi sonunda anahtarları eksiksiz iade edeceğimi kabul ve taahhüt ederim.</p>
<p style="text-align:center;font-size:8pt;margin-top:12px;color:#555">Gayrimenk.com tarafından hazırlanmıştır</p>
<table style="width:100%;border-collapse:collapse;margin-top:16px">
  <tr>
    <td style="border:1px solid #000;padding:16px 8px 8px 8px;text-align:center;width:50%"><b>TESLİM EDEN (MAL SAHİBİ)</b><br><br>${data.kiraya_veren_ad || '...................'}<br><br>İmza: ...................</td>
    <td style="border:1px solid #000;padding:16px 8px 8px 8px;text-align:center;width:50%"><b>TESLİM ALAN (KİRACI)</b><br><br>${data.kiraci_ad || '...................'}<br><br>İmza: ...................</td>
  </tr>
</table>
${tbKapat}
` : ''}

${fotografBolumu}

</body>
</html>`;
}
