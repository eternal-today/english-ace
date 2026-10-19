import React from 'react';
import { fmt, numberParts, numWords } from '../engine/numbers';
import { speak, speakParts } from '../engine/speech';

/** 덩어리마다 다른 색 (thousand · hundred · 나머지) */
const PART_TONE = ['text-brand-600', 'text-amber-500', 'text-sky-500', 'text-rose-400'];
const PART_BG = ['bg-brand-100', 'bg-amber-100', 'bg-sky-100', 'bg-rose-100'];

interface Props {
  value: number;
  /** 덩어리 색칠 (끊어 읽기 화면) */
  colored?: boolean;
  /** 덩어리 아래에 thousand · hundred 이름표 */
  labels?: boolean;
  /** 지금 읽는 덩어리 번호 (-1이면 없음) */
  active?: number;
  /** 문제에서 색칠할 글자 범위 (붙는 말 문제) */
  hi?: [number, number];
  /** 숫자 아래에 영어 단어 (스펠링 보여 주기) */
  words?: boolean;
  className?: string;
}

export function NumberView({ value, colored = false, labels = false, active = -1, hi, words = false, className = '' }: Props) {
  const s = fmt(value);
  const parts = numberParts(value);
  const partOf = (i: number) => parts.findIndex(p => i >= p.range[0] && i < p.range[1]);
  // 이름표는 thousand · hundred 덩어리 아래에만
  const tags = labels ? parts.map((p, i) => ({ ...p, i })).filter(p => p.label) : [];
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="en font-bold leading-none flex items-end" aria-label={`${s} ${numWords(value)}`}>
        {Array.from(s).map((ch, i) => {
          const pi = partOf(i);
          const isHi = hi && i >= hi[0] && i < hi[1];
          const isActive = active >= 0 && pi === active;
          const tone = isHi ? 'text-brand-700 bg-brand-100 rounded-xl'
            : isActive ? `${PART_TONE[pi % PART_TONE.length]} ${PART_BG[pi % PART_BG.length]} rounded-xl scale-110`
              : colored && pi >= 0 ? PART_TONE[pi % PART_TONE.length] : ch === ',' ? 'text-slate-400' : 'text-slate-900';
          return <span key={i} className={`inline-block px-[0.04em] transition-all duration-200 ${tone}`}>{ch}</span>;
        })}
      </div>
      {tags.length > 0 && (
        <div className="flex gap-2 mt-2 flex-wrap justify-center">
          {tags.map(t => (
            <span key={t.i} className={`en text-sm px-2.5 py-1 rounded-lg ${PART_BG[t.i % PART_BG.length]} ${PART_TONE[t.i % PART_TONE.length]}`}>
              {s.slice(t.range[0], t.range[1])} → {t.label}
            </span>
          ))}
        </div>
      )}
      {words && <div className="en text-base font-medium text-slate-500 mt-2 break-words text-center">{numWords(value)}</div>}
    </div>
  );
}

/** 보통 듣기 */
export const sayNumber = (n: number) => speak(numWords(n));

/** 천천히 듣기: 덩어리로 끊어 읽으며 setActive로 지금 읽는 덩어리를 알려 줌 */
export function sayNumberSlow(n: number, setActive?: (i: number) => void) {
  const parts = numberParts(n);
  speakParts(parts.map(p => p.text), i => setActive?.(i));
}
