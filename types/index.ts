// ============================================================
// 글로벌 바이럴 숏폼 로컬라이징 파이프라인 - 공용 타입 정의
// ============================================================

export type SupportedPlatform = 'tiktok' | 'youtube';

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
  source_url: string | null;
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
  sourceEvidence?: 'subtitles' | 'description' | 'title_only';
  creatorCountry?: string;
  engagementMetrics?: {
    views?: number;
    likes?: number;
  };
}

// ─── AI 출력 스키마 타입 ──────────────────────────────────

export interface AudioScript {
  kr: string;
  us: string;
  jp: string;
}

export type LocalizedCaptions = AudioScript;

export interface AiVideoPrompts {
  veo: string;
  runway: string;
  kling: string;
  generic: string;
}

export interface SceneScript {
  scene_number: number;
  start_time: string;
  end_time: string;
  purpose: string;
  visual_description: string;
  subject_description: string;
  subject_action: string;
  product_placement: string;
  camera_shot: string;
  camera_movement: string;
  lens: string;
  lighting: string;
  color_mood: string;
  emotion: string;
  audio_script: AudioScript;
  captions: LocalizedCaptions;
  sound_effect: string;
  background_music: string;
  ai_prompts: AiVideoPrompts;
  /** @deprecated 구형 저장 결과 호환 */
  timestamp?: string;
  /** @deprecated 구형 저장 결과 호환 */
  duration_seconds?: number;
  /** @deprecated 구형 저장 결과 호환 */
  hook_strategy?: string;
  /** @deprecated 구형 저장 결과 호환 */
  visual_direction?: string;
  /** @deprecated 구형 저장 결과 호환 */
  ai_video_prompt_en?: string;
}

export interface GenerationOutput {
  schema_version: 2;
  source_url: string;
  project_title: string;
  target_product: string;
  concept: string;
  target_audience: string;
  video_goal: string;
  duration_seconds: number;
  overall_viral_strategy: string;
  hook: string;
  final_cta: string;
  structure_analysis: {
    hook_pattern: string;
    audience_problem: string;
    emotional_arc: string;
    editing_pattern: string;
    caption_pattern: string;
    product_placement_pattern: string;
    reusable_structure: string;
    restricted_elements: string[];
  };
  scenes: SceneScript[];
  voiceover: AudioScript;
  captions: Array<{
    language: 'kr' | 'us' | 'jp';
    text: string;
    start_time: string;
    end_time: string;
    emphasis?: string;
  }>;
  editing_timeline: Array<{
    start_time: string;
    end_time: string;
    visual: string;
    caption: string;
    voiceover: string;
    sound_effect: string;
    background_music: string;
    transition: string;
    editing_note: string;
  }>;
  compliance_notes: string[];
  /** @deprecated 구형 저장 결과 호환 */
  total_duration_seconds?: number;
  /** @deprecated 구형 저장 결과 호환 */
  copy_ready_prompt_ko?: string;
}

// ─── API 요청/응답 타입 ───────────────────────────────────

export interface AnalyzeRequest {
  url?: string;
  targetProduct?: string;
  userCustomPrompt?: string;
}

export interface AnalyzeResponse {
  success: boolean;
  data?: GenerationOutput;
  cached?: boolean;
  creditsRemaining?: number;
  creditCostApplied?: number;
  durationSeconds?: number;
  generationId?: string | null;
  feedbackEligible?: boolean;
  requiredCredits?: number;
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
