'use client';

import { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';

type Lang = 'ko' | 'en' | 'zh' | 'ja';

const LANGS: { code: Lang; label: string; flag: string }[] = [
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
];

// 간단한 번역 테이블
export const T: Record<Lang, Record<string, string>> = {
  ko: {
    hero_tag: 'AI 기반 숏폼 마케팅 분석',
    hero_title: '숏폼 URL 하나로',
    hero_title2: '3개국 바이럴 대본 생성',
    hero_desc: 'AI가 영상 구조를 분석하고 귀사의 상품에 맞춘 한국·미국·일본 현지화 대본을 1분 만에 완성합니다.',
    cta_start: '지금 무료로 시작',
    cta_credits: '크레딧 보기',
    sample: '원클릭 샘플:',
    stats_gen: '평균 생성 시간',
    stats_locale: '동시 현지화',
    stats_uptime: '업타임 SLA',
    stats_scripts: '생성된 대본',
    features_title: '왜 ViralScript AI인가요?',
    features_desc: '단순한 번역이 아닙니다. 각국의 트렌드와 감성을 이해한 AI가 진짜 바이럴을 만듭니다.',
    pricing_title: '무료로 시작하세요',
    pricing_desc: '광고 시청 · 출석 룰렛 · 친구 초대로 무료 크레딧을 충전하세요',
    login: '로그인',
    signup: '회원가입',
    generator: '대본 생성기',
    credits: '크레딧',
    trends: '최신 트렌드',
    invite: '초대하기',
    nav_features: '기능 소개',
    nav_pricing: '크레딧',
    nav_trends: '트렌드',
    nav_generator: '대본 생성기',
  },
  en: {
    hero_tag: 'AI-Powered Short-Form Marketing Analysis',
    hero_title: 'From One Short-Form URL,',
    hero_title2: 'Generate Viral Scripts in 3 Languages',
    hero_desc: 'AI analyzes video structure and creates localized scripts for US, Korea, and Japan markets in under 1 minute.',
    cta_start: 'Start Free',
    cta_credits: 'View Credits',
    sample: 'Try a Sample:',
    stats_gen: 'Avg Generation Time',
    stats_locale: 'Simultaneous Locales',
    stats_uptime: 'Uptime SLA',
    stats_scripts: 'Scripts Generated',
    features_title: 'Why ViralScript AI?',
    features_desc: 'More than translation. Our AI understands cultural context and viral mechanics across borders.',
    pricing_title: 'Start For Free',
    pricing_desc: 'Earn free credits via ads, daily roulette, and referrals.',
    login: 'Login',
    signup: 'Sign Up',
    generator: 'Script Generator',
    credits: 'Credits',
    trends: 'Latest Trends',
    invite: 'Invite',
    nav_features: 'Features',
    nav_pricing: 'Credits',
    nav_trends: 'Trends',
    nav_generator: 'Generator',
  },
  zh: {
    hero_tag: 'AI驱动的短视频营销分析',
    hero_title: '只需一个短视频链接，',
    hero_title2: '生成三种语言的爆款脚本',
    hero_desc: 'AI分析视频结构，为您量身定制面向美国、韩国和日本市场的本土化脚本，一分钟完成。',
    cta_start: '免费开始',
    cta_credits: '查看积分',
    sample: '一键试用：',
    stats_gen: '平均生成时间',
    stats_locale: '同步本地化',
    stats_uptime: '运行时间SLA',
    stats_scripts: '已生成脚本',
    features_title: '为什么选择ViralScript AI？',
    features_desc: '不止是翻译。我们的AI理解各地文化背景与病毒传播规律。',
    pricing_title: '免费开始',
    pricing_desc: '通过广告、每日轮盘和邀请好友赚取免费积分。',
    login: '登录',
    signup: '注册',
    generator: '脚本生成器',
    credits: '积分',
    trends: '最新趋势',
    invite: '邀请',
    nav_features: '功能介绍',
    nav_pricing: '积分',
    nav_trends: '趋势',
    nav_generator: '脚本生成器',
  },
  ja: {
    hero_tag: 'AI搭載ショート動画マーケティング分析',
    hero_title: 'ショート動画URLひとつで、',
    hero_title2: '3ヶ国語のバイラル脚本を生成',
    hero_desc: 'AIが動画構造を解析し、米国・韓国・日本市場向けのローカライズ脚本を1分以内に作成します。',
    cta_start: '無料で始める',
    cta_credits: 'クレジットを見る',
    sample: 'サンプルを試す：',
    stats_gen: '平均生成時間',
    stats_locale: '同時ローカライズ',
    stats_uptime: 'アップタイムSLA',
    stats_scripts: '生成スクリプト数',
    features_title: 'ViralScript AIの特長',
    features_desc: '単なる翻訳ではありません。各国のトレンドと感性を理解したAIが本物のバイラルを創ります。',
    pricing_title: '無料でスタート',
    pricing_desc: '広告視聴・デイリールーレット・招待で無料クレジットを獲得。',
    login: 'ログイン',
    signup: '会員登録',
    generator: '脚本ジェネレーター',
    credits: 'クレジット',
    trends: '最新トレンド',
    invite: '招待',
    nav_features: '機能紹介',
    nav_pricing: 'クレジット',
    nav_trends: 'トレンド',
    nav_generator: 'ジェネレーター',
  },
};

const LANG_KEY = 'viralLang';

export function getLang(): Lang {
  if (typeof window === 'undefined') return 'ko';
  return (localStorage.getItem(LANG_KEY) as Lang) || 'ko';
}

export function t(key: string): string {
  const lang = getLang();
  return T[lang]?.[key] ?? T.ko[key] ?? key;
}

export default function LanguageSwitcher() {
  const [lang, setLang] = useState<Lang>('ko');

  useEffect(() => {
    setLang(getLang());
  }, []);

  function switchLang(code: Lang) {
    localStorage.setItem(LANG_KEY, code);
    setLang(code);
    window.location.reload();
  }

  const current = LANGS.find(l => l.code === lang) ?? LANGS[0];

  return (
    <div className="relative group">
      <button className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs text-white/40 hover:text-white hover:bg-white/5 transition-all">
        <Globe size={14} />
        <span className="hidden sm:inline">{current.flag}</span>
      </button>
      <div className="absolute right-0 top-full mt-1 w-32 glass-strong rounded-xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
        {LANGS.map(l => (
          <button
            key={l.code}
            onClick={() => switchLang(l.code)}
            className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-all ${l.code === lang ? 'bg-violet-600/30 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
          >
            <span>{l.flag}</span> {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}