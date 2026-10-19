/**
 * 오늘의 한 마디 — 판 만들기, 단계 자동 열기
 * 문제는 "엉뚱한 대답 찾기": 보기 가운데 어울리지 않는 하나를 고름. 나머지는 모두 맞는 대답.
 */
import { Card, Config } from '../types';
import { Fill, MAX_LEVEL, PHRASES, PhraseItem, fill } from '../data/phrases';
import { dayIndex } from './srs';
import { shuffle } from './numbers';

export interface POption { key: string; text: string; odd: boolean }
export interface PQuestion {
  itemId: string;
  say?: string;
  scene?: { emoji: string; ko: string };
  options: POption[];
  answer: string;          // 엉뚱한 대답의 key
  isNew?: boolean;
  isReview?: boolean;
}

/** {name} {age}를 채운 상황. 채울 수 없는 대답은 빼고, 대답이 하나도 안 남으면 null */
export function resolve(item: PhraseItem, f: Fill): PhraseItem | null {
  const answers = item.answers.map(a => fill(a, f)).filter((a): a is string => !!a);
  if (!answers.length) return null;
  const odd = (l: string[]) => l.map(a => fill(a, f)).filter((a): a is string => !!a && !answers.includes(a));
  return { ...item, answers, oddEasy: odd(item.oddEasy), oddNormal: odd(item.oddNormal) };
}

/** 영어 문장에는 영어로 쓴 이름을 씀 (한글 이름은 영어 목소리가 읽지 못함) */
export const fillOf = (c: Config): Fill => ({ name: c.childNameEn || '', age: c.childAge || 0 });

/** 부모님이 넣은 표현 + 기본 표현 */
export function allItems(custom: PhraseItem[]): PhraseItem[] {
  return [...PHRASES, ...custom];
}

/** 지금 열린 단계: 앞 단계 상황의 80% 이상이 기억 상자 3칸 이상이면 다음 단계가 열림 */
export function openLevel(cards: Record<string, Card>, f: Fill): number {
  let lv = 1;
  while (lv < MAX_LEVEL) {
    const items = PHRASES.filter(p => p.level === lv && resolve(p, f));
    if (!items.length) { lv++; continue; }
    const learned = items.filter(p => (cards['ph:' + p.id]?.box || 0) >= 3).length;
    if (learned / items.length < 0.8) break;
    lv++;
  }
  return lv;
}

/** 단계별 진행 (부모 화면·메뉴 화면용) */
export function levelProgress(cards: Record<string, Card>, f: Fill) {
  const out: { level: number; total: number; met: number; learned: number }[] = [];
  for (let lv = 1; lv <= MAX_LEVEL; lv++) {
    const items = PHRASES.filter(p => p.level === lv && resolve(p, f));
    out.push({
      level: lv, total: items.length,
      met: items.filter(p => cards['ph:' + p.id]).length,
      learned: items.filter(p => (cards['ph:' + p.id]?.box || 0) >= 3).length,
    });
  }
  return out;
}

/** 지금 나올 수 있는 상황 (열린 단계 + 부모님이 넣은 표현) */
export function poolItems(custom: PhraseItem[], level: number, f: Fill): PhraseItem[] {
  return allItems(custom).filter(p => p.custom || p.level <= level).map(p => resolve(p, f)).filter((p): p is PhraseItem => !!p);
}

/** 부모님이 넣은 표현의 엉뚱한 대답: 기본 표현의 대답 가운데 이 상황의 대답과 겹치지 않는 것 */
function customOdds(item: PhraseItem): string[] {
  const own = new Set(item.answers.map(a => a.toLowerCase()));
  const pool = [...new Set(PHRASES.filter(p => p.level === 1).flatMap(p => p.answers))].filter(a => !own.has(a.toLowerCase()));
  return shuffle(pool).slice(0, 6);
}

/** 문제 하나: 맞는 대답 2~3개 + 엉뚱한 대답 1개 */
export function makePQuestion(item: PhraseItem, difficulty: number): PQuestion | null {
  const size = difficulty === 1 ? 3 : 4;
  const odds = item.custom ? customOdds(item) : difficulty === 1 ? item.oddEasy : item.oddNormal;
  if (!odds.length) return null;
  const odd = odds[Math.floor(Math.random() * odds.length)];
  const right = shuffle(item.answers).slice(0, size - 1);
  const options: POption[] = shuffle([
    ...right.map((t, i) => ({ key: `r${i}`, text: t, odd: false })),
    { key: 'odd', text: odd, odd: true },
  ]);
  return { itemId: item.id, say: item.say, scene: item.scene, options, answer: 'odd' };
}

/**
 * 한 판: 복습 차례인 상황 + 새 상황(설정의 "새로 나오는 것" 수) + 이미 만난 상황으로 채움.
 * 처음 며칠은 만난 상황이 적어서 같은 상황이 다른 보기로 두세 번 나올 수 있음.
 */
export function planPRound(config: Config, cards: Record<string, Card>, custom: PhraseItem[], level: number): { questions: PQuestion[]; newIds: string[] } {
  const f = fillOf(config);
  const pool = poolItems(custom, level, f);
  const today = dayIndex();
  const count = config.count;
  const seen = pool.filter(p => cards['ph:' + p.id]);
  const unseen = pool.filter(p => !cards['ph:' + p.id]);
  // 새 상황은 단계 순서대로 (부모님이 넣은 표현을 먼저)
  unseen.sort((a, b) => (a.custom === b.custom ? a.level - b.level : a.custom ? -1 : 1));
  const newItems = unseen.slice(0, Math.max(0, config.newPerRound));
  const due = shuffle(seen.filter(p => cards['ph:' + p.id].due <= today && cards['ph:' + p.id].box < 5));
  const rest = shuffle(seen.filter(p => !due.includes(p)));

  const picks: PhraseItem[] = [];
  const times: Record<string, number> = {};
  const add = (p: PhraseItem) => { picks.push(p); times[p.id] = (times[p.id] || 0) + 1; };
  newItems.forEach(p => { add(p); add(p); });                // 새 상황은 두 번씩
  due.slice(0, count).forEach(add);
  rest.forEach(p => { if (picks.length < count) add(p); });
  const all = [...newItems, ...due, ...rest];
  const maxTimes = Math.max(3, Math.ceil(count / Math.max(1, all.length)));
  let guard = 0;
  while (picks.length < count && all.length && guard++ < 500) {
    const p = all[Math.floor(Math.random() * all.length)];
    if ((times[p.id] || 0) < maxTimes) add(p);
  }
  const chosen = picks.slice(0, count);
  // 같은 상황이 연달아 나오지 않게 섞음
  let order = shuffle(chosen);
  for (let k = 0; k < 20 && order.some((p, i) => i > 0 && order[i - 1].id === p.id); k++) order = shuffle(chosen);
  const newIds = newItems.map(p => p.id);
  const dueIds = new Set(due.map(p => p.id));
  const met = new Set<string>();
  const questions: PQuestion[] = [];
  for (const p of order) {
    const q = makePQuestion(p, config.difficulty);
    if (!q) continue;
    const first = newIds.includes(p.id) && !met.has(p.id);
    met.add(p.id);
    questions.push({ ...q, isNew: first, isReview: dueIds.has(p.id) });
  }
  return { questions, newIds };
}
