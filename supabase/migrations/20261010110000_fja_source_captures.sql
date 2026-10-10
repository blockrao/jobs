-- FJA-INV-003: immutable, versioned original HTML captures for source auditability.
-- A unique source/hash key makes unchanged reruns idempotent while retaining changed versions.
CREATE TABLE IF NOT EXISTS public.fja_source_captures (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  recruitment_inventory_id bigint NOT NULL REFERENCES public.fja_job_inventory(id) ON DELETE RESTRICT,
  source_slug text NOT NULL DEFAULT 'freejobalert',
  external_id text NOT NULL,
  source_url text NOT NULL,
  html_sha256 text NOT NULL,
  normalized_text_sha256 text,
  raw_html text NOT NULL,
  run_id text,
  captured_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fja_source_captures_identity_hash_unique UNIQUE (source_slug, external_id, html_sha256)
);
CREATE INDEX IF NOT EXISTS fja_source_captures_parent_idx
  ON public.fja_source_captures (recruitment_inventory_id, captured_at DESC);
ALTER TABLE public.fja_source_captures ENABLE ROW LEVEL SECURITY;

-- Enforce append-only semantics even for the service-role ingestion connection.
CREATE OR REPLACE FUNCTION public.reject_fja_source_capture_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'fja_source_captures is append-only; create a new hash-version instead of updating or deleting a capture';
END;
$$;
DROP TRIGGER IF EXISTS fja_source_captures_append_only ON public.fja_source_captures;
CREATE TRIGGER fja_source_captures_append_only
  BEFORE UPDATE OR DELETE ON public.fja_source_captures
  FOR EACH ROW EXECUTE FUNCTION public.reject_fja_source_capture_mutation();
