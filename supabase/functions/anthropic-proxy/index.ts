import { corsHeaders } from '../_shared/cors.ts';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 4000;
const MAX_INPUT_CHARS = 20000;

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

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Sunucu yapılandırma hatası' }), {
      status: 500,
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

  // Prompt icerigi LOGLANMAZ: sozlesme metni kisisel veri iceriyor.
  console.log(`[anthropic-proxy] istek alindi, girdi=${systemPrompt.length + userMessage.length} karakter`);

  let anthropicRes: Response;
  try {
    anthropicRes = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });
  } catch (err) {
    console.error('[anthropic-proxy] ag hatasi:', err);
    return new Response(JSON.stringify({ error: 'AI servisine erişilemiyor' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!anthropicRes.ok) {
    console.error(`[anthropic-proxy] anthropic ${anthropicRes.status}`);
    return new Response(JSON.stringify({ error: 'AI servisi yanıt vermedi' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const data = await anthropicRes.json();
  const text = data.content?.[0]?.text ?? '';
  console.log(`[anthropic-proxy] yanit ${text.length} karakter`);

  return new Response(JSON.stringify({ content: text }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
