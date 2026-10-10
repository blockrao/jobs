-- FJA-INV-003: immutable, versioned original HTML captures for source auditability.
-- A unique source/hash key makes unchanged reruns idempotent while retaining changed versions.
CREATE TABLE IF NOT EXISTS public.fja_source_captures (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  recruitment_inventory_id bigint NOT NULL REFERENCES public.fja_job_inventory(id) ON DELETE CASCADE,
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
