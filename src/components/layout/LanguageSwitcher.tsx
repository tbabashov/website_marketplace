import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import { LOCALE_LABELS, SUPPORTED_LOCALES, type Locale } from '@/config/site';
import { setLocale } from '@/i18n';

/**
 * Three segments rather than a dropdown. With only three languages a select
 * hides two of them behind a click for no benefit, and the current language is
 * always visible this way.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n, t } = useTranslation();
  const current = i18n.language as Locale;

  function choose(locale: Locale) {
    void setLocale(locale);
  }

  return (
    <div
      className={clsx('inline-flex items-center border border-rule-soft', className)}
      role="group"
      aria-label={t('lang.label')}
    >
      {SUPPORTED_LOCALES.map((locale, index) => {
        const active = current === locale;
        return (
          <button
            key={locale}
            type="button"
            onClick={() => choose(locale)}
            aria-current={active ? 'true' : undefined}
            aria-label={t('lang.switchTo', { language: LOCALE_LABELS[locale].full })}
            className={clsx(
              'spec px-2.5 py-1.5 transition-colors',
              index > 0 && 'border-l border-rule-soft',
              active ? 'bg-cyan/10 text-cyan-bright' : 'text-bone-faint hover:text-bone',
            )}
          >
            {LOCALE_LABELS[locale].short}
          </button>
        );
      })}
    </div>
  );
}
