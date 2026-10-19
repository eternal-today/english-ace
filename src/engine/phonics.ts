/**
 * 소리 탐정 — 판 만들기, 묶음 열기. 문제 모양은 오늘의 한 마디·주제 여행과 같음(PQuestion) → 같은 풀이 화면.
 * pfirst 단어를 듣고 어떤 글자로 시작하는지 고르기 (P1)
 * pmatch 글자를 보고 그 소리로 시작하는 그림 고르기 (P2, 그림을 누르면 단어 소리)
 * pcase  큰 글자를 보고 짝이 되는 작은 글자 고르기
 */
import { Card, Config } from '../types';
import { GROUPS, LETTERS, LETTER_BY_ID, LOOKALIKE, Letter, PhWord, SAME_SOUND, letterSay } from '../data/phonics';
import { POption, PQuestion, PType } from './phrases';
import { dayIndex } from './srs';
import { shuffle } from './numbers';

export const letterCard = (id: string) => 'l:' + id;
const pick = <T,>(l: T[]) => l[Math.floor(Math.random() * l.length)];
const LEARNED_BOX = 3;

/** 묶음 하나를 익혔는지: 글자를 모두 만났고 80% 이상이 기억 상자 3칸 이상 */
function groupLearned(cards: Record<string, Card>, letters: string[]) {
  const learned = letters.filter(l => (cards[letterCard(l)]?.box || 0) >= LEARNED_BOX).length;
  return letters.every(l => cards[letterCard(l)]) && learned / letters.length >= 0.8;
}

/** 열린 묶음 수: 앞 묶음을 익히면 다음 묶음이 열림. 부모님이 먼저 열어 줄 수도 있음 */
export function openGroups(cards: Record<string, Card>, parentOpen = 1): number {
  let n = 1;
  while (n < GROUPS.length && groupLearned(cards, GROUPS[n - 1].letters)) n++;
  return Math.min(GROUPS.length, Math.max(n, parentOpen));
}

export function groupProgress(cards: Record<string, Card>) {
  return GROUPS.map(g => ({
    ...g,
    total: g.letters.length,
    met: g.letters.filter(l => cards[letterCard(l)]).length,
    learned: g.letters.filter(l => (cards[letterCard(l)]?.box || 0) >= LEARNED_BOX).length,
    done: g.letters.every(l => (cards[letterCard(l)]?.box || 0) >= LEARNED_BOX),   // 소리 도감 도장
  }));
}

export const poolLetters = (open: number) => GROUPS.slice(0, open).flatMap(g => g.letters);

/** 보기로 쓸 다른 글자: 같은 소리 글자는 빼고, 열린 묶음에서 먼저 */
function otherLetters(id: string, pool: string[], n: number): string[] {
  const bad = new Set([id, ...(SAME_SOUND[id] || [])]);
  const inPool = shuffle(pool.filter(l => !bad.has(l)));
  const rest = shuffle(LETTERS.map(l => l.id).filter(l => !bad.has(l) && !inPool.includes(l)));
  return [...inPool, ...rest].slice(0, n);
}

const wordOpt = (w: PhWord, correct: boolean, l: Letter): POption => ({
  key: correct ? 'ok' : 'w' + w.word, text: w.word, correct, emoji: w.emoji, speak: w.word, sub: w.ko, after: w.word,
});
const letterOpt = (l: Letter, correct: boolean): POption => ({
  key: correct ? 'ok' : 'l' + l.id, text: l.id, correct, sub: `이름 ${l.name} · 소리 ${l.sound}`, after: `${l.upper}.`,
});

export const typesForLetter = (): PType[] => ['pfirst', 'pmatch', 'pcase'];

export function makePhonicsQuestion(id: string, type: PType, difficulty: number, pool: string[]): PQuestion | null {
  const l = LETTER_BY_ID[id];
  if (!l) return null;
  const n = difficulty === 1 ? 2 : 3;
  const base = { itemId: id, cardId: letterCard(id), menu: 'phonics' as const };
  if (type === 'pfirst') {
    const w = pick(l.words);
    const opts = [letterOpt(l, true), ...otherLetters(id, pool, n).map(o => letterOpt(LETTER_BY_ID[o], false))];
    return { ...base, type, play: w.word, emoji: w.emoji, options: shuffle(opts), answer: 'ok', fb: { ...w, letter: id } };
  }
  if (type === 'pmatch') {
    const w = pick(l.words);
    const others = otherLetters(id, pool, n).map(o => wordOpt(pick(LETTER_BY_ID[o].words), false, LETTER_BY_ID[o]));
    return { ...base, type, letter: l.id, play: `${l.upper}.`, options: shuffle([wordOpt(w, true, l), ...others]), answer: 'ok', hideText: true, fb: { ...w, letter: id } };
  }
  if (type === 'pcase') {
    const looks = shuffle(LOOKALIKE[id] || []);
    const fill = shuffle(pool.filter(x => x !== id && !looks.includes(x)));
    const rest = shuffle(LETTERS.map(x => x.id).filter(x => x !== id && !looks.includes(x) && !fill.includes(x)));
    // 쉬움: 모양이 비슷한 글자 하나만, 보통·어려움: 비슷한 글자를 더 넣음
    const mix = difficulty === 1 ? [...looks.slice(0, 1), ...fill, ...rest] : [...looks, ...fill, ...rest];
    const opts = [letterOpt(l, true), ...mix.slice(0, n).map(o => letterOpt(LETTER_BY_ID[o], false))];
    return { ...base, type, letter: l.upper, play: `${l.upper}.`, options: shuffle(opts), answer: 'ok', fb: { ...l.words[0], letter: id } };
  }
  return null;
}

/** 한 판: 복습 차례 글자 + 새 글자(두 번씩) + 이미 만난 글자로 채움. 같은 글자가 다시 나오면 다른 종류로 */
export function planPhonicsRound(config: Config, cards: Record<string, Card>, open: number): { questions: PQuestion[]; newIds: string[] } {
  const today = dayIndex();
  const ids = poolLetters(open);
  const seen = ids.filter(id => cards[letterCard(id)]);
  const unseen = ids.filter(id => !cards[letterCard(id)]);
  const newIds = unseen.slice(0, Math.max(0, config.newPerRound));
  const due = shuffle(seen.filter(id => cards[letterCard(id)].due <= today && cards[letterCard(id)].box < 5));
  const rest = shuffle(seen.filter(id => !due.includes(id)));
  const count = config.count;
  const picks: string[] = [];
  const times: Record<string, number> = {};
  const add = (id: string) => { picks.push(id); times[id] = (times[id] || 0) + 1; };
  newIds.forEach(id => { add(id); add(id); });
  due.forEach(id => { if (picks.length < count) add(id); });
  rest.forEach(id => { if (picks.length < count) add(id); });
  const all = [...newIds, ...due, ...rest];
  const maxTimes = Math.max(3, Math.ceil(count / Math.max(1, all.length)));
  let guard = 0;
  while (picks.length < count && all.length && guard++ < 500) {
    const id = all[Math.floor(Math.random() * all.length)];
    if ((times[id] || 0) < maxTimes) add(id);
  }
  const chosen = picks.slice(0, count);
  let order = shuffle(chosen);
  for (let k = 0; k < 20 && order.some((p, i) => i > 0 && order[i - 1] === p); k++) order = shuffle(chosen);
  // 아직 만나지 않은 글자는 보기로도 쓰지 않음 (처음 판에 모르는 글자가 보기로 나오지 않게) — 단, 보기 수가 모자라면 씀
  const metPool = [...new Set([...seen, ...newIds])];
  const used: Record<string, PType[]> = {};
  const met = new Set<string>();
  const dueSet = new Set(due);
  const questions: PQuestion[] = [];
  for (const id of order) {
    const first = newIds.includes(id) && !met.has(id);
    met.add(id);
    const avail = typesForLetter();
    const u = used[id] || [];
    const fresh = avail.filter(t => !u.includes(t));
    const tryOrder: PType[] = first ? ['pfirst', ...avail] : [...shuffle(fresh.length ? fresh : avail), ...avail];
    let q: PQuestion | null = null;
    for (const t of tryOrder) { q = makePhonicsQuestion(id, t, config.difficulty, metPool.length >= 4 ? metPool : ids); if (q) break; }
    if (!q) continue;
    used[id] = [...u, q.type];
    questions.push({ ...q, isNew: first, isReview: dueSet.has(id) });
  }
  return { questions, newIds };
}

/** 개념 정리 ④ 개념 확인 (별 없음): 묶음 글자로 첫소리 문제 3개 */
export function conceptCheck(groupNo: number): PQuestion[] {
  const g = GROUPS[groupNo - 1];
  return shuffle(g.letters).slice(0, 3).map(id => makePhonicsQuestion(id, 'pfirst', 1, g.letters)!).filter(Boolean);
}

export { letterSay };
