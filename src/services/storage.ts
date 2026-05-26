import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

export interface SozlesmeKayit {
  id: string;
  tur: string;
  tarih: string;
  kiraci_ad: string;
  kiraya_veren_ad: string;
  aylik_kira: string;
  formData: Record<string, string>;
  sozlesmeMetni: string;
  ozelMaddeler?: string[];
  genelMaddeler?: string[];
  fotograflar?: Record<string, string>;
  esyaListesi?: { ad: string; marka: string; adet: string }[];
}

const DOSYA_YOLU = FileSystem.documentDirectory + 'sozlesmeler.json';

async function dosyaOku(): Promise<SozlesmeKayit[]> {
  try {
    if (Platform.OS === 'web') {
      const data = localStorage.getItem('sozlesmeler');
      return data ? JSON.parse(data) : [];
    }
    const info = await FileSystem.getInfoAsync(DOSYA_YOLU);
    if (!info.exists) return [];
    const icerik = await FileSystem.readAsStringAsync(DOSYA_YOLU);
    return JSON.parse(icerik);
  } catch { return []; }
}

async function dosyaYaz(kayitlar: SozlesmeKayit[]): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem('sozlesmeler', JSON.stringify(kayitlar));
    return;
  }
  await FileSystem.writeAsStringAsync(DOSYA_YOLU, JSON.stringify(kayitlar));
}

export async function sozlesmeKaydet(kayit: Omit<SozlesmeKayit, 'id' | 'tarih'>): Promise<string> {
  const id = Date.now().toString();
  const tarih = new Date().toLocaleDateString('tr-TR');
  const yeniKayit: SozlesmeKayit = { ...kayit, id, tarih };
  const mevcutlar = await dosyaOku();
  mevcutlar.unshift(yeniKayit);
  await dosyaYaz(mevcutlar);
  return id;
}

export async function sozlesmeleriGetir(): Promise<SozlesmeKayit[]> {
  return dosyaOku();
}

export async function sozlesmeGuncelle(id: string, formData: Record<string, string>, sozlesmeMetni: string, ozelMaddeler?: string[], genelMaddeler?: string[], fotograflar?: Record<string, string>, esyaListesi?: { ad: string; marka: string; adet: string }[]): Promise<void> {
  const mevcutlar = await dosyaOku();
  const index = mevcutlar.findIndex(s => s.id === id);
  if (index !== -1) {
    mevcutlar[index] = {
      ...mevcutlar[index],
      formData,
      sozlesmeMetni,
      ozelMaddeler,
      genelMaddeler,
      fotograflar,
      esyaListesi,
      kiraci_ad: formData.kiraci_ad || mevcutlar[index].kiraci_ad,
      kiraya_veren_ad: formData.kiraya_veren_ad || mevcutlar[index].kiraya_veren_ad,
      aylik_kira: formData.aylik_kira || mevcutlar[index].aylik_kira,
    };
    await dosyaYaz(mevcutlar);
  }
}

export async function sozlesmeSil(id: string): Promise<void> {
  const mevcutlar = await dosyaOku();
  await dosyaYaz(mevcutlar.filter(s => s.id !== id));
}
