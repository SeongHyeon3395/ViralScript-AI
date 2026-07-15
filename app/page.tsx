'use client';

import { useState, useEffect } from 'react';
import {
  Sparkles, Rocket, ArrowRight, Play, Globe, BarChart3, Film, Zap,
  Gift, Star, Shield, Users,
} from 'lucide-react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import DailyRewardWheel from './components/DailyRewardWheel';
import TrendFeed from './components/TrendFeed';
import { t } from './components/LanguageSwitcher';

const FEATURES = [
  { icon: BarChart3, titleKey: 'feature_viral_title', descKey: 'feature_viral_desc', color: 'text-violet-400', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.2)' },
  { icon: Globe, titleKey: 'feature_localize_title', descKey: 'feature_localize_desc', color: 'text-cyan-400', bg: 'rgba(6,182,212,0.08)', border: 'rgba(6,182,212,0.2)' },
  { icon: Film, titleKey: 'feature_visual_title', descKey: 'feature_visual_desc', color: 'text-pink-400', bg: 'rgba(236,72,153,0.08)', border: 'rgba(236,72,153,0.2)' },
  { icon: Zap, titleKey: 'feature_cache_title', descKey: 'feature_cache_desc', color: 'text-amber-400', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
];

const STATS = [
  { value: '1분', labelKey: 'stats_gen' }, { value: '3개국', labelKey: 'stats_locale' },
  { value: '99.9%', labelKey: 'stats_uptime' }, { value: '50K+', labelKey: 'stats_scripts' },
];

export default function Home() {
  const [credits, setCredits] = useState(0);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  function handleRewardClaimed(amount: number) { setCredits(c => c + amount); }
  
  if (!mounted) return null;

  return (
    <>
      <Navbar />
      <main className="flex-1">
        {/* HERO */}
        <section className="relative pt-16 sm:pt-20 pb-12 sm:pb-16 px-4 sm:px-6 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] sm:w-[900px] h-[400px] sm:h-[500px] rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />
          <div className="absolute top-40 left-1/3 w-[200px] sm:w-[300px] h-[200px] sm:h-[300px] rounded-full bg-cyan-500/8 blur-3xl pointer-events-none" />
          <div className="relative mx-auto max-w-4xl text-center space-y-6 px-4">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15] text-white">
              {t('hero_title')}<br /><span className="gradient-text">{t('hero_title2')}</span>
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-white/50 max-w-2xl mx-auto leading-relaxed px-4">
              {t('hero_desc')}
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 pt-2 w-full sm:w-auto">
              <a href="/generator" className="btn-primary flex items-center justify-center gap-2 px-6 py-3 w-full sm:w-auto"><Rocket size={16} />{t('cta_start')}<ArrowRight size={15} /></a>
              <a href="/pricing" className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-medium text-white/60 hover:text-white border border-white/10 hover:bg-white/5 transition-all w-full sm:w-auto"><Play size={14} />{t('cta_credits')}</a>
            </div>
          </div>
        </section>

        {/* STATS */}
        <section className="border-y border-white/6 py-10 px-4 sm:px-6">
          <div className="mx-auto max-w-4xl grid grid-cols-2 sm:grid-cols-4 gap-6">
            {STATS.map((s, i) => (
              <div key={i} className="text-center"><p className="text-3xl font-extrabold gradient-text">{s.value}</p><p className="text-xs text-white/40 mt-1 font-medium">{t(s.labelKey)}</p></div>
            ))}
          </div>
        </section>

        {/* FEATURES */}
        <section className="py-12 sm:py-16 px-4 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <div className="text-center mb-8 sm:mb-12 space-y-3 px-4">
              <span className="badge badge-purple inline-flex"><Sparkles size={11} />{t('nav_features')}</span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">{t('features_title')}</h2>
              <p className="text-white/40 max-w-lg mx-auto text-xs sm:text-sm">{t('features_desc')}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {FEATURES.map((f) => (
                <div key={f.titleKey} className="rounded-2xl p-6 card-hover" style={{ background: f.bg, border: `1px solid ${f.border}` }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(255,255,255,0.05)' }}><f.icon size={20} className={f.color} /></div>
                  <h3 className="font-bold text-white mb-2">{t(f.titleKey)}</h3>
                  <p className="text-sm text-white/50 leading-relaxed">{t(f.descKey)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TREND FEED */}
        <section className="py-12 sm:py-16 px-4 sm:px-6 border-t border-white/5">
          <div className="mx-auto max-w-5xl">
            <TrendFeed />
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="py-12 sm:py-16 px-4 sm:px-6 border-t border-white/5 scroll-mt-20">
          <div className="mx-auto max-w-5xl">
            <div className="text-center mb-8 sm:mb-10 space-y-3 px-4">
              <span className="badge badge-amber inline-flex"><Star size={11} />{t('nav_credits')}</span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">{t('pricing_title')}</h2>
              <p className="text-white/40 text-xs sm:text-sm">{t('pricing_desc')}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
              {[
                { icon: Gift, titleKey: 'free_roulette_title', descKey: 'free_roulette_desc', badgeKey: 'free_roulette_badge', badgeClass: 'badge-green', highlight: false },
                { icon: Play, titleKey: 'free_ad_title', descKey: 'free_ad_desc', badgeKey: 'free_ad_badge', badgeClass: 'badge-amber', highlight: true },
                { icon: Users, titleKey: 'free_invite_title', descKey: 'free_invite_desc', badgeKey: 'free_invite_badge', badgeClass: 'badge-purple', highlight: false },
              ].map(({ icon: Icon, titleKey, descKey, badgeKey, badgeClass, highlight }) => (
                <div key={titleKey} className={`relative rounded-2xl p-6 card-hover flex flex-col ${highlight ? 'glow-purple' : ''}`}
                  style={{ background: highlight ? 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(79,70,229,0.10) 100%)' : 'rgba(13,13,20,0.6)', border: highlight ? '1px solid rgba(124,58,237,0.4)' : '1px solid rgba(255,255,255,0.08)' }}>
                  {highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2"><span className="badge badge-amber px-3 py-1 text-xs"><Star size={10} fill="currentColor" />{t('recommended')}</span></div>}
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border border-violet-500/20 flex items-center justify-center mb-4"><Icon size={18} className="text-violet-400" /></div>
                  <p className="text-base font-bold text-white mb-1">{t(titleKey)}</p>
                  <span className={`badge ${badgeClass} text-xs mb-3 inline-block`}>{t(badgeKey)}</span>
                  <p className="text-sm text-white/50 leading-relaxed">{t(descKey)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <DailyRewardWheel onClaim={handleRewardClaimed} />
    </>
  );
}