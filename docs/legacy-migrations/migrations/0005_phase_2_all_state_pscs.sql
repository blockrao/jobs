-- Phase 2 Expansion: All 28 State PSCs + Union Territories
-- Exams: 45 → 70 (add 25)
-- Creates the comprehensive State Exams Hub covering all of India

-- Add 25 state PSCs (3 already exist: TPSC, GPSC, MPSC)
INSERT INTO exams (commission_id, slug, label, salary_min, salary_max) VALUES

-- North India
((SELECT id FROM commissions WHERE slug = 'state'), 'bpsc', 'BPSC (Bihar Public Service Commission)', 21000, 88000),
((SELECT id FROM commissions WHERE slug = 'state'), 'hpsc', 'HPSC (Haryana Public Service Commission)', 21000, 88000),
((SELECT id FROM commissions WHERE slug = 'state'), 'himachal-psc', 'Himachal Pradesh PSC', 21000, 88000),
((SELECT id FROM commissions WHERE slug = 'state'), 'jpsc', 'JPSC (Jharkhand Public Service Commission)', 21000, 88000),
((SELECT id FROM commissions WHERE slug = 'state'), 'punjab-psc', 'Punjab Public Service Commission', 21000, 88000),
((SELECT id FROM commissions WHERE slug = 'state'), 'rpsc', 'RPSC (Rajasthan Public Service Commission)', 21000, 88000),
((SELECT id FROM commissions WHERE slug = 'state'), 'ukpsc', 'UKPSC (Uttarakhand Public Service Commission)', 21000, 88000),
((SELECT id FROM commissions WHERE slug = 'state'), 'uppsc', 'UPPSC (Uttar Pradesh Public Service Commission)', 21000, 88000),

-- South India
((SELECT id FROM commissions WHERE slug = 'state'), 'apsc', 'APSC (Andhra Pradesh Public Service Commission)', 21000, 88000),
((SELECT id FROM commissions WHERE slug = 'state'), 'kpsc', 'KPSC (Karnataka Public Service Commission)', 21000, 88000),
((SELECT id FROM commissions WHERE slug = 'state'), 'kerala-psc', 'Kerala PSC', 21000, 88000),
((SELECT id FROM commissions WHERE slug = 'state'), 'maharashtra-psc', 'Maharashtra PSC', 21000, 88000),
((SELECT id FROM commissions WHERE slug = 'state'), 'tnpsc', 'TNPSC (Tamil Nadu Public Service Commission)', 21000, 88000),
((SELECT id FROM commissions WHERE slug = 'state'), 'telangana-psc', 'Telangana State Public Service Commission', 21000, 88000),

-- East India
((SELECT id FROM commissions WHERE slug = 'state'), 'assam-psc', 'Assam Public Service Commission', 21000, 88000),
((SELECT id FROM commissions WHERE slug = 'state'), 'opsc', 'OPSC (Odisha Public Service Commission)', 21000, 88000),
((SELECT id FROM commissions WHERE slug = 'state'), 'wbpsc', 'WBPSC (West Bengal Public Service Commission)', 21000, 88000),
((SELECT id FROM commissions WHERE slug = 'state'), 'tripura-psc', 'Tripura Public Service Commission', 21000, 88000),
((SELECT id FROM commissions WHERE slug = 'state'), 'meghalaya-psc', 'Meghalaya Public Service Commission', 21000, 88000),
((SELECT id FROM commissions WHERE slug = 'state'), 'manipur-psc', 'Manipur Public Service Commission', 21000, 88000),
((SELECT id FROM commissions WHERE slug = 'state'), 'mizoram-psc', 'Mizoram Public Service Commission', 21000, 88000),
((SELECT id FROM commissions WHERE slug = 'state'), 'nagaland-psc', 'Nagaland Public Service Commission', 21000, 88000),
((SELECT id FROM commissions WHERE slug = 'state'), 'arunachal-psc', 'Arunachal Pradesh PSC', 21000, 88000),
((SELECT id FROM commissions WHERE slug = 'state'), 'sikkim-psc', 'Sikkim Public Service Commission', 21000, 88000),

-- West India
((SELECT id FROM commissions WHERE slug = 'state'), 'chhattisgarh-psc', 'Chhattisgarh Public Service Commission', 21000, 88000),

-- Union Territories
((SELECT id FROM commissions WHERE slug = 'state'), 'puducherry-psc', 'Puducherry Public Service Commission', 21000, 88000);

-- Summary:
-- Commissions: 10 (unchanged)
-- Exams: 45 → 70 (+25 state PSCs)
-- Coverage: Now includes comprehensive state exam hub for all 28 state PSCs + UTs
