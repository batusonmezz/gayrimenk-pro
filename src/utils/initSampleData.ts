import { sozlesmeKaydet, sozlesmeleriGetir } from '../services/storage';

const ORTAK_FORM = {
  il_ilce: 'Kartepe/Kocaeli',
  mahalle: 'Emekevler Mahallesi',
  cadde_sokak: 'Atatürk Caddesi',
  tasinmaz_cinsi: 'Daire',
  kiraya_veren_ad: 'MEHMET YILMAZ',
  kiraya_veren_tc: '12345678901',
  kiraya_veren_adres: 'Kartepe/Kocaeli',
  kiraya_veren_tel: '0532 000 00 00',
  kefil_var: 'Hayır',
  kiralama_amaci: 'Konut',
  simdiki_durum: 'Boş',
  sure: '1',
  yetkili_mahkeme: 'Kocaeli',
  odeme_gunu: '5',
  odeme_sekli: 'Banka havalesi',
};

const ORNEKLER = [
  {
    kapi_no: 'No:5 D-1',
    kiraci_ad: 'Ali Kaya',
    kiraci_tc: '11122233344',
    kiraci_tel: '0532 111 22 33',
    kiraci_adres: 'Kartepe/Kocaeli',
    aylik_kira: '15.000',
    depozito: '45.000',
    baslangic_tarihi: '01.01.2026',
    bitis_tarihi: '01.01.2027',
  },
  {
    kapi_no: 'No:5 D-2',
    kiraci_ad: 'Ayşe Demir',
    kiraci_tc: '22233344455',
    kiraci_tel: '0533 222 33 44',
    kiraci_adres: 'Kartepe/Kocaeli',
    aylik_kira: '16.000',
    depozito: '48.000',
    baslangic_tarihi: '01.02.2026',
    bitis_tarihi: '01.02.2027',
  },
  {
    kapi_no: 'No:5 D-3',
    kiraci_ad: 'Hasan Çelik',
    kiraci_tc: '33344455566',
    kiraci_tel: '0534 333 44 55',
    kiraci_adres: 'Kartepe/Kocaeli',
    aylik_kira: '14.000',
    depozito: '42.000',
    baslangic_tarihi: '01.03.2026',
    bitis_tarihi: '01.03.2027',
  },
  {
    kapi_no: 'No:5 D-4',
    kiraci_ad: 'Fatma Şahin',
    kiraci_tc: '44455566677',
    kiraci_tel: '0535 444 55 66',
    kiraci_adres: 'Kartepe/Kocaeli',
    aylik_kira: '17.000',
    depozito: '51.000',
    baslangic_tarihi: '01.04.2026',
    bitis_tarihi: '01.04.2027',
  },
  {
    kapi_no: 'No:5 D-5',
    kiraci_ad: 'Mehmet Arslan',
    kiraci_tc: '55566677788',
    kiraci_tel: '0536 555 66 77',
    kiraci_adres: 'Kartepe/Kocaeli',
    aylik_kira: '15.500',
    depozito: '46.500',
    baslangic_tarihi: '01.05.2026',
    bitis_tarihi: '01.05.2027',
  },
];

export async function initSampleData(): Promise<void> {
  const mevcutlar = await sozlesmeleriGetir();
  const ornekVar = mevcutlar.some(k => k.kiraya_veren_ad === 'MEHMET YILMAZ');
  if (ornekVar) return;

  for (const ornek of ORNEKLER) {
    const formData = { ...ORTAK_FORM, ...ornek };
    await sozlesmeKaydet({
      tur: 'Kira Sözleşmesi',
      kiraci_ad: ornek.kiraci_ad,
      kiraya_veren_ad: ORTAK_FORM.kiraya_veren_ad,
      aylik_kira: ornek.aylik_kira,
      formData,
      sozlesmeMetni: '',
    });
  }
}
