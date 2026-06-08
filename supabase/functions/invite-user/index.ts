import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // 1. Authorization header
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Authorization header eksik' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl     = Deno.env.get('SUPABASE_URL')!
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey      = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // 2. Caller kimlik doğrulama (kullanıcının kendi JWT'si ile)
  const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user: callerUser }, error: authErr } = await callerClient.auth.getUser()
  if (authErr || !callerUser) {
    return new Response(JSON.stringify({ error: 'Kimlik doğrulama başarısız' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // 3. Service role admin client (DB sorguları + admin.createUser için)
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 4. Caller rol + org bilgisi
  const { data: callerData, error: callerErr } = await admin
    .from('users')
    .select('role, organization_id')
    .eq('id', callerUser.id)
    .single()

  if (callerErr || !callerData) {
    console.error('[invite-user] users fetch error:', callerErr)
    return new Response(JSON.stringify({ error: 'Kullanıcı bilgisi alınamadı' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (callerData.role !== 'emlakci') {
    return new Response(JSON.stringify({ error: 'Sadece emlakçılar davet gönderebilir' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // 5. Girdi doğrulama
  let email: string, role: string, person_id: string | null
  try {
    const body = await req.json()
    if (!body.email || !body.role) throw new Error()
    email     = (body.email as string).trim().toLowerCase()
    role      = body.role
    person_id = body.person_id ?? null
  } catch {
    return new Response(JSON.stringify({ error: 'email ve role zorunlu' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!['kiraci', 'mal_sahibi'].includes(role)) {
    return new Response(JSON.stringify({ error: 'role kiraci veya mal_sahibi olmalı' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // 6. person_id varsa kişi kaydı kontrolü (yetim hesap önleme)
  if (person_id !== null) {
    const { data: personCheck, error: personErr } = await admin
      .from('persons')
      .select('id')
      .eq('id', person_id)
      .eq('organization_id', callerData.organization_id)
      .single()

    if (personErr || !personCheck) {
      return new Response(JSON.stringify({ error: 'Kişi kaydı bulunamadı' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  // 7. Geçici şifre — karışan karakterler hariç (0, O, l, 1, I)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%'
  const buf   = new Uint8Array(16)
  crypto.getRandomValues(buf)
  const password = Array.from(buf).map(b => chars[b % chars.length]).join('')

  // 8. Kullanıcı oluştur
  // NOT: on_auth_user_created trigger'ı createUser anında app_metadata'yı göremez
  // (timing: metadata INSERT'ten sonra yazılır). Trigger ELSE dalına düşüp geçici
  // bir org + emlakci satırı açar. Aşağıdaki adımlar bunu düzeltir.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: {
      organization_id: callerData.organization_id,
      role,
      person_id,
    },
  })

  if (createErr) {
    // GoTrue status 422 = User already registered; string fallback da kontrol edilir
    const isDuplicate =
      (createErr as any).status === 422 ||
      createErr.message?.toLowerCase().includes('already')
    if (isDuplicate) {
      return new Response(JSON.stringify({ error: 'Bu e-posta adresi zaten kayıtlı' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    console.error('[invite-user] createUser error:', createErr)
    return new Response(JSON.stringify({ error: createErr.message ?? 'Davet gönderilemedi' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!created?.user) {
    console.error('[invite-user] createUser: data.user boş döndü')
    return new Response(JSON.stringify({ error: 'Kullanıcı oluşturulamadı' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const newUserId = created.user.id

  // 9. Trigger'ın açtığı geçici org'u oku
  const { data: urow } = await admin
    .from('users')
    .select('organization_id')
    .eq('id', newUserId)
    .single()
  const junkOrg: string | null = urow?.organization_id ?? null

  // 10. users satırını doğru org + role ile düzelt
  const { error: fixErr } = await admin
    .from('users')
    .update({ organization_id: callerData.organization_id, role, must_change_password: true })
    .eq('id', newUserId)

  if (fixErr) {
    console.error('[invite-user] users fix error:', fixErr)
    return new Response(JSON.stringify({ error: 'Kullanıcı kaydı düzeltilemedi' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // 11. person_id varsa kişi kaydını bağla
  if (person_id !== null) {
    await admin
      .from('persons')
      .update({ user_id: newUserId })
      .eq('id', person_id)
      .eq('organization_id', callerData.organization_id)
  }

  // 12. Geçici org'u temizle — guard: çağıranın gerçek org'u değilse sil
  if (junkOrg && junkOrg !== callerData.organization_id) {
    await admin.from('organizations').delete().eq('id', junkOrg)
  }

  console.log(`[invite-user] Davet: ${email} → ${role} @ org=${callerData.organization_id}`)

  return new Response(JSON.stringify({ email, password }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
