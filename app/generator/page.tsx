'use client';

import { useState, useEffect, useRef, startTransition } from 'react';
import NextImage from 'next/image';
import type { AnalyzeResponse, GenerationOutput, SceneScript } from '@/types';
import Navbar from '@/app/components/Navbar';
import type { NavbarRef } from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import RemixPanel from '@/app/components/RemixPanel';
import GenerationResult from '@/app/components/GenerationResult';
import RewardedAdPopup from '@/app/components/RewardedAdPopup';
import DailyRewardWheel from '@/app/components/DailyRewardWheel';
import { useAuth } from '@/app/components/AuthProvider';
import { t } from '@/app/components/LanguageSwitcher';
import { useLanguage } from '@/app/components/LanguageProvider';
import { clearUserCreditsCache } from '@/lib/profile';
import {
  Link2, SlidersHorizontal, Rocket, Loader2, Zap,
  Film, Clock, TrendingUp, ChevronDown, ChevronUp,
  Sparkles, BarChart3, ArrowRight, Gift, RefreshCw, Shuffle,
  CheckCircle2, Shield, LogIn, Copy, Clapperboard, Languages,
} from 'lucide-react';

const DIRECT_SHORT_FORM_REGEX = /^https?:\/\/(?:www\.|vm\.|vt\.)?(?:tiktok\.com\/(?:(?:@[^\/\s]+)\/video\/\d+|v\/\d+)|vm\.tiktok\.com\/[\w-]+|vt\.tiktok\.com\/[\w-]+|youtube\.com\/shorts\/[^\s?]+|youtu\.be\/[^\s?]+)(?:[\/?#].*)?$/i;

function validateShortFormUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (DIRECT_SHORT_FORM_REGEX.test(trimmed)) return null;
  return t('gen_url_invalid');
}

const LOCALE_TABS = [
  { key: 'kr' as const, flag: '🇰🇷', label: 'Korean' },
  { key: 'us' as const, flag: '🇺🇸', label: 'English' },
  { key: 'jp' as const, flag: '🇯🇵', label: 'Japanese' },
];

const ANALYSIS_POINTS = ['First 1–3 second hook', 'Scene pacing', 'Narration structure', 'Caption pattern', 'Emotional changes', 'Product visibility', 'Final CTA'];
const PURPOSES = ['Inform', 'Entertain and relate', 'Share an experience', 'Tell a story', 'Join a challenge', 'Grow followers', 'Build community'];
const CONCEPTS = ['Problem-solving', 'Review', 'Before and after', 'How-to', 'Emotional story', 'Comedy or meme', 'Vlog', 'Information summary', 'Faceless content'];
const DURATIONS = ['10s', '15s', '30s', '45s', '60s'];
const LANGUAGES = ['Korean', 'English', 'Japanese'];
const PRODUCTION_METHODS = ['Live action', 'AI video generation', 'Existing video editing', 'Faceless content', 'Screen recording', 'Photo or image based'];
const AI_VIDEO_TOOLS = ['Google Veo', 'Runway', 'Kling', 'Adobe Firefly', 'Generic prompt'];

function ChoiceChips({ options, value, onChange }: { options: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button key={option} type="button" onClick={() => onChange(option)} className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${value === option ? 'border-violet-400/70 bg-violet-500/20 text-violet-100' : 'border-white/10 bg-white/5 text-white/45 hover:border-white/25 hover:text-white/75'}`}>
          {option}
        </button>
      ))}
    </div>
  );
}

function SceneCard({ scene, activeLocale }: { scene: SceneScript; activeLocale: 'kr' | 'us' | 'jp' }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-2xl border border-white/8 bg-[#0d0d14] overflow-hidden card-hover fade-in-up">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/6" style={{ background: 'linear-gradient(90deg, rgba(124,58,237,0.08) 0%, transparent 100%)' }}>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center"><Film size={13} className="text-white" /></div>
          <span className="text-xs font-bold text-white/50 tracking-widest uppercase">Scene {scene.scene_number}</span>
        </div>
        <span className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-mono text-white/50"><Clock size={10} />{scene.timestamp} · {scene.duration_seconds}s</span>
      </div>
      <div className="p-5 space-y-4">
        <div>
          <div className="flex items-center gap-1.5 mb-2"><TrendingUp size={12} className="text-violet-400" /><p className="text-xs font-bold text-violet-400 uppercase tracking-widest">Hook Strategy</p></div>
          <p className="text-sm text-white/70 leading-relaxed">{scene.hook_strategy}</p>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5"><BarChart3 size={12} className="text-amber-400" /><p className="text-xs font-bold text-amber-400 uppercase tracking-widest">Script</p></div>
            <div className="flex gap-1 bg-white/5 rounded-lg p-0.5">{LOCALE_TABS.map(t => (
              <button key={t.key} onClick={() => {}} className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${activeLocale === t.key ? 'bg-violet-600 text-white' : 'text-white/30 hover:text-white/60'}`}>{t.flag}</button>
            ))}</div>
          </div>
          <p className={`text-sm text-white/70 leading-relaxed ${expanded ? '' : 'line-clamp-3'}`}>{scene.audio_script[activeLocale]}</p>
          <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 mt-1 text-[10px] text-violet-400 hover:text-violet-300 transition-colors">{expanded ? <><ChevronUp size={12} />Collapse</> : <><ChevronDown size={12} />Read more</>}</button>
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-2"><Shuffle size={12} className="text-emerald-400" /><p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">AI Video Prompt</p></div>
          <p className="text-xs text-white/50 leading-relaxed">{scene.ai_video_prompt_en}</p>
        </div>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ResultPanel({ result, cached }: { result: GenerationOutput; cached: boolean }) {
  const [activeLocale, setActiveLocale] = useState<'kr' | 'us' | 'jp'>('kr');
  const [showRemix, setShowRemix] = useState(false);
  const [copied, setCopied] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const fullText = result.scenes.map(s => `[Scene ${s.scene_number}] ${s.audio_script[activeLocale]}`).join('\n\n');
  return (
    <div className="space-y-5 fade-in-up">
      <div className="rounded-2xl p-6" style={{ background: 'rgba(13,13,20,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-600 flex items-center justify-center"><Sparkles size={16} className="text-white" /></div>
            <div><p className="text-sm font-bold text-white">{result.project_title}</p><p className="text-[10px] text-white/30">{result.scenes.length} Scenes · {cached ? '⚡ Cached' : '✨ New'}</p></div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowRemix(!showRemix)} className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60 hover:text-white transition-all"><Shuffle size={12} />Remix</button>
            <button onClick={() => { navigator.clipboard.writeText(fullText); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60 hover:text-white transition-all">{copied ? <CheckCircle2 size={12} /> : <Link2 size={12} />}{copied ? t('gen_copied') : t('gen_copy')}</button>
          </div>
        </div>
        <div className="mb-5 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-cyan-300" />
              <span className="text-xs font-bold uppercase tracking-widest text-cyan-200">Mobile prompt</span>
            </div>
            <div className="flex gap-2">
              {result.source_url && (
                <a href={result.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-white/60 hover:text-white transition-all">
                  <Link2 size={12} />Source link
                </a>
              )}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(result.copy_ready_prompt_ko ?? '');
                  setPromptCopied(true);
                  setTimeout(() => setPromptCopied(false), 2000);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-[11px] font-semibold text-cyan-100 hover:bg-cyan-400/20 transition-all"
              >
                {promptCopied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                {promptCopied ? t('gen_prompt_copied') : t('gen_copy_prompt')}
              </button>
            </div>
          </div>
          <pre className="whitespace-pre-wrap text-xs leading-relaxed text-cyan-50/80">{result.copy_ready_prompt_ko}</pre>
        </div>
        <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-5 w-fit">{LOCALE_TABS.map(t => (
          <button key={t.key} onClick={() => setActiveLocale(t.key)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeLocale === t.key ? 'bg-violet-600 text-white shadow-sm' : 'text-white/40 hover:text-white/70'}`}>{t.flag} {t.label}</button>
        ))}</div>
        <div className="space-y-3">{result.scenes.map(s => <SceneCard key={s.scene_number} scene={s} activeLocale={activeLocale} />)}</div>
      </div>
      {showRemix && <RemixPanel originalPrompt={result.overall_viral_strategy} targetProduct={result.target_product} />}
    </div>
  );
}

export default function GeneratorPage() {
  useLanguage();
  const navbarRef = useRef<NavbarRef>(null);
  const { user, isLoading: authLoading, credits, refreshCredits, applyCreditsFromServer } = useAuth();
  const [url, setUrl] = useState('');
  const [sourcePlatform, setSourcePlatform] = useState<string | null>(null);
  const [trendReference, setTrendReference] = useState<{ region: string | null; title: string | null; thumbnail: string | null; trendId: string | null } | null>(null);
  const [targetProduct, setTargetProduct] = useState('');
  const [purpose, setPurpose] = useState('Inform');
  const [concept, setConcept] = useState('Problem-solving');
  const [mood, setMood] = useState('');
  const [duration, setDuration] = useState('30s');
  const [cast, setCast] = useState('On-camera talent');
  const [language, setLanguage] = useState('Korean');
  const [productionMethod, setProductionMethod] = useState('Live action');
  const [aiVideoTool, setAiVideoTool] = useState('Google Veo');
  const [customPrompt, setCustomPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('Preparing...');
  const [result, setResult] = useState<GenerationOutput | null>(null);
  const [, setCached] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [rewardPopupOpen, setRewardPopupOpen] = useState(false);
  const [adBlockDetected, setAdBlockDetected] = useState(false);
  const submittingRef = useRef(false);
  const expectedScenes = Number.parseInt(duration, 10) <= 15 ? 5 : Number.parseInt(duration, 10) <= 30 ? 6 : 8;

  useEffect(() => {
    if (!loading) return;
    const timer = window.setInterval(() => {
      setProgress((current) => Math.min(current + (current < 35 ? 3 : current < 70 ? 2 : 1), 92));
    }, 900);
    return () => window.clearInterval(timer);
  }, [loading]);

  // Prefill reference video details passed from the trend feed.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sourceUrl = params.get('url');
    const topic = params.get('topic');
    const platform = params.get('platform');
    if (sourceUrl) startTransition(() => setUrl(sourceUrl));
    if (topic) startTransition(() => setTargetProduct(topic));
    if (platform) startTransition(() => setSourcePlatform(platform));
    if (sourceUrl || platform || params.get('trendId')) {
      startTransition(() => setTrendReference({
        region: params.get('region'),
        title: params.get('title'),
        thumbnail: params.get('thumbnail'),
        trendId: params.get('trendId'),
      }));
    }
  }, []);

  async function handleAnalyze() {
    if (submittingRef.current) return;
    if (!targetProduct.trim()) {
      setError(t('gen_topic_required'));
      return;
    }
    if (credits !== undefined && credits < 5) {
      setError(t('gen_no_credits'));
      return;
    }
    const validationErr = validateShortFormUrl(url);
    if (validationErr) { setUrlError(validationErr); return; }
    submittingRef.current = true;
    setUrlError(null); setLoading(true); setProgress(8); setProgressLabel(t('gen_checking_video')); setError(null); setResult(null);
    try {
      const supabase = (await import('@/lib/supabase/client')).getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { setError(t('gen_login_required')); setLoading(false); return; }
      setProgress(22); setProgressLabel('Analyzing video structure...');
      const res = await fetch('/api/v1/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          ...(url.trim() ? { url: url.trim() } : {}),
          targetProduct: targetProduct.trim(),
          userCustomPrompt: [
            `Content goal: ${purpose}`,
            `Concept: ${concept}`,
            `Desired mood: ${mood || 'Not specified'}`,
            `Video length: ${duration}`,
            `On-camera talent: ${cast}`,
            `Priority language: ${language}`,
            `Production method: ${productionMethod}`,
            productionMethod === 'AI video generation' ? `AI video tool: ${aiVideoTool} (provide copy-ready prompts without calling a video generation API)` : '',
            customPrompt.trim(),
          ].filter(Boolean).join('\n'),
        }),
      });
      const data: AnalyzeResponse = await res.json();
      if (!res.ok || !data.success) {
        const code = data.errorCode ?? '';
        const friendlyMsg =
          res.status === 401 ? 'Please log in again.' :
          res.status === 402 ? `Insufficient credits. Please top up your balance. (Current: ${credits ?? 0})` :
          code.includes('UNSUPPORTED') ? 'Only TikTok and YouTube Shorts links are supported.' :
          code.includes('PRIVATE') || code.includes('DELETED') ? 'This video is private or deleted.' :
          code.includes('TIMEOUT') ? 'Video analysis timed out. Please try again.' :
          (data.error ?? 'Analysis failed. Please try again with a different link.');
        setError(friendlyMsg);
        return;
      }
      setProgress(100); setProgressLabel('Video plan complete');
      setResult(data.data!); setCached(data.cached ?? false);
      if (typeof data.creditsRemaining === 'number') applyCreditsFromServer(data.creditsRemaining);
      clearUserCreditsCache();
      void refreshCredits();
    } catch { setError(t('gen_request_failed')); } finally { submittingRef.current = false; setLoading(false); }
  }

  function handleRewardClaimed() { void refreshCredits(); }

  function handleOpenAdPopup() {
    const testImg = new Image();
    testImg.onload = () => { setAdBlockDetected(false); setRewardPopupOpen(true); };
    testImg.onerror = () => setAdBlockDetected(true);
    testImg.src = 'https://pagead2.googlesyndication.com/pagead/gen_204?id=adblock_test&' + Date.now();
  }

  return (
    <>
      <Navbar ref={navbarRef} />
      <main className="flex-1 flex flex-col min-h-screen">
        {authLoading ? (
          <section className="pt-32 pb-20 px-4 sm:px-6 flex-1">
            <div className="mx-auto max-w-2xl animate-pulse space-y-4">
              <div className="mx-auto h-8 w-48 rounded-lg bg-white/10" />
              <div className="h-72 rounded-2xl border border-white/10 bg-white/5" />
            </div>
          </section>
        ) : !user ? (
          <section className="pt-32 pb-20 px-4 sm:px-6 flex-1">
            <div className="mx-auto max-w-md text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mx-auto shadow-lg"><LogIn size={28} className="text-white" /></div>
              <h2 className="text-2xl font-bold text-white">{t('gen_login_required')}</h2>
              <p className="text-sm text-white/40">{t('gen_login_desc')}</p>
              <button onClick={() => navbarRef.current?.openLoginModal()} className="btn-primary inline-flex items-center gap-2 px-6 py-3"><LogIn size={16} />{t('gen_login_btn')}<ArrowRight size={15} /></button>
            </div>
          </section>
        ) : (
          <section className="pt-20 sm:pt-24 pb-16 sm:pb-20 px-4 sm:px-6 flex-1">
          <div className="mx-auto max-w-2xl space-y-6 sm:space-y-8">
            <div className="text-center space-y-2 px-4">
              <span className="badge badge-purple inline-flex"><Sparkles size={11} /> {t('nav_generator')}</span>
              <h2 className="text-xl sm:text-2xl font-bold text-white">{t('gen_title')}</h2>
              <p className="text-xs sm:text-sm text-white/40">{t('gen_subtitle')}</p>
            </div>

            <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/5 p-4 text-xs leading-relaxed text-cyan-100/75">{t('gen_beginner_guide')}</div>

            <div className="space-y-5">
            <div id="content-options" className="rounded-2xl p-5 sm:p-7 space-y-5 scroll-mt-24" style={{ background: 'rgba(13,13,20,0.8)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
              <div className="flex items-center gap-3 border-b border-white/8 pb-4"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600 text-xs font-black">1</span><div><h3 className="text-sm font-bold text-white">{t('gen_reference_heading')}</h3><p className="text-xs text-white/40">{t('gen_reference_desc')}</p></div></div>
              {trendReference && (
                <div className="flex gap-3 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-3 fade-in-up">
                  {trendReference.thumbnail && <NextImage src={trendReference.thumbnail} alt="Reference video thumbnail" width={80} height={56} unoptimized className="h-14 w-20 shrink-0 rounded-lg object-cover" />}
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">Reference video</p>
                    <p className="mt-1 truncate text-xs font-semibold text-white/80">{trendReference.title || 'Trend reference video'}</p>
                    <p className="mt-1 text-[11px] text-white/40">{[sourcePlatform, trendReference.region, trendReference.trendId ? `Trend #${trendReference.trendId}` : null].filter(Boolean).join(' · ')}</p>
                    {url && <a href={url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-300 hover:text-cyan-100"><Link2 size={11} />View source video</a>}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-white/70"><Link2 size={14} className="text-violet-400" />{t('gen_url_label')} <span className="text-[10px] font-normal text-white/35">(Optional)</span>{sourcePlatform && <span className="text-[10px] font-normal text-cyan-300/70">{sourcePlatform}</span>}</label>
                <input type="url" value={url} onChange={e => { setUrl(e.target.value); if (urlError) setUrlError(null); }} placeholder="Optional: YouTube Shorts or TikTok link" className={`w-full rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm input-dark ${urlError ? 'border-red-500/60 ring-1 ring-red-500/30' : ''}`} />
                {urlError && <p className="flex items-center gap-1.5 text-xs text-red-400 fade-in-up"><span>⚠️</span> {urlError}</p>}
              </div>
              <div className="rounded-xl border border-white/8 bg-white/[0.025] p-4"><p className="mb-3 text-xs font-bold text-white/65">Viral structure to analyze</p><div className="flex flex-wrap gap-2">{ANALYSIS_POINTS.map((point) => <span key={point} className="rounded-full border border-cyan-400/15 bg-cyan-400/5 px-2.5 py-1 text-[11px] text-cyan-100/75">{point}</span>)}</div></div>
            </div>

            <div className="rounded-2xl p-5 sm:p-7 space-y-5" style={{ background: 'rgba(13,13,20,0.8)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
              <div className="flex items-center gap-3 border-b border-white/8 pb-4"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-600 text-xs font-black">2</span><div><h3 className="text-sm font-bold text-white">{t('gen_topic_heading')}</h3><p className="text-xs text-white/40">{t('gen_topic_desc')}</p></div></div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-white/70"><Sparkles size={14} className="text-emerald-400" />{t('gen_topic_label')} <span className="text-xs font-bold text-amber-300">({t('gen_input_required')})</span></label>
                <input type="text" value={targetProduct} onChange={e => setTargetProduct(e.target.value)} placeholder={t('gen_topic_required')} className="w-full rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm input-dark" />
                <p className="text-[11px] leading-relaxed text-white/40">{t('gen_topic_hint')}</p>
              </div>
              <div className="space-y-2"><label className="text-xs font-semibold text-white/70">Content goal</label><ChoiceChips options={PURPOSES} value={purpose} onChange={setPurpose} /></div>
              <div className="space-y-2"><label className="text-xs font-semibold text-white/70">Concept</label><ChoiceChips options={CONCEPTS} value={concept} onChange={setConcept} /></div>
              <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><label className="text-xs font-semibold text-white/70">Desired mood</label><input value={mood} onChange={e => setMood(e.target.value)} placeholder="e.g. bright, trustworthy, energetic" className="w-full rounded-xl px-3 py-2.5 text-xs input-dark" /></div><div className="space-y-2"><label className="flex items-center gap-1.5 text-xs font-semibold text-white/70"><Clapperboard size={13} className="text-pink-400" />On-camera talent</label><ChoiceChips options={['On-camera talent', 'Faceless']} value={cast} onChange={setCast} /></div></div>
              <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><label className="text-xs font-semibold text-white/70">Video length</label><ChoiceChips options={DURATIONS} value={duration} onChange={setDuration} /></div><div className="space-y-2"><label className="flex items-center gap-1.5 text-xs font-semibold text-white/70"><Languages size={13} className="text-emerald-400" />Language</label><ChoiceChips options={LANGUAGES} value={language} onChange={setLanguage} /></div></div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-white/70"><SlidersHorizontal size={14} className="text-amber-400" />{t('gen_custom_prompt_label')} <span className="text-xs text-white/25 font-normal">({t('gen_optional')})</span></label>
                <textarea value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} rows={2} placeholder={t('gen_custom_prompt_placeholder')} className="w-full rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm input-dark resize-none" />
              </div>
            </div>

            <div className="rounded-2xl p-5 sm:p-7 space-y-5" style={{ background: 'rgba(13,13,20,0.8)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
              <div className="flex items-center gap-3 border-b border-white/8 pb-4"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-xs font-black">3</span><div><h3 className="text-sm font-bold text-white">{t('gen_method_heading')}</h3><p className="text-xs text-white/40">{t('gen_method_desc')}</p></div></div>
              <div className="space-y-2"><label className="text-xs font-semibold text-white/70">Production method</label><ChoiceChips options={PRODUCTION_METHODS} value={productionMethod} onChange={setProductionMethod} /></div>
              {productionMethod === 'AI video generation' && (
                <div className="space-y-3 rounded-xl border border-violet-400/25 bg-violet-500/[0.07] p-4 fade-in-up">
                  <div><p className="text-xs font-bold text-violet-100">AI video tool</p><p className="mt-1 text-[11px] leading-relaxed text-white/45">We do not call a video generation API. We provide copy-ready prompts for your selected tool.</p></div>
                  <ChoiceChips options={AI_VIDEO_TOOLS} value={aiVideoTool} onChange={setAiVideoTool} />
                </div>
              )}
            </div>

            <div className="rounded-2xl p-5 sm:p-7 space-y-4" style={{ background: 'rgba(13,13,20,0.8)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
              <div className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-600 text-xs font-black">4</span><div><h3 className="text-sm font-bold text-white">{t('gen_options_heading')}</h3><p className="text-xs text-white/40">{t('gen_options_desc')}</p></div></div>
              <div className="grid gap-2 rounded-xl border border-white/8 bg-white/[0.025] p-4 sm:grid-cols-2">
                {[
                  [t('gen_reference_heading'), trendReference?.title || url || t('gen_reference_none')], [t('gen_topic_label'), targetProduct || t('gen_input_required')],
                  ['Content goal', purpose], ['Video length', duration], ['Production method', productionMethod], ['AI tool', productionMethod === 'AI video generation' ? aiVideoTool : 'Not applicable'],
                  ['Estimated scenes', `${expectedScenes}`], ['Generation cost', '5 credits per generation'],
                ].map(([label, value]) => <div key={label} className="rounded-lg bg-black/15 p-3"><p className="text-[10px] font-bold text-white/35">{label}</p><p className="mt-1 truncate text-xs text-white/75">{value}</p></div>)}
              </div>
              {credits !== undefined && credits < 5 && (
                <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-xs text-amber-300 fade-in-up" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <span>⚠️ {t('gen_no_credits')}</span>
                  <button onClick={handleOpenAdPopup} className="ml-auto flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 text-xs font-bold text-white hover:from-amber-400 hover:to-orange-400 transition-all"><Gift size={12} />{t('gen_ad_topup_btn')}</button>
                </div>
              )}
              <button onClick={handleAnalyze} disabled={loading || !targetProduct.trim() || (credits !== undefined && credits < 5)} className="btn-primary w-full flex flex-col items-center justify-center gap-0.5 py-4">
                {loading ? (
                  <span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" />Creating video plan... {progress}%</span>
                ) : (
                  <>
                    <span className="flex items-center gap-2 text-sm font-bold"><Rocket size={16} />Create video plan — 5 credits<ArrowRight size={15} /></span>
                    <span className="inline-flex min-w-[180px] items-center justify-center gap-1 text-xs text-white/60 font-normal tabular-nums"><Zap size={11} className="text-violet-300" />{t('gen_credits_balance').replace('{credits}', credits === undefined ? '—' : String(credits))} <span className="text-violet-200 font-semibold">{t('gen_credits_cost_range')}</span></span>
                  </>
                )}
              </button>
              <div className="flex flex-wrap justify-center gap-2"><button type="button" onClick={() => document.getElementById('content-options')?.scrollIntoView({ behavior: 'smooth' })} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/55 hover:text-white">{t('gen_previous')}</button><button type="button" onClick={() => document.getElementById('content-options')?.scrollIntoView({ behavior: 'smooth' })} className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 px-3 py-2 text-xs text-cyan-200 hover:bg-cyan-400/10">{t('gen_edit_options')}</button></div>

              {loading && (
                <div className="space-y-2 rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-4 py-3" role="status" aria-live="polite">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-cyan-200">{progressLabel}</span>
                    <span className="font-mono tabular-nums text-white/60">{progress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10" aria-label={`Script generation progress ${progress}%`}>
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 transition-[width] duration-500" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-[11px] text-white/35">We check the video, analyze its structure, then generate your script.</p>
                </div>
              )}

              <div className="flex items-center justify-center gap-1">
                <button onClick={handleOpenAdPopup} className="flex items-center gap-1.5 text-xs text-white/30 hover:text-amber-400 transition-colors"><Gift size={13} />{t('gen_credits_low_cta')}<RefreshCw size={11} /></button>
              </div>
            </div>
            {result && <div className="flex items-start gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-5"><span className="mt-0.5 text-emerald-300">✓</span><div><h3 className="text-sm font-bold text-white">{t('gen_complete_title')}</h3><p className="mt-1 text-xs leading-relaxed text-white/55">{t('gen_complete_desc')}</p></div></div>}
            </div>

            {error && (
              <div className="flex items-start gap-3 rounded-xl px-5 py-4 text-sm text-red-300 fade-in-up" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}><span className="shrink-0 mt-0.5">⚠️</span>{error}</div>
            )}


            {result && <GenerationResult result={result} creditsRemaining={credits} showCreditSummary={false} />}
          </div>
        </section>
        )}
        <Footer />
      </main>

      <DailyRewardWheel onClaim={handleRewardClaimed} />
      <RewardedAdPopup isOpen={rewardPopupOpen} onClose={() => setRewardPopupOpen(false)} onRewardClaimed={handleRewardClaimed} rewardAmount={1} />

      {adBlockDetected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="alertdialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm glass-strong rounded-3xl overflow-hidden fade-in-up">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />
            <div className="p-8 text-center space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mx-auto shadow-lg shadow-orange-500/20"><Shield size={28} className="text-white" /></div>
              <div><h2 className="text-lg font-bold text-white">{t('gen_adblock_title')}</h2><p className="text-sm text-white/40 mt-2 leading-relaxed">{t('gen_adblock_desc')}</p></div>
              <button onClick={() => { setAdBlockDetected(false); setRewardPopupOpen(true); }} className="btn-primary w-full"><Gift size={16} /> {t('gen_adblock_dismiss_btn')}</button>
              <button onClick={() => setAdBlockDetected(false)} className="text-xs text-white/30 hover:text-white/60">{t('close')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
