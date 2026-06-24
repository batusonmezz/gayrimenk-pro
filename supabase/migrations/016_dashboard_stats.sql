-- 016_dashboard_stats.sql
-- Ana Sayfa dashboard istatistikleri (role-aware tek RPC)
-- Tutarlar kurus cinsinden doner; ekranda /100 ile TL'ye cevrilir.

CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid    UUID;
  v_role   TEXT;
  v_org_id UUID;
  v_result JSONB;
  v_ay_basi  DATE := date_trunc('month', CURRENT_DATE)::date;
  v_ay_sonu  DATE := (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date;
  v_yaklasan_son DATE := CURRENT_DATE + 7;
BEGIN
  v_uid    := auth.uid();
  v_role   := auth_role();
  v_org_id := auth_org_id();

  IF v_uid IS NULL OR v_role IS NULL THEN
    RAISE EXCEPTION 'Yetkisiz';
  END IF;

  -- Role gore ilgili contract id'lerini bir CTE yerine gecici tabloya benzer mantıkla,
  -- her sorguda WHERE ile filtreliyoruz. Kira ödemeleri: tip='kira'.

  -- ═══ EMLAKCI ═══ org'daki tum contracts
  IF v_role = 'emlakci' THEN
    SELECT jsonb_build_object(
      'role', 'emlakci',
      'bu_ay_tahsil', COALESCE((
        SELECT SUM(p.tutar_kurus) FROM payments p
        WHERE p.organization_id = v_org_id
          AND p.tip = 'kira'
          AND p.durum = 'odendi'
          AND p.odeme_tarihi BETWEEN v_ay_basi AND v_ay_sonu
      ), 0),
      'bu_ay_bekleyen', COALESCE((
        SELECT SUM(p.tutar_kurus) FROM payments p
        WHERE p.organization_id = v_org_id
          AND p.tip = 'kira'
          AND p.durum = 'beklemede'
          AND p.vade_tarihi BETWEEN v_ay_basi AND v_ay_sonu
          AND p.vade_tarihi >= CURRENT_DATE
      ), 0),
      'geciken_tutar', COALESCE((
        SELECT SUM(p.tutar_kurus) FROM payments p
        WHERE p.organization_id = v_org_id
          AND p.tip = 'kira'
          AND p.durum = 'beklemede'
          AND p.vade_tarihi < CURRENT_DATE
      ), 0),
      'geciken_adet', COALESCE((
        SELECT COUNT(*) FROM payments p
        WHERE p.organization_id = v_org_id
          AND p.tip = 'kira'
          AND p.durum = 'beklemede'
          AND p.vade_tarihi < CURRENT_DATE
      ), 0),
      'onay_bekleyen_adet', COALESCE((
        SELECT COUNT(*) FROM payments p
        WHERE p.organization_id = v_org_id
          AND p.tip = 'kira'
          AND p.durum = 'beklemede'
          AND p.dekont_url IS NOT NULL
      ), 0),
      'toplam_sozlesme', COALESCE((
        SELECT COUNT(*) FROM contracts c
        WHERE c.organization_id = v_org_id
      ), 0),
      'yaklasan', COALESCE((
        SELECT jsonb_agg(row_to_json(t)) FROM (
          SELECT p.id AS payment_id, p.contract_id, p.tutar_kurus, p.vade_tarihi,
                 COALESCE(per.ad_soyad, '—') AS kiraci_ad
          FROM payments p
          JOIN contracts c ON c.id = p.contract_id
          LEFT JOIN persons per ON per.id = c.kiraci_person_id
          WHERE p.organization_id = v_org_id
            AND p.tip = 'kira'
            AND p.durum = 'beklemede'
            AND p.vade_tarihi BETWEEN CURRENT_DATE AND v_yaklasan_son
          ORDER BY p.vade_tarihi ASC
        ) t
      ), '[]'::jsonb)
    ) INTO v_result;

  -- ═══ MAL SAHIBI ═══ sadece kendi contracts (mal_sahibi_user_id = uid)
  ELSIF v_role = 'mal_sahibi' THEN
    SELECT jsonb_build_object(
      'role', 'mal_sahibi',
      'bu_ay_alacagi', COALESCE((
        SELECT SUM(p.tutar_kurus) FROM payments p
        JOIN contracts c ON c.id = p.contract_id
        WHERE c.mal_sahibi_user_id = v_uid
          AND p.tip = 'kira'
          AND p.durum = 'beklemede'
          AND p.vade_tarihi BETWEEN v_ay_basi AND v_ay_sonu
      ), 0),
      'bu_ay_tahsil', COALESCE((
        SELECT SUM(p.tutar_kurus) FROM payments p
        JOIN contracts c ON c.id = p.contract_id
        WHERE c.mal_sahibi_user_id = v_uid
          AND p.tip = 'kira'
          AND p.durum = 'odendi'
          AND p.odeme_tarihi BETWEEN v_ay_basi AND v_ay_sonu
      ), 0),
      'geciken_tutar', COALESCE((
        SELECT SUM(p.tutar_kurus) FROM payments p
        JOIN contracts c ON c.id = p.contract_id
        WHERE c.mal_sahibi_user_id = v_uid
          AND p.tip = 'kira'
          AND p.durum = 'beklemede'
          AND p.vade_tarihi < CURRENT_DATE
      ), 0),
      'geciken_adet', COALESCE((
        SELECT COUNT(*) FROM payments p
        JOIN contracts c ON c.id = p.contract_id
        WHERE c.mal_sahibi_user_id = v_uid
          AND p.tip = 'kira'
          AND p.durum = 'beklemede'
          AND p.vade_tarihi < CURRENT_DATE
      ), 0),
      'onay_bekleyen_adet', COALESCE((
        SELECT COUNT(*) FROM payments p
        JOIN contracts c ON c.id = p.contract_id
        WHERE c.mal_sahibi_user_id = v_uid
          AND p.tip = 'kira'
          AND p.durum = 'beklemede'
          AND p.dekont_url IS NOT NULL
      ), 0),
      'yaklasan', COALESCE((
        SELECT jsonb_agg(row_to_json(t)) FROM (
          SELECT p.id AS payment_id, p.contract_id, p.tutar_kurus, p.vade_tarihi,
                 COALESCE(per.ad_soyad, '—') AS kiraci_ad
          FROM payments p
          JOIN contracts c ON c.id = p.contract_id
          LEFT JOIN persons per ON per.id = c.kiraci_person_id
          WHERE c.mal_sahibi_user_id = v_uid
            AND p.tip = 'kira'
            AND p.durum = 'beklemede'
            AND p.vade_tarihi BETWEEN CURRENT_DATE AND v_yaklasan_son
          ORDER BY p.vade_tarihi ASC
        ) t
      ), '[]'::jsonb)
    ) INTO v_result;

  -- ═══ KIRACI ═══ sadece kendi contracts (kiraci_user_id = uid)
  ELSIF v_role = 'kiraci' THEN
    SELECT jsonb_build_object(
      'role', 'kiraci',
      'sonraki_odeme', (
        SELECT row_to_json(t) FROM (
          SELECT p.tutar_kurus, p.vade_tarihi
          FROM payments p
          JOIN contracts c ON c.id = p.contract_id
          WHERE c.kiraci_user_id = v_uid
            AND p.tip = 'kira'
            AND p.durum = 'beklemede'
            AND p.vade_tarihi >= CURRENT_DATE
          ORDER BY p.vade_tarihi ASC
          LIMIT 1
        ) t
      ),
      'yillik_odenen', COALESCE((
        SELECT SUM(p.tutar_kurus) FROM payments p
        JOIN contracts c ON c.id = p.contract_id
        WHERE c.kiraci_user_id = v_uid
          AND p.tip = 'kira'
          AND p.durum = 'odendi'
      ), 0),
      'yillik_kalan', COALESCE((
        SELECT SUM(p.tutar_kurus) FROM payments p
        JOIN contracts c ON c.id = p.contract_id
        WHERE c.kiraci_user_id = v_uid
          AND p.tip = 'kira'
          AND p.durum = 'beklemede'
      ), 0),
      'geciken_tutar', COALESCE((
        SELECT SUM(p.tutar_kurus) FROM payments p
        JOIN contracts c ON c.id = p.contract_id
        WHERE c.kiraci_user_id = v_uid
          AND p.tip = 'kira'
          AND p.durum = 'beklemede'
          AND p.vade_tarihi < CURRENT_DATE
      ), 0),
      'geciken_adet', COALESCE((
        SELECT COUNT(*) FROM payments p
        JOIN contracts c ON c.id = p.contract_id
        WHERE c.kiraci_user_id = v_uid
          AND p.tip = 'kira'
          AND p.durum = 'beklemede'
          AND p.vade_tarihi < CURRENT_DATE
      ), 0),
      'onay_bekleyen_adet', COALESCE((
        SELECT COUNT(*) FROM payments p
        JOIN contracts c ON c.id = p.contract_id
        WHERE c.kiraci_user_id = v_uid
          AND p.tip = 'kira'
          AND p.durum = 'beklemede'
          AND p.dekont_url IS NOT NULL
      ), 0)
    ) INTO v_result;

  ELSE
    RAISE EXCEPTION 'Taninmayan rol: %', v_role;
  END IF;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION get_dashboard_stats() FROM public;
GRANT EXECUTE ON FUNCTION get_dashboard_stats() TO authenticated;
