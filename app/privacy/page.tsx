import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 pt-24 pb-20 px-4 sm:px-6">
        <div className="mx-auto max-w-3xl prose prose-invert prose-sm">
          <h1>개인정보처리방침 (Privacy Policy)</h1>
          <p><strong>시행일자: 2026년 7월 14일</strong></p>
          <p>ViralScript AI(이하 "회사" 또는 "플랫폼")은 이용자의 개인정보를 중요시하며, 「개인정보 보호법」 및 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」 등 관련 법령을 철저히 준수합니다. 본 방침은 플랫폼이 어떠한 정보를 수집하고, 어떻게 이용하며, 안전하게 보호하는지 안내합니다.</p>

          <h3>1. 수집하는 개인정보의 항목 및 수집 방법</h3>
          <p>플랫폼은 최소한의 개인정보만을 수집하며, 민감한 금융 정보나 원본 미디어 파일을 수집하지 않습니다.</p>
          <p><strong>수집 항목:</strong></p>
          <ul>
            <li>필수 항목: 이메일 주소, 소셜 로그인 식별자(OAuth User ID), 서비스 이용 내역, 크레딧 잔여량, 접속 IP, 브라우저 환경 정보, 쿠키(Cookie)</li>
            <li>선택 항목: AI 대본 생성 이력(텍스트 메타데이터)</li>
          </ul>
          <p><strong>수집 방법:</strong> Supabase Auth를 통한 회원가입 및 소셜 로그인, 웹사이트 이용 시 생성 정보 자동 수집</p>

          <h3>2. 개인정보의 수집 및 이용 목적</h3>
          <p>수집한 개인정보는 다음의 목적을 위해서만 활용됩니다.</p>
          <ol>
            <li><strong>회원 관리:</strong> 본인 확인, 불량 회원의 부정을 방지하기 위한 계정 식별, 가입 및 탈퇴 의사 확인</li>
            <li><strong>서비스 제공 및 과금 제어:</strong> 다이나믹 크레딧 차감, 광고 보상 시청 이력 트래킹, 3개국어 바이럴 대본 생성 API 제공</li>
            <li><strong>서비스 분석 및 통계:</strong> 접속 빈도 파악, 기능 개선을 위한 통계적 데이터 분석</li>
          </ol>

          <h3>3. 개인정보의 보유 및 이용 기간</h3>
          <p>1. 이용자의 개인정보는 원칙적으로 <strong>회원 탈퇴 시 또는 개인정보 수집 및 이용 목적이 달성된 후 지체 없이 파기</strong>합니다.<br />
          2. 단, 관계 법령(전자상거래 등에서의 소비자보호에 관한 법률, 통신비밀보호법 등)의 규정에 의하여 보존할 필요가 있는 경우 법령에서 정한 일정한 기간 동안 보관합니다.</p>
          <ul>
            <li>웹사이트 방문기록(로그 기록, IP 등): 3개월 (통신비밀보호법)</li>
            <li>소비자의 불만 또는 분쟁 처리에 관한 기록: 3년 (전자상거래법)</li>
          </ul>

          <h3>4. 개인정보의 제3자 제공 및 위탁 처리 (클라우드 인프라)</h3>
          <p>플랫폼은 안정적인 24시간 글로벌 서비스 제공을 위해 아래와 같이 글로벌 검증 클라우드 인프라에 개인정보 처리를 위탁하고 있습니다.</p>
          <table className="min-w-full text-xs">
            <thead><tr><th>수탁 업체</th><th>위탁 업무 및 목적</th><th>이전 국가</th><th>보존 기간</th></tr></thead>
            <tbody>
              <tr><td>Supabase, Inc.</td><td>데이터베이스 호스팅, 유저 인증 및 크레딧 관리</td><td>일본 (Tokyo)</td><td>회원 탈퇴 시까지</td></tr>
              <tr><td>Vercel, Inc.</td><td>웹 호스팅 및 네트워크 배포</td><td>미국 및 글로벌 Edge</td><td>회원 탈퇴 시까지</td></tr>
              <tr><td>Google LLC (AI Studio)</td><td>AI 대본 생성 추론</td><td>미국</td><td>즉시 파기</td></tr>
              <tr><td>Google LLC (AdSense)</td><td>웹 보상형 광고 송출</td><td>글로벌</td><td>구글 정책에 따름</td></tr>
              <tr><td>Apify Technologies</td><td>URL 메타데이터 정제</td><td>체코</td><td>즉시 파기</td></tr>
            </tbody>
          </table>
          <p className="mt-2"><strong>⚠️ 고지 사항:</strong> 본 플랫폼은 구글 애드센스(Google AdSense)를 통한 광고를 게재합니다. 구글 및 제3자 벤더는 쿠키(Cookie)를 사용하여 이용자가 본 플랫폼 및 다른 웹사이트를 방문한 이력을 기반으로 맞춤형 광고를 제공할 수 있습니다. 이용자는 <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">구글 광고 설정</a>에서 개인 맞춤 광고를 언제든지 선택 해제할 수 있습니다.</p>

          <h3>5. 이용자의 권리와 그 행사 방법</h3>
          <p>1. 이용자는 언제든지 자신의 개인정보를 조회하거나 수정할 수 있으며, 회원 탈퇴를 통해 개인정보 이용 및 수집에 대한 동의를 철회할 수 있습니다.<br />
          2. 동의 철회 및 데이터 삭제 요청은 플랫폼 내 '계정 설정' 메뉴 또는 아래 문의 메일을 통해 서면으로 요청할 수 있으며, 플랫폼은 지체 없이 조치합니다.</p>

          <h3>6. 개인정보의 안전성 확보 조치</h3>
          <p>1. <strong>[보안 아키텍처]</strong> 모든 통신은 HTTPS SSL 암호화를 통하여 전송되며, Supabase의 RLS(Row Level Security) 보안 정책을 통해 타 이용자의 데이터 접근을 물리적으로 차단합니다.<br />
          2. <strong>[비밀 키 격리]</strong> 서비스 제어를 위한 관리자 마스터 키(Service Role Key) 및 외부 AI API 키는 브라우저에 노출되지 않도록 서버리스 환경 변수로 안전하게 격리 보관됩니다.</p>

          <h3>7. 개인정보 보호책임자 및 문의처</h3>
          <p>플랫폼은 이용자의 개인정보 관련 문의 및 불만 처리를 위해 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.</p>
          <p><strong>담당자명:</strong> Vibe Coder PJ<br />
          <strong>문의 이메일:</strong> help@viralscript.ai<br />
          <strong>응답 시간:</strong> 평일 10:00 ~ 18:00 (KST 기준)</p>

          <p><strong>부칙</strong><br />본 방침은 2026년 7월 14일부터 적용됩니다.</p>
        </div>
      </main>
      <Footer />
    </>
  );
}