'use client';

import Footer from '@/app/components/Footer';
import { useLanguage } from '@/app/components/LanguageProvider';
import Navbar from '@/app/components/Navbar';

const EFFECTIVE_DATE = '2026년 9월 22일';
const CONTACT_EMAIL = 'psunghyi@gmail.com';

function LegalShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <><Navbar /><main className="flex-1 px-4 pb-16 pt-28 sm:px-6"><article className="mx-auto max-w-3xl"><header className="border-b border-white/10 pb-6"><h1 className="text-3xl font-bold tracking-tight text-white">{title}</h1><p className="mt-2 text-sm text-white/45">{subtitle}</p></header><div className="mt-8 space-y-8 text-sm leading-7 text-white/65 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-white [&_li]:my-1 [&_strong]:font-semibold [&_strong]:text-white/85">{children}</div></article></main><Footer /></>;
}

function KoreanTerms() {
  return <LegalShell title="이용약관" subtitle={`시행일: ${EFFECTIVE_DATE} · ViralScriptAI`}>
    <section><h2>1. 서비스</h2><p>ViralScriptAI는 이용자가 입력한 주제 또는 선택적으로 제공한 공개 참고 URL을 바탕으로 숏폼 영상 기획, 대본, 장면 구성, 제작 프롬프트 및 편집 가이드를 제공하는 서비스입니다. 생성 결과는 참고용 제안이며, 바이럴 성과·매출·게시 승인 또는 무오류를 보장하지 않습니다.</p></section>
    <section><h2>2. 계정</h2><p>이용자는 정확한 정보를 제공하고 계정 접근 수단을 안전하게 관리해야 합니다. Google 로그인은 Google의 인증 절차를 따르며, 첫 로그인 시 서비스 이용에 필요한 추가 프로필 정보를 요청할 수 있습니다.</p></section>
    <section><h2>3. 이용자의 책임</h2><p>이용자는 제출하는 URL·텍스트·자료를 이용할 적법한 권한이 있어야 하며, 생성 결과를 게시하거나 상업적으로 사용하기 전에 저작권, 초상권, 광고 표시, 플랫폼 정책 및 관련 법령을 직접 확인해야 합니다. 타인의 권리를 침해하거나 서비스 보안을 해치는 방식으로 서비스를 이용해서는 안 됩니다.</p></section>
    <section><h2>4. AI 생성 결과</h2><p>AI 결과는 자동 생성되며 정확성, 완전성 또는 특정 목적 적합성이 보장되지 않을 수 있습니다. 이용자는 결과를 검토·수정한 뒤 자신의 책임으로 사용해야 합니다. 서비스는 입력한 영상 원본 파일을 업로드받거나 보관하지 않습니다.</p></section>
    <section><h2>5. 크레딧과 결제</h2><p>생성에 필요한 크레딧과 차감 기준은 실행 전 서비스 화면에 표시됩니다. 기본 주제만으로 만드는 생성은 정상 완료 시 5크레딧이 차감됩니다. 참고 URL을 제공하거나 상세 설정을 적용한 생성은 정상 완료 시 8크레딧이 차감됩니다. AI 생성 또는 저장 거래가 실패한 경우 해당 요청에 대해 크레딧을 차감하지 않습니다.</p><p>결제는 결제 기능과 결제 제공자 설정이 모두 활성화된 경우에만 이용할 수 있습니다. 프로모션·추천·일일 보상 등 무상 크레딧의 조건과 기간은 서비스 화면 또는 별도 안내에 따릅니다.</p></section>
    <section><h2>6. 광고와 부정 이용</h2><p>일반 표시 광고는 서비스에 표시될 수 있으나, 광고를 보았다는 브라우저 이벤트만으로 크레딧이 지급되지는 않습니다. 자동화 도구, 취약점 악용, 허위 계정, 비정상 요청 등 부정 이용이 확인되면 서비스는 조사 후 이용을 제한하거나 계정을 정지할 수 있습니다.</p></section>
    <section><h2>7. 서비스 변경·중단</h2><p>서비스는 운영·보안·법률 또는 기술적 필요에 따라 기능, 가격, 크레딧 정책을 변경하거나 일시 중단할 수 있습니다. 이용자에게 중요한 변경은 합리적인 기간 전에 서비스 내 공지 또는 등록 이메일로 알립니다.</p></section>
    <section><h2>8. 이용 제한 및 탈퇴</h2><p>이용자가 본 약관이나 법령을 중대하게 위반하거나 보안 위험을 일으키는 경우 이용을 제한할 수 있습니다. 계정 정지에 이의가 있는 경우 문의처를 통해 이의 사유를 제출할 수 있습니다. 탈퇴는 설정 메뉴에서 할 수 있으며, 삭제 및 보관 기준은 개인정보처리방침을 따릅니다.</p></section>
    <section><h2>9. 책임 제한과 분쟁</h2><p>서비스는 법이 허용하는 범위에서 제3자 인프라 장애, 통신 장애 또는 이용자의 귀책 사유로 인한 손해에 대해 책임을 제한합니다. 다만 소비자 관련 법령에서 제한할 수 없는 책임에는 적용하지 않습니다. 본 약관은 대한민국 법령을 따르며, 분쟁은 관련 법령이 정한 법원에 제기할 수 있습니다.</p></section>
    <section><h2>10. 문의 및 약관 변경</h2><p>서비스 이용 문의는 <a className="text-violet-300 underline underline-offset-4" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>로 보내 주세요. 약관을 변경하면 이 페이지에 시행일과 변경 내용을 게시합니다.</p></section>
  </LegalShell>;
}

function EnglishTerms() {
  return <LegalShell title="Terms of Service" subtitle="Effective September 22, 2026 · ViralScriptAI"><section><h2>1. Service</h2><p>ViralScriptAI provides short-form video plans, scripts, scene outlines, prompts, and editing guidance from a topic or an optional public reference URL. Output is a suggestion only and does not guarantee virality, business results, publishing approval, or error-free content.</p></section><section><h2>2. Accounts and acceptable use</h2><p>Keep your account information accurate and secure. You must have the right to submit the material you provide, and you must review generated output for copyright, publicity, advertising, platform, and other applicable requirements before using it.</p></section><section><h2>3. Credits and payments</h2><p>Credit cost is shown before generation. A completed topic-only generation costs five credits. A completed generation with a reference URL or advanced production settings costs eight credits. Failed AI generation or a failed database transaction does not consume credits. Payments are available only when payment features and provider configuration are enabled. Promotional-credit conditions are shown in the applicable offer.</p></section><section><h2>4. Ads, changes, and account controls</h2><p>Display advertisements may appear, but a browser display-ad event alone does not earn credits. We may change or suspend features for operational, security, legal, or technical reasons and will provide notice of material changes. We may restrict accounts for fraud, abuse, security threats, or material violations. You may submit an appeal through support.</p></section><section><h2>5. Liability and contact</h2><p>To the extent permitted by law, we do not guarantee uninterrupted availability or a particular outcome from AI output. Mandatory consumer protections remain unaffected. These Terms are governed by the laws of the Republic of Korea. Contact <a className="text-violet-300 underline underline-offset-4" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with service questions.</p></section></LegalShell>;
}

export default function TermsPage() { const { language } = useLanguage(); return language === 'ko' ? <KoreanTerms /> : <EnglishTerms />; }
