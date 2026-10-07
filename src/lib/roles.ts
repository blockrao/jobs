/**
 * Canonical role definitions for role-level entity pages (/roles/[slug]).
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
  | "Agriculture & Environment";

export interface RoleDefinition {
  slug: string;
  name: string;
  aliases: string[];
  sector: RoleSector;
  description: string;
}

export const ROLE_REGISTRY: RoleDefinition[] = [
  {
    slug: "junior-research-fellow",
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
    slug: "medical-officer",
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
    slug: "office-assistant",
    name: "Office Assistant",
    aliases: ["Office Assistant"],
    sector: "Administration",
    description:
      "Office Assistant positions are recruited across central ministries, autonomous bodies, and state government departments. Duties include file management, correspondence, and general administrative support. Eligibility is typically a graduation degree with basic computer proficiency.",
  },
  {
    slug: "data-entry-operator",
    name: "Data Entry Operator",
    aliases: ["Data Entry Operator", "DEO"],
    sector: "Administration",
    description:
      "Data Entry Operator (DEO) posts are available in central and state government offices, banks, and public sector undertakings. Candidates typically require 10+2 or graduation with a typing speed of 35 wpm (English) or 30 wpm (Hindi) on a computer.",
  },
  {
    slug: "research-associate",
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
    slug: "staff-nurse",
    name: "Staff Nurse",
    aliases: ["Staff Nurse", "Staff Nurse (Female)", "Staff Nurse (Male)"],
    sector: "Healthcare",
    description:
      "Staff Nurse positions are recruited by central and state government hospitals, AIIMS, ESIC, and defence establishments. Candidates must hold a B.Sc Nursing degree or a diploma in general nursing and midwifery (GNM) from a recognized institution and be registered with the State Nursing Council.",
  },
  {
    slug: "section-officer",
    name: "Section Officer",
    aliases: ["Section Officer"],
    sector: "Administration",
    description:
      "Section Officer posts are recruited by state public service commissions for gazetted positions in state government secretariats. The role involves supervising clerical staff and managing official files. Graduation is the minimum eligibility; selection is through a combined state service examination.",
  },
  {
    slug: "accountant",
    name: "Accountant",
    aliases: ["Accountant", "Junior Accountant", "Accountant / Junior Accountant"],
    sector: "Finance",
    description:
      "Accountant positions are available in central and state government departments, public sector undertakings, autonomous bodies, and local bodies. Candidates typically require a B.Com degree with knowledge of government accounting rules. Some posts require knowledge of Tally or government ERP systems.",
  },
  {
    slug: "field-assistant",
    name: "Field Assistant",
    aliases: ["Field Assistant", "Field Assistant (Agriculture)", "Field Assistant (Horticulture)"],
    sector: "Agriculture & Environment",
    description:
      "Field Assistant posts are recruited by state agriculture departments, ICAR institutes, and research stations. Duties involve field data collection, crop survey, and assisting scientists with trials. Candidates typically require a diploma or bachelor's degree in agriculture or a related applied science.",
  },
  {
    slug: "technical-assistant",
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
