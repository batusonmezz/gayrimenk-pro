import { LocalStorageService } from './LocalStorageService';

export type { SozlesmeKayit } from './types';
export type { IStorageService } from './IStorageService';

const _storage = new LocalStorageService();

export const sozlesmeKaydet = _storage.sozlesmeKaydet.bind(_storage);
export const sozlesmeleriGetir = _storage.sozlesmeleriGetir.bind(_storage);
export const sozlesmeGuncelle = _storage.sozlesmeGuncelle.bind(_storage);
export const sozlesmeSil = _storage.sozlesmeSil.bind(_storage);
