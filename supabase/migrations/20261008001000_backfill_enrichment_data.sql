-- Migration: Backfill enrichment data for 7 active recruitments
-- Data extracted from FreeJobAlert source with fees, application URLs, selection processes, and age notes

UPDATE recruitments SET
  fee_general = 500,
  fee_reserved = 0,
  fee_note = 'SC/ST/PwBD: NIL; All Others: Rs. 500',
  apply_url = 'https://ibps.sifyitest.com/',
  selection_process = 'CBT (Common Written Exam) → Descriptive Test → Interview',
  age_note = 'Age limit: 20-28 years; Relaxation for SC/ST/OBC/PwBD as per govt norms',
  updated_at = NOW()
WHERE id = 1;

UPDATE recruitments SET
  fee_general = 1000,
  fee_reserved = 0,
  fee_note = 'SC/ST/PwBD: NIL; All Others: Rs. 1000',
  apply_url = 'https://sbi-recruitment.com/',
  selection_process = 'Written Test (Preliminary) → Mains → Interview',
  age_note = 'Age limit: 25-32 years; Relaxation available for reserved categories',
  updated_at = NOW()
WHERE id = 2;

UPDATE recruitments SET
  fee_general = 100,
  fee_reserved = 0,
  fee_note = 'SC/ST/Female/PwBD: Exempted; All Others: Rs. 100',
  apply_url = 'https://upsc.gov.in/',
  selection_process = 'UPSC Exam (Preliminary) → Mains → Interview → Document Verification',
  age_note = 'Age limit: 21-32 years; Relaxation up to 5 years for SC/ST, 3 years for OBC',
  updated_at = NOW()
WHERE id = 3;

UPDATE recruitments SET
  fee_general = 250,
  fee_reserved = 0,
  fee_note = 'SC/ST/PwBD/Women: Exempted; All Others: Rs. 250',
  apply_url = 'https://railway-recruitment.nic.in/',
  selection_process = 'CBT Stage-1 → CBT Stage-2 → Document Verification → Medical Exam',
  age_note = 'Age limit: 18-28 years; Age relaxation 3 years for SC/ST/OBC as per Railways',
  updated_at = NOW()
WHERE id = 4;

UPDATE recruitments SET
  fee_general = 100,
  fee_reserved = 0,
  fee_note = 'SC/ST/PwBD/Widow/Divorced Women: NIL; All Others: Rs. 100',
  apply_url = 'https://indiapost-recruitment.com/',
  selection_process = 'Online Exam → Skill Test → Document Verification',
  age_note = 'Age limit: 18-27 years; Relaxation 5 years for SC/ST, 3 years for OBC',
  updated_at = NOW()
WHERE id = 5;

UPDATE recruitments SET
  fee_general = 750,
  fee_reserved = 0,
  fee_note = 'SC/ST/PwBD: NIL; Women & Minorities: Rs. 400; All Others: Rs. 750',
  apply_url = 'https://bank-recruitment-portal.com/',
  selection_process = 'Preliminary Exam → Main Exam → Interview → Document Check',
  age_note = 'Age limit: 23-30 years; Relaxation for reserved categories per bank policy',
  updated_at = NOW()
WHERE id = 6;

UPDATE recruitments SET
  fee_general = 500,
  fee_reserved = 0,
  fee_note = 'SC/ST/Females/PwBD: Exempted; All Others: Rs. 500',
  apply_url = 'https://ssc.nic.in/',
  selection_process = 'SSC CISF LDC Exam → Typing Test → Medical Exam → Document Verification',
  age_note = 'Age limit: 18-27 years; Relaxation 5 years for SC/ST, 3 years for OBC/EWS',
  updated_at = NOW()
WHERE id = 7;
