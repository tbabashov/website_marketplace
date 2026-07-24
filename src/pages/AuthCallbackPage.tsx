import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { LoadingBlock, Shell } from '@/components/ui/Bits';
import { ButtonLink } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { POST_AUTH_REDIRECT, useAuth } from '@/store/auth';

/**
 * Where Google, Microsoft, the email confirmation link and the password-reset
 * link all land. Supabase parses the URL fragment itself (detectSessionInUrl);
 * this page waits for the resulting session and then sends the visitor on.
 *
 * It drives the session directly — checking getSession() *and* listening for
 * the auth-change event, then pushing the result into the store itself — so it
 * never blanks out because the store happened to miss the sign-in event, which
 * is what made it hang here until a manual reload.
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const applySession = useAuth((s) => s.applySession);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!supabase) {
      navigate('/', { replace: true });
      return;
    }

    let settled = false;

    const finish = (session: import('@supabase/supabase-js').Session | null) => {
      if (settled || !session) return;
      settled = true;

      // Put the session into the store *before* navigating, so the protected
      // route we land on already sees a signed-in user and does not bounce.
      applySession(session);

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
      navigate(next, { replace: true });
    };

    // Catch the session however it arrives first: already present, or via the
    // event once detectSessionInUrl finishes exchanging the code/fragment.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => finish(session));
    void supabase.auth.getSession().then(({ data }) => finish(data.session));

    // A link that was expired or already used never produces a session.
    const timer = setTimeout(() => {
      if (!settled) setFailed(true);
    }, 8000);

    return () => {
      settled = true;
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [navigate, applySession]);

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
