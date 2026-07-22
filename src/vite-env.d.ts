/// <reference types="vite/client" />

/**
 * The full environment contract. Everything here is optional: the app boots
 * with none of it set and falls back to demo content and marked placeholders
 * (see src/config/site.ts). Keep this in sync with .env.example.
 */
interface ImportMetaEnv {
  // Backend
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;

  // Identity
  readonly VITE_SITE_URL?: string;
  readonly VITE_OWNER_NAME?: string;
  readonly VITE_CONTACT_EMAIL?: string;
  readonly VITE_CONTACT_PHONE?: string;
  readonly VITE_CONTACT_WHATSAPP?: string;

  readonly VITE_SOCIAL_INSTAGRAM?: string;
  readonly VITE_SOCIAL_LINKEDIN?: string;
  readonly VITE_SOCIAL_GITHUB?: string;
  readonly VITE_SOCIAL_TELEGRAM?: string;

  // Money in (receiving details only — never card secrets)
  readonly VITE_PAY_BANK_NAME?: string;
  readonly VITE_PAY_ACCOUNT_HOLDER?: string;
  readonly VITE_PAY_CARD_NUMBER?: string;
  readonly VITE_PAY_IBAN?: string;
  readonly VITE_PAY_WALLETS?: string;
  readonly VITE_DEPOSIT_PERCENT?: string;

  // Optional second display currency
  readonly VITE_SECONDARY_CURRENCY?: 'USD' | 'EUR';
  readonly VITE_SECONDARY_RATE?: string;

  // Proof bar — blank until the Owner has real numbers
  readonly VITE_STAT_SITES_SHIPPED?: string;
  readonly VITE_STAT_INDUSTRIES?: string;
  readonly VITE_STAT_TURNAROUND_WEEKS?: string;
  readonly VITE_STAT_YEARS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
