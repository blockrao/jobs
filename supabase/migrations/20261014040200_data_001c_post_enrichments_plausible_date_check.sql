-- DATA-001c: no enrichment date may be a placeholder. Ledger A-088.
--
-- Every date column on post_enrichments must be NULL or fall in
-- [1900-01-01, 2090-01-01). 2090 is the same bound used by the application
-- guard (src/lib/recruitment-dates.ts). Verified before applying: no row
-- outside the range remains once DATA-001b has run.
ALTER TABLE public.post_enrichments
  ADD CONSTRAINT post_enrichments_dates_plausible CHECK (
    ("notificationDate"      IS NULL OR ("notificationDate"      >= '1900-01-01' AND "notificationDate"      < '2090-01-01')) AND
    ("applicationOpenDate"   IS NULL OR ("applicationOpenDate"   >= '1900-01-01' AND "applicationOpenDate"   < '2090-01-01')) AND
    ("applicationClosingDate" IS NULL OR ("applicationClosingDate" >= '1900-01-01' AND "applicationClosingDate" < '2090-01-01')) AND
    ("examDate"              IS NULL OR ("examDate"              >= '1900-01-01' AND "examDate"              < '2090-01-01')) AND
    ("admitCardDate"         IS NULL OR ("admitCardDate"         >= '1900-01-01' AND "admitCardDate"         < '2090-01-01')) AND
    ("resultDate"            IS NULL OR ("resultDate"            >= '1900-01-01' AND "resultDate"            < '2090-01-01')) AND
    ("interviewScheduleDate" IS NULL OR ("interviewScheduleDate" >= '1900-01-01' AND "interviewScheduleDate" < '2090-01-01')) AND
    ("appointmentDate"       IS NULL OR ("appointmentDate"       >= '1900-01-01' AND "appointmentDate"       < '2090-01-01'))
  );
