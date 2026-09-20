import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateLocalizedScripts } from '@/services/aiEngine';
import { ERROR_CODES } from '@/types';

const metadata = { durationSeconds: 0, transcriptText: '' };
const previousKey = process.env.OPENROUTER_API_KEY;

afterEach(() => {
  vi.unstubAllGlobals();
  if (previousKey === undefined) delete process.env.OPENROUTER_API_KEY;
  else process.env.OPENROUTER_API_KEY = previousKey;
});

describe('OpenRouter generation request', () => {
  it('uses the server-only key and asks for selected Gemini prompts', async () => {
    process.env.OPENROUTER_API_KEY = 'test-only-key';
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({
        project_title: 'New plan',
        scenes: [{ scene_number: 1, ai_prompts: { veo: 'Veo shot', firefly: 'Firefly shot' } }],
      }) } }],
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await generateLocalizedScripts(metadata, 'Test topic', undefined, 'AI video generation', ['veo', 'firefly']);
    expect(result.selected_ai_tools).toEqual(['veo', 'firefly']);
    expect(result.scenes[0].ai_prompts.runway).toBe('');
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect((options.headers as Record<string, string>).Authorization).toBe('Bearer test-only-key');
    const request = JSON.parse(options.body as string);
    expect(request.model).toBe('google/gemini-3.5-flash');
    expect(request.response_format.json_schema.schema.properties.scenes.items.properties.ai_prompts.required).toEqual(['veo', 'firefly']);
    expect(options.cache).toBe('no-store');
  });

  it('omits AI prompts entirely for live action and maps provider outage', async () => {
    process.env.OPENROUTER_API_KEY = 'test-only-key';
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 503 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(generateLocalizedScripts(metadata, 'Test topic')).rejects.toThrow(ERROR_CODES.AI_PROVIDER_UNAVAILABLE);
    const request = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(request.response_format.json_schema.schema.properties.scenes.items.properties.ai_prompts).toBeUndefined();
  });
});
