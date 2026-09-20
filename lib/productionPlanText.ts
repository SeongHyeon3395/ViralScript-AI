import type { GenerationOutput } from '@/types';
import { selectedPromptTools } from '@/lib/generationOutput';

type UiLanguage = 'ko' | 'en' | 'zh' | 'ja';
type ScriptLanguage = 'kr' | 'us' | 'jp';

const LABELS = {
  ko: ['영상 제작 기획안', '제목', '콘셉트', '목표', '대상', '길이', '첫 후킹', '마지막 CTA', '바이럴 전략', '장면별 제작 플랜', '화면', '행동', '카메라', '내레이션', '자막', '효과음', '배경음악', 'AI 영상 프롬프트', '편집 타임라인', '전환', '편집 메모', '저작권·제작 주의사항', '참고 링크'],
  en: ['Video production plan', 'Title', 'Concept', 'Goal', 'Audience', 'Duration', 'Opening hook', 'Final CTA', 'Viral strategy', 'Scene-by-scene plan', 'Visual', 'Action', 'Camera', 'Narration', 'Caption', 'Sound effect', 'Background music', 'AI video prompts', 'Editing timeline', 'Transition', 'Editing note', 'Copyright and production notes', 'Reference URL'],
  zh: ['视频制作方案', '标题', '概念', '目标', '受众', '时长', '开场钩子', '最终行动号召', '传播策略', '分镜制作方案', '画面', '动作', '镜头', '旁白', '字幕', '音效', '背景音乐', 'AI 视频提示词', '剪辑时间线', '转场', '剪辑备注', '版权与制作注意事项', '参考链接'],
  ja: ['動画制作プラン', 'タイトル', 'コンセプト', '目的', '対象', '長さ', '冒頭フック', '最後のCTA', 'バイラル戦略', 'シーン別制作プラン', '映像', '動作', 'カメラ', 'ナレーション', '字幕', '効果音', 'BGM', 'AI動画プロンプト', '編集タイムライン', 'トランジション', '編集メモ', '著作権・制作上の注意', '参考URL'],
} satisfies Record<UiLanguage, string[]>;

export function formatProductionPlanText(result: GenerationOutput, uiLanguage: UiLanguage, scriptLanguage: ScriptLanguage): string {
  const l = LABELS[uiLanguage];
  const promptTools = selectedPromptTools(result);
  const lines = [
    result.project_title,
    `=== ${l[0]} ===`,
    `${l[1]}: ${result.project_title}`,
    `${l[2]}: ${result.concept}`,
    `${l[3]}: ${result.video_goal}`,
    `${l[4]}: ${result.target_audience}`,
    `${l[5]}: ${result.duration_seconds}s`,
    `${l[6]}: ${result.hook}`,
    `${l[7]}: ${result.final_cta}`,
    `${l[8]}: ${result.overall_viral_strategy}`,
    '',
    `=== ${l[9]} ===`,
    ...result.scenes.flatMap((scene) => [
      `#${scene.scene_number} (${scene.start_time}–${scene.end_time}) ${scene.purpose}`,
      `${l[10]}: ${scene.visual_description}`,
      `${l[11]}: ${scene.subject_action}`,
      `${l[12]}: ${scene.camera_shot} / ${scene.camera_movement} / ${scene.lighting}`,
      `${l[13]} (${scriptLanguage.toUpperCase()}): ${scene.audio_script[scriptLanguage]}`,
      `${l[14]} (${scriptLanguage.toUpperCase()}): ${scene.captions[scriptLanguage]}`,
      `${l[15]}: ${scene.sound_effect}`,
      `${l[16]}: ${scene.background_music}`,
      ...promptTools.map((tool) => `${l[17]} — ${tool}: ${scene.ai_prompts[tool]}`),
      '',
    ]),
    `=== ${l[18]} ===`,
    ...result.editing_timeline.flatMap((item) => [
      `${item.start_time}–${item.end_time}`,
      `${l[10]}: ${item.visual}`,
      `${l[14]}: ${item.caption}`,
      `${l[13]}: ${item.voiceover}`,
      `${l[19]}: ${item.transition}`,
      `${l[20]}: ${item.editing_note}`,
      '',
    ]),
    `=== ${l[21]} ===`,
    ...result.compliance_notes.map((note) => `- ${note}`),
  ];
  if (result.source_url) lines.push('', `${l[22]}: ${result.source_url}`);
  return lines.join('\n');
}
