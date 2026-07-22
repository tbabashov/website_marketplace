import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import { LanguageSwitcher } from './LanguageSwitcher';
import { Button, ButtonLink } from '@/components/ui/Button';
import { useAuth } from '@/store/auth';
import { useUI } from '@/store/ui';
import { initialsOf } from '@/lib/format';

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={clsx('inline-flex items-baseline', className)}>
      <span className="font-display text-h5 font-semibold tracking-tight text-bone">WebSale</span>
      <span className="font-mono text-sm text-cyan">.az</span>
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

  const user = useAuth((s) => s.user);
  const profile = useAuth((s) => s.profile);
  const isOwner = useAuth((s) => s.isOwner);

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Any navigation closes the mobile panel — including a jump to an anchor on
  // the page we are already on, which is why `hash` is a dependency too.
  useEffect(() => {
    setOpen(false);
  }, [pathname, hash, setOpen]);

  // A full-screen panel over a scrollable page scrolls the page behind it.
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

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    clsx(
      'spec px-1 py-2 transition-colors',
      isActive ? 'text-cyan-bright' : 'text-bone-mute hover:text-bone',
    );

  return (
    <header
      className={clsx(
        'sticky top-0 z-40 border-b transition-colors duration-200',
        scrolled ? 'border-rule bg-ink/92 backdrop-blur-md' : 'border-transparent bg-ink',
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-6 px-5 sm:px-8">
        <Link to="/" className="shrink-0" aria-label="WebSale.az">
          <Wordmark />
        </Link>

        <nav aria-label={t('nav.primaryLabel')} className="hidden flex-1 items-center gap-7 lg:flex">
          {navLinks.map((link) =>
            // Anchors into the home page go through the router rather than a
            // plain href, so jumping to #how from /portfolio is a client-side
            // navigation instead of a full reload. ScrollManager handles the
            // scroll once the section exists.
            link.to.startsWith('/#') ? (
              <Link key={link.to} to={link.to} className="spec py-2 text-bone-mute hover:text-bone">
                {t(link.key)}
              </Link>
            ) : (
              <NavLink key={link.to} to={link.to} className={linkClass}>
                {t(link.key)}
              </NavLink>
            ),
          )}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <LanguageSwitcher className="hidden sm:inline-flex" />

          {user ? (
            <div className="hidden items-center gap-2 lg:flex">
              {isOwner && (
                <NavLink to="/admin" className={linkClass}>
                  {t('nav.admin')}
                </NavLink>
              )}
              <NavLink to="/dashboard" className={linkClass}>
                {t('nav.dashboard')}
              </NavLink>
              <Link
                to="/profile"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-rule bg-surface font-mono text-xs text-bone-mute transition-colors hover:border-cyan hover:text-cyan"
                aria-label={t('nav.profile')}
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  initialsOf(profile?.display_name)
                )}
              </Link>
            </div>
          ) : (
            <ButtonLink to="/auth" variant="secondary" size="sm" className="hidden lg:inline-flex">
              {t('nav.signIn')}
            </ButtonLink>
          )}

          <ButtonLink to="/request" size="sm" className="hidden md:inline-flex">
            {t('nav.request')}
          </ButtonLink>

          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen(!open)}
          >
            <span className="spec">{open ? t('nav.closeMenu') : t('nav.openMenu')}</span>
          </Button>
        </div>
      </div>

      {open && (
        <div
          id="mobile-nav"
          className="fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto border-t border-rule bg-ink px-5 py-8 lg:hidden"
        >
          <nav aria-label={t('nav.primaryLabel')} className="flex flex-col">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="border-b border-rule-soft py-4 font-display text-h4 text-bone"
              >
                {t(link.key)}
              </Link>
            ))}

            {user ? (
              <>
                <Link to="/dashboard" className="border-b border-rule-soft py-4 font-display text-h4 text-bone">
                  {t('nav.dashboard')}
                </Link>
                {isOwner && (
                  <Link to="/admin" className="border-b border-rule-soft py-4 font-display text-h4 text-bone">
                    {t('nav.admin')}
                  </Link>
                )}
                <Link to="/profile" className="border-b border-rule-soft py-4 font-display text-h4 text-bone">
                  {t('nav.profile')}
                </Link>
              </>
            ) : (
              <Link to="/auth" className="border-b border-rule-soft py-4 font-display text-h4 text-bone">
                {t('nav.signIn')}
              </Link>
            )}
          </nav>

          <div className="mt-8 flex flex-col gap-5">
            <ButtonLink to="/request" size="lg">
              {t('nav.request')}
            </ButtonLink>
            <LanguageSwitcher className="self-start" />
          </div>
        </div>
      )}
    </header>
  );
}
