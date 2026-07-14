'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Music, Play, Camera, Eye, Heart, RefreshCw, Loader2 } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface TrendItem {
  id: string; platform: string; region: string;
  title: string; subtitle: string; views: string; likes: string; tags: string;
}

const PLATFORM_ICONS: Record<string, typeof Music> = { tiktok: Music, TikTok: Music, youtube: Play, 'YouTube Shorts': Play, instagram: Camera, 'Instagram Reels': Camera };
const PLATFORM_COLORS: Record<string, string> = { tiktok: 'text-pink-400', TikTok: 'text-pink-400', youtube: 'text-red-400', 'YouTube Shorts': 'text-red-400', instagram: 'text-purple-400', 'Instagram Reels': 'text-purple-400' };
const REGION_FLAGS: Record<string, string> = { US: '🇺🇸', KR: '🇰🇷', JP: '🇯🇵' };

// Fallback 데모 데이터 (DB 조회 실패 시에만 사용)
const FALLBACK_DEMO_DATA: TrendItem[] = [
  { id: 'demo-1', platform: 'TikTok', region: 'US', title: 'AI Dance Challenge Goes Viral', subtitle: 'New AI-generated choreography sparks global trend', views: '4.2M', likes: '890K', tags: '#AIDance,#Viral2026' },
  { id: 'demo-2', platform: 'YouTube Shorts', region: 'KR', title: 'AI로 만드는 1분 요리', subtitle: '인공지능이 추천한 초간단 레시피', views: '2.1M', likes: '450K', tags: '#AI요리,#숏폼레시피' },
  { id: 'demo-3', platform: 'Instagram Reels', region: 'JP', title: 'AIメイクチュートリアル', subtitle: '最新のAI美容トレンドを紹介', views: '1.8M', likes: '320K', tags: '#AIメイク,#美容トレンド' },
  { id: 'demo-4', platform: 'TikTok', region: 'KR', title: '부업으로 월 500만원 버는 법', subtitle: 'AI 자동화로 수익 창출하기', views: '3.5M', likes: '720K', tags: '#부업,#AI창업' },
  { id: 'demo-5', platform: 'YouTube Shorts', region: 'US', title: 'ChatGPT Marketing Hack', subtitle: 'Triple your engagement with this AI trick', views: '2.9M', likes: '610K', tags: '#AIMarketing,#Growth' },
  { id: 'demo-6', platform: 'Instagram Reels', region: 'JP', title: 'AI旅行プランナー', subtitle: 'AIが作る完璧な旅行計画', views: '1.5M', likes: '280K', tags: '#AI旅行,#スマート旅' },
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

  useEffect(() => {
    let cancelled = false;
    async function fetchTrends() {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error: dbErr } = await supabase.from('trend_feed').select('*').order('created_at', { ascending: false }).limit(6);
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

  function toFilterKey(platform: string): string | undefined {
    const p = platform.toLowerCase();
    if (p.includes('tiktok')) return 'tiktok';
    if (p.includes('youtube')) return 'youtube';
    if (p.includes('instagram')) return 'instagram';
    return undefined;
  }

  const filtered = activeFilter === 'all' ? trends : trends.filter((t) => toFilterKey(t.platform) === activeFilter);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
            <TrendingUp size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">글로벌 트렌드</h3>
            {loading && <p className="text-xs text-white/30 flex items-center gap-1"><Loader2 size={10} className="animate-spin" />AI 큐레이팅 중...</p>}
          </div>
        </div>
        {error && <span className="text-xs text-amber-400 flex items-center gap-1"><RefreshCw size={11} />Fallback 모드</span>}
      </div>
      <div className="flex gap-1.5">
        {(['all', 'tiktok', 'youtube', 'instagram'] as const).map((f) => (
          <button key={f} onClick={() => setActiveFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeFilter === f ? 'bg-violet-600 text-white' : 'bg-white/5 text-white/40 hover:text-white'}`}>
            {f === 'all' ? '전체' : f === 'tiktok' ? 'TikTok' : f === 'youtube' ? 'YouTube' : 'Instagram'}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((t) => {
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
      ) : (
        <div className="text-center py-10 text-sm text-white/30">아직 트렌드 데이터가 없습니다 · Cron이 첫 실행될 때까지 기다려주세요</div>
      )}
    </div>
  );
}