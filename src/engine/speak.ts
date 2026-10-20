/**
 * 따라 말하기 (놀이터 메뉴) — 한 번에 5개, 하루 횟수와 같은 문장 녹음 횟수를 제한
 *  - 고르는 순서: 오늘 처음 만난 것 → 틀렸던 것 → 아직 녹음 안 한 것 → 나머지
 *  - 오늘의 한 마디는 아이가 하는 말(맞는 대답 첫 번째), 노래는 단어
 *  - 별 없음
 */
import { Card } from '../types';
import { PhraseItem } from '../data/phrases';
import { WORDS } from '../data/songs';
import { allItems, fillOf, resolve } from './phrases';
import { koFilled } from '../data/phrases';
import { dayIndex } from './srs';
import { Config } from '../types';

export const PER_SESSION = 5;
export const PER_TEXT = 3;          // 같은 문장은 하루 3번까지 녹음

export interface SpeakItem { key: string; text: string; ko: string; emoji?: string; kind: 'phrase' | 'word' }

interface Log { day: number; sessions: number; counts: Record<string, number> }
const KEY = 'english_speak_log';

function readLog(): Log {
  const today = dayIndex();
  try {
    const l = JSON.parse(localStorage.getItem(KEY) || 'null') as Log | null;
    if (l && l.day === today) return { day: today, sessions: l.sessions || 0, counts: l.counts || {} };
  } catch { /* 없음 */ }
  return { day: today, sessions: 0, counts: {} };
}
function writeLog(l: Log) { try { localStorage.setItem(KEY, JSON.stringify(l)); } catch { /* 무시 */ } }

export const sessionsToday = () => readLog().sessions;
export function startSession() { const l = readLog(); l.sessions += 1; writeLog(l); }
export const recordsToday = (text: string) => readLog().counts[text] || 0;
export function countRecord(text: string) { const l = readLog(); l.counts[text] = (l.counts[text] || 0) + 1; writeLog(l); }

/** 따라 말할 거리 고르기 */
export function pickSpeakItems(config: Config, cards: Record<string, Card>, custom: PhraseItem[], recorded: Set<string>, n = PER_SESSION): SpeakItem[] {
  const f = fillOf(config);
  const today = dayIndex();
  const pool: { item: SpeakItem; card: Card }[] = [];
  for (const p of allItems(custom)) {
    const card = cards['ph:' + p.id];
    if (!card) continue;
    const r = resolve(p, f);
    if (!r) continue;
    const text = r.answers[0];
    pool.push({ item: { key: 'ph:' + p.id, text, ko: koFilled(text, f), emoji: p.scene && !p.scene.icon ? p.scene.emoji : undefined, kind: 'phrase' }, card });
  }
  for (const [id, w] of Object.entries(WORDS)) {
    const card = cards['w:' + id];
    if (!card) continue;
    pool.push({ item: { key: 'w:' + id, text: w.word, ko: w.ko, emoji: w.emoji, kind: 'word' }, card });
  }
  const isNewToday = (c: Card) => c.seen <= 2 && dayIndex(c.last) === today;
  const score = (x: { item: SpeakItem; card: Card }) =>
    (isNewToday(x.card) ? 0 : x.card.wrong > 0 && x.card.box <= 2 ? 1 : !recorded.has(x.item.text) ? 2 : 3) * 1e13 - x.card.last;
  const usable = pool.filter(x => recordsToday(x.item.text) < PER_TEXT);
  const sorted = usable.sort((a, b) => score(a) - score(b));
  // 표현과 단어가 섞이게: 앞에서부터 고르되 같은 종류가 셋 넘게 이어지지 않게
  const out: SpeakItem[] = [];
  const rest = sorted.map(x => x.item);
  while (out.length < n && rest.length) {
    const last2 = out.slice(-2);
    const sameRun = last2.length === 2 && last2.every(i => i.kind === last2[0].kind);
    const idx = sameRun ? rest.findIndex(i => i.kind !== last2[0].kind) : 0;
    out.push(rest.splice(idx >= 0 ? idx : 0, 1)[0]);
  }
  return out;
}
