import React from 'react';
import { SoundTip, TIP_TEXT } from '../engine/speakTips';

/** 입 모양 그림 (앞에서 본 입). 직접 그린 단순한 그림 */
function Mouth({ tip }: { tip: SoundTip }) {
  const lip = '#e0796b', mouth = '#7a2e2a', tooth = '#ffffff', tongue = '#f29aa0', line = '#b9584c';
  return (
    <svg viewBox="0 0 120 80" className="w-32 h-24 shrink-0" aria-hidden>
      <ellipse cx="60" cy="40" rx="56" ry="36" fill="#fde8dc" />
      {tip === 'th' && <>
        <ellipse cx="60" cy="40" rx="34" ry="18" fill={lip} />
        <ellipse cx="60" cy="40" rx="27" ry="12" fill={mouth} />
        <rect x="40" y="29" width="40" height="8" rx="3" fill={tooth} />
        <rect x="42" y="44" width="36" height="7" rx="3" fill={tooth} />
        <ellipse cx="60" cy="41" rx="17" ry="6" fill={tongue} stroke={line} strokeWidth="1" />
      </>}
      {(tip === 'f' || tip === 'v') && <>
        <path d="M26 38 Q60 22 94 38 Q60 32 26 38Z" fill={lip} />
        <rect x="40" y="34" width="40" height="10" rx="3" fill={tooth} />
        <path d="M26 42 Q60 62 94 42 Q60 46 26 42Z" fill={lip} />
        <path d="M44 44 Q60 47 76 44" stroke={line} strokeWidth="1.5" fill="none" />
        {tip === 'v' && <g stroke="#c3613a" strokeWidth="2" strokeLinecap="round"><path d="M100 30 l6 -4" /><path d="M102 40 h8" /><path d="M100 50 l6 4" /></g>}
        {tip === 'f' && <g stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"><path d="M100 36 h12" /><path d="M100 44 h10" /></g>}
      </>}
      {tip === 'r' && <>
        <ellipse cx="60" cy="40" rx="18" ry="16" fill={lip} />
        <ellipse cx="60" cy="40" rx="9" ry="8" fill={mouth} />
        <path d="M54 44 Q60 38 66 44" stroke={tongue} strokeWidth="3" fill="none" strokeLinecap="round" />
      </>}
      {tip === 'l' && <>
        <ellipse cx="60" cy="40" rx="32" ry="20" fill={lip} />
        <ellipse cx="60" cy="41" rx="25" ry="14" fill={mouth} />
        <rect x="41" y="27" width="38" height="7" rx="3" fill={tooth} />
        <path d="M48 54 Q50 36 60 33 Q70 36 72 54Z" fill={tongue} stroke={line} strokeWidth="1" />
      </>}
    </svg>
  );
}

/** 발음 포인트 카드: 입 모양 + 한 줄 설명 */
export function MouthTip({ tip }: { tip: SoundTip }) {
  const t = TIP_TEXT[tip];
  return (
    <div className="bg-brand-50 border border-brand-100 rounded-2xl p-3 flex items-center gap-3 text-left">
      <Mouth tip={tip} />
      <div className="min-w-0">
        <div className="text-sm font-black text-brand-800">💡 {t.title}</div>
        <div className="text-xs font-bold text-slate-500 break-keep mt-0.5">{t.say}</div>
      </div>
    </div>
  );
}

/** 문장에서 연습할 글자에 색칠 */
export function TipText({ text, at, className = '' }: { text: string; at?: [number, number]; className?: string }) {
  if (!at) return <span className={className}>{text}</span>;
  return <span className={className}>{text.slice(0, at[0])}<span className="text-rose-500 underline decoration-4 decoration-rose-200 underline-offset-4">{text.slice(at[0], at[1])}</span>{text.slice(at[1])}</span>;
}
