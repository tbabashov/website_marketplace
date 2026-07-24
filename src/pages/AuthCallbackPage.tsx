import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { LoadingBlock, Shell } from '@/components/ui/Bits';
import { ButtonLink } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { POST_AUTH_REDIRECT } from '@/store/auth';

/**
 * Where Google, Microsoft, the email confirmation link and the password-reset
 * link all land. Supabase parses the URL itself (detectSessionInUrl) and, on
 * the default PKCE flow, exchanges the returned code for a session
 * asynchronously.
 *
 * That exchange is the whole problem this page used to trip over: checking for
 * the session once, at mount, could run before the exchange finished, and if
 * the sign-in event was also missed the page just hung on a blank
 * /auth/callback until a manual reload (by which point the session was saved).
 *
 * So this waits properly: it listens for the auth event *and* polls
 * getSession() until the session appears, then leaves via a full navigation —
 * the same thing the manual reload did, which guarantees the destination loads
 * with the session already in place.
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!supabase) {
      navigate('/', { replace: true });
      return;
    }

    // A provider that returns an explicit error never yields a session; don't
    // make the visitor wait out the timeout for it.
    const params = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    if (params.get('error') || hash.get('error')) {
      setFailed(true);
      return;
    }

    let settled = false;

    function leave() {
      if (settled) return;
      settled = true;

      let next = '/dashboard';
      try {
        const stored = sessionStorage.getItem(POST_AUTH_REDIRECT);
        if (stored) {
          next = stored;
          sessionStorage.removeItem(POST_AUTH_REDIRECT);
        }
      } catch {
        // Storage unavailable — the default destination is fine.
      }

      // A full-document navigation, not an SPA one: the app reboots with the
      // session already persisted, so the protected page renders first time.
      // This is exactly what the manual reload was doing by hand.
      window.location.replace(next);
    }

    async function check(): Promise<boolean> {
      const { data } = await supabase!.auth.getSession();
      if (data.session) {
        leave();
        return true;
      }
      return false;
    }

    // Fast path: the event fires the instant the exchange completes.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) leave();
    });

    // Robust path: keep asking until the exchange has landed. detectSessionInUrl
    // persists the session even if the event slips past us, so a poll always
    // catches it eventually.
    void check();
    const poll = window.setInterval(() => void check(), 250);

    const timer = window.setTimeout(() => {
      if (!settled) {
        window.clearInterval(poll);
        setFailed(true);
      }
    }, 10000);

    return () => {
      settled = true;
      sub.subscription.unsubscribe();
      window.clearInterval(poll);
      window.clearTimeout(timer);
    };
  }, [navigate]);

  if (failed) {
    return (
      <div className="py-40">
        <Shell className="max-w-md text-center">
          <h1 className="text-d2 font-display">{t('auth.errorGeneric')}</h1>
          <ButtonLink to="/auth" variant="outline" className="mt-8">
            {t('auth.signInAction')}
          </ButtonLink>
        </Shell>
      </div>
    );
  }

  return (
    <div className="py-32">
      <LoadingBlock />
    </div>
  );
}
