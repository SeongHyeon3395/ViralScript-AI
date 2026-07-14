import type { CreditPlan } from '@/types';

/** 크레딧 과금 단위 */
export const CREDIT_COST = {
  FULL_ANALYSIS: 3,    // 캐시 미스: 전체 분석 (스크래핑 + AI)
  CACHE_HIT: 1,        // 캐시 히트: DB 조회만 (70% 할인)
  BYOK_ANALYSIS: 1,    // BYOK 모드: 플랫폼 이용료만
} as const;

/** 판매 크레딧 플랜 */
export const CREDIT_PLANS: CreditPlan[] = [
  {
    id: 'starter',
    name: 'Starter Pack',
    credits: 30,
    priceKrw: 19800,
    priceUsd: 14.99,
    description: '첫 시작을 위한 기본 팩 · 10회 분석 가능',
  },
  {
    id: 'pro',
    name: 'Pro Pack',
    credits: 90,
    priceKrw: 49500,
    priceUsd: 37.99,
    description: '마케터 추천 · 30회 분석 가능',
  },
  {
    id: 'agency',
    name: 'Agency Pack',
    credits: 300,
    priceKrw: 138000,
    priceUsd: 99.99,
    description: '에이전시·팀 용 대용량 팩 · 100회 분석 가능',
  },
];

/** USD → KRW 환율 (실제 운영 시 외부 환율 API로 교체 권장) */
export const USD_TO_KRW_RATE = 1380;

// ─── 영상 길이별 다이나믹 크레딧 단가 ───────────────────────────
// 0~15초   숏/챌린지  → 1 cr  (미끼 구간 — 부담 없이 중독)
// 16~30초  미드 숏폼  → 3 cr  (유튜브 쇼츠/릴스 표준)
// 31~60초  롱 숏폼   → 5 cr  (지식 창업 정보성 영상)
// 61초+    미드폼     → 8 cr  (스크래핑·번역 압박 최상)

export function getDynamicCreditCost(durationSeconds: number): number {
  if (durationSeconds <= 15) return 1;
  if (durationSeconds <= 30) return 3;
  if (durationSeconds <= 60) return 5;
  return 8;
}

export type VideoDurationTier = {
  label: string;
  maxSec: number;
  credits: number;
  desc: string;
};

export const DURATION_TIERS: VideoDurationTier[] = [
  { label: '숏/챌린지', maxSec: 15,  credits: 1, desc: '0 ~ 15초' },
  { label: '미드 숏폼', maxSec: 30,  credits: 3, desc: '16 ~ 30초' },
  { label: '롱 숏폼',   maxSec: 60,  credits: 5, desc: '31 ~ 60초' },
  { label: '미드폼',    maxSec: Infinity, credits: 8, desc: '61초 이상' },
];
