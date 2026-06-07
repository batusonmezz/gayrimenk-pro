-- Faz 3.3 D1: Davet sistemi — helper + trigger güncellemesi + RLS genişlemesi

BEGIN;

-- ── a) Helper: person_belongs_to_user ────────────────────────────────────────
--    Bir persons kaydının user_id'si çağıran kullanıcıyla eşleşiyor mu?
--    NULL güvenli: id = NULL hiçbir satıra uymaz → FALSE döner.
--    Org kontrolü gereksiz: çağrıldığı her policy/helper'da org gate zaten var.

CREATE OR REPLACE FUNCTION person_belongs_to_user(p_person_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM persons
    WHERE id      = p_person_id
      AND user_id = auth.uid()
  )
$$;

GRANT  EXECUTE ON FUNCTION person_belongs_to_user(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION person_belongs_to_user(UUID) FROM public;

-- ── b) handle_new_user güncellemesi ──────────────────────────────────────────
--    Trigger (on_auth_user_created) yeniden oluşturulmaz — sadece fonksiyon değişir.
--    Yeni dal: raw_app_meta_data'da organization_id varsa → davetli kullanıcı.
--    ELSE dal: 006 ile birebir aynı (yeni emlakçı / yeni org).

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_org_id   UUID;
  org_name     TEXT;
  meta_org     TEXT;
  meta_role    TEXT;
  meta_person  TEXT;
  safe_role    TEXT;
BEGIN
  meta_org := NEW.raw_app_meta_data->>'organization_id';

  IF meta_org IS NOT NULL THEN
    -- Davetli kullanıcı: mevcut org'a kat
    meta_role   := NEW.raw_app_meta_data->>'role';
    meta_person := NEW.raw_app_meta_data->>'person_id';

    -- Rol clamp: yalnızca kiraci veya mal_sahibi kabul edilir
    IF meta_role IN ('kiraci', 'mal_sahibi') THEN
      safe_role := meta_role;
    ELSE
      safe_role := 'kiraci';
    END IF;

    INSERT INTO public.users (id, organization_id, role)
    VALUES (NEW.id, meta_org::uuid, safe_role);

    -- Kişi kaydı varsa bağla (person_id null ise atla)
    IF meta_person IS NOT NULL THEN
      UPDATE public.persons
      SET    user_id = NEW.id
      WHERE  id              = meta_person::uuid
        AND  organization_id = meta_org::uuid;
    END IF;

  ELSE
    -- Yeni emlakçı: yeni org + emlakci (006 ile birebir aynı)
    org_name := COALESCE(NULLIF(split_part(NEW.email, '@', 1), ''), 'Yeni Organizasyon');

    INSERT INTO public.organizations (name)
    VALUES (org_name)
    RETURNING id INTO new_org_id;

    INSERT INTO public.users (id, organization_id, role)
    VALUES (NEW.id, new_org_id, 'emlakci');
  END IF;

  RETURN NEW;
END;
$$;

-- ── c) contracts_select: eski DROP + yeni CREATE ──────────────────────────────
--    Yeni OR dalları: person_belongs_to_user(mal_sahibi_person_id)
--                     person_belongs_to_user(kiraci_person_id)
--    Mevcut dört dal (org + emlakci + *_user_id) KORUNUR.
--    INSERT/UPDATE/DELETE policy'lerine dokunulmaz.

DROP POLICY IF EXISTS "contracts_select" ON contracts;

CREATE POLICY "contracts_select"
  ON contracts FOR SELECT TO authenticated
  USING (
    organization_id = auth_org_id()
    AND (
      auth_role() = 'emlakci'
      OR mal_sahibi_user_id              = auth.uid()
      OR kiraci_user_id                  = auth.uid()
      OR person_belongs_to_user(mal_sahibi_person_id)
      OR person_belongs_to_user(kiraci_person_id)
    )
  );

-- ── d) user_can_access_contract: aynı iki OR dalını ekle ─────────────────────
--    payments_select_taraflar policy'si bu fonksiyonu kullanır.

CREATE OR REPLACE FUNCTION user_can_access_contract(p_contract_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM contracts c
    WHERE c.id              = p_contract_id
      AND c.organization_id = auth_org_id()
      AND (
        auth_role() = 'emlakci'
        OR c.mal_sahibi_user_id              = auth.uid()
        OR c.kiraci_user_id                  = auth.uid()
        OR person_belongs_to_user(c.mal_sahibi_person_id)
        OR person_belongs_to_user(c.kiraci_person_id)
      )
  )
$$;

COMMIT;
