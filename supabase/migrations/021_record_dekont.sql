-- Geriye donuk belgeleme (orijinal ad: 017_record_dekont). Canliya
-- Dashboard uzerinden daha once uygulandi.

CREATE OR REPLACE FUNCTION public.record_dekont(p_payment_id uuid, p_path text, p_mime text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid     uuid;
  v_role    text;
  v_org_id  uuid;
  v_payment payments%rowtype;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Kimlik dogrulama gerekli';
  end if;
  v_role   := auth_role();
  v_org_id := auth_org_id();
  select * into v_payment from payments where id = p_payment_id;
  if not found then
    raise exception 'Odeme kaydi bulunamadi';
  end if;
  if v_payment.organization_id <> v_org_id then
    raise exception 'Bu kayda erisim yetkiniz yok';
  end if;
  if v_role not in ('kiraci', 'emlakci') then
    raise exception 'Dekont yukleme yetkiniz yok';
  end if;
  if v_role = 'kiraci' and not user_can_access_contract(v_payment.contract_id) then
    raise exception 'Bu sozlesmeye erisiminiz yok';
  end if;
  if p_path is null or length(p_path) = 0 then
    raise exception 'Dekont yolu bos olamaz';
  end if;
  if p_path not like (v_org_id::text || '/%') then
    raise exception 'Gecersiz dekont yolu (org disi)';
  end if;
  if position(p_payment_id::text in p_path) = 0 then
    raise exception 'Dekont yolu bu odemeye ait degil';
  end if;
  if p_mime is null or (p_mime not like 'image/%' and p_mime <> 'application/pdf') then
    raise exception 'Desteklenmeyen dosya turu: %', p_mime;
  end if;
  if v_payment.durum = 'odendi' then
    raise exception 'Onaylanmis odemenin dekontu degistirilemez';
  end if;
  update payments
  set dekont_url  = p_path,
      dekont_mime = p_mime,
      durum       = 'beklemede'
  where id = p_payment_id;
end;
$function$;

REVOKE ALL ON FUNCTION public.record_dekont(uuid, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.record_dekont(uuid, text, text) TO authenticated;
