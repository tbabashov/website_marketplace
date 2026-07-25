import { useState, type ReactNode } from 'react';
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

type QKey = (typeof QUESTIONS)[number]['key'];
type Answers = Partial<Record<QKey, string>>;

// Line-icon defaults; brand marks below override with a solid fill instead.
const line = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/** One small glyph per option, monochrome so it inherits the chip's colour. */
const ICONS: Record<string, ReactNode> = {
  instagram: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.64.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85C2.38 3.92 3.9 2.38 7.15 2.23 8.42 2.17 8.8 2.16 12 2.16M12 0C8.74 0 8.33.01 7.05.07 2.7.27.27 2.69.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.2 4.36 2.62 6.78 6.98 6.98C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c4.35-.2 6.78-2.62 6.98-6.98.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.2-4.35-2.62-6.78-6.98-6.98C15.67.01 15.26 0 12 0m0 5.84a6.16 6.16 0 100 12.32 6.16 6.16 0 000-12.32M12 16a4 4 0 110-8 4 4 0 010 8m6.41-11.85a1.44 1.44 0 100 2.88 1.44 1.44 0 000-2.88" />
    </svg>
  ),
  tiktok: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.62.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.5 6.19a3.02 3.02 0 00-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 00.5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 002.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 002.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81zM9.55 15.57V8.43L15.82 12l-6.27 3.57z" />
    </svg>
  ),
  google: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.19-1.79 4.13-1.15 1.15-2.93 2.4-6.05 2.4-4.83 0-8.6-3.89-8.6-8.72s3.77-8.72 8.6-8.72c2.6 0 4.51 1.03 5.91 2.35l2.31-2.31C18.75 1.44 16.13 0 12.48 0 5.87 0 .31 5.39.31 12s5.56 12 12.17 12c3.57 0 6.27-1.17 8.37-3.36 2.16-2.16 2.84-5.21 2.84-7.67 0-.76-.05-1.47-.17-2.05h-11.04z" />
    </svg>
  ),
  referral: (
    <svg viewBox="0 0 24 24" {...line}>
      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  portfolio: (
    <svg viewBox="0 0 24 24" {...line}>
      <path d="M3 4h18v16H3zM3 9h18M7 6.5h.01M10 6.5h.01" />
    </svg>
  ),
  templates: (
    <svg viewBox="0 0 24 24" {...line}>
      <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
    </svg>
  ),
  custom: (
    <svg viewBox="0 0 24 24" {...line}>
      <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z" />
    </svg>
  ),
  exploring: (
    <svg viewBox="0 0 24 24" {...line}>
      <path d="M12 22a10 10 0 100-20 10 10 0 000 20zM16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" />
    </svg>
  ),
  restaurant: (
    <svg viewBox="0 0 24 24" {...line}>
      <path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3" />
    </svg>
  ),
  realestate: (
    <svg viewBox="0 0 24 24" {...line}>
      <path d="M3 9.5L12 3l9 6.5M5 10v10h14V10M9 20v-6h6v6" />
    </svg>
  ),
  consulting: (
    <svg viewBox="0 0 24 24" {...line}>
      <path d="M2 7h20v13H2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
    </svg>
  ),
  healthcare: (
    <svg viewBox="0 0 24 24" {...line}>
      <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z" />
    </svg>
  ),
  other: (
    <svg viewBox="0 0 24 24" {...line} strokeWidth={2.4}>
      <path d="M5 12h.01M12 12h.01M19 12h.01" />
    </svg>
  ),
};

/**
 * A one-time survey shown the first time a signed-in user lands, gated on
 * profile.onboarded_at being null. Every question is optional and Skip is always
 * available — the point is a soft signal, not a wall. Picking "Other" reveals a
 * free-text box so the answer is still captured. Answers are saved on the profile
 * (owner insight) and "what are you looking for?" routes the user to the most
 * relevant page so their first click is already useful.
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
  const [otherText, setOtherText] = useState<Answers>({});
  const [busy, setBusy] = useState(false);

  const shouldShow =
    ready &&
    !!user &&
    !!supabase &&
    !!profile &&
    profile.onboarded_at === null &&
    !pathname.startsWith('/auth');

  if (!shouldShow) return null;

  /** The value stored for a question: the free text when "Other", else the key. */
  function resolved(key: QKey): string | undefined {
    const v = answers[key];
    if (v === 'other') {
      const text = otherText[key]?.trim();
      return text || 'other';
    }
    return v;
  }

  async function save(withAnswers: boolean) {
    if (!user || !supabase) return;
    setBusy(true);
    const patch: Record<string, unknown> = { onboarded_at: new Date().toISOString() };
    if (withAnswers) {
      for (const q of QUESTIONS) patch[q.key] = resolved(q.key) ?? null;
    }
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
                        'flex items-center gap-2 rounded-full px-3.5 py-2 text-sm transition-colors duration-150',
                        selected
                          ? 'bg-blue text-paper'
                          : 'bg-paper-2 text-ink-soft hover:bg-paper-3 hover:text-ink',
                      )}
                    >
                      <span className="grid h-4 w-4 place-items-center [&_svg]:h-full [&_svg]:w-full">
                        {ICONS[opt]}
                      </span>
                      {t(`onboarding.a.${q.key}.${opt}`)}
                    </button>
                  );
                })}
              </div>

              {answers[q.key] === 'other' && (
                <input
                  type="text"
                  autoFocus
                  value={otherText[q.key] ?? ''}
                  onChange={(e) => setOtherText((o) => ({ ...o, [q.key]: e.target.value }))}
                  placeholder={t('onboarding.otherPlaceholder')}
                  className="mt-3 w-full rounded-2xl border border-line bg-field px-4 py-2.5 text-sm placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-blue"
                />
              )}
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
