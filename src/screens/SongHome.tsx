import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, BookOpen, ChevronRight, Lock, Music, Play, Volume2 } from 'lucide-react';
import { useStore } from '../engine/store';
import { SONGS, SONG_BY_ID, SongUnit, TOPICS, lyricFilled } from '../data/songs';
import { unitProgress, wordCard } from '../engine/songs';
import { songCountOf, topicCountOf } from '../engine/scope';
import { toneOf } from '../engine/srs';
import { speak } from '../engine/speech';
import { SongPlayer, youtubeId } from '../components/SongPlayer';

/** 주제 여행 — 단원 목록: 노래 단원 + 주제 단어 단원 */
export function SongList({ onBack, onUnit }: { onBack: () => void; onUnit: (id: string) => void }) {
  const store = useStore();
  const { cards } = store;
  const openSongs = songCountOf(store);
  const openTopics = topicCountOf(store);
  const row = (u: SongUnit, i: number, open: number) => {
    const p = unitProgress(cards, u.id);
    const locked = i >= open && p.met === 0;   // 이미 만난 단어가 있는 단원은 늘 열어 둠
    return (
      <motion.button key={u.id} whileTap={{ scale: locked ? 1 : 0.98 }} disabled={locked} onClick={() => onUnit(u.id)}
        className={`w-full rounded-[2rem] p-5 flex items-center gap-4 text-left ${locked ? 'bg-slate-50 border-2 border-dashed border-slate-200 opacity-60' : 'bg-white border border-slate-100 shadow-sm'}`}>
        <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center text-3xl shrink-0">{u.words.find(w => !w.lyricOnly)?.emoji || '🎵'}</div>
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="en text-xl text-slate-900">{u.title}</span>
            {u.topic
              ? <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-sky-50 text-sky-600">{u.ko}</span>
              : <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${u.known ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>{u.known ? '아는 노래' : '새 노래'}</span>}
          </div>
          <div className="bg-slate-100 h-2 rounded-full overflow-hidden flex">
            <div className="bg-brand-500 h-full" style={{ width: `${(p.learned / p.total) * 100}%` }} />
            <div className="bg-brand-200 h-full" style={{ width: `${((p.met - p.learned) / p.total) * 100}%` }} />
          </div>
          <div className="text-xs font-bold text-slate-400">{locked ? (u.topic ? '앞 주제 단어를 만나면 열려요' : '앞 노래 단어를 만나면 열려요') : `단어 ${p.total}개 · 익힌 단어 ${p.learned}개`}</div>
        </div>
        {locked ? <Lock size={18} className="text-slate-300 shrink-0" /> : <ChevronRight size={20} className="text-slate-300 shrink-0" />}
      </motion.button>
    );
  };
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="w-full max-w-lg landscape:max-w-5xl mx-auto space-y-5">
        <header className="flex items-center gap-3">
          <button onClick={onBack} aria-label="뒤로" className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 text-slate-400"><ArrowLeft size={18} /></button>
          <div>
            <h2 className="text-2xl font-black text-slate-900 font-display">주제 여행</h2>
            <p className="text-sm font-medium text-slate-500">노래 속 단어와 생활 단어 찾기!</p>
          </div>
        </header>
        <div className="space-y-5 landscape:space-y-0 landscape:grid landscape:grid-cols-2 landscape:gap-6 landscape:items-start">
          <section className="space-y-3">
            <h3 className="text-sm font-black text-slate-500 px-1 flex items-center gap-1.5"><Music size={16} />노래 단원</h3>
            {SONGS.map((u, i) => row(u, i, openSongs))}
          </section>
          <section className="space-y-3">
            <h3 className="text-sm font-black text-slate-500 px-1 flex items-center gap-1.5"><BookOpen size={16} />주제 단어</h3>
            {TOPICS.map((u, i) => row(u, i, openTopics))}
          </section>
        </div>
        <p className="text-xs font-bold text-slate-400 px-2">앞 단원의 단어를 거의 다 만나면 다음 단원이 저절로 열려요.</p>
      </div>
    </div>
  );
}

/** 주제 여행 — 단원 화면: 노래 듣기 → 단어 문제 */
export function SongUnitView({ unitId, onBack, onStart }: { unitId: string; onBack: () => void; onStart: () => void }) {
  const { cards, config } = useStore();
  const unit = SONG_BY_ID[unitId];
  const [playing, setPlaying] = useState(false);
  const url = config.songs?.[unitId] || '';
  const hasSong = !!youtubeId(url);
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="w-full max-w-lg landscape:max-w-3xl mx-auto space-y-5">
        <header className="flex items-center gap-3">
          <button onClick={onBack} aria-label="뒤로" className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 text-slate-400"><ArrowLeft size={18} /></button>
          <div className="min-w-0">
            <div className="text-xs font-black text-brand-600">주제 여행 · {unit.topic ? `주제 단어 · ${unit.ko}` : unit.known ? '아는 노래' : '새 노래'}</div>
            <h2 className="en text-2xl text-slate-900 truncate">{unit.title}</h2>
          </div>
        </header>

        <div className={`grid gap-3 ${unit.topic ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {!unit.topic && <motion.button whileTap={{ scale: 0.97 }} onClick={() => setPlaying(true)}
            className={`rounded-[2rem] p-5 flex flex-col items-start gap-3 text-left border-2 ${hasSong ? 'bg-white border-brand-200' : 'bg-slate-50 border-dashed border-slate-200'}`}>
            <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center"><Music size={24} /></div>
            <div>
              <div className="font-black text-slate-800 text-lg">① 노래 듣기</div>
              <div className="text-xs font-bold text-slate-400">{hasSong ? '먼저 들어 보면 쉬워요' : '부모님께 노래 주소를 부탁해요'}</div>
            </div>
          </motion.button>}
          <motion.button whileTap={{ scale: 0.97 }} onClick={onStart}
            className="rounded-[2rem] p-5 flex flex-col items-start gap-3 text-left bg-gradient-to-br from-brand-500 to-brand-700 shadow-xl shadow-brand-200">
            <div className="w-12 h-12 rounded-2xl bg-white/25 text-white flex items-center justify-center"><Play size={24} /></div>
            <div>
              <div className="font-black text-white text-lg">{unit.topic ? '단어 문제' : '② 단어 문제'}</div>
              <div className="text-xs font-bold text-white/80">{config.count}문제 · {unit.topic ? '듣고 그림 찾기, 그림 보고 소리 고르기' : '단어와 가사 빈칸'}</div>
            </div>
          </motion.button>
        </div>

        <section className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 space-y-3">
          <h3 className="font-black text-slate-800">{unit.topic ? `${unit.ko} 단어` : '노래 속 단어'}</h3>
          <div className="grid grid-cols-3 landscape:grid-cols-4 gap-2">
            {unit.words.map(w => {
              const tone = toneOf(cards[wordCard(w.id)]);
              const cls = tone === 'none' ? 'border-dashed border-slate-200 bg-slate-50' : tone === 'grey' ? 'border-slate-200 bg-white' : tone === 'color' ? 'border-brand-200 bg-brand-50' : 'border-amber-300 bg-amber-50 ring-2 ring-amber-200';
              return (
                <button key={w.id} onClick={() => speak(w.word)} className={`rounded-2xl border-2 p-3 flex flex-col items-center gap-1 ${cls}`}>
                  <span className={`text-4xl leading-none ${tone === 'none' ? 'opacity-40' : ''}`}>{w.emoji}</span>
                  <span className="en text-lg text-slate-800">{tone === 'none' ? '?' : <><span className="text-rose-500">{w.word[0]}</span>{w.word.slice(1)}</>}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] font-bold text-slate-400">문제에서 만난 단어는 이름이 보여요. 회색 → 색 → 금테 순서로 익혀요.</p>
        </section>

        {!unit.topic && <section className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 space-y-2">
          <h3 className="font-black text-slate-800">가사</h3>
          {[...new Set(unit.lyrics.map(l => lyricFilled(l)))].map(t => (
            <button key={t} onClick={() => speak(t)} className="w-full flex items-center gap-2 text-left bg-slate-50 rounded-xl px-3 py-2">
              <Volume2 size={16} className="text-brand-500 shrink-0" /><span className="en text-base text-slate-700">{t}</span>
            </button>
          ))}
        </section>}
      </div>
      {!unit.topic && <SongPlayer open={playing} url={url} title={unit.title} onClose={() => setPlaying(false)} />}
    </div>
  );
}
