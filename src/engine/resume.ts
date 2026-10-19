/**
 * 풀던 판 자동 저장 — 앱이 닫히거나 새로고침돼도 멈춘 문제부터 이어서 풀 수 있게 함 (한자 에이스와 같은 방식).
 */
import { NumStage, Question, RoundItem, RoundKind } from '../types';
import type { PQuestion } from './phrases';

export interface SavedRound {
  ts: number;
  menu?: 'numbers' | 'phrases' | 'songs';   // 없으면 숫자 영어 (예전 저장)
  unitId?: string;                 // 주제 여행 단원
  stage: NumStage;
  kind: RoundKind;
  questions: Question[];
  pquestions?: PQuestion[];        // 오늘의 한 마디 문제
  newIds?: string[];
  items: RoundItem[];
  paidUsed: number;
  combo: number;
  maxCombo: number;
}

const KEY = 'english_resume';
const KEEP_MS = 48 * 60 * 60 * 1000;   // 이틀이 지난 판은 버림

export function saveRound(r: SavedRound) {
  try { localStorage.setItem(KEY, JSON.stringify(r)); } catch { /* 무시 */ }
}
export function clearRound() {
  try { localStorage.removeItem(KEY); } catch { /* 무시 */ }
}
export function loadRound(): SavedRound | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const r = JSON.parse(raw) as SavedRound;
    const qs = r && r.menu && r.menu !== 'numbers' ? r.pquestions : r?.questions;
    const ok = r && Array.isArray(qs) && qs.length > 0 && Array.isArray(r.items)
      && r.items.length <= (r.menu && r.menu !== 'numbers' ? (r.pquestions || []).length : r.questions.length) && Date.now() - r.ts < KEEP_MS;
    if (!ok) { clearRound(); return null; }
    return r;
  } catch { clearRound(); return null; }
}
