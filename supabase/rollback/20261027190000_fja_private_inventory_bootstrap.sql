-- Manual rollback for 20261027190000_fja_private_inventory_bootstrap.sql.
-- Never run automatically. First export any inventory/evidence that must be retained.
DROP TRIGGER IF EXISTS fja_source_captures_append_only ON public.fja_source_captures;
DROP FUNCTION IF EXISTS public.reject_fja_source_capture_mutation();
DROP TABLE IF EXISTS public.fja_source_captures;
DROP TABLE IF EXISTS public.fja_post_inventory;
DROP TABLE IF EXISTS public.fja_job_inventory;
