import { supabase } from './supabaseClient';
import { decode } from 'base64-arraybuffer';
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

  private async upsertMalSahibiPerson(
    orgId: string,
    data: {
      ad?: string; tc?: string; adres?: string; tel?: string;
      odemeBilgisi?: string;
      kimlikFotoOn?: string;
      kimlikFotoArka?: string;
    },
    existingPersonId?: string | null
  ): Promise<string | null> {
    try {
      if (existingPersonId) return existingPersonId;
      const ad = data.ad?.trim() ?? '';
      if (!ad) return null;
      const tcClean = data.tc?.trim() || null;

      if (tcClean) {
        const { data: existing } = await supabase
          .from('persons')
          .select('id')
          .eq('organization_id', orgId)
          .eq('tc_kimlik', tcClean)
          .maybeSingle();
        if (existing?.id) {
          // Dedup: yalnızca dolu alanları güncelle — boş değerle ezme
          const personId = existing.id as string;
          const patch: Record<string, string> = {};
          if (ad)                  patch.ad_soyad              = ad;
          if (data.tel?.trim())    patch.telefon               = data.tel.trim();
          if (data.adres?.trim())  patch.adres                 = data.adres.trim();
          if (data.odemeBilgisi?.trim()) patch.odeme_bilgisi   = data.odemeBilgisi.trim();
          if (data.kimlikFotoOn?.trim() && !/^[0-9a-f]{8}-[0-9a-f]{4}/.test(data.kimlikFotoOn)) {
            const b64 = data.kimlikFotoOn.trim();
            const ext = b64.startsWith('iVBORw0K') ? 'png' : 'jpg';
            const contentType = b64.startsWith('iVBORw0K') ? 'image/png' : 'image/jpeg';
            const path = `${orgId}/persons/${personId}/on.${ext}`;
            await supabase.storage.from('kimlik-belgeleri').upload(path, decode(b64), { contentType, upsert: true });
            patch.kimlik_foto_url = path;
          }
          if (data.kimlikFotoArka?.trim() && !/^[0-9a-f]{8}-[0-9a-f]{4}/.test(data.kimlikFotoArka)) {
            const b64 = data.kimlikFotoArka.trim();
            const ext = b64.startsWith('iVBORw0K') ? 'png' : 'jpg';
            const contentType = b64.startsWith('iVBORw0K') ? 'image/png' : 'image/jpeg';
            const path = `${orgId}/persons/${personId}/arka.${ext}`;
            await supabase.storage.from('kimlik-belgeleri').upload(path, decode(b64), { contentType, upsert: true });
            patch.kimlik_foto_arka_url = path;
          }
          if (Object.keys(patch).length > 0) {
            await supabase.from('persons').update(patch).eq('id', personId);
          }
          return personId;
        }
      }

      const insert: Record<string, string | null> = {
        organization_id: orgId,
        ad_soyad: ad,
        tc_kimlik: tcClean,
        telefon: data.tel?.trim() || null,
        adres: data.adres?.trim() || null,
        odeme_bilgisi: data.odemeBilgisi?.trim() || null,
        kimlik_foto_url: null,
        kimlik_foto_arka_url: null,
      };
      const { data: inserted, error } = await supabase
        .from('persons')
        .insert(insert)
        .select('id')
        .single();
      if (error) { console.warn('[persons] mal_sahibi insert hata:', error); return null; }
      const personId = inserted.id as string;
      const photoPatch: Record<string, string> = {};
      if (data.kimlikFotoOn?.trim() && !/^[0-9a-f]{8}-[0-9a-f]{4}/.test(data.kimlikFotoOn)) {
        const b64 = data.kimlikFotoOn.trim();
        const ext = b64.startsWith('iVBORw0K') ? 'png' : 'jpg';
        const contentType = b64.startsWith('iVBORw0K') ? 'image/png' : 'image/jpeg';
        const path = `${orgId}/persons/${personId}/on.${ext}`;
        await supabase.storage.from('kimlik-belgeleri').upload(path, decode(b64), { contentType, upsert: true });
        photoPatch.kimlik_foto_url = path;
      }
      if (data.kimlikFotoArka?.trim() && !/^[0-9a-f]{8}-[0-9a-f]{4}/.test(data.kimlikFotoArka)) {
        const b64 = data.kimlikFotoArka.trim();
        const ext = b64.startsWith('iVBORw0K') ? 'png' : 'jpg';
        const contentType = b64.startsWith('iVBORw0K') ? 'image/png' : 'image/jpeg';
        const path = `${orgId}/persons/${personId}/arka.${ext}`;
        await supabase.storage.from('kimlik-belgeleri').upload(path, decode(b64), { contentType, upsert: true });
        photoPatch.kimlik_foto_arka_url = path;
      }
      if (Object.keys(photoPatch).length > 0) {
        await supabase.from('persons').update(photoPatch).eq('id', personId);
      }
      return personId;
    } catch (e) {
      console.warn('[persons] mal_sahibi upsert hata:', e);
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

    const resolvedMalSahibiId = await this.upsertMalSahibiPerson(
      organizationId,
      {
        ad: kayit.formData.kiraya_veren_ad,
        tc: kayit.formData.kiraya_veren_tc,
        adres: kayit.formData.kiraya_veren_adres,
        tel: kayit.formData.kiraya_veren_tel,
        odemeBilgisi: kayit.formData.odeme_sekli,
        kimlikFotoOn: kayit.fotograflar?.kirayanOn,
        kimlikFotoArka: kayit.fotograflar?.kirayanArka,
      },
      kayit.mal_sahibi_person_id
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
        building_id: kayit.building_id ?? null,
        mal_sahibi_person_id: resolvedMalSahibiId ?? null,
      })
      .select('id')
      .single();

    if (contractError) throw contractError;

    const contractId = contract.id as string;

    if (kayit.fotograflar && Object.keys(kayit.fotograflar).length > 0) {
      const photos = await Promise.all(
        Object.entries(kayit.fotograflar).map(async ([key, b64]) => {
          const ext = b64.startsWith('iVBORw0K') ? 'png' : 'jpg';
          const contentType = b64.startsWith('iVBORw0K') ? 'image/png' : 'image/jpeg';
          const path = `${organizationId}/contracts/${contractId}/${key}.${ext}`;
          await supabase.storage.from('kimlik-belgeleri').upload(path, decode(b64), { contentType, upsert: true });
          return { contract_id: contractId, photo_key: key, storage_path: path };
        })
      );
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

    return Promise.all((data ?? []).map(async row => {
      const photoRecord: Record<string, string> = {};
      await Promise.all(
        (row.contract_photos ?? []).map(async (p: { photo_key: string; storage_path: string }) => {
          if (!p.storage_path) return;
          if (!/^[0-9a-f]{8}-[0-9a-f]{4}/.test(p.storage_path)) {
            photoRecord[p.photo_key] = p.storage_path; // eski base64 — olduğu gibi
            return;
          }
          try {
            const { data: blob } = await supabase.storage.from('kimlik-belgeleri').download(p.storage_path);
            if (!blob) return;
            const b64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve((reader.result as string).split(',')[1]);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
            photoRecord[p.photo_key] = b64;
          } catch { /* RLS reddi veya ağ hatası — fotoğraf atlanır */ }
        })
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
        building_id: (row.building_id as string | null) ?? null,
        mal_sahibi_person_id: (row.mal_sahibi_person_id as string | null) ?? null,
      };
    }));
  }

  async sozlesmeGuncelle(
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

    const resolvedMalSahibiPersonId = orgId
      ? await this.upsertMalSahibiPerson(
          orgId,
          {
            ad: formData.kiraya_veren_ad,
            tc: formData.kiraya_veren_tc,
            adres: formData.kiraya_veren_adres,
            tel: formData.kiraya_veren_tel,
            odemeBilgisi: formData.odeme_sekli,
            kimlikFotoOn: fotograflar?.kirayanOn,
            kimlikFotoArka: fotograflar?.kirayanArka,
          },
          malSahibiPersonId
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
        building_id: buildingId ?? null,
        mal_sahibi_person_id: resolvedMalSahibiPersonId ?? malSahibiPersonId ?? null,
      })
      .eq('id', id);

    if (contractError) throw contractError;

    if (fotograflar !== undefined && Object.keys(fotograflar).length > 0) {
      // undefined veya {} gelince mevcut fotoğraflar korunur; sadece dolu set gelince güncellenir
      await supabase.from('contract_photos').delete().eq('contract_id', id);
      const photos = await Promise.all(
        Object.entries(fotograflar).map(async ([key, b64]) => {
          const ext = b64.startsWith('iVBORw0K') ? 'png' : 'jpg';
          const contentType = b64.startsWith('iVBORw0K') ? 'image/png' : 'image/jpeg';
          const path = `${orgId}/contracts/${id}/${key}.${ext}`;
          await supabase.storage.from('kimlik-belgeleri').upload(path, decode(b64), { contentType, upsert: true });
          return { contract_id: id, photo_key: key, storage_path: path };
        })
      );
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
