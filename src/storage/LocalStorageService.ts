import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import type { IStorageService } from './IStorageService';
import type { SozlesmeKayit } from './types';

const DOSYA_YOLU = FileSystem.documentDirectory + 'sozlesmeler.json';

export class LocalStorageService implements IStorageService {
  private async dosyaOku(): Promise<SozlesmeKayit[]> {
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

  private async dosyaYaz(kayitlar: SozlesmeKayit[]): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem('sozlesmeler', JSON.stringify(kayitlar));
      return;
    }
    await FileSystem.writeAsStringAsync(DOSYA_YOLU, JSON.stringify(kayitlar));
  }

  async sozlesmeKaydet(kayit: Omit<SozlesmeKayit, 'id' | 'tarih'>): Promise<string> {
    const id = Date.now().toString();
    const tarih = new Date().toLocaleDateString('tr-TR');
    const yeniKayit: SozlesmeKayit = { ...kayit, id, tarih };
    const mevcutlar = await this.dosyaOku();
    mevcutlar.unshift(yeniKayit);
    await this.dosyaYaz(mevcutlar);
    return id;
  }

  async sozlesmeleriGetir(): Promise<SozlesmeKayit[]> {
    return this.dosyaOku();
  }

  async sozlesmeGuncelle(id: string, formData: Record<string, string>, sozlesmeMetni: string, ozelMaddeler?: string[], genelMaddeler?: string[], fotograflar?: Record<string, string>, esyaListesi?: { ad: string; marka: string; adet: string }[]): Promise<void> {
    const mevcutlar = await this.dosyaOku();
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
      await this.dosyaYaz(mevcutlar);
    }
  }

  async sozlesmeSil(id: string): Promise<void> {
    const mevcutlar = await this.dosyaOku();
    await this.dosyaYaz(mevcutlar.filter(s => s.id !== id));
  }
}
