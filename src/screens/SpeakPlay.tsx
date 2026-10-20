import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Home, Mic, RotateCcw, Scissors, Volume2 } from 'lucide-react';
import { useStore } from '../engine/store';
import { PER_SESSION, PER_TEXT, SpeakItem, countRecord, pickSpeakItems, recordsToday, sessionsToday, startSession } from '../engine/speak';
import { canRecord, listClips } from '../engine/voice';
import { tipFor } from '../engine/speakTips';
import { speak, speakWords, stopSpeak } from '../engine/speech';
import { VoiceButton } from '../components/VoiceButton';
import { MouthTip, TipText } from '../components/MouthTip';
import { fireConfetti } from '../components/ui';

/** 놀이터 "따라 말하기" — 한 번에 5개: 듣기 → (발음 포인트) → 녹음 → 내 목소리와 비교 */
export default function SpeakPlay({ onExit }: { onExit: () => void }) {
  const store = useStore();
  const { config, preview } = store;
  const perDay = config.speakPerDay ?? 2;
  const [items, setItems] = useState<SpeakItem[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<'ready' | 'play' | 'done'>('ready');
  const [, bump] = useState(0);
  const [word, setWord] = useState(-1);
  const used = sessionsToday();

  useEffect(() => {
    listClips().then(clips => {
      setItems(pickSpeakItems(config, store.cards, store.custom, new Set(clips.map(c => c.text))));
    });
    return () => stopSpeak();
  }, []);

  const item = items?.[idx];
  useEffect(() => { if (phase === 'play' && item) { const t = setTimeout(() => speak(item.text), 300); return () => clearTimeout(t); } }, [phase, idx]);

  const Back = (
    <button onClick={onExit} aria-label="뒤로" className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 text-slate-400"><ArrowLeft size={18} /></button>
  );
  // 함수로 부름 (컴포넌트로 만들면 다시 그릴 때마다 안의 녹음 버튼이 새로 만들어짐)
  const shell = (children: React.ReactNode) => (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
      <div className="w-full max-w-md space-y-5 my-auto text-center">{children}</div>
    </div>
  );

  // ── 시작 화면 ──
  if (phase === 'ready' || !items) {
    const off = perDay <= 0;
    const full = !preview && used >= perDay;
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="w-full max-w-lg mx-auto space-y-5">
          <header className="flex items-center gap-3">
            {Back}
            <div className="text-left">
              <h2 className="text-2xl font-black text-slate-900 font-display">따라 말하기</h2>
              <p className="text-sm font-medium text-slate-500">듣고, 따라 말하고, 내 목소리와 비교해요</p>
            </div>
          </header>
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 space-y-4 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center"><Mic size={32} /></div>
            {!canRecord() ? <p className="font-bold text-slate-600 break-keep">이 기기에서는 녹음을 할 수 없어요.</p>
              : off ? <p className="font-bold text-slate-600 break-keep">따라 말하기가 꺼져 있어요. 부모님께 부탁해요.</p>
                : full ? <p className="font-bold text-slate-600 break-keep">오늘 따라 말하기는 다 했어! 내일 또 하자 🌙</p>
                  : items && items.length === 0 ? <p className="font-bold text-slate-600 break-keep">먼저 오늘의 한 마디나 주제 여행에서 표현과 단어를 만나고 와요!</p>
                    : <>
                      <p className="font-bold text-slate-600 break-keep">최근에 만난 표현과 단어 {Math.min(PER_SESSION, items?.length || 0)}개를 따라 말해 봐요.</p>
                      <p className="text-xs font-bold text-slate-400">오늘 {preview ? '체험 중' : `${used} / ${perDay}번 했어요`} · 같은 말은 하루 {PER_TEXT}번까지 녹음해요</p>
                      <button className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-2" disabled={!items}
                        onClick={() => { if (!preview) startSession(); setPhase('play'); }}>
                        시작하기<ArrowRight size={22} />
                      </button>
                    </>}
          </div>
          <p className="text-[11px] font-bold text-slate-400 px-2 break-keep">녹음은 이 태블릿에만 저장돼요. 부모님이 목소리 앨범에서 들을 수 있어요.</p>
        </div>
      </div>
    );
  }

  // ── 끝 ──
  if (phase === 'done') {
    return shell(<>
        <div className="text-6xl">🎤</div>
        <h2 className="text-3xl font-black text-slate-900 font-display">멋지게 말했어!</h2>
        <p className="text-slate-500 font-medium break-keep">내 목소리를 들어 보니 어땠어? 부모님께도 들려 드리자!</p>
        <div className="flex gap-3">
          <button className="btn-secondary flex-1 py-4 flex items-center justify-center gap-2" onClick={onExit}><Home size={20} />홈으로</button>
          {(preview || sessionsToday() < perDay) && (
            <button className="btn-primary flex-1 py-4 flex items-center justify-center gap-2" onClick={() => {
              listClips().then(clips => {
                const next = pickSpeakItems(config, store.cards, store.custom, new Set(clips.map(c => c.text)));
                if (!next.length) { onExit(); return; }
                if (!preview) startSession();
                setItems(next); setIdx(0); setPhase('play');
              });
            }}><RotateCcw size={20} />한 번 더</button>
          )}
        </div>
      </>);
  }

  // ── 따라 말하기 ──
  if (!item) return null;
  const tip = tipFor(item.text);
  const left = PER_TEXT - recordsToday(item.text);
  const last = idx + 1 >= items.length;
  const next = () => { stopSpeak(); if (last) { setPhase('done'); setTimeout(() => fireConfetti('normal'), 200); } else { setIdx(idx + 1); setWord(-1); } };
  return shell(<>
      <div className="flex items-center gap-3">
        <button onClick={onExit} aria-label="홈" className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 text-slate-400 shrink-0"><Home size={16} /></button>
        <div className="bg-slate-200 h-2.5 flex-1 rounded-full overflow-hidden">
          <div className="bg-gradient-to-r from-brand-500 to-brand-400 h-full rounded-full transition-all" style={{ width: `${((idx + 1) / items.length) * 100}%` }} />
        </div>
        <span className="text-xs font-black text-slate-400 shrink-0">{idx + 1}/{items.length}</span>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={item.key} initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }}
          className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-brand-100 p-6 space-y-4">
          {item.emoji && <div className="text-[clamp(4rem,16vmin,6rem)] leading-none">{item.emoji}</div>}
          <div>
            <div className="en text-[clamp(1.8rem,7vmin,2.6rem)] text-slate-800 leading-tight flex flex-wrap justify-center gap-x-2">
              {item.kind === 'phrase' && word >= 0
                ? item.text.split(/\s+/).map((w, i) => <span key={i} className={`rounded-lg px-1 ${word === i ? 'bg-brand-100 text-brand-800' : ''}`}>{w}</span>)
                : <TipText text={item.text} at={tip?.at} />}
            </div>
            <div className="text-sm font-bold text-slate-400 mt-1">{item.ko}</div>
          </div>
          <div className="flex items-center justify-center gap-2">
            <button onClick={() => speak(item.text)} className="h-12 px-5 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center gap-2 font-black shadow-lg shadow-brand-200 active:scale-95">
              <Volume2 size={22} />듣기
            </button>
            {/\s/.test(item.text) && <button onClick={() => speakWords(item.text, setWord)} className="h-12 px-4 rounded-full bg-white border-2 border-brand-200 text-brand-600 flex items-center gap-2 font-black active:scale-95">
              <Scissors size={18} />끊어 듣기
            </button>}
          </div>
          {tip && <MouthTip tip={tip.tip} />}
          <VoiceButton key={item.text} text={item.text} save={!preview}
            blocked={!preview && left <= 0 ? '오늘은 3번 다 했어요' : ''}
            onRecorded={() => { if (!preview) { countRecord(item.text); bump(n => n + 1); } }} />
        </motion.div>
      </AnimatePresence>
      <button className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-2" onClick={next}>
        {last ? '다 했어요' : '다음'}<ArrowRight size={22} />
      </button>
    </>);
}
