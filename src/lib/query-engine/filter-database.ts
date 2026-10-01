/**
 * Filter Database: Exams, States, Qualifications
 *
 * Stores canonical names + aliases in English & Hindi
 * Used for rule-based filter extraction (~90% of queries)
 */

interface FilterEntity {
  canonical: string; // English canonical form (e.g., "SSC")
  aliases: string[]; // All known variations (Hindi + Hinglish + English)
  category: "exam" | "state" | "qualification" | "organization";
  hindi?: string; // Hindi name if exists
  searchable: string[]; // All searchable variations lowercase
}

// Exams: Government recruitment boards & exams
export const EXAMS: Record<string, FilterEntity> = {
  SSC: {
    canonical: "SSC",
    aliases: [
      "SSC",
      "ssc",
      "Staff Selection Commission",
      "staff selection commission",
      "ssc exam",
      "ssc jobs",
      "ssc form",
      "ssc notification",
      // Hindi/Hinglish
      "एसएससी",
      "ssc_hindi",
      "karmchari chayan ayog",
      "karmi chayan commission",
    ],
    category: "exam",
    hindi: "कर्मचारी चयन आयोग",
    searchable: [
      "ssc",
      "staff selection commission",
      "कर्मचारी चयन आयोग",
      "एसएससी",
      "karmchari chayan ayog",
      "karmi chayan commission",
    ],
  },
  UPSC: {
    canonical: "UPSC",
    aliases: [
      "UPSC",
      "upsc",
      "Union Public Service Commission",
      "union public service commission",
      "upsc exam",
      "upsc ias",
      "ias",
      "ips",
      "civil services",
      "civil service",
      "csat",
      "prelims",
      "mains",
      // Hindi/Hinglish
      "यूपीएससी",
      "upsc_hindi",
      "sangh lok seva ayog",
      "संघ लोक सेवा आयोग",
      "ias exam",
      "ips exam",
      "pcs",
      "psc",
    ],
    category: "exam",
    hindi: "संघ लोक सेवा आयोग",
    searchable: [
      "upsc",
      "union public service commission",
      "संघ लोक सेवा आयोग",
      "यूपीएससी",
      "sangh lok seva ayog",
      "ias",
      "ips",
      "civil services",
      "pcs",
      "psc",
    ],
  },
  IBPS: {
    canonical: "IBPS",
    aliases: [
      "IBPS",
      "ibps",
      "Institute of Banking Personnel Selection",
      "institute of banking personnel selection",
      "ibps po",
      "ibps clerk",
      "ibps so",
      "ibps rrb",
      "banking",
      "bank exam",
      // Hindi/Hinglish
      "आईबीपीएस",
      "ibps_hindi",
      "banking exam",
    ],
    category: "exam",
    hindi: "बैंकिंग कार्मिक चयन संस्थान",
    searchable: [
      "ibps",
      "institute of banking personnel selection",
      "banking exam",
    ],
  },
  "Railway NTPC": {
    canonical: "Railway NTPC",
    aliases: [
      "railway ntpc",
      "railway",
      "rrb",
      "ntpc",
      "railway recruitment board",
      "railway jobs",
      "rail exam",
      "railway exam",
      // Hindi/Hinglish
      "रेलवे एनटीपीसी",
      "railway ntpc_hindi",
      "rail bharti",
    ],
    category: "exam",
    hindi: "रेलवे एनटीपीसी",
    searchable: ["railway ntpc", "rrb", "rail exam"],
  },
  "State PSC": {
    canonical: "State PSC",
    aliases: [
      "state psc",
      "psc",
      "public service commission",
      "state exam",
      "state recruitment",
      // Hindi/Hinglish
      "राज्य पीएससी",
      "state psc_hindi",
      "lok seva ayog",
      "राज्य लोक सेवा आयोग",
    ],
    category: "exam",
    hindi: "राज्य लोक सेवा आयोग",
    searchable: ["state psc", "public service commission"],
  },
};

// Indian States
export const STATES: Record<string, FilterEntity> = {
  Delhi: {
    canonical: "Delhi",
    aliases: ["delhi", "delhis", "ncr", "national capital region", "दिल्ली"],
    category: "state",
    hindi: "दिल्ली",
    searchable: ["delhi", "ncr", "दिल्ली"],
  },
  "Uttar Pradesh": {
    canonical: "Uttar Pradesh",
    aliases: ["uttar pradesh", "up", "u.p", "up jobs", "उत्तर प्रदेश"],
    category: "state",
    hindi: "उत्तर प्रदेश",
    searchable: ["uttar pradesh", "up", "उत्तर प्रदेश"],
  },
  Maharashtra: {
    canonical: "Maharashtra",
    aliases: ["maharashtra", "maha"],
    category: "state",
    hindi: "महाराष्ट्र",
    searchable: ["maharashtra"],
  },
  "Tamil Nadu": {
    canonical: "Tamil Nadu",
    aliases: ["tamil nadu", "tn", "tamilnadu"],
    category: "state",
    hindi: "तमिल नाडु",
    searchable: ["tamil nadu", "tn"],
  },
  Karnataka: {
    canonical: "Karnataka",
    aliases: ["karnataka", "bengaluru", "bangalore"],
    category: "state",
    hindi: "कर्नाटक",
    searchable: ["karnataka"],
  },
  Rajasthan: {
    canonical: "Rajasthan",
    aliases: ["rajasthan", "raj"],
    category: "state",
    hindi: "राजस्थान",
    searchable: ["rajasthan"],
  },
  Gujarat: {
    canonical: "Gujarat",
    aliases: ["gujarat", "guj"],
    category: "state",
    hindi: "गुजरात",
    searchable: ["gujarat"],
  },
  "West Bengal": {
    canonical: "West Bengal",
    aliases: ["west bengal", "wb", "bengal"],
    category: "state",
    hindi: "पश्चिम बंगाल",
    searchable: ["west bengal"],
  },
};

// Educational Qualifications
export const QUALIFICATIONS: Record<string, FilterEntity> = {
  "10th Pass": {
    canonical: "10th Pass",
    aliases: [
      "10th",
      "tenth",
      "class 10",
      "matric",
      "sslc",
      "board pass",
      // Hindi
      "10वीं पास",
      "दसवीं",
      "मैट्रिक",
    ],
    category: "qualification",
    hindi: "10वीं पास",
    searchable: ["10th", "tenth", "matric"],
  },
  "12th Pass": {
    canonical: "12th Pass",
    aliases: [
      "12th",
      "twelth",
      "class 12",
      "intermediate",
      "intermediate pass",
      "hsc",
      "higher secondary",
      // Hindi
      "12वीं पास",
      "बारहवीं",
      "इंटरमीडिएट",
    ],
    category: "qualification",
    hindi: "12वीं पास",
    searchable: ["12th", "twelth", "intermediate"],
  },
  "Diploma": {
    canonical: "Diploma",
    aliases: [
      "diploma",
      "polytechnic",
      "engineering diploma",
      "diploma holder",
      // Hindi
      "डिप्लोमा",
    ],
    category: "qualification",
    hindi: "डिप्लोमा",
    searchable: ["diploma", "polytechnic"],
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
      "undergraduate",
      "graduation",
      "graduate",
      // Hindi
      "स्नातक",
      "बैचलर्स",
      "डिग्री",
    ],
    category: "qualification",
    hindi: "स्नातक",
    searchable: ["bachelors", "degree", "graduation", "स्नातक"],
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
      "post-graduation",
      // Hindi
      "स्नातकोत्तर",
      "मास्टर्स",
      "एमबीए",
    ],
    category: "qualification",
    hindi: "स्नातकोत्तर",
    searchable: ["masters", "postgraduate", "स्नातकोत्तर"],
  },
};

/**
 * Search filter entities by partial match
 * Used for rule-based extraction
 */
export function searchFilters(
  text: string,
  category?: "exam" | "state" | "qualification"
): FilterEntity[] {
  const textLower = text.toLowerCase();
  const results: FilterEntity[] = [];
  const seen = new Set<string>();

  const databases = [
    { data: EXAMS, cat: "exam" as const },
    { data: STATES, cat: "state" as const },
    { data: QUALIFICATIONS, cat: "qualification" as const },
  ].filter((db) => !category || db.cat === category);

  for (const db of databases) {
    for (const entity of Object.values(db.data)) {
      // Check each searchable variation
      for (const searchable of entity.searchable) {
        if (textLower.includes(searchable) && !seen.has(entity.canonical)) {
          results.push(entity);
          seen.add(entity.canonical);
          break;
        }
      }
    }
  }

  return results;
}

/**
 * Get all canonical values for a category
 */
export function getCanonicalValues(category: "exam" | "state" | "qualification"): string[] {
  const databases: Record<string, Record<string, FilterEntity>> = {
    exam: EXAMS,
    state: STATES,
    qualification: QUALIFICATIONS,
  };

  return Object.values(databases[category]).map((e) => e.canonical);
}

/**
 * Build searchable index for fast lookups
 */
export interface FilterIndex {
  examsByName: Map<string, FilterEntity>;
  statesByName: Map<string, FilterEntity>;
  qualificationsByName: Map<string, FilterEntity>;
}

export function buildFilterIndex(): FilterIndex {
  const index: FilterIndex = {
    examsByName: new Map(),
    statesByName: new Map(),
    qualificationsByName: new Map(),
  };

  for (const entity of Object.values(EXAMS)) {
    for (const searchable of entity.searchable) {
      index.examsByName.set(searchable, entity);
    }
  }

  for (const entity of Object.values(STATES)) {
    for (const searchable of entity.searchable) {
      index.statesByName.set(searchable, entity);
    }
  }

  for (const entity of Object.values(QUALIFICATIONS)) {
    for (const searchable of entity.searchable) {
      index.qualificationsByName.set(searchable, entity);
    }
  }

  return index;
}
