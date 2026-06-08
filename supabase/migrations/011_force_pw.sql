BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.clear_must_change_password()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE public.users SET must_change_password = false WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.clear_must_change_password() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.clear_must_change_password() FROM public;

COMMIT;
