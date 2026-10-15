/**
 * Phase 2 Qualification Parser
 * Extracts structured education, experience, and skill requirements from qualification text
 * Used to populate JobPosting.educationRequirements and experienceRequirements
 */

export interface ParsedEducation {
  level: "High School" | "Associate's" | "Bachelor's" | "Master's" | "Doctorate" | "Other";
  field?: string;
  credentialCategory?: string; // schema.org: "Bachelors", "Masters", "Doctorate", etc.
}

export interface ParsedExperience {
  years: number;
  field?: string;
  details?: string;
}

export interface ParsedQualification {
  educations: ParsedEducation[];
  experience?: ParsedExperience;
  skills: string[];
  rawText: string;
}

const EDUCATION_PATTERNS = {
  doctorate: /phd|doctorate|doctor of philosophy|d\.phil/i,
  masters: /m\.?(tech|sc|a|ba|ca|com|ed)|master's?|m\.?s\.|m\.?a\.|postgraduate|pg|advanced diploma/i,
  bachelors: /b\.?(tech|e|sc|a|ba|ca|com|ed)|bachelor's?|b\.s\.|b\.a\.|undergraduate/i,
  associates: /associate's?|a\.s\.|diploma|intermediate/i,
  highSchool: /high school|h\.s\.|12th|12 pass|secondary|plus two|\+2|hsc|intermediate|pre-degree/i,
};

const DEGREE_FIELDS = [
  "Computer Science",
  "Engineering",
  "Information Technology",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Commerce",
  "Accounting",
  "Finance",
  "Economics",
  "Business Administration",
  "Management",
  "Law",
  "Arts",
  "Humanities",
  "Social Sciences",
  "Psychology",
  "Public Administration",
  "Statistics",
  "Mechanical Engineering",
  "Civil Engineering",
  "Electrical Engineering",
  "Electronics Engineering",
];

const SKILL_PATTERNS = {
  languages: /fluency in|proficiency in|knowledge of|expertise in|proficient with|skilled in|experience with/i,
  programming: /python|java|c\+\+|javascript|typescript|nodejs|react|angular|vue|golang|rust|kotlin|swift/i,
  databases: /sql|mysql|postgresql|mongodb|redis|cassandra|elasticsearch/i,
  cloud: /aws|azure|gcp|cloud|kubernetes|docker|devops/i,
  office: /excel|word|powerpoint|outlook|spreadsheet|word processing/i,
};

/**
 * Parse qualification text and extract structured education/experience
 */
export function parseQualification(text: string): ParsedQualification {
  if (!text || typeof text !== "string") {
    return {
      educations: [],
      skills: [],
      rawText: "",
    };
  }

  const educations = parseEducation(text);
  const experience = parseExperience(text);
  const skills = parseSkills(text);

  return {
    educations,
    experience,
    skills,
    rawText: text,
  };
}

/**
 * Extract education requirements from text
 * Returns array of education qualifications found
 */
function parseEducation(text: string): ParsedEducation[] {
  const educations: ParsedEducation[] = [];
  const seen = new Set<string>();

  // Check each education level in order of specificity
  if (EDUCATION_PATTERNS.doctorate.test(text)) {
    const edu: ParsedEducation = {
      level: "Doctorate",
      credentialCategory: "Doctorate",
      field: extractDegreeField(text),
    };
    const key = `${edu.level}:${edu.field}`;
    if (!seen.has(key)) {
      educations.push(edu);
      seen.add(key);
    }
  }

  if (EDUCATION_PATTERNS.masters.test(text)) {
    const edu: ParsedEducation = {
      level: "Master's",
      credentialCategory: "Masters",
      field: extractDegreeField(text),
    };
    const key = `${edu.level}:${edu.field}`;
    if (!seen.has(key)) {
      educations.push(edu);
      seen.add(key);
    }
  }

  if (EDUCATION_PATTERNS.bachelors.test(text)) {
    const edu: ParsedEducation = {
      level: "Bachelor's",
      credentialCategory: "Bachelors",
      field: extractDegreeField(text),
    };
    const key = `${edu.level}:${edu.field}`;
    if (!seen.has(key)) {
      educations.push(edu);
      seen.add(key);
    }
  }

  if (EDUCATION_PATTERNS.associates.test(text)) {
    const edu: ParsedEducation = {
      level: "Associate's",
      credentialCategory: "Associate",
      field: extractDegreeField(text),
    };
    const key = `${edu.level}:${edu.field}`;
    if (!seen.has(key)) {
      educations.push(edu);
      seen.add(key);
    }
  }

  if (EDUCATION_PATTERNS.highSchool.test(text)) {
    const edu: ParsedEducation = {
      level: "High School",
      credentialCategory: "HighSchool",
    };
    const key = `${edu.level}`;
    if (!seen.has(key)) {
      educations.push(edu);
      seen.add(key);
    }
  }

  return educations;
}

/**
 * Extract years of experience requirement from text
 * Looks for patterns like "5+ years", "5 years of experience", etc.
 */
function parseExperience(text: string): ParsedExperience | undefined {
  // Match patterns like "5+", "5-10", "5 years"
  const yearMatch = text.match(/(\d+)[\s\-\+]*(?:to\s+)?(\d+)?[\s]*(?:years|yrs?)/i);

  if (yearMatch) {
    const minYears = parseInt(yearMatch[1], 10);
    const maxYears = yearMatch[2] ? parseInt(yearMatch[2], 10) : undefined;
    const years = maxYears ? Math.round((minYears + maxYears) / 2) : minYears;

    // Try to extract the field (e.g., "5+ years of software development")
    const fieldMatch = text.match(
      /(\d+)[\s\-\+]*(?:to\s+)?(?:\d+)?[\s]*(?:years|yrs?)[\s]+(?:of[\s]+)?([a-zA-Z\s]+?)(?:experience|exp|\.|,|\?|$)/i,
    );
    const field = fieldMatch ? fieldMatch[2].trim() : undefined;

    return {
      years,
      field,
      details: `${minYears}${maxYears ? `–${maxYears}` : "+"} years of experience${field ? ` in ${field}` : ""}`,
    };
  }

  return undefined;
}

/**
 * Extract skills and technical requirements from text
 */
function parseSkills(text: string): string[] {
  const skills = new Set<string>();

  // Extract programming languages
  const progMatch = text.match(SKILL_PATTERNS.programming);
  if (progMatch) {
    const langs = text.match(
      /(?:programming|knowledge|expertise|proficiency).*?(python|java|c\+\+|javascript|typescript|nodejs|react|angular|vue|golang|rust|kotlin|swift)/gi,
    );
    if (langs) {
      langs.forEach((lang) => {
        const match = lang.match(/(python|java|c\+\+|javascript|typescript|nodejs|react|angular|vue|golang|rust|kotlin|swift)/i);
        if (match) skills.add(match[1]);
      });
    }
  }

  // Extract database skills
  const dbMatch = text.match(/(sql|mysql|postgresql|mongodb|redis|cassandra|elasticsearch)/gi);
  if (dbMatch) {
    dbMatch.forEach((db) => skills.add(db.toUpperCase()));
  }

  // Extract cloud skills
  const cloudMatch = text.match(/(aws|azure|gcp|kubernetes|docker)/gi);
  if (cloudMatch) {
    cloudMatch.forEach((cloud) => skills.add(cloud.toUpperCase()));
  }

  // Extract office skills
  const officeMatch = text.match(/(excel|word|powerpoint)/gi);
  if (officeMatch) {
    officeMatch.forEach((office) => skills.add(office.charAt(0).toUpperCase() + office.slice(1).toLowerCase()));
  }

  return Array.from(skills);
}

/**
 * Try to extract the degree field (e.g., "Computer Science", "Engineering")
 * from qualification text
 */
function extractDegreeField(text: string): string | undefined {
  for (const field of DEGREE_FIELDS) {
    if (new RegExp(`\\b${field}\\b`, "i").test(text)) {
      return field;
    }
  }

  // Fallback: look for "in [field]" pattern
  const fieldMatch = text.match(/(?:degree\s+)?(?:in|of)\s+([a-zA-Z\s]+?)(?:with|or|,|\.|$)/i);
  if (fieldMatch) {
    const extracted = fieldMatch[1].trim().split(/\s+/)[0];
    return extracted.charAt(0).toUpperCase() + extracted.slice(1).toLowerCase();
  }

  return undefined;
}

/**
 * Convert ParsedEducation to schema.org EducationalOccupationalCredential
 */
export function educationToSchema(edu: ParsedEducation) {
  const schema: any = {
    "@type": "EducationalOccupationalCredential",
    credentialCategory: edu.credentialCategory || edu.level,
  };

  if (edu.field) {
    schema.name = `${edu.level} in ${edu.field}`;
  } else {
    schema.name = edu.level;
  }

  return schema;
}

/**
 * Convert ParsedExperience to schema.org OccupationalExperienceRequirements
 */
export function experienceToSchema(exp: ParsedExperience) {
  return {
    "@type": "OccupationalExperienceRequirements",
    monthsOfExperience: exp.years * 12,
    ...(exp.field && { description: exp.details }),
  };
}
