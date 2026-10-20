-- Add pillar_slug and pillar_enabled columns to organizations table
-- Supports Tier 1 pillar pages (e.g., /exams/iit-delhi/)

ALTER TABLE organizations
ADD COLUMN pillar_slug VARCHAR(160) UNIQUE,
ADD COLUMN pillar_enabled BOOLEAN DEFAULT false;

-- Create index for pillar slug lookups
CREATE INDEX organizations_pillar_slug_idx ON organizations(pillar_slug);

-- Backfill pillar_slug and pillar_enabled for top 25 organizations
-- This is based on Phase 2 Tier 1 strategy (25 orgs with highest post counts)

UPDATE organizations SET pillar_slug = 'iit-delhi', pillar_enabled = true WHERE id = 1341; -- IIT Delhi
UPDATE organizations SET pillar_slug = 'echs', pillar_enabled = true WHERE id = 1266; -- ECHS
UPDATE organizations SET pillar_slug = 'appsc-group-1', pillar_enabled = true WHERE id = 1138; -- APPSC
UPDATE organizations SET pillar_slug = 'iit-indore', pillar_enabled = true WHERE id = 1347; -- IIT Indore
UPDATE organizations SET pillar_slug = 'iari-recruitment', pillar_enabled = true WHERE id = 1309; -- ICAR IARI
UPDATE organizations SET pillar_slug = 'bpsc-recruitment', pillar_enabled = true WHERE id = 17; -- Bihar PSC
UPDATE organizations SET pillar_slug = 'iiit-kota', pillar_enabled = true WHERE id = 76; -- IIIT Kota
UPDATE organizations SET pillar_slug = 'iit-kharagpur', pillar_enabled = true WHERE id = 1351; -- IIT Kharagpur
UPDATE organizations SET pillar_slug = 'angrau-recruitment', pillar_enabled = true WHERE id = 1588; -- ANGRAU
UPDATE organizations SET pillar_slug = 'tiss-recruitment', pillar_enabled = true WHERE id = 1554; -- TISS
UPDATE organizations SET pillar_slug = 'rites-recruitment', pillar_enabled = true WHERE id = 1505; -- RITES
UPDATE organizations SET pillar_slug = 'aiims-jodhpur', pillar_enabled = true WHERE id = 1127; -- AIIMS Jodhpur
UPDATE organizations SET pillar_slug = 'manipal-university', pillar_enabled = true WHERE id = 1408; -- Manipal Academy
UPDATE organizations SET pillar_slug = 'iit-roorkee', pillar_enabled = true WHERE id = 1355; -- IIT Roorkee
UPDATE organizations SET pillar_slug = 'esic-recruitment', pillar_enabled = true WHERE id = 1262; -- ESIC
UPDATE organizations SET pillar_slug = 'east-central-railway', pillar_enabled = true WHERE id = 1260; -- East Central Railway
UPDATE organizations SET pillar_slug = 'jipmer-recruitment', pillar_enabled = true WHERE id = 1377; -- JIPMER
UPDATE organizations SET pillar_slug = 'iit-ropar', pillar_enabled = true WHERE id = 1356; -- IIT Ropar
UPDATE organizations SET pillar_slug = 'gmc-chandigarh', pillar_enabled = true WHERE id = 1278; -- GMC Chandigarh
UPDATE organizations SET pillar_slug = 'iiser-bhopal', pillar_enabled = true WHERE id = 1334; -- IISER Bhopal
UPDATE organizations SET pillar_slug = 'district-health-society', pillar_enabled = true WHERE id = 1234; -- District Health Society
UPDATE organizations SET pillar_slug = 'mumbai-port-authority', pillar_enabled = true WHERE id = 1417; -- Mumbai Port Authority
UPDATE organizations SET pillar_slug = 'delhi-electricity-commission', pillar_enabled = true WHERE id = 1206; -- DERC
UPDATE organizations SET pillar_slug = 'csjmu-teaching', pillar_enabled = true WHERE id = 1184; -- CSJMU
UPDATE organizations SET pillar_slug = 'iiit-delhi', pillar_enabled = true WHERE id = 1369; -- IIIT Delhi
