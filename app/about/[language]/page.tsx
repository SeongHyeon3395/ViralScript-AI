import { notFound } from 'next/navigation';
import ContentShell from '@/app/learn/ContentShell';
import { isLearningLanguage, LEARNING_LANGUAGES, PUBLIC_UI } from '@/lib/learning/catalog';
import { publicContentMetadata } from '@/lib/learning/metadata';

const ABOUT = {
  en: { intro: 'ViralScript AI is an independent beta project for planning short-form videos. It helps turn a topic or reference into a concept, scene plan, narration, captions, and text prompts for selected production tools.', purpose: 'What the service provides', details: 'The output is a production guide, not a finished video. You choose whether to film, edit your own footage, or take prompts to a separate AI video tool. An account is needed to create and save personal plans; the creator guides and examples are public.', limits: 'What to check yourself', limitations: 'AI outputs can contain mistakes. Reference information can be incomplete or unavailable; a reference URL does not guarantee that every frame was analyzed. Check factual claims, permissions, continuity, and language before publishing. The service does not guarantee views, sales, or viral performance.', editorial: 'About the learning material', content: 'The guides explain planning decisions using educational examples written for this site. Fictional projects are labeled. They are not presented as customer campaigns, measured experiments, or testimonials. You can use the structure to plan your own work and provide your own facts.', support: 'Operator and support', contact: 'This beta is operated as an independent project under the ViralScript AI name. For questions, corrections to a guide, account help, or additional access, contact the operator at the email below.' },
  ko: { intro: 'ViralScript AI는 숏폼 영상 기획을 돕는 독립 베타 프로젝트입니다. 주제나 참고 자료를 콘셉트, 장면 기획, 내레이션, 자막, 선택한 제작 도구용 텍스트 프롬프트로 구체화합니다.', purpose: '제공하는 기능', details: '결과물은 완성된 영상이 아닌 제작 가이드입니다. 직접 촬영할지, 보유한 영상을 편집할지, 별도의 AI 영상 도구에 프롬프트를 사용할지 선택합니다. 개인 기획을 생성·저장하려면 계정이 필요하지만 제작 가이드와 예시는 누구나 읽을 수 있습니다.', limits: '직접 확인해야 할 사항', limitations: 'AI 결과에는 오류가 있을 수 있습니다. 참고 정보는 불완전하거나 가져오지 못할 수 있으며 URL을 넣는다고 모든 영상 프레임의 분석이 보장되지는 않습니다. 사실 주장, 자료 사용 권한, 장면 연속성, 문장을 게시 전에 확인하세요. 조회수·매출·바이럴 성과를 보장하지 않습니다.', editorial: '공개 가이드의 성격', content: '가이드는 이 사이트를 위해 작성한 설명용 예시로 기획 결정을 풀이합니다. 가상의 프로젝트임을 표시하며 실제 고객 캠페인·실측 실험·후기로 제시하지 않습니다. 자신의 작업에 구조를 활용하고 실제 정보를 제공해 주세요.', support: '운영 및 문의', contact: '이 베타는 ViralScript AI라는 이름으로 운영하는 독립 프로젝트입니다. 서비스 문의, 가이드 정정, 계정 지원, 추가 이용은 아래 운영자 이메일로 연락해 주세요.' },
  ja: { intro: 'ViralScript AIはショート動画の企画を支援する独立したベータプロジェクトです。テーマや参考資料から、コンセプト、カット、ナレーション、字幕、選択した制作ツール用のテキストプロンプトを作ります。', purpose: '提供する機能', details: '結果は完成動画ではなく制作ガイドです。撮影、自分の素材の編集、別のAI動画ツールでのプロンプト利用を選びます。個人の企画の作成と保存にはアカウントが必要ですが、ガイドと例は公開されています。', limits: '自分で確認すること', limitations: 'AIの結果には誤りがあり得ます。参考情報が不完全・取得不可の場合があり、URLの入力が全フレームの分析を保証するわけではありません。公開前に事実、素材の権限、連続性、言語を確認してください。再生数、売上、拡散を保証しません。', editorial: '学習資料について', content: 'このサイトのために書いた説明用の例で、企画の判断を解説します。架空の企画は明記し、顧客のキャンペーン、実測実験、体験談として提示しません。構成を自分の仕事に活用し、自分の事実を入力してください。', support: '運営とお問い合わせ', contact: 'ViralScript AIの名称で運営する独立したベータプロジェクトです。質問、ガイドの訂正、アカウントの相談、追加利用は以下の運営者メールへご連絡ください。' },
  zh: { intro: 'ViralScript AI是一个帮助策划短视频的独立测试项目，将主题或参考资料整理为创意、分镜、旁白、字幕和所选制作工具的文字提示词。', purpose: '服务提供什么', details: '结果是制作指南，而非成片。您可选择实拍、剪辑自己的素材，或在独立的AI视频工具中使用提示词。创建和保存个人方案需要账户，但创作指南和示例完全公开。', limits: '需要自行检查的内容', limitations: 'AI结果可能有错误。参考信息可能不完整或无法获取，输入网址不保证逐帧分析视频。发布前请核实事实、素材权限、连续性和语言。服务不保证播放量、销量或传播效果。', editorial: '关于学习资料', content: '指南使用为本站撰写的教学示例解释策划决定，虚构项目均有标注，不将其描述为真实客户活动、实测实验或评价。您可参考结构进行自己的工作，并提供真实信息。', support: '运营与联系', contact: '本项目以ViralScript AI名称独立运营。有关服务问题、指南更正、账户支持或额外访问需求，请联系下方运营者邮箱。' },
};

type Props = { params: Promise<{ language: string }> };
export const dynamicParams = false;
export function generateStaticParams() { return LEARNING_LANGUAGES.map((language) => ({ language })); }
export async function generateMetadata({ params }: Props) {
  const { language } = await params;
  if (!isLearningLanguage(language)) notFound();
  return publicContentMetadata(language, PUBLIC_UI[language].about, ABOUT[language].intro, 'about');
}
export default async function AboutPage({ params }: Props) {
  const { language } = await params;
  if (!isLearningLanguage(language)) notFound();
  const copy = ABOUT[language];
  return <ContentShell language={language} section="about"><main className="mx-auto max-w-3xl px-4 pb-8 pt-5 sm:px-6">
    <h1 className="text-3xl font-bold">{PUBLIC_UI[language].about}</h1><p className="mt-6 text-base leading-8 text-white/75">{copy.intro}</p>
    {[[copy.purpose, copy.details], [copy.limits, copy.limitations], [copy.editorial, copy.content], [copy.support, copy.contact]].map(([title, body]) => <section key={title} className="mt-9"><h2 className="text-xl font-semibold">{title}</h2><p className="mt-4 text-base leading-8 text-white/65">{body}</p></section>)}
    <a href="mailto:psunghyi@gmail.com" className="mt-5 inline-flex min-h-11 items-center break-all text-violet-200 underline underline-offset-4">psunghyi@gmail.com</a>
  </main></ContentShell>;
}
