'use client';

import { useState } from 'react';
import type { FaqItem } from './types';
import styles from '../recruitment-hub.module.css';

interface HubFaqEnhancedProps {
  items: FaqItem[];
}

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{
        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'transform 0.2s',
        flexShrink: 0,
      }}
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  );
}

export default function HubFaqEnhanced({ items }: HubFaqEnhancedProps) {
  const [openId, setOpenId] = useState<number | null>(null);

  if (!items || items.length === 0) {
    return null;
  }

  const toggleOpen = (index: number) => {
    setOpenId(openId === index ? null : index);
  };

  return (
    <section id="faq" className={styles.card}>
      <h2 className={styles.sectionTitle}>❓ Frequently Asked Questions</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {items.map((item, index) => (
          <div key={index}>
            <button
              onClick={() => toggleOpen(index)}
              style={{
                width: '100%',
                padding: '14px 14px',
                backgroundColor: openId === index ? 'var(--hub-blue-t)' : 'var(--hub-grey-t)',
                border: openId === index ? '1px solid #c7d6fb' : '1px solid var(--hub-line)',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--hub-ink)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (openId !== index) {
                  e.currentTarget.style.backgroundColor = '#eef2f7';
                }
              }}
              onMouseLeave={(e) => {
                if (openId !== index) {
                  e.currentTarget.style.backgroundColor = 'var(--hub-grey-t)';
                }
              }}
            >
              <ChevronIcon isOpen={openId === index} />
              <span style={{ textAlign: 'left', flex: 1 }}>{item.q}</span>
            </button>

            {openId === index && (
              <div
                style={{
                  padding: '14px',
                  backgroundColor: 'var(--hub-blue-t)',
                  borderLeft: '3px solid var(--hub-blue)',
                  borderBottomLeftRadius: '8px',
                  borderBottomRightRadius: '8px',
                  marginTop: '-1px',
                  animation: 'slideDown 0.2s ease-out',
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: '13px',
                    color: 'var(--hub-ink2)',
                    lineHeight: 1.6,
                  }}
                >
                  {item.a}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <p style={{ fontSize: '12px', color: 'var(--hub-ink3)', margin: '16px 0 0', fontStyle: 'italic' }}>
        Didn&apos;t find your answer? <a href="/support" style={{ color: 'var(--hub-blue)' }}>Contact support</a>
      </p>
    </section>
  );
}
