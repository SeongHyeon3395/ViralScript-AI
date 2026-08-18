import type { CreditPlan } from '@/types';

/** 크레딧 과금 단위 */
export const CREDIT_COST = {
  FULL_ANALYSIS: 5,    // 대본 생성 1회 (스크래핑 + AI)
  CACHE_HIT: 5,        // 동일 URL도 대본 생성 1회로 계산
  BYOK_ANALYSIS: 5,    // BYOK 모드도 대본 생성 1회로 계산
} as const;

/** 판매 크레딧 플랜 */
export const CREDIT_PLANS: CreditPlan[] = [
  {
    id: 'starter',
    name: 'Starter Pack',
    credits: 30,
    priceKrw: 19800,
    priceUsd: 14.99,
    description: '첫 시작을 위한 기본 팩 · 6회 생성 가능',
  },
  {
    id: 'pro',
    name: 'Pro Pack',
    credits: 90,
    priceKrw: 49500,
    priceUsd: 37.99,
    description: '마케터 추천 · 18회 생성 가능',
  },
  {
    id: 'agency',
    name: 'Agency Pack',
    credits: 300,
    priceKrw: 138000,
    priceUsd: 99.99,
    description: '에이전시·팀 용 대용량 팩 · 60회 생성 가능',
  },
];

/** USD → KRW 환율 (실제 운영 시 외부 환율 API로 교체 권장) */
export const USD_TO_KRW_RATE = 1380;

