'use client';

import Link from 'next/link';
import { GUIDE_CATALOG, PUBLIC_UI } from '@/lib/learning/catalog';
import { useLanguage } from './LanguageProvider';

export default function PublicLearningPreview() {
  const { language } = useLanguage();
  const ui = PUBLIC_UI[language];
  return <section className="border-t border-white/5 px-4 py-12 sm:px-6 sm:py-16">
    <div className="mx-auto max-w-5xl"><p className="text-sm font-semibold text-violet-300">{ui.guides}</p><h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl">{ui.title}</h2><p className="mt-4 max-w-3xl text-sm leading-7 text-white/55">{ui.description}</p>
      <div className="mt-7 grid gap-4 md:grid-cols-3">{GUIDE_CATALOG.map((guide) => <article key={guide.slug} className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><h3 className="font-semibold leading-7 text-white"><Link href={`/learn/${language}/${guide.slug}`}>{guide.titles[language]}</Link></h3><p className="mt-3 text-sm leading-7 text-white/50">{guide.descriptions[language]}</p><Link href={`/learn/${language}/${guide.slug}`} className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-violet-200">{ui.read} →</Link></article>)}</div>
      <Link href={`/learn/${language}`} className="mt-5 inline-flex min-h-11 items-center text-sm text-violet-200">{ui.back} →</Link>
    </div>
  </section>;
}
