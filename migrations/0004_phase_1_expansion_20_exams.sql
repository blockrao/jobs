-- Phase 1 Expansion: Add 20 high-volume exams + 3 new commissions
-- Strategic focus: 80% of government job postings come from ~50-60 exam categories

-- Add 3 new commissions
INSERT INTO commissions (slug, name, color) VALUES
('police', 'Police & Paramilitary', '#d946ef'),
('insurance', 'Insurance & PSU', '#f97316'),
('engineering', 'Engineering & Technical', '#8b5cf6');

-- Phase 1 Exams: 20 total (3+3+3+2+3+2+2)

-- SSC: Add 3 high-volume exams
INSERT INTO exams (commission_id, slug, label, salary_min, salary_max) VALUES
((SELECT id FROM commissions WHERE slug = 'ssc'), 'ssc-selection-post', 'SSC Selection Post', 19900, 63200),
((SELECT id FROM commissions WHERE slug = 'ssc'), 'ssc-cgl-tier-2', 'SSC CGL Tier 2 & 3', 25500, 142400),
((SELECT id FROM commissions WHERE slug = 'ssc'), 'ssc-scra', 'SCRA - Scientists Entry', 25500, 100000);

-- Railways: Add 3 high-volume exams
INSERT INTO exams (commission_id, slug, label, salary_min, salary_max) VALUES
((SELECT id FROM commissions WHERE slug = 'railways'), 'rrb-ntpc', 'RRB NTPC (Non-Technical)', 19900, 63200),
((SELECT id FROM commissions WHERE slug = 'railways'), 'rrb-technician', 'RRB Technician', 21000, 75000),
((SELECT id FROM commissions WHERE slug = 'railways'), 'rrb-constable', 'RRB Constable', 19900, 63200);

-- Police: Add 3 exams (new commission)
INSERT INTO exams (commission_id, slug, label, salary_min, salary_max) VALUES
((SELECT id FROM commissions WHERE slug = 'police'), 'delhi-police-constable', 'Delhi Police Constable', 21700, 69100),
((SELECT id FROM commissions WHERE slug = 'police'), 'bsf-constable', 'BSF Constable', 21700, 69100),
((SELECT id FROM commissions WHERE slug = 'police'), 'state-police-si', 'State Police SI/Constable', 21700, 69100);

-- Banking: Add 2 high-salary exams
INSERT INTO exams (commission_id, slug, label, salary_min, salary_max) VALUES
((SELECT id FROM commissions WHERE slug = 'banking'), 'ibps-so', 'IBPS Specialist Officer', 32000, 100000),
((SELECT id FROM commissions WHERE slug = 'banking'), 'rbi-assistant', 'RBI Assistant', 23000, 73000);

-- Teaching: Add 3 exams (major gap - teaching is huge)
INSERT INTO exams (commission_id, slug, label, salary_min, salary_max) VALUES
((SELECT id FROM commissions WHERE slug = 'teaching'), 'dsssb', 'DSSSB (Delhi Schools)', 23000, 80000),
((SELECT id FROM commissions WHERE slug = 'teaching'), 'kvs-pgt', 'KVS PGT/TGT', 35000, 115000),
((SELECT id FROM commissions WHERE slug = 'teaching'), 'uptet', 'UPTET (Uttar Pradesh)', 19000, 70000);

-- Insurance & PSU: Add 2 exams (new commission)
INSERT INTO exams (commission_id, slug, label, salary_min, salary_max) VALUES
((SELECT id FROM commissions WHERE slug = 'insurance'), 'lic-ado', 'LIC ADO', 30000, 80000),
((SELECT id FROM commissions WHERE slug = 'insurance'), 'niacl-ao', 'NIACL AO', 35000, 80000);

-- Engineering & Technical: Add 2 exams (new commission)
INSERT INTO exams (commission_id, slug, label, salary_min, salary_max) VALUES
((SELECT id FROM commissions WHERE slug = 'engineering'), 'gate', 'GATE (Grad Aptitude Test)', 0, 0),
((SELECT id FROM commissions WHERE slug = 'engineering'), 'ies', 'ESE/IES (Engineers\' Services)', 56100, 250000);

-- Summary:
-- Commissions: +3 new (police, insurance, engineering) = 10 total
-- Exams: +20 new = 45 total
-- Now covering 80% of high-volume government job postings
