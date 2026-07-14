'use client';

import { useState } from 'react';
import { Star, Shield, Zap, Check, ArrowRight, Sparkles, Gift, Play, Users } from 'lucide-react';
import { CREDIT_PLANS } from '@/lib/credits';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

const PAYMENT_ENABLED = process.env.NEXT_PUBLIC_ENABLE_PAYMENT === 'true';

export default function PricingPage() {
  const [user, setUser] = useState<SupabaseUser | null>(null);

  useState(() => {
    getSupabaseBrowserClient().auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUser(session.user);
    });
  });

  return (
    <>
      <Navbar />
      <main className="flex-1 pt-24 pb-20 px-4 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-14 space-y-3">
            <span className="badge badge-amber inline-flex"><Star size={11} /> 크레딧</span>
            {PAYMENT_ENABLED ? (
              <>
                <h2 className="text-3xl font-bold text-white">크레딧 충전 플랜</h2>
                <p className="text-white/40 text-sm">필요할 때만 충전하세요. 구독 없음, 만료 없음.</p>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-bold text-white">무료로 시작하세요</h2>
                <p className="text-white/40 text-sm">광고 시청으로 크레딧을 충전하고 무한 분석을 즐기세요.</p>
              </>
            )}
          </div>

          {PAYMENT_ENABLED ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {CREDIT_PLANS.map((plan, i) => {
                  const isPro = i === 1;
                  return (
                    <div key={plan.id} className={`relative rounded-2xl p-7 card-hover flex flex-col ${isPro ? 'glow-purple' : ''}`}
                      style={{ background: isPro ? 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(79,70,229,0.10) 100%)' : 'rgba(13,13,20,0.6)', border: isPro ? '1px solid rgba(124,58,237,0.4)' : '1px solid rgba(255,255,255,0.08)' }}>
                      {isPro && <div className="absolute -top-3 left-1/2 -translate-x-1/2"><span className="badge badge-purple px-3 py-1 text-xs"><Star size={10} fill="currentColor" />가장 인기</span></div>}
                      <div className="flex-1">
                        <p className="text-xs font-bold text-white/40 tracking-widest uppercase mb-3">{plan.name}</p>
                        <div className="flex items-end gap-1 mb-1"><span className="text-4xl font-extrabold text-white">{plan.credits}</span><span className="text-sm text-white/40 mb-1.5 ml-1">크레딧</span></div>
                        <p className={`text-2xl font-bold mb-0.5 ${isPro ? 'gradient-text' : 'text-violet-400'}`}>₩{plan.priceKrw.toLocaleString()}</p>
                        <p className="text-xs text-white/30">${plan.priceUsd} USD</p>
                        <p className="text-sm text-white/50 mt-4 leading-relaxed">{plan.description}</p>
                      </div>
                      <button className={`mt-6 w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all ${isPro ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-violet-500/20' : 'border border-white/15 text-white/70 hover:bg-white/8 hover:text-white'}`}>충전하기<ArrowRight size={14} /></button>
                    </div>
                  );
                })}
              </div>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-white/30">
                {[{ icon: Shield, text: '안전한 결제 처리' }, { icon: Zap, text: '즉시 크레딧 지급' }, { icon: Check, text: '환불 정책 보장' }].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-1.5"><Icon size={13} />{text}</div>
                ))}
              </div>
            </>
          ) : (
            <>
              {/* 로그인 유저에게만 무료 충전 카드 표시 */}
              {user ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  {[
                    { icon: Gift, title: '출석 룰렛', desc: '매일 접속하고 룰렛을 돌려 최대 10 크레딧을 획득하세요.', badge: '매일 무료', badgeClass: 'badge-green', action: '룰렛 돌리기', href: '/generator', highlight: false },
                    { icon: Play, title: '광고 보상 충전', desc: '30초 광고를 보고 즉시 3 크레딧을 무료로 받으세요. 하루 최대 5회.', badge: '하루 5회', badgeClass: 'badge-amber', action: '광고 보고 충전하기', href: '/generator', highlight: true },
                    { icon: Gift, title: '친구 초대', desc: '친구가 가입하면 나도 3 크레딧, 친구도 3 크레딧.', badge: '무제한', badgeClass: 'badge-purple', action: '초대하기', href: '/generator', highlight: false },
                  ].map(({ icon: Icon, title, desc, badge, badgeClass, action, href, highlight }) => (
                    <div key={title} className={`relative rounded-2xl p-7 card-hover flex flex-col ${highlight ? 'glow-purple' : ''}`}
                      style={{ background: highlight ? 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(79,70,229,0.10) 100%)' : 'rgba(13,13,20,0.6)', border: highlight ? '1px solid rgba(124,58,237,0.4)' : '1px solid rgba(255,255,255,0.08)' }}>
                      {highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2"><span className="badge badge-amber px-3 py-1 text-xs"><Star size={10} fill="currentColor" />추천</span></div>}
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
              ) : (
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mx-auto mb-4"><Sparkles size={28} className="text-white" /></div>
                  <h3 className="text-xl font-bold text-white mb-2">로그인이 필요합니다</h3>
                  <p className="text-sm text-white/40 mb-6">로그인 후 무료 크레딧 충전 방법을 확인하세요.</p>
                  <a href="/" className="btn-primary inline-flex items-center gap-2 px-6 py-3">로그인하러 가기<ArrowRight size={15} /></a>
                </div>
              )}

              {user && (
                <div className="mt-8 rounded-2xl px-6 py-4 flex items-center gap-4 text-sm" style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)' }}>
                  <Shield size={16} className="text-violet-400 shrink-0" />
                  <span className="text-white/40">유료 크레딧 플랜은 서비스 안정화 후 순차적으로 오픈될 예정입니다. 지금은 <span className="text-violet-300 font-medium">광고 보상 · 출석 룰렛 · 친구 초대</span>로 무료 크레딧을 무제한 충전하세요.</span>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}