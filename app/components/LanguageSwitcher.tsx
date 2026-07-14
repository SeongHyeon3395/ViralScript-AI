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
    generator: '대본 생성',
    credits: '크레딧',
    trends: '최신 트렌드',
    invite: '초대하기',
    nav_features: '기능 소개',
    nav_pricing: '크레딧',
    nav_trends: '트렌드',
    nav_generator: '대본 생성',
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
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setLang(getLang());
  }, []);

  function switchLang(code: Lang) {
    localStorage.setItem(LANG_KEY, code);
    setLang(code);
    setIsOpen(false);
    window.location.reload();
  }

  const current = LANGS.find(l => l.code === lang) ?? LANGS[0];

  return (
    <div className="relative shrink-0">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/8 transition-all border border-white/10 hover:border-white/20 w-[90px] sm:w-[120px] justify-between"
      >
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Globe size={14} className="sm:w-4 sm:h-4" />
          <span className="text-sm sm:text-base">{current.flag}</span>
        </div>
        <svg className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-48 glass-strong rounded-xl overflow-hidden shadow-xl shadow-black/40 fade-in-up z-50">
            {LANGS.map(l => (
              <button
                key={l.code}
                onClick={() => switchLang(l.code)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all ${l.code === lang ? 'bg-violet-600/40 text-white' : 'text-white/60 hover:text-white hover:bg-white/8'}`}
              >
                <span className="text-xl">{l.flag}</span> 
                <span className="flex-1 text-left">{l.label}</span>
                {l.code === lang && <span className="text-violet-400">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}