'use client';

import { useState, useEffect, useRef } from 'react';
import { Star, Shield, Zap, Check, ArrowRight, Sparkles, Gift, Play, Users, LogIn } from 'lucide-react';
import { CREDIT_PLANS } from '@/lib/credits';
import Navbar from '@/app/components/Navbar';
import type { NavbarRef } from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { t } from '@/app/components/LanguageSwitcher';
import type { User as SupabaseUser } from '@supabase/supabase-js';

const PAYMENT_ENABLED = process.env.NEXT_PUBLIC_ENABLE_PAYMENT === 'true';

export default function PricingPage() {
  const navbarRef = useRef<NavbarRef>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);

  useEffect(() => {
    getSupabaseBrowserClient().auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUser(session.user);
    });
    const { data: { subscription } } = getSupabaseBrowserClient().auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <>
      <Navbar ref={navbarRef} />
      <main className="flex-1 pt-20 sm:pt-24 pb-16 sm:pb-20 px-4 sm:px-6">
        <div className="mx-auto max-w-5xl">
          {PAYMENT_ENABLED ? (
            <>
              <div className="text-center mb-10 sm:mb-14 space-y-3 px-4">
                <span className="badge badge-amber inline-flex"><Star size={11} /> {t('nav_credits')}</span>
                <h2 className="text-2xl sm:text-3xl font-bold text-white">{t('pricing_page_title')}</h2>
                <p className="text-white/40 text-xs sm:text-sm">{t('pricing_page_desc')}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {CREDIT_PLANS.map((plan, i) => {
                  const isPro = i === 1;
                  return (
                    <div key={plan.id} className={`relative rounded-2xl p-7 card-hover flex flex-col ${isPro ? 'glow-purple' : ''}`}
                      style={{ background: isPro ? 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(79,70,229,0.10) 100%)' : 'rgba(13,13,20,0.6)', border: isPro ? '1px solid rgba(124,58,237,0.4)' : '1px solid rgba(255,255,255,0.08)' }}>
                      {isPro && <div className="absolute -top-3 left-1/2 -translate-x-1/2"><span className="badge badge-purple px-3 py-1 text-xs"><Star size={10} fill="currentColor" />{t('pricing_most_popular')}</span></div>}
                      <div className="flex-1">
                        <p className="text-xs font-bold text-white/40 tracking-widest uppercase mb-3">{plan.name}</p>
                        <div className="flex items-end gap-1 mb-1"><span className="text-4xl font-extrabold text-white">{plan.credits}</span><span className="text-sm text-white/40 mb-1.5 ml-1">크레딧</span></div>
                        <p className={`text-2xl font-bold mb-0.5 ${isPro ? 'gradient-text' : 'text-violet-400'}`}>₩{plan.priceKrw.toLocaleString()}</p>
                        <p className="text-xs text-white/30">${plan.priceUsd} USD</p>
                        <p className="text-sm text-white/50 mt-4 leading-relaxed">{plan.description}</p>
                      </div>
                      <button className={`mt-6 w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all ${isPro ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-violet-500/20' : 'border border-white/15 text-white/70 hover:bg-white/8 hover:text-white'}`}>{t('pricing_charge_btn')}<ArrowRight size={14} /></button>
                    </div>
                  );
                })}
              </div>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-white/30">
                {[{ icon: Shield, text: t('pricing_secure') }, { icon: Zap, text: t('pricing_instant') }, { icon: Check, text: t('pricing_refund') }].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-1.5"><Icon size={13} />{text}</div>
                ))}
              </div>
            </>
          ) : (
            <>
              {user ? (
                <>
                  <div className="text-center mb-10 sm:mb-14 space-y-3 px-4">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white">{t('pricing_page_free_title')}</h2>
                    <p className="text-white/40 text-xs sm:text-sm">{t('pricing_page_free_desc')}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
                  {[
                    { icon: Gift, title: t('free_roulette_title'), desc: t('free_roulette_desc'), badge: t('free_roulette_badge'), badgeClass: 'badge-green', action: t('pricing_roulette_action'), href: '/generator', highlight: false },
                    { icon: Play, title: t('free_ad_title'), desc: t('free_ad_desc'), badge: t('free_ad_badge'), badgeClass: 'badge-amber', action: t('pricing_ad_action'), href: '/generator', highlight: true },
                    { icon: Gift, title: t('free_invite_title'), desc: t('free_invite_desc'), badge: t('free_invite_badge'), badgeClass: 'badge-purple', action: t('pricing_invite_action'), href: '/generator', highlight: false },
                  ].map(({ icon: Icon, title, desc, badge, badgeClass, action, href, highlight }) => (
                    <div key={title} className={`relative rounded-2xl p-7 card-hover flex flex-col ${highlight ? 'glow-purple' : ''}`}
                      style={{ background: highlight ? 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(79,70,229,0.10) 100%)' : 'rgba(13,13,20,0.6)', border: highlight ? '1px solid rgba(124,58,237,0.4)' : '1px solid rgba(255,255,255,0.08)' }}>
                      {highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2"><span className="badge badge-amber px-3 py-1 text-xs"><Star size={10} fill="currentColor" />{t('recommended')}</span></div>}
                      <div className="flex-1">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border border-violet-500/20 flex items-center justify-center mb-4"><Icon size={18} className="text-violet-400" /></div>
                        <p className="text-base font-bold text-white mb-1">{title}</p>
                        <span className={`badge ${badgeClass} text-xs mb-3`}>{badge}</span>
                        <p className="text-sm text-white/50 leading-relaxed">{desc}</p>
                      </div>
                      <a href={href} className={`mt-6 w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all ${highlight ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-amber-500/20' : 'border border-white/15 text-white/70 hover:bg-white/8 hover:text-white'}`}>{action}<ArrowRight size={14} /></a>
                    </div>
                  ))}
                </div>
                </>
              ) : (
                <section className="pt-16 pb-20 px-4">
                  <div className="mx-auto max-w-md text-center space-y-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mx-auto shadow-lg"><LogIn size={28} className="text-white" /></div>
                    <h2 className="text-2xl font-bold text-white">{t('gen_login_required')}</h2>
                    <p className="text-sm text-white/40">{t('gen_login_desc')}</p>
                    <button onClick={() => navbarRef.current?.openLoginModal()} className="btn-primary inline-flex items-center gap-2 px-6 py-3"><LogIn size={16} />{t('gen_login_btn')}<ArrowRight size={15} /></button>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}