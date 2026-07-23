import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { LoadingBlock, Shell } from '@/components/ui/Bits';
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
    if (ready && user) navigate('/dashboard', { replace: true });
  }, [ready, user, navigate]);

  // If nothing resolves after a few seconds the link was almost certainly
  // expired or already used. Say so rather than spinning indefinitely.
  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 6000);
    return () => clearTimeout(timer);
  }, []);

  if (ready && !user && timedOut) {
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
