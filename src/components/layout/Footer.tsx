import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { LanguageSwitcher } from './LanguageSwitcher';
import { Shell } from '@/components/ui/Bits';
import { site } from '@/config/site';

/** Brand glyphs for the social buttons. Single-path marks from simple-icons. */
const GLYPHS: Record<string, string> = {
  whatsapp:
    'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.297-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.334.101 11.892c0 2.096.549 4.142 1.595 5.945L0 24l6.335-1.652a12.062 12.062 0 005.71 1.447h.006c6.585 0 11.946-5.335 11.949-11.893a11.821 11.821 0 00-3.48-8.413z',
  instagram:
    'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069M12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0m0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324M12 16a4 4 0 110-8 4 4 0 010 8m6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881',
  github:
    'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
};

const waNumber = (site.whatsapp ?? site.phone)?.replace(/[^\d]/g, '');

const socialButtons = [
  waNumber ? { key: 'whatsapp', label: 'WhatsApp', href: `https://wa.me/${waNumber}` } : null,
  site.social.instagram ? { key: 'instagram', label: 'Instagram', href: site.social.instagram } : null,
  site.social.github ? { key: 'github', label: 'GitHub', href: site.social.github } : null,
].filter((s): s is { key: string; label: string; href: string } => Boolean(s));

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
    <footer data-cursor-on-dark
      className="relative z-[2] bg-night text-paper">
      <Shell className="pt-20 pb-10 md:pt-28">
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-[1.4fr_minmax(0,1fr)_minmax(0,1fr)_1fr]">
          <div>
            <p className="max-w-xs text-lg text-paper/70">{t('footer.tagline')}</p>
            <LanguageSwitcher tone="paper" className="mt-8" />

            {socialButtons.length > 0 && (
              <div className="mt-8 flex gap-3">
                {socialButtons.map((s) => (
                  <a
                    key={s.key}
                    href={s.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    data-cursor="link"
                    aria-label={s.label}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-night-line bg-paper/5 text-paper/70 transition-colors duration-200 hover:border-transparent hover:bg-paper hover:text-night"
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                      <path d={GLYPHS[s.key]} />
                    </svg>
                  </a>
                ))}
              </div>
            )}
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
