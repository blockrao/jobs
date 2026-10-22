'use client';

import { useState } from 'react';
import styles from '../recruitment-hub.module.css';

interface AlertSignupProps {
  recruitmentName: string;
  recruitmentSlug: string;
  email?: string;
}

export default function AlertSignup({ recruitmentName, recruitmentSlug, email }: AlertSignupProps) {
  const [userEmail, setUserEmail] = useState(email || '');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!userEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        setError('Please enter a valid email address');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/alerts/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          recruitmentSlug,
          recruitmentName,
        }),
      });

      if (response.ok) {
        setSubmitted(true);
        setUserEmail('');
        setTimeout(() => setSubmitted(false), 5000);
      } else {
        try {
          const data = await response.json();
          setError(data.error || 'Failed to subscribe. Please try again.');
        } catch {
          setError('Failed to subscribe. Please try again.');
        }
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error('Alert subscription error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.alertSignup}>
      <div className={styles.alertContent}>
        <h3 className={styles.alertTitle}>🔔 Never miss this opportunity</h3>
        <p className={styles.alertDescription}>Get notified when new similar jobs are posted</p>

        {submitted ? (
          <div className={styles.alertSuccess}>
            <p>✓ Successfully subscribed! Check your email for confirmation.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.alertForm}>
            <input
              type="email"
              placeholder="your@email.com"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              required
              disabled={loading}
              className={styles.alertInput}
            />
            <button
              type="submit"
              disabled={loading || !userEmail}
              className={`${styles.btn} ${styles.btnAlertPrimary}`}
            >
              {loading ? 'Subscribing...' : 'Subscribe'}
            </button>
          </form>
        )}

        {error && <p className={styles.alertError}>{error}</p>}
      </div>
    </div>
  );
}
