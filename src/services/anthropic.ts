import { SOZLESME_YAZARI_PROMPT, HUKUK_ARASTIRMACI_PROMPT, MADDE_DUZENLEYICI_PROMPT } from '../constants/prompts';

const API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '';
const API_URL = 'https://api.anthropic.com/v1/messages';

async function callClaude(systemPrompt: string, userMessage: string): Promise<string> {
  console.log('API KEY:', API_KEY ? 'VAR - ' + API_KEY.substring(0, 10) : 'YOK');
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
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
    console.log('API RESPONSE:', JSON.stringify(data));
    return data.content?.[0]?.text || 'Hata oluştu.';
  } catch(e) {
    console.log('HATA:', e);
    throw e;
  }
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
    console.log('Parse hatası:', yanit);
    return maddeler;
  }
}
