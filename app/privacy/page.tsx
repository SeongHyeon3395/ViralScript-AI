'use client';

import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import { useLanguage } from '@/app/components/LanguageProvider';

export default function PrivacyPage() {
  const { language } = useLanguage();

  if (language !== 'ko') {
    return (
      <>
        <Navbar />
        <main className="flex-1 px-4 pb-20 pt-28 sm:px-6">
          <div className="mx-auto max-w-3xl space-y-6">
            {(language === 'ja' || language === 'zh') && <p className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-amber-100">A reviewed translation is not yet available for your selected language. The English policy is shown as the governing default.</p>}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-8 text-center">
              <h1 className="text-3xl font-extrabold text-white">Privacy Policy</h1>
              <p className="mt-3 text-xs text-white/30">Effective: September 15, 2026</p>
            </div>
            <div className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900/80 p-8 text-sm leading-7 text-white/60">
              <p>ViralScript AI processes only the information needed to operate accounts, generate video plans, provide support, prevent abuse, and process payments when payments are enabled.</p>
              <h2 className="font-bold text-violet-300">1. Information we process</h2>
              <p>Required account information includes your name, email address, country calling code, phone number, authentication identifier, account status, settings, credit balance, referral relationship, and service activity. Generation inputs, generated plans, reference URLs when supplied, support inquiries, suspension appeals, and transaction/order records are stored when you use those features. Technical logs may include IP address, device/browser data, cookies, and security events.</p>
              <h2 className="font-bold text-violet-300">2. Purposes</h2>
              <p>We use this information for authentication and account recovery, service delivery, generation charges based on the selected generation method, fraud and abuse prevention, customer support, payment verification, legal compliance, and service reliability.</p>
              <h2 className="font-bold text-violet-300">3. Service providers and international processing</h2>
              <p>Supabase provides authentication and database services; Vercel provides hosting; OpenRouter routes AI requests to the Google Gemini model; Apify and YouTube APIs may provide public video metadata. Stripe or Toss Payments processes verified payments only when payments are enabled. Ad rewards are currently disabled because server-side reward verification is unavailable.</p>
              <h2 className="font-bold text-violet-300">4. Retention and deletion</h2>
              <p>Account data is deleted when the account is deleted unless retention is required for payment, dispute, security, or legal obligations. A deletion restriction record may be retained for 30 days to enforce the re-registration waiting period. Payment and complaint records may be retained for the period required by applicable law.</p>
              <h2 className="font-bold text-violet-300">5. Your choices and security</h2>
              <p>You can update supported profile settings or delete your account from Settings. Data is protected using HTTPS, Supabase Row Level Security, server-only service credentials, restricted database functions, and verified payment webhooks. No online service can guarantee absolute security.</p>
              <h2 className="font-bold text-violet-300">6. Contact</h2>
              <p>Use Contact us in the site footer for privacy requests. Do not include passwords, payment keys, or API secrets in an inquiry.</p>
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
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="text-center space-y-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-8">
            <h1 className="text-3xl font-extrabold text-white">개인정보처리방침</h1>
            <p className="text-sm text-white/50">Privacy Policy</p>
            <div className="h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
            <p className="text-xs text-white/30">시행일자: 2026년 9월 15일</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 prose prose-invert prose-sm max-w-none [&_h3]:text-violet-300 [&_h3]:font-bold [&_h3]:text-base [&_strong]:text-white/80 [&_li]:text-white/60 [&_p]:text-white/60 [&_td]:text-white/50 [&_th]:text-white/70 [&_table]:border-slate-700 [&_th]:bg-slate-800/50 [&_td]:border-t [&_td]:border-slate-700/50 [&_th]:px-3 [&_th]:py-2 [&_td]:px-3 [&_td]:py-2">
          <p>ViralScript AI(이하 &quot;회사&quot; 또는 &quot;플랫폼&quot;)은 이용자의 개인정보를 중요시하며, 「개인정보 보호법」 및 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」 등 관련 법령을 철저히 준수합니다. 본 방침은 플랫폼이 어떠한 정보를 수집하고, 어떻게 이용하며, 안전하게 보호하는지 안내합니다.</p>

          <h3>1. 수집하는 개인정보의 항목 및 수집 방법</h3>
          <p>플랫폼은 최소한의 개인정보만을 수집하며, 민감한 금융 정보나 원본 미디어 파일을 수집하지 않습니다.</p>
          <p><strong>수집 항목:</strong></p>
          <ul>
            <li>계정 정보: 이름, 이메일 주소, 국가번호, 전화번호, 인증 식별자, 계정 상태 및 설정</li>
            <li>서비스 정보: 콘텐츠 주제, 사용자 요청, 제공한 참고 URL, 생성 결과와 생성 이력, 크레딧 잔액 및 사용 내역, 추천인 관계</li>
            <li>지원·거래 정보: 문의 및 정지 이의 신청 내용, 결제가 활성화된 경우 결제 주문·거래 상태</li>
            <li>자동 수집 정보: 접속 IP, 브라우저·기기 환경, 쿠키, 오류 및 보안 로그</li>
          </ul>
          <p><strong>수집 방법:</strong> Supabase Auth를 통한 회원가입 및 소셜 로그인, 웹사이트 이용 시 생성 정보 자동 수집</p>

          <h3>2. 개인정보의 수집 및 이용 목적</h3>
          <p>수집한 개인정보는 다음의 목적을 위해서만 활용됩니다.</p>
          <ol>
            <li><strong>회원 관리:</strong> 본인 확인, 불량 회원의 부정을 방지하기 위한 계정 식별, 가입 및 탈퇴 의사 확인</li>
            <li><strong>서비스 제공 및 과금 제어:</strong> 기본 주제 생성은 5크레딧, 참고 URL 또는 상세 설정 생성은 8크레딧 차감, 생성 이력 저장, 다국어 영상 대본·장면 설계 제공</li>
            <li><strong>서비스 분석 및 통계:</strong> 접속 빈도 파악, 기능 개선을 위한 통계적 데이터 분석</li>
          </ol>

          <h3>3. 개인정보의 보유 및 이용 기간</h3>
          <p>1. 이용자의 개인정보는 원칙적으로 <strong>회원 탈퇴 시 또는 개인정보 수집 및 이용 목적이 달성된 후 지체 없이 파기</strong>합니다.<br />
          2. 단, 관계 법령(전자상거래 등에서의 소비자보호에 관한 법률, 통신비밀보호법 등)의 규정에 의하여 보존할 필요가 있는 경우 법령에서 정한 일정한 기간 동안 보관합니다.</p>
          <ul>
            <li>웹사이트 방문기록(로그 기록, IP 등): 3개월 (통신비밀보호법)</li>
            <li>회원 탈퇴 후 동일 이메일 재가입 제한 기록: 30일</li>
            <li>소비자의 불만 또는 분쟁 처리에 관한 기록: 관련 법령이 정한 기간</li>
          </ul>

          <h3>4. 개인정보의 제3자 제공 및 위탁 처리 (클라우드 인프라)</h3>
          <p>플랫폼은 안정적인 24시간 글로벌 서비스 제공을 위해 아래와 같이 글로벌 검증 클라우드 인프라에 개인정보 처리를 위탁하고 있습니다.</p>
          <table className="min-w-full text-xs">
            <thead><tr><th>수탁 업체</th><th>위탁 업무 및 목적</th><th>이전 국가</th><th>보존 기간</th></tr></thead>
            <tbody>
              <tr><td>Supabase, Inc.</td><td>데이터베이스 호스팅, 사용자 인증 및 크레딧 관리</td><td>프로젝트에 설정된 리전</td><td>회원 탈퇴 또는 법정 보존기간까지</td></tr>
              <tr><td>Vercel, Inc.</td><td>웹 호스팅 및 네트워크 배포</td><td>미국 및 글로벌 Edge</td><td>회원 탈퇴 시까지</td></tr>
              <tr><td>OpenRouter / Google LLC (Gemini)</td><td>AI 요청 전달 및 대본 생성 추론</td><td>미국 등</td><td>각 제공업체의 적용 정책에 따름</td></tr>
              <tr><td>Apify Technologies</td><td>공개 URL 메타데이터 정제</td><td>체코 등</td><td>Apify의 적용 정책에 따름</td></tr>
              <tr><td>Stripe, Inc. / 토스페이먼츠</td><td>결제 활성화 시 주문 승인 및 결제 검증</td><td>미국 / 대한민국</td><td>관련 법령 및 각 처리방침에 따름</td></tr>
            </tbody>
          </table>
          <p className="mt-2"><strong>광고 보상 상태:</strong> 서버 측 보상 검증 기능이 준비되지 않아 현재 광고 시청에 따른 크레딧 지급은 비활성화되어 있습니다. 향후 광고 기능을 활성화하는 경우 관련 처리 내용을 사전에 갱신합니다.</p>

          <h3>5. 이용자의 권리와 그 행사 방법</h3>
          <p>1. 이용자는 언제든지 자신의 개인정보를 조회하거나 수정할 수 있으며, 회원 탈퇴를 통해 개인정보 이용 및 수집에 대한 동의를 철회할 수 있습니다.<br />
          2. 동의 철회 및 데이터 삭제 요청은 플랫폼 내 &apos;계정 설정&apos; 메뉴 또는 아래 문의 메일을 통해 서면으로 요청할 수 있으며, 플랫폼은 지체 없이 조치합니다.</p>

          <h3>6. 개인정보의 안전성 확보 조치</h3>
          <p>1. <strong>[보안 아키텍처]</strong> 모든 통신은 HTTPS SSL 암호화를 통하여 전송되며, Supabase의 RLS(Row Level Security) 보안 정책을 통해 타 이용자의 데이터 접근을 물리적으로 차단합니다.<br />
          2. <strong>[비밀 키 격리]</strong> 서비스 제어를 위한 관리자 마스터 키(Service Role Key) 및 외부 AI API 키는 브라우저에 노출되지 않도록 서버리스 환경 변수로 안전하게 격리 보관됩니다.</p>

          <h3>7. 개인정보 보호책임자 및 문의처</h3>
          <p>플랫폼은 이용자의 개인정보 관련 문의 및 불만 처리를 위해 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.</p>
          <p><strong>담당자명:</strong> Vibe Coder PJ<br />
          <strong>문의 이메일:</strong> help@viralscript.ai<br />
          <strong>응답 시간:</strong> 평일 10:00 ~ 18:00 (KST 기준)</p>

          <p><strong>부칙</strong><br />본 방침은 2026년 9월 15일부터 적용됩니다.</p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
