/**
 * Defensive normalization for enrichment JSONB fields
 * 
 * Handles malformed data shapes (objects where arrays expected, etc.)
 * without crashing. Provides safe fallbacks for unknown structures.
 */

/**
 * Normalize education field: string | array | object | null → string
 * 
 * Accepts:
 * - String: "B.Tech, M.Tech" → return as-is
 * - Array: ["B.Tech", "M.Tech"] → join with comma
 * - Object with text: {text: "..."} → extract text
 * - Object with degree: {degree: "B.Tech", ...} → extract degree
 * - Null/undefined → return empty string
 * 
 * Returns a safe string for display, never crashes.
 */
export function normalizeEducation(value: unknown): string | null {
  if (!value) return null;

  // String: return as-is
  if (typeof value === 'string') {
    return value || null;
  }

  // Array: join elements
  if (Array.isArray(value)) {
    const items = value
      .filter((v) => v && typeof v === 'string')
      .map((v) => String(v).trim())
      .filter(Boolean);
    return items.length > 0 ? items.join(', ') : null;
  }

  // Object: extract displayable text
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    
    // Prefer text field
    if (obj.text && typeof obj.text === 'string') {
      return obj.text || null;
    }
    
    // Fallback to degree field
    if (obj.degree && typeof obj.degree === 'string') {
      return obj.degree || null;
    }
    
    // Last resort: JSON.stringify (shows structure for debugging)
    return `[Object: ${Object.keys(obj).join(', ')}]`;
  }

  return null;
}

/**
 * Normalize experience field: string | array | object | null → string
 */
export function normalizeExperience(value: unknown): string | null {
  if (!value) return null;

  if (typeof value === 'string') {
    return value || null;
  }

  if (Array.isArray(value)) {
    const items = value
      .filter((v) => v && (typeof v === 'string' || typeof v === 'number'))
      .map((v) => String(v).trim())
      .filter(Boolean);
    return items.length > 0 ? items.join(', ') : null;
  }

  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    if (obj.totalYears && typeof obj.totalYears === 'number') {
      return `${obj.totalYears} years`;
    }
    return `[Object: ${Object.keys(obj).join(', ')}]`;
  }

  return null;
}

/**
 * Normalize selection process field: string | array | object | null → string
 */
export function normalizeSelectionProcess(value: unknown): string | null {
  if (!value) return null;

  if (typeof value === 'string') {
    return value || null;
  }

  if (Array.isArray(value)) {
    const items = value
      .filter((v) => v && typeof v === 'string')
      .map((v) => String(v).trim())
      .filter(Boolean);
    return items.length > 0 ? items.join(' → ') : null;
  }

  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    if (obj.name && typeof obj.name === 'string') {
      return obj.name || null;
    }
    return `[Object: ${Object.keys(obj).join(', ')}]`;
  }

  return null;
}

/**
 * Audit enrichment shape for logging
 * Returns object with field name → JSON type for debugging
 */
export function auditEnrichmentShape(enrichment: Record<string, unknown>): Record<string, string> {
  const shape: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(enrichment)) {
    if (!value) {
      shape[key] = 'null';
    } else if (typeof value === 'string') {
      shape[key] = 'string';
    } else if (Array.isArray(value)) {
      shape[key] = `array[${value.length}]`;
    } else if (typeof value === 'object') {
      const objKeys = Object.keys(value as Record<string, unknown>);
      shape[key] = `object{${objKeys.join(',')}}`;
    } else {
      shape[key] = typeof value;
    }
  }
  
  return shape;
}
