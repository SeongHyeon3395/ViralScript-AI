'use client';

import { useState, useEffect, useCallback } from 'react';
import { Gift, Sparkles, X, ChevronRight, Zap, Star, Frown, RefreshCw, Trophy } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { t } from './LanguageSwitcher';
import type { User as SupabaseUser } from '@supabase/supabase-js';

const ROULETTE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

function msUntilNextSpin(lastSpinAt: string): number {
  return Math.max(0, new Date(lastSpinAt).getTime() + ROULETTE_COOLDOWN_MS - Date.now());
}

const SLICES = [
  { label: '1', value: 1, color: '#22c55e', icon: Zap },
  { label: '2', value: 2, color: '#3b82f6', icon: Zap },
  { label: '5', value: 5, color: '#ec4899', icon: Star },
  { label: '1', value: 1, color: '#10b981', icon: Zap },
  { label: '3', value: 3, color: '#f59e0b', icon: Trophy },
  { label: '1', value: 1, color: '#16a34a', icon: Zap },
  { label: '4', value: 4, color: '#f97316', icon: Trophy },
  { label: '1', value: 1, color: '#059669', icon: Zap },
];

const SEGMENT = 360 / SLICES.length;
const POINTER_ANGLE = 270;
const WHEEL_RADIUS = 48;

function polarToCartesian(angle: number, radius = WHEEL_RADIUS) {
  const radians = (angle * Math.PI) / 180;
  return {
    x: 50 + radius * Math.cos(radians),
    y: 50 + radius * Math.sin(radians),
  };
}

function getSlicePath(index: number) {
  const start = polarToCartesian(index * SEGMENT);
  const end = polarToCartesian((index + 1) * SEGMENT);
  const largeArcFlag = SEGMENT > 180 ? 1 : 0;
  return `M 50 50 L ${start.x} ${start.y} A ${WHEEL_RADIUS} ${WHEEL_RADIUS} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`;
}

function alignedRotation(currentRotation: number, winnerIndex: number): number {
  const winnerCenter = winnerIndex * SEGMENT + SEGMENT / 2;
  const desiredRotation = (POINTER_ANGLE - winnerCenter + 360) % 360;
  const currentOffset = ((currentRotation % 360) + 360) % 360;
  const correction = (desiredRotation - currentOffset + 360) % 360;
  return currentRotation + 4 * 360 + correction;
}

export default function DailyRewardWheel({ onClaim }: { onClaim?: (credits: number) => void }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ label: string; value: number } | null>(null);
  const [hasSpunToday, setHasSpunToday] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  function emitToast(message: string, variant: 'success' | 'error' | 'info' = 'info') {
    window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, variant } }));
  }

  function emitCreditsUpdated() {
    window.dispatchEvent(new CustomEvent('credits:updated'));
  }

  // Supabase 세션 + DB last_roulette_spin_at 조회
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    async function initUser(uid: string) {
      setUser({ id: uid } as SupabaseUser);

      // DB에서 마지막 스핀 시간 조회 (maybeSingle로 406 방지)
      const { data, error } = await supabase
        .from('profiles')
        .select('last_roulette_spin_at')
        .eq('id', uid)
        .maybeSingle<{ last_roulette_spin_at: string | null }>();

      if (error) {
        console.warn('[DailyReward] profile fetch error:', error.message);
        return;
      }

      const lastSpinAt = data?.last_roulette_spin_at;
      if (lastSpinAt) {
        const remaining = msUntilNextSpin(lastSpinAt);
        if (remaining > 0) {
          setHasSpunToday(true);
          setCooldown(remaining);
          return;
        }
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) initUser(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) initUser(session.user.id);
      else setUser(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const openHandler = () => setIsOpen(true);
    window.addEventListener('daily-roulette:open', openHandler);
    return () => window.removeEventListener('daily-roulette:open', openHandler);
  }, []);

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
    const total = Math.max(0, cooldown);
    const h = Math.floor(total / 3600000).toString().padStart(2, '0');
    const m = Math.floor((total % 3600000) / 60000).toString().padStart(2, '0');
    const s = Math.floor((total % 60000) / 1000).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  }, [cooldown]);

  async function spin() {
    if (spinning || hasSpunToday) return;

    const supabase = getSupabaseBrowserClient();
    const { data: { user: sessionUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !sessionUser) {
      emitToast('로그인이 필요합니다.', 'error');
      setResult(null);
      return;
    }

    setUser(sessionUser);
    setSpinning(true);
    setResult(null);

    try {
      const { data: session, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session.session?.access_token) throw new Error('로그인이 필요합니다.');

      const res = await fetch('/api/roulette/claim', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.session.access_token}`, 'Content-Type': 'application/json' },
        body: '{}',
      });
      const data = await res.json() as { success?: boolean; creditsAwarded?: number; currentCredits?: number | null; error?: string; code?: string };
      const awardedCredits = data.creditsAwarded;
      if (!res.ok || !data.success || typeof awardedCredits !== 'number' || !Number.isInteger(awardedCredits) || awardedCredits < 1 || awardedCredits > 5) {
        throw new Error(data.error ?? '룰렛 보상 응답이 올바르지 않습니다.');
      }

      const winnerIndex = SLICES.findIndex((slice) => slice.value === awardedCredits);
      if (winnerIndex < 0) throw new Error('룰렛 당첨 칸을 찾지 못했습니다.');
      const totalRotation = alignedRotation(rotation, winnerIndex);
      setRotation(totalRotation);

      window.setTimeout(() => {
        setSpinning(false);
        setResult({ label: `${awardedCredits}`, value: awardedCredits });
        setHasSpunToday(true);
        setCooldown(ROULETTE_COOLDOWN_MS);
        onClaim?.(awardedCredits);
        emitCreditsUpdated();
        emitToast(`+${awardedCredits} 크레딧이 지급되었습니다!`, 'success');
      }, 2800);
    } catch (err) {
      console.error('[DailyReward] 적립 실패:', err);
      setSpinning(false);
      setResult(null);
      setHasSpunToday(false);
      setCooldown(0);
      emitToast(err instanceof Error ? err.message : '룰렛 보상에 실패했습니다.', 'error');
    }
  }

  return (
    <>
      {/* Floating trigger button — 로그인 유저만 표시 */}
      {user && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-xl border border-violet-400/30 bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 transition-all hover:from-violet-500 hover:to-indigo-500 hover:shadow-violet-500/50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Gift size={18} />
          <span>{t('daily_bonus')}</span>
          {hasSpunToday ? (
            <span className="ml-1 text-xs font-mono text-white/50">· {formatCooldown()}</span>
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
                className="relative h-full w-full rounded-full border-4 border-white/20 bg-[#0d0d14] p-1 shadow-2xl"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: spinning ? 'transform 2.8s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
                }}
                role="img"
                aria-label={t('daily_roulette_title')}
              >
                <svg viewBox="0 0 100 100" className="block h-full w-full rounded-full" aria-hidden="true">
                  {SLICES.map((slice, i) => (
                    <path
                      key={slice.label + i}
                      d={getSlicePath(i)}
                      fill={slice.color}
                      stroke="#0d0d14"
                      strokeWidth="1.1"
                      strokeLinejoin="round"
                    />
                  ))}
                  <circle cx="50" cy="50" r="47.8" fill="none" stroke="rgba(255,255,255,0.24)" strokeWidth="1" />
                </svg>

                {SLICES.map((slice, i) => {
                  const point = polarToCartesian(i * SEGMENT + SEGMENT / 2, 35);
                  return (
                    <span
                      key={slice.label + '-label-' + i}
                      className="absolute -translate-x-1/2 -translate-y-1/2 text-[11px] font-bold text-white"
                      style={{
                        top: `${point.y}%`,
                        left: `${point.x}%`,
                        textShadow: '0 1px 3px rgba(0,0,0,0.7)',
                        pointerEvents: 'none',
                      }}
                    >
                      {slice.label}
                    </span>
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
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm text-white/40">
                  <RefreshCw size={14} />
                  <span>{t('daily_cooldown_label')}</span>
                </div>
                <div className="font-mono text-2xl font-bold text-violet-300 tracking-widest">
                  {formatCooldown()}
                </div>
              </div>
            ) : (
              <button
                onClick={spin}
                disabled={spinning}
                title={spinning ? '룰렛 결과를 확인하는 중입니다.' : '오늘의 무료 룰렛을 돌립니다.'}
                className="btn-primary w-full flex items-center justify-center gap-2 rounded-xl border border-violet-400/40 font-semibold shadow-lg shadow-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50"
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
              {t('daily_cooldown_hint')}
            </p>

            {/* Bottom gradient */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent mt-6" />
          </div>
        </div>
      )}
    </>
  );
}
