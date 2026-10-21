/**
 * Formatting utilities for job posting pages
 * Localized for Indian market (INR, en-IN)
 */

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateShort(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '';
  return new Intl.NumberFormat('en-IN', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDeadlineStatus(date: Date | string | null | undefined): 'OPEN' | 'CLOSED' | 'UNKNOWN' {
  if (!date) return 'UNKNOWN';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'UNKNOWN';
  return new Date() > d ? 'CLOSED' : 'OPEN';
}

export function formatDeadlineTime(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function daysUntilDeadline(date: Date | string | null | undefined): number | null {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function isDeadlineSoon(date: Date | string | null | undefined, daysThreshold: number = 7): boolean {
  const days = daysUntilDeadline(date);
  if (days === null) return false;
  return days <= daysThreshold && days >= 0;
}

/**
 * Format salary value to Indian numbering system
 * ₹100000 → Rs. 1 lac
 * ₹50000 → Rs. 50,000
 */
function formatSalaryValue(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '';

  // Values >= 100,000 use lac notation
  if (amount >= 100000) {
    const lacs = amount / 100000;
    if (lacs === Math.floor(lacs)) {
      return `Rs. ${Math.floor(lacs)} lac${lacs > 1 ? 's' : ''}`;
    } else {
      return `Rs. ${lacs.toFixed(1)} lacs`;
    }
  }

  // Values < 100,000 use regular format with commas
  return `Rs. ${formatCurrency(amount)}`;
}

/**
 * Format salary range to Indian numbering system
 * (100000, 200000) → Rs. 1 lac–Rs. 2 lacs
 * (50000, 75000) → Rs. 50,000–Rs. 75,000
 */
export function formatSalaryRange(salaryMin: number | null | undefined, salaryMax: number | null | undefined): string {
  if (!salaryMin || !salaryMax) return '';

  const minFormatted = formatSalaryValue(salaryMin);
  const maxFormatted = formatSalaryValue(salaryMax);

  return `${minFormatted}–${maxFormatted}`;
}
