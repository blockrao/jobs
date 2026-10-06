"use client";
/**
 * EligibilityChecker — interactive Q2 widget for the job detail page.
 *
 * Takes an EligibilityRules tree (from extraContent.eligibilityRules) and the
 * post's closing date, then lets the candidate enter their profile and get an
 * instant verdict with a reason for each requirement.
 *
 * This is a pure client component — evalEligibility runs in the browser,
 * so there is no network round-trip and no server action needed.
 */

import { useState, useCallback } from "react";
import type { EligibilityRules } from "@/db/schema";
import { evalEligibility, type UserProfile, type EvalResult } from "@/lib/eligibility";

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  rules: EligibilityRules;
  /** ISO date string for the post's closing date. */
  closingDate: string;
};

// ── Local state shape ─────────────────────────────────────────────────────────

type FormState = {
  dob: string;
  category: UserProfile["category"] | "";
  qualifications: string;   // comma-separated, e.g. "LLB, LLM"
  experienceType: string;   // the primary experience type
  experienceYears: string;  // years (string for input)
  isPwbd: boolean;
  isWoman: boolean;
  isExServiceman: boolean;
  isCentralGovtEmployee: boolean;
  isPractitioner: boolean;
  isHighCourtAttorney: boolean;
  practitionerYears: string;
  attorneyYears: string;
};

const INITIAL: FormState = {
  dob: "",
  category: "",
  qualifications: "",
  experienceType: "",
  experienceYears: "",
  isPwbd: false,
  isWoman: false,
  isExServiceman: false,
  isCentralGovtEmployee: false,
  isPractitioner: false,
  isHighCourtAttorney: false,
  practitionerYears: "",
  attorneyYears: "",
};

const CATEGORY_LABELS: Record<string, string> = {
  UR: "Unreserved (UR)",
  EWS: "EWS",
  OBC: "OBC (Non-Creamy Layer)",
  SC: "SC",
  ST: "ST",
};

// Common experience types used in government legal service rules
const EXPERIENCE_TYPE_OPTIONS = [
  { value: "state_judicial", label: "State Judicial Service" },
  { value: "state_legal_superior_post", label: "State Legal Superior Post" },
  { value: "central_legal_affairs", label: "Central Legal Affairs" },
  { value: "law_teaching_or_research", label: "Law Teaching / Research" },
  { value: "other", label: "Other" },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function EligibilityChecker({ rules, closingDate }: Props) {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [result, setResult] = useState<EvalResult | null>(null);
  const [checked, setChecked] = useState(false);

  const setField = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((f) => ({ ...f, [key]: value }));
      setResult(null);
      setChecked(false);
    },
    [],
  );

  const handleCheck = useCallback(() => {
    if (!form.dob || !form.category) return;

    const profile: UserProfile = {
      dob: form.dob,
      category: form.category as UserProfile["category"],
      isPwbd: form.isPwbd,
      isWoman: form.isWoman,
      isExServiceman: form.isExServiceman,
      isCentralGovtEmployee: form.isCentralGovtEmployee,
      isPractitioner: form.isPractitioner,
      isHighCourtAttorney: form.isHighCourtAttorney,
      qualifications: form.qualifications
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      experience: [],
      practitionerMonths: form.practitionerYears
        ? Math.round(parseFloat(form.practitionerYears) * 12)
        : undefined,
      attorneyMonths: form.attorneyYears
        ? Math.round(parseFloat(form.attorneyYears) * 12)
        : undefined,
    };

    // Add primary experience entry
    if (form.experienceType && form.experienceYears) {
      profile.experience.push({
        type: form.experienceType,
        months: Math.round(parseFloat(form.experienceYears) * 12),
      });
    }

    // Combined practitioner months = max(practitioner + attorney)
    if (profile.practitionerMonths !== undefined && profile.attorneyMonths !== undefined) {
      profile.combinedPractitionerMonths =
        (profile.practitionerMonths ?? 0) + (profile.attorneyMonths ?? 0);
    } else {
      profile.combinedPractitionerMonths =
        (profile.practitionerMonths ?? 0) + (profile.attorneyMonths ?? 0);
    }

    const r = evalEligibility(rules, profile, closingDate);
    setResult(r);
    setChecked(true);
  }, [form, rules, closingDate]);

  const handleReset = useCallback(() => {
    setForm(INITIAL);
    setResult(null);
    setChecked(false);
  }, []);

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm dark:border-blue-900 dark:bg-blue-950">
      <p className="mb-3 font-semibold text-blue-900 dark:text-blue-200">
        Check your eligibility
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Date of birth */}
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">
            Date of Birth
          </label>
          <input
            type="date"
            value={form.dob}
            onChange={(e) => setField("dob", e.target.value)}
            max={closingDate}
            className="w-full rounded border border-black/20 bg-white px-2.5 py-1.5 text-sm dark:border-white/20 dark:bg-neutral-900 dark:text-white"
          />
        </div>

        {/* Category */}
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">
            Category
          </label>
          <select
            value={form.category}
            onChange={(e) => setField("category", e.target.value as FormState["category"])}
            className="w-full rounded border border-black/20 bg-white px-2.5 py-1.5 text-sm dark:border-white/20 dark:bg-neutral-900 dark:text-white"
          >
            <option value="">Select category</option>
            {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>

        {/* Qualifications */}
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">
            Qualifications (comma-separated, e.g. LLB, LLM)
          </label>
          <input
            type="text"
            value={form.qualifications}
            placeholder="e.g. LLB, LLM"
            onChange={(e) => setField("qualifications", e.target.value)}
            className="w-full rounded border border-black/20 bg-white px-2.5 py-1.5 text-sm dark:border-white/20 dark:bg-neutral-900 dark:text-white"
          />
        </div>

        {/* Experience type */}
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">
            Primary Experience Type
          </label>
          <select
            value={form.experienceType}
            onChange={(e) => setField("experienceType", e.target.value)}
            className="w-full rounded border border-black/20 bg-white px-2.5 py-1.5 text-sm dark:border-white/20 dark:bg-neutral-900 dark:text-white"
          >
            <option value="">None / Not applicable</option>
            {EXPERIENCE_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Experience years */}
        {form.experienceType && (
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">
              Years of Experience
            </label>
            <input
              type="number"
              min="0"
              max="50"
              step="0.5"
              value={form.experienceYears}
              placeholder="e.g. 7"
              onChange={(e) => setField("experienceYears", e.target.value)}
              className="w-full rounded border border-black/20 bg-white px-2.5 py-1.5 text-sm dark:border-white/20 dark:bg-neutral-900 dark:text-white"
            />
          </div>
        )}
      </div>

      {/* Practitioner fields */}
      <div className="mt-3 flex flex-wrap gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={form.isPractitioner}
            onChange={(e) => setField("isPractitioner", e.target.checked)}
            className="rounded"
          />
          Practising advocate / pleader
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={form.isHighCourtAttorney}
            onChange={(e) => setField("isHighCourtAttorney", e.target.checked)}
            className="rounded"
          />
          Attorney (HC Bombay or Calcutta)
        </label>
      </div>

      {(form.isPractitioner || form.isHighCourtAttorney) && (
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {form.isPractitioner && (
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Years as advocate / pleader
              </label>
              <input
                type="number" min="0" max="50" step="0.5"
                value={form.practitionerYears}
                onChange={(e) => setField("practitionerYears", e.target.value)}
                className="w-full rounded border border-black/20 bg-white px-2.5 py-1.5 text-sm dark:border-white/20 dark:bg-neutral-900 dark:text-white"
              />
            </div>
          )}
          {form.isHighCourtAttorney && (
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Years as HC attorney
              </label>
              <input
                type="number" min="0" max="50" step="0.5"
                value={form.attorneyYears}
                onChange={(e) => setField("attorneyYears", e.target.value)}
                className="w-full rounded border border-black/20 bg-white px-2.5 py-1.5 text-sm dark:border-white/20 dark:bg-neutral-900 dark:text-white"
              />
            </div>
          )}
        </div>
      )}

      {/* Relaxation checkboxes */}
      <div className="mt-3 flex flex-wrap gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={form.isPwbd}
            onChange={(e) => setField("isPwbd", e.target.checked)}
            className="rounded"
          />
          PwBD
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={form.isWoman}
            onChange={(e) => setField("isWoman", e.target.checked)}
            className="rounded"
          />
          Woman
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={form.isExServiceman}
            onChange={(e) => setField("isExServiceman", e.target.checked)}
            className="rounded"
          />
          Ex-serviceman
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={form.isCentralGovtEmployee}
            onChange={(e) => setField("isCentralGovtEmployee", e.target.checked)}
            className="rounded"
          />
          Central Govt employee (3+ yrs)
        </label>
      </div>

      {/* Action buttons */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={handleCheck}
          disabled={!form.dob || !form.category}
          className="rounded bg-blue-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700"
        >
          Check eligibility
        </button>
        {checked && (
          <button
            onClick={handleReset}
            className="rounded border border-black/20 px-4 py-1.5 text-xs font-semibold hover:bg-neutral-100 dark:border-white/20 dark:hover:bg-neutral-800"
          >
            Reset
          </button>
        )}
      </div>

      {/* ── Result ── */}
      {result && (
        <div
          className={`mt-4 rounded-lg border p-3 ${
            result.eligible
              ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950"
              : "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950"
          }`}
        >
          <p className={`font-semibold ${result.eligible ? "text-green-800 dark:text-green-200" : "text-red-800 dark:text-red-200"}`}>
            {result.eligible ? "✓ Eligible" : "✗ Not eligible"}
          </p>
          <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">
            {result.summary}
          </p>

          {result.leaves.length > 0 && (
            <ul className="mt-2 space-y-1">
              {result.leaves.map((leaf, i) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  <span className={leaf.satisfied ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                    {leaf.satisfied ? "✓" : "✗"}
                  </span>
                  <span className={leaf.satisfied ? "text-neutral-700 dark:text-neutral-300" : "text-red-700 dark:text-red-300"}>
                    {leaf.reason}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-2 text-xs text-neutral-500">
            This is a guide only. Verify against the official notification before applying.
          </p>
        </div>
      )}
    </div>
  );
}
