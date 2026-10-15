-- Migration: Add organization aliases for top 30 official notification organizations
-- Date: 2026-10-15
-- Purpose: Enable write-path organization resolution for official dataset (Category A)
-- 
-- These aliases map official notification org names to canonical organizations,
-- covering the top 30 organizations by vacancy count (81.9% of 157,622 total vacancies).
--
-- Key insight: Official sources use multiple name variants for the same organization.
-- Aliases normalize these variants to a single canonical organization ID.

INSERT INTO organization_aliases (organization_id, alias_normalized, alias_raw, source)
VALUES
  -- 1. Bihar Public Service Commission (ID: 17) - 32,388 vacancies
  (17, 'bpsc', 'BPSC', 'official_notification'),
  (17, 'bihar public service commission', 'Bihar Public Service Commission', 'official_notification'),
  (17, 'bpsc bihar', 'BPSC Bihar', 'official_notification'),
  (17, 'bihar psc', 'Bihar PSC', 'official_notification'),
  
  -- 3. Uttar Pradesh Education Service Selection Commission (ID: 1565) - 15,012 vacancies
  (1565, 'upessc', 'UPESSC', 'official_notification'),
  (1565, 'uttar pradesh education service selection commission', 'Uttar Pradesh Education Service Selection Commission', 'official_notification'),
  (1565, 'up education service selection commission', 'UP Education Service Selection Commission', 'official_notification'),
  (1565, 'uttar pradesh education service commission', 'Uttar Pradesh Education Service Commission', 'official_notification'),
  
  -- 4. Jharkhand Staff Selection Commission (ID: 70) - 7,299 vacancies
  (70, 'jssc', 'JSSC', 'official_notification'),
  (70, 'jharkhand staff selection commission', 'Jharkhand Staff Selection Commission', 'official_notification'),
  (70, 'jharkhand ssc', 'Jharkhand SSC', 'official_notification'),
  
  -- 6. Railway Recruitment Boards (IDs: 141, 154, 155) - 3,548 vacancies
  (141, 'rrb', 'RRB', 'official_notification'),
  (141, 'railway recruitment boards', 'Railway Recruitment Boards', 'official_notification'),
  (141, 'railway recruitment board', 'Railway Recruitment Board', 'official_notification'),
  (154, 'railway recruitment boards ministry', 'Railway Recruitment Boards (RRB), Ministry of Railways', 'official_notification'),
  (155, 'railway recruitment boards rrbsministry', 'Railway Recruitment Boards (RRBs), Ministry of Railways, Government of India', 'official_notification'),
  
  -- 7. Canara Bank (ID: 142) - 3,500 vacancies
  (142, 'canara bank', 'Canara Bank', 'official_notification'),
  (142, 'canarabank', 'Canara Bank', 'official_notification'),
  
  -- 9. Jammu & Kashmir Services Selection Board (ID: 1376) - 2,863 vacancies
  (1376, 'jkssb', 'JKSSB', 'official_notification'),
  (1376, 'jammu kashmir services selection board', 'Jammu & Kashmir Services Selection Board', 'official_notification'),
  (1376, 'jammu and kashmir services selection board', 'Jammu and Kashmir Services Selection Board', 'official_notification'),
  (1376, 'jk services selection board', 'JK Services Selection Board', 'official_notification'),
  
  -- 10. Andhra Pradesh Public Service Commission (ID: 1138) - 2,733 vacancies
  (1138, 'appsc', 'APPSC', 'official_notification'),
  (1138, 'andhra pradesh public service commission', 'Andhra Pradesh Public Service Commission', 'official_notification'),
  (1138, 'ap public service commission', 'AP Public Service Commission', 'official_notification'),
  (1138, 'appsc andhra pradesh', 'APPSC - Andhra Pradesh Public Service Commission', 'official_notification'),
  
  -- 12. Uttar Pradesh Subordinate Services Selection Commission (ID: 1568, 1569) - 2,056 vacancies
  (1568, 'upsssc', 'UPSSSC', 'official_notification'),
  (1568, 'uttar pradesh subordinate services selection commission', 'Uttar Pradesh Subordinate Services Selection Commission', 'official_notification'),
  (1568, 'uttar pradesh subordinate service selection commission', 'Uttar Pradesh Subordinate Service Selection Commission', 'official_notification'),
  (1568, 'up subordinate services selection commission', 'UP Subordinate Services Selection Commission', 'official_notification'),
  (1569, 'upsssc uttar pradesh', 'Uttar Pradesh Subordinate Services Selection Commission', 'official_notification'),
  
  -- 13. RRC North Western Railway - Railway Recruitment Cell - 2,008 vacancies
  (1507, 'rrc north western railway', 'RRC North Western Railway - Railway Recruitment Cell', 'official_notification'),
  (1507, 'railway recruitment cell', 'Railway Recruitment Cell', 'official_notification'),
  (1507, 'railway recruitment cell nwr', 'Railway Recruitment Cell, North Western Railway', 'official_notification'),
  
  -- 14. Directorate of Public Instruction Chhattisgarh - 1,812 vacancies
  (177, 'directorate public instruction chhattisgarh', 'Directorate of Public Instruction Chhattisgarh', 'official_notification'),
  (177, 'dpi chhattisgarh', 'DPI Chhattisgarh', 'official_notification'),
  
  -- 16. CG Vyapam - Chhattisgarh Staff Selection Commission (ID: 189) - 1,710 vacancies
  (189, 'cg vyapam', 'CG Vyapam', 'official_notification'),
  (189, 'chhattisgarh vyapam', 'Chhattisgarh Vyapam', 'official_notification'),
  (189, 'chhattisgarh staff selection commission', 'Chhattisgarh Staff Selection Commission', 'official_notification'),
  (189, 'vyapam chhattisgarh', 'Vyapam Chhattisgarh', 'official_notification'),
  (189, 'cg vyapam raipur', 'CG Vyapam - Chhattisgarh Staff Selection Board, Raipur', 'official_notification'),
  
  -- 18. East Central Railway (ID: 1260) - 1,483 vacancies
  (1260, 'east central railway', 'East Central Railway', 'official_notification'),
  (1260, 'eastern central railway', 'Eastern Central Railway', 'official_notification'),
  (1260, 'ecr railways', 'ECR Railways', 'official_notification'),
  
  -- 19. SSSC Punjab and Haryana High Court - 1,270 vacancies
  (1533, 'sssc high court', 'SSSC Punjab and Haryana High Court', 'official_notification'),
  (1533, 'society centralized recruitment staff subordinate courts', 'Society for Centralized Recruitment of Staff in Subordinate Courts', 'official_notification'),
  (1533, 'subordinate courts staff recruitment', 'Subordinate Courts Staff Recruitment', 'official_notification'),
  
  -- 20. Bihar Technical Service Commission (ID: 1158) - 1,129 vacancies
  (1158, 'btsc', 'BTSC', 'official_notification'),
  (1158, 'bihar technical service commission', 'Bihar Technical Service Commission', 'official_notification'),
  (1158, 'btsc bihar', 'BTSC Bihar', 'official_notification'),
  
  -- 21. Bank of Baroda (ID: 144, 621) - 1,101 vacancies
  (144, 'bank of baroda', 'Bank of Baroda', 'official_notification'),
  (144, 'bob bank', 'BOB Bank', 'official_notification'),
  (144, 'baroda bank', 'Baroda Bank', 'official_notification'),
  (621, 'bank baroda', 'Bank of Baroda', 'official_notification'),
  
  -- 23. MP Police - Madhya Pradesh Staff Selection Board - 1,000 vacancies
  (1401, 'mp police', 'MP Police', 'official_notification'),
  (1401, 'madhya pradesh police', 'Madhya Pradesh Police', 'official_notification'),
  
  -- 27. OAVS - Odisha Adarsha Vidyalaya Sangathan (ID: 1476) - 815 vacancies
  (1476, 'oavs', 'OAVS', 'official_notification'),
  (1476, 'odisha adarsha vidyalaya sangathan', 'Odisha Adarsha Vidyalaya Sangathan', 'official_notification'),
  (1476, 'odisha adarsha vidyalaya', 'Odisha Adarsha Vidyalaya', 'official_notification'),
  
  -- 29. Odisha Public Service Commission (ID: 1479) - 758 vacancies
  (1479, 'opsc', 'OPSC', 'official_notification'),
  (1479, 'odisha public service commission', 'Odisha Public Service Commission', 'official_notification'),
  (1479, 'odisha psc', 'Odisha PSC', 'official_notification'),
  
  -- Additional high-frequency organizations found in database
  (1501, 'punjab subordinate services selection board', 'Punjab Subordinate Services Selection Board', 'official_notification'),
  (1501, 'pssb punjab', 'PSSB Punjab', 'official_notification'),
  (1157, 'bihar police subordinate services commission', 'Bihar Police Subordinate Services Commission', 'official_notification')

ON CONFLICT (alias_normalized) DO NOTHING;

-- Verification query: Count new aliases
SELECT COUNT(*) as alias_count FROM organization_aliases WHERE source = 'official_notification';
