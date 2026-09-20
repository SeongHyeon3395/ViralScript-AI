'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { Loader2, Mail, Send, X } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { t } from './LanguageSwitcher';
import { useLanguage } from './LanguageProvider';

const categories = [
  ['account', 'contact_category_account'],
  ['billing', 'contact_category_billing'],
  ['generation', 'contact_category_generation'],
  ['bug', 'contact_category_bug'],
  ['feature', 'contact_category_feature'],
  ['other', 'contact_category_other'],
] as const;

export default function ContactSupport() {
  useLanguage();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<(typeof categories)[number][0]>('other');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const messageRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKeyDown);
    const timer = window.setTimeout(() => messageRef.current?.focus(), 0);
    return () => { window.removeEventListener('keydown', onKeyDown); window.clearTimeout(timer); };
  }, [open]);

  function close() {
    if (status === 'sending') return;
    setOpen(false);
    setStatus('idle');
    setError('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) { setError(t('contact_login_required')); setStatus('error'); return; }
    setStatus('sending'); setError('');
    try {
      const { data: { session } } = await getSupabaseBrowserClient().auth.getSession();
      if (!session) throw new Error(t('contact_login_required'));
      const response = await fetch('/api/v1/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ category, message }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? t('contact_send_error'));
      setStatus('success'); setMessage('');
    } catch (caught) {
      setStatus('error'); setError(caught instanceof Error ? caught.message : t('contact_send_error'));
    }
  }

  return <>
    <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center hover:text-white/60 transition-colors">{t('footer_contact')}</button>
    {open && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="contact-title" className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#10121b] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div><div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-violet-500/15 text-violet-300"><Mail size={19} /></div><h2 id="contact-title" className="text-xl font-bold text-white">{t('contact_title')}</h2><p className="mt-1 text-sm text-white/45">{t('contact_description')}</p></div>
          <button type="button" onClick={close} disabled={status === 'sending'} aria-label={t('contact_close')} className="rounded-lg p-2 text-white/45 hover:bg-white/5 hover:text-white disabled:opacity-40"><X size={18} /></button>
        </div>
        {status === 'success' ? <div className="mt-6 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-5 text-sm text-emerald-100" role="status"><p className="font-bold">{t('contact_success_title')}</p><p className="mt-2 leading-6 text-emerald-100/80">{t('contact_success_description')}</p><button type="button" onClick={close} className="btn-primary-compact mt-5 px-4 py-2 text-sm">{t('contact_close')}</button></div> : <form className="mt-6 space-y-4" onSubmit={(event) => void submit(event)}>
          <label className="block text-sm font-medium text-white/75" htmlFor="contact-category">{t('contact_category')}</label>
          <select id="contact-category" value={category} onChange={(event) => setCategory(event.target.value as typeof category)} className="input-dark w-full rounded-xl px-4 py-3 text-sm">
            {categories.map(([value, key]) => <option key={value} value={value}>{t(key)}</option>)}
          </select>
          <label className="block text-sm font-medium text-white/75" htmlFor="contact-message">{t('contact_message')}</label>
          <textarea ref={messageRef} id="contact-message" value={message} onChange={(event) => setMessage(event.target.value)} minLength={10} maxLength={5000} required aria-describedby="contact-message-help" className="input-dark min-h-36 w-full rounded-xl px-4 py-3 text-sm" placeholder={t('contact_message_placeholder')} />
          <p id="contact-message-help" className="text-xs text-white/35">{t('contact_message_help')}</p>
          {status === 'error' && <p role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
          <button type="submit" disabled={status === 'sending' || message.trim().length < 10} className="btn-primary flex w-full items-center justify-center gap-2 px-4 py-3 text-sm disabled:opacity-50">{status === 'sending' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}{status === 'sending' ? t('contact_sending') : t('contact_send')}</button>
        </form>}
      </section>
    </div>}
  </>;
}
