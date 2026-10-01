/* eslint-disable @next/next/no-html-link-for-pages -- Full document navigation keeps article-only ad scripts out of tool screens. */
import type { ReactNode } from 'react';
import { LANGUAGE_NAMES, LEARNING_LANGUAGES, PUBLIC_UI, type LearningLanguage } from '@/lib/learning/catalog';

export default function ContentShell({ language, slug, section = 'learn', children }: { language: LearningLanguage; slug?: string; section?: 'learn' | 'about'; children: ReactNode }) {
  const ui = PUBLIC_UI[language];
  return <div lang={language} className="min-h-screen text-white">
    <header className="border-b border-white/10 bg-[#0b0d14]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <a href="/" className="text-lg font-bold">ViralScript <span className="text-violet-300">AI</span></a>
        <nav aria-label={ui.guides} className="flex flex-wrap gap-1 text-sm">
          <a href={`/learn/${language}`} className="rounded-lg px-3 py-2 text-violet-200 hover:bg-white/5">{ui.guides}</a>
          <a href={`/about/${language}`} className="rounded-lg px-3 py-2 text-white/65 hover:bg-white/5">{ui.about}</a>
          <a href="/generator" className="rounded-lg bg-violet-600 px-3 py-2 font-semibold hover:bg-violet-500">{ui.generator}</a>
        </nav>
      </div>
    </header>
    <div className="mx-auto flex max-w-6xl flex-wrap justify-end gap-1 px-4 py-4 sm:px-6" aria-label="Language">
      {LEARNING_LANGUAGES.map((locale) => <a key={locale} href={`/${section}/${locale}${slug ? `/${slug}` : ''}`} hrefLang={locale} aria-current={locale === language ? 'page' : undefined} className={`rounded-lg px-3 py-2 text-xs ${locale === language ? 'bg-white/10 text-white' : 'text-white/45 hover:text-white'}`}>{LANGUAGE_NAMES[locale]}</a>)}
    </div>
    {children}
    <footer className="mt-16 border-t border-white/10 px-4 py-8 text-sm text-white/45 sm:px-6">
      <div className="mx-auto max-w-6xl"><p>{ui.footer}</p><nav className="mt-4 flex flex-wrap gap-x-5 gap-y-3">
        <a href="/">{ui.home}</a><a href={`/learn/${language}`}>{ui.guides}</a><a href={`/about/${language}`}>{ui.about}</a>
        <a href="/terms">{ui.terms}</a><a href="/privacy">{ui.privacy}</a><a href="mailto:psunghyi@gmail.com">{ui.contact}</a>
      </nav></div>
    </footer>
  </div>;
}
