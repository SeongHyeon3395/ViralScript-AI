'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Music, Play, Camera, Eye, Heart, RefreshCw, Loader2, ChevronDown } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { t } from './LanguageSwitcher';

interface TrendItem {
  id: string; platform: string; region: string;
  title: string; subtitle: string; views: string; likes: string; tags: string;
}

const PLATFORM_ICONS: Record<string, typeof Music> = { tiktok: Music, TikTok: Music, youtube: Play, 'YouTube Shorts': Play, instagram: Camera, 'Instagram Reels': Camera };
const PLATFORM_COLORS: Record<string, string> = { tiktok: 'text-pink-400', TikTok: 'text-pink-400', youtube: 'text-red-400', 'YouTube Shorts': 'text-red-400', instagram: 'text-purple-400', 'Instagram Reels': 'text-purple-400' };
const REGION_FLAGS: Record<string, string> = { US: '🇺🇸', KR: '🇰🇷', JP: '🇯🇵', CN: '🇨🇳' };
const REGION_LABELS: Record<string, string> = { all: 'trend_region_all', KR: 'trend_region_kr', US: 'trend_region_us', JP: 'trend_region_jp', CN: 'trend_region_cn' };

const INITIAL_LOAD = 12;
const LOAD_MORE_COUNT = 12;
const MAX_TRENDS = 50;

// Fallback 데모 데이터 (DB 조회 실패 시에만 사용)
const FALLBACK_DEMO_DATA: TrendItem[] = [
  { id: 'demo-1', platform: 'TikTok', region: 'US', title: 'AI Dance Challenge Goes Viral', subtitle: 'New AI-generated choreography sparks global trend', views: '4.2M', likes: '890K', tags: '#AIDance,#Viral2026' },
  { id: 'demo-2', platform: 'YouTube Shorts', region: 'KR', title: 'AI로 만드는 1분 요리', subtitle: '인공지능이 추천한 초간단 레시피', views: '2.1M', likes: '450K', tags: '#AI요리,#숏폼레시피' },
  { id: 'demo-3', platform: 'Instagram Reels', region: 'JP', title: 'AIメイクチュートリアル', subtitle: '最新のAI美容トレンドを紹介', views: '1.8M', likes: '320K', tags: '#AIメイク,#美容トレンド' },
  { id: 'demo-4', platform: 'TikTok', region: 'KR', title: '부업으로 월 500만원 버는 법', subtitle: 'AI 자동화로 수익 창출하기', views: '3.5M', likes: '720K', tags: '#부업,#AI창업' },
  { id: 'demo-5', platform: 'YouTube Shorts', region: 'US', title: 'ChatGPT Marketing Hack', subtitle: 'Triple your engagement with this AI trick', views: '2.9M', likes: '610K', tags: '#AIMarketing,#Growth' },
  { id: 'demo-6', platform: 'Instagram Reels', region: 'JP', title: 'AI旅行プランナー', subtitle: 'AIが作る完璧な旅行計画', views: '1.5M', likes: '280K', tags: '#AI旅行,#スマート旅' },
  { id: 'demo-7', platform: 'TikTok', region: 'CN', title: 'AI短视频创作技巧', subtitle: '用AI工具快速制作爆款短视频', views: '5.1M', likes: '1.2M', tags: '#AI创作,#短视频' },
  { id: 'demo-8', platform: 'YouTube Shorts', region: 'CN', title: '人工智能赚钱方法', subtitle: '2026年最火的AI副业项目', views: '3.8M', likes: '890K', tags: '#AI赚钱,#副业' },
  { id: 'demo-9', platform: 'TikTok', region: 'US', title: 'Faceless Channel Strategy', subtitle: 'How to grow without showing your face', views: '6.2M', likes: '1.5M', tags: '#Faceless,#ContentStrategy' },
  { id: 'demo-10', platform: 'Instagram Reels', region: 'KR', title: '무자본 창업 아이디어', subtitle: 'AI로 시작하는 1인 미디어', views: '2.7M', likes: '560K', tags: '#창업,#1인미디어' },
  { id: 'demo-11', platform: 'TikTok', region: 'JP', title: 'AIで簡単動画編集', subtitle: '初心者でもできるAI動画制作', views: '2.3M', likes: '480K', tags: '#AI動画,#編集' },
  { id: 'demo-12', platform: 'YouTube Shorts', region: 'US', title: 'Zero to 100K in 30 Days', subtitle: 'The exact strategy I used to grow fast', views: '4.5M', likes: '980K', tags: '#Growth,#YouTubeStrategy' },
];

function SkeletonCard() {
  return (
    <div className="rounded-2xl p-5 animate-pulse" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg bg-white/10" />
        <div className="w-20 h-3 rounded bg-white/10" />
        <div className="ml-auto w-6 h-6 rounded bg-white/10" />
      </div>
      <div className="w-3/4 h-4 rounded bg-white/10 mb-2" />
      <div className="w-full h-3 rounded bg-white/10 mb-3" />
      <div className="flex gap-4">
        <div className="w-16 h-3 rounded bg-white/10" />
        <div className="w-16 h-3 rounded bg-white/10" />
        <div className="w-24 h-3 rounded bg-white/10 ml-auto" />
      </div>
    </div>
  );
}

export default function TrendFeed() {
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'tiktok' | 'youtube' | 'instagram'>('all');
  const [activeRegion, setActiveRegion] = useState<'all' | 'KR' | 'US' | 'JP' | 'CN'>('all');
  const [visibleCount, setVisibleCount] = useState(INITIAL_LOAD);

  useEffect(() => {
    let cancelled = false;
    async function fetchTrends() {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error: dbErr } = await supabase.from('trend_feed').select('*').order('created_at', { ascending: false }).limit(MAX_TRENDS);
        if (cancelled) return;
        
        if (dbErr || !data?.length) {
          console.warn('[TrendFeed] DB 조회 실패 또는 데이터 없음, fallback 사용:', dbErr?.message);
          setError(true);
          setTrends(FALLBACK_DEMO_DATA);
          setLoading(false);
          return;
        }
        
        setTrends(data);
        setError(false);
      } catch (err) {
        console.error('[TrendFeed] Fetch error:', err);
        setError(true);
        setTrends(FALLBACK_DEMO_DATA);
      }
      setLoading(false);
    }
    fetchTrends();
    return () => { cancelled = true; };
  }, []);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(INITIAL_LOAD);
  }, [activeFilter, activeRegion]);

  function toFilterKey(platform: string): string | undefined {
    const p = platform.toLowerCase();
    if (p.includes('tiktok')) return 'tiktok';
    if (p.includes('youtube')) return 'youtube';
    if (p.includes('instagram')) return 'instagram';
    return undefined;
  }

  let filtered = activeFilter === 'all' ? trends : trends.filter((t) => toFilterKey(t.platform) === activeFilter);
  if (activeRegion !== 'all') {
    filtered = filtered.filter((t) => t.region === activeRegion);
  }
  const displayed = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
            <TrendingUp size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">{t('trend_title')}</h3>
            {loading && <p className="text-xs text-white/30 flex items-center gap-1"><Loader2 size={10} className="animate-spin" />{t('trend_curating')}</p>}
          </div>
        </div>
        {error && <span className="text-xs text-amber-400 flex items-center gap-1"><RefreshCw size={11} />{t('trend_fallback')}</span>}
      </div>

      {/* Platform filters */}
      <div className="flex gap-1.5">
        {(['all', 'tiktok', 'youtube', 'instagram'] as const).map((f) => (
          <button key={f} onClick={() => setActiveFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeFilter === f ? 'bg-violet-600 text-white' : 'bg-white/5 text-white/40 hover:text-white'}`}>
            {f === 'all' ? t('trend_filter_all') : f === 'tiktok' ? 'TikTok' : f === 'youtube' ? 'YouTube' : 'Instagram'}
          </button>
        ))}
      </div>

      {/* Region filters */}
      <div className="flex gap-1.5">
        {(['all', 'KR', 'US', 'JP', 'CN'] as const).map((r) => (
          <button key={r} onClick={() => setActiveRegion(r)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeRegion === r ? 'bg-cyan-600 text-white' : 'bg-white/5 text-white/40 hover:text-white'}`}>
            {r === 'all' ? t('trend_region_all') : `${REGION_FLAGS[r] ?? ''} ${t(REGION_LABELS[r])}`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : displayed.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayed.map((t) => {
              const Icon = PLATFORM_ICONS[t.platform] ?? Play;
              const color = PLATFORM_COLORS[t.platform] ?? 'text-white/40';
              return (
                <div key={t.id} className="rounded-2xl p-5 card-hover" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center"><Icon size={12} className={color} /></div>
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{t.platform}</span>
                    <span className="text-xs ml-auto">{REGION_FLAGS[t.region] ?? t.region}</span>
                  </div>
                  <p className="text-sm font-bold text-white leading-snug mb-1.5">{t.title}</p>
                  <p className="text-xs text-white/40 leading-relaxed mb-3">{t.subtitle}</p>
                  <div className="flex items-center gap-3 text-xs text-white/30">
                    <span className="flex items-center gap-1"><Eye size={11} />{t.views}</span>
                    <span className="flex items-center gap-1"><Heart size={11} />{t.likes}</span>
                    {t.tags && <span className="text-violet-400/60 truncate">{t.tags}</span>}
                  </div>
                </div>
              );
            })}
          </div>
          {hasMore && (
            <div className="text-center pt-4">
              <button
                onClick={() => setVisibleCount((c) => Math.min(c + LOAD_MORE_COUNT, MAX_TRENDS))}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 bg-white/5 text-sm text-white/60 hover:text-white hover:bg-white/10 transition-all"
              >
                {t('trend_load_more')} <ChevronDown size={14} />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-10 text-sm text-white/30">{t('trend_no_data')}</div>
      )}
    </div>
  );
}