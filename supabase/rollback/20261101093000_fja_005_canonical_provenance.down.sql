-- Manual rollback for FJA-005. Never apply automatically.
-- Export notification check history before rollback if it must be retained.
BEGIN;

DROP TRIGGER IF EXISTS notification_url_checks_append_only ON public.notification_url_checks;
DROP FUNCTION IF EXISTS public.reject_notification_url_check_mutation();
DROP TABLE IF EXISTS public.notification_url_checks;

DROP INDEX IF EXISTS public.source_observations_recruitment_idx;
DROP INDEX IF EXISTS public.source_observations_post_idx;

ALTER TABLE public.source_observations
  DROP CONSTRAINT IF EXISTS source_observations_recruitment_id_fkey,
  DROP CONSTRAINT IF EXISTS source_observations_post_id_fkey,
  DROP COLUMN IF EXISTS recruitment_id,
  DROP COLUMN IF EXISTS post_id;

COMMIT;
