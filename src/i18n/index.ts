import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from '@/config/site';

const STORAGE_KEY = 'websale.locale';

/**
 * Locales are loaded on demand rather than bundled together. Three complete
 * translations is roughly 100 kB of JSON, and shipping the two a visitor is
 * not reading would be the single biggest thing standing between them and the
 * hero rendering.
 */
const loaders: Record<Locale, () => Promise<{ default: Record<string, unknown> }>> = {
  az: () => import('./locales/az.json'),
  en: () => import('./locales/en.json'),
  ru: () => import('./locales/ru.json'),
};

const loaded = new Set<Locale>();

async function loadLocale(locale: Locale): Promise<void> {
  if (loaded.has(locale)) return;
  const module = await loaders[locale]();
  i18n.addResourceBundle(locale, 'translation', module.default, true, true);
  loaded.add(locale);
}

function isLocale(value: string | null | undefined): value is Locale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * Language resolution:
 *   1. An explicit choice the visitor made before (localStorage).
 *   2. Otherwise Azerbaijani.
 *
 * The site serves Azerbaijani businesses, so a first visit always opens in
 * Azerbaijani regardless of the browser's language — a Russian- or
 * English-language browser still lands on `az` and can switch from the header.
 * The `?lang=` query param (see useLangQueryParam) still overrides for shared
 * links, and any switch is remembered for next time.
 */
export function resolveInitialLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    // Private browsing or a blocked storage partition — fall through.
  }

  return DEFAULT_LOCALE;
}

function persist(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Not being able to remember the choice is not worth an error.
  }
  document.documentElement.lang = locale;
}

/**
 * Switch language. Loads the bundle *before* switching so the UI never flashes
 * raw translation keys on the way through.
 */
export async function setLocale(locale: Locale): Promise<void> {
  if (!isLocale(locale) || i18n.language === locale) return;
  await loadLocale(locale);
  await i18n.changeLanguage(locale);
  persist(locale);
}

/** Called once from main.tsx before the first render. */
export async function initI18n(): Promise<void> {
  const initial = resolveInitialLocale();

  await i18n.use(initReactI18next).init({
    resources: {},
    lng: initial,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: SUPPORTED_LOCALES as unknown as string[],
    interpolation: { escapeValue: false },
    returnObjects: true,
    react: { useSuspense: false },
  });

  await loadLocale(initial);
  document.documentElement.lang = initial;

  // Warm the fallback in the background so that if a key is ever added to one
  // locale and forgotten in another, the visitor sees Azerbaijani rather than
  // a raw key. Deliberately not awaited — it must not delay first paint.
  if (initial !== DEFAULT_LOCALE) {
    void loadLocale(DEFAULT_LOCALE);
  }
}

export default i18n;
