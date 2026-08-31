import type { AudioScript, GenerationOutput, SceneScript } from '@/types';

const EMPTY_AUDIO: AudioScript = { kr: '', us: '', jp: '' };

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function audio(value: unknown, fallback: AudioScript = EMPTY_AUDIO): AudioScript {
  const item = record(value);
  return {
    kr: text(item.kr, fallback.kr),
    us: text(item.us, fallback.us),
    jp: text(item.jp, fallback.jp),
  };
}

function splitTimestamp(timestamp: string, duration: number): [string, string] {
  const parts = timestamp.split(/\s*[-~]\s*/);
  return [parts[0] || '00:00', parts[1] || `00:${String(duration).padStart(2, '0')}`];
}

function timeToSeconds(value: string): number | null {
  const parts = value.split(':').map(Number);
  if (parts.some((part) => !Number.isFinite(part)) || parts.length < 2 || parts.length > 3) return null;
  return parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0] * 3600 + parts[1] * 60 + parts[2];
}

function normalizeScene(value: unknown, index: number): SceneScript {
  const item = record(value);
  const explicitDuration = typeof item.duration_seconds === 'number' ? item.duration_seconds : null;
  const preliminaryStart = text(item.start_time);
  const preliminaryEnd = text(item.end_time);
  const calculatedDuration = preliminaryStart && preliminaryEnd ? (timeToSeconds(preliminaryEnd) ?? 0) - (timeToSeconds(preliminaryStart) ?? 0) : 0;
  const legacyDuration = explicitDuration && explicitDuration > 0 ? explicitDuration : calculatedDuration > 0 ? calculatedDuration : 3;
  const [legacyStart, legacyEnd] = splitTimestamp(text(item.timestamp), legacyDuration);
  const scripts = audio(item.audio_script);
  const genericPrompt = text(item.ai_video_prompt_en, text(record(item.ai_prompts).generic));
  const promptRecord = record(item.ai_prompts);

  return {
    scene_number: typeof item.scene_number === 'number' ? item.scene_number : index + 1,
    start_time: text(item.start_time, legacyStart),
    end_time: text(item.end_time, legacyEnd),
    purpose: text(item.purpose, text(item.hook_strategy, '장면 목적')),
    visual_description: text(item.visual_description, text(item.visual_direction, '화면 지시 없음')),
    subject_description: text(item.subject_description, '상품에 적합한 출연자 또는 제품'),
    subject_action: text(item.subject_action, text(item.visual_direction, '자연스러운 행동')),
    product_placement: text(item.product_placement, '제품을 명확하게 노출'),
    camera_shot: text(item.camera_shot, 'vertical medium close-up'),
    camera_movement: text(item.camera_movement, 'smooth push-in'),
    lens: text(item.lens, '35mm lens'),
    lighting: text(item.lighting, 'soft cinematic lighting'),
    color_mood: text(item.color_mood, '브랜드에 맞는 선명한 색감'),
    emotion: text(item.emotion, '관심과 기대'),
    audio_script: scripts,
    captions: audio(item.captions, scripts),
    sound_effect: text(item.sound_effect, '짧은 전환 효과음'),
    background_music: text(item.background_music, '빠른 숏폼 리듬'),
    ai_prompts: {
      veo: text(promptRecord.veo, genericPrompt),
      runway: text(promptRecord.runway, genericPrompt),
      kling: text(promptRecord.kling, genericPrompt),
      generic: text(promptRecord.generic, genericPrompt),
    },
    timestamp: text(item.timestamp, `${text(item.start_time, legacyStart)} - ${text(item.end_time, legacyEnd)}`),
    duration_seconds: legacyDuration,
    hook_strategy: text(item.hook_strategy, text(item.purpose)),
    visual_direction: text(item.visual_direction, text(item.visual_description)),
    ai_video_prompt_en: genericPrompt,
  };
}

export function normalizeGenerationOutput(value: unknown, sourceUrl = ''): GenerationOutput {
  const item = record(value);
  const rawScenes = Array.isArray(item.scenes) ? item.scenes : [];
  const scenes = rawScenes.map(normalizeScene);
  if (!text(item.project_title) || scenes.length === 0) throw new Error('AI 응답에 필수 제작 플랜 정보가 없습니다.');

  const duration = typeof item.duration_seconds === 'number'
    ? item.duration_seconds
    : typeof item.total_duration_seconds === 'number' ? item.total_duration_seconds : scenes.reduce((sum, scene) => sum + (scene.duration_seconds ?? 0), 0);
  const structure = record(item.structure_analysis);
  const voiceoverFallback: AudioScript = {
    kr: scenes.map((scene) => scene.audio_script.kr).join(' '),
    us: scenes.map((scene) => scene.audio_script.us).join(' '),
    jp: scenes.map((scene) => scene.audio_script.jp).join(' '),
  };
  const rawCaptions = Array.isArray(item.captions) ? item.captions : [];
  const rawTimeline = Array.isArray(item.editing_timeline) ? item.editing_timeline : [];

  return {
    schema_version: 2,
    source_url: text(item.source_url, sourceUrl),
    project_title: text(item.project_title),
    target_product: text(item.target_product, '상품 정보 없음'),
    concept: text(item.concept, text(item.overall_viral_strategy, '원본 구조를 참고한 새 콘텐츠')),
    target_audience: text(item.target_audience, '타깃 고객 정보 없음'),
    video_goal: text(item.video_goal, '영상 제작 목적 미지정'),
    duration_seconds: duration,
    overall_viral_strategy: text(item.overall_viral_strategy, '바이럴 구조를 추상화한 재창작 전략'),
    hook: text(item.hook, scenes[0]?.captions.kr || scenes[0]?.audio_script.kr || '첫 3초 안에 문제를 제시합니다.'),
    final_cta: text(item.final_cta, scenes.at(-1)?.captions.kr || scenes.at(-1)?.audio_script.kr || '지금 확인해보세요.'),
    structure_analysis: {
      hook_pattern: text(structure.hook_pattern, scenes[0]?.purpose || '문제 제기'),
      audience_problem: text(structure.audience_problem, '타깃 고객의 핵심 불편'),
      emotional_arc: text(structure.emotional_arc, '불편 인식 → 기대 → 해결 → 행동'),
      editing_pattern: text(structure.editing_pattern, '빠른 전환과 핵심 장면 강조'),
      caption_pattern: text(structure.caption_pattern, '짧고 읽기 쉬운 핵심 자막'),
      product_placement_pattern: text(structure.product_placement_pattern, '문제 제시 후 해결책으로 제품 등장'),
      reusable_structure: text(structure.reusable_structure, '문제 제기 → 해결책 → 증거 → CTA'),
      restricted_elements: Array.isArray(structure.restricted_elements) ? structure.restricted_elements.filter((entry): entry is string => typeof entry === 'string') : ['원본 대사', '고유 장면', '인물', '로고', '음악'],
    },
    scenes,
    voiceover: audio(item.voiceover, voiceoverFallback),
    captions: rawCaptions.length ? rawCaptions.map((entry) => {
      const caption = record(entry);
      const language = caption.language === 'us' || caption.language === 'jp' ? caption.language : 'kr';
      return { language, text: text(caption.text), start_time: text(caption.start_time), end_time: text(caption.end_time), emphasis: text(caption.emphasis) || undefined };
    }) : scenes.flatMap((scene) => (['kr', 'us', 'jp'] as const).map((language) => ({ language, text: scene.captions[language], start_time: scene.start_time, end_time: scene.end_time }))),
    editing_timeline: rawTimeline.length ? rawTimeline.map((entry) => {
      const timeline = record(entry);
      return { start_time: text(timeline.start_time), end_time: text(timeline.end_time), visual: text(timeline.visual), caption: text(timeline.caption), voiceover: text(timeline.voiceover), sound_effect: text(timeline.sound_effect), background_music: text(timeline.background_music), transition: text(timeline.transition), editing_note: text(timeline.editing_note) };
    }) : scenes.map((scene) => ({ start_time: scene.start_time, end_time: scene.end_time, visual: scene.visual_description, caption: scene.captions.kr, voiceover: scene.audio_script.kr, sound_effect: scene.sound_effect, background_music: scene.background_music, transition: '빠르고 자연스러운 컷', editing_note: scene.purpose })),
    compliance_notes: Array.isArray(item.compliance_notes) ? item.compliance_notes.filter((entry): entry is string => typeof entry === 'string') : ['원본의 대사, 고유 장면, 인물, 로고, 음악을 복제하지 마세요.', '바이럴 구조만 추상화해 사용자 상품 중심으로 재창작하세요.'],
    total_duration_seconds: duration,
    copy_ready_prompt_ko: text(item.copy_ready_prompt_ko, scenes.map((scene) => scene.ai_prompts.generic).join('\n\n')),
  };
}
