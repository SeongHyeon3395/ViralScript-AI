import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 pt-28 pb-20 px-4 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-extrabold text-white">이용약관</h1>
            <p className="text-sm text-white/40">Terms of Service</p>
            <p className="text-xs text-white/20">제정 및 시행일: 2026년 7월 14일</p>
          </div>

          {/* Sections */}
          <Section num="1" title="목적" content="본 약관은 ViralScript AI(이하 플랫폼)가 제공하는 소셜 미디어 숏폼 영상 구조 분석, 메타데이터 처리 및 다국어 AI 대본 생성 서비스의 이용과 관련하여, 플랫폼과 회원 간의 권리, 의무, 책임 사항 및 서비스 이용 절차를 규정함을 목적으로 합니다." />

          <Section num="2" title="용어의 정의">
            <ListItem label="서비스" desc="이용자가 제출한 소셜 미디어(YouTube Shorts, TikTok, Instagram Reels 등) URL을 기반으로, 원본 영상을 저장하지 않고 대사 및 연출 구조만을 분석하여 AI로 2차 창작 마케팅 대본을 제공하는 웹 플랫폼입니다." />
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
            <HighlightItem label="차등 소진" desc="서비스 이용 시 제출된 영상의 재생 길이에 따라 크레딧이 차등 차감됩니다. (예: 15초 이하 1크레딧, 30초 이하 3크레딧, 60초 이하 5크레딧, 61초 초과 8크레딧)" />
            <HighlightItem label="광고 시청 보상" desc="이용자는 구글 애드센스(Google AdSense) 등 제3자 광고 플랫폼의 보상형 동영상 광고를 시청함으로써 무료 크레딧을 적립할 수 있습니다." />
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
            <p className="text-sm text-white/50">본 약관은 <strong className="text-violet-300">2026년 7월 14일</strong>부터 시행됩니다.</p>
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
    <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shrink-0">
          <span className="text-sm font-extrabold text-white">{num}</span>
        </div>
        <h3 className="text-lg font-bold text-white">{title}</h3>
      </div>
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