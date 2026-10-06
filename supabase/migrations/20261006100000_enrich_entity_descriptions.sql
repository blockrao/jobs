-- Migration: Enrich entity descriptions, eligibility, and website URLs
-- Fills description/eligibility for all exams, commission descriptions,
-- and organization descriptions + websites for major identifiable bodies.
-- No schema changes. Data-only update.

-- ============================================================
-- 1. COMMISSION DESCRIPTIONS
-- ============================================================

UPDATE commissions SET description = 'The Staff Selection Commission (SSC) conducts nationwide examinations to recruit Group B and Group C non-gazetted staff for various departments and ministries of the Government of India. Established in 1975, SSC is headquartered in New Delhi and handles some of India''s largest competitive examinations by applicant volume.' WHERE slug = 'ssc';

UPDATE commissions SET description = 'The Union Public Service Commission (UPSC) is India''s premier central recruiting agency, established under Article 315 of the Constitution. It conducts the Civil Services Examination to recruit officers for the Indian Administrative Service (IAS), Indian Police Service (IPS), Indian Foreign Service (IFS), and other All India and Central Services.' WHERE slug = 'upsc';

UPDATE commissions SET description = 'The Railway Recruitment Boards (RRBs) are the recruiting bodies for Indian Railways under the Ministry of Railways, Government of India. There are 21 RRBs across the country that conduct examinations to recruit technical, non-technical and ancillary staff for the world''s largest rail network.' WHERE slug = 'railways';

UPDATE commissions SET description = 'Banking and Finance sector recruitment in India covers positions in public sector banks, regional rural banks, and financial institutions. Major recruiting bodies include IBPS (Institute of Banking Personnel Selection) for most public sector banks, and SBI and RBI which conduct their own independent recruitment processes.' WHERE slug = 'banking';

UPDATE commissions SET description = 'State Public Service Commissions (SPSCs) are constitutional bodies established in each state to recruit officers and staff for state government services. They conduct Combined Competitive Examinations (CCE), departmental exams, and direct recruitment for state civil services, police, teachers, and other categories.' WHERE slug = 'state';

UPDATE commissions SET description = 'Defence and Military recruitment covers induction into the Indian Army, Navy, Air Force and paramilitary forces. The Union Public Service Commission conducts CDS and NDA examinations for officer-level entry, while individual services conduct their own recruitment for other ranks and specialist roles.' WHERE slug = 'defence';

UPDATE commissions SET description = 'Teaching and Education recruitment in India covers central and state teacher eligibility tests (CTET, STETs) as well as direct recruitment of teachers, lecturers, and professors in government schools, Kendriya Vidyalayas, Navodaya Vidyalayas, state government schools and higher education institutions.' WHERE slug = 'teaching';

UPDATE commissions SET description = 'Police and Paramilitary recruitment covers positions in central armed police forces (CRPF, BSF, CISF, ITBP, SSB) and state police organisations. Recruitment is conducted by SSC for some central forces, and by state police recruitment boards for state police services.' WHERE slug = 'police';

UPDATE commissions SET description = 'Insurance and Public Sector Undertaking (PSU) recruitment covers positions in public sector insurance companies such as LIC, New India Assurance, Oriental Insurance, and National Insurance. Recruitment is also conducted by central and state PSUs in sectors including oil, power, steel, and infrastructure.' WHERE slug = 'insurance';

UPDATE commissions SET description = 'Engineering and Technical recruitment covers graduate-level and diploma-level technical positions across Government of India departments, public sector enterprises, and research organisations. GATE (Graduate Aptitude Test in Engineering) scores are used by PSUs and for admissions to postgraduate engineering programmes.' WHERE slug = 'engineering';

-- ============================================================
-- 2. EXAM DESCRIPTIONS AND ELIGIBILITY
-- ============================================================

-- SSC
UPDATE exams SET
  description = 'The SSC Combined Graduate Level (CGL) examination is one of India''s most sought-after competitive exams, conducted by the Staff Selection Commission to recruit Group B and Group C officers for various central government ministries and departments. It offers positions such as Inspector of Income Tax, Assistant Section Officer, Sub-Inspector in CBI, and Auditor/Accountant.',
  eligibility = 'Age: 18–32 years (varies by post; relaxation for SC/ST/OBC/PwBD as per rules). Education: Bachelor''s degree from a recognised university in any discipline. Nationality: Indian citizen. Physical standards apply for certain posts (Inspector, SI).'
WHERE slug = 'ssc-cgl';

UPDATE exams SET
  description = 'The SSC Combined Higher Secondary Level (CHSL) exam recruits Lower Division Clerks (LDC), Junior Secretariat Assistants (JSA), Postal/Sorting Assistants, and Data Entry Operators (DEO) for central government offices. It is one of the largest recruitment exams by vacancy count.',
  eligibility = 'Age: 18–27 years (post-specific; relaxation for SC/ST/OBC/PwBD). Education: Class 12 (10+2) pass from a recognised board. Typing speed requirement for LDC/JSA: 35 wpm in English or 30 wpm in Hindi on computer. Nationality: Indian citizen.'
WHERE slug = 'ssc-chsl';

UPDATE exams SET
  description = 'The SSC Multi-Tasking Staff (MTS) exam recruits Group C non-gazetted, non-ministerial staff for various central government offices. MTS employees perform general duties such as clerical support, maintenance of records, and other non-technical tasks. The exam also recruits Havaldar posts for CBIC and CBN.',
  eligibility = 'Age: 18–25 years (relaxation for SC/ST/OBC/PwBD/Ex-Servicemen). Education: Matriculation (Class 10 pass) from a recognised board. Nationality: Indian citizen.'
WHERE slug = 'ssc-mts';

UPDATE exams SET
  description = 'The SSC GD Constable exam recruits Constables for central armed police forces including BSF, CRPF, CISF, ITBP, SSB, NIA, SSF and Riflemen for Assam Rifles. It is among the highest-vacancy SSC exams, with lakhs of positions across multiple forces.',
  eligibility = 'Age: 18–23 years (relaxation as per rules for SC/ST/OBC/Ex-Servicemen). Education: Class 10 (Matriculation) pass. Physical standards mandatory: height, chest measurement (for male), and physical efficiency tests. Nationality: Indian citizen.'
WHERE slug = 'ssc-gd-constable';

UPDATE exams SET
  description = 'The SSC Central Police Organisation (CPO) exam recruits Sub-Inspectors in Delhi Police and Central Armed Police Forces (CAPFs) including BSF, CRPF, CISF, ITBP and SSB, as well as Assistant Sub-Inspectors in CISF.',
  eligibility = 'Age: 20–25 years (relaxation for SC/ST/OBC/Ex-Servicemen). Education: Bachelor''s degree from a recognised university. Physical standards apply: height, chest (for male), eye sight. Physical Efficiency Test (PET) and Medical Examination required. Nationality: Indian citizen.'
WHERE slug = 'ssc-cpo';

UPDATE exams SET
  description = 'The SSC Junior Hindi Translator (JHT) exam recruits Junior Hindi Translators, Junior Translators, and Hindi Pradhyapaks for various ministries, departments and subordinate offices of the Government of India.',
  eligibility = 'Age: 18–30 years (relaxation for SC/ST/OBC/PwBD). Education: Master''s degree in Hindi with English as a compulsory or elective subject or as medium of examination at degree level; OR Master''s degree in English with Hindi as a compulsory or elective subject or as medium of examination at degree level. Nationality: Indian citizen.'
WHERE slug = 'ssc-jht';

UPDATE exams SET
  description = 'The SSC Stenographer exam recruits Grade C and Grade D Stenographers for various Central Government Ministries, Departments and Organisations.',
  eligibility = 'Age: 18–27 years (relaxation for SC/ST/OBC/PwBD/Ex-Servicemen). Education: Class 12 (10+2) pass from a recognised board. Skill Test: Stenography speed of 100 wpm (Grade C) or 80 wpm (Grade D) with transcription time of 40/50 minutes. Nationality: Indian citizen.'
WHERE slug = 'ssc-stenographer';

UPDATE exams SET
  description = 'SSC Selection Post exam recruits candidates for various posts in different government departments at matriculation, higher secondary, and graduation level. Posts vary by notification cycle and include a wide range of Group B and C positions.',
  eligibility = 'Age and education eligibility varies by post and level — matriculation (Class 10), higher secondary (Class 12), or graduation level. Specific age limits, category relaxations, and physical requirements are detailed in each notification.'
WHERE slug = 'ssc-selection-post';

UPDATE exams SET
  description = 'SSC CGL Tier 2 and Tier 3 are the subsequent stages of the Combined Graduate Level examination, comprising a Computer Based Examination (Tier 2) and a Descriptive Paper (Tier 3). Candidates who qualify Tier 1 appear in these stages for final selection.',
  eligibility = 'Eligibility is same as SSC CGL. Candidates must qualify the Tier 1 preliminary examination to be eligible for Tier 2 and Tier 3.'
WHERE slug = 'ssc-cgl-tier-2';

UPDATE exams SET
  description = 'The SCRA (Special Class Railway Apprentices) examination was historically conducted to select candidates for the Mechanical Engineering course at IRSME, Jamalpur. It has been discontinued by UPSC. The SSC SCRA entry, if listed, refers to scientist/technical entry under SSC.',
  eligibility = 'This examination is no longer active. Check the latest SSC notification for current scientist and technical entry routes.'
WHERE slug = 'ssc-scra';

-- UPSC
UPDATE exams SET
  description = 'The UPSC Civil Services Examination (CSE) recruits officers for the Indian Administrative Service (IAS), the apex civil service of India. IAS officers manage district administration, lead state and central government departments, and represent India in international forums. The exam is regarded as one of the most competitive in the world.',
  eligibility = 'Age: 21–32 years (OBC: 35, SC/ST: 37, PwBD: 42). Attempts: General 6, OBC 9, SC/ST unlimited. Education: Bachelor''s degree from a recognised university in any discipline. Nationality: Indian citizen/Person of Indian Origin/Overseas Citizen of India (conditions apply).'
WHERE slug = 'upsc-ias';

UPDATE exams SET
  description = 'The UPSC Civil Services Examination (CSE) also recruits officers for the Indian Police Service (IPS). IPS officers lead state and central police forces, including district superintendents of police, state DGPs, and heads of central paramilitary forces. Selection is through the same exam as IAS with a separate preference list.',
  eligibility = 'Age: 21–32 years (OBC: 35, SC/ST: 37, PwBD: 42). Attempts: General 6, OBC 9, SC/ST unlimited. Education: Bachelor''s degree from a recognised university. Physical standards additionally apply for IPS. Nationality: Indian citizen.'
WHERE slug = 'upsc-ips';

UPDATE exams SET
  description = 'The UPSC Indian Forest Service (IFS) examination recruits officers for the Indian Forest Service, responsible for managing forest resources and wildlife conservation across India. IFS officers work in state forest departments and central organisations like the Forest Survey of India and Wildlife Institute of India.',
  eligibility = 'Age: 21–32 years (OBC: 35, SC/ST: 37, PwBD: 42). Attempts: General 6, OBC 9, SC/ST unlimited. Education: Bachelor''s degree with at least one of the following: Animal Husbandry & Veterinary Science, Botany, Chemistry, Geology, Mathematics, Physics, Statistics, or Zoology; OR Bachelor''s degree in Agriculture, Forestry or in Engineering. Nationality: Indian citizen.'
WHERE slug = 'upsc-ifs';

-- Railways
UPDATE exams SET
  description = 'The RRB Junior Engineer (JE) examination recruits Junior Engineers and equivalent technical posts across Indian Railways departments including Civil, Mechanical, Electrical, Electronics, IT, and Depot Material Superintendent. JE is a Group C technical post under Railway Recruitment Boards.',
  eligibility = 'Age: 18–33 years (relaxation for SC/ST/OBC/Ex-Servicemen/PwBD as per rules). Education: Three-year diploma or degree in Engineering in relevant discipline, OR equivalent qualification. Nationality: Indian citizen.'
WHERE slug = 'rrb-je';

UPDATE exams SET
  description = 'The RRB NTPC (Non-Technical Popular Categories) examination recruits for a large number of posts in Indian Railways including Junior Clerk cum Typist, Accounts Clerk cum Typist, Junior Time Keeper, Trains Clerk, Commercial cum Ticket Clerk, Station Master, Goods Guard, and Senior Commercial cum Ticket Clerk at graduate and undergraduate levels.',
  eligibility = 'Age: 18–33 years (graduate posts); 18–30 years (undergraduate posts). Relaxation for SC/ST/OBC/Ex-Servicemen/PwBD as per rules. Education: 12th pass (for Level 2–3 posts) or Bachelor''s degree (for Level 4–6 posts) in any discipline from a recognised university. Nationality: Indian citizen.'
WHERE slug = 'rrb-ntpc';

UPDATE exams SET
  description = 'The RRB Group D examination recruits Track Maintainer Grade IV, Helper/Assistant in various departments (Electrical, Engineering, Mechanical, Signal & Telecommunication), Assistant Pointsman, and Level 1 posts under Indian Railways. It is the entry-level technical and ancillary recruitment with the highest vacancy count.',
  eligibility = 'Age: 18–33 years (relaxation for SC/ST/OBC/Ex-Servicemen/PwBD). Education: Class 10 (Matriculation) pass with ITI certificate from recognised institution; OR equivalent qualification; OR National Apprenticeship Certificate (NAC) granted by NCVT. Nationality: Indian citizen.'
WHERE slug = 'rrb-gra';

UPDATE exams SET
  description = 'The RRB Assistant Station Master (ASM) examination recruits Assistant Station Masters for Indian Railways, responsible for station operations, train movement management, and passenger safety.',
  eligibility = 'Age: 18–33 years (relaxation for SC/ST/OBC/Ex-Servicemen/PwBD). Education: Bachelor''s degree in any discipline from a recognised university. Vision standards apply. Nationality: Indian citizen.'
WHERE slug = 'rrb-asm';

UPDATE exams SET
  description = 'The RRB Technician exam recruits Technicians Grade I and III across departments such as Electrical, Mechanical, Signal, Civil, and Information Technology in Indian Railways.',
  eligibility = 'Age: 18–33 years (relaxation for SC/ST/OBC/PwBD/Ex-Servicemen). Education: Class 10 with ITI certificate in relevant trade (for Grade III); Class 12 with ITI or diploma in engineering (for Grade I). Nationality: Indian citizen.'
WHERE slug = 'rrb-technician';

UPDATE exams SET
  description = 'The RRB Constable (RPF/RPSF) exam recruits Constables for the Railway Protection Force (RPF) and Railway Protection Special Force (RPSF), who are responsible for protecting rail property and passenger safety.',
  eligibility = 'Age: 18–28 years (relaxation for SC/ST/OBC/Ex-Servicemen). Education: Class 10 (Matriculation) pass. Physical efficiency test mandatory. Nationality: Indian citizen.'
WHERE slug = 'rrb-constable';

-- Banking
UPDATE exams SET
  description = 'IBPS PO (Probationary Officer) exam is conducted by the Institute of Banking Personnel Selection to recruit Probationary Officers across participating public sector banks in India. POs are general banking officers who handle frontline banking operations and are promoted to managerial roles over their career.',
  eligibility = 'Age: 20–30 years (OBC: 33, SC/ST: 35, PwBD: 40). Attempts: up to 4 for General/OBC. Education: Bachelor''s degree in any discipline from a recognised university recognised by the Central Government. Nationality: Indian citizen.'
WHERE slug = 'ibps-po';

UPDATE exams SET
  description = 'IBPS Clerk exam recruits Clerical Cadre (Clerk cum Cashier) staff across public sector banks that participate in the IBPS system. Clerks handle teller operations, account opening, cheque processing, and customer service at bank branches.',
  eligibility = 'Age: 20–28 years (OBC: 31, SC/ST: 33, PwBD: 38). Education: Bachelor''s degree in any discipline from a recognised university. Proficiency in official language of the state/UT applied for is preferred. Nationality: Indian citizen.'
WHERE slug = 'ibps-clerk';

UPDATE exams SET
  description = 'IBPS Specialist Officer (SO) exam recruits specialist officers in domains including IT Officer, Agriculture Field Officer, Rajbhasha Adhikari, Law Officer, HR/Personnel Officer, and Marketing Officer for public sector banks.',
  eligibility = 'Age: 20–30 years (varies by post; relaxation for SC/ST/OBC/PwBD). Education: Relevant professional degree in IT, Agriculture, Law, HR or relevant field as specified per post. Nationality: Indian citizen.'
WHERE slug = 'ibps-so';

UPDATE exams SET
  description = 'SBI PO (Probationary Officer) exam is conducted by the State Bank of India to recruit Probationary Officers for SBI branches across India. SBI PO is considered one of the most prestigious banking jobs, offering a fast-track career in India''s largest public sector bank.',
  eligibility = 'Age: 21–30 years (OBC: 33, SC/ST: 35, PwBD: 40). Education: Bachelor''s degree in any discipline from a recognised Central/State university. Final year students may apply subject to meeting educational qualification before joining. Nationality: Indian citizen.'
WHERE slug = 'sbi-po';

UPDATE exams SET
  description = 'SBI Clerk (Junior Associates – Customer Support & Sales) exam recruits clerical staff for the State Bank of India. SBI Clerks handle branch banking operations including cash transactions, account services, and customer support across SBI''s vast branch network.',
  eligibility = 'Age: 20–28 years (OBC: 31, SC/ST: 33, PwBD: 38). Education: Class 12 pass in any discipline OR equivalent from a recognised board. Proficiency in local language of the state applied for is required. Nationality: Indian citizen.'
WHERE slug = 'sbi-clerk';

UPDATE exams SET
  description = 'RBI Assistant exam recruits Assistants for the Reserve Bank of India, working in RBI offices across the country. Assistants perform clerical and operational functions at the apex bank of India including currency management, banking regulation support, and public accounts management.',
  eligibility = 'Age: 20–28 years (OBC: 31, SC/ST: 33, PwBD: 38). Education: Bachelor''s degree in any discipline with minimum 50% marks (45% for SC/ST/PwBD). Computer proficiency required. Nationality: Indian citizen.'
WHERE slug = 'rbi-assistant';

-- Defence
UPDATE exams SET
  description = 'The UPSC Combined Defence Services (CDS) examination recruits officers for the Indian Military Academy (IMA), Officers Training Academy (OTA), Indian Naval Academy (INA), and Indian Air Force Academy. CDS is conducted twice a year and is the primary route for graduate-level officer entry into the Indian Armed Forces.',
  eligibility = 'Age: 19–24 years (IMA/INA/AFA); 19–25 years (OTA). Education: Bachelor''s degree for IMA/OTA; Engineering degree for INA/AFA. Nationality: Indian citizen/Subject of Nepal/Subject of Bhutan. Physical and medical standards apply.'
WHERE slug = 'defence-cds';

UPDATE exams SET
  description = 'The UPSC National Defence Academy (NDA) examination recruits cadets for the National Defence Academy at Khadakwasla, Pune, which trains officer candidates for the Indian Army, Navy, and Air Force. NDA admits Class 12 pass students for a 3-year integrated course followed by 1 year at respective service academies.',
  eligibility = 'Age: 16.5–19.5 years at the time of commencement of course. Education: Class 12 (10+2) pass or appearing from a recognised board (Physics and Mathematics required for Navy and Air Force wings). Physical and medical standards mandatory. Only unmarried male candidates (Army), unmarried male or female candidates (some wings as notified). Nationality: Indian citizen.'
WHERE slug = 'defence-nda';

-- Teaching
UPDATE exams SET
  description = 'The Central Teacher Eligibility Test (CTET) is conducted by the Central Board of Secondary Education (CBSE) to certify the eligibility of candidates who wish to teach at Classes I–VIII in central government schools including Kendriya Vidyalayas, Navodaya Vidyalayas, and other central government-aided schools.',
  eligibility = 'Paper I (Classes I–V): Class 12 with 50% marks AND 2-year Diploma in Elementary Education OR B.El.Ed. OR special education qualification. Paper II (Classes VI–VIII): Bachelor''s degree AND B.Ed from recognised institution. Age: No upper age limit. Nationality: Indian citizen.'
WHERE slug = 'teaching-ctet';

UPDATE exams SET
  description = 'State Teacher Eligibility Tests (STETs) are conducted by individual state governments to certify eligibility for teaching positions at primary and upper-primary level in state government schools. Each state has its own STET with state-specific eligibility norms.',
  eligibility = 'Varies by state. Generally: Class 12 with 50% marks and 2-year D.El.Ed. (for Paper I/primary level) or Bachelor''s degree with B.Ed. (for Paper II/upper-primary level). Age limits and relaxations are state-specific.'
WHERE slug = 'teaching-stet';

UPDATE exams SET
  description = 'The UPTET (Uttar Pradesh Teacher Eligibility Test) is the state-level teacher eligibility examination conducted by UP Parishad for recruitment of teachers in government primary (Classes I–V) and upper-primary (Classes VI–VIII) schools in Uttar Pradesh.',
  eligibility = 'Paper I (Classes I–V): Class 12 with 45% marks and 2-year Diploma in Elementary Education OR B.El.Ed. Paper II (Classes VI–VIII): Bachelor''s degree with B.Ed. Age: 18–35 years (relaxation for SC/ST/OBC/PwBD/Ex-Servicemen). Nationality: Indian citizen.'
WHERE slug = 'uptet';

UPDATE exams SET
  description = 'The DSSSB (Delhi Subordinate Services Selection Board) conducts examinations to recruit teachers (PGT, TGT, PRT) for government schools in Delhi under the Directorate of Education, as well as for various other posts in Delhi government departments.',
  eligibility = 'PRT (Primary): 12th pass with 50% and D.El.Ed/JBT/B.Ed/B.El.Ed. TGT: Bachelor''s degree in relevant subject + B.Ed. PGT: Master''s degree in relevant subject + B.Ed. CTET/DSTET qualification required for teacher posts. Age: 18–30 years (varies by post). Nationality: Indian citizen.'
WHERE slug = 'dsssb';

UPDATE exams SET
  description = 'KVS PGT/TGT exam recruits Post Graduate Teachers (PGT) and Trained Graduate Teachers (TGT) for Kendriya Vidyalayas (KVs), the network of central government schools administered by the Kendriya Vidyalaya Sangathan under the Ministry of Education.',
  eligibility = 'TGT: Bachelor''s degree in relevant subject with 50% marks AND B.Ed with 50% marks. PGT: Master''s degree in relevant subject with 50% marks AND B.Ed with 50% marks. CTET Paper II qualified (for TGT). Age: 18–35 years (relaxation for SC/ST/OBC/PwBD). Nationality: Indian citizen.'
WHERE slug = 'kvs-pgt';

-- Police
UPDATE exams SET
  description = 'The Delhi Police Constable exam recruits Constables (Executive) for the Delhi Police, the police force of the National Capital Territory of Delhi. Delhi Police Constables are responsible for law and order, crime prevention, traffic management, and community policing in Delhi.',
  eligibility = 'Age: 18–25 years (OBC: 28, SC/ST: 30). Education: Class 12 (10+2) pass from a recognised board. Physical standards: Height and chest measurement mandatory. Physical Efficiency Test (PET) required. Nationality: Indian citizen.'
WHERE slug = 'delhi-police-constable';

UPDATE exams SET
  description = 'BSF (Border Security Force) Constable recruitment is conducted to induct Constables (General Duty, Tradesman) into the Border Security Force, India''s primary border guarding organisation responsible for guarding international borders with Pakistan and Bangladesh.',
  eligibility = 'Age: 18–23 years (relaxation for SC/ST/OBC/Ex-Servicemen). Education: Class 10 (Matriculation) pass. Physical standards mandatory: height, chest measurement for male candidates. Physical Efficiency Test required. Medical standards apply. Nationality: Indian citizen.'
WHERE slug = 'bsf-constable';

UPDATE exams SET
  description = 'State Police Sub-Inspector (SI) and Constable exams are conducted by state police recruitment boards to fill positions in state police forces across India. Specific posts, eligibility, and exam patterns vary by state.',
  eligibility = 'Age: Generally 18–25 years for Constable; 20–28 years for SI (state-specific relaxations apply). Education: Class 10 (Constable) or Class 12/Graduate (SI) depending on state and post. Physical efficiency tests and medical examinations mandatory. Nationality: Indian citizen.'
WHERE slug = 'state-police-si';

-- Engineering
UPDATE exams SET
  description = 'GATE (Graduate Aptitude Test in Engineering) is a national-level examination jointly conducted by IISc Bangalore and IITs. GATE scores are used for admission to M.Tech/M.E./Ph.D. programmes at IITs, NITs, and other premier institutes, and are also used by PSUs (Public Sector Undertakings) for recruitment of engineers and scientists.',
  eligibility = 'No age limit. Education: Currently in the final year of or completed a Bachelor''s degree in Engineering/Technology/Architecture, or Master''s degree in any relevant science subject. Nationality: Indian citizen (and international students from specific countries are eligible).'
WHERE slug = 'gate';

UPDATE exams SET
  description = 'The UPSC Engineering Services Examination (ESE/IES) recruits Class 1 officers for Group A and Group B engineering services of the Government of India in branches including Civil, Mechanical, Electrical, and Electronics & Telecommunication. IES officers work in organisations such as CPWD, Indian Railways, BRO, Doordarshan and other technical departments.',
  eligibility = 'Age: 21–30 years (OBC: 33, SC/ST: 35, PwBD: 40). Education: Bachelor''s degree in Engineering in relevant branch from a recognised university OR passed Section A and B of Institution of Engineers examination. Nationality: Indian citizen.'
WHERE slug = 'ies';

-- Insurance
UPDATE exams SET
  description = 'The LIC ADO (Apprentice Development Officer) exam is conducted by Life Insurance Corporation of India to recruit ADOs, who work as field officers promoting LIC products, managing agency networks, and developing business across LIC branches.',
  eligibility = 'Age: 21–30 years (OBC: 33, SC/ST/PwBD: 35). Education: Bachelor''s degree in any discipline from a recognised university. Proficiency in local language preferred. Nationality: Indian citizen.'
WHERE slug = 'lic-ado';

UPDATE exams SET
  description = 'The NIACL AO (New India Assurance Company Limited Administrative Officer) exam recruits Administrative Officers (Generalist and Specialist) for one of India''s oldest and largest public sector general insurance companies.',
  eligibility = 'Age: 21–30 years (OBC: 33, SC/ST: 35, PwBD: 40). Education: Bachelor''s degree with minimum 60% marks (50% for SC/ST/PwBD). Specialist streams require relevant professional qualification (Engineering, CA, Law, etc.). Nationality: Indian citizen.'
WHERE slug = 'niacl-ao';

-- State PSCs (representative descriptions for PSC exams)
UPDATE exams SET
  description = 'The Bihar Public Service Commission (BPSC) Combined Competitive Examination (CCE) recruits officers for Bihar state civil services including the Bihar Administrative Service, Bihar Police Service, and other Group A/B posts in the state government.',
  eligibility = 'Age: 20–37 years (SC/ST/Women: 40, PwBD: 42). Attempts: 5 for General; unlimited for SC/ST/Women. Education: Bachelor''s degree from a recognised university. Nationality: Indian citizen (domicile of Bihar for most posts).'
WHERE slug = 'bpsc';

UPDATE exams SET
  description = 'BPSC TRE (Teacher Recruitment Exam) is conducted by the Bihar Public Service Commission to recruit school teachers for Bihar''s government schools at primary, secondary, and higher secondary levels.',
  eligibility = 'Primary (Classes I–V): D.El.Ed/B.El.Ed + BTET/CTET. Secondary (Classes IX–X): Bachelor''s degree in relevant subject + B.Ed + STET. Senior Secondary (Classes XI–XII): Master''s degree in relevant subject + B.Ed + STET. Age and domicile requirements as per Bihar government norms.'
WHERE slug = 'bpsc-tre';

UPDATE exams SET
  description = 'The HPSC (Haryana Public Service Commission) conducts examinations to recruit officers for Haryana state civil services including HCS (Haryana Civil Service), Haryana Police Service, and various Group A/B posts in the state government.',
  eligibility = 'Age: 21–42 years (varies by post and category). Education: Bachelor''s degree from a recognised university. Domicile: Candidate must be domicile of Haryana for most posts. Nationality: Indian citizen.'
WHERE slug = 'hpsc';

UPDATE exams SET
  description = 'The UPPSC (Uttar Pradesh Public Service Commission) PCS (Provincial Civil Service) examination recruits officers for UP state civil services including IAS feeder cadres, SDMs, DSPs, and other Group A/B posts in the state government.',
  eligibility = 'Age: 21–40 years (OBC: 43, SC/ST: 45, PwBD: 55). Education: Bachelor''s degree from a recognised university. Domicile: UP domicile required for most posts. Nationality: Indian citizen.'
WHERE slug = 'uppsc';

UPDATE exams SET
  description = 'The RPSC (Rajasthan Public Service Commission) conducts RAS (Rajasthan Administrative Service) and other state service examinations to recruit officers for Group A and B services under the Government of Rajasthan.',
  eligibility = 'Age: 21–40 years (OBC/SC/ST: additional relaxation as per Rajasthan rules). Education: Bachelor''s degree from a recognised university. Nationality: Indian citizen. Domicile preference for Rajasthan.'
WHERE slug = 'rpsc';

UPDATE exams SET
  description = 'The JPSC (Jharkhand Public Service Commission) combined civil services examination recruits officers for Jharkhand Administrative Service, Jharkhand Police Service, and other Group A/B posts in the state government.',
  eligibility = 'Age: 21–35 years (SC/ST/Women: 38, PwBD: 45). Education: Bachelor''s degree from a recognised university. Domicile: Jharkhand domicile required. Nationality: Indian citizen.'
WHERE slug = 'jpsc';

UPDATE exams SET
  description = 'The UKPSC (Uttarakhand Public Service Commission) conducts combined state services examination to recruit officers for Group A and B posts in Uttarakhand state government.',
  eligibility = 'Age: 21–42 years (varies by category). Education: Bachelor''s degree from a recognised university. Nationality: Indian citizen.'
WHERE slug = 'ukpsc';

UPDATE exams SET
  description = 'The KPSC (Karnataka Public Service Commission) conducts the Karnataka Administrative Service (KAS) examination to recruit Group A and B officers for various state government departments in Karnataka.',
  eligibility = 'Age: 21–35 years (OBC: 38, SC/ST: 40, PwBD: 45). Education: Bachelor''s degree from a recognised university. Kannada language proficiency required. Nationality: Indian citizen.'
WHERE slug = 'kpsc';

UPDATE exams SET
  description = 'The MPSC (Maharashtra Public Service Commission) Combined Graduate Level exam recruits officers for Maharashtra state civil services including Maharashtra Administrative Service and Group A/B posts.',
  eligibility = 'Age: 19–38 years (OBC: 41, SC/ST: 43, PwBD: 48). Education: Bachelor''s degree from a recognised university. Marathi language proficiency required. Nationality: Indian citizen.'
WHERE slug = 'mpsc-cgl';

UPDATE exams SET
  description = 'The GPSC (Gujarat Public Service Commission) Combined Graduate Level exam recruits officers for Gujarat Administrative Service, Gujarat Police Service, and other Group A/B posts in the state government.',
  eligibility = 'Age: 20–35 years (OBC/SC/ST/PwBD: as per Gujarat government norms). Education: Bachelor''s degree from a recognised university. Gujarati language proficiency required. Nationality: Indian citizen.'
WHERE slug = 'gpsc-cgl';

UPDATE exams SET
  description = 'TNPSC (Tamil Nadu Public Service Commission) conducts Group I, II, III, and IV examinations to recruit officers and staff for Tamil Nadu state government services.',
  eligibility = 'Age: 18–37 years (varies by group and category). Education: Varies by group — 8th/10th pass for Group IV; 12th/Graduation for Group II/III; Graduation for Group I. Tamil Nadu domicile and Tamil language proficiency required for most posts. Nationality: Indian citizen.'
WHERE slug = 'tnpsc';

UPDATE exams SET
  description = 'The APSC (Andhra Pradesh Public Service Commission) conducts Group I, II, III services examinations to recruit officers for Andhra Pradesh state government departments.',
  eligibility = 'Age: 18–42 years (SC/ST/OBC/PwBD/Women: additional relaxation as per AP rules). Education: Graduation for Group I/II; varies for Group III. Telugu medium preferred. Nationality: Indian citizen.'
WHERE slug = 'apsc';

UPDATE exams SET
  description = 'The OPSC (Odisha Public Service Commission) conducts the Odisha Civil Services (OCS) examination and other state service exams to recruit officers for Group A/B posts in the Odisha state government.',
  eligibility = 'Age: 21–38 years (SC/ST: 20–38, women: additional relaxation as per Odisha norms). Education: Bachelor''s degree from a recognised university. Nationality: Indian citizen.'
WHERE slug = 'opsc';

UPDATE exams SET
  description = 'The WBPSC (West Bengal Public Service Commission) conducts the West Bengal Civil Service (WBCS) and other state examinations to recruit officers for Group A, B, C, and D posts in the West Bengal state government.',
  eligibility = 'Age: 21–36 years (OBC-A/B: 39, SC/ST: 41). Attempts: 3 for General, 6 for OBC. Education: Bachelor''s degree from a recognised university. Nationality: Indian citizen.'
WHERE slug = 'wbpsc';

UPDATE exams SET
  description = 'BPSC (Bihar PSC) and JPSC/UKPSC etc. — the Himachal Pradesh Public Service Commission (HPPSC) conducts state civil services examination for HP Administrative Service, HP Police Service, and allied services.',
  eligibility = 'Age: 21–35 years (varies by category). Education: Bachelor''s degree from a recognised university. HP domicile required. Nationality: Indian citizen.'
WHERE slug = 'himachal-psc';

UPDATE exams SET
  description = 'The Punjab Public Service Commission (PPSC) conducts examinations to recruit officers for Punjab state civil services including Punjab Civil Services (PCS) and other Group A/B posts.',
  eligibility = 'Age: 21–37 years (SC/BC: 42, Women: 40). Education: Bachelor''s degree from a recognised university. Punjab domicile required. Nationality: Indian citizen.'
WHERE slug = 'punjab-psc';

UPDATE exams SET
  description = 'The Kerala Public Service Commission (Kerala PSC) recruits for all state government departments including civil services, police, teaching, and technical posts across Kerala.',
  eligibility = 'Age and education vary by post. Generally 18–36 years for most posts. Proficiency in Malayalam required. Kerala domicile required. Nationality: Indian citizen.'
WHERE slug = 'kerala-psc';

UPDATE exams SET
  description = 'The Maharashtra Public Service Commission (MPSC) conducts examinations for various Group A/B/C posts in Maharashtra state government departments other than the combined services pathway.',
  eligibility = 'Age: 19–38 years (OBC: 41, SC/ST: 43). Education: Varies by post. Marathi proficiency required. Nationality: Indian citizen.'
WHERE slug = 'maharashtra-psc';

UPDATE exams SET
  description = 'The Telangana State Public Service Commission (TSPSC) conducts the Telangana Civil Services examination and departmental tests to recruit officers for Telangana state government services.',
  eligibility = 'Age: 18–44 years (varies by category and post). Education: Bachelor''s degree for most Group I/II posts. Telangana domicile required. Nationality: Indian citizen.'
WHERE slug = 'telangana-psc';

UPDATE exams SET
  description = 'The Assam Public Service Commission (APSC) conducts the Combined Competitive Examination (CCE) and other state service examinations to recruit for Assam Civil Service and allied posts.',
  eligibility = 'Age: 21–38 years (SC/ST/OBC/PwBD: additional relaxation). Education: Bachelor''s degree from a recognised university. Nationality: Indian citizen.'
WHERE slug = 'assam-psc';

UPDATE exams SET
  description = 'The TPSC (Tripura Public Service Commission) Combined Grade examination recruits for Group A/B civil services posts in the Tripura state government.',
  eligibility = 'Age: 18–40 years (SC/ST: 45). Education: Bachelor''s degree from a recognised university. Nationality: Indian citizen.'
WHERE slug = 'tpsc-cgl';

UPDATE exams SET
  description = 'The Arunachal Pradesh Public Service Commission (APPSC) conducts combined competitive examinations for Group A/B civil services in Arunachal Pradesh state government.',
  eligibility = 'Age: 21–32 years (SC/ST: 37). Education: Bachelor''s degree from a recognised university. Scheduled Tribe (ST) domicile preference. Nationality: Indian citizen.'
WHERE slug = 'arunachal-psc';

UPDATE exams SET
  description = 'The Manipur Public Service Commission (MPSC) conducts the Manipur Civil Services Examination and other departmental exams for Group A/B civil service posts in the Manipur state government.',
  eligibility = 'Age: 21–38 years (SC/ST/OBC: additional relaxation as per Manipur norms). Education: Bachelor''s degree from a recognised university. Nationality: Indian citizen.'
WHERE slug = 'manipur-psc';

UPDATE exams SET
  description = 'The Meghalaya Public Service Commission (MPSC) conducts civil services examinations for the Meghalaya Civil Service (MCS), Meghalaya Police Service (MPS), and allied posts in the state government.',
  eligibility = 'Age: 21–32 years (ST/SC: additional relaxation). Education: Bachelor''s degree from a recognised university. ST domicile preference. Nationality: Indian citizen.'
WHERE slug = 'meghalaya-psc';

UPDATE exams SET
  description = 'The Mizoram Public Service Commission (MPSC) conducts the Mizoram Civil Service (MCS) examination and other state service exams for Group A/B posts in the Mizoram state government.',
  eligibility = 'Age: 21–35 years (ST/SC: additional relaxation). Education: Bachelor''s degree from a recognised university. Mizo domicile preferred. Nationality: Indian citizen.'
WHERE slug = 'mizoram-psc';

UPDATE exams SET
  description = 'The Nagaland Public Service Commission (NPSC) conducts the Nagaland Civil Services examination and other state service exams for Group A/B posts in the Nagaland state government.',
  eligibility = 'Age: 21–35 years (ST/SC: additional relaxation as per Nagaland rules). Education: Bachelor''s degree from a recognised university. Nationality: Indian citizen.'
WHERE slug = 'nagaland-psc';

UPDATE exams SET
  description = 'The Sikkim Public Service Commission (SPSC) conducts the Sikkim Civil Services examination for Group A/B civil service posts under the Sikkim state government.',
  eligibility = 'Age: 21–35 years (ST/SC/OBC: relaxation as per Sikkim norms). Education: Bachelor''s degree from a recognised university. Nationality: Indian citizen.'
WHERE slug = 'sikkim-psc';

UPDATE exams SET
  description = 'The Puducherry Public Service Commission (PPSC) conducts examinations to recruit officers and staff for Group A, B, and C posts in the Union Territory of Puducherry administration.',
  eligibility = 'Age: 18–35 years (SC/ST/OBC: relaxation as per UT Puducherry rules). Education: Varies by post — 10th/12th/Graduation. Nationality: Indian citizen.'
WHERE slug = 'puducherry-psc';

UPDATE exams SET
  description = 'The Chhattisgarh Public Service Commission (CGPSC) conducts state civil services examination for Chhattisgarh Administrative Service, Chhattisgarh Police Service, and allied Group A/B posts.',
  eligibility = 'Age: 21–28 years General; 21–38 years ST/SC/OBC/PwBD. Education: Bachelor''s degree from a recognised university. Chhattisgarh domicile required. Nationality: Indian citizen.'
WHERE slug = 'chhattisgarh-psc';

-- ============================================================
-- 3. ORGANIZATION DESCRIPTIONS AND WEBSITE URLs
-- ============================================================

-- Major identifiable organizations (top by recruitment count or public prominence)

UPDATE organizations SET description = 'The Staff Selection Commission (SSC) is a Government of India organisation under the Department of Personnel and Training that recruits staff for various posts in the ministries, departments and organisations of the Government of India. It is headquartered in New Delhi and conducts some of the largest competitive examinations in the country.', website_url = 'https://ssc.gov.in' WHERE slug = 'staff-selection-commission';

UPDATE organizations SET description = 'Railway Recruitment Boards (RRBs) are the government agencies that recruit non-gazetted staff for Indian Railways. There are 21 RRBs across different cities in India, each responsible for recruitment in a specific railway zone. They fall under the Ministry of Railways, Government of India.', website_url = 'https://indianrailways.gov.in' WHERE slug = 'railway-recruitment-board';

UPDATE organizations SET description = 'The Institute of Banking Personnel Selection (IBPS) is an autonomous body that provides standardised recruitment and selection for public sector banks in India. IBPS conducts Common Recruitment Processes (CRP) for Probationary Officers, Clerks, Specialist Officers, and RRB staff.', website_url = 'https://www.ibps.in' WHERE slug = 'institute-of-banking-personnel-selection';

UPDATE organizations SET description = 'The Bihar Public Service Commission (BPSC) is a constitutional body established under Article 315 of the Constitution of India, responsible for recruiting officers for Bihar state civil services and allied services under the Government of Bihar.', website_url = 'https://www.bpsc.bih.nic.in' WHERE slug = 'bihar-public-service-commission';

UPDATE organizations SET description = 'The Reserve Bank of India (RBI) is the central bank and regulatory body of India, established in 1935 under the Reserve Bank of India Act. It formulates and implements monetary policy, regulates and supervises financial institutions, manages foreign exchange, and issues currency.', website_url = 'https://www.rbi.org.in' WHERE slug = 'reserve-bank-of-india-rbi';

UPDATE organizations SET description = 'All India Institute of Medical Sciences (AIIMS) is a network of premier public medical institutes in India under the Ministry of Health and Family Welfare, Government of India. The original AIIMS Delhi was established in 1956; newer AIIMS campuses have since been established across the country.', website_url = 'https://www.aiims.edu' WHERE slug = 'aiims-medical-institute';

UPDATE organizations SET description = 'All India Institute of Medical Sciences, Delhi (AIIMS Delhi) is the flagship institute of the AIIMS network, established in 1956 in New Delhi. It is among India''s foremost medical research and education institutions.', website_url = 'https://www.aiims.edu' WHERE slug = 'all-india-institute-of-medical-sciences-delhi';

UPDATE organizations SET description = 'All India Institute of Medical Sciences (AIIMS) Bhopal is a premier public medical college and hospital in Bhopal, Madhya Pradesh, established under the Pradhan Mantri Swasthya Suraksha Yojana (PMSSY) to provide affordable healthcare and quality medical education.', website_url = 'https://www.aiimsbhopal.edu.in' WHERE slug = 'all-india-institute-of-medical-sciences-bhopal';

UPDATE organizations SET description = 'The Indian Institute of Technology Delhi (IIT Delhi) is a public technical university located in Hauz Khas, New Delhi. Established in 1961, it is one of India''s premier institutions for technology education and research, offering undergraduate, postgraduate, and doctoral programmes.', website_url = 'https://home.iitd.ac.in' WHERE slug = 'indian-institute-of-technology-delhi';

UPDATE organizations SET description = 'The Indian Institute of Technology Kharagpur (IIT Kharagpur) is the oldest of the IITs, established in 1951 in Kharagpur, West Bengal. It is a leading centre for engineering, technology, management, and law education in India.', website_url = 'https://www.iitkgp.ac.in' WHERE slug = 'indian-institute-of-technology-kharagpur';

UPDATE organizations SET description = 'IIT Roorkee (Indian Institute of Technology Roorkee), originally the University of Roorkee, is one of India''s oldest technical institutions, founded in 1847. Located in Roorkee, Uttarakhand, it became an IIT in 2001.', website_url = 'https://www.iitr.ac.in' WHERE slug = 'indian-institute-of-technology-roorkee';

UPDATE organizations SET description = 'IIT Kanpur (Indian Institute of Technology Kanpur) is a public research university established in 1959 in Kanpur, Uttar Pradesh. It is known for its engineering and science programmes and research output.', website_url = 'https://www.iitk.ac.in' WHERE slug = 'indian-institute-of-technology-kanpur';

UPDATE organizations SET description = 'IIT Gandhinagar (Indian Institute of Technology Gandhinagar) is a public technical university established in 2008 in Gandhinagar, Gujarat. It is known for its interdisciplinary approach to education and research.', website_url = 'https://www.iitgn.ac.in' WHERE slug = 'indian-institute-of-technology-gandhinagar';

UPDATE organizations SET description = 'IIT Jammu (Indian Institute of Technology Jammu) is a newer Indian Institute of Technology established in 2016 in Jagti, Jammu, Jammu and Kashmir. It offers undergraduate and postgraduate engineering programmes.', website_url = 'https://www.iitjammu.ac.in' WHERE slug = 'indian-institute-of-technology-jammu';

UPDATE organizations SET description = 'IIM Mumbai (Indian Institute of Management Mumbai), also known as IIM Bombay or IIM Indore at Bombay as branch — IIM Mumbai, established 2022 in Mumbai, is one of India''s newer IIMs. IIM Bombay (IIM-B) was established 1958 and is a premier management institution.', website_url = 'https://www.iimb.ac.in' WHERE slug = 'indian-institute-of-management-mumbai';

UPDATE organizations SET description = 'Indian Institute of Management Bangalore (IIMB) is one of India''s premier management institutions, established in 1973 in Bangalore, Karnataka. It offers MBA, PhD, and executive programmes.', website_url = 'https://www.iimb.ac.in' WHERE slug = 'indian-institute-of-management-bangalore';

UPDATE organizations SET description = 'Indian Institute of Management Lucknow (IIML) is one of India''s leading management institutions, established in 1984 in Lucknow, Uttar Pradesh. It offers full-time and part-time management programmes.', website_url = 'https://www.iiml.ac.in' WHERE slug = 'indian-institute-of-management-lucknow';

UPDATE organizations SET description = 'Tata Institute of Social Sciences (TISS) is a public research university established in 1936 in Mumbai, Maharashtra. It is one of Asia''s oldest social science universities and a Deemed University of Excellence. It offers programmes in social work, management, and public policy.', website_url = 'https://www.tiss.edu' WHERE slug = 'tata-institute-of-social-sciences';

UPDATE organizations SET description = 'RITES Ltd. is a Navratna Central Public Sector Enterprise (CPSE) under the Ministry of Railways, Government of India. It provides consultancy services in infrastructure, transport, and engineering sectors. Headquartered in Gurugram, Haryana.', website_url = 'https://www.rites.com' WHERE slug = 'rail-india-technical-and-economic-service';

UPDATE organizations SET description = 'The Brihanmumbai Municipal Corporation (BMC), also known as the Greater Mumbai Municipal Corporation, is the civic body that governs the Mumbai metropolitan area. It is one of the richest municipal corporations in India.', website_url = 'https://portal.mcgm.gov.in' WHERE slug = 'brihanmumbai-municipal-corporation';

UPDATE organizations SET description = 'Mumbai Port Authority (MbPA), formerly Mumbai Port Trust, is one of India''s major port authorities located in Mumbai, Maharashtra. It falls under the Ministry of Ports, Shipping and Waterways, Government of India.', website_url = 'https://www.mumbaiport.gov.in' WHERE slug = 'mumbai-port-authority';

UPDATE organizations SET description = 'The Andhra Pradesh Public Service Commission (APPSC) is a constitutional body that recruits officers for Group I, II, III, and IV services of the Andhra Pradesh state government.', website_url = 'https://www.psc.ap.gov.in' WHERE slug = 'andhra-pradesh-public-service-commission';

UPDATE organizations SET description = 'BITS Pilani (Birla Institute of Technology and Science, Pilani) is a deemed private university established in 1964 in Pilani, Rajasthan. It is one of India''s leading engineering and management institutions with campuses in Pilani, Goa, Hyderabad, and Dubai.', website_url = 'https://www.bits-pilani.ac.in' WHERE slug = 'birla-institute-of-technology-and-science-pilani';

UPDATE organizations SET description = 'The Himachal Pradesh Public Service Commission (HPPSC) is the recruiting body for civil services and other posts in the Himachal Pradesh state government, established under Article 315 of the Constitution.', website_url = 'https://www.hppsc.hp.gov.in' WHERE slug = 'himachal-pradesh-public-service-commission';

UPDATE organizations SET description = 'Delhi Technological University (DTU), formerly Delhi College of Engineering, is a public technical university in Rohini, Delhi. Established in 1941, it offers undergraduate, postgraduate, and doctoral engineering and technology programmes.', website_url = 'https://www.dtu.ac.in' WHERE slug = 'delhi-technological-university';

UPDATE organizations SET description = 'Punjab Agricultural University (PAU) is a public agricultural university established in 1962 in Ludhiana, Punjab. It is one of India''s leading agricultural research and education institutions.', website_url = 'https://www.pau.edu' WHERE slug = 'punjab-agricultural-university';

UPDATE organizations SET description = 'Rajiv Gandhi National Aviation University (RGNAU) is a central university established in 2013 in Fursatganj, Uttar Pradesh. It offers programmes in aviation technology, management, law, and allied aviation sciences under the Ministry of Civil Aviation.', website_url = 'https://www.rgnau.ac.in' WHERE slug = 'rajiv-gandhi-national-aviation-university';

UPDATE organizations SET description = 'Indian Institute of Science Education and Research (IISER) Bhopal is an autonomous research university established in 2008 in Bhopal, Madhya Pradesh, under the Ministry of Education. It focuses on science education and research.', website_url = 'https://www.iiserbhopal.ac.in' WHERE slug = 'indian-institute-of-science-education-and-research-bhopal';

UPDATE organizations SET description = 'Manipal Academy of Higher Education (MAHE), popularly known as Manipal University, is a private deemed-to-be university established in 1993 in Manipal, Karnataka. It is one of India''s largest private universities.', website_url = 'https://manipal.edu' WHERE slug = 'manipal-academy-of-higher-education';

UPDATE organizations SET description = 'NIT Agartala (National Institute of Technology Agartala) is a public technical university established in 1965 in Agartala, Tripura. It is one of 31 NITs in India offering engineering and technology education.', website_url = 'https://www.nita.ac.in' WHERE slug = 'national-institute-of-technology-agartala';

UPDATE organizations SET description = 'The Mizoram Public Service Commission (MPSC) is the constitutional body under Article 315 that recruits officers for Mizoram state civil services and various state government departments.', website_url = 'https://mpsc.mizoram.gov.in' WHERE slug = 'mizoram-public-service-commission-mpsc-aizawl';

-- Bucket organizations get generic sector descriptions (no specific website)
UPDATE organizations SET description = 'Uttar Pradesh State Recruitment covers various recruitment campaigns conducted by state departments, boards, and corporations under the Government of Uttar Pradesh.' WHERE slug = 'uttar-pradesh-state-recruitment';

UPDATE organizations SET description = 'This listing covers recruitment by educational institutions including universities, colleges, and research institutes for faculty, research, administrative, and technical positions.' WHERE slug = 'educational-institution';

UPDATE organizations SET description = 'Public Sector Undertakings (PSUs) are government-owned corporations that operate commercially in sectors such as energy, steel, banking, aviation, and infrastructure. This listing covers recruitment by various central and state PSUs.' WHERE slug = 'public-sector-undertaking';

UPDATE organizations SET description = 'Madhya Pradesh State Recruitment covers recruitment campaigns by state departments, boards, and corporations under the Government of Madhya Pradesh.' WHERE slug = 'madhya-pradesh-state-recruitment';

UPDATE organizations SET description = 'Karnataka State Recruitment covers recruitment campaigns by state departments, boards, and corporations under the Government of Karnataka.' WHERE slug = 'karnataka-state-recruitment';
