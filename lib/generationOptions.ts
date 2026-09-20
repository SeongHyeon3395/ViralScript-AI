import type { AiPromptTool } from '@/types';

export const PRODUCTION_METHODS = ['Live action', 'AI video generation', 'Existing video editing', 'Faceless content', 'Screen recording', 'Photo or image based'] as const;

export const AI_VIDEO_TOOL_CHOICES: ReadonlyArray<{ key: AiPromptTool; label: string }> = [
  { key: 'veo', label: 'Google Veo' },
  { key: 'runway', label: 'Runway' },
  { key: 'kling', label: 'Kling' },
  { key: 'firefly', label: 'Adobe Firefly' },
  { key: 'generic', label: 'Generic prompt' },
];
