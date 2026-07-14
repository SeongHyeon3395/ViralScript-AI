'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  Globe,
  ExternalLink,
  Music,
  Play,
  Camera,
  Flame,
  ChevronRight,
  Sparkles,
  Eye,
  MessageCircle,
  Heart,
  Hash,
  Zap,
} from 'lucide-react';

interface TrendItem {
  id: string;
  platform: 'tiktok' | 'youtube' | 'instagram';
  title: string;
  hookKeyword: string;
  description: string;
  views: number;
  likes: number;
  comments: number;
  country: string;
  flag: string;
  url: string;
}

const MOCK_TRENDS: TrendItem[] = [
  {
    id: '1',
    platform: 'tiktok',
    title: 'AI로 10초 만에 만든 숏폼이 100만 뷰',
    hookKeyword: 'AI 숏폼 자동화',
    description: '생성형 AI로 만든 숏폼이 바이럴된 패턴 분석',
    views: 1200000,
    likes: 285000,
    comments: 12400,
    country: 'US',
    flag: '🇺🇸',
    url: 'https://tiktok.com/@example/video/1',
  },
  {
    id: '2',
    platform: 'youtube',
    title: '한국어 ASMR 먹방 쇼츠 폭발적 증가',
    hookKeyword: 'ASMR 먹방',
    description: '한국 크리에이터들의 먹방 쇼츠가 글로벌 트렌드로',
    views: 890000,
    likes: 152000,
    comments: 8900,
    country: 'KR',
    flag: '🇰🇷',
    url: 'https://youtube.com/shorts/example2',
  },
  {
    id: '3',
    platform: 'instagram',
    title: '일본 애니메이션 AI 커버 댄스 챌린지',
    hookKeyword: 'AI 커버 댄스',
    description: 'AI로 생성한 애니 캐릭터가 추는 댄스 챌린지 열풍',
    views: 2100000,
    likes: 534000,
    comments: 28700,
    country: 'JP',
    flag: '🇯🇵',
    url: 'https://instagram.com/reels/example3',
  },
  {
    id: '4',
    platform: 'tiktok',
    title: '"이거 하나면 당신도 크리에이터" 급부상',
    hookKeyword: '크리에이터 도구',
    description: '1인 크리에이터를 위한 AI 도구 리뷰 영상 트렌드',
    views: 650000,
    likes: 98000,
    comments: 5400,
    country: 'US',
    flag: '🇺🇸',
    url: 'https://tiktok.com/@example/video/4',
  },
  {
    id: '5',
    platform: 'youtube',
    title: 'K-푸드 쇼츠, 일본에서 대박난 이유',
    hookKeyword: 'K-푸드 마케팅',
    description: '한국 식품 브랜드의 일본 시장 진출 숏폼 전략 분석',
    views: 1780000,
    likes: 423000,
    comments: 15600,
    country: 'JP',
    flag: '🇯🇵',
    url: 'https://youtube.com/shorts/example5',
  },
  {
    id: '6',
    platform: 'instagram',
    title: '미국 Z세대가 열광하는 한국 뷰티 루틴',
    hookKeyword: 'K-뷰티 루틴',
    description: '10-step 스킨케어 루틴이 미국 Z세대 사이에서 재유행',
    views: 3400000,
    likes: 891000,
    comments: 45200,
    country: 'US',
    flag: '🇺🇸',
    url: 'https://instagram.com/reels/example6',
  },
];

const PLATFORM_ICONS = {
  tiktok: Music,
  youtube: Play,
  instagram: Camera,
} as const;

const PLATFORM_COLORS = {
  tiktok: 'text-pink-400',
  youtube: 'text-red-400',
  instagram: 'text-purple-400',
} as const;

function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export default function TrendFeed() {
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'tiktok' | 'youtube' | 'instagram'>('all');

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setTrends(MOCK_TRENDS);
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const filtered = activeFilter === 'all' ? trends : trends.filter((t) => t.platform === activeFilter);

  return (
    <section id="usecases" className="py-20 px-4 sm:px-6 border-t border-white/5">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-10 space-y-3">
          <span className="badge badge-green">
            <Flame size={11} />
            Trend Feed
          </span>
          <h2 className="text-3xl font-bold text-white">이번 주 글로벌 떡상 숏폼</h2>
          <p className="text-white/40 text-sm max-w-lg mx-auto leading-relaxed">
            전 세계 유저들이 가장 많이 분석한 숏폼 트렌드를 확인하고<br />
            지금 바로 바이럴 대본을 생성해보세요.
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 p-1 rounded-xl mb-8" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {[
            { key: 'all' as const, label: '🔥 전체'},
            { key: 'tiktok' as const, label: 'TikTok', icon: Music },
            { key: 'youtube' as const, label: 'YouTube', icon: Play },
            { key: 'instagram' as const, label: 'Instagram', icon: Camera },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                activeFilter === key
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {Icon && <Icon size={12} />}
              {label}
            </button>
          ))}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl p-6 shimmer" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="h-4 w-3/4 bg-white/5 rounded-lg mb-3" />
                <div className="h-3 w-1/2 bg-white/5 rounded-lg" />
              </div>
            ))}
          </div>
        )}

        {/* Trend list */}
        {!loading && (
          <div className="space-y-3">
            {filtered.map((item, i) => {
              const Icon = PLATFORM_ICONS[item.platform];
              const color = PLATFORM_COLORS[item.platform];
              return (
                <div
                  key={item.id}
                  className="group rounded-2xl p-5 card-hover cursor-pointer"
                  style={{ background: 'rgba(13,13,20,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}
                  onClick={() => {
                    // Set the URL in the generator
                    const urlInput = document.querySelector<HTMLInputElement>('input[type="url"]');
                    if (urlInput) {
                      urlInput.value = item.url;
                      urlInput.dispatchEvent(new Event('input', { bubbles: true }));
                      document.getElementById('generator')?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                >
                  <div className="flex items-start gap-4">
                    {/* Rank */}
                    <div className="hidden sm:flex w-8 h-8 rounded-xl items-center justify-center text-sm font-bold"
                      style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <span className={i < 3 ? 'gradient-text' : 'text-white/30'}>{i + 1}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Icon size={12} className={color} />
                        <span className={`text-xs font-semibold ${color}`}>{item.platform === 'tiktok' ? 'TikTok' : item.platform === 'youtube' ? 'YouTube Shorts' : 'Instagram Reels'}</span>
                        <span className="text-xs text-white/20 mx-0.5">·</span>
                        <span className="text-xs text-white/30">{item.flag} {item.country}</span>
                        <span className="text-xs text-white/20 mx-0.5">·</span>
                        <span className="badge badge-amber text-[10px] px-2 py-0.5">
                          <Hash size={9} />
                          {item.hookKeyword}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white group-hover:text-violet-300 transition-colors truncate">
                        {item.title}
                      </h3>
                      <p className="text-xs text-white/40 mt-1 line-clamp-1">{item.description}</p>

                      {/* Metrics */}
                      <div className="flex items-center gap-4 mt-3">
                        <span className="flex items-center gap-1 text-xs text-white/30">
                          <Eye size={12} />
                          {formatCount(item.views)}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-white/30">
                          <Heart size={12} />
                          {formatCount(item.likes)}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-white/30">
                          <MessageCircle size={12} />
                          {formatCount(item.comments)}
                        </span>
                      </div>
                    </div>

                    {/* CTA */}
                    <div className="shrink-0 flex items-center">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-violet-600/20 to-indigo-600/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                        <ChevronRight size={16} className="text-violet-400" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 text-xs text-white/30">
            <Zap size={12} />
            트렌드는 1시간마다 자동 업데이트됩니다
            <Zap size={12} />
          </div>
        </div>
      </div>
    </section>
  );
}