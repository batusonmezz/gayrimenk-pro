import { supabase } from './supabaseClient';
import { getOrganizationId } from '../services/authState';
import type { IStorageService } from './IStorageService';
import type { SozlesmeKayit } from './types';

function trToIso(tr: string): string {
  const [d, m, y] = tr.split('.');
  return `${y}-${m}-${d}`;
}

function isoToTr(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

function parseKurus(aylik_kira: string): number {
  const numeric = (aylik_kira || '0').replace(/[^0-9]/g, '');
  return parseInt(numeric, 10) * 100;
}

export class SupabaseStorageService implements IStorageService {
  private async upsertKiraciPerson(
    orgId: string,
    data: { ad?: string; tc?: string; adres?: string; tel?: string },
    existingPersonId?: string | null
  ): Promise<string | null> {
    try {
      if (existingPersonId) return existingPersonId;
      const ad = data.ad?.trim() ?? '';
      if (!ad) return null;
      const tcClean = data.tc?.trim() || null;
      const telClean = data.tel?.trim() || null;
      const adresClean = data.adres?.trim() || null;

      if (tcClean) {
        const { data: existing } = await supabase
          .from('persons')
          .select('id')
          .eq('organization_id', orgId)
          .eq('tc_kimlik', tcClean)
          .maybeSingle();
        if (existing?.id) return existing.id as string;
      }

      const { data: inserted, error } = await supabase
        .from('persons')
        .insert({ organization_id: orgId, ad_soyad: ad, tc_kimlik: tcClean, telefon: telClean, adres: adresClean })
        .select('id')
        .single();
      if (error) { console.warn('[persons] insert hata:', error); return null; }
      return inserted.id as string;
    } catch (e) {
      console.warn('[persons] upsert hata:', e);
      return null;
    }
  }

  async sozlesmeKaydet(kayit: Omit<SozlesmeKayit, 'id' | 'tarih'>): Promise<string> {
    const tarih = new Date().toLocaleDateString('tr-TR');
    const organizationId = getOrganizationId();
    if (!organizationId) throw new Error('Oturum bilgisi eksik, lütfen tekrar giriş yapın.');

    const resolvedPersonId = await this.upsertKiraciPerson(
      organizationId,
      { ad: kayit.formData.kiraci_ad, tc: kayit.formData.kiraci_tc, adres: kayit.formData.kiraci_adres, tel: kayit.formData.kiraci_tel },
      kayit.kiraci_person_id
    );

    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .insert({
        tur: kayit.tur,
        tarih: trToIso(tarih),
        kiraci_ad: kayit.kiraci_ad,
        kiraya_veren_ad: kayit.kiraya_veren_ad,
        aylik_kira_kurus: parseKurus(kayit.aylik_kira),
        form_data: kayit.formData,
        sozlesme_metni: kayit.sozlesmeMetni,
        ozel_maddeler: kayit.ozelMaddeler ?? [],
        genel_maddeler: kayit.genelMaddeler ?? [],
        organization_id: organizationId,
        kiraci_person_id: resolvedPersonId ?? null,
      })
      .select('id')
      .single();

    if (contractError) throw contractError;

    const contractId = contract.id as string;

    if (kayit.fotograflar && Object.keys(kayit.fotograflar).length > 0) {
      // TODO (Faz sonrası): base64/file URI → Supabase Storage bucket'a yükle, storage_path güncelle
      const photos = Object.entries(kayit.fotograflar).map(([key, uri]) => ({
        contract_id: contractId,
        photo_key: key,
        storage_path: uri,
      }));
      const { error: photosError } = await supabase.from('contract_photos').insert(photos);
      if (photosError) {
        await supabase.from('contracts').delete().eq('id', contractId);
        throw photosError;
      }
    }

    if (kayit.esyaListesi && kayit.esyaListesi.length > 0) {
      const items = kayit.esyaListesi.map(item => ({
        contract_id: contractId,
        ad: item.ad,
        marka: item.marka,
        adet: parseInt(item.adet, 10) || 1,
      }));
      const { error: itemsError } = await supabase.from('contract_items').insert(items);
      if (itemsError) {
        await supabase.from('contracts').delete().eq('id', contractId);
        throw itemsError;
      }
    }

    return contractId;
  }

  async sozlesmeleriGetir(): Promise<SozlesmeKayit[]> {
    const { data, error } = await supabase
      .from('contracts')
      .select('*, contract_photos(*), contract_items(*)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data ?? []).map(row => {
      const photoRecord: Record<string, string> = (row.contract_photos ?? []).reduce(
        (acc: Record<string, string>, p: { photo_key: string; storage_path: string }) => {
          acc[p.photo_key] = p.storage_path;
          return acc;
        },
        {}
      );

      const items: { ad: string; marka: string; adet: string }[] = (row.contract_items ?? []).map(
        (item: { ad: string; marka: string; adet: number }) => ({
          ad: item.ad,
          marka: item.marka,
          adet: String(item.adet),
        })
      );

      return {
        id: row.id as string,
        tur: row.tur as string,
        tarih: isoToTr(row.tarih as string),
        kiraci_ad: row.kiraci_ad as string,
        kiraya_veren_ad: row.kiraya_veren_ad as string,
        aylik_kira: String((row.aylik_kira_kurus as number) / 100),
        formData: row.form_data as Record<string, string>,
        sozlesmeMetni: row.sozlesme_metni as string,
        ozelMaddeler: (row.ozel_maddeler as string[]) ?? [],
        genelMaddeler: (row.genel_maddeler as string[]) ?? [],
        fotograflar:
          Object.keys(photoRecord).length > 0 ? photoRecord : undefined,
        esyaListesi: items.length > 0 ? items : undefined,
        kiraci_person_id: (row.kiraci_person_id as string | null) ?? null,
      };
    });
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
    const orgId =
      getOrganizationId() ??
      ((await supabase.from('contracts').select('organization_id').eq('id', id).single()).data?.organization_id as string | null | undefined) ??
      null;

    const resolvedPersonId = orgId
      ? await this.upsertKiraciPerson(
          orgId,
          { ad: formData.kiraci_ad, tc: formData.kiraci_tc, adres: formData.kiraci_adres, tel: formData.kiraci_tel },
          kiraciPersonId
        )
      : null;

    const { error: contractError } = await supabase
      .from('contracts')
      .update({
        kiraci_ad: formData.kiraci_ad,
        kiraya_veren_ad: formData.kiraya_veren_ad,
        aylik_kira_kurus: parseKurus(formData.aylik_kira ?? '0'),
        form_data: formData,
        sozlesme_metni: sozlesmeMetni,
        ozel_maddeler: ozelMaddeler ?? [],
        genel_maddeler: genelMaddeler ?? [],
        kiraci_person_id: resolvedPersonId ?? kiraciPersonId ?? null,
      })
      .eq('id', id);

    if (contractError) throw contractError;

    if (fotograflar !== undefined && Object.keys(fotograflar).length > 0) {
      // undefined veya {} gelince mevcut fotoğraflar korunur; sadece dolu set gelince güncellenir
      await supabase.from('contract_photos').delete().eq('contract_id', id);
      const photos = Object.entries(fotograflar).map(([key, uri]) => ({
        contract_id: id,
        photo_key: key,
        storage_path: uri,
      }));
      const { error: photosError } = await supabase.from('contract_photos').insert(photos);
      if (photosError) throw photosError;
    }

    if (esyaListesi !== undefined) {
      await supabase.from('contract_items').delete().eq('contract_id', id);
      if (esyaListesi.length > 0) {
        const items = esyaListesi.map(item => ({
          contract_id: id,
          ad: item.ad,
          marka: item.marka,
          adet: parseInt(item.adet, 10) || 1,
        }));
        const { error: itemsError } = await supabase.from('contract_items').insert(items);
        if (itemsError) throw itemsError;
      }
    }
  }

  async sozlesmeSil(id: string): Promise<void> {
    const { error } = await supabase.from('contracts').delete().eq('id', id);
    if (error) throw error;
  }
}
