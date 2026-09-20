import type { AiPromptTool } from '@/types';

// Keep the plan schema local: Gemini is called through OpenRouter, so the
// Google SDK (and its install-time dependencies) is no longer needed.
const Type = { OBJECT: 'OBJECT', STRING: 'STRING', INTEGER: 'INTEGER', ARRAY: 'ARRAY' } as const;
type Schema = {
  type: typeof Type[keyof typeof Type];
  properties?: Record<string, Schema>;
  required?: string[];
  items?: Schema;
};

const localizedText: Schema = { type: Type.OBJECT, properties: { kr: { type: Type.STRING }, us: { type: Type.STRING }, jp: { type: Type.STRING } }, required: ['kr', 'us', 'jp'] };
const promptText: Schema = { type: Type.OBJECT, properties: { veo: { type: Type.STRING }, runway: { type: Type.STRING }, kling: { type: Type.STRING }, firefly: { type: Type.STRING }, generic: { type: Type.STRING } }, required: ['veo', 'runway', 'kling', 'firefly', 'generic'] };

export const geminiOutputSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    schema_version: { type: Type.INTEGER }, project_title: { type: Type.STRING }, target_product: { type: Type.STRING }, concept: { type: Type.STRING },
    target_audience: { type: Type.STRING }, video_goal: { type: Type.STRING }, duration_seconds: { type: Type.INTEGER }, overall_viral_strategy: { type: Type.STRING }, hook: { type: Type.STRING }, final_cta: { type: Type.STRING },
    structure_analysis: { type: Type.OBJECT, properties: { hook_pattern: { type: Type.STRING }, audience_problem: { type: Type.STRING }, emotional_arc: { type: Type.STRING }, editing_pattern: { type: Type.STRING }, caption_pattern: { type: Type.STRING }, product_placement_pattern: { type: Type.STRING }, reusable_structure: { type: Type.STRING }, restricted_elements: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ['hook_pattern', 'audience_problem', 'emotional_arc', 'editing_pattern', 'caption_pattern', 'product_placement_pattern', 'reusable_structure', 'restricted_elements'] },
    scenes: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
      scene_number: { type: Type.INTEGER }, start_time: { type: Type.STRING }, end_time: { type: Type.STRING }, purpose: { type: Type.STRING }, visual_description: { type: Type.STRING }, subject_description: { type: Type.STRING }, subject_action: { type: Type.STRING }, product_placement: { type: Type.STRING }, camera_shot: { type: Type.STRING }, camera_movement: { type: Type.STRING }, lens: { type: Type.STRING }, lighting: { type: Type.STRING }, color_mood: { type: Type.STRING }, emotion: { type: Type.STRING }, audio_script: localizedText, captions: localizedText, sound_effect: { type: Type.STRING }, background_music: { type: Type.STRING }, ai_prompts: promptText,
    }, required: ['scene_number', 'start_time', 'end_time', 'purpose', 'visual_description', 'subject_description', 'subject_action', 'product_placement', 'camera_shot', 'camera_movement', 'lens', 'lighting', 'color_mood', 'emotion', 'audio_script', 'captions', 'sound_effect', 'background_music', 'ai_prompts'] } },
    voiceover: localizedText,
    captions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { language: { type: Type.STRING }, text: { type: Type.STRING }, start_time: { type: Type.STRING }, end_time: { type: Type.STRING }, emphasis: { type: Type.STRING } }, required: ['language', 'text', 'start_time', 'end_time'] } },
    editing_timeline: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { start_time: { type: Type.STRING }, end_time: { type: Type.STRING }, visual: { type: Type.STRING }, caption: { type: Type.STRING }, voiceover: { type: Type.STRING }, sound_effect: { type: Type.STRING }, background_music: { type: Type.STRING }, transition: { type: Type.STRING }, editing_note: { type: Type.STRING } }, required: ['start_time', 'end_time', 'visual', 'caption', 'voiceover', 'sound_effect', 'background_music', 'transition', 'editing_note'] } },
    compliance_notes: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ['schema_version', 'project_title', 'target_product', 'concept', 'target_audience', 'video_goal', 'duration_seconds', 'overall_viral_strategy', 'hook', 'final_cta', 'structure_analysis', 'scenes', 'voiceover', 'captions', 'editing_timeline', 'compliance_notes'],
};

export function openRouterOutputSchema(selectedTools: AiPromptTool[]): Record<string, unknown> {
  // Convert the existing Gemini schema to JSON Schema without changing its
  // production-plan fields. Only requested video-tool prompts are generated.
  function convert(value: Schema): Record<string, unknown> {
    const type = String(value.type).toLowerCase();
    const result: Record<string, unknown> = { type };
    if (value.properties) {
      const properties = Object.fromEntries(Object.entries(value.properties).map(([key, child]) => [key, convert(child)]));
      result.properties = properties;
      // OpenRouter's strict JSON-schema mode expects every declared property
      // to be required, even fields that the old Gemini schema treated as optional.
      result.required = Object.keys(properties);
      result.additionalProperties = false;
    }
    if (value.items) result.items = convert(value.items);
    return result;
  }
  const root = convert(geminiOutputSchema);
  const scene = ((root.properties as Record<string, Record<string, unknown>>).scenes.items as Record<string, unknown>);
  const sceneProperties = scene.properties as Record<string, unknown>;
  if (selectedTools.length === 0) {
    delete sceneProperties.ai_prompts;
    scene.required = (scene.required as string[]).filter((key) => key !== 'ai_prompts');
  } else {
    sceneProperties.ai_prompts = {
      type: 'object',
      properties: Object.fromEntries(selectedTools.map((tool) => [tool, { type: 'string' }])),
      required: selectedTools,
      additionalProperties: false,
    };
  }
  return root;
}
