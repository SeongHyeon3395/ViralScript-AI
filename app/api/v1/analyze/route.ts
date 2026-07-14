import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { normalizeAndValidateUrl } from '@/utils/urlNormalizer';
import { fetchVideoMetadata } from '@/services/scraperMiddleware';
import { generateLocalizedScripts } from '@/services/aiEngine';
import { CREDIT_COST, getDynamicCreditCost } from '@/lib/credits';
import { ERROR_CODES } from '@/types';
import type { AnalyzeRequest, AnalyzeResponse, GenerationOutput, Profile } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

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
    case ERROR_CODES.NOT_AN_INSTAGRAM_REEL_URL:
      return 422;
    case ERROR_CODES.URL_PRIVATE_OR_DELETED:
      return 404;
    case ERROR_CODES.SCRAPER_TIMEOUT:
      return 504;
    case ERROR_CODES.AI_MODERATION_BLOCK:
      return 451;
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
    .single();

  if (profileError || !profile) return null;

  return { user: userData.user, profile: profile as Profile };
}

// ─── POST /api/v1/analyze ─────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse<AnalyzeResponse>> {
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

  const { url, targetProduct, userCustomPrompt } = body;

  if (!url || !targetProduct) {
    return NextResponse.json(
      { success: false, error: 'url and targetProduct are required', errorCode: ERROR_CODES.INVALID_URL_FORMAT },
      { status: 400 }
    );
  }

  // 3. URL 정규화 및 검증
  let normalized: ReturnType<typeof normalizeAndValidateUrl>;
  try {
    normalized = normalizeAndValidateUrl(url);
  } catch (err) {
    const code = err instanceof Error ? err.message : ERROR_CODES.INVALID_URL_FORMAT;
    return NextResponse.json(
      { success: false, error: 'Invalid or unsupported URL', errorCode: code },
      { status: mapErrorToStatus(code) }
    );
  }

  const { platform, normalizedUrl, urlHash } = normalized;

  // 4. 캐시 조회 (script_cache 테이블)
  const { data: cached } = await supabase
    .from('script_cache')
    .select('analysis_result, hit_count')
    .eq('url_hash', urlHash)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  const isCacheHit = !!cached;

  // 캐시 히트: 1 크레딧 고정 / 캐시 미스: 스크래핑 전 최소 잔액 확인(최솟값 1)
  // 실제 다이나믹 단가는 스크래핑 후 durationSeconds 확인 후 결정
  const minCreditCheck = isCacheHit ? CREDIT_COST.CACHE_HIT : 1;

  // 5. 최소 잔액 확인 (캐시 미스 시 스크래핑 원가 낭비 방지)
  if (profile.credits_remaining < minCreditCheck) {
    return NextResponse.json(
      { success: false, error: 'Insufficient credits', errorCode: ERROR_CODES.INSUFFICIENT_CREDITS },
      { status: 402 }
    );
  }

  // 캐시 히트의 경우 최종 단가는 CACHE_HIT 고정
  const creditCost = isCacheHit ? CREDIT_COST.CACHE_HIT : 0; // 캐시 미스 시 아래에서 재계산

  // 6. 캐시 히트: DB에서 바로 반환
  if (isCacheHit && cached) {
    // 캐시 hit_count 비동기 업데이트 (응답 지연 없이)
    supabase
      .from('script_cache')
      .update({ hit_count: (cached.hit_count ?? 1) + 1 })
      .eq('url_hash', urlHash)
      .then(() => {});

    // 원자적 크레딧 차감 + 히스토리 저장
    const { error: rpcError } = await supabase.rpc('execute_script_generation', {
      p_user_id: user.id,
      p_source_url: normalizedUrl,
      p_project_title: (cached.analysis_result as GenerationOutput).project_title,
      p_target_product: targetProduct,
      p_generated_json: cached.analysis_result,
      p_cost: creditCost,
    });

    if (rpcError) {
      console.error('[analyze] RPC error (cache hit):', rpcError.message);
      return NextResponse.json(
        { success: false, error: 'DB transaction failed', errorCode: ERROR_CODES.DB_TRANSACTION_FAIL },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: cached.analysis_result as GenerationOutput,
      cached: true,
      creditsRemaining: profile.credits_remaining - creditCost,
    });
  }

  // 7. 캐시 미스: 미들웨어 스크래핑
  // BYOK: profile에 custom_apify_token이 있으면 사용
  let metadata;
  try {
    metadata = await fetchVideoMetadata(
      normalizedUrl,
      platform,
      profile.custom_apify_token ?? undefined
    );
  } catch (err) {
    const code = err instanceof Error ? err.message : ERROR_CODES.MIDDLEWARE_SCRAPING_FAILED;
    return NextResponse.json(
      { success: false, error: 'Scraping failed', errorCode: code },
      { status: mapErrorToStatus(code) }
    );
  }

  // 7-b. 스크래핑 완료 → durationSeconds 기반 실제 단가 결정
  const dynamicCreditCost = getDynamicCreditCost(metadata.durationSeconds);

  // 7-c. 실제 단가 기준 잔액 재검증
  if (profile.credits_remaining < dynamicCreditCost) {
    return NextResponse.json(
      {
        success: false,
        error: 'Insufficient credits',
        errorCode: ERROR_CODES.INSUFFICIENT_CREDITS,
        requiredCredits: dynamicCreditCost,
        durationSeconds: metadata.durationSeconds,
      },
      { status: 402 }
    );
  }

  // 8. AI 생성 (Gemini)
  // BYOK: profile에 custom_gemini_key가 있으면 사용
  let result: GenerationOutput;
  try {
    result = await generateLocalizedScripts(
      metadata,
      targetProduct,
      userCustomPrompt,
      profile.custom_gemini_key ?? undefined
    );
  } catch (err) {
    const code = err instanceof Error ? err.message : ERROR_CODES.AI_GENERATION_FAILED;
    return NextResponse.json(
      { success: false, error: 'AI generation failed', errorCode: code },
      { status: mapErrorToStatus(code) }
    );
  }

  // 9. 캐시 저장 (script_cache upsert) — Service Role로 실행
  await supabase
    .from('script_cache')
    .upsert({
      url_hash: urlHash,
      original_url: normalizedUrl,
      platform,
      video_duration_sec: metadata.durationSeconds,
      analysis_result: result,
      hit_count: 1,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .then(() => {});

  // 10. 원자적 크레딧 차감 + 히스토리 저장 (deduct_dynamic_credit RPC)
  const { data: remainingCredits, error: rpcError } = await supabase.rpc(
    'deduct_dynamic_credit',
    {
      target_user_id: user.id,
      video_duration: metadata.durationSeconds,
    }
  );

  if (rpcError) {
    console.error('[analyze] deduct_dynamic_credit RPC error:', rpcError.message);
    if (rpcError.message?.includes('ERR_INSUFFICIENT_CREDITS_REQUIRED_')) {
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

  // 히스토리 저장 (비동기 — 응답 지연 없음)
  supabase.rpc('log_generation_history', {
    p_user_id: user.id,
    p_source_url: normalizedUrl,
    p_project_title: result.project_title,
    p_target_product: targetProduct,
    p_generated_json: result,
    p_cost: dynamicCreditCost,
  }).then(() => {});

  return NextResponse.json({
    success: true,
    data: result,
    cached: false,
    creditsRemaining: remainingCredits as number,
    creditCostApplied: dynamicCreditCost,
    durationSeconds: metadata.durationSeconds,
  });
}
