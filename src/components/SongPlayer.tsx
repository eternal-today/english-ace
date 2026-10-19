import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ExternalLink, X } from 'lucide-react';
import { stopSpeak } from '../engine/speech';

/**
 * 노래 — 부모님이 넣은 유튜브 영상을 앱 안에서 재생 (설계 문서 5-3).
 * 영상이 끝나면 저절로 닫음 → 끝난 뒤 뜨는 추천 영상 화면으로 빠지지 않게.
 * 앱 안 재생을 막아 둔 영상은 "새 창으로 열기"를 보여 줌.
 */

/** 유튜브 주소에서 영상 번호 꺼내기 (youtu.be/…, watch?v=…, shorts/…, embed/…) */
export function youtubeId(url: string): string | null {
  const u = url.trim();
  if (!u) return null;
  const m = u.match(/(?:youtu\.be\/|v=|shorts\/|embed\/|live\/)([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  return /^[A-Za-z0-9_-]{11}$/.test(u) ? u : null;
}

declare global {
  interface Window { YT?: any; onYouTubeIframeAPIReady?: () => void }
}

let apiPromise: Promise<any> | null = null;
function loadApi(): Promise<any> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT); };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.onerror = () => { apiPromise = null; reject(new Error('load')); };
    document.head.appendChild(s);
  });
  return apiPromise;
}

interface Props {
  open: boolean;
  url: string;
  title: string;
  onClose: () => void;
  /** 재생이 막힌 영상이면 알려 줌 (부모 화면의 미리 재생에서 씀) */
  onBlocked?: (blocked: boolean) => void;
}

export function SongPlayer({ open, url, title, onClose, onBlocked }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<any>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'blocked' | 'error'>('loading');
  const id = youtubeId(url);

  useEffect(() => {
    if (!open || !id) return;
    stopSpeak();
    setState('loading');
    let alive = true;
    loadApi().then(YT => {
      if (!alive || !host.current) return;
      const el = document.createElement('div');
      host.current.innerHTML = '';
      host.current.appendChild(el);
      player.current = new YT.Player(el, {
        videoId: id,
        host: 'https://www.youtube-nocookie.com',
        width: '100%', height: '100%',
        playerVars: { autoplay: 1, rel: 0, playsinline: 1, modestbranding: 1, fs: 0 },
        events: {
          onReady: () => { if (alive) { setState('ready'); onBlocked?.(false); } },
          onStateChange: (e: any) => { if (e.data === 0) onClose(); },   // 0 = 끝남
          onError: (e: any) => {
            if (!alive) return;
            const blocked = e.data === 101 || e.data === 150 || e.data === 153;
            setState(blocked ? 'blocked' : 'error');
            if (blocked) onBlocked?.(true);
          },
        },
      });
    }).catch(() => { if (alive) setState('error'); });
    return () => {
      alive = false;
      try { player.current?.destroy?.(); } catch { /* 무시 */ }
      player.current = null;
    };
  }, [open, id]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[130] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}
            className="bg-white rounded-[2rem] p-4 w-full max-w-3xl space-y-3 shadow-2xl">
            <div className="flex items-center justify-between gap-3 px-1">
              <div className="font-black text-slate-800 en text-lg truncate">🎵 {title}</div>
              <button onClick={onClose} aria-label="닫기" className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0"><X size={20} /></button>
            </div>
            {!id ? (
              <div className="aspect-video rounded-2xl bg-slate-50 flex items-center justify-center text-center p-6 text-sm font-bold text-slate-500 break-keep">
                노래 주소가 아직 없어요. 부모님께 부탁해요!
              </div>
            ) : (
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-black">
                <div ref={host} className="absolute inset-0" />
                {(state === 'blocked' || state === 'error') && (
                  <div className="absolute inset-0 bg-slate-50 flex flex-col items-center justify-center gap-3 p-6 text-center">
                    <p className="text-sm font-bold text-slate-600 break-keep">
                      {state === 'blocked' ? '이 영상은 앱 안에서 볼 수 없게 되어 있어요.' : '영상을 불러오지 못했어요. 인터넷 연결을 확인해 주세요.'}
                    </p>
                    <a href={`https://www.youtube.com/watch?v=${id}`} target="_blank" rel="noreferrer" className="btn-primary px-5 py-3 inline-flex items-center gap-2">
                      <ExternalLink size={18} />새 창으로 열기
                    </a>
                  </div>
                )}
              </div>
            )}
            <p className="text-[11px] font-bold text-slate-400 text-center">노래가 끝나면 저절로 닫혀요</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
