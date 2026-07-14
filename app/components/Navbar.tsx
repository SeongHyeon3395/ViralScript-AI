'use client';

import { useState, useEffect } from 'react';
import {
  Sparkles,
  Zap,
  History,
  CreditCard,
  ChevronDown,
  LogOut,
  User,
  Settings,
  Menu,
  X,
  Users,
} from 'lucide-react';
import AuthModal from './AuthModal';
import ReferralSystem from './ReferralSystem';
import LanguageSwitcher from './LanguageSwitcher';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export default function Navbar() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [referralOpen, setReferralOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userCredits, setUserCredits] = useState(0);

  // 실제 Supabase 세션 연결
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    // 초기 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchUserCredits(session.user.id);
      }
    });

    // 로그인/로그아웃 상태 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchUserCredits(session.user.id);
      } else {
        setUser(null);
        setUserCredits(0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchUserCredits(userId: string) {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from('profiles')
        .select('credits_remaining')
        .eq('id', userId)
        .single<{ credits_remaining: number }>();
      if (data) setUserCredits(data.credits_remaining ?? 0);
    } catch {
      // 무시
    }
  }

  async function handleLogout() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setUserMenuOpen(false);
  }

  useEffect(() => {}, []);

  function openLogin() {
    setAuthMode('login');
    setAuthOpen(true);
    setMobileMenuOpen(false);
  }

  function openSignup() {
    setAuthMode('signup');
    setAuthOpen(true);
    setMobileMenuOpen(false);
  }

  return (
    <>
      <header
        className="sticky top-0 z-40 w-full glass shadow-lg shadow-black/20"
      >
        {/* Top announcement bar — 로그인 시 숨김 */}
        {!user && (
          <div className="border-b border-white/5 bg-gradient-to-r from-violet-600/20 via-indigo-600/20 to-violet-600/20 px-4 py-1.5 text-center hidden sm:block">
            <p className="text-xs text-white/60">
              🎉 신규 가입 시 크레딧 10개 무료 지급 ·{' '}
              <button onClick={openSignup} className="text-violet-400 hover:text-violet-300 font-semibold transition-colors underline underline-offset-2">
                지금 가입하기
              </button>
            </p>
          </div>
        )}

        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            {/* Logo — 아이콘 없이 글자만 */}
            <a href="/" className="flex items-center gap-1 group">
              <span className="text-base font-bold text-white">ViralScript</span>
              <span className="text-base font-bold gradient-text">AI</span>
            </a>

            {/* Desktop Nav links */}
            <nav className="hidden md:flex items-center gap-1">
              {[
                { label: '대본 생성기', href: '/generator' },
                { label: '크레딧', href: '/pricing' },
                { label: '최신 트렌드', href: '/trends' },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="px-4 py-2 text-sm text-white/50 hover:text-white rounded-lg hover:bg-white/5 transition-all"
                >
                  {item.label}
                </a>
              ))}
              <button
                onClick={() => setReferralOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-emerald-400/70 hover:text-emerald-300 rounded-lg hover:bg-emerald-500/8 transition-all"
              >
                <Users size={14} />
                초대하기
              </button>
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-2">
              {/* Language Selector */}
              <LanguageSwitcher />

              {user ? (
                <>
                  {/* Credits badge */}
                  <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1.5">
                    <Zap size={13} className="text-violet-400" />
                    <span className="text-xs font-bold text-violet-300">{userCredits} 크레딧</span>
                  </div>

                  {/* User menu */}
                  <div className="relative">
                    <button
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10 hover:border-white/20 transition-all"
                    >
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
                        <User size={12} className="text-white" />
                      </div>
                      <span className="hidden sm:block text-sm text-white/80 font-medium">내 계정</span>
                      <ChevronDown size={14} className={`text-white/40 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {userMenuOpen && (
                      <div className="absolute right-0 mt-2 w-52 glass-strong rounded-2xl overflow-hidden shadow-xl shadow-black/40 fade-in-up">
                        <div className="px-4 py-3 border-b border-white/8">
                          <p className="text-xs text-white/40">로그인된 계정</p>
                          <p className="text-sm font-semibold text-white mt-0.5">user@example.com</p>
                        </div>
                        <div className="p-1.5">
                          {[
                            { icon: History, label: '생성 히스토리', shortcut: '' },
                            { icon: CreditCard, label: '크레딧 충전', shortcut: '' },
                            { icon: Settings, label: '계정 설정', shortcut: '' },
                          ].map(({ icon: Icon, label }) => (
                            <button
                              key={label}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/8 transition-all"
                            >
                              <Icon size={15} />
                              {label}
                            </button>
                          ))}
                          <div className="h-px bg-white/8 my-1" />
                          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all">
                            <LogOut size={15} />
                            로그아웃
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={openLogin}
                    className="hidden sm:block px-4 py-2 text-sm font-medium text-white/70 hover:text-white rounded-xl hover:bg-white/8 transition-all"
                  >
                    로그인
                  </button>
                  <button
                    onClick={openSignup}
                    className="px-4 py-2 text-sm font-bold text-white rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 transition-all"
                  >
                    회원가입
                  </button>
                </>
              )}

              {/* Mobile menu toggle */}
              <button
                className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/8 transition-all"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="메뉴 열기"
              >
                {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/8 glass px-4 py-4 space-y-1 fade-in-up">
            {[
              { label: '대본 생성기', href: '/generator' },
              { label: '크레딧', href: '/pricing' },
              { label: '최신 트렌드', href: '/trends' },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="block px-4 py-2.5 text-sm text-white/60 hover:text-white rounded-xl hover:bg-white/5 transition-all"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <div className="h-px bg-white/8 my-2" />
            <button onClick={() => { setReferralOpen(true); setMobileMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-emerald-400/70 hover:text-emerald-300 rounded-xl hover:bg-emerald-500/8 transition-all">
              👥 친구 초대하기
            </button>
            <button onClick={openLogin} className="w-full text-left px-4 py-2.5 text-sm text-white/60 hover:text-white rounded-xl hover:bg-white/5 transition-all">
              로그인
            </button>
            <button onClick={openSignup} className="w-full text-left px-4 py-2.5 text-sm font-bold text-white rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600">
              무료로 시작하기
            </button>
          </div>
        )}
      </header>

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        initialMode={authMode}
      />
      <ReferralSystem
        isOpen={referralOpen}
        onClose={() => setReferralOpen(false)}
      />
    </>
  );
}
