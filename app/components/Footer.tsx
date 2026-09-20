import Link from 'next/link';
import { t } from './LanguageSwitcher';
import { useLanguage } from './LanguageProvider';
import ContactSupport from './ContactSupport';

export default function Footer() {
  useLanguage();
  return (
    <footer id="site-footer" className="border-t border-white/5 px-4 pt-10 pb-[calc(2.5rem+env(safe-area-inset-bottom))] sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm font-semibold text-white/40">ViralScript AI</span>
          <p className="text-xs text-white/25 text-center max-w-lg">
            {t('footer_disclaimer')}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 text-xs text-white/30">
            <Link href="/terms" className="inline-flex min-h-11 items-center hover:text-white/60 transition-colors">{t('footer_terms')}</Link>
            <Link href="/privacy" className="inline-flex min-h-11 items-center hover:text-white/60 transition-colors">{t('footer_privacy')}</Link>
            <ContactSupport />
          </div>
        </div>
      </div>
    </footer>
  );
}
