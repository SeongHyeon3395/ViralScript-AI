'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { t } from './LanguageSwitcher';

const PHONE_COUNTRIES = [
  ['US', '+1', 'United States'], ['KR', '+82', 'South Korea'], ['CA', '+1', 'Canada'], ['JP', '+81', 'Japan'], ['CN', '+86', 'China'], ['TW', '+886', 'Taiwan'], ['HK', '+852', 'Hong Kong'],
  ['GB', '+44', 'United Kingdom'], ['DE', '+49', 'Germany'], ['FR', '+33', 'France'], ['IT', '+39', 'Italy'], ['ES', '+34', 'Spain'], ['PT', '+351', 'Portugal'], ['NL', '+31', 'Netherlands'], ['BE', '+32', 'Belgium'], ['CH', '+41', 'Switzerland'], ['AT', '+43', 'Austria'], ['SE', '+46', 'Sweden'], ['NO', '+47', 'Norway'], ['DK', '+45', 'Denmark'], ['FI', '+358', 'Finland'], ['IE', '+353', 'Ireland'], ['PL', '+48', 'Poland'], ['CZ', '+420', 'Czech Republic'], ['HU', '+36', 'Hungary'], ['RO', '+40', 'Romania'], ['GR', '+30', 'Greece'], ['UA', '+380', 'Ukraine'], ['RU', '+7', 'Russia'],
  ['AU', '+61', 'Australia'], ['NZ', '+64', 'New Zealand'], ['IN', '+91', 'India'], ['SG', '+65', 'Singapore'], ['MY', '+60', 'Malaysia'], ['TH', '+66', 'Thailand'], ['VN', '+84', 'Vietnam'], ['PH', '+63', 'Philippines'], ['ID', '+62', 'Indonesia'], ['KH', '+855', 'Cambodia'], ['LA', '+856', 'Laos'], ['MM', '+95', 'Myanmar'], ['BD', '+880', 'Bangladesh'], ['PK', '+92', 'Pakistan'], ['LK', '+94', 'Sri Lanka'], ['NP', '+977', 'Nepal'], ['MN', '+976', 'Mongolia'],
  ['AE', '+971', 'United Arab Emirates'], ['SA', '+966', 'Saudi Arabia'], ['IL', '+972', 'Israel'], ['TR', '+90', 'Turkey'], ['IR', '+98', 'Iran'], ['IQ', '+964', 'Iraq'], ['QA', '+974', 'Qatar'], ['KW', '+965', 'Kuwait'], ['BH', '+973', 'Bahrain'], ['JO', '+962', 'Jordan'], ['EG', '+20', 'Egypt'], ['ZA', '+27', 'South Africa'], ['NG', '+234', 'Nigeria'], ['KE', '+254', 'Kenya'], ['MA', '+212', 'Morocco'],
  ['BR', '+55', 'Brazil'], ['MX', '+52', 'Mexico'], ['AR', '+54', 'Argentina'], ['CL', '+56', 'Chile'], ['CO', '+57', 'Colombia'], ['PE', '+51', 'Peru'], ['VE', '+58', 'Venezuela'], ['CR', '+506', 'Costa Rica'], ['PA', '+507', 'Panama'], ['DO', '+1', 'Dominican Republic'], ['JM', '+1', 'Jamaica'],
] as const;

function FlagIcon({ countryCode }: { countryCode: string }) {
  return <span className={`fi fi-${countryCode.toLowerCase()} h-4 w-6 shrink-0 rounded-sm`} aria-hidden="true" />;
}

interface PhoneCountrySelectProps {
  value: string;
  countryIso: string;
  onChange: (dial: string, iso: string) => void;
}

export default function PhoneCountrySelect({ value, countryIso, onChange }: PhoneCountrySelectProps) {
  const [open, setOpen] = useState(false);
  const selected = PHONE_COUNTRIES.find(([code, dial]) => code === countryIso && dial === value) ?? PHONE_COUNTRIES[0];

  return (
    <div className="relative w-full">
      <button type="button" aria-label={t('signup_country_label')} aria-expanded={open} onClick={() => setOpen((current) => !current)} className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-zinc-900 px-3 py-3 text-left text-sm text-white hover:border-white/25">
        <FlagIcon countryCode={selected[0]} />
        <span className="truncate">{selected[0]} {selected[1]} {selected[2]}</span>
        <ChevronDown size={14} className={`ml-auto shrink-0 text-white/50 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <button type="button" aria-label={t('close')} className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
          <div role="listbox" className="absolute left-0 top-full z-50 mt-2 max-h-64 w-[min(360px,calc(100vw-3rem))] overflow-y-auto rounded-xl border border-white/10 bg-zinc-900 p-1 shadow-2xl">
            {PHONE_COUNTRIES.map(([code, dial, name]) => (
              <button key={`${code}-${dial}`} type="button" role="option" aria-selected={value === dial && countryIso === code} onClick={() => { onChange(dial, code); setOpen(false); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-white/80 hover:bg-white/10">
                <FlagIcon countryCode={code} />
                <span className="whitespace-nowrap">{code} {dial}</span>
                <span className="truncate text-white/55">{name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
