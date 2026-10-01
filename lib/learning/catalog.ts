export const LEARNING_LANGUAGES = ['en', 'ko', 'ja', 'zh'] as const;
export type LearningLanguage = (typeof LEARNING_LANGUAGES)[number];
export const LANGUAGE_NAMES: Record<LearningLanguage, string> = { en: 'English', ko: '한국어', ja: '日本語', zh: '中文' };
export function isLearningLanguage(value: string): value is LearningLanguage {
  return LEARNING_LANGUAGES.includes(value as LearningLanguage);
}

export const PUBLIC_UI = {
  en: { guides: 'Creator guides', about: 'About the service', generator: 'Create a video plan', home: 'Home', title: 'Plan a short video you can actually produce', description: 'Work through a clear brief, a complete storyboard, and an original adaptation. Read every guide without an account.', read: 'Read guide', back: 'All guides', related: 'Continue learning', contact: 'Contact', updated: 'Updated October 1, 2026', author: 'ViralScript AI · Practical planning guides', example: 'Educational example. This is a fictional project, not a measured campaign or a claim about performance.', footer: 'Read, plan, then review the result before filming or publishing.', terms: 'Terms of Service', privacy: 'Privacy Policy' },
  ko: { guides: '제작 가이드', about: '서비스 소개', generator: '영상 기획 만들기', home: '홈', title: '실제로 제작할 수 있는 숏폼을 기획하세요', description: '구체적인 제작 요청부터 완성된 장면 기획, 참고 영상을 활용한 독창적인 기획까지 살펴보세요. 모든 가이드는 로그인 없이 읽을 수 있습니다.', read: '가이드 읽기', back: '전체 가이드', related: '이어서 읽기', contact: '문의', updated: '2026년 10월 1일 업데이트', author: 'ViralScript AI · 실용적인 영상 기획 가이드', example: '학습용 예시입니다. 가상의 프로젝트이며 실제 캠페인이나 검증된 성과를 보여주는 사례가 아닙니다.', footer: '내용을 읽고 기획한 뒤 촬영·게시 전에 결과를 검토하세요.', terms: '이용약관', privacy: '개인정보처리방침' },
  ja: { guides: '制作ガイド', about: 'サービスについて', generator: '動画プランを作成', home: 'ホーム', title: '実際に制作できるショート動画を企画する', description: '具体的な依頼文、完成した絵コンテ、参考動画からのオリジナル企画を学べます。すべてのガイドをログインなしで読めます。', read: 'ガイドを読む', back: 'すべてのガイド', related: '続けて読む', contact: 'お問い合わせ', updated: '2026年10月1日更新', author: 'ViralScript AI · 実践的な動画企画ガイド', example: '学習用の架空の企画です。実際のキャンペーンや検証済みの成果を示す事例ではありません。', footer: '内容を読み、企画し、撮影・公開前に結果を確認してください。', terms: '利用規約', privacy: 'プライバシーポリシー' },
  zh: { guides: '创作指南', about: '关于服务', generator: '创建视频方案', home: '首页', title: '规划真正能够制作的短视频', description: '学习如何写清楚制作需求、完成分镜，以及将参考视频转化为原创方案。所有指南均可无需登录阅读。', read: '阅读指南', back: '全部指南', related: '继续阅读', contact: '联系我们', updated: '更新于2026年10月1日', author: 'ViralScript AI · 实用视频策划指南', example: '这是用于学习的虚构项目，并非真实广告活动，也不代表经过验证的效果。', footer: '阅读并完成策划后，请在拍摄或发布前审核结果。', terms: '服务条款', privacy: '隐私政策' },
} satisfies Record<LearningLanguage, Record<string, string>>;

export const GUIDE_CATALOG = [
  { slug: 'write-a-brief', titles: { en: 'Write a brief that leads to a usable video plan', ko: '바로 제작에 활용할 수 있는 요청 작성법', ja: '制作につながる依頼文の書き方', zh: '如何写出可以直接用于制作的需求' }, descriptions: { en: 'Turn an open-ended topic into a specific audience, promise, proof, and production constraint.', ko: '막연한 주제를 시청자, 전달할 약속, 보여줄 근거, 제작 조건으로 구체화합니다.', ja: '漠然としたテーマを、視聴者・約束・根拠・制作条件に整理します。', zh: '把模糊的主题转化为明确的观众、信息、证据和制作条件。' } },
  { slug: 'cafe-storyboard', titles: { en: 'A complete 20-second café storyboard', ko: '카페 숏폼 20초 기획안 전체 예시', ja: 'カフェの20秒動画を絵コンテから考える', zh: '一个完整的20秒咖啡店视频分镜' }, descriptions: { en: 'Five shots, a voiceover, captions, an AI prompt, and an explanation of each decision.', ko: '다섯 장면의 촬영 계획, 내레이션, 자막, AI 프롬프트와 선택 이유를 공개합니다.', ja: '5つのカット、ナレーション、字幕、AIプロンプトと判断理由を紹介します。', zh: '查看五个镜头、旁白、字幕、AI提示词以及每个设计决定的原因。' } },
  { slug: 'reference-to-original', titles: { en: 'Use a reference without recreating someone else’s video', ko: '참고 영상을 나만의 기획으로 바꾸는 방법', ja: '参考動画を自分のオリジナル企画に変える', zh: '把参考视频转化为自己的原创方案' }, descriptions: { en: 'Separate structure from expression, rewrite the promise, and adapt the copy for each language.', ko: '구조와 표현을 분리하고 전달 내용을 새로 설계한 뒤 언어별 문장을 다듬습니다.', ja: '構成と表現を分け、伝える内容を作り直し、言語ごとに文章を調整します。', zh: '区分结构与具体表达，重新设计信息，并逐一调整各语言文案。' } },
] as const;

export type GuideSlug = (typeof GUIDE_CATALOG)[number]['slug'];
export function getGuideSummary(slug: string) {
  return GUIDE_CATALOG.find((guide) => guide.slug === slug);
}
