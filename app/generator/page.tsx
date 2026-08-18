'use client';

import { useState, useEffect, useRef, startTransition } from 'react';
import type { AnalyzeResponse, GenerationOutput, SceneScript } from '@/types';
import Navbar from '@/app/components/Navbar';
import type { NavbarRef } from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import RemixPanel from '@/app/components/RemixPanel';
import RewardedAdPopup from '@/app/components/RewardedAdPopup';
import DailyRewardWheel from '@/app/components/DailyRewardWheel';
import { useAuth } from '@/app/components/AuthProvider';
import { t } from '@/app/components/LanguageSwitcher';
import {
  Link2, ShoppingBag, SlidersHorizontal, Rocket, Loader2, Zap,
  Film, Clock, TrendingUp, ChevronDown, ChevronUp,
  Sparkles, BarChart3, ArrowRight, Gift, RefreshCw, Shuffle,
  CheckCircle2, Shield, LogIn, Copy,
} from 'lucide-react';

// TikTok: 직접 영상 링크 + 검색 결과 URL 허용
// YouTube: 직접 Shorts + results/hashtag 검색 링크 허용
// Instagram: reel/reels + explore/search/keyword / explore/tags 검색 링크 허용
const DIRECT_SHORT_FORM_REGEX = /^https?:\/\/(?:www\.|vm\.|vt\.)?(?:tiktok\.com\/(?:(?:@[^\/\s]+)\/video\/\d+|v\/\d+)|vm\.tiktok\.com\/[\w-]+|vt\.tiktok\.com\/[\w-]+|youtube\.com\/shorts\/[^\s?]+|youtu\.be\/[^\s?]+|instagram\.com\/(?:reel|reels|p)\/[^\s?]+)(?:[\/?#].*)?$/i;

function validateShortFormUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (DIRECT_SHORT_FORM_REGEX.test(trimmed)) return null;
  return t('gen_url_invalid');
}

const LOCALE_TABS = [
  { key: 'kr' as const, flag: '🇰🇷', label: '한국' },
  { key: 'us' as const, flag: '🇺🇸', label: '미국' },
  { key: 'jp' as const, flag: '🇯🇵', label: '일본' },
];

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
          <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 mt-1 text-[10px] text-violet-400 hover:text-violet-300 transition-colors">{expanded ? <><ChevronUp size={12} />접기</> : <><ChevronDown size={12} />더보기</>}</button>
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-2"><Shuffle size={12} className="text-emerald-400" /><p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">AI Video Prompt</p></div>
          <p className="text-xs text-white/50 leading-relaxed">{scene.ai_video_prompt_en}</p>
        </div>
      </div>
    </div>
  );
}

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
            <div><p className="text-sm font-bold text-white">{result.project_title}</p><p className="text-[10px] text-white/30">{result.scenes.length} Scenes · {cached ? '⚡ 캐시됨' : '✨ 새로 생성'}</p></div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowRemix(!showRemix)} className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60 hover:text-white transition-all"><Shuffle size={12} />리믹스</button>
            <button onClick={() => { navigator.clipboard.writeText(fullText); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60 hover:text-white transition-all">{copied ? <CheckCircle2 size={12} /> : <Link2 size={12} />}{copied ? '복사됨' : '복사'}</button>
          </div>
        </div>
        <div className="mb-5 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-cyan-300" />
              <span className="text-xs font-bold uppercase tracking-widest text-cyan-200">모바일 복사용 프롬프트</span>
            </div>
            <div className="flex gap-2">
              {result.source_url && (
                <a href={result.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-white/60 hover:text-white transition-all">
                  <Link2 size={12} />원본 링크
                </a>
              )}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(result.copy_ready_prompt_ko);
                  setPromptCopied(true);
                  setTimeout(() => setPromptCopied(false), 2000);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-[11px] font-semibold text-cyan-100 hover:bg-cyan-400/20 transition-all"
              >
                {promptCopied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                {promptCopied ? '프롬프트 복사됨' : '프롬프트 복사'}
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
  const navbarRef = useRef<NavbarRef>(null);
  const { user, isLoading: authLoading, credits, refreshCredits } = useAuth();
  const [url, setUrl] = useState('');
  const [sourcePlatform, setSourcePlatform] = useState<string | null>(null);
  const [targetProduct, setTargetProduct] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerationOutput | null>(null);
  const [cached, setCached] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [rewardPopupOpen, setRewardPopupOpen] = useState(false);
  const [adBlockDetected, setAdBlockDetected] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);

  // 트렌드 피드에서 넘어온 url/platform 쿼리파라미터 자동완성
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sourceUrl = params.get('url');
    const platform = params.get('platform');
    if (sourceUrl) startTransition(() => setUrl(sourceUrl));
    if (platform) startTransition(() => setSourcePlatform(platform));
  }, []);

  async function handleAnalyze() {
    if (!url.trim()) return;
    const validationErr = validateShortFormUrl(url);
    if (validationErr) { setUrlError(validationErr); return; }
    setUrlError(null); setLoading(true); setError(null); setResult(null); setEstimatedCost(null);
    try {
      const supabase = (await import('@/lib/supabase/client')).getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { setError(t('gen_login_required')); setLoading(false); return; }
      const res = await fetch('/api/v1/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ url: url.trim(), targetProduct: targetProduct.trim() || undefined, userCustomPrompt: customPrompt.trim() || undefined }),
      });
      const data: AnalyzeResponse & { creditCostApplied?: number; creditsRemaining?: number } = await res.json();
      if (!res.ok || !data.success) {
        const code = data.errorCode ?? '';
        const friendlyMsg =
          res.status === 401 ? '로그인이 필요합니다. 다시 로그인해 주세요.' :
          res.status === 402 ? `크레딧이 부족합니다. 크레딧을 충전해 주세요. (현재: ${credits ?? 0})` :
          code.includes('UNSUPPORTED') ? '지원하지 않는 플랫폼입니다. TikTok·YouTube Shorts·Instagram Reel 링크를 사용해주세요.' :
          code.includes('PRIVATE') || code.includes('DELETED') ? '비공개이거나 삭제된 영상입니다.' :
          code.includes('TIMEOUT') ? '영상 분석 시간이 초과됐습니다. 잠시 후 다시 시도해 주세요.' :
          (data.error ?? '분석 중 오류가 발생했습니다. 다른 링크로 시도해 주세요.');
        setError(friendlyMsg);
        return;
      }
      setResult(data.data!); setCached(data.cached ?? false);
      if (data.creditCostApplied) setEstimatedCost(data.creditCostApplied);
      if (typeof data.creditsRemaining === 'number') void refreshCredits();
    } catch { setError('네트워크 오류'); } finally { setLoading(false); }
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

            <div className="rounded-2xl p-5 sm:p-7 space-y-4 sm:space-y-5" style={{ background: 'rgba(13,13,20,0.8)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-white/70"><Link2 size={14} className="text-violet-400" />{t('gen_url_label')}{sourcePlatform && <span className="text-[10px] font-normal text-cyan-300/70">{sourcePlatform}</span>}</label>
                <input type="url" value={url} onChange={e => { setUrl(e.target.value); if (urlError) setUrlError(null); }} placeholder={t('gen_url_placeholder')} className={`w-full rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm input-dark ${urlError ? 'border-red-500/60 ring-1 ring-red-500/30' : ''}`} />
                {urlError && <p className="flex items-center gap-1.5 text-xs text-red-400 fade-in-up"><span>⚠️</span> {urlError}</p>}
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-white/70"><ShoppingBag size={14} className="text-emerald-400" />{t('gen_product_label')}</label>
                <input type="text" value={targetProduct} onChange={e => setTargetProduct(e.target.value)} placeholder={t('gen_product_placeholder')} className="w-full rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm input-dark" />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-white/70"><SlidersHorizontal size={14} className="text-amber-400" />{t('gen_custom_prompt_label')} <span className="text-xs text-white/25 font-normal">({t('gen_optional')})</span></label>
                <textarea value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} rows={2} placeholder={t('gen_custom_prompt_placeholder')} className="w-full rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm input-dark resize-none" />
              </div>

              {credits !== undefined && credits < 3 && (
                <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-xs text-amber-300 fade-in-up" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <span>⚠️ {t('gen_no_credits')}</span>
                  <button onClick={handleOpenAdPopup} className="ml-auto flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 text-xs font-bold text-white hover:from-amber-400 hover:to-orange-400 transition-all"><Gift size={12} />{t('gen_ad_topup_btn')}</button>
                </div>
              )}

              <button onClick={handleAnalyze} disabled={loading || !url.trim()} className="btn-primary w-full flex flex-col items-center justify-center gap-0.5 py-4">
                {loading ? (
                  <span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" />{t('gen_analyzing')}</span>
                ) : (
                  <>
                    <span className="flex items-center gap-2 text-sm font-bold"><Rocket size={16} />{t('gen_analyze_btn')}<ArrowRight size={15} /></span>
                    <span className="inline-flex min-w-[180px] items-center justify-center gap-1 text-xs text-white/60 font-normal tabular-nums"><Zap size={11} className="text-violet-300" />{t('gen_credits_balance').replace('{credits}', credits === undefined ? '—' : String(credits))} <span className="text-violet-200 font-semibold">{t('gen_credits_cost_range')}</span></span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-1">
                <button onClick={handleOpenAdPopup} className="flex items-center gap-1.5 text-xs text-white/30 hover:text-amber-400 transition-colors"><Gift size={13} />{t('gen_credits_low_cta')}<RefreshCw size={11} /></button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-3 rounded-xl px-5 py-4 text-sm text-red-300 fade-in-up" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}><span className="shrink-0 mt-0.5">⚠️</span>{error}</div>
            )}

            {result && estimatedCost !== null && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl fade-in-up" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)' }}>
                <Zap size={13} className="text-violet-400 shrink-0" />
                <p className="text-xs text-white/50">{t('gen_complete_msg').replace('{cost}', String(estimatedCost)).replace('{remaining}', credits === undefined ? '—' : String(credits))}</p>
              </div>
            )}

            {result && <ResultPanel result={result} cached={cached} />}
          </div>
        </section>
        )}
        <Footer />
      </main>

      <DailyRewardWheel onClaim={handleRewardClaimed} />
      <RewardedAdPopup isOpen={rewardPopupOpen} onClose={() => setRewardPopupOpen(false)} onRewardClaimed={handleRewardClaimed} rewardAmount={3} />

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