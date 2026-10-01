import { notFound } from 'next/navigation';
import ContentShell from '../../ContentShell';
import AdSenseScript from '@/app/components/AdSenseScript';
import AdSenseDisplayAd from '@/app/components/AdSenseDisplayAd';
import { GUIDE_CATALOG, getGuideSummary, isLearningLanguage, LEARNING_LANGUAGES, PUBLIC_UI } from '@/lib/learning/catalog';
import { GUIDE_BODIES } from '@/lib/learning/guides';
import { publicContentMetadata } from '@/lib/learning/metadata';

type Props = { params: Promise<{ language: string; slug: string }> };
export const dynamicParams = false;
export function generateStaticParams() { return LEARNING_LANGUAGES.flatMap((language) => GUIDE_CATALOG.map(({ slug }) => ({ language, slug }))); }
export async function generateMetadata({ params }: Props) {
  const { language, slug } = await params;
  const summary = getGuideSummary(slug);
  if (!isLearningLanguage(language) || !summary) notFound();
  return publicContentMetadata(language, summary.titles[language], summary.descriptions[language], 'learn', slug);
}

export default async function GuidePage({ params }: Props) {
  const { language, slug } = await params;
  const summary = getGuideSummary(slug);
  if (!isLearningLanguage(language) || !summary) notFound();
  const guide = GUIDE_BODIES[summary.slug][language];
  const ui = PUBLIC_UI[language];
  return <ContentShell language={language} slug={slug}>
    <main className="mx-auto max-w-3xl px-4 pb-8 pt-4 sm:px-6">
      <a href={`/learn/${language}`} className="inline-flex min-h-11 items-center text-sm text-violet-200">← {ui.back}</a>
      <article>
        <header className="border-b border-white/10 pb-7"><h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">{summary.titles[language]}</h1><p className="mt-5 text-xs leading-6 text-white/45">{ui.author}<br />{ui.updated}</p></header>
        {guide.illustrative && <p className="mt-7 rounded-xl border border-cyan-300/20 bg-cyan-300/5 p-4 text-sm leading-7 text-cyan-100/80">{ui.example}</p>}
        <p className="mt-7 text-base leading-8 text-white/75">{guide.introduction}</p>
        {guide.sections.map((section, index) => <section key={section.heading} id={`step-${index + 1}`} className="mt-10">
          <h2 className="text-xl font-semibold leading-8 text-white">{section.heading}</h2>
          {section.sample && <pre className="mt-4 whitespace-pre-wrap break-words rounded-xl border border-violet-400/20 bg-violet-400/5 p-4 font-sans text-sm leading-7 text-violet-100 sm:p-5">{section.sample}</pre>}
          {section.paragraphs?.map((paragraph) => <p key={paragraph} className="mt-4 text-base leading-8 text-white/65">{paragraph}</p>)}
          {section.steps && <ol className="mt-4 list-decimal space-y-3 pl-6 text-base leading-8 text-white/65">{section.steps.map((step) => <li key={step} className="pl-1">{step}</li>)}</ol>}
          {section.conclusion && <p className="mt-4 text-base leading-8 text-white/65">{section.conclusion}</p>}
        </section>)}
      </article>
      <AdSenseDisplayAd />
      <aside className="mt-12 border-t border-white/10 pt-6"><h2 className="text-base font-semibold">{ui.related}</h2><div className="mt-4 space-y-3">{GUIDE_CATALOG.filter((guide) => guide.slug !== slug).map((guide) => <a key={guide.slug} href={`/learn/${language}/${guide.slug}`} className="block rounded-xl border border-white/10 p-4 text-sm text-violet-200 hover:bg-white/5">{guide.titles[language]} →</a>)}</div></aside>
    </main>
    <AdSenseScript />
  </ContentShell>;
}
