/**
 * 영어 소리 — 기기의 음성 읽기(TTS)를 씀.
 * 앱 전체가 이 파일의 함수만 부르므로, 소리 방식을 바꿀 때는 여기만 고치면 됨.
 *
 * - 보통 듣기: 문장 하나를 한 번에 (속도 0.9)
 * - 끊어 듣기: 덩어리로 나눠 하나씩 읽고 사이에 쉼. 안드로이드는 속도 값이 잘 반영되지 않아서 이 방식을 씀
 */

let selectedURI = '';
let seq = 0;   // 새 소리를 낼 때마다 올라감 → 이전 덩어리 읽기를 멈춤

export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

export function englishVoices(): SpeechSynthesisVoice[] {
  if (!canSpeak()) return [];
  return window.speechSynthesis.getVoices()
    .filter(v => /^en[-_]/i.test(v.lang) || v.lang?.toLowerCase() === 'en')
    .sort((a, b) => a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name));
}

/** 부모 설정에서 고른 목소리. 비우면 미국 영어 → 아무 영어 순 */
export function setVoiceURI(uri: string) { selectedURI = uri || ''; }

function pickVoice(): SpeechSynthesisVoice | null {
  const list = englishVoices();
  return list.find(v => v.voiceURI === selectedURI)
    || list.find(v => /en[-_]US/i.test(v.lang))
    || list[0] || null;
}

export function hasEnglishVoice() { return englishVoices().length > 0; }

/** 목소리 목록이 늦게 오는 기기용 */
export function onVoicesChanged(fn: () => void) {
  if (!canSpeak()) return () => { };
  const s = window.speechSynthesis;
  s.addEventListener?.('voiceschanged', fn);
  return () => s.removeEventListener?.('voiceschanged', fn);
}

/**
 * 기기 음성 엔진이 놓치는 짧은 말 다듬기
 * - 글자 하나(a, I)는 관사로 보고 건너뛰는 엔진이 있어 대문자로 따로 읽게 함 ("a, apple" → "A. apple")
 */
function tidy(text: string): string {
  // "Hi"만 단독으로 있으면 소리를 내지 않는 엔진이 있음 (아이 태블릿 확인: Hi!, Hi., Hi 모두 무음, Hai!는 정상)
  if (/^hi\s*[!.?]?$/i.test(text.trim())) return 'Hai!';
  return text.replace(/^([a-z])\s*,\s*/i, (_, l) => `${l.toUpperCase()}. `);
}

/**
 * 말투: 기기 음성은 감정을 넣을 수 없어서 높낮이·빠르기만 조금 바꿈.
 * 느낌표 문장은 조금 높고 빠르게, 물음표 문장은 살짝 높게.
 */
function utter(text: string, rate: number) {
  const t = text.trim();
  const u = new SpeechSynthesisUtterance(tidy(t));
  const v = pickVoice();
  if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-US';
  const excited = /!$/.test(t), asking = /\?$/.test(t);
  u.rate = excited ? rate * 1.05 : rate;
  u.pitch = excited ? 1.2 : asking ? 1.1 : 1;
  return u;
}

/**
 * 크롬(안드로이드)은 cancel() 바로 뒤의 speak()를 가끔 버림. 짧은 말(Hi!)일수록 잘 빠져서 조금 기다렸다가 말함.
 */
const AFTER_CANCEL_MS = 80;

export function stopSpeak() {
  seq++;
  if (canSpeak()) { try { window.speechSynthesis.cancel(); } catch { /* 무시 */ } }
}

/** 보통 속도로 한 번 읽기 */
export function speak(text: string, onEnd?: () => void) {
  if (!canSpeak() || !text) { onEnd?.(); return; }
  stopSpeak();
  const my = seq;
  setTimeout(() => {
    if (my !== seq) return;
    try {
      const u = utter(text, 0.9);
      u.onend = () => { if (my === seq) onEnd?.(); };
      u.onerror = () => { if (my === seq) onEnd?.(); };
      window.speechSynthesis.speak(u);
    } catch { onEnd?.(); }
  }, AFTER_CANCEL_MS);
}

/**
 * 덩어리로 끊어 읽기. onPart(i)는 i번째 덩어리를 읽기 시작할 때, 다 읽으면 onPart(-1).
 * 덩어리 사이에 gapMs만큼 쉼.
 */
export function speakParts(parts: string[], onPart?: (i: number) => void, gapMs = 450) {
  if (!parts.length) return;
  if (!canSpeak()) { onPart?.(-1); return; }
  stopSpeak();
  const my = seq;
  const next = (i: number) => {
    if (my !== seq) return;
    if (i >= parts.length) { onPart?.(-1); return; }
    onPart?.(i);
    try {
      const u = utter(parts[i], 0.85);
      const go = () => { if (my === seq) setTimeout(() => next(i + 1), gapMs); };
      u.onend = go;
      u.onerror = go;
      window.speechSynthesis.speak(u);
    } catch { onPart?.(-1); }
  };
  setTimeout(() => next(0), AFTER_CANCEL_MS);
}

/** 문장 끊어 듣기: 쉼표·물음표 등을 떼고 단어 하나씩 읽음 */
export function speakWords(text: string, onPart?: (i: number) => void) {
  const words = text.split(/\s+/).map(w => w.replace(/[,.!?]+$/g, '')).filter(Boolean);
  speakParts(words, onPart, 350);
}
