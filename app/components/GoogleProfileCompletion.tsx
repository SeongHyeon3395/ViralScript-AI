'use client';

import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuth } from './AuthProvider';
import { useLanguage } from './LanguageProvider';
import { t } from './LanguageSwitcher';
import PhoneCountrySelect from './PhoneCountrySelect';

const REFERRAL_STORAGE_KEY = 'google_signup_referral';

export default function GoogleProfileCompletion() {
  useLanguage();
  const { user, refreshCredits } = useAuth();
  const [open, setOpen] = useState(false);
  const [countryCode, setCountryCode] = useState('+1');
  const [countryIso, setCountryIso] = useState('US');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [canApplyReferral, setCanApplyReferral] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (user.app_metadata?.provider !== 'google') {
      window.sessionStorage.removeItem(REFERRAL_STORAGE_KEY);
      return;
    }
    let cancelled = false;
    const skipKey = `google_profile_skip:${user.id}`;
    const pending = window.sessionStorage.getItem(REFERRAL_STORAGE_KEY);
    const urlRef = new URLSearchParams(window.location.search).get('ref');
    const code = (pending || urlRef || '').trim().toUpperCase();
    const timer = window.setTimeout(() => {
      if (!cancelled) setCanApplyReferral(Date.now() - Date.parse(user.created_at) < 24 * 60 * 60 * 1000);
      if (code && !cancelled) setReferralCode(code);
    }, 0);
    void getSupabaseBrowserClient().from('profiles').select('phone_number').eq('id', user.id).maybeSingle()
      .then(({ data, error: profileError }) => {
        const profile = data as { phone_number: string | null } | null;
        if (profile?.phone_number) window.sessionStorage.removeItem(REFERRAL_STORAGE_KEY);
        if (!cancelled && !profileError && !profile?.phone_number && !window.sessionStorage.getItem(skipKey)) setOpen(true);
      });
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [user]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || saving) return;
    setSaving(true); setError('');
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('UNAUTHORIZED');
      const response = await fetch('/api/v1/auth/complete-google-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          phoneCountryCode: countryCode.trim(),
          phoneNumber: phoneNumber.replace(/[\s()-]/g, ''),
          referralCode: canApplyReferral ? referralCode.trim().toUpperCase() || null : null,
        }),
      });
      const result = await response.json() as { errorCode?: string };
      if (!response.ok) throw new Error(result.errorCode ?? 'PROFILE_SAVE_FAILED');
      window.sessionStorage.removeItem(REFERRAL_STORAGE_KEY);
      setOpen(false);
      void refreshCredits();
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : '';
      setError(code.includes('REFERRAL') ? t('referral_code_invalid') : t('google_profile_save_failed'));
    } finally {
      setSaving(false);
    }
  }

  if (!open || !user) return null;
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/75 p-4" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="google-profile-title" className="w-full max-w-md rounded-2xl border border-white/15 bg-zinc-950 p-6 shadow-2xl">
        <h2 id="google-profile-title" className="text-xl font-bold text-white">{t('google_profile_title')}</h2>
        <p className="mt-2 text-sm text-white/55">{t('google_profile_desc')}</p>
        <form onSubmit={(event) => void save(event)} className="mt-5 space-y-4">
          <div className="space-y-2">
            <p className="pl-1 text-xs font-medium text-white/55">{t('signup_country_label')}</p>
            <PhoneCountrySelect value={countryCode} countryIso={countryIso} onChange={(dial, iso) => { setCountryCode(dial); setCountryIso(iso); }} />
          </div>
          <div className="space-y-2">
            <label htmlFor="google-profile-phone" className="block pl-1 text-xs font-medium text-white/55">{t('signup_phone_label')}</label>
            <input id="google-profile-phone" type="tel" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} required autoComplete="tel-national" className="input-dark w-full rounded-xl px-4 py-3 text-sm" />
          </div>
          {canApplyReferral && <label className="block text-xs text-white/60">{t('referral_signup_label')}<input value={referralCode} onChange={(event) => setReferralCode(event.target.value.toUpperCase().replace(/[^A-F0-9]/g, '').slice(0, 12))} maxLength={12} className="input-dark mt-1 w-full rounded-lg px-3 py-2 uppercase" /></label>}
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          <button type="submit" disabled={saving} className="btn-primary w-full">{saving ? t('settings_saving') : t('settings_save')}</button>
        </form>
        <button type="button" onClick={() => { window.sessionStorage.setItem(`google_profile_skip:${user.id}`, '1'); setOpen(false); }} className="mt-3 w-full rounded-lg py-2 text-sm text-white/45 hover:text-white">{t('google_profile_later')}</button>
      </section>
    </div>
  );
}

export { REFERRAL_STORAGE_KEY };
