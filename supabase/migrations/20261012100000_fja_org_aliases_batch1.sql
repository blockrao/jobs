-- FJA org alias batch 1 (2026-10-12)
-- Maps verbose FJA organization_name strings to their canonical organization rows.
-- Each alias is inserted via organization_aliases so resolveOrganization() picks
-- them up without creating new canonical orgs.
-- Guard: ON CONFLICT DO NOTHING — safe to re-run.

INSERT INTO organization_aliases (organization_id, alias_normalized, alias_raw, source)
VALUES

-- IIT Delhi (id 1341)
(1341, 'indian institute of technology delhi iit delhi',    'Indian Institute of Technology Delhi (IIT Delhi)',    'fja_migration'),
(1341, 'iit delhi',                                        'IIT Delhi',                                           'fja_migration'),

-- IIT Madras (id 1352)
(1352, 'indian institute of technology madras iit madras', 'Indian Institute of Technology Madras (IIT Madras)',  'fja_migration'),
(1352, 'iit madras',                                       'IIT Madras',                                          'fja_migration'),

-- IIT Kharagpur (id 1351)
(1351, 'indian institute of technology kharagpur iit kharagpur', 'Indian Institute of Technology Kharagpur (IIT Kharagpur)', 'fja_migration'),
(1351, 'iit kharagpur',                                    'IIT Kharagpur',                                       'fja_migration'),

-- IIT Indore (id 1347)
(1347, 'indian institute of technology indore iit indore', 'Indian Institute of Technology Indore (IIT Indore)',  'fja_migration'),
(1347, 'iit indore',                                       'IIT Indore',                                          'fja_migration'),

-- IIT Ropar (id 1356)
(1356, 'indian institute of technology ropar iit ropar',   'Indian Institute of Technology Ropar (IIT Ropar)',    'fja_migration'),
(1356, 'iit ropar',                                        'IIT Ropar',                                           'fja_migration'),

-- IIT Jammu (id 1348)
(1348, 'indian institute of technology jammu iit jammu',   'Indian Institute of Technology Jammu (IIT Jammu)',    'fja_migration'),
(1348, 'iit jammu',                                        'IIT Jammu',                                           'fja_migration'),

-- IIT ISM Dhanbad (id 1313) — two FJA spelling variants
(1313, 'indian institute of technology indian school of mines dhanbad', 'Indian Institute of Technology (Indian School of Mines), Dhanbad', 'fja_migration'),
(1313, 'indian institute of technology indian school of mines  dhanbad', 'Indian Institute of Technology (Indian School of Mines) Dhanbad', 'fja_migration'),
(1313, 'iit ism dhanbad',                                  'IIT ISM Dhanbad',                                     'fja_migration'),

-- Hindustan Aeronautics Limited (id 1684)
(1684, 'hindustan aeronautics limited hal',                'Hindustan Aeronautics Limited (HAL)',                 'fja_migration'),
(1684, 'hal',                                              'HAL',                                                 'fja_migration'),

-- AIIMS Delhi (id 1125)
(1125, 'all india institute of medical sciences delhi aiims delhi', 'All India Institute of Medical Sciences Delhi (AIIMS Delhi)', 'fja_migration'),
(1125, 'aiims delhi',                                      'AIIMS Delhi',                                         'fja_migration'),
(1125, 'all india institute of medical sciences new delhi', 'All India Institute of Medical Sciences, New Delhi',  'fja_migration'),

-- AIIMS Rishikesh (id 1132)
(1132, 'all india institute of medical sciences rishikesh', 'All India Institute of Medical Sciences, Rishikesh',  'fja_migration'),

-- AIIMS Rewari (id 1131)
(1131, 'all india institute of medical sciences rewari',   'All India Institute of Medical Sciences, Rewari',     'fja_migration'),

-- AIIMS Patna, Nagpur, Kalyani, Bilaspur — no city-specific canonical row; map to generic (id 1121)
(1121, 'all india institute of medical sciences patna',    'All India Institute of Medical Sciences, Patna',      'fja_migration'),
(1121, 'all india institute of medical sciences nagpur',   'All India Institute of Medical Sciences Nagpur',      'fja_migration'),
(1121, 'all india institute of medical sciences kalyani',  'All India Institute of Medical Sciences Kalyani',     'fja_migration'),
(1121, 'all india institute of medical sciences bilaspur', 'All India Institute of Medical Sciences Bilaspur',    'fja_migration'),

-- JIPMER (id 1377)
(1377, 'jawaharlal institute of postgraduate medical education and research jipmer', 'Jawaharlal Institute of Postgraduate Medical Education and Research (JIPMER)', 'fja_migration'),
(1377, 'jipmer',                                           'JIPMER',                                              'fja_migration'),

-- Tata Institute of Social Sciences (id 1554)
(1554, 'tata institute of social sciences tiss',           'Tata Institute of Social Sciences (TISS)',            'fja_migration'),
(1554, 'tiss',                                             'TISS',                                                'fja_migration'),

-- Tata Memorial Centre (id 1676)
(1676, 'tata memorial centre tmc',                         'Tata Memorial Centre (TMC)',                          'fja_migration'),
(1676, 'tmc',                                              'TMC',                                                 'fja_migration'),

-- Andhra Pradesh Public Service Commission (id 1138)
(1138, 'andhra pradesh public service commission appsc vijayawada', 'Andhra Pradesh Public Service Commission (APPSC), Vijayawada', 'fja_migration'),
(1138, 'appsc',                                            'APPSC',                                               'fja_migration'),

-- Indian Institute of Science (id 1333)
(1333, 'indian institute of science iisc bengaluru',       'Indian Institute of Science (IISc), Bengaluru',       'fja_migration'),
(1333, 'iisc bengaluru',                                   'IISc Bengaluru',                                      'fja_migration'),
(1333, 'iisc',                                             'IISc',                                                'fja_migration'),

-- Indraprastha Institute of Information Technology Delhi (id 1369)
(1369, 'indraprastha institute of information technology delhi iiit delhi', 'Indraprastha Institute of Information Technology Delhi (IIIT Delhi)', 'fja_migration'),
(1369, 'iiit delhi',                                       'IIIT Delhi',                                          'fja_migration'),

-- Gujarat Metro Rail Corporation (id 1283)
(1283, 'gujarat metro rail corporation gmrc limited',      'Gujarat Metro Rail Corporation (GMRC) Limited',       'fja_migration'),
(1283, 'gmrc',                                             'GMRC',                                                'fja_migration'),

-- Panjab University (id 1485)
(1485, 'panjab university chandigarh',                     'Panjab University, Chandigarh',                       'fja_migration'),

-- Rail India Technical and Economic Service (id 1505)
(1505, 'rail india technical and economic service rites',  'Rail India Technical and Economic Service (RITES)',   'fja_migration'),
(1505, 'rites',                                            'RITES',                                               'fja_migration'),

-- RITES Limited (id 1665)
(1665, 'rites limited',                                    'RITES Limited',                                       'fja_migration'),

-- HLL Lifecare Limited (id 369)
(369,  'hll lifecare limited',                             'HLL Lifecare Limited',                                'fja_migration'),
(369,  'hll lifecare',                                     'HLL Lifecare',                                        'fja_migration'),

-- Central Agricultural University Imphal (id 1169)
(1169, 'central agricultural university',                  'Central Agricultural University',                     'fja_migration')

ON CONFLICT (alias_normalized) DO NOTHING;
