import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { Wordmark } from './Header';
import { LanguageSwitcher } from './LanguageSwitcher';
import { site } from '@/config/site';

const socials = [
  { key: 'instagram', label: 'Instagram', href: site.social.instagram },
  { key: 'linkedin', label: 'LinkedIn', href: site.social.linkedin },
  { key: 'github', label: 'GitHub', href: site.social.github },
  { key: 'telegram', label: 'Telegram', href: site.social.telegram },
].filter((s): s is { key: string; label: string; href: string } => Boolean(s.href));

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-rule bg-ink-deep">
      <div className="mx-auto max-w-[1400px] px-5 py-16 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.6fr_1fr_1fr_1.2fr]">
          <div>
            <Wordmark />
            <p className="mt-4 max-w-xs text-sm text-bone-mute">{t('footer.tagline')}</p>
            <LanguageSwitcher className="mt-6" />
          </div>

          <nav aria-label={t('nav.footerLabel')}>
            <p className="spec mb-4 text-bone-faint">{t('footer.explore')}</p>
            <ul className="flex flex-col gap-3 text-sm">
              <li>
                <Link to="/portfolio" className="text-bone-mute hover:text-cyan">
                  {t('nav.portfolio')}
                </Link>
              </li>
              <li>
                <Link to="/marketplace" className="text-bone-mute hover:text-cyan">
                  {t('nav.marketplace')}
                </Link>
              </li>
              <li>
                <Link to="/request" className="text-bone-mute hover:text-cyan">
                  {t('nav.request')}
                </Link>
              </li>
              <li>
                <Link to="/#faq" className="text-bone-mute hover:text-cyan">
                  {t('nav.faq')}
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label={t('footer.legalHeading')}>
            <p className="spec mb-4 text-bone-faint">{t('footer.legalHeading')}</p>
            <ul className="flex flex-col gap-3 text-sm">
              <li>
                <Link to="/terms" className="text-bone-mute hover:text-cyan">
                  {t('footer.terms')}
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-bone-mute hover:text-cyan">
                  {t('footer.privacy')}
                </Link>
              </li>
              <li>
                <Link to="/refund" className="text-bone-mute hover:text-cyan">
                  {t('footer.refund')}
                </Link>
              </li>
            </ul>
          </nav>

          <div>
            <p className="spec mb-4 text-bone-faint">{t('footer.contactHeading')}</p>
            <ul className="flex flex-col gap-3 text-sm">
              <li>
                <a href={`mailto:${site.email}`} className="text-bone-mute hover:text-cyan">
                  {site.email}
                </a>
              </li>
              {site.phone && (
                <li>
                  <a
                    href={`tel:${site.phone.replace(/\s/g, '')}`}
                    className="font-mono text-bone-mute hover:text-cyan"
                  >
                    {site.phone}
                  </a>
                </li>
              )}
              {socials.length > 0 && (
                <li className="flex flex-wrap gap-4 pt-1">
                  {socials.map((s) => (
                    <a
                      key={s.key}
                      href={s.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="spec text-bone-faint hover:text-cyan"
                    >
                      {s.label}
                    </a>
                  ))}
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-rule-soft pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="spec text-bone-faint">{t('footer.rights', { year: new Date().getFullYear() })}</p>
          <p className="spec text-bone-faint/70">{t('footer.builtNote')}</p>
        </div>
      </div>
    </footer>
  );
}
