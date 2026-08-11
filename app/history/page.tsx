'use client';

import { useState, useEffect, useRef } from 'react';
import {
  History, Trash2, ExternalLink, Zap, ChevronDown,
  Loader2, LogIn, ArrowRight, Film, Calendar, ShoppingBag,
} from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import type { NavbarRef } from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface HistoryItem {
  id: string;
  source_url: string;
  project_title: string;
  target_product_name: string;
  credits_used: number;
  created_at: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function platformLabel(url: string): string {
  if (url.includes('tiktok')) return 'TikTok';
  if (url.includes('youtube') || url.includes('youtu.be')) return 'YouTube Shorts';
  if (url.includes('instagram')) return 'Instagram Reels';
  return '숏폼';
}

function platformColor(url: string): string {
  if (url.includes('tiktok')) return 'text-pink-400 bg-pink-400/10 border-pink-400/20';
  if (url.includes('youtube') || url.includes('youtu.be')) return 'text-red-400 bg-red-400/10 border-red-400/20';
  if (url.includes('instagram')) return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
  return 'text-white/40 bg-white/5 border-white/10';
}

export default function HistoryPage() {
  const navbarRef = useRef<NavbarRef>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const LIMIT = 20;

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function fetchHistory(reset = false) {
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const currentOffset = reset ? 0 : offset;
    if (!reset) setLoadingMore(true);

    const res = await fetch(`/api/v1/history?limit=${LIMIT}&offset=${currentOffset}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) { setLoadingMore(false); return; }

    const json = await res.json();
    setTotal(json.total ?? 0);
    setOffset(currentOffset + LIMIT);
    setItems(prev => reset ? json.data : [...prev, ...json.data]);
    setLoadingMore(false);
  }

  useEffect(() => {
    if (user) fetchHistory(true);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function deleteItem(id: string) {
    setDeletingId(id);
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setDeletingId(null); return; }

    await fetch(`/api/v1/history?id=${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    setItems(prev => prev.filter(i => i.id !== id));
    setTotal(prev => prev - 1);
    setDeletingId(null);
  }

  const hasMore = items.length < total;

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

          {loading ? (
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
              {items.map(item => (
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
                </div>
              ))}

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
