'use client';

import { useRef } from 'react';
import Navbar, { type NavbarRef } from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import TrendFeed from '@/app/components/TrendFeed';
import { t } from '@/app/components/LanguageSwitcher';

export default function TrendsPage() {
  const navbarRef = useRef<NavbarRef>(null);

  function handleTrendGenerate(url: string) {
    if (!navbarRef.current?.getUser()) {
      navbarRef.current?.openLoginModal();
      return;
    }
    window.location.href = `/generator?url=${encodeURIComponent(url)}`;
  }

  return (
    <>
      <Navbar ref={navbarRef} />
      <main className="flex-1 pt-20 sm:pt-24 pb-16 sm:pb-20 px-4 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-10 sm:mb-14 px-4">
            <span className="badge badge-cyan inline-flex items-center gap-1.5">📈 {t('trends_page_subtitle')}</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-3">{t('trends_page_title')}</h2>
            <p className="text-white/40 text-xs sm:text-sm mt-1">{t('trends_page_desc')}</p>
          </div>
          <TrendFeed onGenerate={handleTrendGenerate} />
        </div>
      </main>
      <Footer />
    </>
  );
}