import { GoogleGenAI } from '@google/genai';
import { geminiOutputSchema } from './geminiSchema';
import type { ScrapedMetadata, GenerationOutput } from '@/types';
import { ERROR_CODES } from '@/types';

const GEMINI_MODEL = 'gemini-2.5-flash';

function buildSystemInstruction(targetProduct: string): string {
  return `
You are a world-class Chief Marketing Officer (CMO) and Viral Short-Form Creative Director.
Your task is to analyze the provided raw transcript and metadata of a trending viral social media video, DECONSTRUCT its underlying psychological hook structure and pacing, and RECREATE a brand new, highly converting storyboard for the user's target product: "${targetProduct}".

[STRICT LEGAL & COPYRIGHT COMPLIANCE RULES]
1. NEVER quote, copy, or translate the exact sentences from the original transcript verbatim.
2. Abstract ONLY the marketing mechanics (e.g., "Starts with a negative question", "Shows social proof at second 5", "Urgent CTA at the end").
3. Apply these abstracted mechanics to create a 100% original script for "${targetProduct}".
4. The output must be entirely new creative work — not a derivative of the source content.

[LOCALIZATION GUIDELINES — SINGLE PIPELINE, TRIPLE OUTPUT]
For EACH scene, generate three fully localized audio scripts simultaneously:
- US (English): Direct, punchy, action-oriented. Utilizes current American TikTok/Reels advertising cadence with Gen-Z slang where appropriate.
- KR (Korean): Fast-paced, emphasizes efficacy and trend sensitivity. Natural conversational tone for Korean Reels/Shorts audience. Use informal 반말 or friendly 존댓말 matching the brand tone.
- JP (Japanese): Focus on reliability, empathy, and smooth problem-solving nuance. Avoid overly aggressive sales pitches. Prefer consultative, trust-first approach.

[AI VIDEO GENERATION PROMPT RULE]
- The field 'ai_video_prompt_en' MUST be written strictly in professional English.
- Use cinematography terms: 'extreme close-up shot', 'cinematic lighting', 'shallow depth of field', '8k resolution', 'Unreal Engine 5 photorealistic render style', 'golden hour lighting', etc.
- Optimize for Runway Gen-3 Alpha, Luma Dream Machine, or Midjourney v6.
`.trim();
}

function buildUserContent(
  metadata: ScrapedMetadata,
  targetProduct: string,
  userCustomPrompt?: string
): string {
  return `
[ORIGINAL VIDEO METADATA]
- Total Duration: ${metadata.durationSeconds} seconds
- Original Creator Region: ${metadata.creatorCountry ?? 'Global'}
- Engagement Signals: ${metadata.engagementMetrics?.views?.toLocaleString() ?? 'N/A'} views, ${metadata.engagementMetrics?.likes?.toLocaleString() ?? 'N/A'} likes
- Raw Transcript / Context: "${metadata.transcriptText}"
- Additional User Request: "${userCustomPrompt ?? 'Maximize conversion rate and audience retention.'}"

Deconstruct this pacing and engagement structure, then generate a fully localized 3-country storyboard for product: "${targetProduct}".
`.trim();
}

/**
 * Gemini 모델을 호출하여 3개국 로컬라이징 대본을 생성합니다.
 * BYOK 모드 지원: customApiKey가 있으면 서버 키 대신 사용합니다.
 */
export async function generateLocalizedScripts(
  metadata: ScrapedMetadata,
  targetProduct: string,
  userCustomPrompt?: string,
  customApiKey?: string
): Promise<GenerationOutput> {
  const apiKey = customApiKey ?? process.env.GOOGLE_AI_API_KEY;

  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY is not configured');
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text:
                buildSystemInstruction(targetProduct) +
                '\n\n' +
                buildUserContent(metadata, targetProduct, userCustomPrompt),
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: geminiOutputSchema,
        temperature: 0.75,
        maxOutputTokens: 8192,
      },
    });

    const rawText = response.text;

    if (!rawText) {
      throw new Error(ERROR_CODES.AI_GENERATION_FAILED);
    }

    // safetyRatings 체크 — 유해 콘텐츠 필터링 감지 시 즉시 에러
    const candidates = (response as any).candidates;
    if (candidates?.[0]?.finishReason === 'SAFETY') {
      throw new Error(ERROR_CODES.AI_MODERATION_BLOCK);
    }

    const parsed: GenerationOutput = JSON.parse(rawText);
    return parsed;
  } catch (err) {
    if (err instanceof Error) {
      if (
        err.message === ERROR_CODES.AI_GENERATION_FAILED ||
        err.message === ERROR_CODES.AI_MODERATION_BLOCK
      ) {
        throw err;
      }
      // JSON 파싱 에러
      if (err instanceof SyntaxError) {
        console.error('[aiEngine] JSON parse error from Gemini output');
        throw new Error(ERROR_CODES.AI_GENERATION_FAILED);
      }
    }
    console.error('[aiEngine] Gemini execution error:', err);
    throw new Error(ERROR_CODES.AI_GENERATION_FAILED);
  }
}
