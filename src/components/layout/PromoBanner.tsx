import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { supabase } from '@/lib/supabase';
import { useUI } from '@/store/ui';

const CODE = 'DISCOUNTSZN';
const DISMISS_KEY = `websale.promo.${CODE}`;

/**
 * A slim launch strip advertising the standing promo code. It only appears if
 * the code actually validates server-side (so it self-hides the moment the
 * owner deactivates or expires it) and the visitor hasn't dismissed it. The
 * fixed header reads `promoBanner` from the UI store and drops down to make
 * room, so the two never overlap.
 */
export function PromoBanner() {
  const { t } = useTranslation();
  const setPromoBanner = useUI((s) => s.setPromoBanner);
  const [percent, setPercent] = useState<number | null>(null);

  useEffect(() => {
    if (!supabase) return;
    if (localStorage.getItem(DISMISS_KEY) === 'dismissed') return;

    let alive = true;
    void supabase.rpc('validate_promo', { p_code: CODE }).then(({ data }) => {
      if (!alive) return;
      const row = (Array.isArray(data) ? data[0] : data) as
        | { percent_off: number }
        | undefined;
      if (row) {
        setPercent(row.percent_off);
        setPromoBanner(true);
      }
    });
    return () => {
      alive = false;
    };
  }, [setPromoBanner]);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, 'dismissed');
    } catch {
      /* storage unavailable — fine, it just reappears next load */
    }
    setPercent(null);
    setPromoBanner(false);
  }

  if (percent === null) return null;

  return (
    <div
      data-cursor-on-dark
      className="fixed inset-x-0 top-0 z-[130] flex h-9 items-center justify-center gap-3 bg-blue px-10 text-center text-paper"
    >
      <p className="truncate text-xs font-medium sm:text-sm">
        {t('market.bannerText', { percent, code: CODE })}{' '}
        <Link to="/marketplace" data-cursor="link" className="underline underline-offset-2 hover:opacity-80">
          {t('market.bannerCta')}
        </Link>
      </p>
      <button
        type="button"
        data-cursor="link"
        onClick={dismiss}
        aria-label={t('common.close')}
        className="absolute right-3 flex h-6 w-6 items-center justify-center rounded-full text-paper/80 transition-colors hover:bg-paper/15 hover:text-paper"
      >
        <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}
