import { SOZLESME_YAZARI_PROMPT, HUKUK_ARASTIRMACI_PROMPT, MADDE_DUZENLEYICI_PROMPT } from '../constants/prompts';
import { USE_REMOTE_AI } from '../config/features';

const PROXY_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/anthropic-proxy`;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Fallback: doğrudan Anthropic API (USE_REMOTE_AI=false ise — acil rollback)
const DIRECT_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '';
const DIRECT_API_URL = 'https://api.anthropic.com/v1/messages';

async function callClaude(systemPrompt: string, userMessage: string): Promise<string> {
  if (USE_REMOTE_AI) {
    console.log('[anthropic] Edge Function proxy üzerinden çağrılıyor');
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
      console.error('[anthropic] Proxy hata:', err);
      throw new Error(err.error ?? 'Proxy hatası');
    }
    const data = await response.json();
    return data.content ?? 'Hata oluştu.';
  }

  // USE_REMOTE_AI = false — direkt Anthropic API (rollback modu)
  console.log('[anthropic] Direkt API modu (rollback)');
  const response = await fetch(DIRECT_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': DIRECT_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });
  const data = await response.json();
  console.log('[anthropic] Direkt API yanıt:', JSON.stringify(data));
  return data.content?.[0]?.text || 'Hata oluştu.';
}

export async function sozlesmeOlustur(tur: string, formData: Record<string, string>): Promise<string> {
  const mesaj = `Sözleşme türü: ${tur}
Bilgiler: ${JSON.stringify(formData, null, 2)}
Bu bilgilere göre eksiksiz bir sözleşme yaz.`;
  return callClaude(SOZLESME_YAZARI_PROMPT, mesaj);
}

export async function sozlesmeDuzenle(mevcutSozlesme: string, istek: string): Promise<string> {
  const mesaj = `Mevcut sözleşme:
${mevcutSozlesme}

Kullanıcı isteği: ${istek}

Sözleşmeyi bu isteğe göre güncelle ve tamamını yeniden yaz.`;
  return callClaude(SOZLESME_YAZARI_PROMPT, mesaj);
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
