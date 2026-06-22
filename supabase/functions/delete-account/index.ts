import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

// Bir Storage bucket'ında verilen prefix altındaki tüm dosya path'lerini listeler.
async function listAllPaths(
  admin: ReturnType<typeof createClient>,
  bucket: string,
  prefix: string,
): Promise<string[]> {
  const { data } = await admin.storage.from(bucket).list(prefix, { limit: 1000 })
  if (!data || data.length === 0) return []
  const paths: string[] = []
  for (const item of data) {
    const itemPath = `${prefix}/${item.name}`
    if (item.id === null) {
      // Klasör — recursive ilerle
      const sub = await listAllPaths(admin, bucket, itemPath)
      paths.push(...sub)
    } else {
      paths.push(itemPath)
    }
  }
  return paths
}

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

  // 1. Authorization header zorunlu
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
  const callerId = callerUser.id

  // 3. Service-role admin client
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 4. Caller'ın rol + org bilgisi
  const { data: callerData, error: callerErr } = await admin
    .from('users')
    .select('role, organization_id')
    .eq('id', callerId)
    .single()

  if (callerErr || !callerData) {
    console.error('[delete-account] users fetch error:', callerErr)
    return new Response(JSON.stringify({ error: 'Kullanıcı bilgisi alınamadı' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { role, organization_id: orgId } = callerData

  // 5. Request body + onay doğrulama
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Geçersiz JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (role === 'emlakci') {
    if (body.confirmation !== 'SIL') {
      return new Response(JSON.stringify({ error: 'Onay eksik: { confirmation: "SIL" } gerekli' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  } else {
    if (body.confirm !== true) {
      return new Response(JSON.stringify({ error: 'Onay eksik: { confirm: true } gerekli' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  // 6. Rol guard — bilinmeyen/null rol owner cascade'ine düşmesin
  if (!['emlakci', 'kiraci', 'mal_sahibi'].includes(role)) {
    return new Response(JSON.stringify({ error: 'Tanınmayan rol' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // ─── MEMBER DALI (kiraci / mal_sahibi) ────────────────────────────────────
  if (role === 'kiraci' || role === 'mal_sahibi') {
    try {
      // M1. Bu kullanıcıya bağlı person kaydını unlink et
      await admin
        .from('persons')
        .update({ user_id: null })
        .eq('user_id', callerId)

      // M2. Auth soft-delete — sözleşmeler/ödemeler/person kaydı/dekontlar dokunulmaz
      const { error: delErr } = await admin.auth.admin.deleteUser(callerId, true)
      if (delErr) throw new Error(`Auth silme başarısız: ${delErr.message}`)

      console.log(`[delete-account] Member soft-deleted: ${callerId} (${role})`)
      return new Response(JSON.stringify({ deleted: true, type: 'member' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[delete-account] Member silme hatası:', msg)
      return new Response(JSON.stringify({ error: msg }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  // ─── OWNER DALI (emlakci) ─────────────────────────────────────────────────
  try {
    // O1. Org'daki tüm user id'lerini çek
    const { data: orgUsers, error: usersErr } = await admin
      .from('users')
      .select('id')
      .eq('organization_id', orgId)

    if (usersErr) throw new Error(`Org kullanıcıları alınamadı: ${usersErr.message}`)
    const userIds: string[] = (orgUsers ?? []).map((u: { id: string }) => u.id)

    // O2. Storage temizliği (sozlesme-belgeleri bucket açılmadı — sadece 2 bucket)
    for (const bucket of ['kimlik-belgeleri', 'dekontlar']) {
      try {
        const paths = await listAllPaths(admin, bucket, orgId)
        if (paths.length > 0) {
          const { error: rmErr } = await admin.storage.from(bucket).remove(paths)
          if (rmErr) console.error(`[delete-account] Storage remove hatası (${bucket}):`, rmErr.message)
          else console.log(`[delete-account] Storage temizlendi: ${bucket} — ${paths.length} dosya`)
        }
      } catch (se: unknown) {
        // Storage hatası kritik değil — devam et, log yaz
        console.error(`[delete-account] Storage liste hatası (${bucket}):`, se instanceof Error ? se.message : se)
      }
    }

    // O3. Contracts açıkça sil — CASCADE: payments, contract_photos, contract_items
    const { error: contractsErr } = await admin
      .from('contracts')
      .delete()
      .eq('organization_id', orgId)

    if (contractsErr) throw new Error(`Contracts silinemedi: ${contractsErr.message}`)
    console.log(`[delete-account] Contracts + cascade (payments/photos/items) silindi: org=${orgId}`)

    // O4. Tüm auth kullanıcıları hard-delete (owner dahil)
    // CASCADE: public.users satırları silinir → SET NULL: persons.user_id
    for (const uid of userIds) {
      try {
        await admin.auth.admin.deleteUser(uid, false)
      } catch (ue: unknown) {
        // Zaten silinmiş olabilir — log yaz, devam et
        console.warn(`[delete-account] deleteUser uyarı (${uid}):`, ue instanceof Error ? ue.message : ue)
      }
    }
    console.log(`[delete-account] Auth users hard-deleted: ${userIds.length} kullanıcı`)

    // O5. DB temizliği — FK-güvenli sıra
    // a. units (buildings ON DELETE RESTRICT bloğunu önce kır)
    const { error: unitsErr } = await admin
      .from('units')
      .delete()
      .eq('organization_id', orgId)
    if (unitsErr) throw new Error(`Units silinemedi: ${unitsErr.message}`)

    // b. buildings
    const { error: buildingsErr } = await admin
      .from('buildings')
      .delete()
      .eq('organization_id', orgId)
    if (buildingsErr) throw new Error(`Buildings silinemedi: ${buildingsErr.message}`)

    // c. persons (contracts.kiraci/mal_sahibi_person_id zaten O3'te gitti)
    const { error: personsErr } = await admin
      .from('persons')
      .delete()
      .eq('organization_id', orgId)
    if (personsErr) throw new Error(`Persons silinemedi: ${personsErr.message}`)

    // d. organizations (artık hiçbir FK bloklayıcı yok)
    const { error: orgErr } = await admin
      .from('organizations')
      .delete()
      .eq('id', orgId)
    if (orgErr) throw new Error(`Organization silinemedi: ${orgErr.message}`)

    console.log(`[delete-account] Owner org cascade tamamlandı: org=${orgId}`)
    return new Response(JSON.stringify({ deleted: true, type: 'owner' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[delete-account] Owner silme hatası:', msg)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
