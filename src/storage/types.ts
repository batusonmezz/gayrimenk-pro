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
  kiraci_person_id?: string | null;
}
