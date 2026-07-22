/**
 * Every value the Owner is likely to change without touching a component.
 * Anything sourced from an env var falls back to a clearly-marked placeholder
 * so a clean clone still runs and still *looks* finished — but the placeholder
 * text says outright that it is a placeholder, so nothing fake ships by
 * accident.
 */

const env = import.meta.env;

export const IS_PLACEHOLDER = '__PLACEHOLDER__';

/** Reads an env var, returning `null` when it is absent or left blank. */
function opt(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export const site = {
  name: 'WebSale.az',
  /** Used in <title>, OG tags and the sitemap. No trailing slash. */
  url: opt(env.VITE_SITE_URL) ?? 'https://websale.az',
  ownerName: opt(env.VITE_OWNER_NAME) ?? 'WebSale.az',
  email: opt(env.VITE_CONTACT_EMAIL) ?? 'salam@websale.az',
  // No placeholder: a `tel:` link to "+994 XX XXX XX XX" is a dead link that
  // looks live. Until this is set, the footer simply has no phone number.
  phone: opt(env.VITE_CONTACT_PHONE),
  whatsapp: opt(env.VITE_CONTACT_WHATSAPP),
  social: {
    instagram: opt(env.VITE_SOCIAL_INSTAGRAM),
    linkedin: opt(env.VITE_SOCIAL_LINKEDIN),
    github: opt(env.VITE_SOCIAL_GITHUB),
    telegram: opt(env.VITE_SOCIAL_TELEGRAM),
  },
} as const;

/**
 * Currency. Prices live in the database as AZN integers (qəpik-free whole
 * manat). A secondary display currency is opt-in via env so the Owner can
 * turn it on for diaspora traffic without a code change. Rates are manual and
 * indicative — the invoice is always AZN.
 */
export const currency = {
  base: 'AZN' as const,
  /** `null` disables the secondary line entirely. */
  secondary: (opt(env.VITE_SECONDARY_CURRENCY) as 'USD' | 'EUR' | null) ?? null,
  /** Indicative rate: 1 AZN = X secondary. Refresh manually when it drifts. */
  secondaryRate: Number(env.VITE_SECONDARY_RATE ?? '0.59'),
};

/**
 * Where buyers send money. Receiving details only — a card number and an IBAN
 * are all that is needed to *receive* a transfer. CVV and expiry are what you
 * need to *spend* from a card, so they are deliberately absent here and are
 * never collected anywhere in this codebase.
 */
export const payment = {
  bankName: opt(env.VITE_PAY_BANK_NAME) ?? IS_PLACEHOLDER,
  accountHolder: opt(env.VITE_PAY_ACCOUNT_HOLDER) ?? IS_PLACEHOLDER,
  cardNumber: opt(env.VITE_PAY_CARD_NUMBER) ?? IS_PLACEHOLDER,
  iban: opt(env.VITE_PAY_IBAN) ?? IS_PLACEHOLDER,
  /** e.g. "m10, Birbank" — free text, shown as "also accepted via". */
  wallets: opt(env.VITE_PAY_WALLETS),
  /** Default deposit share for custom orders, 0–100. 0 disables the split. */
  depositPercent: Number(env.VITE_DEPOSIT_PERCENT ?? '40'),
} as const;

export function hasPaymentDetails(): boolean {
  return payment.cardNumber !== IS_PLACEHOLDER || payment.iban !== IS_PLACEHOLDER;
}

/**
 * Landing-page proof bar. These are the Owner's real numbers and must stay
 * `null` until he fills them in — an unfilled stat renders as an explicit
 * "not filled in yet" slot rather than an invented figure.
 */
export const stats = {
  sitesShipped: opt(env.VITE_STAT_SITES_SHIPPED),
  industries: opt(env.VITE_STAT_INDUSTRIES),
  avgTurnaroundWeeks: opt(env.VITE_STAT_TURNAROUND_WEEKS),
  yearsBuilding: opt(env.VITE_STAT_YEARS),
} as const;

export const SUPPORTED_LOCALES = ['az', 'en', 'ru'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'az';

export const LOCALE_LABELS: Record<Locale, { short: string; full: string }> = {
  az: { short: 'AZ', full: 'Azərbaycanca' },
  en: { short: 'EN', full: 'English' },
  ru: { short: 'RU', full: 'Русский' },
};

/** BCP-47 tags for Intl date/number formatting. */
export const INTL_LOCALE: Record<Locale, string> = {
  az: 'az-AZ',
  en: 'en-GB',
  ru: 'ru-RU',
};
