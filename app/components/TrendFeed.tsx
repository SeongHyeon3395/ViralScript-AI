'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Music, Play, Eye, Heart, RefreshCw, Loader2, ChevronDown, ExternalLink, FileText, CheckCircle2 } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { t } from './LanguageSwitcher';

interface TrendItem {
  id: string; platform: string; region: string;
  title: string; subtitle: string; views: string; likes: string; tags: string; video_url?: string | null;
  created_at?: string;
}

const PLATFORM_ICONS: Record<string, typeof Music> = { tiktok: Music, TikTok: Music, youtube: Play, 'YouTube Shorts': Play };
const PLATFORM_COLORS: Record<string, string> = { tiktok: 'text-pink-400', TikTok: 'text-pink-400', youtube: 'text-red-400', 'YouTube Shorts': 'text-red-400' };
const REGION_FLAGS: Record<string, string> = { US: '🇺🇸', KR: '🇰🇷', JP: '🇯🇵' };
const REGION_LABELS: Record<string, string> = { all: 'trend_region_all', KR: 'trend_region_kr', US: 'trend_region_us', JP: 'trend_region_jp' };

const INITIAL_LOAD = 30;
const LOAD_MORE_COUNT = 30;
const MAX_TRENDS = 60;

interface TrendFeedProps {
  onGenerate?: (url: string, platform: string) => void;
}

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

export default function TrendFeed({ onGenerate }: TrendFeedProps) {
  const router = useRouter();
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'tiktok' | 'youtube'>('all');
  const [activeRegion, setActiveRegion] = useState<'all' | 'KR' | 'US' | 'JP'>('all');
  const [sortOrder, setSortOrder] = useState<'latest' | 'popular'>('latest');
  const [visibleCount, setVisibleCount] = useState(INITIAL_LOAD);
  const [selectedTrendId, setSelectedTrendId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchTrends() {
      try {
        const response = await fetch('/api/v1/trends', { cache: 'no-store' });
        const payload = await response.json() as { trends?: TrendItem[]; updatedAt?: string | null };
        if (cancelled) return;

        const loadedTrends = (payload.trends ?? []).slice(0, MAX_TRENDS);
        setTrends(loadedTrends);
        setLastUpdated(payload.updatedAt ?? loadedTrends[0]?.created_at ?? null);
      } catch (err) {
        console.error('[TrendFeed] Fetch error:', err);
        setTrends([]);
      }
      setLoading(false);
    }
    fetchTrends();

    const channel = getSupabaseBrowserClient()
      .channel('trend-feed-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trend_feed' }, () => {
        setVisibleCount(INITIAL_LOAD);
        fetchTrends();
      })
      .subscribe();
    const refreshTimer = window.setInterval(fetchTrends, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
      void getSupabaseBrowserClient().removeChannel(channel);
    };
  }, [refreshKey]);

  function toFilterKey(platform: string): string | undefined {
    const p = platform.toLowerCase();
    if (p.includes('tiktok')) return 'tiktok';
    if (p.includes('youtube')) return 'youtube';
    return undefined;
  }

  // KST 포맷 함수 (YYYY.MM.DD HH:mm KST 기준)
  function formatKstTime(isoString?: string): string {
    const parts = new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(isoString ? new Date(isoString) : new Date());
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    return `(${values.year}.${values.month}.${values.day} ${values.hour}:${values.minute} KST 기준)`;
  }

  function handleGenerate(item: TrendItem) {
    if (onGenerate && item.video_url) {
      onGenerate(item.video_url, item.platform);
      return;
    }
    // 직접 라우팅: video_url + platform 쿼리파라미터로 자동완성
    const params = new URLSearchParams();
    if (item.video_url) params.set('url', item.video_url);
    params.set('platform', item.platform);
    router.push(`/generator?${params.toString()}`);
  }

  function parseCount(value: string): number {
    const normalized = value.trim().toUpperCase();
    const multiplier = normalized.endsWith('M') ? 1_000_000 : normalized.endsWith('K') ? 1_000 : 1;
    return Number.parseFloat(normalized.replace(/[^0-9.]/g, '')) * multiplier || 0;
  }

  const kstFormattedTime = lastUpdated ? formatKstTime(lastUpdated) : null;

  let filtered = activeFilter === 'all' ? trends : trends.filter((t) => toFilterKey(t.platform) === activeFilter);
  if (activeRegion !== 'all') {
    filtered = filtered.filter((t) => t.region === activeRegion);
  }
  const sorted = [...filtered].sort((left, right) => {
    if (sortOrder === 'popular') return parseCount(right.views) - parseCount(left.views);
    return new Date(right.created_at ?? 0).getTime() - new Date(left.created_at ?? 0).getTime();
  });
  const displayed = sorted.slice(0, visibleCount);
  const hasMore = visibleCount < sorted.length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-white">{t('trend_title')}</h3>
              {kstFormattedTime && <span className="text-xs font-normal text-white/50">{kstFormattedTime}</span>}
            </div>
            {loading && <p className="text-xs text-white/30 flex items-center gap-1 mt-0.5"><Loader2 size={10} className="animate-spin" />{t('trend_curating')}</p>}
          </div>
        </div>
        <button
          onClick={() => { setLoading(true); setRefreshKey(k => k + 1); }}
          className="flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition-colors"
          title="새로고침"
        >
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Platform filters */}
      <div className="flex gap-1.5">
        {(['all', 'tiktok', 'youtube'] as const).map((f) => (
          <button key={f} onClick={() => { setActiveFilter(f); setVisibleCount(INITIAL_LOAD); }} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeFilter === f ? 'bg-violet-600 text-white' : 'bg-white/5 text-white/40 hover:text-white'}`}>
            {f === 'all' ? t('trend_filter_all') : f === 'tiktok' ? 'TikTok' : 'YouTube'}
          </button>
        ))}
      </div>

      <div className="flex gap-1.5" aria-label="트렌드 정렬">
        {(['latest', 'popular'] as const).map((order) => (
          <button
            key={order}
            onClick={() => { setSortOrder(order); setVisibleCount(INITIAL_LOAD); }}
            className={`trend-sort-button px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${sortOrder === order ? 'is-active' : ''}`}
          >
            {order === 'latest' ? '최신순' : '인기순'}
          </button>
        ))}
      </div>

      {/* Region filters */}
      <div className="flex gap-1.5">
        {(['all', 'KR', 'US', 'JP'] as const).map((r) => (
          <button key={r} onClick={() => { setActiveRegion(r); setVisibleCount(INITIAL_LOAD); }} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeRegion === r ? 'bg-cyan-600 text-white' : 'bg-white/5 text-white/40 hover:text-white'}`}>
            {r === 'all' ? t('trend_region_all') : `${REGION_FLAGS[r] ?? ''} ${t(REGION_LABELS[r])}`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : displayed.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayed.map((item) => {
              const Icon = PLATFORM_ICONS[item.platform] ?? Play;
              const color = PLATFORM_COLORS[item.platform] ?? 'text-white/40';
              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  aria-expanded={selectedTrendId === item.id}
                  onClick={() => setSelectedTrendId(selectedTrendId === item.id ? null : item.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedTrendId(selectedTrendId === item.id ? null : item.id);
                    }
                  }}
                  className="trend-card rounded-2xl p-5 card-hover cursor-pointer"
                  style={{ border: selectedTrendId === item.id ? '1px solid rgba(8,145,178,0.55)' : undefined }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center"><Icon size={12} className={color} /></div>
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{item.platform}</span>
                    <span className="text-xs ml-auto">{REGION_FLAGS[item.region] ?? item.region}</span>
                  </div>
                  <p className="text-sm font-bold text-white leading-snug mb-1.5">{item.title}</p>
                  <p className="text-xs text-white/40 leading-relaxed mb-3">{item.subtitle}</p>
                  <div className="flex items-center gap-3 text-xs text-white/30">
                    <span className="flex items-center gap-1"><Eye size={11} />{item.views}</span>
                    <span className="flex items-center gap-1"><Heart size={11} />{item.likes}</span>
                    {item.tags && <span className="text-violet-400/60 truncate">{item.tags}</span>}
                  </div>
                  {selectedTrendId === item.id && item.video_url && (
                    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/8" onClick={(event) => event.stopPropagation()}>
                      <a href={item.video_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-400/20 transition-colors">
                        <ExternalLink size={13} />{t('trend_visit')}
                      </a>
                      <button onClick={() => handleGenerate(item)} className="inline-flex items-center gap-1.5 rounded-lg border border-violet-400/30 bg-violet-400/10 px-3 py-2 text-xs font-semibold text-violet-200 hover:bg-violet-400/20 transition-colors">
                        <FileText size={13} />{t('trend_generate')}
                      </button>
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-300/80 ml-auto"><CheckCircle2 size={13} />{t('trend_verified')}</span>
                    </div>
                  )}
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
        <div className="text-center py-10 text-sm text-white/30">아직 트렌드 데이터가 없습니다.</div>
      )}
    </div>
  );
}