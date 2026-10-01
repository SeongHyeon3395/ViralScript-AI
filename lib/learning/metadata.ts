import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/siteUrl';
import { LEARNING_LANGUAGES, type LearningLanguage } from './catalog';

export function publicContentMetadata(language: LearningLanguage, title: string, description: string, section: 'learn' | 'about', slug?: string): Metadata {
  const path = `/${section}/${language}${slug ? `/${slug}` : ''}`;
  return {
    title: `${title} — ViralScript AI`, description,
    alternates: {
      canonical: `${SITE_URL}${path}`,
      languages: Object.fromEntries(LEARNING_LANGUAGES.map((locale) => [locale, `${SITE_URL}/${section}/${locale}${slug ? `/${slug}` : ''}`])),
    },
    openGraph: { title, description, url: `${SITE_URL}${path}`, type: slug ? 'article' : 'website', locale: { en: 'en_US', ko: 'ko_KR', ja: 'ja_JP', zh: 'zh_CN' }[language] },
    twitter: { card: 'summary_large_image', title, description },
  };
}
