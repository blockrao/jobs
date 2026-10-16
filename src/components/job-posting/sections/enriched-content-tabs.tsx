'use client';

/**
 * EnrichedContentTabs — Dynamic Tab Renderer for Enrichment Schema
 *
 * This component reads enrichment JSONB data and renders it as 8 dynamic tabs:
 * 1. Eligibility (education, experience, age, requirements)
 * 2. Vacancies (category breakdown, location breakdown)
 * 3. How to Apply (method, steps, addresses, dates)
 * 4. Documents (required documents checklist)
 * 5. Selection Process (stages of selection)
 * 6. Pay & Benefits (hourly, daily, monthly rates)
 * 7. Important Info (instructions, job description, notes)
 * 8. Official Links (PDFs, websites, forms)
 *
 * Benefits:
 * - Single source of truth (enrichment-schema.ts defines all 8 tabs)
 * - Auto-updates when schema changes
 * - Graceful degradation (shows only populated tabs)
 * - Type-safe rendering
 * - Consistent across all 1,612+ posts
 */

import { useState } from "react";
import { EnrichmentSchema, getEnrichmentTabs } from "@/types/enrichment-schema";
import styles from "../job-posting-page.module.css";

interface EnrichedContentTabsProps {
  enrichment: EnrichmentSchema;
}

export default function EnrichedContentTabs({ enrichment }: EnrichedContentTabsProps) {
  const [activeTab, setActiveTab] = useState<string>("eligibility");

  // Get dynamic tabs from schema
  const tabs = getEnrichmentTabs(enrichment);

  // Filter to only non-empty tabs
  const populatedTabs = tabs.filter((tab) => !tab.isEmpty);

  if (populatedTabs.length === 0) {
    return null; // No enrichment data to display
  }

  return (
    <div className={styles.section}>
      <div className={styles.tabContainer}>
        {/* Tab Headers */}
        <div className={styles.tabHeaders} style={{ display: "flex", gap: "8px", borderBottom: "2px solid #e5e7eb", marginBottom: "20px", overflowX: "auto" }}>
          {populatedTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={styles.tabButton}
              style={{
                padding: "12px 16px",
                background: activeTab === tab.id ? "#1e40af" : "transparent",
                color: activeTab === tab.id ? "white" : "#374151",
                border: "none",
                cursor: "pointer",
                fontWeight: activeTab === tab.id ? 600 : 500,
                fontSize: "14px",
                whiteSpace: "nowrap",
                transition: "all 0.2s",
              }}
              aria-selected={activeTab === tab.id}
              role="tab"
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div role="tabpanel" className={styles.tabContent}>
          {populatedTabs.map((tab) => {
            if (tab.id !== activeTab) return null;

            return (
              <div key={tab.id}>
                {/* TAB 1: ELIGIBILITY */}
                {tab.id === "eligibility" && (
                  <TabEligibility data={tab.data as any} />
                )}

                {/* TAB 2: VACANCIES */}
                {tab.id === "vacancies" && (
                  <TabVacancies data={tab.data as any} />
                )}

                {/* TAB 3: HOW TO APPLY */}
                {tab.id === "how-to-apply" && (
                  <TabHowToApply data={tab.data as any} />
                )}

                {/* TAB 4: DOCUMENTS */}
                {tab.id === "documents" && (
                  <TabDocuments data={tab.data as any} />
                )}

                {/* TAB 5: SELECTION PROCESS */}
                {tab.id === "selection" && (
                  <TabSelectionProcess data={tab.data as any} />
                )}

                {/* TAB 6: PAY & BENEFITS */}
                {tab.id === "pay" && (
                  <TabPayBenefits data={tab.data as any} />
                )}

                {/* TAB 7: IMPORTANT INFO */}
                {tab.id === "instructions" && (
                  <TabImportantInfo data={tab.data as any} />
                )}

                {/* TAB 8: OFFICIAL LINKS */}
                {tab.id === "links" && (
                  <TabOfficialLinks data={tab.data as any} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

/** TAB 1: Eligibility */
function TabEligibility({ data }: { data: any }) {
  const { education, experience, additional_requirements, age_limit, age_note } = data;

  return (
    <div style={{ paddingTop: "12px" }}>
      {education?.mandatory && (
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>Required Education</h3>
          <ul style={{ paddingLeft: "20px", margin: 0 }}>
            {education.mandatory.map((item: string, idx: number) => (
              <li key={idx} style={{ marginBottom: "6px", color: "#374151" }}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {education?.preferred && (
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>Preferred Education</h3>
          <ul style={{ paddingLeft: "20px", margin: 0 }}>
            {education.preferred.map((item: string, idx: number) => (
              <li key={idx} style={{ marginBottom: "6px", color: "#374151" }}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {experience?.years_required && (
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>Experience Required</h3>
          <div style={{ color: "#374151" }}>
            <strong>{experience.years_required} year{experience.years_required > 1 ? 's' : ''}</strong>
            {experience.job_title && <> as <strong>{experience.job_title}</strong></>}
          </div>
          {experience.preferred_with && (
            <div style={{ marginTop: "8px", fontSize: "13px" }}>
              <strong>Preferred:</strong>
              <ul style={{ paddingLeft: "20px", margin: "4px 0 0 0" }}>
                {experience.preferred_with.map((item: string, idx: number) => (
                  <li key={idx} style={{ color: "#6b7280" }}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {additional_requirements && additional_requirements.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>Additional Requirements</h3>
          <ul style={{ paddingLeft: "20px", margin: 0 }}>
            {additional_requirements.map((item: string, idx: number) => (
              <li key={idx} style={{ marginBottom: "6px", color: "#374151" }}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {age_limit && (
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>Age Limit</h3>
          <div style={{ color: "#374151" }}>{age_limit}</div>
          {age_note && <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>{age_note}</div>}
        </div>
      )}
    </div>
  );
}

/** TAB 2: Vacancies */
function TabVacancies({ data }: { data: any }) {
  const { by_category, by_location, details } = data;

  return (
    <div style={{ paddingTop: "12px" }}>
      {by_category && (
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "12px" }}>Vacancies by Category</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
            {Object.entries(by_category).map(([category, count]: [string, any]) => (
              <div
                key={category}
                style={{
                  padding: "12px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "12px", color: "#6b7280", textTransform: "uppercase", marginBottom: "4px" }}>
                  {category.replace(/_/g, " ")}
                </div>
                <div style={{ fontSize: "20px", fontWeight: 700, color: "#1e40af" }}>{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {by_location && Object.keys(by_location).length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "12px" }}>Vacancies by Location</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
            {Object.entries(by_location).map(([location, count]: [string, any]) => (
              <div
                key={location}
                style={{
                  padding: "12px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>{location}</div>
                <div style={{ fontSize: "20px", fontWeight: 700, color: "#059669" }}>{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {details?.total && (
        <div style={{ marginBottom: "20px" }}>
          <div style={{ padding: "12px", background: "#f0fdf4", borderLeft: "4px solid #059669", borderRadius: "4px" }}>
            <strong style={{ color: "#059669" }}>Total Vacancies: {details.total}</strong>
            {details.note && <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>{details.note}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

/** TAB 3: How to Apply */
function TabHowToApply({ data }: { data: any }) {
  const { method, steps, address, contact, dates } = data;

  return (
    <div style={{ paddingTop: "12px" }}>
      {dates?.open && dates?.close && (
        <div style={{ marginBottom: "20px", padding: "12px", background: "#eff6ff", borderLeft: "4px solid #3b82f6", borderRadius: "4px" }}>
          <div style={{ fontSize: "12px", color: "#6b7280" }}>Application Period</div>
          <div style={{ color: "#1e40af", fontWeight: 600, marginTop: "4px" }}>
            {new Date(dates.open).toLocaleDateString()} to {new Date(dates.close).toLocaleDateString()}
          </div>
        </div>
      )}

      {method && (
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>Application Method</h3>
          <div style={{ color: "#374151" }}>{method}</div>
        </div>
      )}

      {steps && steps.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "12px" }}>Steps to Apply</h3>
          <ol style={{ paddingLeft: "20px", margin: 0 }}>
            {steps.map((step: string, idx: number) => (
              <li key={idx} style={{ marginBottom: "12px", color: "#374151", lineHeight: 1.5 }}>
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}

      {address && (
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>Send Application To</h3>
          <div
            style={{
              padding: "12px",
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              color: "#374151",
              whiteSpace: "pre-wrap",
              fontSize: "13px",
              lineHeight: 1.6,
            }}
          >
            {address}
          </div>
        </div>
      )}

      {contact && (
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>Contact Information</h3>
          <div style={{ color: "#374151" }}>
            {contact.person && <div>{contact.person}</div>}
            {contact.department && <div style={{ fontSize: "13px", color: "#6b7280" }}>{contact.department}</div>}
            {contact.phone && <div style={{ fontSize: "13px", color: "#6b7280" }}>Phone: {contact.phone}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

/** TAB 4: Documents Required */
function TabDocuments({ data }: { data: any }) {
  const { documents, detailed } = data;

  return (
    <div style={{ paddingTop: "12px" }}>
      {documents && documents.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "12px" }}>Required Documents</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {documents.map((doc: string, idx: number) => (
              <div key={idx} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                <input type="checkbox" disabled style={{ marginTop: "2px", cursor: "not-allowed" }} />
                <span style={{ color: "#374151" }}>{doc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {detailed && detailed.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "12px" }}>Document Details</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {detailed.map((doc: any, idx: number) => (
              <div key={idx} style={{ padding: "12px", border: "1px solid #e5e7eb", borderRadius: "6px" }}>
                <div style={{ fontWeight: 600, color: "#374151" }}>{doc.name}</div>
                {doc.format && <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>Format: {doc.format}</div>}
                {doc.note && <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>{doc.note}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** TAB 5: Selection Process */
function TabSelectionProcess({ data }: { data: any }) {
  const stages = Array.isArray(data) ? data : [];

  if (stages.length === 0) return null;

  return (
    <div style={{ paddingTop: "12px" }}>
      <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "16px" }}>Selection Stages</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {stages.map((stage: any, idx: number) => (
          <div
            key={idx}
            style={{
              padding: "12px",
              border: "1px solid #e5e7eb",
              borderLeft: "4px solid #3b82f6",
              borderRadius: "4px",
              position: "relative",
            }}
          >
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "24px",
                  height: "24px",
                  background: "#3b82f6",
                  color: "white",
                  borderRadius: "50%",
                  fontSize: "12px",
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {(stage.stage ?? idx + 1)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: "#1f2937" }}>{stage.name}</div>
                {stage.description && (
                  <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "6px" }}>{stage.description}</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** TAB 6: Pay & Benefits */
function TabPayBenefits({ data }: { data: any }) {
  const { hourly, daily_max, monthly, max_hours_per_day, contract_max_days, note } = data;

  return (
    <div style={{ paddingTop: "12px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        {hourly && (
          <div style={{ padding: "12px", background: "#f0fdf4", border: "1px solid #d1fae5", borderRadius: "6px" }}>
            <div style={{ fontSize: "12px", color: "#059669" }}>Hourly Rate</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#059669", marginTop: "4px" }}>{hourly}</div>
          </div>
        )}

        {daily_max && (
          <div style={{ padding: "12px", background: "#fef3c7", border: "1px solid #fde68a", borderRadius: "6px" }}>
            <div style={{ fontSize: "12px", color: "#b45309" }}>Daily Maximum</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#b45309", marginTop: "4px" }}>{daily_max}</div>
          </div>
        )}

        {monthly && (
          <div style={{ padding: "12px", background: "#dbeafe", border: "1px solid #bfdbfe", borderRadius: "6px" }}>
            <div style={{ fontSize: "12px", color: "#1e40af" }}>Monthly</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#1e40af", marginTop: "4px" }}>{monthly}</div>
          </div>
        )}
      </div>

      {(max_hours_per_day || contract_max_days) && (
        <div style={{ marginBottom: "20px", padding: "12px", background: "#ede9fe", border: "1px solid #ddd6fe", borderRadius: "6px" }}>
          <h3 style={{ fontSize: "13px", fontWeight: 600, margin: "0 0 8px 0", color: "#6d28d9" }}>Terms</h3>
          {max_hours_per_day && <div style={{ fontSize: "13px", color: "#374151" }}>Maximum {max_hours_per_day} hours per day</div>}
          {contract_max_days && <div style={{ fontSize: "13px", color: "#374151" }}>Contract maximum {contract_max_days} days</div>}
        </div>
      )}

      {note && (
        <div style={{ padding: "12px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "6px", fontSize: "13px", color: "#6b7280" }}>
          {note}
        </div>
      )}
    </div>
  );
}

/** TAB 7: Important Info */
function TabImportantInfo({ data }: { data: any }) {
  const { key_instructions, job_description, notes } = data;

  return (
    <div style={{ paddingTop: "12px" }}>
      {key_instructions && key_instructions.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "12px" }}>Important Instructions</h3>
          <ul style={{ paddingLeft: "20px", margin: 0 }}>
            {key_instructions.map((item: string, idx: number) => (
              <li key={idx} style={{ marginBottom: "8px", color: "#374151" }}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {job_description && job_description.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "12px" }}>Job Responsibilities</h3>
          <ul style={{ paddingLeft: "20px", margin: 0 }}>
            {job_description.map((item: string, idx: number) => (
              <li key={idx} style={{ marginBottom: "8px", color: "#374151" }}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {notes && notes.length > 0 && (
        <div>
          <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "12px" }}>Additional Notes</h3>
          <ul style={{ paddingLeft: "20px", margin: 0 }}>
            {notes.map((item: string, idx: number) => (
              <li key={idx} style={{ marginBottom: "8px", color: "#374151" }}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** TAB 8: Official Links */
function TabOfficialLinks({ data }: { data: any }) {
  if (!data || Object.keys(data).length === 0) return null;

  return (
    <div style={{ paddingTop: "12px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {Object.entries(data).map(([key, url]: [string, any]) => {
          if (!url) return null;
          return (
            <a
              key={key}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "12px",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                color: "#1e40af",
                textDecoration: "none",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#eff6ff";
                (e.currentTarget as HTMLElement).style.borderColor = "#3b82f6";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "transparent";
                (e.currentTarget as HTMLElement).style.borderColor = "#e5e7eb";
              }}
            >
              <span style={{ fontWeight: 500 }}>{key.replace(/_/g, " ")}</span>
              <span style={{ fontSize: "18px" }}>→</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
