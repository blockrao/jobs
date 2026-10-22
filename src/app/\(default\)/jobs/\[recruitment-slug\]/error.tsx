'use client';

/**
 * Error boundary for recruitment hub pages
 *
 * When the page throws an error (data not found, component crash, etc.),
 * this boundary catches it and displays a user-friendly error message
 * instead of defaulting to Next.js __next_error__ which adds noindex.
 *
 * This prevents the noindex fallback that would block Google indexation.
 */

import { useEffect } from 'react';
import Link from 'next/link';

export default function RecruitmentHubError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error for debugging (not sent to user)
    console.error('[RecruitmentHub Error]', error.message);
  }, [error]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f9fafb',
      padding: '20px',
    }}>
      <div style={{
        maxWidth: '500px',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: '48px',
          marginBottom: '16px',
        }}>
          ⚠️
        </div>

        <h1 style={{
          fontSize: '28px',
          fontWeight: '700',
          marginBottom: '12px',
          color: '#111827',
        }}>
          Recruitment Not Found
        </h1>

        <p style={{
          fontSize: '16px',
          color: '#6b7280',
          marginBottom: '24px',
          lineHeight: '1.5',
        }}>
          This recruitment page might have been updated or the URL might be incorrect.
          Please try searching for the job or browse all available opportunities.
        </p>

        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          <Link
            href="/jobs"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              backgroundColor: '#2563eb',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#1d4ed8';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#2563eb';
            }}
          >
            Browse All Jobs
          </Link>

          <button
            onClick={() => reset()}
            style={{
              padding: '12px 24px',
              backgroundColor: '#e5e7eb',
              color: '#111827',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#d1d5db';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#e5e7eb';
            }}
          >
            Try Again
          </button>
        </div>

        <div style={{
          marginTop: '32px',
          paddingTop: '24px',
          borderTop: '1px solid #e5e7eb',
        }}>
          <p style={{
            fontSize: '13px',
            color: '#9ca3af',
          }}>
            Having trouble? <Link href="/contact" style={{ color: '#2563eb', textDecoration: 'none' }}>Contact support</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
