/**
 * 저장소 — 기기의 localStorage가 1차 저장소.
 * 수학·한자 에이스와 같은 주소(eternal-today.github.io)에서 돌아 브라우저 저장소를 함께 쓰므로
 * 모든 이름 앞에 'english_'를 붙여 서로 덮어쓰지 않게 함.
 *
 * 별은 한자 에이스와 같은 "장부" 방식:
 *   번 별 = 학습 기록의 별을 모두 더한 값 (5문제 맞힐 때마다 1개)
 *   쓴 별·남은 별 = 모든 과목이 함께 쓰는 에이스 지갑(src/ace/wallet.ts)에서 계산
 */
import { useSyncExternalStore } from 'react';
import { Card, Config, Progress, RoundRecord } from '../types';
import { notifyWallet, spendHint, takeCelebration } from '../ace/wallet';
import { setVoiceURI } from './speech';

const P = 'english_';
const K = { config: P + 'config', cards: P + 'cards', records: P + 'records', progress: P + 'progress', pin: P + 'parent_pin' };

export const BADGES = [
  { id: 'b10', need: 10, iconName: 'Sprout', name: '새싹 영어꾼' },
  { id: 'b30', need: 30, iconName: 'Star', name: '별 수집가' },
  { id: 'b60', need: 60, iconName: 'Flame', name: '영어 불꽃' },
  { id: 'b100', need: 100, iconName: 'Gem', name: '다이아 귀' },
  { id: 'b200', need: 200, iconName: 'Trophy', name: '영어 챔피언' },
];

export const MIN_COUNT = 5;
export const MAX_COUNT = 30;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}

function defaultConfig(): Config {
  // 아이 이름은 같은 기기의 수학·한자 에이스에 넣어 둔 값이 있으면 가져옴 (읽기만 함)
  let name = '';
  try { name = read<any>('app_config', {}).childName || read<any>('hanja_config', {}).childName || ''; } catch { /* 없음 */ }
  return {
    count: 10, difficulty: 1, newPerRound: 3,
    modes: { listen: true, say: true, place: true },
    childName: name, voiceURI: '',
  };
}

export interface State {
  config: Config;
  cards: Record<string, Card>;
  records: RoundRecord[];     // 최근 것이 앞
  progress: Progress;
  pin: string;
}

function load(): State {
  const def = defaultConfig();
  const saved = read<Partial<Config>>(K.config, {});
  const config: Config = { ...def, ...saved, modes: { ...def.modes, ...(saved.modes || {}) } };
  config.count = Math.min(MAX_COUNT, Math.max(MIN_COUNT, config.count || 10));
  setVoiceURI(config.voiceURI);
  const progress = read<Progress>(K.progress, { numCheck: false, concepts: [] });
  return {
    config,
    cards: read(K.cards, {}),
    records: read<RoundRecord[]>(K.records, []),
    progress: { numCheck: !!progress.numCheck, concepts: Array.isArray(progress.concepts) ? progress.concepts : [] },
    pin: (() => { try { return localStorage.getItem(K.pin) || '1234'; } catch { return '1234'; } })(),
  };
}

let state: State = load();
const listeners = new Set<() => void>();

function commit(patch: Partial<State>) {
  state = { ...state, ...patch };
  try {
    if (patch.config) localStorage.setItem(K.config, JSON.stringify(state.config));
    if (patch.cards) localStorage.setItem(K.cards, JSON.stringify(state.cards));
    if (patch.records) localStorage.setItem(K.records, JSON.stringify(state.records));
    if (patch.progress) localStorage.setItem(K.progress, JSON.stringify(state.progress));
    if (patch.pin) localStorage.setItem(K.pin, state.pin);
  } catch (e) { console.error('저장 실패', e); }
  listeners.forEach(fn => fn());
}

export const getState = () => state;
export function useStore(): State {
  return useSyncExternalStore(
    fn => { listeners.add(fn); return () => { listeners.delete(fn); }; },
    () => state,
  );
}

/** 영어에서 번 별 (영어 뱃지 기준) */
export const earnedStars = (s: State) => s.records.reduce((a, r) => a + (r.stars || 0), 0);

/** 판을 끝낸 뒤 띄울 축하: 합산 별 10개마다(100개마다 명예의 전당), 영어 뱃지 */
export interface Milestone { value: number; hall: boolean; badge: string | null }

export const actions = {
  saveConfig(config: Config) {
    const c = { ...config, count: Math.min(MAX_COUNT, Math.max(MIN_COUNT, config.count)) };
    setVoiceURI(c.voiceURI);
    commit({ config: c });
  },
  setPin(pin: string) { commit({ pin }); },
  setCards(cards: Record<string, Card>) { commit({ cards }); },
  setProgress(p: Partial<Progress>) { commit({ progress: { ...state.progress, ...p } }); },
  markConcept(id: string) {
    if (state.progress.concepts.includes(id)) return;
    commit({ progress: { ...state.progress, concepts: [...state.progress.concepts, id] } });
  },
  /** 한 판 끝: 기록 저장. 축하는 모든 과목 합산 "번 별" 기준, 뱃지는 영어에서 번 별 기준 */
  addRecord(rec: RoundRecord): Milestone | null {
    const before = earnedStars(state);
    const records = [rec, ...state.records].map((r, i) => (i >= 300 && r.items?.length ? { ...r, items: [] } : r));
    commit({ records });
    notifyWallet();
    const after = earnedStars(state);
    const badge = BADGES.find(b => before < b.need && after >= b.need) || null;
    const cel = takeCelebration();
    if (!cel && !badge) return null;
    return { value: cel?.value ?? 0, hall: !!cel?.hall, badge: badge ? badge.name : null };
  },
  /** 힌트에 별 쓰기 (에이스 지갑 공통 장부, 1회 1개). 남은 별이 모자라면 false */
  spendHint(note: string): boolean {
    return spendHint('english', note);
  },
};
