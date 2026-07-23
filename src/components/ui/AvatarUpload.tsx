import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Bits';
import { initialsOf } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/auth';
import { useUI } from '@/store/ui';

const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Profile photo upload.
 *
 * Files go to `avatars/<user-id>/<timestamp>.<ext>` — the leading user-id
 * segment is what the storage policy checks, so the path shape is load-bearing
 * rather than cosmetic.
 *
 * The preview swaps to the chosen file immediately via an object URL, so the
 * change feels instant even on a slow connection; the real URL replaces it
 * once the upload lands. Old files are deleted after the profile row has been
 * updated, never before — an orphaned file is harmless, but a profile pointing
 * at a deleted file is a broken avatar.
 */
export function AvatarUpload() {
  const { t } = useTranslation();
  const user = useAuth((s) => s.user);
  const profile = useAuth((s) => s.profile);
  const refreshProfile = useAuth((s) => s.refreshProfile);
  const toast = useUI((s) => s.toast);

  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const shown = preview ?? profile?.avatar_url ?? null;

  async function choose(file: File | null) {
    setError(null);
    if (!file || !user || !supabase) return;

    if (!ACCEPTED.includes(file.type)) {
      setError(t('profile.avatarWrongType'));
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(t('profile.avatarTooBig'));
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setBusy(true);

    const previous = profile?.avatar_url ?? null;
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const path = `${user.id}/${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from('avatars')
      .upload(path, file, { contentType: file.type, upsert: true });

    if (upErr) {
      setBusy(false);
      setPreview(null);
      URL.revokeObjectURL(localUrl);
      toast(t('profile.avatarFailed'), 'bad');
      return;
    }

    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
    const { error: rowErr } = await supabase
      .from('profiles')
      .update({ avatar_url: pub.publicUrl })
      .eq('id', user.id);

    setBusy(false);

    if (rowErr) {
      setPreview(null);
      URL.revokeObjectURL(localUrl);
      toast(t('profile.avatarFailed'), 'bad');
      return;
    }

    await refreshProfile();
    setPreview(null);
    URL.revokeObjectURL(localUrl);

    // Only now is the old file unreachable, so it is safe to remove.
    if (previous) void removeStored(previous, user.id);

    toast(t('profile.saved'));
  }

  /** Turns a public URL back into a bucket path, then deletes it. */
  async function removeStored(url: string, userId: string) {
    if (!supabase) return;
    const marker = '/avatars/';
    const at = url.indexOf(marker);
    if (at === -1) return;
    const path = url.slice(at + marker.length).split('?')[0];
    // Never touch anything outside the caller's own folder.
    if (!path || !path.startsWith(`${userId}/`)) return;
    await supabase.storage.from('avatars').remove([path]);
  }

  async function clear() {
    if (!user || !supabase) return;
    setBusy(true);

    const previous = profile?.avatar_url ?? null;
    const { error: rowErr } = await supabase
      .from('profiles')
      .update({ avatar_url: null })
      .eq('id', user.id);

    setBusy(false);
    if (rowErr) {
      toast(t('profile.avatarFailed'), 'bad');
      return;
    }

    await refreshProfile();
    if (previous) void removeStored(previous, user.id);
  }

  return (
    <div className="flex flex-col gap-4">
      <span className="text-sm font-semibold">{t('profile.avatar')}</span>

      <div className="flex items-center gap-5">
        <div
          className={clsx(
            'relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full',
            shown ? 'bg-paper-3' : 'bg-ink text-paper',
          )}
        >
          {shown ? (
            <img src={shown} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="font-display text-d4 font-extrabold">
              {initialsOf(profile?.display_name)}
            </span>
          )}

          {busy && (
            <span className="absolute inset-0 flex items-center justify-center bg-ink/55 text-paper">
              <Spinner />
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={input}
            type="file"
            accept={ACCEPTED.join(',')}
            className="sr-only"
            // Clearing the value lets the same file be re-picked after an
            // error, which otherwise fires no change event.
            onChange={(e) => {
              void choose(e.target.files?.[0] ?? null);
              e.target.value = '';
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            {busy
              ? t('profile.avatarUploading')
              : shown
                ? t('profile.avatarChange')
                : t('profile.avatarAdd')}
          </Button>

          {profile?.avatar_url && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void clear()}
              data-cursor="link"
              className="rounded-full px-3 py-2 text-sm font-medium text-ink-mute transition-colors hover:bg-red/10 hover:text-red disabled:pointer-events-none disabled:opacity-40"
            >
              {t('profile.avatarRemove')}
            </button>
          )}
        </div>
      </div>

      <p className="text-sm text-ink-mute">{t('profile.avatarHint')}</p>
      {error && (
        <p role="alert" className="text-sm font-medium text-red">
          {error}
        </p>
      )}
    </div>
  );
}
