import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, CheckCircle2, Snail, Volume2, XCircle } from 'lucide-react';
import { ConceptNote } from '../engine/concepts';
import { Question } from '../types';
import { fmt } from '../engine/numbers';
import { actions } from '../engine/store';
import { NumberView, sayNumber, sayNumberSlow } from '../components/NumberView';
import { tap } from '../components/ui';

/**
 * 개념 정리 화면 — 수학 에이스 개념노트와 같은 순서
 * ① 개념 쏙 → ② 이렇게 해요 → ③ 조심해요 → ④ 개념 확인(별 없음) → 문제 풀기
 */
export default function Concept({ note, onBack, onPlay }: { note: ConceptNote; onBack: () => void; onPlay: () => void }) {
  const [active, setActive] = useState(-1);
  const [qs] = useState<Question[]>(() => note.check());
  const [answers, setAnswers] = useState<(string | null)[]>(() => qs.map(() => null));
  const done = answers.every(a => a !== null);
  const allOk = done && answers.every((a, i) => a === qs[i].answer);

  const pick = (i: number, key: string) => {
    if (answers[i] !== null) return;
    const next = answers.slice(); next[i] = key; setAnswers(next);
    sayNumber(qs[i].value);
    if (next.every(a => a !== null)) actions.markConcept(note.id);
  };

  const Section = ({ no, title, children }: { no: string; title: string; children: React.ReactNode }) => (
    <section className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 space-y-3">
      <h3 className="font-black text-slate-800 flex items-center gap-2"><span className="w-7 h-7 rounded-lg bg-brand-600 text-white text-sm flex items-center justify-center">{no}</span>{title}</h3>
      {children}
    </section>
  );

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="w-full max-w-lg landscape:max-w-3xl mx-auto space-y-4">
        <header className="flex items-center gap-3">
          <button onClick={onBack} aria-label="뒤로" className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 text-slate-400"><ArrowLeft size={18} /></button>
          <div>
            <div className="text-xs font-black text-brand-600">개념 정리</div>
            <h2 className="text-2xl font-black text-slate-900 font-display">{note.title}</h2>
          </div>
        </header>

        <Section no="1" title="개념 쏙">
          <p className="font-bold text-slate-600 leading-relaxed break-keep">{note.core}</p>
          <div className="flex flex-wrap gap-2">
            {note.coreExamples.map(n => (
              <button key={n} onClick={() => sayNumber(n)} className="bg-brand-50 text-brand-700 rounded-2xl px-4 py-2 flex items-center gap-2 active:scale-95">
                <Volume2 size={16} /><span className="en text-2xl">{fmt(n)}</span>
              </button>
            ))}
          </div>
        </Section>

        <Section no="2" title="이렇게 해요">
          <NumberView value={note.howExample} colored labels active={active} words className="text-6xl py-2" />
          <ul className="space-y-1.5">
            {note.how.map((line, i) => <li key={i} className="en text-lg text-slate-700 bg-slate-50 rounded-xl px-3 py-2">{line}</li>)}
          </ul>
          <div className="flex gap-2">
            <button onClick={() => sayNumberSlow(note.howExample, setActive)} className="btn-secondary flex-1 py-3 flex items-center justify-center gap-2"><Snail size={18} />끊어서 듣기</button>
            <button onClick={() => sayNumber(note.howExample)} className="btn-secondary flex-1 py-3 flex items-center justify-center gap-2"><Volume2 size={18} />이어서 듣기</button>
          </div>
        </Section>

        <Section no="3" title="조심해요">
          {note.careful.map((c, i) => (
            <div key={i} className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-3"><div className="text-[11px] font-black text-rose-500 mb-1">틀린 생각</div><div className="en text-base text-rose-700 line-through decoration-rose-300">{c.wrong}</div></div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3"><div className="text-[11px] font-black text-emerald-600 mb-1">바른 읽기</div><div className="en text-base text-emerald-700">{c.right}</div></div>
              </div>
              <p className="text-sm font-bold text-slate-500 break-keep">{c.note}</p>
              {c.play && (
                <div className="flex gap-2">
                  {c.play.map(n => (
                    <button key={n} onClick={() => sayNumber(n)} className="bg-slate-50 rounded-xl px-3 py-1.5 text-sm font-black text-slate-600 flex items-center gap-1.5 active:scale-95"><Volume2 size={14} />{fmt(n)}</button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </Section>

        <Section no="4" title="개념 확인 (별 없이 연습)">
          {qs.map((q, i) => {
            const a = answers[i];
            return (
              <div key={i} className="space-y-2">
                <button onClick={() => sayNumber(q.value)} className="flex items-center gap-2 text-sm font-black text-brand-700 bg-brand-50 rounded-xl px-3 py-2 active:scale-95">
                  <Volume2 size={16} />{i + 1}번 듣기
                </button>
                <div className={`grid gap-2 ${q.options.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  {q.options.map(o => {
                    const tone = a === null ? 'bg-white border-slate-200 text-slate-800 active:bg-brand-50'
                      : o.key === q.answer ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                        : o.key === a ? 'bg-rose-50 border-rose-400 text-rose-600' : 'bg-white border-slate-100 text-slate-300';
                    return (
                      <button key={o.key} disabled={a !== null} {...tap(() => pick(i, o.key))}
                        className={`relative rounded-2xl border-2 py-3 en text-2xl ${tone}`}>
                        {o.label}
                        {a !== null && o.key === q.answer && <CheckCircle2 size={16} className="absolute top-1.5 right-1.5 text-emerald-500" />}
                        {a !== null && o.key === a && a !== q.answer && <XCircle size={16} className="absolute top-1.5 right-1.5 text-rose-500" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {done && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`text-sm font-black rounded-xl px-3 py-2 ${allOk ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              {allOk ? '확인 완료! 이제 문제를 풀어 볼까? 🌟' : '확인 완료! 틀린 건 문제를 풀면서 다시 만나요 💪'}
            </motion.p>
          )}
        </Section>

        <button className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-2" onClick={onPlay}>
          이 방법으로 문제 풀기<ArrowRight size={22} />
        </button>
      </div>
    </div>
  );
}
