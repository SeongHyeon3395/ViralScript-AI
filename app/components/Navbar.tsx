'use client';

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Zap,
  History,
  CreditCard,
  ChevronDown,
  LogOut,
  Settings,
  Menu,
  X,
  Users,
} from 'lucide-react';
import AuthModal from './AuthModal';
import ReferralSystem from './ReferralSystem';
import LanguageSwitcher, { t } from './LanguageSwitcher';
import { useLanguage } from './LanguageProvider';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { useAuth } from './AuthProvider';

export interface NavbarRef {
  openLoginModal: () => void;
  getUser: () => SupabaseUser | null;
}

const Navbar = forwardRef<NavbarRef, object>((props, ref) => {
  useLanguage();
  const [authOpen, setAuthOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [referralOpen, setReferralOpen] = useState(false);
  const { user, isLoading, credits } = useAuth();
  const pathname = usePathname();
  useEffect(() => {
    const handler = () => setReferralOpen(true);
    window.addEventListener('referral:open', handler);
    return () => window.removeEventListener('referral:open', handler);
  }, []);
  const metadataName = user?.user_metadata?.full_name;
  const displayName = typeof metadataName === 'string' && metadataName.trim()
    ? metadataName.trim()
    : user?.email?.split('@')[0] ?? '사용자';

  function isActive(href: string) {
    if (href === '/trends') return pathname === '/trends' || pathname.startsWith('/trends/');
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  async function handleLogout() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setUserMenuOpen(false);
  }

  useImperativeHandle(ref, () => ({
    openLoginModal: () => {
      setAuthOpen(true);
    },
    getUser: () => user,
  }));

  function openLogin() {
    setAuthOpen(true);
    setMobileMenuOpen(false);
  }

  return (
    <>
      <header
        className="sticky top-0 z-40 w-full glass shadow-lg shadow-black/20"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="relative flex h-16 items-center justify-between gap-2">
            {/* Logo — left */}
            <Link href="/" className="flex items-center gap-1 group shrink-0 justify-self-start transition-transform duration-200 hover:-translate-y-0.5">
              <span className="text-base font-bold text-white">ViralScript</span>
              <span className="text-base font-bold gradient-text">AI</span>
            </Link>

            {/* Desktop Nav links — perfectly centered */}
            <nav className="pointer-events-none absolute inset-0 hidden items-center justify-center gap-1 lg:flex">
              {[
                { label: t('nav_generator'), href: '/generator' },
                { label: t('nav_credits'), href: '/pricing' },
                { label: t('nav_trends'), href: pathname === '/' ? '#trends' : '/trends' },
              ].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`pointer-events-auto relative whitespace-nowrap px-3 py-2 text-sm text-slate-400 transition-all duration-200 after:absolute after:inset-x-4 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-cyan-300 after:transition-opacity hover:-translate-y-0.5 hover:text-white ${isActive(item.href) ? 'font-bold text-white after:opacity-100' : 'after:opacity-0'}`}
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
                className="pointer-events-auto flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-transparent px-3 py-2 text-sm text-emerald-400/70 transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300/35 hover:bg-emerald-500/8 hover:text-emerald-300"
              >
                <Users size={14} />
                {t('nav_invite')}
              </button>
            </nav>

            {/* Right side */}
            <div className="relative z-10 flex shrink-0 items-center justify-end gap-2">
              {/* Language Selector */}
              <div className="hidden sm:block"><LanguageSwitcher /></div>

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
                      className="flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-2 hover:bg-white/10 hover:border-white/20 transition-all sm:px-3"
                      aria-expanded={userMenuOpen}
                      aria-label={displayName}
                    >
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center">
                        <span className="text-xs font-black text-white" aria-hidden="true">V</span>
                      </div>
                      <span className="hidden sm:block max-w-28 truncate text-sm text-white/80 font-medium">{displayName}</span>
                      <ChevronDown size={14} className={`hidden text-white/40 transition-transform sm:block ${userMenuOpen ? 'rotate-180' : ''}`} />
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
                  <button
                    onClick={openLogin}
                    className="btn-primary-compact hidden px-4 py-2 text-sm sm:block"
                  >
                    {t('nav_login')}
                  </button>
              )}

              {/* Mobile menu toggle */}
              <button
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 text-white/60 transition-all hover:bg-white/8 hover:text-white lg:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="메뉴 열기"
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="border-t border-white/8 px-4 py-4 glass fade-in-up lg:hidden">
            <nav className="flex flex-col gap-2">
              {[
              { label: t('nav_generator'), href: '/generator' },
              { label: t('nav_credits'), href: '/pricing' },
              { label: t('nav_trends'), href: pathname === '/' ? '#trends' : '/trends' },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`flex min-h-12 w-full items-center rounded-xl border px-4 text-left text-sm transition-all duration-200 ${isActive(item.href) ? 'border-violet-400/50 bg-violet-500/20 font-bold text-white' : 'border-white/10 bg-white/[0.025] text-slate-300 hover:border-white/20 hover:bg-white/10 hover:text-white'}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
              ))}
            </nav>
            <button onClick={() => { 
              if (user) {
                setReferralOpen(true);
              } else {
                openLogin();
              }
              setMobileMenuOpen(false); 
            }} className="mt-2 flex min-h-12 w-full items-center rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 text-left text-sm font-medium text-emerald-200 transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300/45 hover:bg-emerald-500/15">
              {t('nav_mobile_invite')}
            </button>
            {!isLoading && !user && (
              <button onClick={openLogin} className="btn-primary-compact mt-2 flex min-h-12 w-full items-center rounded-xl px-4 text-left text-sm">
                {t('nav_login')}
              </button>
            )}
            <div className="mt-3 sm:hidden"><LanguageSwitcher /></div>
          </div>
        )}
      </header>

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        initialMode="login"
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
