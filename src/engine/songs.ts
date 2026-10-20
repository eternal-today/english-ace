/**
 * 주제 여행 — 판 만들기. 문제 모양은 오늘의 한 마디와 같음(PQuestion) → 같은 풀이 화면을 쓰고, 나중에 "오늘의 한 판"으로 섞기 쉬움.
 * wlisten 단어를 듣고 그림 고르기
 * wsee    그림을 보고 맞는 소리 고르기 (보기를 눌러 들어 봄)
 * lyric   가사 빈칸: 노래 한 줄을 듣고 빈칸에 들어갈 그림 고르기
 * sound   동물 소리를 듣고 누구 소리인지 고르기 (Old MacDonald)
 */
import { Card, Config } from '../types';
import { LyricLine, SONGS, SONG_BY_ID, SongUnit, WORDS, lyricSpoken } from '../data/songs';
import { POption, PQuestion, PType } from './phrases';
import { dayIndex } from './srs';
import { shuffle } from './numbers';

export const wordCard = (id: string) => 'w:' + id;
const pick = <T,>(l: T[]) => l[Math.floor(Math.random() * l.length)];

/** 보기로 쓸 다른 단어: 같은 단원에서 먼저, 모자라면 다른 단원에서 */
function distractors(unit: SongUnit, answer: string, n: number, filter0: (id: string) => boolean = id => !WORDS[id].lyricOnly): string[] {
  // 그림이 같은 단어(lamb·sheep 🐑)는 보기로 같이 내지 않음
  const filter = (id: string) => filter0(id) && WORDS[id].emoji !== WORDS[answer].emoji;
  const same = shuffle(unit.words.map(w => w.id).filter(id => id !== answer && filter(id)));
  const other = shuffle(Object.keys(WORDS).filter(id => id !== answer && !same.includes(id) && filter(id)));
  // 보기끼리도 그림이 겹치지 않게
  const seenEmoji = new Set([WORDS[answer].emoji]);
  return [...same, ...other].filter(id => !seenEmoji.has(WORDS[id].emoji) && !!seenEmoji.add(WORDS[id].emoji)).slice(0, n);
}

const opt = (id: string, correct: boolean, withSpeak = false): POption => ({
  key: correct ? 'ok' : 'w' + id, text: WORDS[id].word, correct, emoji: WORDS[id].emoji, ...(withSpeak ? { speak: WORDS[id].word } : {}),
});

export function typesForWord(unit: SongUnit, id: string): PType[] {
  const out: PType[] = WORDS[id].lyricOnly ? [] : ['wlisten', 'wsee'];
  if (unit.lyrics.some(l => l.answer === id)) out.push('lyric');
  if (WORDS[id].sound && unit.id === 'oldmac') out.push('sound');
  return out;
}

export function makeSongQuestion(unit: SongUnit, id: string, type: PType, difficulty: number): PQuestion | null {
  const n = difficulty === 1 ? 2 : 3;
  const base = { itemId: id, cardId: wordCard(id), unitId: unit.id };
  if (type === 'wlisten') {
    return { ...base, type, play: WORDS[id].word, options: shuffle([opt(id, true), ...distractors(unit, id, n).map(d => opt(d, false))]), answer: 'ok', hideText: true };
  }
  if (type === 'wsee') {
    return { ...base, type, emoji: WORDS[id].emoji, options: shuffle([opt(id, true, true), ...distractors(unit, id, n).map(d => opt(d, false, true))]), answer: 'ok', hideText: true };
  }
  if (type === 'lyric') {
    const lines = unit.lyrics.filter(l => l.answer === id);
    if (!lines.length) return null;
    const line: LyricLine = pick(lines);
    return { ...base, type, lyric: line.text, play: lyricSpoken(line.text), options: shuffle([opt(id, true), ...distractors(unit, id, n).map(d => opt(d, false))]), answer: 'ok' };
  }
  if (type === 'sound') {
    const s = WORDS[id].sound;
    if (!s) return null;
    const others = distractors(unit, id, n, d => !!WORDS[d].sound);
    if (others.length < 2) return null;
    return { ...base, type, play: `${s}, ${s}!`, options: shuffle([opt(id, true), ...others.map(d => opt(d, false))]), answer: 'ok', hideText: true };
  }
  return null;
}

/** 한 판: 복습 차례 단어 + 새 단어(두 번씩) + 이미 만난 단어로 채움. 같은 단어가 다시 나오면 다른 종류로 */
export function planSongRound(config: Config, cards: Record<string, Card>, unitId: string): { questions: PQuestion[]; newIds: string[] } {
  const unit = SONG_BY_ID[unitId];
  if (!unit) return { questions: [], newIds: [] };
  const today = dayIndex();
  const ids = unit.words.map(w => w.id);
  const seen = ids.filter(id => cards[wordCard(id)]);
  const unseen = ids.filter(id => !cards[wordCard(id)]);
  const newIds = unseen.slice(0, Math.max(0, config.newPerRound));
  const due = shuffle(seen.filter(id => cards[wordCard(id)].due <= today && cards[wordCard(id)].box < 5));
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
  const used: Record<string, PType[]> = {};
  const met = new Set<string>();
  const dueSet = new Set(due);
  const questions: PQuestion[] = [];
  for (const id of order) {
    const first = newIds.includes(id) && !met.has(id);
    met.add(id);
    const avail = typesForWord(unit, id);
    const u = used[id] || [];
    const fresh = avail.filter(t => !u.includes(t));
    const tryOrder: PType[] = first ? [avail[0], ...avail] : [...shuffle(fresh.length ? fresh : avail), ...avail];
    let q: PQuestion | null = null;
    for (const t of tryOrder) { q = makeSongQuestion(unit, id, t, config.difficulty); if (q) break; }
    if (!q) continue;
    used[id] = [...u, q.type];
    questions.push({ ...q, isNew: first, isReview: dueSet.has(id) });
  }
  return { questions, newIds };
}

/**
 * 열린 노래 수: 처음 세 곡은 열려 있고, 앞 노래 단어를 80% 이상 만나면 다음 노래가 저절로 열림
 * (부모님이 일일이 열어 주지 않아도 되게. 오늘의 한 판은 노래 순서대로 새 단어를 내므로 따로 막지 않음)
 */
export function openSongCount(cards: Record<string, Card>): number {
  let n = Math.min(3, SONGS.length);   // Old MacDonald, Hey Diddle Diddle, Twinkle (아는 노래)는 처음부터
  while (n < SONGS.length) {
    const p = unitProgress(cards, SONGS[n - 1].id);
    if (p.met / p.total < 0.8) break;
    n++;
  }
  return n;
}

/** 단원 진행 (만난 단어, 익힌 단어) */
export function unitProgress(cards: Record<string, Card>, unitId: string) {
  const unit = SONG_BY_ID[unitId];
  const ids = unit.words.map(w => w.id);
  return {
    total: ids.length,
    met: ids.filter(id => cards[wordCard(id)]).length,
    learned: ids.filter(id => (cards[wordCard(id)]?.box || 0) >= 3).length,
  };
}
