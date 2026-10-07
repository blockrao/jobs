/**
 * Canonical role definitions for role-level entity pages (/posts/[slug]).
 *
 * Each entry maps a slug to:
 *  - canonical display name
 *  - alternate spellings / abbreviations used in `posts.name` to match records
 *  - sector for grouping
 *  - a short description (shown on the role page; must not reference aggregators)
 *
 * Seed list: 10 pilot roles selected for zero-normalization launch (all name
 * variants already present in the posts table map cleanly to one slug).
 *
 * The `aliases` field is the normalization engine: any post whose `name`
 * matches (case-insensitive) any alias or the `name` itself is returned when
 * querying for that role.
 */

export type RoleSector =
  | "Science & Research"
  | "Healthcare"
  | "Teaching & Education"
  | "Administration"
  | "Finance"
  | "Technical"
  | "Agriculture & Environment"
  | "Railway & Transport"
  | "Police & Security"
  | "Engineering"
  | "Banking & Finance"
  | "Defence";

export interface RoleDefinition {
  slug: string;
  name: string;
  aliases: string[];
  sector: RoleSector;
  description: string;
}

export const ROLE_REGISTRY: RoleDefinition[] = [
  {
    slug: "junior-research-fellow-jobs",
    name: "Junior Research Fellow",
    aliases: [
      "Junior Research Fellow (JRF)",
      "Junior Research Fellow (JRF) (Economics)",
      "Junior Research Fellow (JRF)(Agronomy)",
      "Junior Research Fellow",
      "JRF",
    ],
    sector: "Science & Research",
    description:
      "Junior Research Fellow (JRF) positions are offered by central universities, IITs, ICAR institutes, and research councils. Candidates typically require a postgraduate degree in the relevant discipline and must qualify national eligibility tests such as UGC NET/JRF or CSIR NET/JRF.",
  },
  {
    slug: "medical-officer-jobs",
    name: "Medical Officer",
    aliases: [
      "Medical Officer",
      "Medical Officer (Unani)",
      "Medical Officer (Ayurveda)",
      "Medical Officer (Homeopathy)",
    ],
    sector: "Healthcare",
    description:
      "Medical Officer posts are recruited by state health departments, ESI, CGHS, and central government hospitals. Candidates must hold an MBBS or equivalent degree from a recognized university and be registered with the appropriate State/Central Medical Council.",
  },
  {
    slug: "office-assistant-jobs",
    name: "Office Assistant",
    aliases: ["Office Assistant"],
    sector: "Administration",
    description:
      "Office Assistant positions are recruited across central ministries, autonomous bodies, and state government departments. Duties include file management, correspondence, and general administrative support. Eligibility is typically a graduation degree with basic computer proficiency.",
  },
  {
    slug: "data-entry-operator-jobs",
    name: "Data Entry Operator",
    aliases: ["Data Entry Operator", "DEO"],
    sector: "Administration",
    description:
      "Data Entry Operator (DEO) posts are available in central and state government offices, banks, and public sector undertakings. Candidates typically require 10+2 or graduation with a typing speed of 35 wpm (English) or 30 wpm (Hindi) on a computer.",
  },
  {
    slug: "research-associate-jobs",
    name: "Research Associate",
    aliases: [
      "Research Associate",
      "Research Associate (Project)",
      "Research Associate-I",
      "Research Associate-II",
      "Research Associate-III",
    ],
    sector: "Science & Research",
    description:
      "Research Associate positions are offered by ICAR institutes, DST-funded projects, CSIR laboratories, and central universities. Candidates must hold a PhD or equivalent research qualification. Fellowships are funded for a fixed project duration.",
  },
  {
    slug: "staff-nurse-jobs",
    name: "Staff Nurse",
    aliases: ["Staff Nurse", "Staff Nurse (Female)", "Staff Nurse (Male)"],
    sector: "Healthcare",
    description:
      "Staff Nurse positions are recruited by central and state government hospitals, AIIMS, ESIC, and defence establishments. Candidates must hold a B.Sc Nursing degree or a diploma in general nursing and midwifery (GNM) from a recognized institution and be registered with the State Nursing Council.",
  },
  {
    slug: "section-officer-jobs",
    name: "Section Officer",
    aliases: ["Section Officer"],
    sector: "Administration",
    description:
      "Section Officer posts are recruited by state public service commissions for gazetted positions in state government secretariats. The role involves supervising clerical staff and managing official files. Graduation is the minimum eligibility; selection is through a combined state service examination.",
  },
  {
    slug: "accountant-jobs",
    name: "Accountant",
    aliases: ["Accountant", "Junior Accountant", "Accountant / Junior Accountant"],
    sector: "Finance",
    description:
      "Accountant positions are available in central and state government departments, public sector undertakings, autonomous bodies, and local bodies. Candidates typically require a B.Com degree with knowledge of government accounting rules. Some posts require knowledge of Tally or government ERP systems.",
  },
  {
    slug: "field-assistant-jobs",
    name: "Field Assistant",
    aliases: ["Field Assistant", "Field Assistant (Agriculture)", "Field Assistant (Horticulture)"],
    sector: "Agriculture & Environment",
    description:
      "Field Assistant posts are recruited by state agriculture departments, ICAR institutes, and research stations. Duties involve field data collection, crop survey, and assisting scientists with trials. Candidates typically require a diploma or bachelor's degree in agriculture or a related applied science.",
  },
  {
    slug: "technical-assistant-jobs",
    name: "Technical Assistant",
    aliases: [
      "Technical Assistant",
      "Technical Assistant (Agriculture)",
      "Technical Assistant (Horticulture)",
      "Technical Assistant (Seed Technology)",
      "Technical Assistant (Food Science & Technology)",
      "Technical Assistant (Crop physiology)",
      "Technical Assistant (Plant Breeding and Genetics)",
      "Technical Assistant (Plant Pathology)",
      "Technical Assistant (Agronomy)",
      "Technical Assistant (Entomology)",
      "Technical Assistant (Agricultural Economics)",
    ],
    sector: "Agriculture & Environment",
    description:
      "Technical Assistant positions support scientific work in ICAR institutes, state agriculture universities, and research stations. Candidates require a B.Sc in the relevant discipline. Duties include lab analysis, field measurements, data recording, and maintaining scientific instruments.",
  },

  // ── Teaching & Education ─────────────────────────────────────────────────

  {
    slug: "primary-teacher-jobs",
    name: "Primary Teacher",
    aliases: [
      "Primary Teacher",
      "Primary Teacher General",
      "Primary Teacher (General)",
      "Primary Teacher General — TRE 4.0",
      "Primary Teacher General- TRE 4.0",
      "Primary Teacher (General) TRE 4.0",
      "Intermediate Trained Assistant Teacher (Para Category)",
      "Intermediate Trained Assistant Teacher",
      "ITAT (Para Category)",
    ],
    sector: "Teaching & Education",
    description:
      "Primary Teacher posts are recruited by state education departments and central government schools (Kendriya Vidyalaya, Navodaya Vidyalaya) for classes I–V. Eligibility requires 10+2 with at least 50% marks and a 2-year Diploma in Elementary Education (D.El.Ed), plus qualifying the Central Teacher Eligibility Test (CTET) or state TET. Bihar's Teacher Recruitment Examination (TRE) is a major state-level drive.",
  },
  {
    slug: "trained-graduate-teacher-jobs",
    name: "Trained Graduate Teacher",
    aliases: [
      "Trained Graduate Teacher",
      "TGT",
      "Graduate Trained Assistant Teacher",
      "Graduate Trained Assistant Teacher - Language",
      "Graduate Trained Assistant Teacher - Science",
      "Graduate Trained Assistant Teacher - Social Science",
      "Graduate Trained Assistant Teacher - Mathematics",
      "Graduate Trained Assistant Teacher (General)",
      "Graduate Trained Assistant Teacher General",
      "Graduate Trained Assistant Teacher General — TRE 4.0",
      "Graduate Trained Assistant Teacher- TRE 4.0",
      "Secondary Teacher",
      "Secondary Teacher (General)",
    ],
    sector: "Teaching & Education",
    description:
      "Trained Graduate Teacher (TGT) positions cover classes VI–X in government and central government schools. Candidates require a Bachelor's degree in the relevant subject with at least 50% marks plus a B.Ed from a recognized university, and must qualify CTET Paper-II or the state TET. TGT vacancies are among the highest-volume teacher recruitment drives in India.",
  },
  {
    slug: "post-graduate-teacher-jobs",
    name: "Post Graduate Teacher",
    aliases: [
      "Post Graduate Teacher",
      "PGT",
      "Senior Secondary Teacher",
      "Sr Sec Teacher",
      "Sr Secondary Teacher",
      "Sr Sec Teacher Chemistry",
      "Sr Sec Teacher Physics",
      "Sr Sec Teacher Mathematics",
      "Sr Sec Teacher Biology",
      "Sr Sec Teacher English",
      "Sr Sec Teacher Hindi",
      "Sr Sec Teacher History",
      "Sr Sec Teacher Geography",
      "Sr Sec Teacher Economics",
      "Sr Sec Teacher Political Science",
      "Sr Sec Teacher Commerce",
      "Sr Sec Teacher Computer Science",
      "Sr Sec Teacher — TRE 4.0",
      "Sr Sec Teacher Chemistry — TRE 4.0",
      "Sr Sec Teacher Physics — TRE 4.0",
      "Sr Sec Teacher Mathematics — TRE 4.0",
      "Sr Sec Teacher Biology — TRE 4.0",
      "Senior Secondary Teacher (General)",
    ],
    sector: "Teaching & Education",
    description:
      "Post Graduate Teacher (PGT) posts cover classes XI–XII in government higher secondary schools and central government schools. Candidates require a Master's degree in the relevant subject with at least 50% marks plus a B.Ed. Bihar's TRE 4.0 and DSSSB/KVS drives recruit PGT teachers across core science, humanities, and commerce streams.",
  },

  // ── Healthcare (expansion) ───────────────────────────────────────────────

  {
    slug: "nursing-superintendent-jobs",
    name: "Nursing Superintendent",
    aliases: [
      "Nursing Superintendent",
      "Nursing Superintendent Grade I",
      "Nursing Superintendent Grade II",
      "Chief Nursing Officer",
    ],
    sector: "Healthcare",
    description:
      "Nursing Superintendent posts are senior nursing leadership roles in central government hospitals, AIIMS, and defence medical establishments. Candidates require a B.Sc Nursing degree with several years of nursing experience in a supervisory role and registration with the State Nursing Council.",
  },
  {
    slug: "pharmacist-jobs",
    name: "Pharmacist",
    aliases: [
      "Pharmacist",
      "Pharmacist (Entry Grade)",
      "Pharmacist Grade II",
      "Pharmacist Grade I",
      "Pharmacist (Allopathy)",
      "Pharmacist (Ayurveda)",
    ],
    sector: "Healthcare",
    description:
      "Pharmacist posts are available in central and state government hospitals, CGHS, ESI dispensaries, and defence establishments. Candidates require a Diploma in Pharmacy (D.Pharm) or B.Pharm from a recognized institution and must be registered with the State Pharmacy Council.",
  },
  {
    slug: "laboratory-technician-jobs",
    name: "Laboratory Technician",
    aliases: [
      "Laboratory Technician",
      "Lab Technician",
      "Laboratory Technician (Medical)",
      "Laboratory Technician Grade I",
      "Laboratory Technician Grade II",
      "Laboratory Assistant",
      "Lab Assistant",
      "Junior Laboratory Assistant",
    ],
    sector: "Healthcare",
    description:
      "Laboratory Technician posts are recruited by government hospitals, medical colleges, AIIMS, and public health departments. Candidates require a Diploma or B.Sc in Medical Laboratory Technology (MLT) from a recognized institution. Duties include sample collection, analysis, and maintaining diagnostic equipment.",
  },

  // ── Science & Research (expansion) ──────────────────────────────────────

  {
    slug: "senior-research-fellow-jobs",
    name: "Senior Research Fellow",
    aliases: [
      "Senior Research Fellow",
      "Senior Research Fellow (SRF)",
      "Senior Research Fellow (SRF) (Economics)",
      "Senior Research Fellow (SRF)(Agronomy)",
      "SRF",
    ],
    sector: "Science & Research",
    description:
      "Senior Research Fellow (SRF) positions are offered by ICAR institutes, CSIR laboratories, DST-funded projects, and central universities. Candidates typically require a postgraduate degree with at least two years of research experience, or a NET/GATE qualification in the relevant discipline.",
  },

  // ── Railway & Transport ──────────────────────────────────────────────────

  {
    slug: "assistant-loco-pilot-jobs",
    name: "Assistant Loco Pilot",
    aliases: [
      "Assistant Loco Pilot",
      "ALP",
      "Assistant Loco Pilot (ALP)",
    ],
    sector: "Railway & Transport",
    description:
      "Assistant Loco Pilot (ALP) is a Group C post under Indian Railways recruited through the Railway Recruitment Board (RRB). Candidates require a 10th pass plus an ITI trade certificate or diploma in a relevant engineering discipline. ALP is one of the highest-volume railway recruitment drives, with lakhs of vacancies in each cycle.",
  },
  {
    slug: "railway-clerk-jobs",
    name: "Railway Clerk",
    aliases: [
      "Junior Clerk cum Typist",
      "Junior Clerk-cum-Typist",
      "Accounts Clerk cum Typist",
      "Accounts Clerk-cum-Typist",
      "Trains Clerk",
      "Commercial cum Ticket Clerk",
      "Commercial-cum-Ticket Clerk",
      "Senior Clerk",
      "Senior Clerk cum Typist",
      "Senior Time Keeper",
      "Office Clerk",
    ],
    sector: "Railway & Transport",
    description:
      "Railway Clerk posts (including Junior Clerk cum Typist, Accounts Clerk cum Typist, and Commercial cum Ticket Clerk) are Group D and Group C clerical posts under Indian Railways recruited through RRB and RRC. Candidates require 10+2 with basic typing skills. These posts cover station ticketing, accounts, and general administration.",
  },
  {
    slug: "goods-train-manager-jobs",
    name: "Goods Train Manager",
    aliases: [
      "Goods Train Manager",
      "GTM",
      "Goods Guard",
      "Senior Guard",
      "Assistant Guard",
    ],
    sector: "Railway & Transport",
    description:
      "Goods Train Manager (formerly Goods Guard) is a Group C operational post under Indian Railways responsible for the safe operation of goods trains. Candidates require a graduation degree. Recruitment is through RRB. The role involves brake van operation, train movement records, and coordination with loco pilots.",
  },
  {
    slug: "station-master-jobs",
    name: "Station Master",
    aliases: [
      "Station Master",
      "Assistant Station Master",
      "ASM",
      "Station Master (SM)",
      "Junior Station Master",
    ],
    sector: "Railway & Transport",
    description:
      "Station Master and Assistant Station Master posts are Group C posts under Indian Railways responsible for managing train operations at a station. Candidates require a graduation degree. Selection is through RRB Non-Technical Popular Categories (NTPC) examination.",
  },

  // ── Engineering ──────────────────────────────────────────────────────────

  {
    slug: "junior-engineer-jobs",
    name: "Junior Engineer",
    aliases: [
      "Junior Engineer",
      "Junior Engineer (JE)",
      "JE",
      "Junior Engineer (Civil)",
      "Junior Engineer (Electrical)",
      "Junior Engineer (Mechanical)",
      "Junior Engineer (Electronics)",
      "Junior Engineer (IT)",
      "Junior Engineer (Quality Control)",
      "Junior Engineer (Electrical / Mechanical)",
    ],
    sector: "Engineering",
    description:
      "Junior Engineer (JE) posts are recruited by SSC, Indian Railways (RRB), CPWD, state PWDs, and central PSUs. Candidates require a diploma or B.E/B.Tech in Civil, Electrical, Mechanical, or Electronics engineering. JE is one of the most-searched government engineering roles in India.",
  },

  // ── Police & Security ────────────────────────────────────────────────────

  {
    slug: "constable-jobs",
    name: "Constable",
    aliases: [
      "Constable",
      "Constable (GD)",
      "Constable GD",
      "Constable (General Duty)",
      "Constable (Technical)",
      "Constable (Tradesman)",
      "Head Constable",
      "Head Constable (Ministerial)",
      "Head Constable (Technical)",
      "Sub-Inspector",
      "Sub Inspector",
      "SI",
    ],
    sector: "Police & Security",
    description:
      "Constable (GD) posts are among the highest-volume central government recruitments, conducted by SSC for CISF, CRPF, BSF, SSB, ITBP, and AR. Candidates require 10th pass for Constable GD and 10+2 for Head Constable or Sub-Inspector. Physical fitness standards apply.",
  },

  // ── Administration (expansion) ───────────────────────────────────────────

  {
    slug: "stenographer-jobs",
    name: "Stenographer",
    aliases: [
      "Stenographer",
      "Stenographer Grade C",
      "Stenographer Grade D",
      "Stenographer (Grade C & D)",
      "Senior Stenographer",
      "Personal Assistant",
    ],
    sector: "Administration",
    description:
      "Stenographer posts are recruited by SSC and various state service commissions for central ministries, high courts, and PSUs. Candidates require 10+2 with a shorthand speed of 100 wpm (Grade C) or 80 wpm (Grade D) and a typing speed of 40 wpm in English or 55 wpm in Hindi. SSC Stenographer is a national-level annual examination.",
  },
  {
    slug: "multi-tasking-staff-jobs",
    name: "Multi Tasking Staff",
    aliases: [
      "Multi Tasking Staff",
      "MTS",
      "Multi-Tasking Staff",
      "Multi Tasking Staff (MTS)",
      "Group D",
    ],
    sector: "Administration",
    description:
      "Multi Tasking Staff (MTS) is a Group C non-gazetted, non-ministerial post in various central government departments, ministries, and PSUs, recruited through SSC. Candidates require a 10th pass certificate. Duties include general maintenance, delivery of files, and operational support.",
  },

  // ── Banking & Finance ────────────────────────────────────────────────────

  {
    slug: "bank-probationary-officer-jobs",
    name: "Bank Probationary Officer",
    aliases: [
      "Probationary Officer",
      "PO",
      "Bank PO",
      "Junior Management Grade Scale I",
      "JMGS I",
      "Probationary Officer (PO)",
    ],
    sector: "Banking & Finance",
    description:
      "Bank Probationary Officer (PO) is a flagship entry-level officer post in public sector banks recruited through IBPS PO and SBI PO examinations. Candidates require a graduation degree in any discipline. PO is one of the most competitive and sought-after government-sector roles among graduates.",
  },
  {
    slug: "bank-clerk-jobs",
    name: "Bank Clerk",
    aliases: [
      "Clerk",
      "Bank Clerk",
      "Clerk (Junior Associate)",
      "Junior Associate",
      "Clerical Cadre",
      "Office Assistant (Multipurpose)",
    ],
    sector: "Banking & Finance",
    description:
      "Bank Clerk (Junior Associate) posts are recruited by IBPS CRP Clerk and SBI Clerk examinations for public sector banks. Candidates require a graduation degree with proficiency in the official language of the state. Bank Clerk is one of the most-applied government examinations in India.",
  },
];

/** Look up a role definition by its slug. Returns undefined for unknown slugs. */
export function getRoleBySlug(slug: string): RoleDefinition | undefined {
  return ROLE_REGISTRY.find((r) => r.slug === slug);
}

/** Build the SQL ILIKE match list for all aliases of a role. */
export function roleAliases(role: RoleDefinition): string[] {
  // Deduplicate: include canonical name + all aliases.
  const all = new Set([role.name, ...role.aliases]);
  return Array.from(all);
}
