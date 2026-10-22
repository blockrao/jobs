/**
 * 404 Not Found page for recruitment hub
 *
 * This page is shown when a recruitment slug doesn't exist in the database.
 * Unlike the default __next_error__ page, this explicitly returns a 404
 * status while maintaining proper page structure and avoiding unnecessary noindex.
 */

import Link from 'next/link';
import { pageSeo } from '@/lib/seo';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Recruitment Not Found',
  description: 'This recruitment page could not be found. Try browsing all available jobs.',
  ...pageSeo('/jobs', { index: false }),
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'linear-gradient(to bottom, #f9fafb, #ffffff)',
      padding: '20px',
    }}>
      <div style={{
        maxWidth: '500px',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: '64px',
          marginBottom: '20px',
        }}>
          🔍
        </div>

        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          marginBottom: '12px',
          color: '#111827',
        }}>
          Recruitment Not Found
        </h1>

        <p style={{
          fontSize: '16px',
          color: '#6b7280',
          marginBottom: '32px',
          lineHeight: '1.6',
        }}>
          We couldn't find this recruitment. It may have been removed or the URL might be incorrect.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '12px',
          marginBottom: '32px',
        }}>
          <Link
            href="/jobs"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px 20px',
              backgroundColor: '#2563eb',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'background-color 0.2s',
            }}
          >
            Browse Jobs
          </Link>

          <Link
            href="/search"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px 20px',
              backgroundColor: '#f3f4f6',
              color: '#111827',
              textDecoration: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              border: '1px solid #e5e7eb',
              transition: 'background-color 0.2s',
            }}
          >
            Search
          </Link>

          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px 20px',
              backgroundColor: '#f3f4f6',
              color: '#111827',
              textDecoration: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              border: '1px solid #e5e7eb',
              transition: 'background-color 0.2s',
            }}
          >
            Home
          </Link>
        </div>

        <hr style={{
          border: 'none',
          borderTop: '1px solid #e5e7eb',
          margin: '32px 0',
        }} />

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          fontSize: '13px',
          color: '#6b7280',
        }}>
          <p style={{ margin: 0 }}>Popular searches:</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/search?q=ssc" style={{ color: '#2563eb', textDecoration: 'none' }}>SSC Jobs</Link>
            <span style={{ color: '#d1d5db' }}>•</span>
            <Link href="/search?q=upsc" style={{ color: '#2563eb', textDecoration: 'none' }}>UPSC Jobs</Link>
            <span style={{ color: '#d1d5db' }}>•</span>
            <Link href="/search?q=bank" style={{ color: '#2563eb', textDecoration: 'none' }}>Bank Jobs</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
