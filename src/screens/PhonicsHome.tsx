import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, ChevronRight, Ear, Lock, Search, Volume2, XCircle } from 'lucide-react';
import { actions, useStore } from '../engine/store';
import { GROUPS, GROUP_CAREFUL, LETTER_BY_ID, letterSay } from '../data/phonics';
import { conceptCheck, groupProgress, letterCard, openGroups, poolLetters } from '../engine/phonics';
import { PQuestion } from '../engine/phrases';
import { dayIndex, toneOf } from '../engine/srs';
import { speak } from '../engine/speech';
import { tap } from '../components/ui';

export const phConceptId = (no: number) => 'ph-g' + no;

const BackBtn = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick} aria-label="뒤로" className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 text-slate-400"><ArrowLeft size={18} /></button>
);

/** 소리 탐정 — 시작 화면 */
export function PhonicsHome({ onBack, onStart, onConcept, onDogam }: {
  onBack: () => void; onStart: () => void; onConcept: (no: number) => void; onDogam: () => void;
}) {
  const { config, cards, progress, preview } = useStore();
  const open = preview ? GROUPS.length : openGroups(cards, progress.phonicsOpen);
  const pool = poolLetters(open);
  const today = dayIndex();
  const due = pool.filter(l => cards[letterCard(l)] && cards[letterCard(l)].due <= today && cards[letterCard(l)].box < 5).length;
  const unseen = pool.filter(l => !cards[letterCard(l)]).length;
  const prog = groupProgress(cards);
  const sub = unseen > 0 && due > 0 ? `새 글자와 복습 ${due}개가 기다려요` : unseen > 0 ? '새 글자 소리를 만나러 가요' : due > 0 ? `복습할 글자 ${due}개가 기다려요` : '오늘 복습은 끝! 한 판 더 해도 좋아요';
  // 새로 열린 묶음의 개념 정리를 아직 안 봤으면 개념 정리부터
  const needConcept = !preview && [...Array(open)].map((_, i) => i + 1).find(no => !progress.concepts.includes(phConceptId(no)));
  const start = () => (needConcept ? onConcept(needConcept) : onStart());

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="w-full max-w-lg landscape:max-w-3xl mx-auto space-y-5">
        <header className="flex items-center gap-3">
          <BackBtn onClick={onBack} />
          <div>
            <h2 className="text-2xl font-black text-slate-900 font-display">소리 탐정</h2>
            <p className="text-sm font-medium text-slate-500">단어의 첫소리를 찾아라!</p>
          </div>
        </header>

        <motion.button whileTap={{ scale: 0.97 }} onClick={start}
          className="w-full bg-gradient-to-br from-brand-500 to-brand-700 p-6 rounded-[2rem] shadow-xl shadow-brand-200 flex items-center gap-5 text-left">
          <div className="w-14 h-14 bg-white/25 rounded-2xl flex items-center justify-center shrink-0 text-white"><Search size={28} /></div>
          <div className="flex-1 min-w-0">
            <div className="text-xl font-black text-white">한 판 시작</div>
            <div className="text-white/80 text-sm font-medium mt-0.5">{needConcept ? `먼저 ${needConcept}묶음 개념 정리를 봐요` : `${config.count}문제 · ${sub}`}</div>
          </div>
          <ChevronRight size={24} className="text-white/60 shrink-0" />
        </motion.button>

        <div className="space-y-3">
          {prog.map(g => {
            const on = g.no <= open;
            return (
              <div key={g.id} className={`bg-white rounded-[2rem] border-2 p-5 space-y-3 ${on ? 'border-slate-100 shadow-sm' : 'border-dashed border-slate-200 opacity-60'}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-black text-slate-800 flex items-center gap-2">{g.no}묶음{g.done && <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">도장 완성</span>}</div>
                    <div className="en text-2xl text-slate-600 tracking-wider">{g.letters.join(' ')}</div>
                  </div>
                  {on ? (
                    <button onClick={() => onConcept(g.no)} className="btn-secondary px-4 py-2 text-sm shrink-0 flex items-center gap-1">
                      <BookOpen size={16} />개념 정리{!preview && !progress.concepts.includes(phConceptId(g.no)) && <span className="w-2 h-2 rounded-full bg-rose-500" />}
                    </button>
                  ) : <span className="flex items-center gap-1 text-xs font-black text-slate-400 shrink-0"><Lock size={14} />{g.no - 1}묶음을 익히면 열려요</span>}
                </div>
                {on && (
                  <>
                    <div className="bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                      <div className="bg-brand-500 h-full" style={{ width: `${(g.learned / g.total) * 100}%` }} />
                      <div className="bg-brand-200 h-full" style={{ width: `${((g.met - g.learned) / g.total) * 100}%` }} />
                    </div>
                    <div className="text-xs font-bold text-slate-400">익힌 글자 {g.learned} / {g.total}</div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <button onClick={onDogam} className="w-full bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 flex items-center justify-between active:scale-[0.98]">
          <span className="font-black text-slate-800 flex items-center gap-2"><BookOpen size={18} className="text-brand-500" />소리 도감</span>
          <span className="text-xs font-bold text-brand-500 flex items-center">펼쳐 보기<ChevronRight size={14} /></span>
        </button>
      </div>
    </div>
  );
}

/** 소리 탐정 개념 정리 — 숫자 영어 개념 정리와 같은 순서: ① 개념 쏙 → ② 이렇게 해요 → ③ 조심해요 → ④ 개념 확인(별 없음) */
export function PhonicsConcept({ groupNo, onBack, onPlay }: { groupNo: number; onBack: () => void; onPlay: () => void }) {
  const g = GROUPS[groupNo - 1];
  const [qs] = useState<PQuestion[]>(() => conceptCheck(groupNo));
  const [answers, setAnswers] = useState<(string | null)[]>(() => qs.map(() => null));
  const done = answers.every(a => a !== null);
  const allOk = done && answers.every((a, i) => a === qs[i].answer);
  const a = LETTER_BY_ID.a;

  const pick = (i: number, key: string) => {
    if (answers[i] !== null) return;
    const next = answers.slice(); next[i] = key; setAnswers(next);
    const l = LETTER_BY_ID[qs[i].itemId];
    speak(`${l.upper}. ${qs[i].play}.`);
    if (next.every(x => x !== null)) actions.markConcept(phConceptId(groupNo));
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
          <BackBtn onClick={onBack} />
          <div>
            <div className="text-xs font-black text-brand-600">개념 정리 · 소리 탐정 {groupNo}묶음</div>
            <h2 className="en text-3xl text-slate-900 tracking-wider">{g.letters.join(' ')}</h2>
          </div>
        </header>

        <Section no="1" title="개념 쏙">
          <p className="font-bold text-slate-600 leading-relaxed break-keep">
            글자에는 <strong className="text-slate-800">이름</strong>과 <strong className="text-brand-700">소리</strong>가 있어요. 이름은 알파벳 노래에서 부르는 것, 소리는 단어 속에서 나는 거예요.
          </p>
          <button onClick={() => speak(letterSay(a, a.words.slice(0, 1)))} className="w-full bg-slate-50 rounded-2xl p-3 flex items-center gap-4 active:scale-[0.98]">
            <span className="en text-5xl text-rose-500 w-16">a</span>
            <span className="text-left text-sm font-bold text-slate-600 flex-1">이름은 <strong>"{a.name}"</strong><br />소리는 <strong className="text-brand-700">"{a.sound}"</strong> → 🍎 <span className="en text-lg">apple</span></span>
            <Volume2 size={20} className="text-brand-500" />
          </button>
        </Section>

        <Section no="2" title="이렇게 해요">
          <p className="text-sm font-bold text-slate-500 break-keep">단어를 듣고 <strong className="text-slate-700">맨 처음 소리</strong>를 잡아요. 글자를 누르면 이름과 단어를 들려줘요.</p>
          <div className="grid grid-cols-2 landscape:grid-cols-3 gap-2">
            {g.letters.map(id => {
              const l = LETTER_BY_ID[id];
              return (
                <button key={id} onClick={() => speak(letterSay(l, l.words.slice(0, 3)))} className="bg-slate-50 rounded-2xl p-3 flex items-center gap-3 text-left active:scale-[0.98]">
                  <span className="en text-4xl text-rose-500 w-10 text-center shrink-0">{l.id}</span>
                  <span className="min-w-0">
                    <span className="text-[11px] font-black text-slate-400 block">이름 {l.name} · 소리 <span className="text-brand-700">{l.sound}</span></span>
                    <span className="text-2xl leading-none">{l.words.slice(0, 3).map(w => w.emoji).join(' ')}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </Section>

        <Section no="3" title="조심해요">
          {(GROUP_CAREFUL[g.id] || []).map((c, i) => (
            <div key={i} className="bg-amber-50 border border-amber-100 rounded-2xl p-3 space-y-1.5">
              <div className="font-black text-amber-800 text-sm">{c.title}</div>
              <p className="text-sm font-bold text-slate-500 break-keep">{c.note}</p>
              {c.say && (
                <div className="flex flex-wrap gap-2">
                  {c.say.map(w => (
                    <button key={w} onClick={() => speak(w)} className="bg-white rounded-xl px-3 py-1.5 en text-base text-slate-700 flex items-center gap-1.5 active:scale-95"><Volume2 size={14} className="text-brand-500" />{w}</button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </Section>

        <Section no="4" title="개념 확인 (별 없이 연습)">
          {qs.map((q, i) => {
            const ans = answers[i];
            return (
              <div key={i} className="space-y-2">
                <button onClick={() => speak(q.play!)} className="flex items-center gap-3 text-sm font-black text-brand-700 bg-brand-50 rounded-xl px-3 py-2 active:scale-95">
                  <span className="text-4xl leading-none">{q.emoji}</span><Ear size={16} />{i + 1}번 듣기 · 어떤 글자로 시작할까?
                </button>
                <div className={`grid gap-2 ${q.options.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
                  {q.options.map(o => {
                    const tone = ans === null ? 'bg-white border-slate-200 text-slate-800 active:bg-brand-50'
                      : o.key === q.answer ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                        : o.key === ans ? 'bg-rose-50 border-rose-400 text-rose-600' : 'bg-white border-slate-100 text-slate-300';
                    return (
                      <button key={o.key} disabled={ans !== null} {...tap(() => pick(i, o.key))}
                        className={`relative rounded-2xl border-2 py-3 en text-3xl ${tone}`}>
                        {o.text}
                        {ans !== null && o.key === q.answer && <CheckCircle2 size={16} className="absolute top-1.5 right-1.5 text-emerald-500" />}
                        {ans !== null && o.key === ans && ans !== q.answer && <XCircle size={16} className="absolute top-1.5 right-1.5 text-rose-500" />}
                      </button>
                    );
                  })}
                </div>
                {ans !== null && q.fb && <div className="text-xs font-bold text-slate-500">{q.fb.emoji} <span className="en text-base text-slate-700"><span className="text-rose-500">{q.fb.word[0]}</span>{q.fb.word.slice(1)}</span> = {q.fb.ko}</div>}
              </div>
            );
          })}
          {done && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`text-sm font-black rounded-xl px-3 py-2 ${allOk ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              {allOk ? '확인 완료! 이제 문제를 풀어 볼까? 🌟' : '확인 완료! 틀린 건 문제를 풀면서 다시 만나요 💪'}
            </motion.p>
          )}
        </Section>

        <button className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-2" onClick={() => { actions.markConcept(phConceptId(groupNo)); onPlay(); }}>
          소리 찾으러 가기<ArrowRight size={22} />
        </button>
      </div>
    </div>
  );
}

/** 소리 도감 — 만난 글자 소리가 모임. 묶음의 글자를 모두 익히면 도장 */
export function SoundDogam({ onBack }: { onBack: () => void }) {
  const { cards } = useStore();
  const prog = groupProgress(cards);
  const met = prog.reduce((n, g) => n + g.met, 0);
  const total = prog.reduce((n, g) => n + g.total, 0);
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="w-full max-w-lg landscape:max-w-4xl mx-auto space-y-5">
        <header className="flex items-center gap-3">
          <BackBtn onClick={onBack} />
          <div>
            <h2 className="text-2xl font-black text-slate-900 font-display">소리 도감</h2>
            <p className="text-sm font-medium text-slate-500">찾은 글자 소리 {met} / {total}</p>
          </div>
        </header>
        {prog.map(g => (
          <section key={g.id} className="relative bg-white rounded-[2rem] border border-slate-100 shadow-sm p-4 space-y-2">
            <h3 className="text-xs font-black text-slate-400 px-1">{g.no}묶음</h3>
            {g.done && <span className="absolute -top-2 right-4 bg-rose-500 text-white text-xs font-black px-3 py-1 rounded-full rotate-6 shadow">🏅 {g.no}묶음 완성!</span>}
            <div className="grid grid-cols-3 landscape:grid-cols-7 gap-2">
              {g.letters.map(id => {
                const l = LETTER_BY_ID[id];
                const tone = toneOf(cards[letterCard(id)]);
                const cls = tone === 'none' ? 'bg-slate-50 border-dashed border-slate-200 text-slate-300'
                  : tone === 'grey' ? 'bg-white border-slate-200 text-slate-600'
                    : tone === 'color' ? 'bg-brand-50 border-brand-200 text-brand-800' : 'bg-amber-50 border-amber-300 text-amber-800 ring-2 ring-amber-200';
                return (
                  <button key={id} disabled={tone === 'none'} onClick={() => speak(letterSay(l, l.words.slice(0, 3)))}
                    className={`rounded-2xl border-2 p-2 min-h-[6rem] flex flex-col items-center justify-center gap-1 ${cls}`}>
                    <span className="en text-4xl leading-none">{tone === 'none' ? '?' : l.id}</span>
                    {tone !== 'none' && <>
                      <span className="text-[10px] font-black opacity-70">소리 {l.sound}</span>
                      <span className="text-lg leading-none">{l.words.slice(0, 3).map(w => w.emoji).join('')}</span>
                    </>}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
        <p className="text-[11px] font-bold text-slate-400 leading-relaxed">회색은 익히는 중, 색이 칠해지면 익힌 소리, 금테는 완전히 익힌 소리예요. 한 묶음을 모두 익히면 도장을 받아요.</p>
      </div>
    </div>
  );
}
