import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import { PageHead } from '@/components/layout/PageHead';
import { Arrow, Button, ButtonLink } from '@/components/ui/Button';
import { CheckChip, Field, RadioRow, TextArea, TextInput } from '@/components/ui/Form';
import { Shell, Spinner } from '@/components/ui/Bits';
import { readableError, supabase } from '@/lib/supabase';
import { useSeo } from '@/lib/seo';
import { useAuth } from '@/store/auth';
import { useUI } from '@/store/ui';
import type { Order } from '@/types/db';

const DRAFT_KEY = 'websale.request-draft';

const PAGE_OPTIONS = [
  'home', 'about', 'services', 'catalog', 'shop', 'booking', 'gallery', 'blog', 'contact', 'careers', 'other',
] as const;

const FEATURE_OPTIONS = ['multilang', 'crm', 'analytics', 'seo', 'social', 'admin', 'other'] as const;

const BUDGET_OPTIONS = ['under100', '100to500', '500to1000', 'over1000', 'unsure'] as const;

/** Fold the free-text "other" answer into a text[] column: drop the 'other'
 *  marker and, if something was typed, append it as a real entry. */
function withOther(list: string[], other: string): string[] {
  if (!list.includes('other')) return list;
  const rest = list.filter((x) => x !== 'other');
  const text = other.trim();
  return text ? [...rest, text] : rest;
}

const TIMELINE_OPTIONS = ['asap', 'month', 'quarter', 'flexible'] as const;

const STEPS = ['business', 'pages', 'style', 'budget', 'contact', 'review'] as const;
type Step = (typeof STEPS)[number];

interface Draft {
  businessName: string;
  businessType: string;
  businessDesc: string;
  hasWebsite: boolean;
  currentUrl: string;
  pages: string[];
  pagesOther: string;
  features: string[];
  featuresOther: string;
  styleRefs: string;
  styleNotes: string;
  hasBranding: boolean;
  budget: string | null;
  timeline: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  contactPreferred: 'email' | 'phone' | 'whatsapp';
}

const emptyDraft: Draft = {
  businessName: '',
  businessType: '',
  businessDesc: '',
  hasWebsite: false,
  currentUrl: '',
  pages: [],
  pagesOther: '',
  features: [],
  featuresOther: '',
  styleRefs: '',
  styleNotes: '',
  hasBranding: false,
  budget: null,
  timeline: null,
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  contactPreferred: 'email',
};

function loadDraft(): Draft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? { ...emptyDraft, ...(JSON.parse(raw) as Partial<Draft>) } : emptyDraft;
  } catch {
    return emptyDraft;
  }
}

export default function RequestPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  useSeo({ title: t('seo.request.title'), description: t('seo.request.description') });

  const user = useAuth((s) => s.user);
  const profile = useAuth((s) => s.profile);
  const toast = useUI((s) => s.toast);

  const [step, setStep] = useState<Step>('business');
  const [draft, setDraft] = useState<Draft>(loadDraft);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  // The form survives a trip through sign-in, which is the whole reason an
  // account is not demanded until the last step.
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Storage unavailable — the form still works for this session.
    }
  }, [draft]);

  // Prefill from the signed-in profile, without overwriting anything typed.
  useEffect(() => {
    setDraft((d) => ({
      ...d,
      contactName: d.contactName || profile?.display_name || '',
      contactEmail: d.contactEmail || user?.email || '',
      contactPhone: d.contactPhone || profile?.phone || '',
    }));
  }, [user, profile]);

  const stepIndex = STEPS.indexOf(step);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  function validate(target: Step): boolean {
    const next: Partial<Record<string, string>> = {};

    if (target === 'business') {
      if (!draft.businessName.trim()) next.businessName = t('request.validation.businessName');
      if (!draft.businessType.trim()) next.businessType = t('request.validation.businessType');
    }
    if (target === 'pages' && draft.pages.length === 0) {
      next.pages = t('request.validation.pages');
    }
    if (target === 'contact') {
      if (!draft.contactName.trim()) next.contactName = t('request.validation.name');
      if (!draft.contactEmail.trim()) next.contactEmail = t('request.validation.email');
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.contactEmail.trim())) {
        next.contactEmail = t('request.validation.emailFormat');
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function goNext() {
    if (!validate(step)) return;
    const next = STEPS[stepIndex + 1];
    if (next) {
      setStep(next);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function goBack() {
    const prev = STEPS[stepIndex - 1];
    if (prev) {
      setStep(prev);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  async function submit() {
    if (!validate('business') || !validate('pages') || !validate('contact')) {
      setStep('business');
      return;
    }

    if (!user) {
      // The draft is already in localStorage, so coming back lands on a full form.
      navigate('/auth?next=/request');
      return;
    }
    if (!supabase) {
      toast(t('auth.notConfigured'), 'bad');
      return;
    }

    setSubmitting(true);

    const { data: request, error } = await supabase
      .from('site_requests')
      .insert({
        user_id: user.id,
        business_name: draft.businessName.trim(),
        business_type: draft.businessType.trim(),
        business_desc: draft.businessDesc.trim() || null,
        has_website: draft.hasWebsite,
        current_url: draft.currentUrl.trim() || null,
        pages: withOther(draft.pages, draft.pagesOther),
        features: withOther(draft.features, draft.featuresOther),
        style_refs: draft.styleRefs.trim() || null,
        style_notes: draft.styleNotes.trim() || null,
        has_branding: draft.hasBranding,
        budget_range: draft.budget,
        timeline: draft.timeline,
        contact_name: draft.contactName.trim(),
        contact_email: draft.contactEmail.trim(),
        contact_phone: draft.contactPhone.trim() || null,
        contact_preferred: draft.contactPreferred,
      })
      .select()
      .single();

    if (error || !request) {
      setSubmitting(false);
      toast(readableError(error), 'bad');
      return;
    }

    // Opening the tracking order here rather than in a trigger keeps the
    // request row valid even if this second call fails; the Owner can still
    // quote it from the desk.
    const { data: orderData } = await supabase.rpc('create_custom_order', {
      p_request_id: request.id,
    });
    const order = (Array.isArray(orderData) ? orderData[0] : orderData) as Order | null;

    setSubmitting(false);
    setSent(true);
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // Nothing to clean up.
    }

    if (order?.id) navigate(`/orders/${order.id}`, { replace: true });
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-2xl px-6 pb-32 pt-44 text-center">
        <span className="label text-green">{t('request.sentTitle')}</span>
        <h1 className="mt-5 font-display text-d2">{t('request.sentTitle')}</h1>
        <p className="mt-5 text-lg text-ink-soft">{t('request.sentBody')}</p>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink to="/dashboard" size="lg">
            {t('request.sentAction')}
          </ButtonLink>
          <ButtonLink to="/marketplace" variant="outline" size="lg">
            {t('request.sentBrowse')}
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHead label={t('nav.request')} title={t('request.pageTitle')} lead={t('request.lead')} />

      <Shell className="pb-28 pt-14">
        <div>
          {/* Progress: pills that fill in as you go. Earlier steps stay
              clickable; later ones do not, because they depend on answers you
              have not given yet. */}
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
            {STEPS.map((s, i) => {
              const done = i < stepIndex;
              const current = i === stepIndex;
              return (
                <li key={s} className="flex items-center gap-2">
                  <button
                    type="button"
                    // Going back is always allowed; skipping ahead is not,
                    // because later steps depend on earlier answers.
                    onClick={() => i <= stepIndex && setStep(s)}
                    disabled={i > stepIndex}
                    aria-current={current ? 'step' : undefined}
                    className={clsx(
                      'label flex items-center gap-2 rounded-full px-3 py-2 transition-colors duration-200',
                      current && 'bg-blue text-paper',
                      done && 'bg-paper-2 text-ink-soft hover:bg-paper-3 hover:text-ink',
                      !current && !done && 'cursor-default text-ink-mute/60',
                    )}
                  >
                    <span className="tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                    <span className="hidden sm:inline">{t(`request.steps.${s}`)}</span>
                    {current && <span className="sr-only">({t('a11y.currentStep')})</span>}
                    {done && <span className="sr-only">({t('a11y.completedStep')})</span>}
                  </button>
                  {i < STEPS.length - 1 && (
                    <span
                      className={clsx('h-px w-4 sm:w-8', done ? 'bg-blue' : 'bg-line')}
                      aria-hidden="true"
                    />
                  )}
                </li>
              );
            })}
          </ol>

          <div className="mt-10 max-w-2xl pb-24">
            {step === 'business' && (
              <div className="flex flex-col gap-8">
                <Field label={t('request.businessName')} error={errors.businessName}>
                  {({ id, describedBy, invalid }) => (
                    <TextInput
                      id={id}
                      aria-describedby={describedBy}
                      invalid={invalid}
                      value={draft.businessName}
                      onChange={(e) => set('businessName', e.target.value)}
                      autoComplete="organization"
                    />
                  )}
                </Field>

                <Field label={t('request.businessType')} error={errors.businessType}>
                  {({ id, describedBy, invalid }) => (
                    <TextInput
                      id={id}
                      aria-describedby={describedBy}
                      invalid={invalid}
                      placeholder={t('request.businessTypePlaceholder')}
                      value={draft.businessType}
                      onChange={(e) => set('businessType', e.target.value)}
                    />
                  )}
                </Field>

                <Field label={t('request.businessDesc')} optional optionalLabel={t('common.optional')}>
                  {({ id }) => (
                    <TextArea
                      id={id}
                      placeholder={t('request.businessDescPlaceholder')}
                      value={draft.businessDesc}
                      onChange={(e) => set('businessDesc', e.target.value)}
                    />
                  )}
                </Field>

                <fieldset>
                  <legend className="label mb-3 text-ink-soft">{t('request.hasWebsite')}</legend>
                  <RadioRow
                    name="hasWebsite"
                    value={draft.hasWebsite ? 'yes' : 'no'}
                    onChange={(v) => set('hasWebsite', v === 'yes')}
                    options={[
                      { value: 'no', label: t('request.hasWebsiteNo') },
                      { value: 'yes', label: t('request.hasWebsiteYes') },
                    ]}
                  />
                </fieldset>

                {draft.hasWebsite && (
                  <Field label={t('request.currentUrl')}>
                    {({ id }) => (
                      <TextInput
                        id={id}
                        type="url"
                        inputMode="url"
                        placeholder="https://"
                        value={draft.currentUrl}
                        onChange={(e) => set('currentUrl', e.target.value)}
                      />
                    )}
                  </Field>
                )}
              </div>
            )}

            {step === 'pages' && (
              <div className="flex flex-col gap-10">
                <fieldset>
                  <legend className="label mb-2 text-ink-soft">{t('request.pagesLabel')}</legend>
                  <p className="mb-4 text-sm text-ink-mute">{t('request.pagesHint')}</p>
                  <div className="flex flex-wrap gap-2">
                    {PAGE_OPTIONS.map((page) => (
                      <CheckChip
                        key={page}
                        checked={draft.pages.includes(page)}
                        onChange={(on) =>
                          set('pages', on ? [...draft.pages, page] : draft.pages.filter((p) => p !== page))
                        }
                      >
                        {t(`request.pageOptions.${page}`)}
                      </CheckChip>
                    ))}
                  </div>
                  {draft.pages.includes('other') && (
                    <TextInput
                      className="mt-3"
                      placeholder={t('request.otherPlaceholder')}
                      value={draft.pagesOther}
                      onChange={(e) => set('pagesOther', e.target.value)}
                    />
                  )}
                  {errors.pages && <p className="mt-3 text-sm text-red">{errors.pages}</p>}
                </fieldset>

                <fieldset>
                  <legend className="label mb-4 text-ink-soft">{t('request.featuresLabel')}</legend>
                  <div className="flex flex-wrap gap-2">
                    {FEATURE_OPTIONS.map((feature) => (
                      <CheckChip
                        key={feature}
                        checked={draft.features.includes(feature)}
                        onChange={(on) =>
                          set(
                            'features',
                            on
                              ? [...draft.features, feature]
                              : draft.features.filter((f) => f !== feature),
                          )
                        }
                      >
                        {t(`request.featureOptions.${feature}`)}
                      </CheckChip>
                    ))}
                  </div>
                  {draft.features.includes('other') && (
                    <TextInput
                      className="mt-3"
                      placeholder={t('request.otherPlaceholder')}
                      value={draft.featuresOther}
                      onChange={(e) => set('featuresOther', e.target.value)}
                    />
                  )}
                </fieldset>
              </div>
            )}

            {step === 'style' && (
              <div className="flex flex-col gap-8">
                <Field label={t('request.styleRefs')} optional optionalLabel={t('common.optional')}>
                  {({ id }) => (
                    <TextArea
                      id={id}
                      rows={3}
                      placeholder={t('request.styleRefsPlaceholder')}
                      value={draft.styleRefs}
                      onChange={(e) => set('styleRefs', e.target.value)}
                    />
                  )}
                </Field>

                <Field label={t('request.styleNotes')} optional optionalLabel={t('common.optional')}>
                  {({ id }) => (
                    <TextArea
                      id={id}
                      rows={3}
                      placeholder={t('request.styleNotesPlaceholder')}
                      value={draft.styleNotes}
                      onChange={(e) => set('styleNotes', e.target.value)}
                    />
                  )}
                </Field>

                <fieldset>
                  <legend className="label mb-3 text-ink-soft">{t('request.hasBranding')}</legend>
                  <RadioRow
                    name="hasBranding"
                    value={draft.hasBranding ? 'yes' : 'no'}
                    onChange={(v) => set('hasBranding', v === 'yes')}
                    options={[
                      { value: 'yes', label: t('request.brandingYes') },
                      { value: 'no', label: t('request.brandingNo') },
                    ]}
                  />
                </fieldset>
              </div>
            )}

            {step === 'budget' && (
              <div className="flex flex-col gap-10">
                <fieldset>
                  <legend className="label mb-2 text-ink-soft">{t('request.budgetLabel')}</legend>
                  <p className="mb-4 text-sm text-ink-mute">{t('request.budgetHint')}</p>
                  <RadioRow
                    name="budget"
                    value={draft.budget}
                    onChange={(v) => set('budget', v)}
                    options={BUDGET_OPTIONS.map((b) => ({
                      value: b,
                      label: t(`request.budgetOptions.${b}`),
                    }))}
                  />
                </fieldset>

                <fieldset>
                  <legend className="label mb-4 text-ink-soft">{t('request.timelineLabel')}</legend>
                  <RadioRow
                    name="timeline"
                    value={draft.timeline}
                    onChange={(v) => set('timeline', v)}
                    options={TIMELINE_OPTIONS.map((v) => ({
                      value: v,
                      label: t(`request.timelineOptions.${v}`),
                    }))}
                  />
                </fieldset>
              </div>
            )}

            {step === 'contact' && (
              <div className="flex flex-col gap-8">
                <Field label={t('request.contactName')} error={errors.contactName}>
                  {({ id, describedBy, invalid }) => (
                    <TextInput
                      id={id}
                      aria-describedby={describedBy}
                      invalid={invalid}
                      autoComplete="name"
                      value={draft.contactName}
                      onChange={(e) => set('contactName', e.target.value)}
                    />
                  )}
                </Field>

                <Field label={t('request.contactEmail')} error={errors.contactEmail}>
                  {({ id, describedBy, invalid }) => (
                    <TextInput
                      id={id}
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      aria-describedby={describedBy}
                      invalid={invalid}
                      value={draft.contactEmail}
                      onChange={(e) => set('contactEmail', e.target.value)}
                    />
                  )}
                </Field>

                <Field label={t('request.contactPhone')} optional optionalLabel={t('common.optional')}>
                  {({ id }) => (
                    <TextInput
                      id={id}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="+994"
                      value={draft.contactPhone}
                      onChange={(e) => set('contactPhone', e.target.value)}
                    />
                  )}
                </Field>

                <fieldset>
                  <legend className="label mb-3 text-ink-soft">{t('request.contactPreferred')}</legend>
                  <RadioRow
                    name="preferred"
                    value={draft.contactPreferred}
                    onChange={(v) => set('contactPreferred', v)}
                    options={[
                      { value: 'email' as const, label: t('request.preferredEmail') },
                      { value: 'phone' as const, label: t('request.preferredPhone') },
                      { value: 'whatsapp' as const, label: t('request.preferredWhatsapp') },
                    ]}
                  />
                </fieldset>
              </div>
            )}

            {step === 'review' && (
              <div>
                <p className="text-ink-soft">{t('request.reviewLead')}</p>

                <dl className="mt-8 border-t border-line">
                  {[
                    { label: t('request.businessName'), value: draft.businessName },
                    { label: t('request.businessType'), value: draft.businessType },
                    { label: t('request.businessDesc'), value: draft.businessDesc },
                    {
                      label: t('request.pagesLabel'),
                      value: withOther(draft.pages, draft.pagesOther)
                        .map((p) => t(`request.pageOptions.${p}`, p))
                        .join(', '),
                    },
                    {
                      label: t('request.featuresLabel'),
                      value: withOther(draft.features, draft.featuresOther)
                        .map((f) => t(`request.featureOptions.${f}`, f))
                        .join(', '),
                    },
                    { label: t('request.styleRefs'), value: draft.styleRefs },
                    { label: t('request.styleNotes'), value: draft.styleNotes },
                    {
                      label: t('request.budgetLabel'),
                      value: draft.budget ? t(`request.budgetOptions.${draft.budget}`) : '',
                    },
                    {
                      label: t('request.timelineLabel'),
                      value: draft.timeline ? t(`request.timelineOptions.${draft.timeline}`) : '',
                    },
                    { label: t('request.contactName'), value: draft.contactName },
                    { label: t('request.contactEmail'), value: draft.contactEmail },
                    { label: t('request.contactPhone'), value: draft.contactPhone },
                  ]
                    .filter((row) => row.value)
                    .map((row) => (
                      <div
                        key={row.label}
                        className="grid gap-1 py-4 sm:grid-cols-[14rem_1fr] sm:gap-6"
                      >
                        <dt className="label pt-1 text-ink-mute">{row.label}</dt>
                        <dd className="text-ink">{row.value}</dd>
                      </div>
                    ))}
                </dl>

                {!user && (
                  <p className="mt-8 rounded-2xl bg-amber/10 px-4 py-3.5 text-sm text-ink-soft">
                    {t('common.signInToContinue')}
                  </p>
                )}
              </div>
            )}

            <div className="mt-12 flex items-center gap-3">
              {stepIndex > 0 && (
                <Button variant="ghost" onClick={goBack}>
                  {t('common.back')}
                </Button>
              )}

              {step === 'review' ? (
                <Button size="lg" onClick={() => void submit()} disabled={submitting}>
                  {submitting ? <Spinner /> : null}
                  {submitting ? t('request.submitting') : t('request.submit')}
                  {!submitting && <Arrow />}
                </Button>
              ) : (
                <Button size="lg" onClick={goNext}>
                  {t('common.next')}
                  <Arrow />
                </Button>
              )}
            </div>
          </div>
        </div>
      </Shell>
    </>
  );
}
