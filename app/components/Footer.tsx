import Link from 'next/link';
import { t } from './LanguageSwitcher';

export default function Footer() {
  return (
    <footer className="border-t border-white/5 py-10 px-4 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm font-semibold text-white/40">ViralScript AI</span>
          <p className="text-xs text-white/25 text-center max-w-lg">
            {t('footer_disclaimer')}
          </p>
          <div className="flex items-center gap-4 text-xs text-white/30">
            <Link href="/terms" className="hover:text-white/60 transition-colors">{t('footer_terms')}</Link>
            <Link href="/privacy" className="hover:text-white/60 transition-colors">{t('footer_privacy')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}