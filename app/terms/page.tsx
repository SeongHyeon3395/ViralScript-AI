'use client';

import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import { useLanguage } from '@/app/components/LanguageProvider';

export default function TermsPage() {
  const { language } = useLanguage();

  if (language !== 'ko') {
    return (
      <>
        <Navbar />
        <main className="flex-1 px-4 pb-20 pt-28 sm:px-6">
          <div className="mx-auto max-w-3xl space-y-6">
            {(language === 'ja' || language === 'zh') && <p className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-amber-100">A reviewed translation is not yet available for your selected language. The English Terms are shown as the governing default.</p>}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-8 text-center">
              <h1 className="text-3xl font-extrabold text-white">Terms of Service</h1>
              <p className="mt-3 text-xs text-white/30">Effective: September 15, 2026</p>
            </div>
            <div className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900/80 p-8 text-sm leading-7 text-white/60">
              <h2 className="font-bold text-violet-300">1. Service</h2>
              <p>ViralScript AI creates short-form video scripts, scene plans, prompts, and editing guidance from a topic or an optional supported public video URL. It does not promise virality, commercial results, or error-free output.</p>
              <h2 className="font-bold text-violet-300">2. Your responsibilities</h2>
              <p>You must have the right to submit any URL or material you provide. You are responsible for reviewing generated output and for complying with copyright, advertising, platform, and other applicable rules before publishing it.</p>
              <h2 className="font-bold text-violet-300">3. Credits</h2>
              <p>Each completed generation costs eight credits, regardless of video length, cache use, or whether a reference URL is supplied. Failed AI generation or a failed database transaction must not consume credits. Promotional credit terms may change with notice.</p>
              <h2 className="font-bold text-violet-300">4. Payments and ad rewards</h2>
              <p>Payments are available only when the payment feature and verified provider configuration are enabled. Ad rewards are currently unavailable because server-side reward verification is not configured; browser events alone never qualify for credit.</p>
              <h2 className="font-bold text-violet-300">5. Account controls</h2>
              <p>We may suspend accounts for fraud, abuse, security threats, or material violations. Suspended users may submit an appeal through the provided contact form. Account deletion is permanent and the same email may be restricted from re-registration for 30 days.</p>
              <h2 className="font-bold text-violet-300">6. Availability and liability</h2>
              <p>Third-party services such as Supabase, Vercel, Google Gemini, Apify, Stripe, and Toss may affect availability. To the extent permitted by law, the service is provided without guarantees of uninterrupted availability or a particular business result.</p>
              <h2 className="font-bold text-violet-300">7. Contact and governing law</h2>
              <p>Use Contact us in the footer for support. These Terms are governed by the laws of the Republic of Korea, subject to mandatory consumer protection law.</p>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 pt-28 pb-20 px-4 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-8">
          {/* Header */}
          <div className="text-center space-y-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-8">
            <h1 className="text-3xl font-extrabold text-white">이용약관</h1>
            <p className="text-sm text-white/50">Terms of Service</p>
            <div className="h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
            <p className="text-xs text-white/30">개정 및 시행일: 2026년 9월 15일</p>
          </div>

          {/* Sections */}
          <Section num="1" title="목적" content="본 약관은 ViralScript AI(이하 플랫폼)가 제공하는 소셜 미디어 숏폼 영상 구조 분석, 메타데이터 처리 및 다국어 AI 대본 생성 서비스의 이용과 관련하여, 플랫폼과 회원 간의 권리, 의무, 책임 사항 및 서비스 이용 절차를 규정함을 목적으로 합니다." />

          <Section num="2" title="용어의 정의">
            <ListItem label="서비스" desc="이용자가 입력한 콘텐츠 주제 또는 선택적으로 제출한 YouTube Shorts·TikTok URL을 바탕으로 AI 영상 대본, 장면 설계, 프롬프트와 편집 가이드를 제공하는 웹 플랫폼입니다." />
            <ListItem label="크레딧" desc="플랫폼 내에서 AI 분석 및 대본 생성 기능을 이용하기 위해 소모되는 내부 재화입니다. 보상형 광고 시청 또는 프로모션을 통해 획득할 수 있습니다." />
            <ListItem label="미들웨어" desc="URL의 정상 여부를 확인하고 텍스트 메타데이터를 정제하기 위해 연동된 제3자 스크래핑 및 데이터 분석 API입니다." />
          </Section>

          <Section num="3" title="무저장 원칙 및 서비스의 본질">
            <HighlightItem label="원본 영상 미보관" desc="플랫폼은 이용자가 제출한 어떠한 영상 원본(MP4 등 미디어 바이너리 파일) 및 오디오 음원 파일도 서버 및 데이터베이스에 다운로드, 저장, 전송, 복제, 재배포하지 않는 '무저장(Zero-Storage) 원칙'을 준수합니다." />
            <p className="text-sm text-white/60 leading-relaxed mt-3">
              플랫폼은 오직 공개된 URL의 자막 텍스트와 시간 배분 구조(Timeline Pattern)라는 저작권법상 보호되지 않는 &lsquo;아이디어 및 기법&rsquo; 영역만을 임시 파싱하여 분석합니다.
            </p>
          </Section>

          <Section num="4" title="이용자의 의무 및 적법성 보증">
            <HighlightItem label="권리 보증" desc="이용자는 플랫폼에 분석을 요청하는 모든 URL 및 소스 데이터에 대해 적법한 접근 및 이용 권한을 보유하고 있음을 보증합니다." />
            <HighlightItem label="책임의 귀속" desc="이용자가 타인의 저작물, 비공개 영상, 또는 각 플랫폼(YouTube, TikTok, Meta 등)의 이용약관을 위반한 URL을 제출하여 발생하는 모든 저작권 침해, 계정 차단, 법적 분쟁에 대한 민·형사상 책임은 전적으로 이용자 본인에게 있습니다." />
            <HighlightItem label="2차 창작물의 활용" desc="AI가 생성한 마케팅 대본 및 콘티는 독립적인 2차 창작 가이드입니다. 이를 상업적으로 활용하여 발생한 결과에 대한 최종 책임은 이용자에게 있습니다." />
          </Section>

          <Section num="5" title="크레딧 정책 및 보상형 광고">
            <HighlightItem label="일괄 소진" desc="영상 길이, 캐시 사용 여부, 참고 URL 제공 여부와 관계없이 정상 완료된 생성 1회당 8크레딧이 차감됩니다. AI 생성 또는 데이터베이스 저장이 실패하면 크레딧을 차감하지 않습니다." />
            <HighlightItem label="광고 보상 일시 중단" desc="현재 광고 제공업체의 서버 측 보상 검증 기능이 준비되지 않아 광고 시청에 따른 크레딧 지급은 비활성화되어 있습니다. 브라우저 이벤트만으로는 보상을 지급하지 않습니다." />
            <HighlightItem label="어뷰징 금지" desc="광고 차단 프로그램(AdBlock) 사용, 비정상적인 스크립트·매크로·결함 유도 등을 통해 광고 시청 없이 크레딧을 부당 취득한 경우, 플랫폼은 사전 통보 없이 해당 계정을 영구 정지하고 보유 크레딧을 소멸시킬 수 있습니다." />
          </Section>

          <Section num="6" title="기능의 제어 및 서비스 변경" content="플랫폼은 운영상·기술상의 필요에 따라 제공하는 서비스의 기능(예: 유료 구독 결제 모델 도입, 일일 무료 제공량 변경 등)을 일시적 또는 영구적으로 수정, 봉인(Feature Gating) 또는 활성화할 수 있습니다. 무료로 제공되는 서비스 또는 프로모션 크레딧에 대해서는 관련 법령에 특별한 규정이 없는 한 별도의 보상을 하지 않습니다." />

          <Section num="7" title="면책 조항">
            <p className="text-sm text-white/60 leading-relaxed">
              1. 플랫폼은 천재지변, DDos 공격, 제3자 미들웨어(Apify, Google AI Studio, Vercel, Supabase 등)의 장애 또는 통신망 중단으로 서비스를 제공할 수 없는 경우 서비스 제공에 관한 책임이 면제됩니다.
            </p>
            <p className="text-sm text-white/60 leading-relaxed mt-3">
              2. 플랫폼은 AI(Gemini 등)가 생성한 결과물의 정확성, 상업적 성공, 바이럴 도달률, 무오류성을 보장하지 않으며, 이용자가 결과물을 신뢰하여 입은 손해에 대해 책임을 지지 않습니다.
            </p>
          </Section>

          <Section num="8" title="관할 법원" content="본 약관과 관련하여 플랫폼과 이용자 간에 발생한 분쟁에 대해서는 대한민국 법을 준거법으로 하며, 민사소송법상의 관할 법원을 제1심 전속 관할 법원으로 합니다." />

          <div className="rounded-2xl p-6 text-center" style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)' }}>
            <p className="text-sm text-white/50">본 약관은 <strong className="text-violet-300">2026년 9월 15일</strong>부터 시행됩니다.</p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

// ─── 헬퍼 컴포넌트 ──────────────────────────────────────────────

function Section({ num, title, content, children }: { num: string; title: string; content?: string; children?: React.ReactNode }) {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shrink-0">
          <span className="text-sm font-extrabold text-white">{num}</span>
        </div>
        <h3 className="text-lg font-bold text-white">{title}</h3>
      </div>
      <div className="h-px bg-slate-700/50" />
      {content && <p className="text-sm text-white/60 leading-7">{content}</p>}
      {children && <div className="space-y-4">{children}</div>}
    </div>
  );
}

function ListItem({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 pl-4 border-l-2 border-violet-600/30">
      <div>
        <p className="text-sm font-semibold text-violet-300">{label}</p>
        <p className="text-sm text-white/50 leading-relaxed mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

function HighlightItem({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
      <p className="text-sm font-bold text-amber-300 mb-1">[{label}]</p>
      <p className="text-sm text-white/50 leading-relaxed">{desc}</p>
    </div>
  );
}
