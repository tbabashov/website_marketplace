import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { LanguageSwitcher } from './LanguageSwitcher';
import { Shell } from '@/components/ui/Bits';
import { site } from '@/config/site';

const socials = [
  { key: 'instagram', label: 'Instagram', href: site.social.instagram },
  { key: 'linkedin', label: 'LinkedIn', href: site.social.linkedin },
  { key: 'github', label: 'GitHub', href: site.social.github },
  { key: 'telegram', label: 'Telegram', href: site.social.telegram },
].filter((s): s is { key: string; label: string; href: string } => Boolean(s.href));

/**
 * Night ground, with the wordmark blown up to fill the width as a closing
 * gesture. It is the only place the logo appears at that scale, which is what
 * makes the page feel finished rather than merely stopped.
 */
export function Footer() {
  const { t } = useTranslation();

  const explore = [
    { to: '/portfolio', key: 'nav.portfolio' },
    { to: '/marketplace', key: 'nav.marketplace' },
    { to: '/request', key: 'nav.request' },
    { to: '/#faq', key: 'nav.faq' },
  ];

  const legal = [
    { to: '/terms', key: 'footer.terms' },
    { to: '/privacy', key: 'footer.privacy' },
    { to: '/refund', key: 'footer.refund' },
  ];

  return (
    <footer className="relative z-[2] bg-night text-paper">
      <Shell className="pt-20 pb-10 md:pt-28">
        <div className="grid gap-14 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <p className="max-w-xs text-lg text-paper/70">{t('footer.tagline')}</p>
            <LanguageSwitcher tone="paper" className="mt-8" />
          </div>

          <nav aria-label={t('nav.footerLabel')}>
            <p className="label text-paper/40">{t('footer.explore')}</p>
            <ul className="mt-5 flex flex-col gap-3.5">
              {explore.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} data-cursor="link" className="ul-swipe text-paper/75 hover:text-paper">
                    {t(l.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label={t('footer.legalHeading')}>
            <p className="label text-paper/40">{t('footer.legalHeading')}</p>
            <ul className="mt-5 flex flex-col gap-3.5">
              {legal.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} data-cursor="link" className="ul-swipe text-paper/75 hover:text-paper">
                    {t(l.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="label text-paper/40">{t('footer.contactHeading')}</p>
            <ul className="mt-5 flex flex-col gap-3.5">
              <li>
                <a
                  href={`mailto:${site.email}`}
                  data-cursor="link"
                  className="ul-swipe break-all text-paper/75 hover:text-paper"
                >
                  {site.email}
                </a>
              </li>
              {site.phone && (
                <li>
                  <a
                    href={`tel:${site.phone.replace(/\s/g, '')}`}
                    data-cursor="link"
                    className="ul-swipe num text-paper/75 hover:text-paper"
                  >
                    {site.phone}
                  </a>
                </li>
              )}
              {socials.length > 0 && (
                <li className="flex flex-wrap gap-x-5 gap-y-2 pt-2">
                  {socials.map((s) => (
                    <a
                      key={s.key}
                      href={s.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      data-cursor="link"
                      className="label text-paper/50 hover:text-paper"
                    >
                      {s.label}
                    </a>
                  ))}
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Oversized wordmark. Decorative — the real one is in the header. */}
        {/* "websale.az" is ~10 characters; at 15.5vw it is wider than the
            content measure on a phone and was overflowing, which widened the
            layout viewport enough to trip the header's own breakpoints. Clip
            it to its own box — it is purely decorative. */}
        <div className="mt-24 select-none overflow-hidden" aria-hidden="true">
          <p className="whitespace-nowrap font-display text-[clamp(3rem,14vw,15rem)] font-extrabold leading-[0.8] tracking-[-0.055em] text-paper/10">
            websale<span className="text-blue/40">.</span>az
          </p>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-night-line pt-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-paper/40">
            {t('footer.rights', { year: new Date().getFullYear() })}
          </p>
          <p className="text-sm text-paper/40">{t('footer.builtNote')}</p>
        </div>
      </Shell>
    </footer>
  );
}
