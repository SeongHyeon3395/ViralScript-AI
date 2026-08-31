'use client';

import { useState } from 'react';
import { CheckCircle2, Copy, Download, ExternalLink } from 'lucide-react';
import type { GenerationOutput, SceneScript } from '@/types';

const TABS = ['한눈에 보기', '바이럴 구조', '장면별 제작 플랜', 'AI 영상 프롬프트', '음성·자막', '편집 타임라인'] as const;
type Tab = typeof TABS[number];
type PromptKey = keyof SceneScript['ai_prompts'];

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  return <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setFailed(false); window.setTimeout(() => setCopied(false), 1500); } catch { setFailed(true); } }} className="inline-flex items-center gap-1.5 rounded-lg border border-violet-400/25 bg-violet-400/10 px-3 py-2 text-xs font-semibold text-violet-200 hover:bg-violet-400/20">{copied ? <CheckCircle2 size={12} /> : <Copy size={12} />}{failed ? '복사 실패' : copied ? '복사됨' : label}</button>;
}

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url);
}

function ScenePlan({ scene }: { scene: SceneScript }) {
  const details = [['화면', scene.visual_description], ['등장인물·대상', scene.subject_description], ['행동', scene.subject_action], ['핵심 대상 노출', scene.product_placement], ['카메라 샷', scene.camera_shot], ['카메라 움직임', scene.camera_movement], ['렌즈', scene.lens], ['조명', scene.lighting], ['색감', scene.color_mood], ['감정', scene.emotion], ['내레이션', scene.audio_script.kr], ['자막', scene.captions.kr], ['효과음', scene.sound_effect], ['BGM', scene.background_music]];
  return <article className="rounded-2xl border border-white/8 bg-white/[0.025] p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-bold text-white">Scene {scene.scene_number} — {scene.purpose}</p><p className="mt-1 text-xs text-cyan-300">{scene.start_time}~{scene.end_time}</p></div><CopyButton text={scene.ai_prompts.generic} label="장면별 프롬프트 복사" /></div><div className="grid gap-3 sm:grid-cols-2">{details.map(([label, value]) => <div key={label} className="rounded-xl bg-black/15 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-white/35">{label}</p><p className="mt-1 text-xs leading-relaxed text-white/70">{value}</p></div>)}</div></article>;
}

export default function GenerationResult({ result, creditsRemaining }: { result: GenerationOutput; creditsRemaining: number | undefined }) {
  const [tab, setTab] = useState<Tab>('한눈에 보기');
  const json = JSON.stringify(result, null, 2);
  const allPrompts = result.scenes.map((scene) => `Scene ${scene.scene_number}\nVeo:\n${scene.ai_prompts.veo}\n\nRunway:\n${scene.ai_prompts.runway}\n\nKling:\n${scene.ai_prompts.kling}\n\nGeneric:\n${scene.ai_prompts.generic}`).join('\n\n---\n\n');
  const overview = [['프로젝트 제목', result.project_title], ['새 영상 콘셉트', result.concept], ['콘텐츠 목적', result.video_goal], ['예상 영상 길이', `${result.duration_seconds}초`], ['핵심 후킹 문구', result.hook], ['마무리 문구', result.final_cta], ['바이럴 전략', result.overall_viral_strategy], ['크레딧', `5크레딧 소모 · 현재 잔여 ${creditsRemaining ?? '—'}크레딧`]];
  const structure = Object.entries(result.structure_analysis).filter(([key]) => key !== 'restricted_elements');

  return <section className="space-y-4 fade-in-up"><div role="tablist" aria-label="제작 플랜 결과" className="flex gap-2 overflow-x-auto rounded-2xl border border-white/8 bg-[#0d0d14]/90 p-2">{TABS.map((item) => <button key={item} role="tab" aria-selected={tab === item} onClick={() => setTab(item)} className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${tab === item ? 'bg-violet-600 text-white' : 'text-white/45 hover:bg-white/5 hover:text-white'}`}>{item}</button>)}</div>
    <div className="rounded-2xl border border-white/8 bg-[#0d0d14]/80 p-5 sm:p-6">
      {tab === '한눈에 보기' && <div className="grid gap-3 sm:grid-cols-2">{overview.map(([label, value]) => <div key={label} className="rounded-xl border border-white/6 bg-white/[0.025] p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-violet-300">{label}</p><p className="mt-2 text-sm leading-relaxed text-white/75">{value}</p></div>)}</div>}
      {tab === '바이럴 구조' && <div className="space-y-4"><p className="text-xs text-cyan-200">원본 고유 표현을 제외하고 재사용 가능한 구조만 추상화했습니다.</p><div className="grid gap-3 sm:grid-cols-2">{structure.map(([key, value]) => <div key={key} className="rounded-xl border border-white/6 p-4"><p className="text-[10px] uppercase text-white/35">{key.replaceAll('_', ' ')}</p><p className="mt-2 text-sm text-white/70">{String(value)}</p></div>)}</div><div className="rounded-xl border border-red-400/15 bg-red-400/5 p-4"><p className="text-xs font-bold text-red-200">복제 금지 요소</p><p className="mt-2 text-xs text-white/55">{result.structure_analysis.restricted_elements.join(' · ')}</p></div></div>}
      {tab === '장면별 제작 플랜' && <div className="space-y-3">{result.scenes.map((scene) => <ScenePlan key={scene.scene_number} scene={scene} />)}</div>}
      {tab === 'AI 영상 프롬프트' && <div className="space-y-4"><div className="flex flex-wrap gap-2">{([['veo', 'Veo 프롬프트 복사'], ['runway', 'Runway 프롬프트 복사'], ['kling', 'Kling 프롬프트 복사'], ['generic', '범용 프롬프트 복사']] as [PromptKey, string][]).map(([key, label]) => <CopyButton key={key} label={label} text={result.scenes.map((scene) => scene.ai_prompts[key]).join('\n\n')} />)}<CopyButton label="전체 프롬프트 복사" text={allPrompts} /></div>{result.scenes.map((scene) => <article key={scene.scene_number} className="rounded-xl border border-white/8 p-4"><p className="mb-3 text-xs font-bold text-white">Scene {scene.scene_number}</p>{(['veo', 'runway', 'kling', 'generic'] as PromptKey[]).map((key) => <div key={key} className="mb-3"><p className="text-[10px] font-bold uppercase text-violet-300">{key}</p><p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-white/55">{scene.ai_prompts[key]}</p></div>)}</article>)}</div>}
      {tab === '음성·자막' && <div className="space-y-4">{result.scenes.map((scene) => <article key={scene.scene_number} className="rounded-xl border border-white/8 p-4"><p className="text-xs font-bold text-white">Scene {scene.scene_number} · {scene.start_time}~{scene.end_time}</p>{(['kr', 'us', 'jp'] as const).map((language) => <div key={language} className="mt-3 grid gap-2 sm:grid-cols-2"><p className="text-xs text-white/60"><b className="text-cyan-300">{language.toUpperCase()} 내레이션</b><br />{scene.audio_script[language]}</p><p className="text-xs text-white/60"><b className="text-violet-300">{language.toUpperCase()} 자막</b><br />{scene.captions[language]}</p></div>)}<p className="mt-3 text-xs text-white/45">효과음: {scene.sound_effect} · BGM: {scene.background_music} · 감정 톤: {scene.emotion}</p></article>)}</div>}
      {tab === '편집 타임라인' && <div className="space-y-3">{result.editing_timeline.map((item, index) => <article key={`${item.start_time}-${index}`} className="grid gap-2 rounded-xl border border-white/8 p-4 text-xs text-white/60 sm:grid-cols-[100px_1fr]"><b className="text-cyan-300">{item.start_time}~{item.end_time}</b><div><p>영상: {item.visual}</p><p>자막: {item.caption}</p><p>내레이션: {item.voiceover}</p><p>효과음: {item.sound_effect}</p><p>BGM: {item.background_music}</p><p>전환: {item.transition}</p><p>메모: {item.editing_note}</p></div></article>)}</div>}
    </div>
    <div className="flex flex-wrap gap-2"><CopyButton text={json} label="전체 결과 복사" /><button onClick={() => download('video-production-plan.json', json, 'application/json')} className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/25 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-200"><Download size={12} />JSON 다운로드</button><button onClick={() => download('video-production-plan.txt', allPrompts, 'text/plain')} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60"><Download size={12} />TXT 다운로드</button>{result.source_url && <a href={result.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60"><ExternalLink size={12} />원본 영상 보기</a>}</div>
  </section>;
}
