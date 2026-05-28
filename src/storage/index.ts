import { USE_CLOUD_STORAGE } from '../config/features';
import { LocalStorageService } from './LocalStorageService';
import { SupabaseStorageService } from './SupabaseStorageService';

export type { SozlesmeKayit } from './types';
export type { IStorageService } from './IStorageService';

const _storage = USE_CLOUD_STORAGE
  ? new SupabaseStorageService()
  : new LocalStorageService();

export const sozlesmeKaydet = _storage.sozlesmeKaydet.bind(_storage);
export const sozlesmeleriGetir = _storage.sozlesmeleriGetir.bind(_storage);
export const sozlesmeGuncelle = _storage.sozlesmeGuncelle.bind(_storage);
export const sozlesmeSil = _storage.sozlesmeSil.bind(_storage);
