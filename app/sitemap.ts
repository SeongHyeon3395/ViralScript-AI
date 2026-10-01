import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/siteUrl';
import { GUIDE_CATALOG, LEARNING_LANGUAGES } from '@/lib/learning/catalog';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', '/terms', '/privacy'];
  return [
    ...routes.map((path) => ({ url: `${SITE_URL}${path}`, changeFrequency: 'monthly' as const })),
    ...LEARNING_LANGUAGES.flatMap((language) => ['/learn', '/about'].map((section) => ({ url: `${SITE_URL}${section}/${language}`, lastModified: '2026-10-01', alternates: { languages: Object.fromEntries(LEARNING_LANGUAGES.map((locale) => [locale, `${SITE_URL}${section}/${locale}`])) } }))),
    ...GUIDE_CATALOG.flatMap(({ slug }) => LEARNING_LANGUAGES.map((language) => ({ url: `${SITE_URL}/learn/${language}/${slug}`, lastModified: '2026-10-01', alternates: { languages: Object.fromEntries(LEARNING_LANGUAGES.map((locale) => [locale, `${SITE_URL}/learn/${locale}/${slug}`])) } }))),
  ];
}
