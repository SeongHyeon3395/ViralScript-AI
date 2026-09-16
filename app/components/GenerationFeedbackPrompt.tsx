'use client';

import { useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';
import { useLanguage } from './LanguageProvider';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

const COPY = {
  en: { title: 'How was your plan?', desc: 'Rate your experience and get 8 credits for thoughtful feedback.', use: 'Would you use ViralScript AI again?', yes: 'Yes', no: 'No', label: 'What should we improve?', placeholder: 'Tell us what worked or felt inconvenient (30 characters or more)', submit: 'Submit feedback', later: 'Later', thanks: 'Thanks! 8 credits were added.', min: 'Please enter at least 30 characters.' },
  ko: { title: '영상 기획이 어땠나요?', desc: '경험을 평가하고 의견을 남기면 8크레딧을 드립니다.', use: 'ViralScript AI를 다시 사용할 의향이 있나요?', yes: '네', no: '아니오', label: '개선할 점이 있나요?', placeholder: '좋았던 점이나 불편했던 점을 30자 이상 적어주세요.', submit: '의견 보내고 8크레딧 받기', later: '나중에', thanks: '감사합니다! 8크레딧이 지급되었습니다.', min: '30자 이상 입력해 주세요.' },
  ja: { title: '動画プランはいかがでしたか？', desc: '評価とご意見をいただくと8クレジットを進呈します。', use: 'また利用したいですか？', yes: 'はい', no: 'いいえ', label: '改善してほしい点', placeholder: '良かった点や不便な点を30文字以上で入力してください。', submit: '送信して8クレジットを受け取る', later: '後で', thanks: 'ありがとうございます。8クレジットを付与しました。', min: '30文字以上入力してください。' },
  zh: { title: '视频方案体验如何？', desc: '留下评分和意见即可获得8个积分。', use: '您愿意再次使用吗？', yes: '是', no: '否', label: '需要改进的地方', placeholder: '请写下体验或不便之处，至少30个字符。', submit: '提交并领取8积分', later: '稍后', thanks: '感谢您！已添加8个积分。', min: '请输入至少30个字符。' },
} as const;

export default function GenerationFeedbackPrompt() {
  const { user, applyCreditsFromServer } = useAuth();
  const { language } = useLanguage();
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [wouldUseAgain, setWouldUseAgain] = useState(true);
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const copy = COPY[language];

  useEffect(() => {
    const onComplete = (event: Event) => {
      const id = (event as CustomEvent<{ generationId?: string }>).detail?.generationId;
      if (!id || !user) return;
      window.setTimeout(() => { setGenerationId(id); setRating(0); setComment(''); setStatus('idle'); }, 60_000);
    };
    window.addEventListener('generation:completed', onComplete);
    return () => window.removeEventListener('generation:completed', onComplete);
  }, [user]);

  if (!generationId || !user) return null;
  async function submit() {
    if (rating < 1 || comment.trim().length < 30) { setStatus('error'); return; }
    setStatus('saving');
    const { data: { session } } = await getSupabaseBrowserClient().auth.getSession();
    if (!session) { setStatus('error'); return; }
    const response = await fetch('/api/v1/feedback', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ generationId, rating, wouldUseAgain, comment }) });
    const payload = await response.json() as { creditsRemaining?: number };
    if (!response.ok) { setStatus('error'); return; }
    if (typeof payload.creditsRemaining === 'number') applyCreditsFromServer(payload.creditsRemaining);
    setStatus('done');
    window.setTimeout(() => setGenerationId(null), 1800);
  }
  return <div role="dialog" aria-modal="true" aria-labelledby="feedback-title" className="fixed inset-x-4 bottom-4 z-[100] mx-auto max-w-lg rounded-2xl border border-violet-400/30 bg-[#12111d] p-5 shadow-2xl shadow-black/50">
    {status === 'done' ? <p className="py-8 text-center font-semibold text-emerald-300">{copy.thanks}</p> : <>
      <div className="flex items-start justify-between gap-4"><div><h2 id="feedback-title" className="text-lg font-bold text-white">{copy.title}</h2><p className="mt-1 text-sm text-white/55">{copy.desc}</p></div><button type="button" aria-label={copy.later} onClick={() => setGenerationId(null)} className="text-sm text-white/45 hover:text-white">×</button></div>
      <div className="mt-4 flex gap-2" aria-label={copy.title}>{[1, 2, 3, 4, 5].map((value) => <button type="button" key={value} aria-label={`${value}/5`} aria-pressed={rating === value} onClick={() => setRating(value)} className={`h-9 w-9 rounded-full border text-sm ${rating === value ? 'border-violet-300 bg-violet-500/30 text-white' : 'border-white/15 text-white/55'}`}>{value}</button>)}</div>
      <fieldset className="mt-4"><legend className="mb-2 text-sm text-white/70">{copy.use}</legend><div className="flex gap-2">{([['yes', true], ['no', false]] as const).map(([key, value]) => <button type="button" key={key} aria-pressed={wouldUseAgain === value} onClick={() => setWouldUseAgain(value)} className={`rounded-lg border px-3 py-2 text-sm ${wouldUseAgain === value ? 'border-violet-300 bg-violet-500/20 text-white' : 'border-white/15 text-white/55'}`}>{copy[key]}</button>)}</div></fieldset>
      <label className="mt-4 block text-sm text-white/70">{copy.label}<textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder={copy.placeholder} className="mt-2 min-h-24 w-full rounded-xl border border-white/15 bg-white/5 p-3 text-sm text-white outline-none focus:border-violet-400" /></label>
      {status === 'error' && <p role="alert" className="mt-2 text-xs text-rose-300">{copy.min}</p>}
      <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setGenerationId(null)} className="rounded-lg px-3 py-2 text-sm text-white/50">{copy.later}</button><button type="button" disabled={status === 'saving'} onClick={() => void submit()} className="btn-primary-compact px-4 py-2 text-sm disabled:opacity-50">{status === 'saving' ? '...' : copy.submit}</button></div>
    </>}
  </div>;
}
