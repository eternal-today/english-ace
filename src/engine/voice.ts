/**
 * 내 목소리 — 아이가 따라 말한 것을 녹음해 두고 원래 소리와 비교해 듣기 (설계 v0.1 5번)
 *
 * - 채점하지 않음 (아이 목소리는 음성 인식이 잘 안 돼서), 별도 붙이지 않음
 * - 이 기기의 브라우저 저장소(IndexedDB)에만 저장. 서버로 올리지 않음
 * - 같은 문장은 마지막 녹음 하나만 남김 (키 = 영어 문장)
 */

export interface Clip { text: string; blob: Blob; at: number; ms: number }

const DB = 'english_voice';
const STORE = 'clips';
export const MAX_MS = 5000;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE, { keyPath: 'text' }); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const r = fn(t.objectStore(STORE));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    t.oncomplete = () => db.close();
  });
}

const listeners = new Set<() => void>();
export function onClipsChanged(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
const changed = () => listeners.forEach(fn => fn());

export async function saveClip(c: Clip) { await tx('readwrite', s => s.put(c)); changed(); }
export async function getClip(text: string): Promise<Clip | undefined> {
  try { return await tx<Clip | undefined>('readonly', s => s.get(text)); } catch { return undefined; }
}
export async function listClips(): Promise<Clip[]> {
  try { return (await tx<Clip[]>('readonly', s => s.getAll())).sort((a, b) => b.at - a.at); } catch { return []; }
}
export async function deleteClip(text: string) { await tx('readwrite', s => s.delete(text)); changed(); }
export async function clearClips() { await tx('readwrite', s => s.clear()); changed(); }

/** 이 기기에서 녹음할 수 있는지 (https, 마이크 API, MediaRecorder, IndexedDB) */
export function canRecord(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext && !!navigator.mediaDevices?.getUserMedia
    && typeof (window as any).MediaRecorder !== 'undefined' && typeof indexedDB !== 'undefined';
}

function pickMime(): string {
  const MR = (window as any).MediaRecorder;
  for (const m of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']) {
    try { if (MR.isTypeSupported?.(m)) return m; } catch { /* 무시 */ }
  }
  return '';
}

export type MicError = 'denied' | 'nomic' | 'unsupported' | 'other';
export interface Recording { stop: () => void; done: Promise<{ blob: Blob; ms: number }> }

/** 녹음 시작. MAX_MS가 지나면 저절로 멈춤 */
export async function startRecording(maxMs = MAX_MS): Promise<Recording> {
  if (!canRecord()) throw 'unsupported' as MicError;
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  } catch (e: any) {
    const n = e?.name || '';
    throw (n === 'NotAllowedError' || n === 'SecurityError' ? 'denied' : n === 'NotFoundError' ? 'nomic' : 'other') as MicError;
  }
  const mime = pickMime();
  const rec: MediaRecorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
  const chunks: Blob[] = [];
  const started = Date.now();
  rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  const done = new Promise<{ blob: Blob; ms: number }>(resolve => {
    rec.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      resolve({ blob: new Blob(chunks, { type: rec.mimeType || mime || 'audio/webm' }), ms: Date.now() - started });
    };
  });
  rec.start();
  const timer = setTimeout(() => { if (rec.state === 'recording') rec.stop(); }, maxMs);
  return { stop: () => { clearTimeout(timer); if (rec.state === 'recording') rec.stop(); }, done };
}

/** 마이크 허용만 확인 (부모 화면) */
export async function checkMic(): Promise<true | MicError> {
  if (!canRecord()) return 'unsupported';
  try {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true });
    s.getTracks().forEach(t => t.stop());
    return true;
  } catch (e: any) {
    const n = e?.name || '';
    return n === 'NotAllowedError' || n === 'SecurityError' ? 'denied' : n === 'NotFoundError' ? 'nomic' : 'other';
  }
}

let current: HTMLAudioElement | null = null;
/** 녹음 재생 (끝나면 onEnd) */
export function playClip(blob: Blob, onEnd?: () => void) {
  stopClip();
  const url = URL.createObjectURL(blob);
  const a = new Audio(url);
  current = a;
  const end = () => { URL.revokeObjectURL(url); if (current === a) current = null; onEnd?.(); };
  a.onended = end;
  a.onerror = end;
  a.play().catch(end);
}
export function stopClip() { if (current) { current.pause(); current = null; } }

export const MIC_ERROR_TEXT: Record<MicError, string> = {
  denied: '마이크를 쓸 수 없어요. 부모님께 마이크 허용을 부탁해요',
  nomic: '마이크를 찾지 못했어요',
  unsupported: '이 기기에서는 녹음할 수 없어요',
  other: '녹음을 시작하지 못했어요. 다시 해 볼까?',
};
