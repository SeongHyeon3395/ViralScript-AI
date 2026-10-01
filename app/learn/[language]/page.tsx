import { notFound } from 'next/navigation';
import ContentShell from '../ContentShell';
import { GUIDE_CATALOG, isLearningLanguage, LEARNING_LANGUAGES, PUBLIC_UI } from '@/lib/learning/catalog';
import { publicContentMetadata } from '@/lib/learning/metadata';

type Props = { params: Promise<{ language: string }> };
export const dynamicParams = false;
export function generateStaticParams() { return LEARNING_LANGUAGES.map((language) => ({ language })); }
export async function generateMetadata({ params }: Props) {
  const { language } = await params;
  if (!isLearningLanguage(language)) notFound();
  return publicContentMetadata(language, PUBLIC_UI[language].guides, PUBLIC_UI[language].description, 'learn');
}

export default async function GuidesPage({ params }: Props) {
  const { language } = await params;
  if (!isLearningLanguage(language)) notFound();
  const ui = PUBLIC_UI[language];
  return <ContentShell language={language}>
    <main className="mx-auto max-w-6xl px-4 pb-8 pt-5 sm:px-6">
      <header className="max-w-3xl"><p className="text-sm font-semibold text-violet-300">{ui.guides}</p><h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">{ui.title}</h1><p className="mt-5 text-base leading-8 text-white/65">{ui.description}</p></header>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {GUIDE_CATALOG.map((guide, index) => <article key={guide.slug} className="flex flex-col rounded-2xl border border-white/10 bg-white/[.025] p-6">
          <p className="text-xs font-semibold text-violet-300">0{index + 1}</p><h2 className="mt-4 text-xl font-semibold leading-7"><a href={`/learn/${language}/${guide.slug}`}>{guide.titles[language]}</a></h2>
          <p className="mt-4 flex-1 text-sm leading-7 text-white/60">{guide.descriptions[language]}</p><a href={`/learn/${language}/${guide.slug}`} className="mt-6 inline-flex min-h-11 items-center text-sm font-semibold text-violet-200">{ui.read} →</a>
        </article>)}
      </div>
      <a href={`/about/${language}`} className="mt-8 inline-flex min-h-11 items-center text-sm text-white/60 underline underline-offset-4">{ui.about}</a>
    </main>
  </ContentShell>;
}
