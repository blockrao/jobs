/**
 * JobOye Knowledge Graph: Canonical Reference
 *
 * This is the AUTHORITY for entity validation
 * Every extracted constraint is validated against this graph
 *
 * NOT built from LLM outputs
 * Built from JobOye's actual job postings + master data
 */

export interface KnowledgeGraphEntry {
  canonical: string;
  aliases: string[];
  category: string;
  metadata?: Record<string, unknown>;
}

export interface KnowledgeGraph {
  exams: Record<string, KnowledgeGraphEntry>;
  locations: Record<string, KnowledgeGraphEntry>;
  qualifications: Record<string, KnowledgeGraphEntry>;
  organizations: Record<string, KnowledgeGraphEntry>;
  sectors: Record<string, KnowledgeGraphEntry>;
  jobTypes: Record<string, KnowledgeGraphEntry>;
}

/**
 * Build knowledge graph from canonical sources
 * In production, this would be loaded from database/cache
 */
export function buildKnowledgeGraph(): KnowledgeGraph {
  return {
    exams: {
      SSC: {
        canonical: "SSC",
        aliases: [
          "ssc",
          "staff selection commission",
          "कर्मचारी चयन आयोग",
          "ssc exam",
        ],
        category: "recruitment_board",
      },
      UPSC: {
        canonical: "UPSC",
        aliases: [
          "upsc",
          "union public service commission",
          "संघ लोक सेवा आयोग",
          "ias",
          "ips",
          "pcs",
        ],
        category: "recruitment_board",
      },
      IBPS: {
        canonical: "IBPS",
        aliases: [
          "ibps",
          "institute of banking personnel selection",
          "banking",
          "bank exam",
        ],
        category: "recruitment_board",
      },
      "Railway NTPC": {
        canonical: "Railway NTPC",
        aliases: [
          "railway ntpc",
          "rrb",
          "railway",
          "rail exam",
          "रेलवे एनटीपीसी",
        ],
        category: "recruitment_board",
      },
      "State PSC": {
        canonical: "State PSC",
        aliases: [
          "state psc",
          "psc",
          "public service commission",
          "state exam",
          "राज्य पीएससी",
        ],
        category: "recruitment_board",
      },
    },

    locations: {
      Delhi: {
        canonical: "Delhi",
        aliases: ["delhi", "ncr", "national capital region", "दिल्ली"],
        category: "state",
      },
      "Uttar Pradesh": {
        canonical: "Uttar Pradesh",
        aliases: ["uttar pradesh", "up", "u.p", "उत्तर प्रदेश"],
        category: "state",
      },
      Maharashtra: {
        canonical: "Maharashtra",
        aliases: ["maharashtra", "मुंबई", "महाराष्ट्र"],
        category: "state",
      },
      "Tamil Nadu": {
        canonical: "Tamil Nadu",
        aliases: ["tamil nadu", "tn", "तमिल नाडु"],
        category: "state",
      },
      Karnataka: {
        canonical: "Karnataka",
        aliases: ["karnataka", "bengaluru", "bangalore", "कर्नाटक"],
        category: "state",
      },
      Haryana: {
        canonical: "Haryana",
        aliases: ["haryana", "हरियाणा"],
        category: "state",
      },
      Rajasthan: {
        canonical: "Rajasthan",
        aliases: ["rajasthan", "राजस्थान"],
        category: "state",
      },
      Gujarat: {
        canonical: "Gujarat",
        aliases: ["gujarat", "गुजरात"],
        category: "state",
      },
      "West Bengal": {
        canonical: "West Bengal",
        aliases: ["west bengal", "wb", "बंगाल"],
        category: "state",
      },
      Punjab: {
        canonical: "Punjab",
        aliases: ["punjab", "पंजाब"],
        category: "state",
      },
    },

    qualifications: {
      "10th Pass": {
        canonical: "10th Pass",
        aliases: [
          "10th",
          "tenth",
          "class 10",
          "matric",
          "10वीं पास",
          "दसवीं",
        ],
        category: "education",
      },
      "12th Pass": {
        canonical: "12th Pass",
        aliases: [
          "12th",
          "twelth",
          "class 12",
          "intermediate",
          "hsc",
          "12वीं पास",
          "बारहवीं",
        ],
        category: "education",
      },
      Diploma: {
        canonical: "Diploma",
        aliases: ["diploma", "polytechnic", "डिप्लोमा"],
        category: "education",
      },
      "Bachelor's Degree": {
        canonical: "Bachelor's Degree",
        aliases: [
          "bachelors",
          "bachelor",
          "b.a",
          "ba",
          "b.com",
          "b.sc",
          "btech",
          "bca",
          "degree",
          "graduation",
          "स्नातक",
        ],
        category: "education",
      },
      "Master's Degree": {
        canonical: "Master's Degree",
        aliases: [
          "masters",
          "master",
          "m.a",
          "ma",
          "m.com",
          "m.sc",
          "mtech",
          "mba",
          "postgraduate",
          "pg",
          "स्नातकोत्तर",
        ],
        category: "education",
      },
    },

    sectors: {
      Government: {
        canonical: "Government",
        aliases: ["government", "govt", "सरकार"],
        category: "sector",
      },
      PSU: {
        canonical: "PSU",
        aliases: ["psu", "public sector undertaking"],
        category: "sector",
      },
    },

    jobTypes: {
      "Field Officer": {
        canonical: "Field Officer",
        aliases: ["field officer", "fo", "फील्ड ऑफिसर"],
        category: "job_type",
      },
      Clerk: {
        canonical: "Clerk",
        aliases: ["clerk", "क्लर्क"],
        category: "job_type",
      },
      Manager: {
        canonical: "Manager",
        aliases: ["manager", "प्रबंधक"],
        category: "job_type",
      },
      Officer: {
        canonical: "Officer",
        aliases: ["officer", "अधिकारी"],
        category: "job_type",
      },
    },

    organizations: {
      // Government ministries/departments
      "Ministry of Finance": {
        canonical: "Ministry of Finance",
        aliases: ["finance ministry", "वित्त मंत्रालय"],
        category: "organization",
      },
      "Ministry of Defence": {
        canonical: "Ministry of Defence",
        aliases: ["defence ministry", "defense ministry", "रक्षा मंत्रालय"],
        category: "organization",
      },
    },
  };
}

/**
 * Get all valid values for a constraint type
 */
export function getValidValues(
  graph: KnowledgeGraph,
  constraintType: string
): string[] {
  const categoryMap: Record<string, keyof KnowledgeGraph> = {
    exams: "exams",
    location: "locations",
    qualification: "qualifications",
    sector: "sectors",
    job_type: "jobTypes",
    organization: "organizations",
  };

  const category = categoryMap[constraintType];
  if (!category) return [];

  return Object.keys(graph[category]);
}

/**
 * Resolve alias to canonical form
 * Returns null if not found in graph
 */
export function resolveToCanonical(
  value: string,
  graph: KnowledgeGraph,
  constraintType: string
): string | null {
  const categoryMap: Record<string, keyof KnowledgeGraph> = {
    exams: "exams",
    location: "locations",
    qualification: "qualifications",
    sector: "sectors",
    job_type: "jobTypes",
    organization: "organizations",
  };

  const category = categoryMap[constraintType];
  if (!category) return null;

  const categoryData = graph[category];
  const lowerValue = value.toLowerCase();

  for (const [canonical, entry] of Object.entries(categoryData)) {
    // Check if value matches canonical or any alias
    if (
      canonical.toLowerCase() === lowerValue ||
      entry.aliases.some((alias) => alias.toLowerCase() === lowerValue)
    ) {
      return canonical;
    }
  }

  return null; // Not found in graph
}

/**
 * Batch resolve aliases to canonical forms
 */
export function resolveBatchToCanonical(
  values: string[],
  graph: KnowledgeGraph,
  constraintType: string
): { resolved: string[]; unresolved: string[] } {
  const resolved: string[] = [];
  const unresolved: string[] = [];

  for (const value of values) {
    const canonical = resolveToCanonical(value, graph, constraintType);
    if (canonical) {
      resolved.push(canonical);
    } else {
      unresolved.push(value);
    }
  }

  return { resolved: [...new Set(resolved)], unresolved }; // Deduplicate resolved
}

/**
 * Get entry details from knowledge graph
 */
export function getGraphEntry(
  value: string,
  graph: KnowledgeGraph,
  constraintType: string
): KnowledgeGraphEntry | null {
  const canonical = resolveToCanonical(value, graph, constraintType);
  if (!canonical) return null;

  const categoryMap: Record<string, keyof KnowledgeGraph> = {
    exams: "exams",
    location: "locations",
    qualification: "qualifications",
    sector: "sectors",
    job_type: "jobTypes",
    organization: "organizations",
  };

  const category = categoryMap[constraintType];
  if (!category) return null;

  return graph[category][canonical] || null;
}
