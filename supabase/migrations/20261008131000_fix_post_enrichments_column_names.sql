-- Migration: Fix post_enrichments column names to match API expectations
-- Renames lowercase columns to camelCase for consistency with the TypeScript types

-- Rename columns to camelCase
ALTER TABLE public.post_enrichments RENAME COLUMN vacanciesbycategory TO "vacanciesByCategory";
ALTER TABLE public.post_enrichments RENAME COLUMN vacanciestotal TO "vacanciesTotal";
ALTER TABLE public.post_enrichments RENAME COLUMN feesbycategory TO "feesByCategory";
ALTER TABLE public.post_enrichments RENAME COLUMN feenote TO "feeNote";
ALTER TABLE public.post_enrichments RENAME COLUMN agerulesbycategory TO "ageRulesByCategory";
ALTER TABLE public.post_enrichments RENAME COLUMN agenote TO "ageNote";
ALTER TABLE public.post_enrichments RENAME COLUMN agerelaxationrules TO "ageRelaxationRules";
ALTER TABLE public.post_enrichments RENAME COLUMN agereferencedate TO "ageReferenceDate";
ALTER TABLE public.post_enrichments RENAME COLUMN payscale TO "payScale";
ALTER TABLE public.post_enrichments RENAME COLUMN salarymin TO "salaryMin";
ALTER TABLE public.post_enrichments RENAME COLUMN salarymax TO "salaryMax";
ALTER TABLE public.post_enrichments RENAME COLUMN salarynote TO "salaryNote";
ALTER TABLE public.post_enrichments RENAME COLUMN paylevel TO "payLevel";
ALTER TABLE public.post_enrichments RENAME COLUMN selectionprocess TO "selectionProcess";
ALTER TABLE public.post_enrichments RENAME COLUMN notificationdate TO "notificationDate";
ALTER TABLE public.post_enrichments RENAME COLUMN applicationopendate TO "applicationOpenDate";
ALTER TABLE public.post_enrichments RENAME COLUMN applicationclosingdate TO "applicationClosingDate";
ALTER TABLE public.post_enrichments RENAME COLUMN examdate TO "examDate";
ALTER TABLE public.post_enrichments RENAME COLUMN admitcarddate TO "admitCardDate";
ALTER TABLE public.post_enrichments RENAME COLUMN resultdate TO "resultDate";
ALTER TABLE public.post_enrichments RENAME COLUMN interviewscheduledate TO "interviewScheduleDate";
ALTER TABLE public.post_enrichments RENAME COLUMN appointmentdate TO "appointmentDate";
ALTER TABLE public.post_enrichments RENAME COLUMN eligibilitypathways TO "eligibilityPathways";
ALTER TABLE public.post_enrichments RENAME COLUMN documentsrequired TO "documentsRequired";
ALTER TABLE public.post_enrichments RENAME COLUMN sourceverificationstatus TO "sourceVerificationStatus";
ALTER TABLE public.post_enrichments RENAME COLUMN sourceverificationdate TO "sourceVerificationDate";
ALTER TABLE public.post_enrichments RENAME COLUMN extractionconfidence TO "extractionConfidence";
ALTER TABLE public.post_enrichments RENAME COLUMN datagaps TO "dataGaps";
