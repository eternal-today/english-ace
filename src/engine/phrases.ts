/**
 * 오늘의 한 마디 — 판 만들기, 단계 자동 열기
 * 문제는 "엉뚱한 대답 찾기": 보기 가운데 어울리지 않는 하나를 고름. 나머지는 모두 맞는 대답.
 */
import { Card, Config, Question } from '../types';
import { Fill, MAX_LEVEL, PHRASES, PhraseItem, fill, koFilled } from '../data/phrases';
import { dayIndex } from './srs';
import { shuffle } from './numbers';

/**
 * 문제 종류 (같은 상황이 한 판에 다시 나오면 다른 종류로 냄)
 * odd     엉뚱한 대답 찾기: 맞는 대답 2~3개 + 엉뚱한 대답 1개
 * scene   언제 하는 말일까: 표현을 듣고 상황 그림 고르기
 * meaning 무슨 뜻일까: 표현을 듣고 한국어 뜻 고르기
 * reply   어떤 말에 한 대답일까: 대답을 듣고 상대가 한 말 고르기
 */
export type PType = 'odd' | 'scene' | 'meaning' | 'reply'
  | 'wlisten' | 'wsee' | 'lyric' | 'sound'   // 주제 여행 (engine/songs.ts)
  | 'pfirst' | 'pmatch' | 'pcase'             // 소리 탐정 (engine/phonics.ts)
  | 'num';                                    // 숫자 영어 (오늘의 한 판에서만, engine/daily.ts)

export interface POption {
  key: string;
  text: string;                 // 보여 줄 글 (영어 표현, 한국어 뜻, 상황 이름)
  correct: boolean;             // 이 문제의 정답 (odd에서는 엉뚱한 대답)
  speak?: string;               // 누르면 들려줄 영어 (영어 보기만)
  scene?: { emoji: string; icon?: string };   // 상황 보기의 그림
  emoji?: string;               // 주제 여행·소리 탐정: 단어 그림
  sub?: string;                 // 답한 뒤 보기 아래에 보여 줄 짧은 설명
  after?: string;               // 답한 뒤 보기를 누르면 들려줄 영어
}
export interface PQuestion {
  type: PType;
  itemId: string;
  say?: string;
  scene?: { emoji: string; ko: string; icon?: string; name?: string };
  play?: string;            // scene·meaning·reply: 들려줄 표현
  options: POption[];
  answer: string;           // 정답 key
  isNew?: boolean;
  isReview?: boolean;
  cardId?: string;          // 기억 상자 카드 번호 (없으면 ph:itemId)
  unitId?: string;          // 주제 여행 단원
  emoji?: string;           // wsee: 보여 줄 그림
  lyric?: string;           // lyric: 빈칸이 있는 가사
  hideText?: boolean;       // 답하기 전에는 보기의 글을 숨김 (듣기 문제)
  menu?: 'phrases' | 'songs' | 'phonics' | 'numbers';   // 어느 메뉴 문제인지 (오늘의 한 판에서 섞을 때 씀)
  letter?: string;          // 소리 탐정: 크게 보여 줄 글자
  fb?: { word: string; emoji: string; ko: string; letter: string };   // 소리 탐정: 답한 뒤 보여 줄 단어
  num?: Question;           // 숫자 영어 문제 (type 'num')
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

const pick = <T,>(l: T[]) => l[Math.floor(Math.random() * l.length)];
const sceneName = (p: PhraseItem) => p.scene?.name || p.scene?.ko || '';

/** 이 상황으로 낼 수 있는 문제 종류 */
export function typesFor(item: PhraseItem, pool: PhraseItem[]): PType[] {
  const out: PType[] = ['odd', 'meaning'];
  const others = pool.filter(p => p.id !== item.id);
  if (item.scene && others.filter(p => p.scene && sceneName(p) !== sceneName(item)).length >= 2) out.push('scene');
  if (item.say && item.group !== '날씨' && item.group !== '이게 뭐야' && item.group !== '색깔' && others.filter(p => p.say && p.say !== item.say).length >= 2) out.push('reply');
  return out;
}

/** 엉뚱한 대답 찾기 */
function makeOdd(item: PhraseItem, difficulty: number): PQuestion | null {
  const size = difficulty === 1 ? 3 : 4;
  const odds = item.custom ? customOdds(item) : difficulty === 1 ? item.oddEasy : item.oddNormal;
  if (!odds.length) return null;
  const odd = pick(odds);
  const right = shuffle(item.answers).slice(0, size - 1);
  const options: POption[] = shuffle([
    ...right.map((t, i) => ({ key: `r${i}`, text: t, correct: false, speak: t })),
    { key: 'odd', text: odd, correct: true, speak: odd },
  ]);
  return { type: 'odd', itemId: item.id, say: item.say, scene: item.scene, options, answer: 'odd' };
}

/** 언제 하는 말일까: 대답 하나를 듣고 상황 고르기 (그 대답이 어울리는 다른 상황은 보기에서 뺌) */
function makeScene(item: PhraseItem, pool: PhraseItem[], difficulty: number): PQuestion | null {
  if (!item.scene) return null;
  const phrase = pick(item.answers);
  const others = shuffle(pool.filter(p => p.id !== item.id && p.scene && sceneName(p) !== sceneName(item) && !p.answers.includes(phrase)));
  const seen = new Set([sceneName(item)]);
  const wrong: PhraseItem[] = [];
  for (const p of others) { if (wrong.length >= (difficulty === 1 ? 2 : 3)) break; if (!seen.has(sceneName(p))) { seen.add(sceneName(p)); wrong.push(p); } }
  if (wrong.length < 2) return null;
  const opt = (p: PhraseItem, i: number, correct: boolean): POption => ({ key: correct ? 'ok' : `w${i}`, text: sceneName(p), correct, scene: { emoji: p.scene!.emoji, icon: p.scene!.icon } });
  return { type: 'scene', itemId: item.id, play: phrase, options: shuffle([opt(item, 0, true), ...wrong.map((p, i) => opt(p, i, false))]), answer: 'ok' };
}

/** 무슨 뜻일까: 표현을 듣고 한국어 뜻 고르기 (헷갈리지 않게 다른 묶음의 뜻으로 보기를 만듦) */
function makeMeaning(item: PhraseItem, pool: PhraseItem[], difficulty: number, f: Fill): PQuestion | null {
  const phrase = pick(item.say && Math.random() < 0.3 ? [item.say] : item.answers);
  const right = koFilled(phrase, f);
  if (!right) return null;
  const used = new Set([right]);
  const wrong: string[] = [];
  const cands = shuffle(pool.filter(p => p.group !== item.group).flatMap(p => [...(p.say ? [p.say] : []), ...p.answers]));
  for (const c of cands) {
    if (wrong.length >= (difficulty === 1 ? 2 : 3)) break;
    if (item.answers.includes(c) || c === item.say) continue;
    const k = koFilled(c, f);
    if (!k || used.has(k)) continue;
    used.add(k); wrong.push(k);
  }
  if (wrong.length < 2) return null;
  return {
    type: 'meaning', itemId: item.id, play: phrase,
    options: shuffle([{ key: 'ok', text: right, correct: true }, ...wrong.map((t, i) => ({ key: `w${i}`, text: t, correct: false }))]),
    answer: 'ok',
  };
}

/** 어떤 말에 한 대답일까: 대답을 듣고 상대가 한 말 고르기 */
function makeReply(item: PhraseItem, pool: PhraseItem[], difficulty: number): PQuestion | null {
  if (!item.say) return null;
  // 상대의 말을 그대로 따라 하는 대답(Hello! → Hello!)은 쓰지 않음
  const replies = item.answers.filter(a => a !== item.say);
  if (!replies.length) return null;
  const phrase = pick(replies);
  // 다른 묶음이고, 대답이 하나도 겹치지 않는 말만 보기로 (I'm fine.이 How are you?와 Are you okay? 둘 다에 어울리는 일을 막음)
  const shares = (p: PhraseItem) => p.answers.some(a => item.answers.includes(a));
  const says = [...new Set(shuffle(pool.filter(p => p.say && p.say !== item.say && p.group !== item.group && !shares(p) && !p.answers.includes(phrase) && p.group !== '날씨' && p.group !== '이게 뭐야').map(p => p.say!)))];
  const wrong = says.slice(0, difficulty === 1 ? 2 : 3);
  if (wrong.length < 2) return null;
  return {
    type: 'reply', itemId: item.id, play: phrase,
    options: shuffle([{ key: 'ok', text: item.say, correct: true, speak: item.say }, ...wrong.map((t, i) => ({ key: `w${i}`, text: t, correct: false, speak: t }))]),
    answer: 'ok',
  };
}

export function makePQuestion(item: PhraseItem, type: PType, pool: PhraseItem[], difficulty: number, f: Fill): PQuestion | null {
  if (type === 'scene') return makeScene(item, pool, difficulty);
  if (type === 'meaning') return makeMeaning(item, pool, difficulty, f);
  if (type === 'reply') return makeReply(item, pool, difficulty);
  return makeOdd(item, difficulty);
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
  const usedTypes: Record<string, PType[]> = {};
  const questions: PQuestion[] = [];
  for (const p of order) {
    const first = newIds.includes(p.id) && !met.has(p.id);
    met.add(p.id);
    // 처음 만난 상황은 엉뚱한 대답 찾기부터, 다시 나오면 아직 안 낸 종류를 먼저
    const avail = typesFor(p, pool);
    const used = usedTypes[p.id] || [];
    const fresh = avail.filter(t => !used.includes(t));
    const order2: PType[] = first ? ['odd', ...shuffle(avail.filter(t => t !== 'odd'))] : [...shuffle(fresh.length ? fresh : avail), ...avail];
    let q: PQuestion | null = null;
    for (const t of order2) { q = makePQuestion(p, t, pool, config.difficulty, f); if (q) break; }
    if (!q) continue;
    usedTypes[p.id] = [...used, q.type];
    questions.push({ ...q, isNew: first, isReview: dueIds.has(p.id) });
  }
  return { questions, newIds };
}
