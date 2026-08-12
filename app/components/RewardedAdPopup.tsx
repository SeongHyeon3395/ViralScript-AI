'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
    adBreak?: (config: {
      type: 'reward';
      name: string;
      beforeReward: (showAd: () => void) => void;
      adViewed: () => void;
      adDismissed: () => void;
      adBreakDone?: (detail: { breakStatus?: string }) => void;
    }) => void;
  }
}

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID ?? 'ca-pub-3940256099942544';
const ADSENSE_SLOT = process.env.NEXT_PUBLIC_ADSENSE_REWARDED_AD_SLOT ?? '5224354917';
const REWARD_AMOUNT = 3;

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
  const [errorMessage, setErrorMessage] = useState('');
  const adCalledRef = useRef(false);

  const handleAdRewardGranted = useCallback(async function handleAdRewardGranted() {
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

      onRewardClaimed(data.creditsAwarded === REWARD_AMOUNT ? data.creditsAwarded : REWARD_AMOUNT);
      window.dispatchEvent(new CustomEvent('credits:updated'));
      window.dispatchEvent(new CustomEvent('app:toast', {
        detail: { message: `+${data.creditsAwarded === REWARD_AMOUNT ? data.creditsAwarded : REWARD_AMOUNT} 크레딧이 지급되었습니다!`, variant: 'success' },
      }));
      setPhase('complete');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      window.dispatchEvent(new CustomEvent('app:toast', {
        detail: { message: err instanceof Error ? err.message : '광고 보상에 실패했습니다.', variant: 'error' },
      }));
      setPhase('error');
    }
  }, [onRewardClaimed]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      const resetTimer = window.setTimeout(() => {
        setPhase('idle');
        setProgress(0);
        setCountdown(30);
        setErrorMessage('');
        adCalledRef.current = false;
      }, 0);

      return () => window.clearTimeout(resetTimer);
    }
  }, [isOpen]);

  // 광고 표시 중에는 진행 상태만 보여주며, 보상은 adViewed 콜백에서만 지급한다.
  useEffect(() => {
    if (phase !== 'watching') return;

    if (countdown <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setCountdown((c) => {
        const next = c - 1;
        setProgress(((30 - next) / 30) * 100);
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, countdown]);

  // ─── Ad Placement API 스크립트 동적 로드 ───────────────────
  function loadAdSenseScript(): Promise<void> {
    return new Promise((resolve) => {
      if (window.adBreak || document.querySelector('script[src*="adsbygoogle"]')) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
      script.crossOrigin = 'anonymous';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => resolve(); // 실패해도 fallback 진행
      document.head.appendChild(script);
    });
  }

  // ─── 광고 시작 ─────────────────────────────────────────────
  async function startWatching() {
    setPhase('loading');
    adCalledRef.current = false;

    try {
      await loadAdSenseScript();

      if (!window.adBreak) {
        throw new Error('Ad Placement API를 불러오지 못했습니다.');
      }

      window.adBreak({
        type: 'reward',
        name: `reward-${ADSENSE_SLOT}`,
        beforeReward: (showAd) => {
          setPhase('watching');
          showAd();
        },
        adViewed: () => {
          // 완주 콜백에서만 서버 원자적 적립
          if (!adCalledRef.current) {
            adCalledRef.current = true;
            void handleAdRewardGranted();
          }
        },
        adDismissed: () => {
          // 중도 종료는 적립하지 않고 모달만 닫음
          adCalledRef.current = false;
          setPhase('idle');
          onClose();
        },
        adBreakDone: ({ breakStatus }) => {
          if (breakStatus === 'viewed') return;
          setPhase('idle');
        },
      });
    } catch {
      setErrorMessage('광고를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
      setPhase('error');
    }
  }

  function claimReward() {
    setPhase('claimed');
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
            <button
              onClick={() => { setPhase('idle'); onClose(); }}
              className="absolute top-4 right-4 z-20 w-8 h-8 rounded-xl flex items-center justify-center text-white/60 hover:text-white hover:bg-black/50 transition-all"
              aria-label="광고 닫기"
            >
              <X size={18} />
            </button>
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

            </div>

            <div className="p-4 text-center text-xs text-white/30">
              {t('ad_watching')}
            </div>
          </div>
        )}

        {phase === 'complete' && (
          <div className="p-8 text-center space-y-5">
            <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-all" aria-label="닫기">
              <X size={18} />
            </button>
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
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-all"
              aria-label="닫기"
            >
              <X size={18} />
            </button>
            <Loader2 size={40} className="text-amber-400 animate-spin mx-auto" />
            <p className="text-white/60 text-sm">{t('loading')}</p>
            <p className="text-white/30 text-xs">광고를 불러오는 중입니다...</p>
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