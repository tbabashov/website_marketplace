import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { PageHead } from '@/components/layout/PageHead';
import { ListingRow } from '@/components/marketplace/ListingRow';
import { AvatarUpload } from '@/components/ui/AvatarUpload';
import { DeleteAccount } from '@/components/ui/DeleteAccount';
import { Button } from '@/components/ui/Button';
import { Field, TextInput } from '@/components/ui/Form';
import { EmptyState, Eyebrow, Reveal, Shell, Spinner } from '@/components/ui/Bits';
import { fetchListings } from '@/lib/api';
import { readableError, supabase } from '@/lib/supabase';
import { useSeo } from '@/lib/seo';
import { useAuth } from '@/store/auth';
import { useSaved, useUI } from '@/store/ui';
import type { Listing } from '@/types/db';

export default function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  useSeo({
    title: `${t('profile.pageTitle')} — WebSale.az`,
    description: t('profile.details'),
    noindex: true,
  });

  const user = useAuth((s) => s.user);
  const profile = useAuth((s) => s.profile);
  const refreshProfile = useAuth((s) => s.refreshProfile);
  const signOut = useAuth((s) => s.signOut);
  const savedIds = useSaved((s) => s.ids);
  const toast = useUI((s) => s.toast);

  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);

  useEffect(() => {
    setDisplayName(profile?.display_name ?? '');
    setPhone(profile?.phone ?? '');
  }, [profile]);

  useEffect(() => {
    let alive = true;
    void fetchListings().then(({ data }) => {
      if (alive) setListings(data);
    });
    return () => {
      alive = false;
    };
  }, []);

  async function save() {
    if (!supabase || !user) return;
    setBusy(true);
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName.trim() || null, phone: phone.trim() || null })
      .eq('id', user.id);
    setBusy(false);

    if (error) {
      toast(readableError(error), 'bad');
      return;
    }
    await refreshProfile();
    toast(t('profile.saved'));
  }

  const savedListings = listings.filter((l) => savedIds.includes(l.id));

  return (
    <>
      <PageHead label={t('nav.profile')} title={t('profile.pageTitle')} />

      <Shell className="pb-28 pt-16">
        <div className="grid gap-16 lg:grid-cols-[24rem_1fr] lg:gap-24">
          <section aria-labelledby="details-heading">
            <Eyebrow>
              <span id="details-heading">{t('profile.details')}</span>
            </Eyebrow>

            <div className="mt-8 rounded-3xl bg-paper-2 p-7 md:p-8">
              <AvatarUpload />

              <div className="mt-9 flex flex-col gap-6 border-t border-line pt-8">
                <Field label={t('profile.displayName')}>
                  {({ id }) => (
                    <TextInput
                      id={id}
                      autoComplete="name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  )}
                </Field>

                <Field label={t('profile.email')} hint={t('profile.emailImmutable')}>
                  {({ id, describedBy }) => (
                    <TextInput
                      id={id}
                      aria-describedby={describedBy}
                      className="opacity-60"
                      value={user?.email ?? ''}
                      disabled
                      readOnly
                    />
                  )}
                </Field>

                <Field label={t('profile.phone')} optional optionalLabel={t('common.optional')}>
                  {({ id }) => (
                    <TextInput
                      id={id}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="+994"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  )}
                </Field>

                <Button className="self-start" onClick={() => void save()} disabled={busy}>
                  {busy && <Spinner />}
                  {busy ? t('common.saving') : t('common.save')}
                </Button>
              </div>
            </div>

            <div className="mt-12 border-t border-line pt-8">
              <p className="label text-ink-mute">{t('profile.dangerZone')}</p>

              {/* Neutral account action, kept clearly apart from the red
                  delete card so signing out never reads as destructive. */}
              <div className="mt-5">
                <Button
                  variant="outline"
                  onClick={() => {
                    void signOut().then(() => navigate('/'));
                  }}
                >
                  {t('nav.signOut')}
                </Button>
              </div>

              {/* The delete card carries its own warning and red border. */}
              <div className="mt-6">
                <DeleteAccount />
              </div>
            </div>
          </section>

          <section aria-labelledby="saved-heading">
            <Eyebrow>
              <span id="saved-heading">
                {t('profile.savedSites')} — {savedListings.length}
              </span>
            </Eyebrow>

            {savedListings.length === 0 ? (
              <div className="mt-8">
                <EmptyState title={t('profile.noSaved')} />
              </div>
            ) : (
              <div className="mt-10 grid gap-x-8 gap-y-14 sm:grid-cols-2">
                {savedListings.map((listing, i) => (
                  <Reveal key={listing.id} delay={(i % 2) * 90}>
                    <ListingRow listing={listing} />
                  </Reveal>
                ))}
              </div>
            )}
          </section>
        </div>
      </Shell>
    </>
  );
}
