import { describe, expect, it } from 'vitest';
import { normalizeGenerationOutput, selectedPromptTools } from '@/lib/generationOutput';
import { formatProductionPlanText } from '@/lib/productionPlanText';

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

  it('keeps only the selected AI tools in saved output and text export', () => {
    const result = normalizeGenerationOutput({
      ...legacyResult,
      selected_ai_tools: ['veo', 'firefly'],
      scenes: [{ ...legacyResult.scenes[0], ai_prompts: { veo: 'Veo prompt', runway: 'Wrong prompt', firefly: 'Firefly prompt' } }],
    });
    expect(selectedPromptTools(result)).toEqual(['veo', 'firefly']);
    expect(result.scenes[0].ai_prompts.runway).toBe('');
    const exported = formatProductionPlanText(result, 'ko', 'kr');
    expect(exported).toContain('Veo prompt');
    expect(exported).toContain('Firefly prompt');
    expect(exported).not.toContain('Wrong prompt');
  });

  it('omits AI prompts for a non-AI production method', () => {
    const result = normalizeGenerationOutput({ ...legacyResult, selected_ai_tools: [] });
    expect(selectedPromptTools(result)).toEqual([]);
    expect(result.scenes[0].ai_prompts.veo).toBe('');
    expect(formatProductionPlanText(result, 'ko', 'kr')).not.toContain('Create a vertical video.');
  });
});

describe('production plan export', () => {
  it('includes scenes, selected-language narration, prompts, and timeline in TXT', () => {
    const result = normalizeGenerationOutput(legacyResult);
    const text = formatProductionPlanText(result, 'ko', 'kr');
    expect(text).toContain('장면별 제작 플랜');
    expect(text).toContain('한국어');
    expect(text).toContain('Create a vertical video.');
    expect(text).toContain('편집 타임라인');
  });

  it('uses the chosen script language without exporting another language narration', () => {
    const result = normalizeGenerationOutput(legacyResult);
    const text = formatProductionPlanText(result, 'en', 'us');
    expect(text).toContain('Narration (US): English');
    expect(text).not.toContain('Narration (US): 한국어');
  });
});
