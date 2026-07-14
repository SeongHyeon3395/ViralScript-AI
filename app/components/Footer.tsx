import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-white/5 py-10 px-4 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm font-semibold text-white/40">ViralScript AI</span>
          <p className="text-xs text-white/25 text-center max-w-lg">
            본 플랫폼은 사용자가 제출한 URL의 원본을 저장·전송·재배포하지 않으며, AI 결과물은 마케팅 분석을 위한 2차 창작 가이드입니다.
          </p>
          <div className="flex items-center gap-4 text-xs text-white/30">
            <Link href="/terms" className="hover:text-white/60 transition-colors">이용약관</Link>
            <Link href="/privacy" className="hover:text-white/60 transition-colors">개인정보처리방침</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}