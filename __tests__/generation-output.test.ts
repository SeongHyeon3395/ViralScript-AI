import { describe, expect, it } from 'vitest';
import { normalizeGenerationOutput } from '@/lib/generationOutput';

const legacyResult = {
  project_title: '구형 프로젝트',
  target_product: '테스트 상품',
  total_duration_seconds: 5,
  overall_viral_strategy: '문제 해결 구조',
  scenes: [{
    scene_number: 1,
    timestamp: '00:00 - 00:05',
    duration_seconds: 5,
    hook_strategy: '문제 제기',
    visual_direction: '상품을 보여준다',
    ai_video_prompt_en: 'Create a vertical video.',
    audio_script: { kr: '한국어', us: 'English', jp: '日本語' },
  }],
};

describe('normalizeGenerationOutput', () => {
  it('converts legacy results into the current production-plan schema', () => {
    const result = normalizeGenerationOutput(legacyResult, 'https://youtube.com/shorts/example');
    expect(result.schema_version).toBe(2);
    expect(result.source_url).toContain('youtube.com');
    expect(result.scenes[0].start_time).toBe('00:00');
    expect(result.scenes[0].end_time).toBe('00:05');
    expect(result.scenes[0].ai_prompts.veo).toBe('Create a vertical video.');
    expect(result.editing_timeline).toHaveLength(1);
  });

  it('calculates scene duration from new-schema timestamps', () => {
    const current = {
      ...legacyResult,
      duration_seconds: 8,
      scenes: [{ ...legacyResult.scenes[0], duration_seconds: undefined, start_time: '00:02', end_time: '00:08' }],
    };
    const result = normalizeGenerationOutput(current);
    expect(result.scenes[0].duration_seconds).toBe(6);
  });

  it('rejects structurally unusable results', () => {
    expect(() => normalizeGenerationOutput({ project_title: '', scenes: [] })).toThrow();
  });
});
