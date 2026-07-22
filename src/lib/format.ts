import { currency, INTL_LOCALE, type Locale } from '@/config/site';
import type { L10nText } from '@/types/db';

/**
 * Pick the best available translation for a jsonb text column.
 * Falls back through the requested locale -> az -> en -> whatever exists, so a
 * half-translated listing still renders instead of showing an empty string.
 */
export function pickText(text: L10nText | null | undefined, locale: Locale): string {
  if (!text) return '';
  return text[locale] ?? text.az ?? text.en ?? Object.values(text).find(Boolean) ?? '';
}

/** AZN, no decimals when the amount is whole — prices here are round numbers. */
export function formatAzn(amount: number | null | undefined, locale: Locale): string {
  if (amount === null || amount === undefined) return '—';
  const hasFraction = Math.abs(amount % 1) > 0.001;
  const n = new Intl.NumberFormat(INTL_LOCALE[locale], {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${n} ₼`;
}

/**
 * Optional second line under the AZN price, for visitors abroad. Returns null
 * unless VITE_SECONDARY_CURRENCY is set, so by default nothing is claimed
 * about exchange rates anywhere in the UI.
 */
export function formatSecondary(amount: number | null | undefined, locale: Locale): string | null {
  if (amount === null || amount === undefined || !currency.secondary) return null;
  const converted = amount * currency.secondaryRate;
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: 'currency',
    currency: currency.secondary,
    maximumFractionDigits: 0,
  }).format(converted);
}

export function formatDate(value: string | null | undefined, locale: Locale): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

export function formatDateTime(value: string | null | undefined, locale: Locale): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/** Groups a card number into 4s for reading aloud: 4169 7388 1234 5678. */
export function formatCardNumber(raw: string): string {
  return raw.replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim();
}

/** IBANs are conventionally read in groups of four. */
export function formatIban(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase().replace(/(.{4})/g, '$1 ').trim();
}

export function initialsOf(name: string | null | undefined): string {
  if (!name) return '—';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
