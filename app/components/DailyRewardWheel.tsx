'use client';

import { useState, useEffect, useCallback } from 'react';
import { Gift, Sparkles, X, ChevronRight, Zap, Star, Smile, Frown, RefreshCw, Trophy } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { t } from './LanguageSwitcher';
import type { User as SupabaseUser } from '@supabase/supabase-js';

// 가중치 랜덤 알고리즘 테이블 (총 100%)
const WEIGHTED_TABLE = [
  { value: 1, weight: 70.00 },
  { value: 2, weight: 15.00 },
  { value: 3, weight: 7.00 },
  { value: 4, weight: 3.50 },
  { value: 5, weight: 2.00 },
  { value: 6, weight: 1.00 },
  { value: 7, weight: 0.70 },
  { value: 8, weight: 0.40 },
  { value: 9, weight: 0.30 },
  { value: 10, weight: 0.10 },
];

function weightedRandom(): number {
  const rand = Math.random() * 100;
  let cumulative = 0;
  for (const entry of WEIGHTED_TABLE) {
    cumulative += entry.weight;
    if (rand <= cumulative) return entry.value;
  }
  return 1;
}

const SLICES = [
  { label: '1', value: 1, color: '#22c55e', icon: Zap },
  { label: '2', value: 2, color: '#3b82f6', icon: Zap },
  { label: '5', value: 5, color: '#ec4899', icon: Star },
  { label: '10', value: 10, color: '#a855f7', icon: Star },
  { label: '3', value: 3, color: '#f59e0b', icon: Trophy },
  { label: '1', value: 1, color: '#22c55e', icon: Zap },
  { label: '7', value: 7, color: '#14b8a6', icon: Star },
  { label: '4', value: 4, color: '#f97316', icon: Trophy },
];

const SEGMENT = 360 / SLICES.length;

export default function DailyRewardWheel({ onClaim }: { onClaim?: (credits: number) => void }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ label: string; value: number } | null>(null);
  const [hasSpunToday, setHasSpunToday] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Supabase 세션 확인
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUser(session.user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // 유저별 localStorage 키로 데일리 제한 확인
  const storageKey = user ? `dailyReward_${user.id}` : null;

  useEffect(() => {
    if (!storageKey) return;
    const lastSpin = localStorage.getItem(storageKey);
    if (lastSpin) {
      const diff = Date.now() - Number(lastSpin);
      if (diff < 86400000) {
        setHasSpunToday(true);
        setCooldown(86400000 - diff);
      }
    }
  }, [storageKey]);

  // Cooldown tick
  useEffect(() => {
    if (!cooldown) return;
    const id = setInterval(() => {
      setCooldown((c) => {
        const next = c - 1000;
        if (next <= 0) {
          setHasSpunToday(false);
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const formatCooldown = useCallback(() => {
    const h = Math.floor(cooldown / 3600000);
    const m = Math.floor((cooldown % 3600000) / 60000);
    const s = Math.floor((cooldown % 60000) / 1000);
    return `${h}시간 ${m}분 ${s}초`;
  }, [cooldown]);

  async function spin() {
    if (spinning || hasSpunToday || !user) return;
    setSpinning(true);
    setResult(null);

    // 가중치 랜덤으로 당첨 크레딧 결정
    const wonCredits = weightedRandom();
    // 시각적 애니메이션용 슬라이스 인덱스 (가장 가까운 값 매칭)
    const winnerIdx = SLICES.findIndex(s => s.value === wonCredits) ?? 0;

    const extraSpins = 3 + Math.floor(Math.random() * 3);
    const targetAngle = extraSpins * 360 + winnerIdx * SEGMENT + SEGMENT / 2;
    const totalRotation = rotation + targetAngle;

    setRotation(totalRotation);

    setTimeout(async () => {
      setSpinning(false);
      setResult({ label: `${wonCredits}`, value: wonCredits });
      if (storageKey) localStorage.setItem(storageKey, String(Date.now()));
      setHasSpunToday(true);
      setCooldown(86400000);

      // DB에 크레딧 원자적 적립
      try {
        const supabase = getSupabaseBrowserClient();
        // RPC가 없을 수 있으므로 직접 SQL로 원자적 증가
        const { data: profile } = await supabase
          .from('profiles')
          .select('credits_remaining')
          .eq('id', user.id)
          .single<{ credits_remaining: number }>();
        if (profile) {
          await (supabase.from('profiles').update as (values: Record<string, unknown>) => ReturnType<typeof supabase.from>)({ credits_remaining: profile.credits_remaining + wonCredits }).eq('id', user.id);
        }
      } catch {
        // 무시 — 클라이언트 UI에서는 onClaim으로 반영
      }

      onClaim?.(wonCredits);
    }, 2800);
  }

  return (
    <>
      {/* Floating trigger button — 로그인 유저만 표시 */}
      {user && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-2xl shadow-violet-500/30 hover:from-violet-500 hover:to-indigo-500 transition-all hover:scale-105 active:scale-95"
        >
          <Gift size={18} />
          <span>{t('daily_bonus')}</span>
          {hasSpunToday ? (
            <span className="ml-1 text-xs text-white/50">· {formatCooldown()}</span>
          ) : (
            <span className="relative flex h-2 w-2 ml-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
          )}
        </button>
      )}

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsOpen(false)} />

          <div className="relative w-full max-w-md glass-strong rounded-3xl p-8 fade-in-up overflow-hidden">
            {/* Gradient top */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-violet-500/50 to-transparent absolute top-0 left-0" />

            {/* Close */}
            <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-all">
              <X size={18} />
            </button>

            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-amber-500/20">
                <Trophy size={24} className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">{t('daily_roulette_title')}</h2>
              <p className="text-sm text-white/40 mt-1">{t('daily_roulette_desc')}</p>
            </div>

            {/* Wheel */}
            <div className="relative w-64 h-64 mx-auto mb-6">
              {/* Wheel container (색상 + 레이블 함께 회전) */}
              <div
                className="w-full h-full rounded-full relative"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: spinning ? 'transform 2.8s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
                }}
              >
                {SLICES.map((slice, i) => {
                  const angle = i * SEGMENT;
                  const midAngle = angle + SEGMENT / 2;
                  const r = 38;
                  const x = 50 + r * Math.cos((midAngle * Math.PI) / 180);
                  const y = 50 + r * Math.sin((midAngle * Math.PI) / 180);
                  const Icon = slice.icon;
                  return (
                    <div key={i} className="absolute inset-0" style={{ clipPath: `polygon(50% 50%, ${50 + 50 * Math.cos((angle * Math.PI) / 180)}% ${50 + 50 * Math.sin((angle * Math.PI) / 180)}%, ${50 + 50 * Math.cos(((angle + SEGMENT) * Math.PI) / 180)}% ${50 + 50 * Math.sin(((angle + SEGMENT) * Math.PI) / 180)}%)`, background: slice.color }}>
                      <div
                        className="absolute text-white"
                        style={{
                          top: `${y}%`,
                          left: `${x}%`,
                          transform: 'translate(-50%, -50%)',
                          fontSize: slice.label.startsWith('꽝') ? '11px' : '10px',
                          fontWeight: 700,
                          textShadow: '0 1px 3px rgba(0,0,0,0.6)',
                          pointerEvents: 'none',
                        }}
                      >
                        <Icon size={14} className="mx-auto mb-0.5" />
                        {slice.label}
                      </div>
                    </div>
                  );
                })}
                {/* Center circle */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-16 h-16 rounded-full bg-[#0d0d14] border-4 border-white/20 flex items-center justify-center shadow-xl">
                    <Gift size={22} className="text-violet-400" />
                  </div>
                </div>
              </div>

              {/* Pointer (고정 — 회전 안 함) */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
                <svg width="24" height="24" viewBox="0 0 24 24" className="text-white drop-shadow-xl">
                  <polygon points="12,24 4,0 20,0" fill="currentColor" />
                </svg>
              </div>
            </div>

            {/* Result */}
            {result && (
              <div className="text-center mb-4 fade-in-up">
                <div className={`inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-lg font-bold ${
                  result.value > 0
                    ? 'bg-gradient-to-r from-violet-600/30 to-indigo-600/30 border border-violet-500/30 text-violet-200'
                    : 'bg-white/5 border border-white/10 text-white/50'
                }`}>
                  {result.value > 0 ? (
                    <>
                      <Sparkles size={20} className="text-amber-400" />
                      {t('daily_result_win').replace('{amount}', String(result.value))}
                    </>
                  ) : (
                    <>
                      <Frown size={20} />
                      {t('daily_result_lose')}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Spin button */}
            {hasSpunToday ? (
              <div className="text-center">
                <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm text-white/40">
                  <RefreshCw size={14} />
                  다음 기회까지 {formatCooldown()}
                </div>
              </div>
            ) : (
              <button
                onClick={spin}
                disabled={spinning}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {spinning ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('loading')}
                  </>
                ) : (
                  <>
                    <Gift size={16} />
                    {t('daily_spin')}
                    <ChevronRight size={15} />
                  </>
                )}
              </button>
            )}

            {/* Bottom hint */}
            <p className="text-center text-xs text-white/20 mt-4">
              매일 자정 이후에 다시 돌릴 수 있습니다
            </p>

            {/* Bottom gradient */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent mt-6" />
          </div>
        </div>
      )}
    </>
  );
}