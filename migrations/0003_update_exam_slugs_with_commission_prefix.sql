-- Update exam slugs to include commission prefix for better SEO and URL clarity
-- This ensures all exam URLs are unique and descriptive

UPDATE exams SET slug = 'ssc-cgl' WHERE slug = 'cgl' AND commission_id = (SELECT id FROM commissions WHERE slug = 'ssc');
UPDATE exams SET slug = 'ssc-chsl' WHERE slug = 'chsl' AND commission_id = (SELECT id FROM commissions WHERE slug = 'ssc');
UPDATE exams SET slug = 'ssc-mts' WHERE slug = 'mts' AND commission_id = (SELECT id FROM commissions WHERE slug = 'ssc');
UPDATE exams SET slug = 'ssc-gd-constable' WHERE slug = 'gd-constable' AND commission_id = (SELECT id FROM commissions WHERE slug = 'ssc');
UPDATE exams SET slug = 'ssc-cpo' WHERE slug = 'cpo' AND commission_id = (SELECT id FROM commissions WHERE slug = 'ssc');
UPDATE exams SET slug = 'ssc-jht' WHERE slug = 'jht' AND commission_id = (SELECT id FROM commissions WHERE slug = 'ssc');
UPDATE exams SET slug = 'ssc-stenographer' WHERE slug = 'stenographer' AND commission_id = (SELECT id FROM commissions WHERE slug = 'ssc');

-- UPSC exams
UPDATE exams SET slug = 'upsc-ias' WHERE slug = 'ias' AND commission_id = (SELECT id FROM commissions WHERE slug = 'upsc');
UPDATE exams SET slug = 'upsc-ips' WHERE slug = 'ips' AND commission_id = (SELECT id FROM commissions WHERE slug = 'upsc');
UPDATE exams SET slug = 'upsc-ifs' WHERE slug = 'ifs' AND commission_id = (SELECT id FROM commissions WHERE slug = 'upsc');

-- Railways exams
UPDATE exams SET slug = 'rrb-je' WHERE slug = 'rrb-je' AND commission_id = (SELECT id FROM commissions WHERE slug = 'railways');
UPDATE exams SET slug = 'rrb-asm' WHERE slug = 'rrb-asm' AND commission_id = (SELECT id FROM commissions WHERE slug = 'railways');
UPDATE exams SET slug = 'rrb-gra' WHERE slug = 'rrb-gra' AND commission_id = (SELECT id FROM commissions WHERE slug = 'railways');

-- Teaching exams
UPDATE exams SET slug = 'teaching-ctet' WHERE slug = 'ctet' AND commission_id = (SELECT id FROM commissions WHERE slug = 'teaching');
UPDATE exams SET slug = 'teaching-stet' WHERE slug = 'stet' AND commission_id = (SELECT id FROM commissions WHERE slug = 'teaching');

-- Defence exams
UPDATE exams SET slug = 'defence-nda' WHERE slug = 'nda' AND commission_id = (SELECT id FROM commissions WHERE slug = 'defence');
UPDATE exams SET slug = 'defence-cds' WHERE slug = 'cds' AND commission_id = (SELECT id FROM commissions WHERE slug = 'defence');
