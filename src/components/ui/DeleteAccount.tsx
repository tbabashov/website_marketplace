import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Bits';
import { readableError, supabase } from '@/lib/supabase';
import { useAuth } from '@/store/auth';
import { useUI } from '@/store/ui';

/**
 * Account deletion, as a two-step confirmation rather than a modal.
 *
 * The second step tells the visitor what will *actually* happen to their
 * data — and that differs depending on whether they have orders, because
 * accounting records survive. Saying "this deletes everything" to someone
 * whose order history is about to be retained would be a lie, so the copy is
 * chosen from the real order count before they commit.
 */
export function DeleteAccount() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const signOut = useAuth((s) => s.signOut);
  const toast = useUI((s) => s.toast);

  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [orderCount, setOrderCount] = useState<number | null>(null);

  // Fetched up front so the confirmation can state the true consequence
  // instead of hedging.
  useEffect(() => {
    if (!asking || !supabase || !user) return;
    let alive = true;
    void supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .then(({ count }) => {
        if (alive) setOrderCount(count ?? 0);
      });
    return () => {
      alive = false;
    };
  }, [asking, user]);

  async function confirm() {
    if (!supabase) return;
    setBusy(true);
    const { data, error } = await supabase.rpc('delete_my_account');
    setBusy(false);

    if (error) {
      toast(readableError(error), 'bad');
      return;
    }

    const result = (data ?? {}) as { deleted?: boolean; orders_kept?: number };
    await signOut();
    toast(result.deleted ? t('profile.deleteDone') : t('profile.deleteDoneKept'));
    navigate('/', { replace: true });
  }

  // A red-tinted fill (no border) inside the account card, so the destructive
  // action sits with the rest of the account settings yet reads as its own
  // zone. The description is always visible; confirmation swaps in below it.
  return (
    <div className="rounded-2xl bg-red/[0.06] p-5 md:p-6">
      <p className="label text-red">{t('profile.deleteTitle')}</p>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-soft">
        {t('profile.deleteWarning')}
      </p>

      {!asking ? (
        <Button variant="danger" size="sm" className="mt-5" onClick={() => setAsking(true)}>
          {t('profile.deleteAccount')}
        </Button>
      ) : (
        <div className="mt-5 border-t border-red/20 pt-5">
          <p className="text-sm font-semibold text-ink">{t('profile.deleteAsk')}</p>

          {orderCount === null ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-ink-mute">
              <Spinner />
              {t('common.loading')}
            </p>
          ) : (
            <p className="mt-3 text-sm text-ink-soft">
              {orderCount > 0
                ? t('profile.deleteKeptOrders', { count: orderCount })
                : t('profile.deleteNoOrders')}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-2.5">
            <Button
              variant="dangerSolid"
              size="sm"
              disabled={busy || orderCount === null}
              onClick={() => void confirm()}
            >
              {busy && <Spinner />}
              {busy ? t('profile.deleting') : t('profile.deleteConfirm')}
            </Button>
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => setAsking(false)}>
              {t('profile.deleteCancel')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
