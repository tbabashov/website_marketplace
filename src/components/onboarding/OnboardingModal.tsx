import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import { Arrow, Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/auth';

/** value keys are stored verbatim in the profile; labels come from i18n. */
const QUESTIONS = [
  { key: 'heard_from', options: ['instagram', 'tiktok', 'youtube', 'google', 'referral', 'portfolio', 'other'] },
  { key: 'looking_for', options: ['templates', 'custom', 'exploring', 'other'] },
  { key: 'business_type', options: ['restaurant', 'realestate', 'consulting', 'healthcare', 'other'] },
] as const;

type Answers = { heard_from?: string; looking_for?: string; business_type?: string };

/**
 * A one-time survey shown the first time a signed-in user lands, gated on
 * profile.onboarded_at being null. Every question is optional and Skip is always
 * available — the point is a soft signal, not a wall. Answers are saved on the
 * profile (owner insight) and "what are you looking for?" routes the user to the
 * most relevant page so their first click is already useful.
 */
export function OnboardingModal() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const ready = useAuth((s) => s.ready);
  const user = useAuth((s) => s.user);
  const profile = useAuth((s) => s.profile);
  const refreshProfile = useAuth((s) => s.refreshProfile);

  const [answers, setAnswers] = useState<Answers>({});
  const [busy, setBusy] = useState(false);

  // Not during the auth handoff, and only once, for a real profile that has not
  // been through this yet.
  const shouldShow =
    ready &&
    !!user &&
    !!supabase &&
    !!profile &&
    profile.onboarded_at === null &&
    !pathname.startsWith('/auth');

  if (!shouldShow) return null;

  async function save(withAnswers: boolean) {
    if (!user || !supabase) return;
    setBusy(true);
    const patch = withAnswers
      ? { ...answers, onboarded_at: new Date().toISOString() }
      : { onboarded_at: new Date().toISOString() };
    const { error } = await supabase.from('profiles').update(patch).eq('id', user.id);
    await refreshProfile();
    setBusy(false);
    if (error) return; // profile still unonboarded; it will simply show again

    if (withAnswers) {
      if (answers.looking_for === 'templates') navigate('/marketplace');
      else if (answers.looking_for === 'custom') navigate('/request');
    }
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('onboarding.title')}
      className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-ink/40 px-4 py-10 backdrop-blur-sm sm:items-center"
      style={{ animation: 'fade 0.25s var(--ease-out-expo)' }}
    >
      <div className="w-full max-w-xl rounded-[1.75rem] bg-paper p-7 shadow-[0_30px_80px_-24px_rgba(18,18,16,0.45)] md:p-9">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-d3">{t('onboarding.title')}</h2>
            <p className="mt-2 text-sm text-ink-soft">{t('onboarding.subtitle')}</p>
          </div>
          <button
            type="button"
            data-cursor="link"
            disabled={busy}
            onClick={() => void save(false)}
            className="label shrink-0 text-ink-mute transition-colors hover:text-ink"
          >
            {t('onboarding.skip')}
          </button>
        </div>

        <div className="mt-7 flex flex-col gap-7">
          {QUESTIONS.map((q) => (
            <fieldset key={q.key}>
              <legend className="label text-ink-mute">{t(`onboarding.q.${q.key}`)}</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {q.options.map((opt) => {
                  const selected = answers[q.key] === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      data-cursor="link"
                      aria-pressed={selected}
                      onClick={() =>
                        setAnswers((a) => ({ ...a, [q.key]: selected ? undefined : opt }))
                      }
                      className={clsx(
                        'rounded-full px-3.5 py-2 text-sm transition-colors duration-150',
                        selected
                          ? 'bg-blue text-paper'
                          : 'bg-paper-2 text-ink-soft hover:bg-paper-3 hover:text-ink',
                      )}
                    >
                      {t(`onboarding.a.${q.key}.${opt}`)}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>

        <div className="mt-9 flex items-center justify-end gap-4">
          <Button variant="ghost" disabled={busy} onClick={() => void save(false)}>
            {t('onboarding.skip')}
          </Button>
          <Button disabled={busy} onClick={() => void save(true)}>
            {t('onboarding.done')}
            <Arrow />
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
