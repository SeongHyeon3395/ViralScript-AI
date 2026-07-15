'use client';

import { useState } from 'react';
import {
  Shuffle,
  Sparkles,
  RefreshCw,
  Loader2,
  Check,
  Copy,
  Music,
  Drama,
  Laugh,
  Heart,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { t } from './LanguageSwitcher';

const REMIX_MODES = [
  {
    id: 'thriller',
    label: '스릴러 무드',
    icon: Drama,
    desc: '긴장감 넘치는 반전 구조로 리믹스',
    color: 'text-red-400',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.2)',
  },
  {
    id: 'comedy',
    label: '코믹 반전 무드',
    icon: Laugh,
    desc: '유머러스한 밈 감성으로 리믹스',
    color: 'text-amber-400',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.2)',
  },
  {
    id: 'emotional',
    label: '감동 스토리 무드',
    icon: Heart,
    desc: '감성적인 내러티브로 리믹스',
    color: 'text-pink-400',
    bg: 'rgba(236,72,153,0.08)',
    border: 'rgba(236,72,153,0.2)',
  },
  {
    id: 'fast',
    label: '속도감 있는 편집',
    icon: Zap,
    desc: '빠른 컷 편집, 쇼츠 최적화 버전',
    color: 'text-cyan-400',
    bg: 'rgba(6,182,212,0.08)',
    border: 'rgba(6,182,212,0.2)',
  },
];

interface RemixPanelProps {
  originalPrompt: string;
  targetProduct: string;
  onRemixComplete?: (result: string) => void;
}

export default function RemixPanel({ originalPrompt, targetProduct, onRemixComplete }: RemixPanelProps) {
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleRemix(modeId: string) {
    setSelectedMode(modeId);
    setLoading(true);
    setResult(null);

    // Simulate AI remix call
    await new Promise((r) => setTimeout(r, 1500));

    const mockResults: Record<string, string> = {
      thriller: `🎬 [스릴러 버전] ${targetProduct} 리믹스\n\n"당신이 지금까지 본 광고는 가짜였습니다. 진짜는 지금부터 시작됩니다."\n\n[Scene 1] 0:00-0:03\n어두운 배경, 심장 박동 소리. 카메라가 천천히 ${targetProduct}를 비춘다.\n\n[Scene 2] 0:03-0:08\n"이 제품을 쓰기 전과 후, 당신의 삶이 완전히 바뀝니다."\n빠른 몽타주 편집. 사용자들의 충격적인 반응 영상.\n\n[Scene 3] 0:08-0:15\n"지금 바로 확인하세요. 후회하지 않습니다."\n화면이 번쩍이며 CTA 등장.`,
      comedy: `🎭 [코믹 버전] ${targetProduct} 리믹스\n\n"내가 이걸 왜 샀을까? 아, 맞아. 인생이 바뀌려나?"\n\n[Scene 1] 0:00-0:05\n주인공이 ${targetProduct}를 의심스럽게 바라본다. 자막: "또 하나의 사기성 광고?"\n\n[Scene 2] 0:05-0:10\n"근데... 이거 진짜 되네?"\n주인공의 표정이 180도 바뀌는 순간. 웃음 효과음.\n\n[Scene 3] 0:10-0:15\n"나만 알고 싶은데... 여러분도 사세요"\n짜증나는 친구에게 추천하는 컨셉.`,
      emotional: `💗 [감동 버전] ${targetProduct} 리믹스\n\n"이 세상에 쉬운 건 없습니다. 하지만, 변화는 생각보다 가까이에 있었어요."\n\n[Scene 1] 0:00-0:06\n흑백 화면. 지친 표정의 주인공. "매일 똑같은 하루가 반복됐어요."\n\n[Scene 2] 0:06-0:12\n색이 서서히 돌아오며 ${targetProduct}를 만나는 순간. 감동적인 피아노 음악.\n\n[Scene 3] 0:12-0:15\n"이제는 제가 여러분에게 이 변화를 추천합니다."\n따뜻한 미소, 엔딩.`,
      fast: `⚡ [속도감 버전] ${targetProduct} 리믹스\n\n[Scene 1] 0:00-0:02\n"3초면 충분합니다."\n\n[Scene 2] 0:02-0:05\n"${targetProduct}?"\n제품 컷인. 빠른 줌인.\n\n[Scene 3] 0:05-0:08\n"이게 다야?"\n사용법 3초 컷.\n\n[Scene 4] 0:08-0:12\n"근데 효과는?"\nBEFORE/AFTER 빠른 비교.\n\n[Scene 5] 0:12-0:15\n"사세요. 끝."\n강력한 CTA.`,
    };

    const remixResult = mockResults[modeId] || '리믹스 생성 중 오류가 발생했습니다.';
    setResult(remixResult);
    setLoading(false);
    onRemixComplete?.(remixResult);
  }

  async function copyResult() {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4 fade-in-up">
      {/* Mode selector */}
      <div className="grid grid-cols-2 gap-2">
        {REMIX_MODES.map((mode) => {
          const Icon = mode.icon;
          const isSelected = selectedMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => handleRemix(mode.id)}
              disabled={loading}
              className={`relative rounded-xl p-4 text-left transition-all ${
                isSelected && !loading
                  ? 'border-2 scale-[1.02]'
                  : 'border hover:scale-[1.01]'
              } ${loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
              style={{
                background: mode.bg,
                borderColor: isSelected && !loading ? mode.color.replace('text-', '').replace('red', '#ef4444').replace('amber', '#f59e0b').replace('pink', '#ec4899').replace('cyan', '#06b6d4') : 'rgba(255,255,255,0.08)',
              }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  {loading && isSelected ? (
                    <Loader2 size={14} className="animate-spin text-white/60" />
                  ) : (
                    <Icon size={14} className={mode.color} />
                  )}
                </div>
                <span className="text-sm font-bold text-white">{mode.label}</span>
              </div>
              <p className="text-xs text-white/40">{mode.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Result */}
      {result && (
        <div className="rounded-xl p-4 fade-in-up" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-violet-400" />
              <span className="text-xs font-bold text-white/50 uppercase tracking-widest">{t('remix_title')}</span>
            </div>
            <button
              onClick={copyResult}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white/50 hover:text-white hover:bg-white/8 transition-all"
            >
              {copied ? (
                <>
                  <Check size={13} className="text-emerald-400" />
                  {t('gen_copied')}
                </>
              ) : (
                <>
                  <Copy size={13} />
                  {t('gen_copy')}
                </>
              )}
            </button>
          </div>
          <pre className="text-xs font-mono text-white/60 leading-relaxed whitespace-pre-wrap">{result}</pre>
        </div>
      )}
    </div>
  );
}