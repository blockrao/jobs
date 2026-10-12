/**
 * Hub Documents — Document checklist with progress bar (localStorage-backed)
 * Only rendered client-side to preserve SSR compatibility.
 * Checklist state is stored in localStorage under `hub-docs-{slug}`.
 */

'use client';

import { useState, useEffect } from 'react';
import type { HubData } from './types';
import styles from '../recruitment-hub.module.css';

interface HubDocumentsProps {
  data: HubData;
}

export default function HubDocuments({ data }: HubDocumentsProps) {
  const { sourceDocuments, recruitment } = data;

  const storageKey = `hub-docs-${recruitment.slug ?? recruitment.id}`;
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);

  // Load from localStorage after mount
  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') setChecked(parsed);
      }
    } catch {
      // localStorage unavailable — silent fallback
    }
  }, [storageKey]);

  const toggle = (doc: string) => {
    setChecked((prev) => {
      const next = { ...prev, [doc]: !prev[doc] };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // silent
      }
      return next;
    });
  };

  if (sourceDocuments.length === 0) return null;

  const checkedCount = sourceDocuments.filter((d) => checked[d]).length;
  const progress = Math.round((checkedCount / sourceDocuments.length) * 100);

  return (
    <section id="documents" aria-labelledby="documents-heading" className={styles.card}>
      <h2 id="documents-heading" className={styles.sectionTitle}>Documents Checklist</h2>
      <p style={{ opacity: 0.75, fontSize: '0.9em', marginBottom: '1rem' }}>
        Check off each document as you gather it. Progress is saved in your browser.
      </p>

      {mounted && (
        <div className={styles.progress}>
          <div
            className={styles.progressBar}
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={checkedCount}
            aria-valuemin={0}
            aria-valuemax={sourceDocuments.length}
            aria-label={`${checkedCount} of ${sourceDocuments.length} documents ready`}
          />
          <span className={styles.progressOutput}>{checkedCount}/{sourceDocuments.length} ready</span>
        </div>
      )}

      <ul className={styles.checks}>
        {sourceDocuments.map((doc) => {
          const id = `doc-${doc.replace(/\s+/g, '-').toLowerCase()}`;
          return (
            <li key={doc} className={styles.checkItem}>
              <input
                type="checkbox"
                id={id}
                className={styles.checkInput}
                checked={mounted ? (checked[doc] ?? false) : false}
                onChange={() => toggle(doc)}
              />
              <label htmlFor={id} className={styles.checkLabel}>
                {doc}
              </label>
            </li>
          );
        })}
      </ul>

      <p className={styles.note} style={{ marginTop: '0.75rem' }}>
        Confirm exact document requirements and formats in the official notification before applying.
      </p>
    </section>
  );
}
