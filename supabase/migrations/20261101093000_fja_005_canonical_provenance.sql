-- FJA-005 — canonical source provenance and notification URL check history
-- Ledger: A-092. Related implementation audit: GitHub issue #241.
-- Additive only. No data is backfilled and no canonical records are created.
-- Apply only after this migration is merged and the owner approves the recorded
-- migration path. Rollback: supabase/rollback/20261101093000_fja_005_canonical_provenance.down.sql.

BEGIN;

-- Canonical provenance can now point directly to the entities it supports.
-- posting_id remains for historical observations and legacy fallback.
ALTER TABLE public.source_observations
  ADD COLUMN recruitment_id integer,
  ADD COLUMN post_id integer;

ALTER TABLE public.source_observations
  ADD CONSTRAINT source_observations_recruitment_id_fkey
    FOREIGN KEY (recruitment_id) REFERENCES public.recruitments(id) ON DELETE SET NULL,
  ADD CONSTRAINT source_observations_post_id_fkey
    FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE SET NULL;

CREATE INDEX source_observations_recruitment_idx
  ON public.source_observations (recruitment_id);
CREATE INDEX source_observations_post_idx
  ON public.source_observations (post_id);

COMMENT ON COLUMN public.source_observations.recruitment_id IS
  'Direct canonical recruitment provenance; posting_id remains for legacy observations.';
COMMENT ON COLUMN public.source_observations.post_id IS
  'Direct canonical post provenance; nullable for recruitment-level evidence.';

-- Every HEAD check is retained as an append-only audit event. Canonical IDs
-- are nullable because a notification URL can be checked before canonical
-- entity resolution; source_observation_id is always required.
CREATE TABLE public.notification_url_checks (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_observation_id bigint NOT NULL
    REFERENCES public.source_observations(id) ON DELETE RESTRICT,
  recruitment_id integer
    REFERENCES public.recruitments(id) ON DELETE SET NULL,
  post_id integer
    REFERENCES public.posts(id) ON DELETE SET NULL,
  requested_url text NOT NULL,
  approved_hosts text[] NOT NULL DEFAULT ARRAY[]::text[],
  approved_host_evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  final_url text,
  final_host text,
  redirect_chain jsonb NOT NULL DEFAULT '[]'::jsonb,
  http_status integer,
  content_type text,
  status varchar(16) NOT NULL,
  failure_reason text,
  validator_version varchar(40) NOT NULL DEFAULT 'v1',
  checked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notification_url_checks_status_chk
    CHECK (status IN ('VALIDATED', 'REJECTED', 'REVIEW', 'ERROR')),
  CONSTRAINT notification_url_checks_http_status_chk
    CHECK (http_status IS NULL OR http_status BETWEEN 100 AND 599)
);

CREATE INDEX notification_url_checks_observation_idx
  ON public.notification_url_checks (source_observation_id, checked_at DESC);
CREATE INDEX notification_url_checks_recruitment_idx
  ON public.notification_url_checks (recruitment_id, checked_at DESC);
CREATE INDEX notification_url_checks_post_idx
  ON public.notification_url_checks (post_id, checked_at DESC);

COMMENT ON TABLE public.notification_url_checks IS
  'Append-only HTTP HEAD destination checks. Reachability and approved-host routing do not verify document contents or job facts.';
COMMENT ON COLUMN public.notification_url_checks.approved_hosts IS
  'Exact approved hosts; subdomains are permitted only when explicitly represented by wildcard policy in the evidence.';
COMMENT ON COLUMN public.notification_url_checks.approved_host_evidence IS
  'Restricted evidence explaining why each destination host is authorised for this recruitment.';
COMMENT ON COLUMN public.notification_url_checks.redirect_chain IS
  'Structured HTTP redirect trace; never contains fetched document bodies.';

-- Prevent history edits/deletes. A new check creates a new row.
CREATE OR REPLACE FUNCTION public.reject_notification_url_check_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'notification_url_checks is append-only; insert a new check event instead';
END;
$$;

CREATE TRIGGER notification_url_checks_append_only
  BEFORE UPDATE OR DELETE ON public.notification_url_checks
  FOR EACH ROW EXECUTE FUNCTION public.reject_notification_url_check_mutation();

-- Closed by default. The application uses the privileged owning role;
-- anon/authenticated receive no table privileges and no RLS policies.
ALTER TABLE public.notification_url_checks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.notification_url_checks FROM anon, authenticated, PUBLIC;

COMMIT;
