/**
 * The ONE public category taxonomy for JobOye.
 *
 * Why this file exists (2026-10-14): the site had three unrelated "category"
 * vocabularies and none of them was fed by the ingest pipeline —
 *   1. hand-typed homepage tile slugs (`/categories/upsc`, `/ssc`, `/railway`…)
 *      that never existed anywhere → hard 404 from primary navigation;
 *   2. the `categories` table (`banking-jobs`, `ssc-jobs`…), populated only by
 *      `src/db/seed.ts`; no production write path touches `posting_categories`,
 *      so those hubs listed 0–25 legacy postings and linked to legacy URLs;
 *   3. footer links to `/jobs?sector=…`, a query param `/jobs` never read, so six
 *      URLs served the same unfiltered page.
 *
 * The only sector dimension that is set at write time on every record is
 * `organizations.sector` (org_sector enum). Every public category surface —
 * homepage tiles, /categories index, /categories/[slug] hubs, footer links,
 * sitemap, redirects — now derives from this single config, and the hub pages
 * list canonical Posts (`/jobs/{recruitment}/{post}`) resolved through
 * posts → recruitments → organizations.sector.
 *
 * Adding a category = adding an entry here. Nothing else to touch.
 */

import type { orgSectorEnum } from "@/db/schema";

export type OrgSector = (typeof orgSectorEnum.enumValues)[number];

export interface SectorDef {
  /** Public URL slug: /categories/{slug}. Stable; never rename, add an alias instead. */
  slug: string;
  /** org_sector enum values this hub aggregates. */
  sectors: readonly OrgSector[];
  label: string;
  labelHi: string;
  /** Short SEO description for <meta description> and the hub intro. */
  description: string;
  descriptionHi: string;
  emoji: string;
  /**
   * Former slugs that must 301 here: old `categories` table slugs, old
   * `/jobs?sector=` values, and the homepage tile slugs that never resolved.
   */
  aliases: readonly string[];
  /** Show on the homepage "Browse by category" grid. */
  featured: boolean;
}

export const SECTORS: readonly SectorDef[] = [
  {
    slug: "central-government",
    sectors: ["GOVERNMENT_CENTRAL"],
    label: "Central Govt",
    labelHi: "केंद्र सरकार",
    description:
      "Live central government job notifications — UPSC, SSC, ministries, departments and autonomous bodies of the Government of India.",
    descriptionHi:
      "केंद्र सरकार की नवीनतम भर्तियां — UPSC, SSC, मंत्रालय, विभाग और भारत सरकार के स्वायत्त निकाय।",
    emoji: "🏛️",
    aliases: ["central-government-jobs", "central", "upsc", "ssc", "ssc-jobs", "upsc-jobs"],
    featured: true,
  },
  {
    slug: "state-government",
    sectors: ["GOVERNMENT_STATE"],
    label: "State Govt",
    labelHi: "राज्य सरकार",
    description:
      "State government recruitments — State PSCs, subordinate service boards, state police and departmental vacancies across India.",
    descriptionHi:
      "राज्य सरकार की भर्तियां — राज्य PSC, अधीनस्थ सेवा बोर्ड, राज्य पुलिस और विभागीय रिक्तियां।",
    emoji: "⚖️",
    aliases: ["state-government-jobs", "state", "state-psc", "psc", "police"],
    featured: true,
  },
  {
    slug: "railway",
    sectors: ["RAILWAY"],
    label: "Railway",
    labelHi: "रेलवे",
    description:
      "Indian Railways jobs — RRB, RRC, zonal railways and railway PSUs. Vacancies, eligibility, last dates and official apply links.",
    descriptionHi:
      "भारतीय रेलवे की नौकरियां — RRB, RRC, ज़ोनल रेलवे और रेलवे PSU। रिक्तियां, पात्रता, अंतिम तिथि और आधिकारिक लिंक।",
    emoji: "🚆",
    aliases: ["railway-jobs", "railways", "rrb"],
    featured: true,
  },
  {
    slug: "banking",
    sectors: ["BANKING"],
    label: "Banking",
    labelHi: "बैंकिंग",
    description:
      "Bank jobs — SBI, RBI, IBPS, public-sector and cooperative banks, NABARD, SIDBI and other financial institutions.",
    descriptionHi:
      "बैंक नौकरियां — SBI, RBI, IBPS, सार्वजनिक क्षेत्र और सहकारी बैंक, NABARD, SIDBI और अन्य वित्तीय संस्थान।",
    emoji: "🏦",
    aliases: ["banking-jobs", "bank", "banks", "finance"],
    featured: true,
  },
  {
    slug: "defence",
    sectors: ["DEFENCE"],
    label: "Defence",
    labelHi: "रक्षा",
    description:
      "Defence and paramilitary jobs — Indian Army, Navy, Air Force, CAPFs (BSF, CRPF, ITBP, CISF), DRDO and defence establishments.",
    descriptionHi:
      "रक्षा और अर्धसैनिक नौकरियां — थलसेना, नौसेना, वायुसेना, CAPF (BSF, CRPF, ITBP, CISF), DRDO और रक्षा प्रतिष्ठान।",
    emoji: "🪖",
    aliases: ["defence-jobs", "defense", "army", "paramilitary"],
    featured: true,
  },
  {
    slug: "psu",
    sectors: ["PSU"],
    label: "PSU",
    labelHi: "PSU",
    description:
      "Public sector undertaking jobs — Maharatna, Navratna and Miniratna companies, state PSUs and government corporations.",
    descriptionHi:
      "सार्वजनिक उपक्रम (PSU) की नौकरियां — महारत्न, नवरत्न और मिनीरत्न कंपनियां, राज्य PSU और सरकारी निगम।",
    emoji: "🏭",
    aliases: ["psu-jobs"],
    featured: true,
  },
] as const;

const BY_SLUG = new Map(SECTORS.map((s) => [s.slug, s]));
const BY_ALIAS = new Map<string, SectorDef>();
for (const s of SECTORS) for (const a of s.aliases) BY_ALIAS.set(a, s);

export function getSector(slug: string): SectorDef | undefined {
  return BY_SLUG.get(slug);
}

/** Resolve a legacy slug/alias to its canonical sector, or undefined. */
export function getSectorByAlias(slug: string): SectorDef | undefined {
  return BY_ALIAS.get(slug.toLowerCase());
}

/**
 * Former tile/footer slugs with no sector of their own ("teaching", "health").
 * They were linked from the homepage and footer, so crawlers hold them; send
 * them to the index rather than a 404.
 */
export const LEGACY_SLUGS_TO_INDEX: ReadonlySet<string> = new Set(["teaching", "health", "education", "medical"]);

export function sectorHref(s: SectorDef): string {
  return `/categories/${s.slug}`;
}

export const FEATURED_SECTORS = SECTORS.filter((s) => s.featured);

/**
 * Organization hubs promoted alongside the sector tiles on the homepage.
 * These are the two bodies users search for by name; their pages already
 * exist and resolve. Kept here so the homepage grid has one source.
 *
 * Phase 2A: Pillar pages (/exams/[slug]) are now the canonical org hubs.
 * All /organizations/[slug] links redirect to /exams/[slug].
 */
export const FEATURED_ORG_TILES = [
  { label: "UPSC", labelHi: "UPSC", href: "/exams/union-public-service-commission", emoji: "🎓" },
  { label: "SSC", labelHi: "SSC", href: "/exams/staff-selection-commission", emoji: "📋" },
] as const;
