import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { Wordmark } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Field, TextInput } from '@/components/ui/Form';
import { Spinner } from '@/components/ui/Bits';
import { isSupabaseConfigured } from '@/lib/supabase';
import { NOT_CONFIGURED, POST_AUTH_REDIRECT, useAuth } from '@/store/auth';
import { authProviders } from '@/config/site';

type Mode = 'signin' | 'signup' | 'reset';

function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" width="16" height="16" aria-hidden="true">
      <path fill="#4285F4" d="M17.6 9.2c0-.6-.1-1.3-.2-1.9H9v3.5h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.5z" />
      <path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.5-1.8.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.9 10.7a5.4 5.4 0 0 1 0-3.4V5H.9a9 9 0 0 0 0 8l3-2.3z" />
      <path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.4 1.3l2.6-2.6A9 9 0 0 0 .9 5l3 2.3C4.6 5.2 6.6 3.6 9 3.6z" />
    </svg>
  );
}

function MicrosoftMark() {
  return (
    <svg viewBox="0 0 18 18" width="16" height="16" aria-hidden="true">
      <path fill="#F25022" d="M1 1h7.6v7.6H1z" />
      <path fill="#7FBA00" d="M9.4 1H17v7.6H9.4z" />
      <path fill="#00A4EF" d="M1 9.4h7.6V17H1z" />
      <path fill="#FFB900" d="M9.4 9.4H17V17H9.4z" />
    </svg>
  );
}

export default function AuthPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') ?? '/dashboard';

  const user = useAuth((s) => s.user);
  const signInWithProvider = useAuth((s) => s.signInWithProvider);
  const signInWithPassword = useAuth((s) => s.signInWithPassword);
  const signUpWithPassword = useAuth((s) => s.signUpWithPassword);
  const sendPasswordReset = useAuth((s) => s.sendPasswordReset);

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Anyone who lands here already signed in goes straight where they meant to.
  useEffect(() => {
    if (user) navigate(next, { replace: true });
  }, [user, next, navigate]);

  function describe(raw: string | undefined): string {
    if (!raw) return t('auth.errorGeneric');
    if (raw === NOT_CONFIGURED) return t('auth.notConfigured');
    if (/invalid login credentials/i.test(raw)) return t('auth.errorInvalid');
    // Raised when a provider button is pressed before that provider has been
    // switched on in Supabase. Only reachable during setup, but the raw error
    // is JSON, and nobody should ever be shown JSON.
    if (/provider is not enabled|unsupported provider/i.test(raw)) {
      return t('auth.errorProviderOff');
    }
    return raw;
  }

  async function oauth(provider: 'google' | 'azure') {
    setError(null);
    setBusy(true);
    // OAuth leaves the app entirely, so `next` can't ride on component state.
    // Stash it for the callback page to pick up on return.
    try {
      sessionStorage.setItem(POST_AUTH_REDIRECT, next);
    } catch {
      // Storage blocked — the callback falls back to the dashboard.
    }
    const { error: err } = await signInWithProvider(provider);
    if (err) {
      setBusy(false);
      setError(describe(err));
    }
    // On success the browser is already navigating to the provider.
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);

    if (mode === 'reset') {
      const { error: err } = await sendPasswordReset(email.trim());
      setBusy(false);
      if (err) setError(describe(err));
      else setNotice(t('auth.resetSent'));
      return;
    }

    if (mode === 'signup') {
      const { error: err, needsVerification } = await signUpWithPassword(
        email.trim(),
        password,
        displayName.trim(),
      );
      setBusy(false);
      if (err) {
        setError(describe(err));
        return;
      }
      if (needsVerification) {
        setNotice(t('auth.verifyBody', { email: email.trim() }));
        return;
      }
      navigate(next, { replace: true });
      return;
    }

    const { error: err } = await signInWithPassword(email.trim(), password);
    setBusy(false);
    if (err) setError(describe(err));
    else navigate(next, { replace: true });
  }

  // With no provider switched on, the divider would read "or use your email"
  // above the only option there is.
  const showOAuth = authProviders.google || authProviders.microsoft;

  const heading = mode === 'signup' ? t('auth.signUpTitle') : mode === 'reset' ? t('auth.resetTitle') : t('auth.signInTitle');
  const lead = mode === 'signup' ? t('auth.signUpLead') : mode === 'reset' ? t('auth.resetLead') : t('auth.signInLead');

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-lg flex-col justify-center px-6 pb-24 pt-36 md:pt-44">
      <div className="rounded-[1.75rem] bg-paper-2 p-8 md:p-10">
        <Wordmark />

        <h1 className="mt-9 font-display text-d2">{heading}</h1>
        <p className="mt-4 text-ink-soft">{lead}</p>

        {!isSupabaseConfigured && (
          <p className="mt-6 rounded-2xl bg-amber/10 px-4 py-3 text-sm text-ink-soft">
            {t('auth.notConfigured')}
          </p>
        )}

        {mode !== 'reset' && showOAuth && (
          <>
            <div className="mt-8 flex flex-col gap-3">
              {authProviders.google && (
                <Button variant="outline" onClick={() => void oauth('google')} disabled={busy}>
                  <GoogleMark />
                  {t('auth.google')}
                </Button>
              )}
              {authProviders.microsoft && (
                <Button variant="outline" onClick={() => void oauth('azure')} disabled={busy}>
                  <MicrosoftMark />
                  {t('auth.microsoft')}
                </Button>
              )}
            </div>

            <div className="my-8 flex items-center gap-4">
              <span className="h-px flex-1 bg-line" />
              <span className="label text-ink-mute">{t('auth.orEmail')}</span>
              <span className="h-px flex-1 bg-line" />
            </div>
          </>
        )}

        <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-6">
          {mode === 'signup' && (
            <Field label={t('auth.displayName')}>
              {({ id }) => (
                <TextInput
                  id={id}
                  autoComplete="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              )}
            </Field>
          )}

          <Field label={t('auth.email')}>
            {({ id }) => (
              <TextInput
                id={id}
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            )}
          </Field>

          {mode !== 'reset' && (
            <Field label={t('auth.password')} hint={mode === 'signup' ? t('auth.passwordHint') : undefined}>
              {({ id, describedBy }) => (
                <TextInput
                  id={id}
                  type="password"
                  aria-describedby={describedBy}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              )}
            </Field>
          )}

          {error && (
            <p role="alert" className="text-sm text-red">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="text-sm text-green">
              {notice}
            </p>
          )}

          <Button type="submit" size="lg" disabled={busy}>
            {busy && <Spinner />}
            {mode === 'signup'
              ? t('auth.signUpAction')
              : mode === 'reset'
                ? t('auth.resetAction')
                : t('auth.signInAction')}
          </Button>
        </form>

        <div className="mt-7 flex flex-col gap-2 border-t border-line pt-6 text-sm">
          {mode === 'signin' && (
            <>
              <p className="text-ink-soft">
                {t('auth.noAccount')}{' '}
                <button type="button" onClick={() => setMode('signup')} className="text-blue hover:text-blue">
                  {t('auth.signUpAction')}
                </button>
              </p>
              <button
                type="button"
                onClick={() => setMode('reset')}
                className="self-start text-ink-mute hover:text-blue"
              >
                {t('auth.forgot')}
              </button>
            </>
          )}
          {mode !== 'signin' && (
            <p className="text-ink-soft">
              {t('auth.haveAccount')}{' '}
              <button type="button" onClick={() => setMode('signin')} className="text-blue hover:text-blue">
                {t('auth.signInAction')}
              </button>
            </p>
          )}
        </div>
      </div>

      <Link to="/" className="label mt-8 self-center text-ink-mute hover:text-blue">
        ← {t('auth.backToSite')}
      </Link>
    </div>
  );
}
