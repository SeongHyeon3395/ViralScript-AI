'use client';

import { useState } from 'react';
import {
  Sparkles, Rocket, ArrowRight, Play, Globe, BarChart3, Film, Zap,
  Link2, ShoppingBag, SlidersHorizontal, Loader2, Gift, RefreshCw,
  Star, Shield, Users, Clock,
} from 'lucide-react';
import Navbar from './components/Navbar';
import DailyRewardWheel from './components/DailyRewardWheel';
import RewardedAdPopup from './components/RewardedAdPopup';
import { getDynamicCreditCost, DURATION_TIERS } from '@/lib/credits';
import type { AnalyzeResponse, GenerationOutput } from '@/types';

// ─── 프론트 URL 검증 ──────────────────────────────────────────────
const SHORT_FORM_REGEX = /^https?:\/\/(www\.)?(tiktok\.com\/@[\w.]+\/video\/\d+|youtube\.com\/shorts\/[\w-]+|youtu\.be\/shorts\/[\w-]+|instagram\.com\/reel\/[\w-]+)/i;
function validateUrl(input: string): string | null {
  if (!input.trim()) return null;
  if (!SHORT_FORM_REGEX.test(input.trim())) return '유튜브 쇼츠, 틱톡, 인스타 릴스 링크만 분석 가능합니다.';
  return null;
}

const SAMPLE_URLS = [
  { label: '미국 틱톡 100만뷰 챌린지', emoji: '🔥', url: 'https://www.tiktok.com/@khaby.lame/video/7137423965982234886', product: '바이럴 마케팅 플랫폼' },
  { label: '유튜브 쇼츠 지식창업', emoji: '🎬', url: 'https://www.youtube.com/shorts/abc123demo', product: '온라인 코칭 프로그램' },
  { label: '인스타 릴스 뷰티', emoji: '✨', url: 'https://www.instagram.com/reel/demo456/', product: '비건 스킨케어 세럼' },
];

const FEATURES = [
  { icon: BarChart3, title: '바이럴 구조 분석', desc: 'AI가 숏폼 영상의 후킹 패턴, 감정 곡선, 전환 구조를 초 단위로 분석합니다.', color: 'text-violet-400', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.2)' },
  { icon: Globe, title: '3개국 동시 로컬라이징', desc: '한국·미국·일본의 문화적 맥락과 인터넷 밈을 반영한 현지화 대본을 즉시 생성합니다.', color: 'text-cyan-400', bg: 'rgba(6,182,212,0.08)', border: 'rgba(6,182,212,0.2)' },
  { icon: Film, title: 'AI 비주얼 콘티', desc: 'Runway, Midjourney용 영상 프롬프트를 씬별로 자동 생성합니다.', color: 'text-pink-400', bg: 'rgba(236,72,153,0.08)', border: 'rgba(236,72,153,0.2)' },
  { icon: Zap, title: '캐시 적중 시 70% 절감', desc: '동일 URL 재분석 시 크레딧 3개 → 1개. 팀 협업에 최적화된 스마트 캐싱.', color: 'text-amber-400', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
];

const STATS = [
  { value: '1분', label: '평균 생성 시간' }, { value: '3개국', label: '동시 현지화' },
  { value: '99.9%', label: '업타임 SLA' }, { value: '50K+', label: '생성된 대본' },
];

export default function Home() {
  const [url, setUrl] = useState('');
  const [targetProduct, setTargetProduct] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerationOutput | null>(null);
  const [cached, setCached] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [credits, setCredits] = useState(10);
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);
  const [rewardPopupOpen, setRewardPopupOpen] = useState(false);
  const [adBlockDetected, setAdBlockDetected] = useState(false);

  const DEMO_TOKEN = process.env.NEXT_PUBLIC_DEMO_TOKEN ?? '';

  async function handleAnalyze() {
    if (!url.trim() || !targetProduct.trim()) return;
    const vErr = validateUrl(url);
    if (vErr) { setUrlError(vErr); return; }
    setUrlError(null); setLoading(true); setError(null); setResult(null); setEstimatedCost(null);
    try {
      const res = await fetch('/api/v1/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DEMO_TOKEN}` },
        body: JSON.stringify({ url: url.trim(), targetProduct: targetProduct.trim(), userCustomPrompt: customPrompt.trim() || undefined }),
      });
      const data: AnalyzeResponse & { creditCostApplied?: number; creditsRemaining?: number } = await res.json();
      if (!res.ok || !data.success) { setError(data.error ?? '분석 실패'); return; }
      setResult(data.data!); setCached(data.cached ?? false);
      if (data.creditCostApplied) setEstimatedCost(data.creditCostApplied);
      if (typeof data.creditsRemaining === 'number') setCredits(data.creditsRemaining);
    } catch { setError('네트워크 오류'); } finally { setLoading(false); }
  }

  function handleRewardClaimed(amount: number) { setCredits(c => c + amount); }

  function handleOpenAdPopup() {
    const img = new Image();
    img.onload = () => { setAdBlockDetected(false); setRewardPopupOpen(true); };
    img.onerror = () => setAdBlockDetected(true);
    img.src = 'https://pagead2.googlesyndication.com/pagead/gen_204?id=adblock_test&' + Date.now();
  }

  function applySample(s: typeof SAMPLE_URLS[number]) {
    setUrl(s.url); setTargetProduct(s.product);
    document.getElementById('generator')?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <>
      <Navbar />
      <main className="flex-1">
        {/* ═══ HERO ═══ */}
        <section className="relative pt-20 pb-16 px-4 sm:px-6 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />
          <div className="absolute top-40 left-1/3 w-[300px] h-[300px] rounded-full bg-cyan-500/8 blur-3xl pointer-events-none" />
          <div className="relative mx-auto max-w-4xl text-center space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5" style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)' }}>
              <Sparkles size={13} className="text-violet-400" />
              <span className="text-xs font-semibold text-violet-300 tracking-wide">미국 · 한국 · 일본 3개국 동시 로컬라이징</span>
            </div>
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.1] text-white">
              숏폼 URL 하나로<br /><span className="gradient-text">3개국 바이럴 대본</span> 생성
            </h1>
            <p className="text-base sm:text-lg text-white/50 max-w-2xl mx-auto leading-relaxed">
              AI가 영상 구조를 분석하고 귀사의 상품에 맞춘 한국·미국·일본 현지화 대본을 1분 만에 완성합니다.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <a href="#generator" className="btn-primary flex items-center gap-2 px-6 py-3"><Rocket size={16} />지금 무료로 시작<ArrowRight size={15} /></a>
              <a href="#pricing" className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium text-white/60 hover:text-white border border-white/10 hover:bg-white/5 transition-all"><Play size={14} />가격 보기</a>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
              <span className="text-xs text-white/25 font-medium">원클릭 샘플:</span>
              {SAMPLE_URLS.map((s) => (
                <button key={s.label} onClick={() => applySample(s)}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/50 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all">{s.emoji} {s.label}</button>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ STATS ═══ */}
        <section className="border-y border-white/6 py-10 px-4 sm:px-6">
          <div className="mx-auto max-w-4xl grid grid-cols-2 sm:grid-cols-4 gap-6">
            {STATS.map((s) => (
              <div key={s.label} className="text-center"><p className="text-3xl font-extrabold gradient-text">{s.value}</p><p className="text-xs text-white/40 mt-1 font-medium">{s.label}</p></div>
            ))}
          </div>
        </section>

        {/* ═══ GENERATOR ═══ */}
        <section id="generator" className="py-16 px-4 sm:px-6 scroll-mt-20">
          <div className="mx-auto max-w-2xl space-y-6">
            <div className="text-center space-y-2">
              <span className="badge badge-purple inline-flex"><Sparkles size={11} />대본 생성기</span>
              <h2 className="text-2xl font-bold text-white">바이럴 대본 생성기</h2>
              <p className="text-sm text-white/40">URL을 입력하면 AI가 구조를 분석하고 3개국 대본을 생성합니다</p>
            </div>
            <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(13,13,20,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm font-semibold text-white/70"><Link2 size={14} className="text-violet-400" />숏폼 영상 URL</label>
                <input type="url" value={url} onChange={e => { setUrl(e.target.value); if (urlError) setUrlError(null); }}
                  placeholder="https://www.tiktok.com/@... / YouTube Shorts / Instagram Reels"
                  className={`w-full rounded-xl px-4 py-3 text-sm input-dark ${urlError ? 'border-red-500/60 ring-1 ring-red-500/30' : ''}`} />
                {urlError && <p className="flex items-center gap-1.5 text-xs text-red-400 fade-in-up"><span>⚠️</span> {urlError}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm font-semibold text-white/70"><ShoppingBag size={14} className="text-emerald-400" />홍보할 상품 / 서비스명</label>
                <input type="text" value={targetProduct} onChange={e => setTargetProduct(e.target.value)} placeholder="예: 제주 감귤 착즙 주스, 무소음 청소기, SaaS 구독..." className="w-full rounded-xl px-4 py-3 text-sm input-dark" />
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm font-semibold text-white/70"><SlidersHorizontal size={14} className="text-amber-400" />추가 요청사항 <span className="text-xs text-white/25 font-normal">(선택)</span></label>
                <textarea value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} rows={2} placeholder="예: 20대 여성 타겟, MZ 감성, 유머러스한 톤..." className="w-full rounded-xl px-4 py-3 text-sm input-dark resize-none" />
              </div>

              {/* ⭐ 다이나믹 크레딧 안내 */}
              <div className="grid grid-cols-4 gap-2">
                {DURATION_TIERS.map(t => (
                  <div key={t.credits} className="rounded-xl px-2 py-2 text-center" style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.12)' }}>
                    <p className="text-lg font-extrabold gradient-text">{t.credits}</p>
                    <p className="text-[9px] text-white/40 leading-tight">{t.desc}</p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-white/20 text-center">영상 길이에 따라 크레딧이 차등 차감됩니다</p>

              {credits < 3 && (
                <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-xs text-amber-300 fade-in-up" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <span>⚠️ 크레딧이 부족합니다</span>
                  <button onClick={handleOpenAdPopup} className="ml-auto flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 text-xs font-bold text-white hover:from-amber-400 hover:to-orange-400 transition-all"><Gift size={12} />광고 보고 무료 충전</button>
                </div>
              )}

              <button onClick={handleAnalyze} disabled={loading || !url.trim() || !targetProduct.trim()}
                className="btn-primary w-full flex flex-col items-center justify-center gap-0.5 py-4">
                {loading ? (
                  <span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" />AI 생성 중... (최대 30초)</span>
                ) : (
                  <><span className="flex items-center gap-2 text-sm font-bold"><Rocket size={16} />바이럴 구조 분석 및 3개국 대본 생성<ArrowRight size={15} /></span>
                    <span className="flex items-center gap-1 text-xs text-white/60 font-normal"><Zap size={11} className="text-violet-300" />보유 <span className="text-violet-200 font-semibold">{credits}</span> 크레딧</span></>
                )}
              </button>

              <div className="flex items-center justify-center gap-1">
                <button onClick={handleOpenAdPopup} className="flex items-center gap-1.5 text-xs text-white/30 hover:text-amber-400 transition-colors"><Gift size={13} />크레딧이 부족한가요? 30초 광고로 무료 크레딧 받기<RefreshCw size={11} /></button>
              </div>
            </div>

            {error && <div className="flex items-start gap-3 rounded-xl px-5 py-4 text-sm text-red-300 fade-in-up" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}><span className="shrink-0 mt-0.5">⚠️</span><span>{error}</span></div>}

            {result && estimatedCost !== null && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl fade-in-up" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)' }}>
                <Zap size={13} className="text-violet-400 shrink-0" />
                <p className="text-xs text-white/50">생성 완료 · <span className="text-violet-300 font-semibold">{estimatedCost} 크레딧</span> 소모 · 잔여 <span className="text-violet-300 font-semibold">{credits} 크레딧</span></p>
              </div>
            )}
          </div>
        </section>

        {/* ═══ FEATURES ═══ */}
        <section className="py-16 px-4 sm:px-6 border-t border-white/5">
          <div className="mx-auto max-w-5xl">
            <div className="text-center mb-12 space-y-3">
              <span className="badge badge-purple inline-flex"><Sparkles size={11} />Features</span>
              <h2 className="text-3xl font-bold text-white">왜 ViralScript AI인가요?</h2>
              <p className="text-white/40 max-w-lg mx-auto text-sm">단순한 번역이 아닙니다. 각국의 트렌드와 감성을 이해한 AI가 진짜 바이럴을 만듭니다.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {FEATURES.map((f) => (
                <div key={f.title} className="rounded-2xl p-6 card-hover" style={{ background: f.bg, border: `1px solid ${f.border}` }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(255,255,255,0.05)' }}><f.icon size={20} className={f.color} /></div>
                  <h3 className="font-bold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-white/50 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ PRICING ═══ */}
        <section id="pricing" className="py-16 px-4 sm:px-6 border-t border-white/5 scroll-mt-20">
          <div className="mx-auto max-w-5xl">
            <div className="text-center mb-10 space-y-3">
              <span className="badge badge-amber inline-flex"><Star size={11} />크레딧</span>
              <h2 className="text-3xl font-bold text-white">무료로 시작하세요</h2>
              <p className="text-white/40 text-sm">광고 시청 · 출석 룰렛 · 친구 초대로 무료 크레딧을 충전하세요</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {[
                { icon: Gift, title: '출석 룰렛', desc: '매일 접속하고 룰렛을 돌려 최대 10 크레딧 획득', badge: '매일 무료', badgeClass: 'badge-green', highlight: false },
                { icon: Play, title: '광고 보상 충전', desc: '30초 광고를 보고 즉시 3 크레딧 무료 충전 (하루 최대 5회)', badge: '하루 5회', badgeClass: 'badge-amber', highlight: true },
                { icon: Users, title: '친구 초대', desc: '친구가 가입하면 나도 3 크레딧, 친구도 3 크레딧', badge: '무제한', badgeClass: 'badge-purple', highlight: false },
              ].map(({ icon: Icon, title, desc, badge, badgeClass, highlight }) => (
                <div key={title} className={`relative rounded-2xl p-6 card-hover flex flex-col ${highlight ? 'glow-purple' : ''}`}
                  style={{ background: highlight ? 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(79,70,229,0.10) 100%)' : 'rgba(13,13,20,0.6)', border: highlight ? '1px solid rgba(124,58,237,0.4)' : '1px solid rgba(255,255,255,0.08)' }}>
                  {highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2"><span className="badge badge-amber px-3 py-1 text-xs"><Star size={10} fill="currentColor" />추천</span></div>}
                  <div className="flex-1">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border border-violet-500/20 flex items-center justify-center mb-4"><Icon size={18} className="text-violet-400" /></div>
                    <p className="text-base font-bold text-white mb-1">{title}</p>
                    <span className={`badge ${badgeClass} text-xs mb-3 inline-block`}>{badge}</span>
                    <p className="text-sm text-white/50 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ FOOTER ═══ */}
        <footer className="border-t border-white/5 py-10 px-4 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-sm font-semibold text-white/40">ViralScript AI</span>
              <p className="text-xs text-white/25 text-center max-w-lg">본 플랫폼은 사용자가 제출한 URL의 원본을 저장·전송·재배포하지 않으며, AI 결과물은 마케팅 분석을 위한 2차 창작 가이드입니다.</p>
              <div className="flex items-center gap-4 text-xs text-white/30">
                <span className="hover:text-white/60 transition-colors cursor-pointer">이용약관</span>
                <span className="hover:text-white/60 transition-colors cursor-pointer">개인정보처리방침</span>
              </div>
            </div>
          </div>
        </footer>
      </main>

      <DailyRewardWheel onClaim={handleRewardClaimed} />
      <RewardedAdPopup isOpen={rewardPopupOpen} onClose={() => setRewardPopupOpen(false)} onRewardClaimed={handleRewardClaimed} rewardAmount={3} />

      {adBlockDetected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm glass-strong rounded-3xl overflow-hidden fade-in-up">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />
            <div className="p-8 text-center space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mx-auto shadow-lg shadow-orange-500/20"><Shield size={28} className="text-white" /></div>
              <div><h2 className="text-lg font-bold text-white">광고 차단 프로그램 감지됨</h2><p className="text-sm text-white/40 mt-2">무료 크레딧을 충전하시려면 <span className="text-orange-400 font-semibold">광고 차단기(AdBlock)를 잠시 꺼주세요.</span><br /><span className="text-white/30 text-xs mt-1 block">광고 수익이 이 서비스를 무료로 유지합니다 🙏</span></p></div>
              <button onClick={() => { setAdBlockDetected(false); setRewardPopupOpen(true); }} className="btn-primary w-full"><Gift size={16} /> 껐어요! 광고 보고 크레딧 받기</button>
              <button onClick={() => setAdBlockDetected(false)} className="text-xs text-white/30 hover:text-white/60">닫기</button>
            </div>
            <div className="h-px w-full bg-gradient-to-r from-transparent via-orange-500/30 to-transparent" />
          </div>
        </div>
      )}
    </>
  );
}