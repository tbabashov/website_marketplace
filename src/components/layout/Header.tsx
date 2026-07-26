import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import { LanguageSwitcher } from './LanguageSwitcher';
import { ButtonLink } from '@/components/ui/Button';
import { useAuth } from '@/store/auth';
import { useUI } from '@/store/ui';
import { initialsOf } from '@/lib/format';

/** Shopping-cart mark (with wheels) for the orders link. */
function CartIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
      <path d="M2 3h2.2l2.35 12.2a1.6 1.6 0 0 0 1.6 1.3h8.5a1.6 1.6 0 0 0 1.57-1.27L21 7.5H5.4" />
    </svg>
  );
}

export function Wordmark({ className, tone = 'ink' }: { className?: string; tone?: 'ink' | 'paper' }) {
  return (
    <span
      className={clsx(
        'font-display text-[1.0625rem] font-extrabold tracking-[-0.045em]',
        tone === 'ink' ? 'text-ink' : 'text-paper',
        className,
      )}
    >
      websale<span className="text-blue">.</span>az
    </span>
  );
}

const navLinks = [
  { to: '/portfolio', key: 'nav.portfolio' },
  { to: '/marketplace', key: 'nav.marketplace' },
  { to: '/#how', key: 'nav.how' },
  { to: '/#faq', key: 'nav.faq' },
] as const;

export function Header() {
  const { t } = useTranslation();
  const { pathname, hash } = useLocation();
  const open = useUI((s) => s.mobileNavOpen);
  const setOpen = useUI((s) => s.setMobileNav);
  const promoBanner = useUI((s) => s.promoBanner);

  const user = useAuth((s) => s.user);
  const profile = useAuth((s) => s.profile);
  const isOwner = useAuth((s) => s.isOwner);

  const [lifted, setLifted] = useState(false);

  // Past the first screen the bar condenses onto a floating paper pill, so it
  // stops competing with the hero and starts behaving like a toolbar.
  useEffect(() => {
    const onScroll = () => setLifted(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname, hash, setOpen]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  const link = ({ isActive }: { isActive: boolean }) =>
    clsx(
      'ul-swipe text-sm font-medium transition-colors duration-200',
      isActive ? 'text-blue' : 'text-ink-soft hover:text-ink',
    );

  return (
    <header
      className="pointer-events-none fixed inset-x-0 z-[120] pt-4 transition-[top] duration-300 md:pt-5"
      style={{ top: promoBanner ? '2.25rem' : 0 }}
    >
      <div className="mx-auto w-full max-w-[1440px] px-2 md:px-6">
        <div
          className={clsx(
            'pointer-events-auto flex h-16 items-center gap-6 rounded-full pl-4 pr-3 transition-all duration-500',
            // Opaque while the mobile menu is open too — otherwise, at the top
            // of the page the bar is transparent and the menu behind it shows
            // through, so the wordmark collides with the first nav link.
            lifted || open
              ? 'bg-paper/80 shadow-[0_8px_40px_-12px_rgba(18,18,16,0.22)] backdrop-blur-xl'
              : 'bg-transparent',
          )}
        >
          <Link to="/" data-cursor="link" className="shrink-0" aria-label="WebSale.az">
            <Wordmark />
          </Link>

          <nav aria-label={t('nav.primaryLabel')} className="ml-6 hidden items-center gap-8 lg:flex">
            {navLinks.map((l) =>
              // A hash link resolves to pathname "/", so NavLink marks *every*
              // one of them active on the home page — which is why two links
              // lit up at once. They are jump links within a page, not
              // destinations, so they get no active state at all.
              l.to.startsWith('/#') ? (
                <Link
                  key={l.to}
                  to={l.to}
                  data-cursor="link"
                  className="ul-swipe text-sm font-medium text-ink-soft transition-colors duration-200 hover:text-ink"
                >
                  {t(l.key)}
                </Link>
              ) : (
                <NavLink key={l.to} to={l.to} data-cursor="link" className={link}>
                  {t(l.key)}
                </NavLink>
              ),
            )}
          </nav>

          <div className="ml-auto flex items-center gap-2.5">
            {/* Desktop cluster. Everything below lg lives in the mobile menu,
                so ONE wrapper gates the whole group. This matters: putting
                `hidden lg:…` on the LanguageSwitcher or the CTA did nothing,
                because their own base classes already set `inline-flex`, which
                won over `hidden` — so they stayed visible on phones, widened
                the bar past the viewport, and tipped iOS into its desktop
                layout. A plain wrapper has no base display to fight. */}
            <div className="hidden items-center gap-5 lg:flex">
              <LanguageSwitcher />

              {user ? (
                <>
                  {isOwner && (
                    <NavLink to="/admin" data-cursor="link" className={link}>
                      {t('nav.admin')}
                    </NavLink>
                  )}
                  <NavLink
                    to="/dashboard"
                    data-cursor="link"
                    className={({ isActive }) =>
                      clsx(link({ isActive }), 'inline-flex items-center gap-1.5')
                    }
                  >
                    <CartIcon />
                    {t('nav.dashboard')}
                  </NavLink>
                  <Link
                    to="/profile"
                    data-cursor="link"
                    className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-ink text-xs font-bold text-paper transition-colors hover:bg-blue"
                    aria-label={t('nav.profile')}
                  >
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      initialsOf(profile?.display_name)
                    )}
                  </Link>
                </>
              ) : (
                <NavLink to="/auth" data-cursor="link" className={link}>
                  {t('nav.signIn')}
                </NavLink>
              )}

              <ButtonLink to="/request" size="sm">
                {t('nav.request')}
              </ButtonLink>
            </div>

            {/* Mobile toggle — two rounded bars that cross into an X. */}
            <button
              type="button"
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? t('nav.closeMenu') : t('nav.openMenu')}
              data-cursor="link"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-paper lg:hidden"
            >
              <span className="relative block h-3.5 w-[18px]">
                <span
                  className={clsx(
                    'absolute left-0 block h-[2px] w-full rounded-full bg-current transition-all duration-300',
                    open ? 'top-[6px] rotate-45' : 'top-[3px]',
                  )}
                />
                <span
                  className={clsx(
                    'absolute left-0 block h-[2px] w-full rounded-full bg-current transition-all duration-300',
                    open ? 'top-[6px] -rotate-45' : 'top-[10px]',
                  )}
                />
              </span>
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div
          id="mobile-nav"
          className={clsx(
            'pointer-events-auto fixed inset-0 top-0 z-[-1] overflow-y-auto bg-paper px-6 pb-10 lg:hidden',
            promoBanner ? 'pt-32' : 'pt-28',
          )}
        >
          <nav aria-label={t('nav.primaryLabel')} className="flex flex-col">
            {[
              ...navLinks,
              ...(user
                ? ([
                    { to: '/dashboard', key: 'nav.dashboard' },
                    ...(isOwner ? [{ to: '/admin', key: 'nav.admin' }] : []),
                    { to: '/profile', key: 'nav.profile' },
                  ] as const)
                : ([{ to: '/auth', key: 'nav.signIn' }] as const)),
            ].map((l, i) => (
              <Link
                key={l.to}
                to={l.to}
                className="fade-up flex items-center gap-3 border-b border-line py-5 font-display text-d3"
                style={{ '--d': `${i * 45}ms` } as React.CSSProperties}
              >
                {t(l.key)}
              </Link>
            ))}
          </nav>

          <div className="mt-10 flex flex-col gap-6">
            <ButtonLink to="/request" size="lg" className="w-full">
              {t('nav.request')}
            </ButtonLink>
            <LanguageSwitcher className="self-start" />
          </div>
        </div>
      )}
    </header>
  );
}
