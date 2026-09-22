import { describe, expect, it } from 'vitest';
import { geminiResponseSchema } from '@/services/geminiSchema';

function sceneShape(tools: Parameters<typeof geminiResponseSchema>[0]) {
  const root = geminiResponseSchema(tools);
  const scenes = (root.properties as Record<string, Record<string, unknown>>).scenes;
  return scenes.items as Record<string, unknown>;
}

describe('Gemini output schema', () => {
  it('requires only the selected tool prompts', () => {
    const scene = sceneShape(['veo', 'firefly']);
    const prompt = (scene.properties as Record<string, Record<string, unknown>>).ai_prompts;
    expect(Object.keys(prompt.properties as object)).toEqual(['veo', 'firefly']);
    expect(prompt.required).toEqual(['veo', 'firefly']);
    expect(prompt.additionalProperties).toBe(false);
  });

  it('omits the prompt field for non-AI production', () => {
    const scene = sceneShape([]);
    expect((scene.properties as Record<string, unknown>).ai_prompts).toBeUndefined();
    expect(scene.required).not.toContain('ai_prompts');
  });
});
