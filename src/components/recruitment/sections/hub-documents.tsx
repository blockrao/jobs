/**
 * Hub Documents — document checklist (localStorage-backed).
 * Client component; the orchestrator mounts it only when the extracted
 * document list is non-empty, so this never renders a default list.
 */

'use client';

import { useSyncExternalStore, useCallback } from 'react';
import styles from '../recruitment-hub.module.css';

interface HubDocumentsProps {
  documents: string[];
  storageKey: string;
}

type Checked = Record<string, boolean>;

const EMPTY: Checked = {};
const listeners = new Set<() => void>();
const cache = new Map<string, { raw: string | null; parsed: Checked }>();

function readChecked(storageKey: string): Checked {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(storageKey);
  } catch {
    return EMPTY;
  }
  const hit = cache.get(storageKey);
  if (hit && hit.raw === raw) return hit.parsed;
  let parsed: Checked = EMPTY;
  if (raw) {
    try {
      const value = JSON.parse(raw);
      if (value && typeof value === 'object') parsed = value as Checked;
    } catch {
      parsed = EMPTY;
    }
  }
  cache.set(storageKey, { raw, parsed });
  return parsed;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener('storage', cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', cb);
  };
}

export default function HubDocuments({ documents, storageKey }: HubDocumentsProps) {
  // Server snapshot is always empty, so SSR and the first client render agree;
  // the stored state is applied on hydration without a setState-in-effect.
  const checked = useSyncExternalStore(
    subscribe,
    () => readChecked(storageKey),
    () => EMPTY,
  );

  const toggle = useCallback((doc: string) => {
    const next = { ...readChecked(storageKey), [doc]: !readChecked(storageKey)[doc] };
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // localStorage unavailable — silent
    }
    listeners.forEach((l) => l());
  }, [storageKey]);

  if (documents.length === 0) return null;

  const checkedCount = documents.filter((d) => checked[d]).length;

  return (
    <section id="documents" aria-labelledby="documents-heading" className={styles.card}>
      <h2 id="documents-heading" className={styles.sectionTitle}>Documents to keep ready</h2>
      <p className={styles.muted}>
        Listed in the source material. Tick each one as you gather it; progress is saved in your browser.
        {' '}{checkedCount}/{documents.length} ready.
      </p>
      <ul className={styles.checks}>
        {documents.map((doc) => {
          const id = `doc-${doc.replace(/\s+/g, '-').toLowerCase()}`;
          return (
            <li key={doc} className={styles.checkItem}>
              <input
                type="checkbox"
                id={id}
                className={styles.checkInput}
                checked={checked[doc] ?? false}
                onChange={() => toggle(doc)}
              />
              <label htmlFor={id} className={styles.checkLabel}>{doc}</label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
