import { differenceInDays, format, parseISO } from 'date-fns';

export function getExpiryStatus(expiryDate: Date | string): 'expired' | 'critical' | 'warning' | 'ok' {
  const expiry = typeof expiryDate === 'string' ? parseISO(expiryDate) : expiryDate;
  const today = new Date();
  const daysUntilExpiry = differenceInDays(expiry, today);

  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= 30) return 'critical';
  if (daysUntilExpiry <= 90) return 'warning';
  return 'ok';
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM dd, yyyy');
}

export function formatDateTime(date: Date): string {
  return format(date, 'MMM dd, yyyy HH:mm');
}

export function generateSKU(): string {
  const prefix = 'RX';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}