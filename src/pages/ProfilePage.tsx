import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { PageHead } from '@/components/layout/PageHead';
import { ListingRow } from '@/components/marketplace/ListingRow';
import { Button } from '@/components/ui/Button';
import { Field, TextInput } from '@/components/ui/Form';
import { EmptyState, Spinner } from '@/components/ui/Bits';
import { fetchListings } from '@/lib/api';
import { readableError, supabase } from '@/lib/supabase';
import { useSeo } from '@/lib/seo';
import { useAuth } from '@/store/auth';
import { useSaved, useUI } from '@/store/ui';
import type { Listing } from '@/types/db';

export default function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  useSeo({ title: `${t('profile.pageTitle')} — WebSale.az`, description: t('profile.details'), noindex: true });

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

      <div className="px-5 py-12 pb-24 md:px-10">
        <div className="mx-auto grid max-w-[1400px] gap-16 lg:grid-cols-[24rem_1fr] lg:gap-20">
          <section aria-labelledby="details-heading">
            <h2 id="details-heading" className="label text-blue">
              {t('profile.details')}
            </h2>

            <div className="mt-6 flex flex-col gap-6">
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
                  <TextInput id={id} aria-describedby={describedBy} value={user?.email ?? ''} disabled readOnly />
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

            <div className="mt-14 border-t border-line pt-8">
              <h2 className="label text-ink-mute">{t('profile.dangerZone')}</h2>
              <Button
                variant="outline"
                className="mt-5"
                onClick={() => {
                  void signOut().then(() => navigate('/'));
                }}
              >
                {t('nav.signOut')}
              </Button>
              <p className="mt-6 max-w-sm text-xs leading-relaxed text-ink-mute">
                {t('profile.deleteWarning')}
              </p>
            </div>
          </section>

          <section aria-labelledby="saved-heading">
            <h2 id="saved-heading" className="label text-blue">
              {t('profile.savedSites')} / {savedListings.length}
            </h2>

            {savedListings.length === 0 ? (
              <div className="mt-6">
                <EmptyState title={t('profile.noSaved')} />
              </div>
            ) : (
              <div className="mt-6">
                {savedListings.map((listing) => (
                  <ListingRow key={listing.id} listing={listing} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
