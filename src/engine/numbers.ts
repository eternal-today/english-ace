/**
 * 숫자 영어 — 숫자 읽기 문장, 덩어리, 문제 만들기
 * 읽는 방식은 미국식 ("three hundred twenty-five", and 없음). 문장은 앱이 직접 만들어 TTS에 넣음.
 */
import { Card, Config, NumStage, Option, Question, QType, RoundKind } from '../types';
import { dayIndex } from './srs';

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function under100(n: number): string {
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '');
}
function under1000(n: number): string {
  const out: string[] = [];
  if (n >= 100) { out.push(ONES[Math.floor(n / 100)] + ' hundred'); n %= 100; }
  if (n > 0) out.push(under100(n));
  return out.join(' ');
}

/** 영어 읽기 문장 (0 ~ 999,999,999) */
export function numWords(n: number): string {
  if (n === 0) return 'zero';
  const parts: string[] = [];
  const m = Math.floor(n / 1e6), t = Math.floor((n % 1e6) / 1000), r = n % 1000;
  if (m) parts.push(under1000(m) + ' million');
  if (t) parts.push(under1000(t) + ' thousand');
  if (r) parts.push(under1000(r));
  return parts.join(' ');
}

/** 쉼표를 넣은 표기 (4,520) */
export const fmt = (n: number) => n.toLocaleString('en-US');

/** 끊어 읽기 덩어리: 읽을 말 + 표기에서 해당 글자 범위 + 이름표 */
export interface Part { text: string; range: [number, number]; label: '' | 'thousand' | 'hundred' }

export function numberParts(n: number): Part[] {
  const s = fmt(n);
  const len = s.length;
  const parts: Part[] = [];
  // 쉼표 덩어리: 앞 덩어리들은 "숫자 + million/thousand"로 한 번에, 마지막 세 자리는 hundred와 나머지로 나눔
  const groups = s.split(',');
  const names = ['', 'thousand', 'million'];
  let pos = 0;
  groups.forEach((g, gi) => {
    const v = Number(g);
    const name = names[groups.length - 1 - gi];
    if (gi < groups.length - 1) {
      if (v > 0) parts.push({ text: `${under1000(v)} ${name}`, range: [pos, pos + g.length], label: name === 'thousand' ? 'thousand' : '' });
      pos += g.length + 1;
    }
  });
  const r3 = n % 1000, h = Math.floor(r3 / 100), r = n % 100;
  if (n >= 100 && h > 0) parts.push({ text: ONES[h] + ' hundred', range: [len - 3, len - 2], label: 'hundred' });
  if (r > 0) {
    if (r < 10) parts.push({ text: ONES[r], range: [len - 1, len], label: '' });
    else if (r < 20 || r % 10 === 0) parts.push({ text: under100(r), range: [len - 2, len], label: '' });
    else {
      // 21~99는 십의 자리와 일의 자리로 나눠 읽음 (forty · seven)
      parts.push({ text: TENS[Math.floor(r / 10)], range: [len - 2, len - 1], label: '' });
      parts.push({ text: ONES[r % 10], range: [len - 1, len], label: '' });
    }
  }
  if (!parts.length) parts.push({ text: numWords(n), range: [0, len], label: '' });
  return parts;
}

// ─────────────────────────────────────────────
// 단계
// ─────────────────────────────────────────────
export interface StageInfo { id: NumStage; name: string; range: [number, number]; concept: string; desc: string }
export const STAGES: StageInfo[] = [
  { id: 'n100', name: '1 ~ 100', range: [1, 100], concept: 'teen', desc: '이미 아는 숫자로 몸풀기' },
  { id: 'n999', name: '100 ~ 999', range: [100, 999], concept: 'hundred', desc: 'hundred 읽기' },
  { id: 'n9999', name: '1,000 ~ 9,999', range: [1000, 9999], concept: 'comma', desc: '쉼표는 thousand' },
];
export const STAGE_BY_ID = Object.fromEntries(STAGES.map(s => [s.id, s])) as Record<NumStage, StageInfo>;

const rand = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const TEEN_TY: Record<number, number> = { 13: 30, 14: 40, 15: 50, 16: 60, 17: 70, 18: 80, 19: 90, 30: 13, 40: 14, 50: 15, 60: 16, 70: 17, 80: 18, 90: 19 };
export const TEEN_TY_PAIRS = [13, 14, 15, 16, 17, 18, 19].map(a => [a, TEEN_TY[a]] as [number, number]);

/** 단계 안에서 숫자 하나 고르기. 큰 수는 가끔 0이 든 수(4,020 / 305)를 섞음 */
export function randomIn(stage: NumStage): number {
  const [lo, hi] = STAGE_BY_ID[stage].range;
  if (stage === 'n100' && Math.random() < 0.3) return [13, 14, 15, 16, 17, 18, 19, 30, 40, 50, 60, 70, 80, 90][rand(0, 13)];
  if (stage !== 'n100' && Math.random() < 0.2) {
    const n = rand(lo, hi);
    const s = String(n).split('');
    s[s.length - 2] = '0';                 // 십의 자리를 0으로 (305, 4,207)
    if (Math.random() < 0.5 && s.length >= 3) s[s.length - 3] = '0';   // 백의 자리도 0으로 (4,007)
    const v = Number(s.join(''));
    return v >= lo ? v : n;
  }
  return rand(lo, hi);
}

/** 헷갈리기 쉬운 숫자들 (자리 바꾸기, -teen/-ty, 한 자리만 바꾸기) */
export function similarTo(n: number, stage: NumStage): number[] {
  const [lo, hi] = STAGE_BY_ID[stage].range;
  const out = new Set<number>();
  const s = String(n);
  const last2 = n % 100;
  if (TEEN_TY[last2]) out.add(n - last2 + TEEN_TY[last2]);
  for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) {
    const a = s.split(''); [a[i], a[j]] = [a[j], a[i]];
    if (a[0] !== '0') out.add(Number(a.join('')));
  }
  for (let i = 0; i < s.length; i++) for (const d of [-1, 1]) {
    const a = s.split('');
    const v = Number(a[i]) + d;
    if (v < 0 || v > 9 || (i === 0 && v === 0)) continue;
    a[i] = String(v);
    out.add(Number(a.join('')));
  }
  out.delete(n);
  return shuffle([...out].filter(v => v >= lo && v <= hi));
}

function farFrom(n: number, stage: NumStage, avoid: Set<number>): number {
  const near = new Set(similarTo(n, stage));
  for (let k = 0; k < 40; k++) {
    const v = randomIn(stage);
    if (v !== n && !avoid.has(v) && !near.has(v)) return v;
  }
  for (let k = 0; k < 40; k++) { const v = randomIn(stage); if (v !== n && !avoid.has(v)) return v; }
  return n + avoid.size + 1;
}

/** 보기 숫자: 쉬움 3개(먼 숫자), 보통 4개(비슷한 것 2개쯤), 어려움 4개(모두 비슷한 것) */
export function numberOptions(n: number, stage: NumStage, difficulty: number, forceSimilar = 0): number[] {
  const size = difficulty === 1 ? 3 : 4;
  const wantSimilar = Math.max(forceSimilar, difficulty === 1 ? 0 : difficulty === 2 ? 2 : 3);
  const picked = new Set<number>([n]);
  for (const v of similarTo(n, stage)) { if (picked.size - 1 >= wantSimilar) break; picked.add(v); }
  while (picked.size < size) picked.add(farFrom(n, stage, picked));
  return shuffle([...picked]);
}

const PLACE_LABEL: Record<string, string> = { thousand: 'thousand', hundred: 'hundred', none: '아무것도 안 붙어요' };
export const placeLabel = (k: string) => PLACE_LABEL[k] || k;

function placeQuestion(n: number, stage: NumStage, id: string): Question | null {
  const parts = numberParts(n);
  const choices: { key: string; range: [number, number] }[] = [];
  for (const p of parts) {
    if (p.label === 'thousand' || p.label === 'hundred') choices.push({ key: p.label, range: p.range });
  }
  const s = fmt(n);
  if (n % 100 >= 10) choices.push({ key: 'none', range: [s.length - 2, s.length] });
  if (!choices.length) return null;
  const c = choices[Math.floor(Math.random() * choices.length)];
  return {
    type: 'place', id, value: n, hi: c.range, answer: c.key,
    options: shuffle(['thousand', 'hundred', 'none']).map(k => ({ key: k, label: placeLabel(k) })),
  };
}

export function makeQuestion(type: QType, n: number, stage: NumStage, difficulty: number, forceSimilar = 0): Question | null {
  const id = `${stage}:${n}`;
  if (type === 'place') return stage === 'n100' ? null : placeQuestion(n, stage, id);
  const opts: Option[] = numberOptions(n, stage, difficulty, forceSimilar).map(v => ({ key: String(v), label: fmt(v) }));
  return { type, id, value: n, options: opts, answer: String(n) };
}

/** 한 판 만들기: 복습 차례인 숫자(전에 틀렸거나 힌트로 맞힌 것) + 새 숫자 */
export function planRound(config: Config, cards: Record<string, Card>, stage: NumStage, kind: RoundKind): Question[] {
  if (kind === 'check') {
    // 1~100 확인: 듣고 고르기 10문제, -teen/-ty 쌍을 3개 넣음
    const pairs = shuffle(TEEN_TY_PAIRS).slice(0, 3).map(([a, b]) => (Math.random() < 0.5 ? a : b));
    const used = new Set<number>(pairs);
    while (used.size < 10) used.add(rand(1, 100));
    return shuffle([...used]).map(n => makeQuestion('listen', n, 'n100', 2, TEEN_TY[n] ? 1 : 0)!);
  }
  const count = config.count;
  const today = dayIndex();
  const due = shuffle(Object.entries(cards).filter(([id, c]) => id.startsWith(stage + ':') && c.due <= today && c.box < 5))
    .slice(0, Math.floor(count * 0.7))
    .map(([id]) => Number(id.split(':')[1]));
  const values = [...due];
  const seen = new Set(values);
  let guard = 0;
  while (values.length < count && guard++ < 500) {
    const v = randomIn(stage);
    if (!seen.has(v)) { seen.add(v); values.push(v); }
  }
  const types: QType[] = [];
  if (config.modes.listen) types.push('listen', 'listen');
  if (config.modes.say) types.push('say');
  if (config.modes.place && stage !== 'n100') types.push('place');
  if (!types.length) types.push('listen');
  const dueSet = new Set(due);
  const qs: Question[] = [];
  for (const v of shuffle(values)) {
    let q: Question | null = null;
    for (let k = 0; k < 4 && !q; k++) q = makeQuestion(types[Math.floor(Math.random() * types.length)], v, stage, config.difficulty);
    if (!q) q = makeQuestion('listen', v, stage, config.difficulty);
    if (q) qs.push({ ...q, isReview: dueSet.has(v) });
  }
  return qs;
}

/** 문제를 짧은 글로 (기록용) */
export function questionText(q: Question): string {
  if (q.type === 'listen') return `듣고 고르기 · ${numWords(q.value)}`;
  if (q.type === 'say') return `소리 고르기 · ${fmt(q.value)}`;
  const s = fmt(q.value);
  return `붙는 말 · ${s.slice(0, q.hi![0])}[${s.slice(q.hi![0], q.hi![1])}]${s.slice(q.hi![1])}`;
}
export function answerText(q: Question): string {
  if (q.type === 'place') return placeLabel(q.answer);
  return `${fmt(q.value)} ${numWords(q.value)}`;
}
export function shownAnswer(q: Question, key: string): string {
  if (q.type === 'place') return placeLabel(key);
  return fmt(Number(key));
}
