-- Add commissions table
CREATE TABLE commissions (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#000000',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add exams table
CREATE TABLE exams (
  id SERIAL PRIMARY KEY,
  commission_id INTEGER NOT NULL REFERENCES commissions(id),
  slug VARCHAR(80) NOT NULL UNIQUE,
  label VARCHAR(160) NOT NULL,
  description TEXT,
  eligibility TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX exams_commission_idx ON exams(commission_id);

-- Add exam_id to postings
ALTER TABLE postings ADD COLUMN exam_id INTEGER NOT NULL REFERENCES exams(id);
CREATE INDEX postings_exam_idx ON postings(exam_id);

-- Seed commissions
INSERT INTO commissions (slug, name, color) VALUES
('ssc', 'SSC (Staff Selection Commission)', '#3b82f6'),
('upsc', 'UPSC (Civil Services)', '#8b5cf6'),
('banking', 'Banking & Finance', '#ec4899'),
('railways', 'Railways (RRB)', '#f59e0b'),
('state', 'State Exams', '#10b981'),
('teaching', 'Teaching & Education', '#06b6d4'),
('defence', 'Defence & Military', '#ef4444');

-- Seed exams (primary exams for each commission)
INSERT INTO exams (commission_id, slug, label, salary_min, salary_max) VALUES
-- SSC exams
((SELECT id FROM commissions WHERE slug = 'ssc'), 'cgl', 'Combined Graduate Level (CGL)', 25500, 142400),
((SELECT id FROM commissions WHERE slug = 'ssc'), 'chsl', 'Combined Higher Secondary Level (CHSL)', 18000, 92300),
((SELECT id FROM commissions WHERE slug = 'ssc'), 'mts', 'Multi-Tasking Staff (MTS)', 18000, 92300),
((SELECT id FROM commissions WHERE slug = 'ssc'), 'gd-constable', 'GD Constable', 21700, 69100),
((SELECT id FROM commissions WHERE slug = 'ssc'), 'cpo', 'Central Police Organization (CPO)', 21700, 69100),
((SELECT id FROM commissions WHERE slug = 'ssc'), 'jht', 'Junior Hindi Translator (JHT)', 25500, 81100),
((SELECT id FROM commissions WHERE slug = 'ssc'), 'stenographer', 'Stenographer', 25500, 81100),

-- UPSC exams
((SELECT id FROM commissions WHERE slug = 'upsc'), 'ias', 'Indian Administrative Service (IAS)', 56100, 250000),
((SELECT id FROM commissions WHERE slug = 'upsc'), 'ips', 'Indian Police Service (IPS)', 56100, 250000),
((SELECT id FROM commissions WHERE slug = 'upsc'), 'ifs', 'Indian Forest Service (IFS)', 56100, 250000),

-- Banking exams
((SELECT id FROM commissions WHERE slug = 'banking'), 'ibps-po', 'IBPS PO (Probationary Officer)', 42000, 132000),
((SELECT id FROM commissions WHERE slug = 'banking'), 'ibps-clerk', 'IBPS Clerk', 23000, 73000),
((SELECT id FROM commissions WHERE slug = 'banking'), 'sbi-po', 'SBI PO', 42000, 132000),
((SELECT id FROM commissions WHERE slug = 'banking'), 'sbi-clerk', 'SBI Clerk', 23000, 73000),

-- Railways exams
((SELECT id FROM commissions WHERE slug = 'railways'), 'rrb-je', 'RRB Junior Engineer (JE)', 35400, 112400),
((SELECT id FROM commissions WHERE slug = 'railways'), 'rrb-asm', 'RRB Assistant Station Master (ASM)', 19900, 63200),
((SELECT id FROM commissions WHERE slug = 'railways'), 'rrb-gra', 'RRB Group D (General/Goods Guard)', 19900, 63200),

-- State exams (TPSC, GPSC, MPSC, etc.)
((SELECT id FROM commissions WHERE slug = 'state'), 'tpsc-cgl', 'TPSC Combined Graduate Level', 21000, 88000),
((SELECT id FROM commissions WHERE slug = 'state'), 'gpsc-cgl', 'GPSC Combined Graduate Level', 21000, 88000),
((SELECT id FROM commissions WHERE slug = 'state'), 'mpsc-cgl', 'MPSC Combined Graduate Level', 21000, 88000),

-- Teaching exams
((SELECT id FROM commissions WHERE slug = 'teaching'), 'ctet', 'CTET (Central Teacher Eligibility Test)', 23000, 80000),
((SELECT id FROM commissions WHERE slug = 'teaching'), 'stet', 'STET (State Teacher Eligibility Test)', 23000, 80000),

-- Defence exams
((SELECT id FROM commissions WHERE slug = 'defence'), 'nda', 'National Defence Academy (NDA)', 56100, 250000),
((SELECT id FROM commissions WHERE slug = 'defence'), 'cds', 'Combined Defence Services (CDS)', 56100, 250000);
