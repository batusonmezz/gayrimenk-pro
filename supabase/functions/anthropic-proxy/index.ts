import { corsHeaders } from '../_shared/cors.ts';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-sonnet-4-6';
const DEFAULT_MAX_TOKENS = 2000;

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
    console.error('[anthropic-proxy] ANTHROPIC_API_KEY secret eksik');
    return new Response(JSON.stringify({ error: 'Sunucu yapılandırma hatası' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let systemPrompt: string;
  let userMessage: string;
  let model: string;
  let maxTokens: number;

  try {
    const body = await req.json();
    systemPrompt = body.systemPrompt;
    userMessage = body.userMessage;
    model = body.model ?? DEFAULT_MODEL;
    maxTokens = body.maxTokens ?? DEFAULT_MAX_TOKENS;

    if (!systemPrompt || !userMessage) {
      return new Response(JSON.stringify({ error: 'systemPrompt ve userMessage zorunlu' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Geçersiz JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log(
    `[anthropic-proxy] POST model=${model} system="${systemPrompt.substring(0, 50)}" user="${userMessage.substring(0, 80)}"`
  );

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
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });
  } catch (err) {
    console.error('[anthropic-proxy] Anthropic API ağ hatası:', err);
    return new Response(JSON.stringify({ error: 'Anthropic API erişilemiyor', detail: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (anthropicRes.status === 401) {
    console.error('[anthropic-proxy] Anthropic 401 — API key geçersiz');
    return new Response(JSON.stringify({ error: 'API key geçersiz' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (anthropicRes.status === 429) {
    const retryAfter = anthropicRes.headers.get('retry-after') ?? '60';
    console.warn(`[anthropic-proxy] Anthropic 429 — rate limit, retry-after=${retryAfter}`);
    return new Response(JSON.stringify({ error: 'Rate limit aşıldı, lütfen bekleyin' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': retryAfter },
    });
  }

  if (!anthropicRes.ok) {
    const errText = await anthropicRes.text();
    console.error(`[anthropic-proxy] Anthropic ${anthropicRes.status}:`, errText);
    return new Response(JSON.stringify({ error: 'Anthropic API hatası', detail: errText }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const data = await anthropicRes.json();
  const text = data.content?.[0]?.text ?? '';
  console.log(`[anthropic-proxy] Başarılı — yanıt ${text.length} karakter`);

  return new Response(JSON.stringify({ content: text }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
