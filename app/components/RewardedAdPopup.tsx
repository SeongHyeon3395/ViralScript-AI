'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Play,
  X,
  Loader2,
  Zap,
  CheckCircle2,
  Clock,
  Volume2,
  AlertCircle,
} from 'lucide-react';
import { t } from './LanguageSwitcher';

// ─── Google AdSense 전역 타입 선언 ────────────────────────────
declare global {
  interface Window {
    adsbygoogle: {
      push: (config: Record<string, unknown>) => void;
      loaded?: boolean;
    };
  }
}

const ADS_ENABLED = process.env.NEXT_PUBLIC_ENABLE_ADS_REWARD === 'true';
const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID ?? '';
const ADSENSE_SLOT = process.env.NEXT_PUBLIC_ADSENSE_REWARDED_AD_SLOT ?? '';

interface RewardedAdPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onRewardClaimed: (credits: number) => void;
  rewardAmount?: number;
}

export default function RewardedAdPopup({
  isOpen,
  onClose,
  onRewardClaimed,
  rewardAmount = 3,
}: RewardedAdPopupProps) {
  const [phase, setPhase] = useState<'idle' | 'loading' | 'watching' | 'complete' | 'claimed' | 'error' | 'limit'>('idle');
  const [progress, setProgress] = useState(0);
  const [countdown, setCountdown] = useState(30);
  const [showSkip, setShowSkip] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const adCalledRef = useRef(false);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setPhase('idle');
      setProgress(0);
      setCountdown(30);
      setShowSkip(false);
      setErrorMessage('');
      adCalledRef.current = false;
    }
  }, [isOpen]);

  // Fallback 타이머 — AdSense 미지원 환경(개발/로컬)에서 시뮬레이션
  useEffect(() => {
    if (phase !== 'watching') return;

    if (countdown <= 0) {
      setPhase('complete');
      return;
    }

    if (countdown <= 25) setShowSkip(true);

    const interval = setInterval(() => {
      setCountdown((c) => {
        const next = c - 1;
        setProgress(((30 - next) / 30) * 100);
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, countdown]);

  // ─── AdSense 스크립트 동적 로드 ────────────────────────────
  function loadAdSenseScript(): Promise<void> {
    return new Promise((resolve) => {
      if (window.adsbygoogle?.loaded) {
        resolve();
        return;
      }
      if (!ADSENSE_CLIENT || !document.querySelector(`script[src*="adsbygoogle"]`)) {
        const script = document.createElement('script');
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
        script.crossOrigin = 'anonymous';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => resolve(); // 실패해도 fallback 진행
        document.head.appendChild(script);
      } else {
        resolve();
      }
    });
  }

  // ─── 광고 시작 ─────────────────────────────────────────────
  async function startWatching() {
    setPhase('loading');
    adCalledRef.current = false;

    // ADS_ENABLED=false(개발/로컬) 또는 AdSense 키 미설정 시 → 시뮬레이션 모드
    if (!ADS_ENABLED || !ADSENSE_CLIENT || !ADSENSE_SLOT) {
      setPhase('watching');
      return;
    }

    try {
      await loadAdSenseScript();

      window.adsbygoogle = window.adsbygoogle ?? { push: () => {} };
      window.adsbygoogle.push({
        type: 'rewarded',
        adClient: ADSENSE_CLIENT,
        adSlot: ADSENSE_SLOT,
        onReady: () => {
          setPhase('watching');
        },
        onRewardGranted: () => {
          // 광고 시청 완료 → 서버 크레딧 지급 트리거
          if (!adCalledRef.current) {
            adCalledRef.current = true;
            handleAdRewardGranted();
          }
        },
        onAdDismissed: () => {
          // 광고를 끝까지 보지 않고 닫음 → 보상 없음
          setPhase('idle');
        },
      });
    } catch {
      // AdSense 로드 실패 → 시뮬레이션 fallback
      setPhase('watching');
    }
  }

  // ─── AdSense rewardGranted → 서버 API 호출 ─────────────────
  async function handleAdRewardGranted() {
    try {
      const res = await fetch('/api/v1/monetization/ad-reward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adUnitId: ADSENSE_SLOT }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'ERR_DAILY_AD_LIMIT_EXCEEDED') {
          setPhase('limit');
          return;
        }
        throw new Error(data.error ?? '크레딧 지급 실패');
      }

      setPhase('complete');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      setPhase('error');
    }
  }

  function skipAd() {
    if (!showSkip) return;
    // 시뮬레이션 모드: 스킵 시 보상 지급 (실제 AdSense는 스킵 불가)
    if (!ADS_ENABLED || !ADSENSE_CLIENT) {
      handleAdRewardGranted();
      return;
    }
    setPhase('idle');
  }

  function claimReward() {
    setPhase('claimed');
    onRewardClaimed(rewardAmount);
    setTimeout(onClose, 1500);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={phase === 'idle' ? onClose : undefined} />

      <div className="relative w-full max-w-sm glass-strong rounded-3xl overflow-hidden fade-in-up">
        {/* Gradient top */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

        {phase === 'idle' && (
          <div className="p-8 text-center space-y-5">
            <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-all">
              <X size={18} />
            </button>

            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
              <Play size={28} className="text-white ml-1" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-white">{t('ad_watch_title')}</h2>
              <p className="text-sm text-white/40 mt-1">
                {t('ad_watch_desc')}
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-white/30">
              <Clock size={13} />
              30초 소요
              <span className="mx-1">·</span>
              <Volume2 size={13} />
              음성 있음
            </div>

            <button
              onClick={startWatching}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <Play size={16} />
              {t('ad_watch_btn')}
            </button>

            <button onClick={onClose} className="text-xs text-white/30 hover:text-white/60 transition-colors">
              {t('cancel')}
            </button>
          </div>
        )}

        {phase === 'watching' && (
          <div className="p-0">
            {/* Simulated ad player */}
            <div className="relative bg-black aspect-[9/16] flex items-center justify-center overflow-hidden">
              {/* Animated gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-violet-900/40 via-indigo-900/40 to-cyan-900/40" />
              <div className="absolute inset-0 shimmer" />

              {/* Ad content placeholder */}
              <div className="relative text-center z-10">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-3 animate-pulse">
                  <Play size={28} className="text-white ml-1" />
                </div>
                <p className="text-white/60 text-sm font-medium">Sponsored Content</p>
                <p className="text-white/30 text-xs mt-1">잠시 후 크레딧이 지급됩니다...</p>
              </div>

              {/* Progress bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-1000"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Countdown */}
              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-mono text-white/80">
                {countdown}s
              </div>

              {/* Skip button */}
              {showSkip && (
                <button
                  onClick={skipAd}
                  className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1 text-xs text-white/60 hover:text-white transition-colors"
                >
                  {t('ad_skip')}
                </button>
              )}
            </div>

            <div className="p-4 text-center text-xs text-white/30">
              {t('ad_watching')}
            </div>
          </div>
        )}

        {phase === 'complete' && (
          <div className="p-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 size={28} className="text-white" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-white">광고 시청 완료!</h2>
              <p className="text-sm text-white/40 mt-1">
                <span className="text-emerald-400 font-bold text-lg">+{rewardAmount}</span> 크레딧이 적립되었습니다
              </p>
            </div>

            <button
              onClick={claimReward}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <Zap size={16} />
              {t('ad_claim')}
            </button>
          </div>
        )}

        {phase === 'loading' && (
          <div className="p-12 text-center space-y-4">
            <Loader2 size={40} className="text-amber-400 animate-spin mx-auto" />
            <p className="text-white/60 text-sm">{t('loading')}</p>
          </div>
        )}

        {phase === 'claimed' && (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
              <Loader2 size={28} className="text-white animate-spin" />
            </div>
            <p className="text-white/60 text-sm">{t('ad_complete')}</p>
          </div>
        )}

        {phase === 'limit' && (
          <div className="p-8 text-center space-y-5">
            <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-all">
              <X size={18} />
            </button>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-600 to-red-600 flex items-center justify-center mx-auto shadow-lg shadow-orange-500/20">
              <Clock size={28} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{t('ad_limit_reached')}</h2>
            </div>
            <button onClick={onClose} className="btn-primary w-full">{t('confirm')}</button>
          </div>
        )}

        {phase === 'error' && (
          <div className="p-8 text-center space-y-5">
            <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-all">
              <X size={18} />
            </button>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600 to-rose-600 flex items-center justify-center mx-auto shadow-lg shadow-red-500/20">
              <AlertCircle size={28} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{t('ad_error')}</h2>
              <p className="text-sm text-white/40 mt-1">{errorMessage || t('retry')}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-white/60 hover:text-white hover:border-white/20 transition-all">{t('close')}</button>
              <button onClick={() => { setPhase('idle'); setErrorMessage(''); }} className="flex-1 btn-primary">{t('retry')}</button>
            </div>
          </div>
        )}

        {/* Bottom gradient */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
      </div>
    </div>
  );
}