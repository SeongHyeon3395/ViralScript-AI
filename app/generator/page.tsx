'use client';

import { useState, useEffect, useRef } from 'react';
import type { AnalyzeResponse, GenerationOutput, SceneScript } from '@/types';
import Navbar from '@/app/components/Navbar';
import type { NavbarRef } from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import RemixPanel from '@/app/components/RemixPanel';
import RewardedAdPopup from '@/app/components/RewardedAdPopup';
import DailyRewardWheel from '@/app/components/DailyRewardWheel';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Link2, ShoppingBag, SlidersHorizontal, Rocket, Loader2, Zap,
  Film, Clock, TrendingUp, ChevronDown, ChevronUp,
  Sparkles, BarChart3, ArrowRight, Gift, RefreshCw, Shuffle,
  CheckCircle2, Shield, LogIn,
} from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';

// ─── 샘플 URL ─────────────────────────────────────────────────────
const SAMPLE_URLS = [
  { label: '미국 틱톡 100만뷰 챌린지', emoji: '🔥', url: 'https://www.tiktok.com/@khaby.lame/video/7137423965982234886', product: '바이럴 마케팅 플랫폼' },
  { label: '유튜브 쇼츠 지식창업', emoji: '🎬', url: 'https://www.youtube.com/shorts/abc123demo', product: '온라인 코칭 프로그램' },
  { label: '인스타 릴스 뷰티', emoji: '✨', url: 'https://www.instagram.com/reel/demo456/', product: '비건 스킨케어 세럼' },
] as const;

const SHORT_FORM_REGEX = /^https?:\/\/(www\.)?(tiktok\.com\/@[\w.]+\/video\/\d+|youtube\.com\/shorts\/[\w-]+|youtu\.be\/shorts\/[\w-]+|instagram\.com\/reel\/[\w-]+)/i;

function validateShortFormUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (!SHORT_FORM_REGEX.test(trimmed)) return '유튜브 쇼츠, 틱톡, 인스타 릴스 링크만 분석 가능합니다.';
  return null;
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
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [url, setUrl] = useState('');
  const [targetProduct, setTargetProduct] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerationOutput | null>(null);
  const [cached, setCached] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [rewardPopupOpen, setRewardPopupOpen] = useState(false);
  const [adBlockDetected, setAdBlockDetected] = useState(false);
  const [credits, setCredits] = useState(10);
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);

  // 세션 확인
  useEffect(() => {
    getSupabaseBrowserClient().auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUser(session.user);
    });
    const { data: { subscription } } = getSupabaseBrowserClient().auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const DEMO_TOKEN = process.env.NEXT_PUBLIC_DEMO_TOKEN ?? '';

  async function handleAnalyze() {
    if (!url.trim() || !targetProduct.trim()) return;
    const validationErr = validateShortFormUrl(url);
    if (validationErr) { setUrlError(validationErr); return; }
    setUrlError(null); setLoading(true); setError(null); setResult(null); setEstimatedCost(null);
    try {
      const res = await fetch('/api/v1/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DEMO_TOKEN}` },
        body: JSON.stringify({ url: url.trim(), targetProduct: targetProduct.trim(), userCustomPrompt: customPrompt.trim() || undefined }),
      });
      const data: AnalyzeResponse & { creditCostApplied?: number; creditsRemaining?: number } = await res.json();
      if (!res.ok || !data.success) { setError(data.error ?? '알 수 없는 오류'); return; }
      setResult(data.data!); setCached(data.cached ?? false);
      if (data.creditCostApplied) setEstimatedCost(data.creditCostApplied);
      if (typeof data.creditsRemaining === 'number') setCredits(data.creditsRemaining);
    } catch { setError('네트워크 오류'); } finally { setLoading(false); }
  }

  function handleRewardClaimed(amount: number) { setCredits(c => c + amount); }

  function handleOpenAdPopup() {
    const testImg = new Image();
    testImg.onload = () => { setAdBlockDetected(false); setRewardPopupOpen(true); };
    testImg.onerror = () => setAdBlockDetected(true);
    testImg.src = 'https://pagead2.googlesyndication.com/pagead/gen_204?id=adblock_test&' + Date.now();
  }

  return (
    <>
      <Navbar ref={navbarRef} />
      <main className="flex-1">
        {!user ? (
          <section className="pt-32 pb-20 px-4 sm:px-6">
            <div className="mx-auto max-w-md text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mx-auto shadow-lg"><LogIn size={28} className="text-white" /></div>
              <h2 className="text-2xl font-bold text-white">로그인이 필요합니다</h2>
              <p className="text-sm text-white/40">대본 생성을 사용하려면 로그인 또는 회원가입을 해주세요.</p>
              <button onClick={() => navbarRef.current?.openLoginModal()} className="btn-primary inline-flex items-center gap-2 px-6 py-3"><LogIn size={16} />로그인하기<ArrowRight size={15} /></button>
            </div>
          </section>
        ) : (
          <>
          <section className="pt-20 sm:pt-24 pb-16 sm:pb-20 px-4 sm:px-6">
          <div className="mx-auto max-w-2xl space-y-6 sm:space-y-8">
            <div className="text-center space-y-2 px-4">
              <span className="badge badge-purple inline-flex"><Sparkles size={11} /> 대본 생성</span>
              <h2 className="text-xl sm:text-2xl font-bold text-white">바이럴 대본 생성</h2>
              <p className="text-xs sm:text-sm text-white/40">URL을 입력하면 AI가 구조를 분석하고 3개국 대본을 생성합니다</p>
            </div>

            <div className="rounded-2xl p-5 sm:p-7 space-y-4 sm:space-y-5" style={{ background: 'rgba(13,13,20,0.8)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-white/70"><Link2 size={14} className="text-violet-400" />숏폼 영상 URL</label>
                <input type="url" value={url} onChange={e => { setUrl(e.target.value); if (urlError) setUrlError(null); }} placeholder="https://www.tiktok.com/@... 또는 YouTube Shorts, Instagram Reels URL" className={`w-full rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm input-dark ${urlError ? 'border-red-500/60 ring-1 ring-red-500/30' : ''}`} />
                {urlError && <p className="flex items-center gap-1.5 text-xs text-red-400 fade-in-up"><span>⚠️</span> {urlError}</p>}
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-white/70"><ShoppingBag size={14} className="text-emerald-400" />홍보할 상품 / 서비스명</label>
                <input type="text" value={targetProduct} onChange={e => setTargetProduct(e.target.value)} placeholder="예: 제주 감귤 착즙 주스, 무소음 청소기, SaaS 구독 플랜..." className="w-full rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm input-dark" />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-white/70"><SlidersHorizontal size={14} className="text-amber-400" />추가 요청사항 <span className="text-xs text-white/25 font-normal">(선택)</span></label>
                <textarea value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} rows={2} placeholder="예: 20대 여성 타겟, MZ 감성, 유머러스한 톤, 전환율 극대화..." className="w-full rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm input-dark resize-none" />
              </div>

              {credits < 3 && (
                <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-xs text-amber-300 fade-in-up" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <span>⚠️ 크레딧이 부족합니다</span>
                  <button onClick={handleOpenAdPopup} className="ml-auto flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 text-xs font-bold text-white hover:from-amber-400 hover:to-orange-400 transition-all"><Gift size={12} />광고 보고 무료 충전</button>
                </div>
              )}

              <button onClick={handleAnalyze} disabled={loading || !url.trim() || !targetProduct.trim()} className="btn-primary w-full flex flex-col items-center justify-center gap-0.5 py-4">
                {loading ? (
                  <span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" />AI 생성 중... (최대 30초)</span>
                ) : (
                  <>
                    <span className="flex items-center gap-2 text-sm font-bold"><Rocket size={16} />바이럴 구조 분석 및 3개국 대본 생성<ArrowRight size={15} /></span>
                    <span className="flex items-center gap-1 text-xs text-white/60 font-normal"><Zap size={11} className="text-violet-300" />보유 <span className="text-violet-200 font-semibold">{credits}</span> 크레딧 · 생성 시 영상 길이에 따라 <span className="text-violet-200 font-semibold">1~8</span> 크레딧 소모</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-1">
                <button onClick={handleOpenAdPopup} className="flex items-center gap-1.5 text-xs text-white/30 hover:text-amber-400 transition-colors"><Gift size={13} />크레딧이 부족한가요? 30초 광고로 무료 크레딧 받기<RefreshCw size={11} /></button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-3 rounded-xl px-5 py-4 text-sm text-red-300 fade-in-up" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}><span className="shrink-0 mt-0.5">⚠️</span>{error}</div>
            )}

            {result && estimatedCost !== null && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl fade-in-up" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)' }}>
                <Zap size={13} className="text-violet-400 shrink-0" />
                <p className="text-xs text-white/50">생성 완료 · <span className="text-violet-300 font-semibold">{estimatedCost} 크레딧</span> 소모 · 잔여 <span className="text-violet-300 font-semibold">{credits} 크레딧</span></p>
              </div>
            )}

            {result && <ResultPanel result={result} cached={cached} />}
          </div>
        </section>
        <Footer />
        </>
        )}
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
              <div><h2 className="text-lg font-bold text-white">광고 차단 프로그램 감지됨</h2><p className="text-sm text-white/40 mt-2 leading-relaxed">무료 크레딧을 충전하시려면<br /><span className="text-orange-400 font-semibold">광고 차단기(AdBlock)를 잠시 꺼주세요.</span></p></div>
              <button onClick={() => { setAdBlockDetected(false); setRewardPopupOpen(true); }} className="btn-primary w-full"><Gift size={16} /> 껐어요! 광고 보고 크레딧 받기</button>
              <button onClick={() => setAdBlockDetected(false)} className="text-xs text-white/30 hover:text-white/60">닫기</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}