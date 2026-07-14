// ============================================================
// 글로벌 바이럴 숏폼 로컬라이징 파이프라인 - 공용 타입 정의
// ============================================================

export type SupportedPlatform = 'tiktok' | 'youtube' | 'instagram';

export type SubscriptionPlan = 'free' | 'pro' | 'agency';

export type PaymentStatus = 'success' | 'failed' | 'refunded';

export type PgProvider = 'stripe' | 'toss';

// ─── DB 엔티티 타입 ───────────────────────────────────────

export interface Profile {
  id: string;
  email: string;
  subscription_plan: SubscriptionPlan;
  credits_remaining: number;
  stripe_customer_id: string | null;
  toss_billing_key: string | null;
  custom_gemini_key: string | null; // BYOK 모드용 (암호화 저장)
  custom_apify_token: string | null; // BYOK 모드용 (암호화 저장)
  created_at: string;
  updated_at: string;
}

export interface ScriptCache {
  url_hash: string;
  original_url: string;
  platform: SupportedPlatform;
  video_duration_sec: number;
  analysis_result: GenerationOutput;
  hit_count: number;
  created_at: string;
  expires_at: string;
}

export interface UserGenerationHistory {
  id: string;
  user_id: string;
  source_url: string;
  project_title: string;
  target_product_name: string;
  generated_json: GenerationOutput;
  credits_used: number;
  created_at: string;
}

export interface BillingTransaction {
  id: string;
  user_id: string;
  pg_provider: PgProvider;
  transaction_id: string;
  amount_krw: number;
  amount_usd: number;
  credits_added: number;
  status: PaymentStatus;
  created_at: string;
}

// ─── URL 처리 타입 ────────────────────────────────────────

export interface NormalizedUrlResult {
  platform: SupportedPlatform;
  normalizedUrl: string;
  urlHash: string; // SHA-256
}

// ─── 스크래핑 메타데이터 타입 ────────────────────────────

export interface ScrapedMetadata {
  durationSeconds: number;
  transcriptText: string;
  creatorCountry?: string;
  engagementMetrics?: {
    views: number;
    likes: number;
  };
}

// ─── AI 출력 스키마 타입 ──────────────────────────────────

export interface AudioScript {
  kr: string;
  us: string;
  jp: string;
}

export interface SceneScript {
  scene_number: number;
  timestamp: string; // e.g. "00:00 - 00:03"
  duration_seconds: number;
  hook_strategy: string;
  visual_direction: string;
  ai_video_prompt_en: string; // Runway/Midjourney 투입용 100% 영어 프롬프트
  audio_script: AudioScript;
}

export interface GenerationOutput {
  project_title: string;
  target_product: string;
  total_duration_seconds: number;
  overall_viral_strategy: string;
  scenes: SceneScript[];
}

// ─── API 요청/응답 타입 ───────────────────────────────────

export interface AnalyzeRequest {
  url: string;
  targetProduct: string;
  userCustomPrompt?: string;
}

export interface AnalyzeResponse {
  success: boolean;
  data?: GenerationOutput;
  cached?: boolean;
  creditsRemaining?: number;
  error?: string;
  errorCode?: string;
}

export interface CreditPlan {
  id: string;
  name: string;
  credits: number;
  priceKrw: number;
  priceUsd: number;
  description: string;
}

// ─── 오류 코드 상수 ────────────────────────────────────────

export const ERROR_CODES = {
  INVALID_URL_FORMAT: 'INVALID_URL_FORMAT',
  UNSUPPORTED_PLATFORM: 'UNSUPPORTED_PLATFORM',
  NOT_A_YOUTUBE_SHORTS_URL: 'NOT_A_YOUTUBE_SHORTS_URL',
  NOT_AN_INSTAGRAM_REEL_URL: 'NOT_AN_INSTAGRAM_REEL_URL',
  INSUFFICIENT_CREDITS: 'INSUFFICIENT_CREDITS',
  URL_PRIVATE_OR_DELETED: 'ERR_URL_PRIVATE_OR_DELETED',
  SCRAPER_TIMEOUT: 'ERR_SCRAPER_TIMEOUT',
  AI_MODERATION_BLOCK: 'ERR_AI_MODERATION_BLOCK',
  DB_TRANSACTION_FAIL: 'ERR_DB_TRANSACTION_FAIL',
  MIDDLEWARE_SCRAPING_FAILED: 'MIDDLEWARE_SCRAPING_FAILED',
  AI_GENERATION_FAILED: 'AI_GENERATION_FAILED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
