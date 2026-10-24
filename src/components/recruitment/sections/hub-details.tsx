/**
 * Hub Details — "At a glance" section with integrated enrichment data.
 *
 * Combines:
 * - Original glance rows (organisation, job type, application dates, etc.)
 * - Enrichment data (salary, age limit, qualifications from Excel/FJA)
 *
 * Renders as:
 * 1. Main "At a glance" grid with all key/value pairs
 * 2. Subsections for Important Dates, Selection Process, Application Requirements
 *
 * Updated to handle nested objects properly:
 * - Salary: formatted as currency range
 * - Vacancies: aggregated count or detailed breakdown
 * - Education/Experience: parsed from enrichment schema
 * - Phase 1B complex data: delegated to dedicated renderer
 */

import Link from 'next/link';
import type { HubData } from './types';
import type { EnrichmentSchema } from '@/types/enrichment-schema';
import styles from '../recruitment-hub.module.css';

interface EnrichmentData {
  [key: string]: any;
}

// Helper to safely stringify values without [object Object]
function valueToString(value: unknown, key?: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    // For arrays, join simple values
    const strings = value
      .map(v => valueToString(v))
      .filter(Boolean) as string[];
    return strings.length > 0 ? strings.join(', ') : null;
  }
  if (typeof value === 'object') {
    // Handle special cases for known nested objects
    if (key?.toLowerCase().includes('salary') || key?.toLowerCase().includes('pay')) {
      return formatSalaryObject(value);
    }
    if (key?.toLowerCase().includes('vacancy')) {
      return formatVacancyObject(value);
    }
    // For other objects, don't stringify - return null so we skip them
    return null;
  }
  return null;
}

// Format salary object to readable string
function formatSalaryObject(obj: any): string | null {
  if (!obj || typeof obj !== 'object') return null;

  const { monthly_min, monthly_max, monthly, raw } = obj;

  if (raw && typeof raw === 'string') {
    return raw;
  }

  if (monthly && typeof monthly === 'string') {
    return monthly;
  }

  if (monthly_min != null || monthly_max != null) {
    const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;
    if (monthly_min != null && monthly_max != null) {
      return `${inr(monthly_min)} – ${inr(monthly_max)}/month`;
    } else if (monthly_min != null) {
      return `From ${inr(monthly_min)}/month`;
    } else if (monthly_max != null) {
      return `Up to ${inr(monthly_max)}/month`;
    }
  }

  return null;
}

// Format vacancy object - just show count if available
function formatVacancyObject(obj: any): string | null {
  if (!obj || typeof obj !== 'object') return null;

  // If it's vacancies_by_category map, count total
  if (typeof obj === 'object' && !Array.isArray(obj)) {
    const total = Object.values(obj)
      .filter((v): v is number => typeof v === 'number')
      .reduce((sum, v) => sum + v, 0);
    if (total > 0) return String(total);
  }

  // If it's an array, count items
  if (Array.isArray(obj)) {
    const total = obj.reduce((sum, item) => {
      if (typeof item === 'object' && item.count != null) {
        return sum + Number(item.count);
      }
      return sum;
    }, 0);
    if (total > 0) return String(total);
  }

  return null;
}

export default function HubDetails({
  data,
  enrichment
}: {
  data: HubData;
  enrichment?: EnrichmentData | null;
}) {
  const { glance } = data;

  // Merge enrichment data into the main glance rows
  const enhancedGlance = [...glance];

  if (enrichment && typeof enrichment === 'object') {
    // Add enrichment items as key-value pairs
    Object.entries(enrichment).forEach(([key, value]) => {
      // Skip meta fields and complex nested structures that shouldn't be in "at a glance"
      if (key.startsWith('_') || key === 'meta' || key === 'reference') {
        return;
      }

      // Format the label: convert snake_case/camelCase to Title Case
      const label = key
        .replace(/([A-Z])/g, ' $1') // camelCase
        .replace(/_/g, ' ') // snake_case
        .replace(/\b\w/g, c => c.toUpperCase()) // title case
        .trim();

      // Convert value to string safely (handles nested objects)
      const strValue = valueToString(value, key);

      if (strValue && !enhancedGlance.some(row => row.label.toLowerCase() === label.toLowerCase())) {
        enhancedGlance.push({ label, value: strValue });
      }
    });
  }

  const hasEnrichmentData = enrichment && typeof enrichment === 'object' && Object.keys(enrichment).length > 0;

  if (enhancedGlance.length === 0 && !hasEnrichmentData) return null;

  return (
    <section id="overview" aria-labelledby="overview-heading" className={styles.card}>
      <h2 id="overview-heading" className={styles.sectionTitle}>At a glance</h2>

      {/* Main glance grid - all key/value pairs */}
      <dl className={styles.glance}>
        {enhancedGlance.map(({ label, value, href, verificationNote }) => (
          <div key={label} className={styles.glanceRow}>
            <dt>{label}</dt>
            <dd>
              {value === null
                ? <span className={styles.unknown}>Not stated in this notification</span>
                : (
                  <>
                    {href
                      ? <Link href={href}>{value}</Link>
                      : value}
                    {verificationNote && (
                      <span className={styles.verificationNote} title={verificationNote}>
                        {' '}
                        <small>({verificationNote})</small>
                      </span>
                    )}
                  </>
                )}
            </dd>
          </div>
        ))}
      </dl>

    </section>
  );
}
