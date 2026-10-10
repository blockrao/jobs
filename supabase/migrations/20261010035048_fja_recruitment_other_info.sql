-- FJA-INV-004: explicit raw bucket for source facts that do not map to typed inventory columns.
ALTER TABLE public.fja_job_inventory
  ADD COLUMN IF NOT EXISTS other_info_raw jsonb NOT NULL DEFAULT '{}'::jsonb;
