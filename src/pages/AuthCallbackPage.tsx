import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { LoadingBlock } from '@/components/ui/Bits';
import { ButtonLink } from '@/components/ui/Button';
import { useAuth } from '@/store/auth';

/**
 * Where Google, Microsoft, the email confirmation link and the password-reset
 * link all land. The Supabase client parses the URL fragment itself (see
 * `detectSessionInUrl`); this page waits for the resulting auth state and then
 * gets out of the way.
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const ready = useAuth((s) => s.ready);
  const user = useAuth((s) => s.user);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (ready && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [ready, user, navigate]);

  // If nothing has resolved after a few seconds the link was almost certainly
  // expired or already used. Say so instead of spinning indefinitely.
  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 6000);
    return () => clearTimeout(timer);
  }, []);

  if (ready && !user && timedOut) {
    return (
      <div className="mx-auto max-w-md px-5 py-32 text-center">
        <h1 className="font-display text-h2 text-bone">{t('auth.errorGeneric')}</h1>
        <ButtonLink to="/auth" variant="secondary" className="mt-8">
          {t('auth.signInAction')}
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="py-24">
      <LoadingBlock />
    </div>
  );
}
