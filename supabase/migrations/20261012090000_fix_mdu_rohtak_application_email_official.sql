-- Correct application_email for the MDU Rohtak HSRF posts (1578, 1579, 1580; recruitment 1690).
--
-- 20261012010000_fix_mdu_rohtak_application_email.sql set 'jobs.cpas@mdu.ac.in' and cited
-- fja_job_inventory id 4 as its source. That row never held an address: its details.application_email
-- is the placeholder text "[email protected]" that the source page shows in place of an obfuscated address.
--
-- The official MDU advertisement states, under General Instructions, that applications "should be
-- submitted at: nidhi.cpas@mdurohtak.ac.in":
--   https://mdu.ac.in/UpFiles/UpPdfFiles/2026/Oct/4_10-07-2026_14-46-39_Advertisement%20for%20the%20engagement%20of%20the%20research%20staff%20for%20the%20HSRF%20sponsored%20research%20project_7.pdf
-- (read 2026-10-12). Applications close 2026-10-17.
--
-- Guarded on the old value so it only replaces the address written by the earlier migration.

UPDATE posts
SET application_email = 'nidhi.cpas@mdurohtak.ac.in'
WHERE id IN (1578, 1579, 1580)
  AND recruitment_id = 1690
  AND application_email = 'jobs.cpas@mdu.ac.in';
