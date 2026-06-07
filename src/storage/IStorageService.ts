import type { SozlesmeKayit } from './types';

export interface IStorageService {
  sozlesmeKaydet(kayit: Omit<SozlesmeKayit, 'id' | 'tarih'>): Promise<string>;
  sozlesmeleriGetir(): Promise<SozlesmeKayit[]>;
  sozlesmeGuncelle(
    id: string,
    formData: Record<string, string>,
    sozlesmeMetni: string,
    ozelMaddeler?: string[],
    genelMaddeler?: string[],
    fotograflar?: Record<string, string>,
    esyaListesi?: { ad: string; marka: string; adet: string }[],
    kiraciPersonId?: string | null,
    buildingId?: string | null,
    malSahibiPersonId?: string | null
  ): Promise<void>;
  sozlesmeSil(id: string): Promise<void>;
}
