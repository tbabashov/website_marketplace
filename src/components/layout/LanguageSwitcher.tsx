import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import { LOCALE_LABELS, SUPPORTED_LOCALES, type Locale } from '@/config/site';
import { setLocale } from '@/i18n';

/**
 * Three inline codes with a cobalt pill sliding under the active one. With
 * only three languages, hiding two behind a dropdown costs a click and buys
 * nothing.
 */
export function LanguageSwitcher({
  className,
  tone = 'ink',
}: {
  className?: string;
  tone?: 'ink' | 'paper';
}) {
  const { i18n, t } = useTranslation();
  const current = i18n.language as Locale;

  return (
    <div
      className={clsx(
        'inline-flex items-center rounded-full p-1',
        tone === 'ink' ? 'bg-ink/6' : 'bg-paper/12',
        className,
      )}
      role="group"
      aria-label={t('lang.label')}
    >
      {SUPPORTED_LOCALES.map((locale) => {
        const active = current === locale;
        return (
          <button
            key={locale}
            type="button"
            data-cursor="link"
            onClick={() => void setLocale(locale)}
            aria-current={active ? 'true' : undefined}
            aria-label={t('lang.switchTo', { language: LOCALE_LABELS[locale].full })}
            className={clsx(
              'label rounded-full px-2.5 py-1.5 transition-colors duration-300',
              active
                ? 'bg-blue text-paper'
                : tone === 'ink'
                  ? 'text-ink-mute hover:text-ink'
                  : 'text-paper/50 hover:text-paper',
            )}
          >
            {LOCALE_LABELS[locale].short}
          </button>
        );
      })}
    </div>
  );
}
