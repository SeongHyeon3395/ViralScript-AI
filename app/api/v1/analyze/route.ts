import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { normalizeAndValidateUrl } from '@/utils/urlNormalizer';
import { fetchVideoMetadata } from '@/services/scraperMiddleware';
import { generateLocalizedScripts } from '@/services/aiEngine';
import { CREDIT_COST } from '@/lib/credits';
import { ERROR_CODES } from '@/types';
import type { AnalyzeRequest, AnalyzeResponse, GenerationOutput, Profile } from '@/types';
import { AI_PROMPT_TOOLS, normalizeGenerationOutput } from '@/lib/generationOutput';
import { PRODUCTION_METHODS } from '@/lib/generationOptions';
import type { AiPromptTool } from '@/types';
import { createHash } from 'node:crypto';

export const runtime = 'nodejs';
export const maxDuration = 120;

// Reference scraping plus a detailed multi-language storyboard can exceed 60s.
// Keep a 10s margin for the atomic debit and HTTP response.
const HARD_DEADLINE_MS = 110_000;

// ─── 헬퍼: 에러 코드 → HTTP 상태 코드 매핑 ─────────────────

function mapErrorToStatus(code: string): number {
  switch (code) {
    case ERROR_CODES.UNAUTHORIZED:
      return 401;
    case ERROR_CODES.INSUFFICIENT_CREDITS:
      return 402;
    case ERROR_CODES.INVALID_URL_FORMAT:
    case ERROR_CODES.UNSUPPORTED_PLATFORM:
    case ERROR_CODES.NOT_A_YOUTUBE_SHORTS_URL:
      return 422;
    case ERROR_CODES.URL_PRIVATE_OR_DELETED:
      return 404;
    case ERROR_CODES.SCRAPER_TIMEOUT:
    case ERROR_CODES.AI_TIMEOUT:
      return 504;
    case ERROR_CODES.AI_MODERATION_BLOCK:
      return 451;
    case ERROR_CODES.AI_RATE_LIMITED:
      return 429;
    case ERROR_CODES.AI_PROVIDER_UNAVAILABLE:
      return 503;
    default:
      return 500;
  }
}

// ─── 헬퍼: Bearer Token에서 유저 정보 추출 ────────────────────

async function getUserFromToken(
  authHeader: string | null,
  supabase: ReturnType<typeof createAdminClient>
): Promise<{ user: { id: string }; profile: Profile } | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);

  // Supabase JWT 검증
  const { data: userData, error: userError } =
    await supabase.auth.getUser(token);

  if (userError || !userData.user) return null;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profileError || !profile) return null;

  return { user: userData.user, profile: profile as Profile };
}

// ─── POST /api/v1/analyze ─────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse<AnalyzeResponse>> {
  const requestStart = Date.now();

  /** 남은 시간(ms). HARD_DEADLINE_MS 초과 시 즉시 504 반환해야 크레딧 차감 없음 */
  function isDeadlineExceeded(): boolean {
    return Date.now() - requestStart > HARD_DEADLINE_MS;
  }

  const supabase = createAdminClient();

  // 1. 인증 검증
  const authHeader = req.headers.get('authorization');
  const auth = await getUserFromToken(authHeader, supabase);

  if (!auth) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized', errorCode: ERROR_CODES.UNAUTHORIZED },
      { status: 401 }
    );
  }

  const { user, profile } = auth;

  if ((profile as Profile & { is_suspended?: boolean }).is_suspended) {
    return NextResponse.json(
      { success: false, error: 'Account suspended', errorCode: ERROR_CODES.UNAUTHORIZED },
      { status: 403 },
    );
  }

  // 2. 요청 바디 파싱
  let body: AnalyzeRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body', errorCode: ERROR_CODES.INVALID_URL_FORMAT },
      { status: 400 }
    );
  }

  const { url, targetProduct: requestedTargetProduct, userCustomPrompt, productionMethod: requestedMethod, aiVideoTools } = body;

  if ((url !== undefined && (typeof url !== 'string' || url.length > 2048)) || typeof requestedTargetProduct !== 'string' || !requestedTargetProduct.trim() || (userCustomPrompt !== undefined && typeof userCustomPrompt !== 'string')) {
    return NextResponse.json(
      { success: false, error: 'Invalid request fields', errorCode: ERROR_CODES.INVALID_URL_FORMAT },
      { status: 400 }
    );
  }

  if ((requestedTargetProduct?.length ?? 0) > 200 || (userCustomPrompt?.length ?? 0) > 4000) {
    return NextResponse.json({ success: false, error: 'Request fields are too long', errorCode: ERROR_CODES.INVALID_URL_FORMAT }, { status: 413 });
  }

  const productionMethod = requestedMethod ?? 'Live action';
  if (!PRODUCTION_METHODS.includes(productionMethod as typeof PRODUCTION_METHODS[number]) ||
      (aiVideoTools !== undefined && (!Array.isArray(aiVideoTools) || aiVideoTools.length > AI_PROMPT_TOOLS.length || aiVideoTools.some((tool) => !AI_PROMPT_TOOLS.includes(tool)))) ||
      (productionMethod === 'AI video generation' && (!aiVideoTools?.length || new Set(aiVideoTools).size !== aiVideoTools.length)) ||
      (productionMethod !== 'AI video generation' && aiVideoTools?.length)) {
    return NextResponse.json({ success: false, error: 'Invalid production options', errorCode: ERROR_CODES.INVALID_URL_FORMAT }, { status: 400 });
  }
  const selectedTools: AiPromptTool[] = productionMethod === 'AI video generation' ? aiVideoTools ?? [] : [];

  const targetProduct = requestedTargetProduct.trim();

  // 3. URL이 있으면 참고 영상 구조를 분석하고, 없으면 주제만으로 새 콘텐츠를 설계한다.
  let platform: 'tiktok' | 'youtube' = 'youtube';
  let normalizedUrl = '';
  let urlHash = createHash('sha256').update(`topic-only:${targetProduct}`).digest('hex');
  if (url?.trim()) {
    try {
      const normalized = normalizeAndValidateUrl(url);
      platform = normalized.platform;
      normalizedUrl = normalized.normalizedUrl;
      urlHash = normalized.urlHash;
    } catch (err) {
      const code = err instanceof Error ? err.message : ERROR_CODES.INVALID_URL_FORMAT;
      return NextResponse.json(
        { success: false, error: 'Invalid or unsupported URL', errorCode: code },
        { status: mapErrorToStatus(code) }
      );
    }
  }
  const resultCacheKey = createHash('sha256').update(`${urlHash}\n${targetProduct}\n${userCustomPrompt ?? ''}\n${productionMethod}\n${selectedTools.join(',')}\nschema-v3`).digest('hex');
  console.log('[analyze] route entry', { platform, hasReferenceUrl: Boolean(normalizedUrl), productionMethod });

  // 4. 캐시 조회 (script_cache 테이블)
  const { data: cached } = normalizedUrl
    ? await supabase
      .from('script_cache')
      .select('analysis_result, hit_count')
      .eq('url_hash', resultCacheKey)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()
    : { data: null };

  const isCacheHit = !!cached;

  // 비용은 서버에서만 결정한다. 참고 영상 URL이 있거나 실제 상세 설정이
  // 전달된 요청은 8크레딧, 기본 주제 생성은 5크레딧이다.
  // 클라이언트가 보낸 비용이나 잔액 값은 절대 사용하지 않는다.
  const hasAdvancedSettings = Boolean(userCustomPrompt?.trim()) || productionMethod !== 'Live action';
  const creditCost = normalizedUrl || hasAdvancedSettings
    ? CREDIT_COST.FULL_ANALYSIS
    : CREDIT_COST.TOPIC_ONLY;
  const minCreditCheck = creditCost;

  // 5. 최소 잔액 확인 (캐시 미스 시 스크래핑 원가 낭비 방지)
  if (profile.credits_remaining < minCreditCheck) {
    return NextResponse.json(
      { success: false, error: 'Insufficient credits', errorCode: ERROR_CODES.INSUFFICIENT_CREDITS },
      { status: 402 }
    );
  }

  // 6. 캐시 히트: DB에서 바로 반환
  if (isCacheHit && cached) {
    let cachedResult: GenerationOutput;
    try {
      cachedResult = normalizeGenerationOutput(cached.analysis_result, normalizedUrl);
    } catch {
      await supabase.from('script_cache').delete().eq('url_hash', resultCacheKey);
      return NextResponse.json({ success: false, error: 'Cached result was invalid and removed. Please retry.', errorCode: ERROR_CODES.AI_GENERATION_FAILED }, { status: 409 });
    }

    // 캐시 hit_count 비동기 업데이트 (응답 지연 없이)
    supabase
      .from('script_cache')
      .update({ hit_count: (cached.hit_count ?? 1) + 1 })
      .eq('url_hash', resultCacheKey)
      .then(() => {});

    // 원자적 크레딧 차감 + 히스토리 저장
    const { error: rpcError } = await supabase.rpc('execute_script_generation', {
      p_user_id: user.id,
      p_source_url: normalizedUrl || null,
      p_project_title: cachedResult.project_title,
      p_target_product: targetProduct,
      p_generated_json: cachedResult,
      p_cost: creditCost,
    });

    if (rpcError) {
      console.error('[analyze] RPC error (cache hit):', rpcError.message);
      if (rpcError.message?.includes('INSUFFICIENT_CREDITS')) {
        return NextResponse.json(
          { success: false, error: 'Insufficient credits', errorCode: ERROR_CODES.INSUFFICIENT_CREDITS },
          { status: 402 }
        );
      }
      return NextResponse.json(
        { success: false, error: 'DB transaction failed', errorCode: ERROR_CODES.DB_TRANSACTION_FAIL },
        { status: 500 }
      );
    }

    const { data: cachedProfile } = await supabase
      .from('profiles')
      .select('credits_remaining')
      .eq('id', user.id)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      data: cachedResult,
      cached: true,
      creditsRemaining: cachedProfile?.credits_remaining ?? profile.credits_remaining - creditCost,
      creditCostApplied: creditCost,
    });
  }

  // 7. 캐시 미스: 참고 영상이 있을 때만 스크래핑하고, 없으면 주제 기반 메타데이터를 사용한다.
  // BYOK: profile에 custom_apify_token이 있으면 사용
  let metadata;
  try {
    metadata = normalizedUrl
      ? await fetchVideoMetadata(normalizedUrl, platform, profile.custom_apify_token ?? undefined)
      : {
        durationSeconds: 0,
        transcriptText: 'No reference video provided. Build the structure from the content topic and user requirements.',
      };
  } catch (err) {
    const code = err instanceof Error ? err.message : ERROR_CODES.MIDDLEWARE_SCRAPING_FAILED;
    return NextResponse.json(
      { success: false, error: 'Scraping failed', errorCode: code },
      { status: mapErrorToStatus(code) }
    );
  }

  // 7-b. 스크래핑 완료 후에도 서버가 결정한 단가를 재검증한다.
  if (profile.credits_remaining < creditCost) {
    return NextResponse.json(
      {
        success: false,
        error: 'Insufficient credits',
        errorCode: ERROR_CODES.INSUFFICIENT_CREDITS,
        requiredCredits: creditCost,
        durationSeconds: metadata.durationSeconds,
      },
      { status: 402 }
    );
  }

  // 7-d. Vercel deadline 체크 — AI 호출 전 시간이 이미 초과됐으면 504 반환
  // 크레딧은 아직 차감되지 않았으므로 사용자 손실 없음
  if (isDeadlineExceeded()) {
    return NextResponse.json(
      { success: false, error: 'Request timed out before AI generation', errorCode: ERROR_CODES.SCRAPER_TIMEOUT },
      { status: 504 }
    );
  }
  // Leave time for the atomic debit and response after Gemini finishes.
  const aiTimeoutMs = Math.min(90_000, 100_000 - (Date.now() - requestStart));
  if (aiTimeoutMs <= 0) {
    return NextResponse.json(
      { success: false, error: 'Not enough time remains to generate safely', errorCode: ERROR_CODES.SCRAPER_TIMEOUT },
      { status: 504 }
    );
  }

  // 8. Gemini 생성 — 실패 시 크레딧 차감 없음.
  // Legacy custom_gemini_key is deliberately not sent to the provider.
  let result: GenerationOutput;
  try {
    result = await generateLocalizedScripts(
      metadata,
      targetProduct,
      userCustomPrompt,
      productionMethod,
      selectedTools,
      aiTimeoutMs
    );
  } catch (err) {
    // AI 실패: 크레딧 차감 RPC 호출 없이 에러 반환 → 자동 롤백
    const code = err instanceof Error ? err.message : ERROR_CODES.AI_GENERATION_FAILED;
    console.error('[analyze] AI generation failed before debit', { code });
    return NextResponse.json(
      { success: false, error: 'AI generation failed before credits were debited', errorCode: code },
      { status: mapErrorToStatus(code) }
    );
  }

  if (isDeadlineExceeded()) {
    return NextResponse.json(
      { success: false, error: 'Request timed out after AI generation, before credits were debited', errorCode: ERROR_CODES.AI_TIMEOUT },
      { status: 504 }
    );
  }

  const enrichedResult = normalizeGenerationOutput({ ...result, source_url: normalizedUrl }, normalizedUrl);

  // 9. 크레딧 차감 + 히스토리 저장을 하나의 DB 트랜잭션으로 실행한다.
  // Gemini 호출은 이 RPC 전에 완료되므로 Gemini 실패 시 차감 자체가 발생하지 않는다.
  // RPC 내부의 INSERT 실패도 같은 트랜잭션을 롤백하여 부분 차감을 방지한다.
  const { error: rpcError } = await supabase.rpc('execute_script_generation', {
    p_user_id: user.id,
    p_source_url: normalizedUrl || null,
    p_project_title: enrichedResult.project_title,
    p_target_product: targetProduct,
    p_generated_json: enrichedResult,
    p_cost: creditCost,
  });

  if (rpcError) {
    console.error('[analyze] deduct_dynamic_credit RPC error:', rpcError.message);
    if (rpcError.message?.includes('INSUFFICIENT_CREDITS')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient credits', errorCode: ERROR_CODES.INSUFFICIENT_CREDITS },
        { status: 402 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'DB transaction failed', errorCode: ERROR_CODES.DB_TRANSACTION_FAIL },
      { status: 500 }
    );
  }

  // 캐시 실패는 이미 과금/히스토리가 성공한 요청을 실패로 바꾸지 않는다.
  // 다음 요청에서 재생성될 뿐이며, 사용자 잔액은 일관되게 유지된다.
  if (normalizedUrl) {
    const { error: cacheError } = await supabase.from('script_cache').upsert({
      url_hash: resultCacheKey,
      original_url: normalizedUrl,
      platform,
      video_duration_sec: metadata.durationSeconds,
      analysis_result: enrichedResult,
      hit_count: 1,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    if (cacheError) {
      console.error('[analyze] script_cache upsert failed after committed generation:', cacheError.message);
    }
  }

  const { data: updatedProfile } = await supabase
    .from('profiles')
    .select('credits_remaining')
    .eq('id', user.id)
    .maybeSingle();
  const { data: latestGeneration } = await supabase
    .from('user_generation_history')
    .select('id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();
  const { count: generationCount } = await supabase
    .from('user_generation_history')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  return NextResponse.json({
    success: true,
    data: enrichedResult,
    cached: false,
    creditsRemaining: updatedProfile?.credits_remaining ?? profile.credits_remaining - creditCost,
    creditCostApplied: creditCost,
    durationSeconds: metadata.durationSeconds,
    generationId: latestGeneration?.id ?? null,
    feedbackEligible: generationCount === 1,
  });
}
