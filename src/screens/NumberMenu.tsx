import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, BookOpen, CheckCircle2, ChevronRight, Lock, Play, Search } from 'lucide-react';
import { NumStage, RoundKind } from '../types';
import { STAGES, fmt } from '../engine/numbers';
import { CONCEPT_BY_STAGE } from '../engine/concepts';
import { useStore } from '../engine/store';
import { sayNumber } from '../components/NumberView';

interface Props {
  onBack: () => void;
  onStart: (stage: NumStage, kind: RoundKind) => void;
  onConcept: (stage: NumStage) => void;
}

/** 숫자 영어 — 단계 고르기 */
export default function NumberMenu({ onBack, onStart, onConcept }: Props) {
  const { progress, records } = useStore();
  const open = (id: NumStage) => id === 'n100' || progress.numCheck;
  const lastOf = (id: NumStage) => records.find(r => r.stage === id && r.kind === 'play');

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="w-full max-w-lg landscape:max-w-3xl mx-auto space-y-5">
        <header className="flex items-center gap-3">
          <button onClick={onBack} aria-label="뒤로" className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 text-slate-400"><ArrowLeft size={18} /></button>
          <div>
            <h2 className="text-2xl font-black text-slate-900 font-display">숫자 영어</h2>
            <p className="text-sm font-medium text-slate-500">큰 숫자도 영어로 척척!</p>
          </div>
        </header>

        {!progress.numCheck && (
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => onStart('n100', 'check')}
            className="w-full bg-gradient-to-br from-brand-500 to-brand-700 p-6 rounded-[2rem] shadow-xl shadow-brand-200 flex items-center gap-5 text-left">
            <div className="w-14 h-14 bg-white/25 rounded-2xl flex items-center justify-center shrink-0 text-white"><Search size={28} /></div>
            <div className="flex-1 min-w-0">
              <div className="text-xl font-black text-white">1 ~ 100 확인하기</div>
              <div className="text-white/80 text-sm font-medium mt-0.5">10문제를 다 맞히면 큰 숫자가 열려요</div>
            </div>
            <ChevronRight size={24} className="text-white/60 shrink-0" />
          </motion.button>
        )}

        <div className="space-y-3">
          {STAGES.map(st => {
            const on = open(st.id);
            const note = CONCEPT_BY_STAGE[st.id];
            const seen = progress.concepts.includes(note.id);
            const last = lastOf(st.id);
            return (
              <div key={st.id} className={`bg-white rounded-[2rem] border-2 p-5 space-y-3 ${on ? 'border-slate-100 shadow-sm' : 'border-dashed border-slate-200 opacity-60'}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <button disabled={!on} onClick={() => sayNumber(st.range[1])} className="en text-3xl text-slate-900 text-left">{st.name}</button>
                    <div className="text-xs font-bold text-slate-400">{st.desc}{last ? ` · 지난번 ${last.correct}/${last.total}` : ''}</div>
                  </div>
                  {!on && <span className="flex items-center gap-1 text-xs font-black text-slate-400 shrink-0"><Lock size={14} />확인을 통과하면 열려요</span>}
                </div>
                {on && (
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => onConcept(st.id)}
                      className="rounded-2xl border-2 border-brand-100 bg-brand-50 text-brand-700 font-black py-3 flex items-center justify-center gap-2 active:scale-95">
                      {seen ? <CheckCircle2 size={18} /> : <BookOpen size={18} />}개념 정리
                    </button>
                    <button onClick={() => onStart(st.id, 'play')}
                      className="rounded-2xl bg-brand-600 text-white font-black py-3 flex items-center justify-center gap-2 shadow-md shadow-brand-200 active:scale-95">
                      <Play size={18} />문제 풀기
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-slate-50 rounded-2xl p-4 text-xs font-bold text-slate-400 leading-relaxed">
          더 큰 숫자 <span className="en text-slate-500">{fmt(10000)}</span> 이상은 곧 열려요. "쉼표에서 끊어 읽기" 개념 정리를 보고 오면 준비 끝!
        </div>
      </div>
    </div>
  );
}
