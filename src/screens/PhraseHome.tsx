import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, BookOpen, ChevronRight, Lock, MessageCircle, Stamp, Volume2 } from 'lucide-react';
import { useStore } from '../engine/store';
import { allItems, fillOf, levelProgress, openLevel, poolItems, resolve } from '../engine/phrases';
import { MAX_LEVEL, PhraseItem, koFilled } from '../data/phrases';
import { dayIndex, toneOf } from '../engine/srs';
import { speak, speakParts } from '../engine/speech';
import { CloseButton, Sheet } from '../components/ui';

const LEVEL_NAME: Record<number, string> = { 1: '인사 · 고마워 · 기분 · 부탁 · 감탄', 2: '나 소개 · 날씨 · 이게 뭐야' };

/** 오늘의 한 마디 — 시작 화면 */
export function PhraseHome({ onBack, onStart, onDogam }: { onBack: () => void; onStart: () => void; onDogam: () => void }) {
  const { config, cards, custom, preview } = useStore();
  const f = fillOf(config);
  const level = preview ? MAX_LEVEL : openLevel(cards, f);
  const pool = poolItems(custom, level, f);
  const today = dayIndex();
  const due = pool.filter(p => cards['ph:' + p.id] && cards['ph:' + p.id].due <= today && cards['ph:' + p.id].box < 5).length;
  const unseen = pool.filter(p => !cards['ph:' + p.id]).length;
  const prog = levelProgress(cards, f);
  const sub = unseen > 0 && due > 0 ? `새 표현과 복습 ${due}개가 기다려요` : unseen > 0 ? '새 표현을 만나러 가요' : due > 0 ? `복습할 표현 ${due}개가 기다려요` : '오늘 복습은 끝! 한 판 더 해도 좋아요';

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="w-full max-w-lg landscape:max-w-3xl mx-auto space-y-5">
        <header className="flex items-center gap-3">
          <button onClick={onBack} aria-label="뒤로" className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 text-slate-400"><ArrowLeft size={18} /></button>
          <div>
            <h2 className="text-2xl font-black text-slate-900 font-display">오늘의 한 마디</h2>
            <p className="text-sm font-medium text-slate-500">엉뚱한 대답을 찾아라!</p>
          </div>
        </header>

        <motion.button whileTap={{ scale: 0.97 }} onClick={onStart}
          className="w-full bg-gradient-to-br from-brand-500 to-brand-700 p-6 rounded-[2rem] shadow-xl shadow-brand-200 flex items-center gap-5 text-left">
          <div className="w-14 h-14 bg-white/25 rounded-2xl flex items-center justify-center shrink-0 text-white"><MessageCircle size={28} /></div>
          <div className="flex-1 min-w-0">
            <div className="text-xl font-black text-white">한 판 시작</div>
            <div className="text-white/80 text-sm font-medium mt-0.5">{config.count}문제 · {sub}</div>
          </div>
          <ChevronRight size={24} className="text-white/60 shrink-0" />
        </motion.button>

        <div className="space-y-3">
          {prog.map(p => {
            const on = p.level <= level;
            return (
              <div key={p.level} className={`bg-white rounded-[2rem] border-2 p-5 space-y-2 ${on ? 'border-slate-100 shadow-sm' : 'border-dashed border-slate-200 opacity-60'}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-black text-slate-800">{p.level}단계</div>
                    <div className="text-xs font-bold text-slate-400">{LEVEL_NAME[p.level] || ''}</div>
                  </div>
                  {on ? <span className="text-xs font-black text-brand-600 shrink-0">익힌 표현 {p.learned} / {p.total}</span>
                    : <span className="flex items-center gap-1 text-xs font-black text-slate-400 shrink-0"><Lock size={14} />{p.level - 1}단계를 익히면 열려요</span>}
                </div>
                {on && (
                  <div className="bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                    <div className="bg-brand-500 h-full" style={{ width: `${p.total ? (p.learned / p.total) * 100 : 0}%` }} />
                    <div className="bg-brand-200 h-full" style={{ width: `${p.total ? ((p.met - p.learned) / p.total) * 100 : 0}%` }} />
                  </div>
                )}
              </div>
            );
          })}
          {custom.length > 0 && <div className="text-xs font-bold text-slate-400 px-2">부모님이 넣어 준 표현 {custom.length}개도 함께 나와요</div>}
        </div>

        <button onClick={onDogam} className="w-full bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 flex items-center justify-between active:scale-[0.98]">
          <span className="font-black text-slate-800 flex items-center gap-2"><BookOpen size={18} className="text-brand-500" />표현 도감</span>
          <span className="text-xs font-bold text-brand-500 flex items-center">펼쳐 보기<ChevronRight size={14} /></span>
        </button>
      </div>
    </div>
  );
}

/** 표현 도감 — 만난 상황이 모임. 회색(익히는 중) → 색(익힘) → 금테(완전히 익힘), 들었어요 도장 */
export function PhraseDogam({ onBack }: { onBack: () => void }) {
  const { config, cards, custom, heard, preview } = useStore();
  const f = fillOf(config);
  const level = preview ? MAX_LEVEL : openLevel(cards, f);
  const [open, setOpen] = useState<PhraseItem | null>(null);
  const items = allItems(custom).filter(p => p.custom || p.level <= level).map(p => resolve(p, f)).filter((p): p is PhraseItem => !!p);
  const groups = [...new Set(items.map(p => p.group))];
  const metCount = items.filter(p => cards['ph:' + p.id]).length;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="w-full max-w-lg landscape:max-w-4xl mx-auto space-y-5">
        <header className="flex items-center gap-3">
          <button onClick={onBack} aria-label="뒤로" className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 text-slate-400"><ArrowLeft size={18} /></button>
          <div>
            <h2 className="text-2xl font-black text-slate-900 font-display">표현 도감</h2>
            <p className="text-sm font-medium text-slate-500">만난 표현 {metCount} / {items.length}</p>
          </div>
        </header>
        {groups.map(g => (
          <section key={g} className="space-y-2">
            <h3 className="text-xs font-black text-slate-400 px-1">{g}</h3>
            <div className="grid grid-cols-2 landscape:grid-cols-4 gap-2">
              {items.filter(p => p.group === g).map(p => {
                const card = cards['ph:' + p.id];
                const tone = toneOf(card);
                const cls = tone === 'none' ? 'bg-slate-50 border-dashed border-slate-200 text-slate-300'
                  : tone === 'grey' ? 'bg-white border-slate-200 text-slate-500'
                    : tone === 'color' ? 'bg-brand-50 border-brand-200 text-brand-800' : 'bg-amber-50 border-amber-300 text-amber-800 ring-2 ring-amber-200';
                return (
                  <button key={p.id} disabled={tone === 'none'} onClick={() => setOpen(p)}
                    className={`relative rounded-2xl border-2 p-3 min-h-[5.5rem] flex flex-col items-center justify-center gap-1 text-center ${cls}`}>
                    {tone === 'none' ? <span className="text-2xl font-black">?</span> : <>
                      {p.scene && <span className="text-3xl leading-none">{p.scene.emoji}</span>}
                      <span className={`${p.say ? 'en text-base' : 'text-xs font-black'} leading-tight`}>{p.say || p.scene?.ko}</span>
                    </>}
                    {heard[p.id] && <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full rotate-12 shadow">들었어요!</span>}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
        <p className="text-[11px] font-bold text-slate-400 leading-relaxed">회색은 익히는 중, 색이 칠해지면 익힌 표현, 금테는 완전히 익힌 표현이에요. 영상에서 아는 표현을 들으면 부모님께 말해서 "들었어요!" 도장을 받아요.</p>
      </div>

      <Sheet open={!!open} onClose={() => setOpen(null)}>
        {open && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                {open.scene && <span className="text-5xl">{open.scene.emoji}</span>}
                <div>
                  <div className="text-xs font-black text-slate-400">{open.group}{open.scene ? ` · ${open.scene.ko}` : ''}</div>
                  {open.say && <button onClick={() => speak(open.say!)} className="en text-2xl text-slate-900 flex items-center gap-2"><Volume2 size={20} className="text-brand-500" />{open.say}</button>}
                  {open.say && <div className="text-xs font-bold text-slate-400">{koFilled(open.say, f)}</div>}
                </div>
              </div>
              <CloseButton onClick={() => setOpen(null)} />
            </div>
            <div className="grid gap-2">
              {open.answers.map(a => (
                <button key={a} onClick={() => speak(a)} className="flex items-center gap-3 bg-slate-50 rounded-2xl px-4 py-2.5 text-left">
                  <Volume2 size={18} className="text-brand-500 shrink-0" />
                  <span><span className="en text-xl text-slate-800 block">{a}</span><span className="text-xs font-bold text-slate-400">{koFilled(a, f)}</span></span>
                </button>
              ))}
            </div>
            <button onClick={() => speakParts(open.say ? [open.say, ...open.answers] : open.answers, undefined, 600)} className="btn-secondary w-full py-3 flex items-center justify-center gap-2"><Volume2 size={18} />모두 이어서 듣기</button>
            {heard[open.id] && <div className="flex items-center gap-2 text-sm font-black text-rose-500"><Stamp size={18} />영상에서 들었어요! ({new Date(heard[open.id]).toLocaleDateString('ko-KR')})</div>}
          </div>
        )}
      </Sheet>
    </div>
  );
}
