import { Type, type Schema } from '@google/genai';

/**
 * Google Gemini API 강제 출력 스키마 (JSON Schema)
 * responseSchema를 통해 마크다운 포맷팅 Hallucination을 원천 차단합니다.
 */
export const geminiOutputSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    project_title: {
      type: Type.STRING,
      description: 'Professional project title incorporating the target product.',
    },
    target_product: {
      type: Type.STRING,
      description: "The name of the user's product being marketed.",
    },
    total_duration_seconds: {
      type: Type.INTEGER,
      description: 'Total duration matching the original video pacing.',
    },
    overall_viral_strategy: {
      type: Type.STRING,
      description: 'High-level marketing strategy explanation in Korean.',
    },
    scenes: {
      type: Type.ARRAY,
      description: 'Sequential breakdown of the short-form storyboard.',
      items: {
        type: Type.OBJECT,
        properties: {
          scene_number: { type: Type.INTEGER },
          timestamp: {
            type: Type.STRING,
            description: "e.g., '00:00 - 00:03'",
          },
          duration_seconds: { type: Type.INTEGER },
          hook_strategy: {
            type: Type.STRING,
            description: 'Psychological trigger used in this specific scene.',
          },
          visual_direction: {
            type: Type.STRING,
            description: 'Detailed camera angle, lighting, and action instructions.',
          },
          ai_video_prompt_en: {
            type: Type.STRING,
            description:
              '100% English prompt for AI video generators like Runway Gen-3 or Luma Dream Machine.',
          },
          audio_script: {
            type: Type.OBJECT,
            properties: {
              kr: {
                type: Type.STRING,
                description:
                  'Korean script localized for trendy e-commerce/short-form audience.',
              },
              us: {
                type: Type.STRING,
                description:
                  'US English script localized with punchy, direct Gen-Z marketing tone.',
              },
              jp: {
                type: Type.STRING,
                description:
                  'Japanese script localized with polite yet persuasive, empathetic tone.',
              },
            },
            required: ['kr', 'us', 'jp'],
          },
        },
        required: [
          'scene_number',
          'timestamp',
          'duration_seconds',
          'hook_strategy',
          'visual_direction',
          'ai_video_prompt_en',
          'audio_script',
        ],
      },
    },
  },
  required: [
    'project_title',
    'target_product',
    'total_duration_seconds',
    'overall_viral_strategy',
    'scenes',
  ],
};
