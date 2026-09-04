// =============================================================================
// anthropic-proxy — GECICI STUB (deploy: 01.09.2026)
//
// NE YAPAR: Anthropic'e HIC CAGRI YAPMAZ. Istemcinin bekledigi sozlesmeyi
// ({ content: string }, 200) aynen korur, boylece YAYINDAKI iOS uygulamasinda
// sozlesme olusturma calismaya devam eder.
//
// NEDEN VAR: Yayindaki build FormScreen.tsx'te sozlesmeOlustur() cagrisini
// await ediyor ve hata alirsa Preview'a HIC gecmiyor. Fonksiyonu silmek =
// canli uygulamada sozlesme olusturmanin kirilmasi (26 Agustos kesintisinin
// aynisi). Modelin urettigi metin ise zaten KULLANILMIYOR: PDF ve kayit
// pdfTemplate + VARSAYILAN_*_MADDELER'den uretiliyor, model ciktisi sadece
// onizleme kutusunda gosteriliyordu.
//
// SONUC: Anthropic maliyeti sifir, kredi tukenmez, kotuye kullanimin degeri
// yok. Oran sinirina gerek kalmadi.
//
// ACIK BORC — SILINECEK: build 4'te FormScreen'deki sozlesmeOlustur() cagrisi
// kaldirilinca bu Edge Function TAMAMEN SILINECEK. CLAUDE.md'ye islendi.
//
// DEPLOY SONRASI: Supabase Secrets'tan ANTHROPIC_API_KEY SILINEBILIR — bu
// surum onu okumuyor. Silmek, eski kodun kazara yeniden deploy edilmesi
// halinde bile para harcanmasini imkansiz kilar.
// =============================================================================

import { corsHeaders } from '../_shared/cors.ts';

const MAX_INPUT_CHARS = 20000;

// Sozlesme uretimi cagrisina donen metin. Bu metin YAYINDAKI uygulamanin
// onizleme kutusunda gorunur ve kapali testteki 14 kisi bunu okur.
const SOZLESME_YANITI = `Sözleşme metni PDF çıktısında oluşturulmaktadır.

Taraf bilgileri, kira koşulları ve özel/genel koşulların tamamını görmek için
aşağıdaki "PDF İndir & Kaydet" butonuna dokunun. İmzalanacak belge PDF
çıktısıdır.`;

// Madde duzenleme cagrisina donen metin.
// KRITIK: Bu yanit BILEREK gecerli JSON DEGIL.
// anthropic.ts:104-112 once JSON.parse dener; basarisiz olunca catch dalinda
// ORIJINAL madde dizisini geri dondurur — yani kullanicinin maddeleri korunur.
// Buraya "[]" gibi gecerli bir JSON konursa Array.isArray(parsed) true olur,
// BOS DIZI doner ve kayit veritabaninda BOSALIR. Bu satiri JSON yapma.
const MADDE_YANITI =
  'Madde duzenleme ozelligi gecici olarak devre disi. Maddeler degistirilmedi.';

// Hukuk arastirma (ResearchScreen — su an hicbir navigator'a bagli degil).
const ARASTIRMA_YANITI =
  'Hukuki araştırma özelliği geçici olarak kullanım dışıdır.';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let systemPrompt: string;
  let userMessage: string;
  try {
    const body = await req.json();
    systemPrompt = body.systemPrompt;
    userMessage = body.userMessage;
    if (!systemPrompt || !userMessage) {
      return new Response(JSON.stringify({ error: 'systemPrompt ve userMessage zorunlu' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (systemPrompt.length + userMessage.length > MAX_INPUT_CHARS) {
      return new Response(JSON.stringify({ error: 'Girdi çok uzun' }), {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Geçersiz JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Cagri tipini systemPrompt'tan ayirt et. Tam esitlik yerine ayirt edici
  // parca araniyor — prompt metni degisirse de calismaya devam etsin diye.
  let content: string;
  let tip: string;
  if (systemPrompt.includes('madde düzenleyicisisin')) {
    content = MADDE_YANITI;
    tip = 'madde';
  } else if (systemPrompt.includes('araştırmacısısın')) {
    content = ARASTIRMA_YANITI;
    tip = 'arastirma';
  } else {
    // Varsayilan: sozlesme uretimi. Taninmayan bir prompt gelirse de
    // kullanici anlamli bir metin gorur, uygulama akisi kirilmaz.
    content = SOZLESME_YANITI;
    tip = 'sozlesme';
  }

  // Prompt icerigi LOGLANMAZ (kisisel veri iceriyor) — sadece tip ve boyut.
  console.log(`[anthropic-proxy:STUB] tip=${tip} girdi=${systemPrompt.length + userMessage.length} karakter`);

  return new Response(JSON.stringify({ content }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
