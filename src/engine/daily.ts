/**
 * 오늘의 한 판 — 모든 메뉴의 복습 차례·새 문제를 섞은 한 판 (한자 에이스의 "오늘의 한 판"과 같은 자리)
 *
 * 구성 (2026-10-19 정함)
 *  - 섞는 메뉴: 오늘의 한 마디 · 주제 여행(모든 노래) · 소리 탐정 + 숫자 영어 조금
 *  - 숫자 영어: 1~100 확인을 통과한 뒤부터, 한 판의 20% 이내 (10문제면 2문제). 틀렸거나 힌트 본 숫자 복습을 먼저
 *  - 새로 나오는 것: 판 전체에서 "한 판에 새로 나오는 것" 개수만큼, 메뉴를 돌아가며 (소리 탐정 → 한 마디 → 노래 단어)
 *    새 것은 문제 전에 카드로 소개하고 한 판에서 두 번씩 나옴
 *  - 그다음 복습 차례(기억 상자 칸이 낮은 것부터), 남으면 이미 만난 것으로 채움. 메뉴를 돌아가며 골라 한쪽으로 쏠리지 않게 함
 *  - 소리 탐정의 새 글자는 개념 정리를 본 묶음에서만 나옴
 */
import { Card, Config, NumStage, Progress, QType } from '../types';
import { PhraseItem } from '../data/phrases';
import { SONGS, SongUnit } from '../data/songs';
import { GROUPS } from '../data/phonics';
import { PQuestion, PType, fillOf, makePQuestion, openLevel, poolItems, typesFor } from './phrases';
import { makeSongQuestion, typesForWord, wordCard } from './songs';
import { letterCard, makePhonicsQuestion, openGroups, poolLetters, typesForLetter } from './phonics';
import { makeQuestion, numWords, questionText, randomIn, shuffle } from './numbers';
import { dayIndex } from './srs';

type Menu = 'phonics' | 'phrases' | 'songs';
const MENU_ORDER: Menu[] = ['phonics', 'phrases', 'songs'];

interface Entry { menu: Menu; id: string; card: string; unit?: SongUnit; item?: PhraseItem }

export interface DailyState { config: Config; cards: Record<string, Card>; custom: PhraseItem[]; progress: Progress; preview: boolean }

/** 메뉴별로 낼 수 있는 것 (새 것은 메뉴 안의 순서대로) */
function entries(s: DailyState) {
  const f = fillOf(s.config);
  const level = s.preview ? 99 : openLevel(s.cards, f);
  const pool = poolItems(s.custom, level, f);
  const phrases: Entry[] = pool
    .slice().sort((a, b) => (a.custom === b.custom ? a.level - b.level : a.custom ? -1 : 1))
    .map(p => ({ menu: 'phrases', id: p.id, card: 'ph:' + p.id, item: p }));
  const seenWord = new Set<string>();
  const songs: Entry[] = [];
  for (const u of SONGS) for (const w of u.words) {
    if (seenWord.has(w.id)) continue;
    seenWord.add(w.id);
    songs.push({ menu: 'songs', id: w.id, card: wordCard(w.id), unit: u });
  }
  // 가사 빈칸으로만 낼 수 있는 단어(farm)는 새 단어로 뒤에 (그림 문제로 낼 수 없어서 한 판이 단조로워짐)
  songs.sort((a, b) => Number(!!a.unit!.words.find(w => w.id === a.id)!.lyricOnly) - Number(!!b.unit!.words.find(w => w.id === b.id)!.lyricOnly));
  const open = s.preview ? GROUPS.length : openGroups(s.cards, s.progress.phonicsOpen);
  const conceptOk = (l: string) => s.preview || GROUPS.some(g => g.letters.includes(l) && s.progress.concepts.includes('ph-g' + g.no));
  const letters = poolLetters(open);
  const phonics: Entry[] = letters.map(l => ({ menu: 'phonics', id: l, card: letterCard(l) }));
  return { byMenu: { phonics, phrases, songs } as Record<Menu, Entry[]>, phrasePool: pool, letters, conceptOk };
}

/** 메뉴를 돌아가며 하나씩 꺼냄 */
function roundRobin(lists: Entry[][], n: number): Entry[] {
  const qs = lists.map(l => l.slice());
  const out: Entry[] = [];
  while (out.length < n && qs.some(l => l.length)) {
    for (const l of qs) { if (out.length >= n) break; const e = l.shift(); if (e) out.push(e); }
  }
  return out;
}

/** 숫자 영어 칸 수 */
export const numberSlots = (s: DailyState) => (s.progress.numCheck || s.preview ? Math.max(1, Math.floor(s.config.count * 0.2)) : 0);

function numberQuestions(s: DailyState, n: number): PQuestion[] {
  if (n <= 0) return [];
  const today = dayIndex();
  const stages: NumStage[] = ['n100'];
  if (s.preview || s.progress.concepts.includes('hundred')) stages.push('n999');
  if (s.preview || s.progress.concepts.includes('comma')) stages.push('n9999');
  const due = shuffle(Object.entries(s.cards).filter(([id, c]) => /^n\d+:/.test(id) && c.due <= today && c.box < 5))
    .sort((a, b) => a[1].box - b[1].box).slice(0, n)
    .map(([id]) => ({ stage: id.split(':')[0] as NumStage, value: Number(id.split(':')[1]), review: true }));
  const picks = [...due];
  let guard = 0;
  while (picks.length < n && guard++ < 50) {
    const stage = stages[Math.floor(Math.random() * stages.length)];
    const value = randomIn(stage);
    if (!picks.some(p => p.value === value)) picks.push({ stage, value, review: false });
  }
  const types: QType[] = [];
  if (s.config.modes.listen) types.push('listen', 'listen');
  if (s.config.modes.say) types.push('say');
  if (s.config.modes.place) types.push('place');
  if (!types.length) types.push('listen');
  const out: PQuestion[] = [];
  for (const p of picks) {
    let q = null;
    for (let k = 0; k < 4 && !q; k++) q = makeQuestion(types[Math.floor(Math.random() * types.length)], p.value, p.stage, s.config.difficulty);
    if (!q) q = makeQuestion('listen', p.value, p.stage, s.config.difficulty);
    if (!q) continue;
    out.push({
      type: 'num', menu: 'numbers', itemId: String(p.value), cardId: q.id, num: q, answer: q.answer, isReview: p.review,
      ...(q.type === 'listen' ? { play: numWords(p.value) } : {}),
      options: q.options.map(o => ({ key: o.key, text: o.label, correct: o.key === q!.answer })),
    });
  }
  return out;
}

export function planDailyRound(s: DailyState): { questions: PQuestion[]; newIds: string[] } {
  const today = dayIndex();
  const { byMenu, phrasePool, letters, conceptOk } = entries(s);
  const nNum = numberSlots(s);
  const count = Math.max(1, s.config.count - nNum);

  // 새 것: 메뉴를 돌아가며 (소리 탐정의 새 글자는 개념 정리를 본 묶음에서만)
  const unseen = MENU_ORDER.map(m => byMenu[m].filter(e => !s.cards[e.card] && (m !== 'phonics' || conceptOk(e.id))));
  const nNew = Math.min(Math.max(0, s.config.newPerRound), Math.ceil(count / 2));
  const fresh = roundRobin(unseen, nNew);
  // 복습 차례: 칸이 낮은 것부터, 메뉴를 돌아가며
  const dueLists = MENU_ORDER.map(m => shuffle(byMenu[m].filter(e => s.cards[e.card] && s.cards[e.card].due <= today && s.cards[e.card].box < 5))
    .sort((a, b) => s.cards[a.card].box - s.cards[b.card].box));
  const restLists = MENU_ORDER.map(m => shuffle(byMenu[m].filter(e => s.cards[e.card] && !(s.cards[e.card].due <= today && s.cards[e.card].box < 5))));

  const picks: Entry[] = [];
  const times: Record<string, number> = {};
  const add = (e: Entry) => { picks.push(e); times[e.card] = (times[e.card] || 0) + 1; };
  fresh.forEach(e => { add(e); add(e); });
  const due = roundRobin(dueLists, Math.max(0, count - picks.length));
  due.forEach(add);
  roundRobin(restLists, Math.max(0, count - picks.length)).forEach(add);
  // 그래도 모자라면 (처음 며칠) 이미 고른 것을 한 번 더
  const all = [...new Map(picks.map(e => [e.card, e])).values()];
  let guard = 0;
  while (picks.length < count && all.length && guard++ < 300) {
    const e = all[Math.floor(Math.random() * all.length)];
    if ((times[e.card] || 0) < 3) add(e);
  }

  const chosen = picks.slice(0, count);
  const dueSet = new Set(due.map(e => e.card));
  const newCards = fresh.map(e => e.card);
  const met = new Set<string>();
  const used: Record<string, PType[]> = {};
  const metLetters = letters.filter(l => s.cards[letterCard(l)] || newCards.includes(letterCard(l)));
  const f = fillOf(s.config);

  const make = (e: Entry, first: boolean): PQuestion | null => {
    const u = used[e.card] || [];
    let avail: PType[];
    let firstType: PType;
    if (e.menu === 'phrases') { avail = typesFor(e.item!, phrasePool); firstType = 'odd'; }
    else if (e.menu === 'songs') { avail = typesForWord(e.unit!, e.id); firstType = avail[0]; }
    else { avail = typesForLetter(); firstType = 'pfirst'; }
    const freshT = avail.filter(t => !u.includes(t));
    const order: PType[] = first ? [firstType, ...avail] : [...shuffle(freshT.length ? freshT : avail), ...avail];
    for (const t of order) {
      const q = e.menu === 'phrases' ? makePQuestion(e.item!, t, phrasePool, s.config.difficulty, f)
        : e.menu === 'songs' ? makeSongQuestion(e.unit!, e.id, t, s.config.difficulty)
          : makePhonicsQuestion(e.id, t, s.config.difficulty, metLetters.length >= 4 ? metLetters : letters);
      if (q) { used[e.card] = [...u, q.type]; return { ...q, menu: e.menu, cardId: e.card }; }
    }
    return null;
  };

  // 새 것의 첫 등장은 앞쪽에, 나머지는 같은 것이 붙어 나오지 않게 펼침
  // (남은 횟수가 많은 것부터 앞과 다른 것을 골라 놓음 → 끝에 같은 것이 몰리지 않음)
  const head = shuffle(fresh).filter(e => chosen.includes(e));
  const rest = shuffle(chosen.slice());
  for (const e of head) { const k = rest.indexOf(e); if (k >= 0) rest.splice(k, 1); }
  const ordered: Entry[] = [...head];
  while (rest.length) {
    const prev = ordered.length ? ordered[ordered.length - 1].card : '';
    const left: Record<string, number> = {};
    rest.forEach(e => { left[e.card] = (left[e.card] || 0) + 1; });
    const cands = rest.filter(e => e.card !== prev);
    if (!cands.length) { ordered.push(rest.shift()!); continue; }
    const most = Math.max(...cands.map(e => left[e.card]));
    const pickE = cands.find(e => left[e.card] === most)!;
    rest.splice(rest.indexOf(pickE), 1);
    ordered.push(pickE);
  }

  const questions: PQuestion[] = [];
  for (const e of ordered) {
    const first = newCards.includes(e.card) && !met.has(e.card);
    met.add(e.card);
    const q = make(e, first);
    if (q) questions.push({ ...q, isNew: first, isReview: dueSet.has(e.card) });
  }
  // 숫자 문제는 앞쪽 새 것 소개가 끝난 뒤 사이사이에 끼움
  const nums = numberQuestions(s, nNum);
  for (const nq of nums) {
    const at = Math.min(questions.length, head.length + Math.floor(Math.random() * Math.max(1, questions.length - head.length + 1)));
    questions.splice(at, 0, nq);
  }
  return { questions, newIds: newCards };
}

/** 홈 화면 안내용: 복습 차례 수와 새로 만날 수 있는 것이 있는지 */
export function dailyStatus(s: DailyState) {
  const today = dayIndex();
  const { byMenu, conceptOk } = entries(s);
  const list = MENU_ORDER.flatMap(m => byMenu[m]);
  const due = list.filter(e => s.cards[e.card] && s.cards[e.card].due <= today && s.cards[e.card].box < 5).length
    + Object.entries(s.cards).filter(([id, c]) => /^n\d+:/.test(id) && c.due <= today && c.box < 5).length;
  const unseen = list.filter(e => !s.cards[e.card] && (e.menu !== 'phonics' || conceptOk(e.id))).length;
  return { due, unseen };
}

export { questionText };
