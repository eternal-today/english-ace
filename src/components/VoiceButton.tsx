import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Mic, Play, Square } from 'lucide-react';
import { Clip, MAX_MS, MIC_ERROR_TEXT, MicError, Recording, canRecord, getClip, onClipsChanged, playClip, saveClip, startRecording, stopClip } from '../engine/voice';
import { speak, stopSpeak } from '../engine/speech';
import { toast } from './ui';

/**
 * "따라 말해 볼까?" — 누르면 녹음 (다시 누르거나 5초가 지나면 멈춤)
 * → 내 목소리 → 원래 소리 순서로 들려줌. 채점·별 없음.
 * save=false면 녹음을 남기지 않음 (부모님 체험)
 */
export function VoiceButton({ text, save = true, compact = false, listenOnly = false, blocked = '', onRecorded }: {
  text: string; save?: boolean; compact?: boolean;
  /** 녹음 버튼 없이 "내 목소리" 듣기만 (표현 도감) */
  listenOnly?: boolean;
  /** 녹음을 막는 이유 (하루 횟수를 다 썼을 때 등). 비어 있으면 녹음 가능 */
  blocked?: string;
  onRecorded?: () => void;
}) {
  const [state, setState] = useState<'idle' | 'rec' | 'play'>('idle');
  const [left, setLeft] = useState(0);
  const [clip, setClip] = useState<Clip | null>(null);
  const recRef = useRef<Recording | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => getClip(text).then(c => { if (alive) setClip(c || null); });
    load();
    const off = onClipsChanged(load);
    return () => { alive = false; off(); };
  }, [text]);
  useEffect(() => () => { recRef.current?.stop(); stopClip(); if (tickRef.current) clearInterval(tickRef.current); }, []);

  if (listenOnly && !clip) return null;
  if (!listenOnly && !canRecord()) return null;

  const compare = (blob: Blob) => {
    setState('play');
    playClip(blob, () => {
      speak(text, () => setState('idle'));
      setTimeout(() => setState(s => (s === 'play' ? 'idle' : s)), 6000);
    });
  };

  const start = async () => {
    if (state === 'rec') { recRef.current?.stop(); return; }
    stopSpeak(); stopClip();
    try {
      const r = await startRecording();
      recRef.current = r;
      setState('rec');
      const until = Date.now() + MAX_MS;
      setLeft(Math.ceil(MAX_MS / 1000));
      tickRef.current = setInterval(() => setLeft(Math.max(0, Math.ceil((until - Date.now()) / 1000))), 200);
      const { blob, ms } = await r.done;
      if (tickRef.current) clearInterval(tickRef.current);
      recRef.current = null;
      if (ms < 400 || !blob.size) { setState('idle'); toast('너무 짧아요. 다시 말해 볼까?'); return; }
      const c: Clip = { text, blob, at: Date.now(), ms };
      if (save) await saveClip(c).catch(() => toast('녹음을 저장하지 못했어요'));
      setClip(c);
      onRecorded?.();
      compare(blob);
    } catch (e) {
      setState('idle');
      toast(MIC_ERROR_TEXT[(e as MicError)] || MIC_ERROR_TEXT.other);
    }
  };

  return (
    <div className={`flex items-center justify-center gap-2 ${compact ? '' : 'flex-wrap'}`}>
      {!listenOnly && blocked && state !== 'rec' && <span className="h-11 px-4 rounded-full flex items-center text-xs font-black bg-slate-100 text-slate-400">{blocked}</span>}
      {!listenOnly && !blocked || state === 'rec' ? <motion.button whileTap={{ scale: 0.95 }} onClick={start} aria-label={state === 'rec' ? '녹음 멈추기' : '따라 말하고 녹음하기'}
        className={`h-11 px-4 rounded-full flex items-center gap-2 font-black text-sm border-2 transition-colors ${state === 'rec' ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white border-rose-200 text-rose-500'}`}>
        {state === 'rec'
          ? <><motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }}><Square size={16} className="fill-white" /></motion.span>말하는 중… 다 했으면 눌러요 {left}</>
          : <><Mic size={18} />{clip ? '다시 따라 말하기' : '따라 말해 볼까?'}</>}
      </motion.button> : null}
      {clip && state !== 'rec' && (
        <button onClick={() => compare(clip.blob)} disabled={state === 'play'} aria-label="내 목소리와 원래 소리 듣기"
          className="h-11 px-4 rounded-full flex items-center gap-2 font-black text-sm bg-rose-50 text-rose-600 disabled:opacity-60">
          <Play size={16} className="fill-rose-500" />{state === 'play' ? '듣는 중…' : '내 목소리'}
        </button>
      )}
    </div>
  );
}
