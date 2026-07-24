import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { LoadingBlock, Shell } from '@/components/ui/Bits';
import { ButtonLink } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { POST_AUTH_REDIRECT } from '@/store/auth';

/**
 * Where Google, Microsoft, the email confirmation link and the password-reset
 * link all land. On the implicit flow the session arrives in the URL fragment
 * and Supabase (detectSessionInUrl) parses it.
 *
 * If the provider or Supabase returns an *error* instead, it comes back in the
 * URL too — and a page that just spun on that told nobody anything. So the
 * failure state now shows the actual error text, which is the difference
 * between "it's broken" and knowing exactly what to fix.
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      navigate('/', { replace: true });
      return;
    }

    // The provider may report an error in either the query or the fragment.
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const providerError =
      query.get('error_description') ||
      hash.get('error_description') ||
      query.get('error') ||
      hash.get('error');

    if (providerError) {
      setError(providerError);
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
      // Full-document navigation: the app reboots with the session already
      // persisted, so the protected page renders first time.
      window.location.replace(next);
    }

    async function check() {
      const { data } = await supabase!.auth.getSession();
      if (data.session) leave();
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) leave();
    });

    void check();
    const poll = window.setInterval(() => void check(), 250);

    // No session and no error after this long means the token never arrived —
    // almost always a redirect-URL mismatch in the Supabase auth settings.
    const timer = window.setTimeout(() => {
      if (!settled) {
        window.clearInterval(poll);
        setError('NO_SESSION');
      }
    }, 8000);

    return () => {
      settled = true;
      sub.subscription.unsubscribe();
      window.clearInterval(poll);
      window.clearTimeout(timer);
    };
  }, [navigate]);

  if (error) {
    const isNoSession = error === 'NO_SESSION';
    return (
      <div className="py-40">
        <Shell className="max-w-lg text-center">
          <h1 className="text-d2 font-display">{t('auth.errorGeneric')}</h1>

          {!isNoSession && (
            <p className="mt-5 rounded-2xl bg-red/8 px-5 py-4 text-sm text-ink-soft">{error}</p>
          )}
          {isNoSession && <p className="mt-5 text-ink-soft">{t('auth.callbackNoSession')}</p>}

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
