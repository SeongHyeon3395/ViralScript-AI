'use client';

import { useState, useEffect, useRef } from 'react';
import {
  History, Trash2, ExternalLink, Zap, ChevronDown,
  Loader2, LogIn, ArrowRight, Film, Calendar, ShoppingBag,
  Copy, Download, Eye,
} from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import type { NavbarRef } from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import GenerationResult from '@/app/components/GenerationResult';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { normalizeGenerationOutput } from '@/lib/generationOutput';
import { useAuth } from '@/app/components/AuthProvider';
import type { GenerationOutput } from '@/types';

interface HistoryItem {
  id: string;
  source_url: string;
  project_title: string;
  target_product_name: string;
  credits_used: number;
  created_at: string;
  generated_json?: unknown;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function platformLabel(url: string): string {
  if (url.includes('tiktok')) return 'TikTok';
  if (url.includes('youtube') || url.includes('youtu.be')) return 'YouTube Shorts';
  return '숏폼';
}

function platformColor(url: string): string {
  if (url.includes('tiktok')) return 'text-pink-400 bg-pink-400/10 border-pink-400/20';
  if (url.includes('youtube') || url.includes('youtu.be')) return 'text-red-400 bg-red-400/10 border-red-400/20';
  return 'text-white/40 bg-white/5 border-white/10';
}

function normalizedHistoryResult(item: HistoryItem): GenerationOutput | null {
  try {
    return normalizeGenerationOutput(item.generated_json, item.source_url);
  } catch {
    return null;
  }
}

function promptsFor(result: GenerationOutput): string {
  return result.scenes.map((scene) => [
    `Scene ${scene.scene_number} (${scene.start_time}~${scene.end_time})`,
    `Veo:\n${scene.ai_prompts.veo}`,
    `Runway:\n${scene.ai_prompts.runway}`,
    `Kling:\n${scene.ai_prompts.kling}`,
    `범용:\n${scene.ai_prompts.generic}`,
  ].join('\n\n')).join('\n\n---\n\n');
}

function downloadJson(item: HistoryItem) {
  const content = JSON.stringify(item.generated_json ?? {}, null, 2);
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${item.project_title || 'production-plan'}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function HistoryPage() {
  const navbarRef = useRef<NavbarRef>(null);
  const { user, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const LIMIT = 20;

  async function fetchHistory(reset = false) {
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      return;
    }

    const currentOffset = reset ? 0 : offset;
    if (!reset) setLoadingMore(true);

    const res = await fetch(`/api/v1/history?limit=${LIMIT}&offset=${currentOffset}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) {
      setLoadingMore(false);
      setLoading(false);
      return;
    }

    const json = await res.json();
    setTotal(json.total ?? 0);
    setOffset(currentOffset + LIMIT);
    setItems(prev => reset ? json.data : [...prev, ...json.data]);
    setLoadingMore(false);
    setLoading(false);
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchHistory(true);
  }, [authLoading, user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function deleteItem(id: string) {
    setDeletingId(id);
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setDeletingId(null); return; }

    const response = await fetch(`/api/v1/history?id=${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!response.ok) {
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: '히스토리를 삭제하지 못했습니다.', variant: 'error' } }));
      setDeletingId(null);
      return;
    }
    setItems(prev => prev.filter(i => i.id !== id));
    setTotal(prev => Math.max(0, prev - 1));
    setDeletingId(null);
  }

  const hasMore = items.length < total;
  const historyLoading = user ? loading : false;

  return (
    <>
      <Navbar ref={navbarRef} />
      <main className="flex-1 pt-20 sm:pt-24 pb-16 sm:pb-20 px-4 sm:px-6">
        <div className="mx-auto max-w-3xl">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg">
              <History size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">생성 히스토리</h1>
              <p className="text-xs text-white/40 mt-0.5">내가 생성한 대본 기록</p>
            </div>
            {!loading && user && (
              <span className="ml-auto text-xs text-white/30 border border-white/10 rounded-full px-3 py-1">
                총 {total}개
              </span>
            )}
          </div>

          {authLoading ? (
            <div className="animate-pulse space-y-3 py-8">
              <div className="h-24 rounded-2xl border border-white/10 bg-white/5" />
              <div className="h-24 rounded-2xl border border-white/10 bg-white/5" />
              <div className="h-24 rounded-2xl border border-white/10 bg-white/5" />
            </div>
          ) : historyLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-violet-400" />
            </div>
          ) : !user ? (
            <section className="py-20 text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mx-auto shadow-lg">
                <LogIn size={28} className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">로그인이 필요합니다</h2>
              <p className="text-sm text-white/40">히스토리를 보려면 로그인해 주세요.</p>
              <button
                onClick={() => navbarRef.current?.openLoginModal()}
                className="btn-primary inline-flex items-center gap-2 px-6 py-3"
              >
                <LogIn size={16} />로그인 하기<ArrowRight size={15} />
              </button>
            </section>
          ) : items.length === 0 ? (
            <div className="text-center py-20 space-y-3">
              <Film size={36} className="text-white/10 mx-auto" />
              <p className="text-white/30 text-sm">아직 생성된 대본이 없습니다.</p>
              <a href="/generator" className="inline-flex items-center gap-1.5 text-violet-400 text-sm hover:text-violet-300 transition-colors">
                대본 생성하러 가기 <ArrowRight size={14} />
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map(item => {
                const normalizedResult = normalizedHistoryResult(item);
                return (
                <div
                  key={item.id}
                  className="rounded-2xl p-5"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      {/* 제목 + 플랫폼 */}
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${platformColor(item.source_url)}`}>
                          {platformLabel(item.source_url)}
                        </span>
                        <p className="text-sm font-bold text-white truncate">{item.project_title}</p>
                      </div>

                      {/* 제품명 */}
                      {item.target_product_name && (
                        <div className="flex items-center gap-1.5 text-xs text-white/40 mb-2">
                          <ShoppingBag size={11} />
                          <span className="truncate">{item.target_product_name}</span>
                        </div>
                      )}
                      <p className="mb-2 text-xs text-white/40">영상 목적: {typeof item.generated_json === 'object' && item.generated_json && 'video_goal' in item.generated_json ? String(item.generated_json.video_goal || '미지정') : '기존 제작 결과'}</p>

                      {/* URL */}
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-cyan-400/70 hover:text-cyan-300 transition-colors truncate max-w-full"
                      >
                        <ExternalLink size={10} />
                        <span className="truncate">{item.source_url}</span>
                      </a>

                      {/* 메타 */}
                      <div className="flex items-center gap-4 mt-3 text-xs text-white/30">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />{formatDate(item.created_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Zap size={11} className="text-violet-400" />
                          <span className="text-violet-300">{item.credits_used}</span> 크레딧 소모
                        </span>
                      </div>
                    </div>

                    {/* 액션 */}
                    <div className="flex flex-col gap-2 shrink-0">
                      <button onClick={() => setExpandedId(expandedId === item.id ? null : item.id)} disabled={!normalizedResult} className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/20 bg-cyan-400/8 px-3 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-40"><Eye size={12} />{expandedId === item.id ? '결과 닫기' : '전체 결과 보기'}</button>
                      <button onClick={() => normalizedResult && void navigator.clipboard.writeText(promptsFor(normalizedResult))} disabled={!normalizedResult} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"><Copy size={12} />전체 프롬프트 복사</button>
                      <button onClick={() => downloadJson(item)} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60 hover:text-white"><Download size={12} />원본 JSON 다운로드</button>
                      <a
                        href={`/generator?url=${encodeURIComponent(item.source_url)}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-violet-400/20 bg-violet-400/8 px-3 py-2 text-xs font-semibold text-violet-300 hover:bg-violet-400/15 transition-colors"
                      >
                        <Film size={12} />다시 생성
                      </a>
                      <button
                        onClick={() => deleteItem(item.id)}
                        disabled={deletingId === item.id}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-red-400/20 bg-red-400/8 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-400/15 transition-colors disabled:opacity-40"
                      >
                        {deletingId === item.id
                          ? <Loader2 size={12} className="animate-spin" />
                          : <Trash2 size={12} />}
                        삭제
                      </button>
                    </div>
                  </div>
                  {!normalizedResult && <p className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-amber-200">이전 형식의 결과라 화면으로 표시할 수 없습니다. 원본 JSON은 다운로드할 수 있습니다.</p>}
                  {expandedId === item.id && normalizedResult && <div className="mt-5 border-t border-white/8 pt-5"><GenerationResult result={normalizedResult} showCreditSummary={false} /></div>}
                </div>
                );
              })}

              {hasMore && (
                <div className="text-center pt-4">
                  <button
                    onClick={() => fetchHistory()}
                    disabled={loadingMore}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 bg-white/5 text-sm text-white/60 hover:text-white hover:bg-white/10 transition-all disabled:opacity-40"
                  >
                    {loadingMore ? <Loader2 size={14} className="animate-spin" /> : <ChevronDown size={14} />}
                    더 보기 ({total - items.length}개 남음)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
