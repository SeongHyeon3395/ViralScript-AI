'use client';

import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import TrendFeed from '@/app/components/TrendFeed';

export default function TrendsPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 pt-24 pb-20 px-4 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <span className="badge badge-cyan inline-flex items-center gap-1.5">📈 최신 트렌드</span>
            <h2 className="text-3xl font-bold text-white mt-3">실시간 글로벌 트렌드</h2>
            <p className="text-white/40 text-sm mt-1">각 플랫폼의 인기 숏폼을 확인하고 분석해보세요</p>
          </div>
          <TrendFeed />
        </div>
      </main>
      <Footer />
    </>
  );
}