-- Fix application_email for MDU Rohtak 2026 posts (1578, 1579, 1580)
-- Source: fja_job_inventory id 4, details.application_email = 'jobs.cpas@mdu.ac.in'
-- These posts had null application_email; the email was captured at recruitment level
-- in fja_job_inventory.details but not propagated to the post rows at seed time.

UPDATE posts
SET application_email = 'jobs.cpas@mdu.ac.in'
WHERE id IN (1578, 1579, 1580)
  AND recruitment_id = 1690
  AND application_email IS NULL;
