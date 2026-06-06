// TODO Faz 2: Cloud fail durumunda kullanıcıya UI feedback ver
// (örn: çevrimdışı banner). Şimdilik sadece log + transparent fallback.
// Sync mekanizması Faz 2'de unsynced_contracts tablosu ile gelecek.

import { SupabaseStorageService } from './SupabaseStorageService';
import { LocalStorageService } from './LocalStorageService';
import type { IStorageService } from './IStorageService';
import type { SozlesmeKayit } from './types';

export class HybridStorageService implements IStorageService {
  private cloud = new SupabaseStorageService();
  private local = new LocalStorageService();

  async sozlesmeKaydet(kayit: Omit<SozlesmeKayit, 'id' | 'tarih'>): Promise<string> {
    try {
      const id = await this.cloud.sozlesmeKaydet(kayit);
      console.log('[storage] Cloud kayıt başarılı:', id);
      return id;
    } catch (e) {
      console.warn('[storage] Cloud kayıt başarısız, lokale yazılıyor:', e);
      return this.local.sozlesmeKaydet(kayit);
    }
  }

  async sozlesmeleriGetir(): Promise<SozlesmeKayit[]> {
    try {
      const kayitlar = await this.cloud.sozlesmeleriGetir();
      console.log('[storage] Cloud okuma başarılı:', kayitlar.length, 'kayıt');
      return kayitlar;
    } catch (e) {
      console.warn('[storage] Cloud okuma başarısız, lokalden okunuyor:', e);
      return this.local.sozlesmeleriGetir();
    }
  }

  async sozlesmeGuncelle(
    id: string,
    formData: Record<string, string>,
    sozlesmeMetni: string,
    ozelMaddeler?: string[],
    genelMaddeler?: string[],
    fotograflar?: Record<string, string>,
    esyaListesi?: { ad: string; marka: string; adet: string }[],
    kiraciPersonId?: string | null
  ): Promise<void> {
    try {
      await this.cloud.sozlesmeGuncelle(id, formData, sozlesmeMetni, ozelMaddeler, genelMaddeler, fotograflar, esyaListesi, kiraciPersonId);
      console.log('[storage] Cloud güncelleme başarılı:', id);
    } catch (e) {
      console.warn('[storage] Cloud güncelleme başarısız, lokal güncelleniyor:', e);
      await this.local.sozlesmeGuncelle(id, formData, sozlesmeMetni, ozelMaddeler, genelMaddeler, fotograflar, esyaListesi);
    }
  }

  async sozlesmeSil(id: string): Promise<void> {
    try {
      await this.cloud.sozlesmeSil(id);
      console.log('[storage] Cloud silme başarılı:', id);
    } catch (e) {
      console.warn('[storage] Cloud silme başarısız, lokalden siliniyor:', e);
      await this.local.sozlesmeSil(id);
    }
  }
}
