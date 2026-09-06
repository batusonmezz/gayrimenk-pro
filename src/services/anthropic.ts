import { HUKUK_ARASTIRMACI_PROMPT, MADDE_DUZENLEYICI_PROMPT } from '../constants/prompts';

const PROXY_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/anthropic-proxy`;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

async function callClaude(systemPrompt: string, userMessage: string): Promise<string> {
  const response = await fetch(PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ systemPrompt, userMessage }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(err.error ?? `HTTP ${response.status}`);
  }
  const data = await response.json();
  return data.content ?? 'Hata oluştu.';
}

export async function hukukArastir(soru: string): Promise<string> {
  return callClaude(HUKUK_ARASTIRMACI_PROMPT, soru);
}

export async function maddeleriDuzenle(maddeler: string[], istek: string): Promise<string[]> {
  const mesaj = `Aşağıda ${maddeler.length} adet madde var. Kullanıcının isteğine göre düzenle.

MEVCUT MADDELER:
${maddeler.map((m, i) => `MADDE ${i + 1}: ${m}`).join('\n\n')}

KULLANICI İSTEĞİ: ${istek}

ÖNEMLİ KURALLAR:
- Kaldır denilen maddeyi tamamen sil
- Ekle denilen maddeyi uygun yere ekle
- Değiştir denilen maddeyi güncelle
- Kalan maddeleri 1'den başlayarak yeniden sırala
- SADECE JSON array döndür, başka hiçbir şey yazma
- Madde numarasını array'e yazma, sadece içeriği yaz

ÇIKTI FORMAT: ["madde içeriği 1", "madde içeriği 2", ...]`;

  const yanit = await callClaude(MADDE_DUZENLEYICI_PROMPT, mesaj);
  try {
    const temiz = yanit.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(temiz);
    if (Array.isArray(parsed)) return parsed;
    return maddeler;
  } catch {
    console.log('[anthropic] maddeleriDuzenle parse hatası:', yanit);
    return maddeler;
  }
}
