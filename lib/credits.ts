import type { CreditPlan } from '@/types';

/** 크레딧 과금 단위 */
export const CREDIT_COST = {
  TOPIC_ONLY: 5,       // 기본 주제만으로 만드는 영상 제작 플랜
  FULL_ANALYSIS: 8,    // 참고 영상 또는 상세 설정을 포함한 영상 제작 플랜
  CACHE_HIT: 8,        // 동일 참고 영상도 대본 생성 1회로 계산
  BYOK_ANALYSIS: 8,    // BYOK 모드도 참고 영상/상세 설정 단가를 따른다
} as const;

/** 판매 크레딧 플랜 */
export const CREDIT_PLANS: CreditPlan[] = [
  {
    id: 'starter',
    name: 'Starter Pack',
    credits: 30,
    priceKrw: 9900,
    priceUsd: 7.49,
    description: 'Includes 30 credits · up to 3 generations',
  },
  {
    id: 'pro',
    name: 'Pro Pack',
    credits: 90,
    priceKrw: 29700,
    priceUsd: 22.49,
    description: 'Includes 90 credits · up to 11 generations',
  },
  {
    id: 'agency',
    name: 'Agency Pack',
    credits: 300,
    priceKrw: 89000,
    priceUsd: 64.49,
    description: 'Includes 300 credits · up to 37 generations',
  },
];

/** USD → KRW 환율 (실제 운영 시 외부 환율 API로 교체 권장) */
export const USD_TO_KRW_RATE = 1380;

