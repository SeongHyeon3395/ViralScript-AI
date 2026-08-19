'use client';

import { useState, forwardRef, useImperativeHandle } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
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
import LanguageSwitcher, { t } from './LanguageSwitcher';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { useAuth } from './AuthProvider';

export interface NavbarRef {
  openLoginModal: () => void;
  getUser: () => SupabaseUser | null;
}

const Navbar = forwardRef<NavbarRef, object>((props, ref) => {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [referralOpen, setReferralOpen] = useState(false);
  const { user, isLoading, credits } = useAuth();
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/trends') return pathname === '/' || pathname.startsWith('/trends');
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  async function handleLogout() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setUserMenuOpen(false);
  }

  useImperativeHandle(ref, () => ({
    openLoginModal: () => {
      setAuthMode('login');
      setAuthOpen(true);
    },
    getUser: () => user,
  }));

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
        {!user && !isLoading && (
          <div className="border-b border-amber-400/20 bg-gradient-to-r from-amber-500/15 via-violet-500/10 to-cyan-500/15 px-3 py-2 text-center">
            <p className="text-xs text-slate-200">
              {t('announcement_bonus')}{' '}
              <button onClick={openSignup} className="font-bold text-amber-300 underline decoration-amber-300/50 underline-offset-2 transition-colors hover:text-amber-200 hover:decoration-amber-200">
                {t('announcement_signup')}
              </button>
            </p>
          </div>
        )}

        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-[1fr_auto_1fr] h-16 items-center">
            {/* Logo — left */}
            <Link href="/" className="flex items-center gap-1 group shrink-0 justify-self-start">
              <span className="text-base font-bold text-white">ViralScript</span>
              <span className="text-base font-bold gradient-text">AI</span>
            </Link>

            {/* Desktop Nav links — perfectly centered */}
            <nav className="hidden md:flex items-center justify-center gap-1">
              {[
                { label: t('nav_generator'), href: '/generator' },
                { label: t('nav_credits'), href: '/pricing' },
                { label: t('nav_trends'), href: '/trends' },
              ].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`relative px-4 py-2 text-sm text-slate-400 transition-colors after:absolute after:inset-x-4 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-cyan-300 after:transition-opacity hover:text-white ${isActive(item.href) ? 'font-bold text-white after:opacity-100' : 'after:opacity-0'}`}
                >
                  {item.label}
                </Link>
              ))}
              <button
                onClick={() => {
                  if (user) {
                    setReferralOpen(true);
                  } else {
                    openLogin();
                  }
                }}
                className="flex items-center gap-1.5 rounded-lg border border-transparent px-4 py-2 text-sm text-emerald-400/70 transition-all hover:border-emerald-300/35 hover:bg-emerald-500/8 hover:text-emerald-300"
              >
                <Users size={14} />
                {t('nav_invite')}
              </button>
            </nav>

            {/* Right side */}
            <div className="flex items-center justify-end gap-2 shrink-0">
              {/* Language Selector */}
              <LanguageSwitcher />

              {isLoading ? (
                <div className="hidden sm:block h-9 w-[150px] animate-pulse rounded-full border border-white/10 bg-white/5" aria-label="인증 상태 로딩 중" />
              ) : user ? (
                <>
                  {/* Credits badge */}
                    <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 shrink-0">
                      <Zap size={13} className="text-amber-400" />
                      <span className="inline-flex min-w-[70px] items-center justify-center text-xs font-bold tabular-nums text-amber-300">
                      {credits ?? '—'} {t('credits_label')}
                    </span>
                  </div>

                  {/* User menu */}
                  <div className="relative">
                    <button
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10 hover:border-white/20 transition-all"
                    >
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-600 to-teal-500 flex items-center justify-center">
                        <User size={12} className="text-white" />
                      </div>
                      <span className="hidden sm:block text-sm text-white/80 font-medium">{t('nav_my_account')}</span>
                      <ChevronDown size={14} className={`text-white/40 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {userMenuOpen && (
                      <div className="absolute right-0 mt-2 w-52 glass-strong rounded-2xl overflow-hidden shadow-xl shadow-black/40 fade-in-up">
                        <div className="px-4 py-3 border-b border-white/8">
                          <p className="text-xs text-white/40">{t('nav_logged_in_as')}</p>
                          <p className="text-sm font-semibold text-white mt-0.5 truncate">{user?.email ?? '—'}</p>
                        </div>
                        <div className="p-1.5">
                          {[
                            { icon: History, label: t('nav_history'), action: () => { setUserMenuOpen(false); window.location.href = '/history'; } },
                            { icon: CreditCard, label: t('nav_charge'), action: () => { setUserMenuOpen(false); window.location.href = '/pricing'; } },
                            { icon: Settings, label: t('nav_settings'), action: () => { setUserMenuOpen(false); window.location.href = '/settings'; } },
                          ].map(({ icon: Icon, label, action }) => (
                            <button
                              key={label}
                              onClick={action}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/8 transition-all"
                            >
                              <Icon size={15} />
                              {label}
                            </button>
                          ))}
                          <div className="h-px bg-white/8 my-1" />
                          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all">
                            <LogOut size={15} />
                            {t('nav_logout')}
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
                    className="btn-primary-compact hidden px-4 py-2 text-sm sm:block"
                  >
                    {t('nav_login')}
                  </button>
                  <button
                    onClick={openSignup}
                    className="btn-primary-compact hidden px-4 py-2 text-sm sm:block"
                  >
                    {t('nav_signup')}
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
              { label: t('nav_generator'), href: '/generator' },
              { label: t('nav_credits'), href: '/pricing' },
              { label: t('nav_trends'), href: '/trends' },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`block px-4 py-2.5 text-sm transition-colors ${isActive(item.href) ? 'font-bold text-white' : 'text-slate-400 hover:text-white'}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="h-px bg-white/8 my-2" />
            <button onClick={() => { 
              if (user) {
                setReferralOpen(true);
              } else {
                openLogin();
              }
              setMobileMenuOpen(false); 
            }} className="w-full rounded-lg border border-transparent px-4 py-2.5 text-left text-sm text-emerald-400/70 transition-all hover:border-emerald-300/35 hover:bg-emerald-500/8 hover:text-emerald-300">
              {t('nav_mobile_invite')}
            </button>
            <button onClick={openLogin} className="btn-primary-compact w-full px-4 py-2.5 text-left text-sm">
              {t('nav_login')}
            </button>
            <button onClick={openSignup} className="btn-primary-compact w-full px-4 py-2.5 text-left text-sm">
              {t('nav_start_free')}
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
});

Navbar.displayName = 'Navbar';

export default Navbar;
