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
