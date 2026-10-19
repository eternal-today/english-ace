import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, CheckCircle2, Ear, Search, Flame, Home, Lightbulb, RotateCcw, Scissors, Sparkles, Star, Volume2, XCircle } from 'lucide-react';
import { RoundItem, RoundRecord } from '../types';
import { Milestone, actions, getState, useStore } from '../engine/store';
import { HINT_COST, useWallet } from '../ace/wallet';
import { PQuestion, PType, allItems, fillOf, openLevel, planPRound, resolve } from '../engine/phrases';
import { koFilled, koOf } from '../data/phrases';
import { shuffle } from '../engine/numbers';
import { applyAnswer } from '../engine/srs';
import { speak, speakParts, speakWords, stopSpeak } from '../engine/speech';
import { fireConfetti, tap, toast } from '../components/ui';
import { SceneArt } from '../components/SceneArt';
import { SavedRound, clearRound, saveRound } from '../engine/resume';

const GUARD_MS = 400;

interface Props {
  onExit: () => void;
  onAgain: () => void;
  onMilestone: (m: Milestone) => void;
  onOpenShop: () => void;
  resume?: SavedRound | null;
  backRef: React.MutableRefObject<null | (() => void)>;
}

/** 상황 설명 (기록·힌트 장부에 남기는 짧은 글) */
const promptText = (q: { say?: string; scene?: { ko: string }; play?: string }) => q.play || q.say || q.scene?.ko || '';

/** 문제 종류별 제목 (무엇을 고르는지 크게 보여 줌) */
const TYPE_HEAD: Record<PType, { badge: string; title: string; sub: string }> = {
  odd: { badge: '엉뚱한 대답 찾기', title: '딱 하나만 안 어울려요!', sub: '어울리지 않는 대답 하나를 골라요' },
  scene: { badge: '언제 하는 말일까?', title: '이 말은 언제 할까요?', sub: '듣고 알맞은 상황을 골라요' },
  meaning: { badge: '무슨 뜻일까?', title: '이 말은 무슨 뜻일까요?', sub: '듣고 알맞은 뜻을 골라요' },
  reply: { badge: '어떤 말에 한 대답일까?', title: '누가 뭐라고 했을 때 한 대답일까요?', sub: '듣고 알맞은 말을 골라요' },
};

export default function PhrasePlay({ onExit, onAgain, onMilestone, onOpenShop, resume, backRef }: Props) {
  const store = useStore();
  const { config, preview } = store;
  const f = fillOf(config);
  const balance = useWallet().balance;
  const [round] = useState(() => {
    if (resume?.pquestions) return { questions: resume.pquestions, newIds: resume.newIds || [] };
    const s = getState();
    return planPRound(s.config, s.cards, s.custom, preview ? 99 : openLevel(s.cards, fillOf(s.config)));
  });
  const { questions, newIds } = round;
  const itemById = (id: string) => {
    const p = allItems(getState().custom).find(x => x.id === id);
    return p ? resolve(p, f) : null;
  };

  const [phase, setPhase] = useState<'intro' | 'solving' | 'retry' | 'result'>(!resume && newIds.length ? 'intro' : 'solving');
  const [introIdx, setIntroIdx] = useState(0);
  const [idx, setIdx] = useState(resume ? resume.items.length : 0);
  const [picked, setPicked] = useState<string | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const selAt = useRef(0);
  const [okNow, setOkNow] = useState<boolean | null>(null);
  const [retryQs, setRetryQs] = useState<PQuestion[]>([]);
  const [rIdx, setRIdx] = useState(0);
  const pending = useRef<{ pct: number; hit: Milestone | null; newLevel: number }>({ pct: 0, hit: null, newLevel: 0 });
  const [removed, setRemoved] = useState<string[]>([]);
  const [hinted, setHinted] = useState(false);
  const [paidUsed, setPaidUsed] = useState(resume?.paidUsed || 0);
  const [askQuit, setAskQuit] = useState(false);
  const [askPaid, setAskPaid] = useState(false);
  const [combo, setCombo] = useState(resume?.combo || 0);
  const [maxCombo, setMaxCombo] = useState(resume?.maxCombo || 0);
  const [items, setItems] = useState<RoundItem[]>(resume?.items || []);
  const [record, setRecord] = useState<RoundRecord | null>(null);
  const [word, setWord] = useState(-1);   // 끊어 듣기 중인 단어
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readyAt = useRef(0);
  const nextRef = useRef<() => void>(() => { });
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); stopSpeak(); }, []);
  useEffect(() => { readyAt.current = Date.now() + GUARD_MS; }, [idx, rIdx, phase]);

  useEffect(() => {
    if (phase !== 'solving' || !questions.length || preview) return;
    saveRound({ ts: Date.now(), menu: 'phrases', stage: 'n100', kind: 'play', questions: [], pquestions: questions, newIds, items, paidUsed, combo, maxCombo });
  }, [phase, items, paidUsed]);

  useEffect(() => {
    backRef.current = () => { if (phase === 'solving') setAskQuit(v => !v); else if (phase === 'retry') enterResult(); else onExit(); };
    return () => { backRef.current = null; };
  });

  const inRetry = phase === 'retry';
  const q = inRetry ? retryQs[rIdx] : questions[idx];
  const answered = picked !== null;
  const lastOk = answered && okNow === true;

  // 문제가 나오면 상대의 말을 들려줌
  useEffect(() => {
    setWord(-1);
    const first = q?.type === 'odd' ? q.say : q?.play;
    if ((phase === 'solving' || phase === 'retry') && first) {
      const t = setTimeout(() => speak(first), 350);
      return () => clearTimeout(t);
    }
  }, [phase, idx, rIdx]);

  const resumedDone = useRef(false);
  useEffect(() => {
    if (resume && !resumedDone.current && items.length >= questions.length && questions.length > 0) {
      resumedDone.current = true;
      finish(items);
    }
  }, []);

  if (!questions.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="text-6xl">📭</div>
        <p className="text-lg font-bold text-slate-600 break-keep">아직 나올 표현이 없어요. 부모님 화면에서 "한 판에 새로 나오는 것"을 1개 이상으로 해 주세요.</p>
        <button className="btn-primary px-10 py-4 text-lg" onClick={onExit}>홈으로</button>
      </div>
    );
  }

  const finish = (finalItems: RoundItem[]) => {
    const correct = finalItems.filter(i => i.ok).length;
    const total = finalItems.length;
    const accOk = total === 0 || correct / total >= 0.4;
    const stars = accOk ? Math.floor(correct / 5) : 0;
    const rec: RoundRecord = {
      ts: Date.now(), date: new Date().toLocaleDateString('ko-KR'), menu: 'phrases', kind: 'play', correct, total, stars,
      hintsPaid: paidUsed, items: finalItems,
      ...(!accOk && Math.floor(correct / 5) > 0 ? { lowAcc: true } : {}),
    };
    clearRound();
    const hit = preview ? null : actions.addRecord(rec);
    // 새 단계가 열렸는지 (아이에게 한 번 알려 줌)
    let newLevel = 0;
    if (!preview) {
      const s = getState();
      const lv = openLevel(s.cards, fillOf(s.config));
      if (lv > s.progress.phraseLevel) { newLevel = lv; actions.setProgress({ phraseLevel: lv }); }
    }
    setRecord(rec);
    pending.current = { pct: total ? Math.round((correct / total) * 100) : 0, hit, newLevel };
    const wrongQs = questions.filter((_, i) => finalItems[i] && !finalItems[i].ok);
    if (wrongQs.length) {
      setRetryQs(wrongQs.map(x => ({ ...x, options: shuffle(x.options), isNew: false })));
      setRIdx(0); resetQ(); setPhase('retry');
    } else enterResult();
  };

  const enterResult = () => {
    const { pct, hit } = pending.current;
    stopSpeak();
    setPhase('result');
    if (pct === 100) setTimeout(() => fireConfetti('epic'), 300);
    else if (pct >= 80) setTimeout(() => fireConfetti('big'), 300);
    if (hit) setTimeout(() => onMilestone(hit), 1400);
  };

  function resetQ() { setPicked(null); setSel(null); setRemoved([]); setHinted(false); setOkNow(null); setWord(-1); }

  const goNext = (finalItems: RoundItem[]) => {
    stopSpeak();
    if (inRetry) {
      if (rIdx + 1 >= retryQs.length) { enterResult(); return; }
      setRIdx(rIdx + 1); resetQ(); return;
    }
    if (idx + 1 >= questions.length) { finish(finalItems); return; }
    setIdx(idx + 1); resetQ();
  };

  /** 맞혔을 때: 상대의 말 → 맞는 대답 하나를 이어서 들려준 뒤 1.5초 쉬고 다음 문제로 */
  const advanceAfterSound = (list: RoundItem[]) => {
    let done = false;
    let fallback: ReturnType<typeof setTimeout> | null = null;
    const go = () => {
      if (done) return;
      done = true;
      if (fallback) clearTimeout(fallback);
      if (timerRef.current) clearTimeout(timerRef.current);
      goNext(list);
    };
    nextRef.current = go;
    fallback = setTimeout(go, 8000);
    // 대화로 들려줌: 상대의 말 → 대답
    const it = itemById(q.itemId);
    const dialog = (q.type === 'odd' ? [q.say, q.options.find(o => !o.correct)?.text]
      : q.type === 'reply' ? [it?.say, q.play]
        : [it?.say && it.say !== q.play ? it.say : undefined, q.play]).filter((x): x is string => !!x);
    speakParts(dialog, i => { if (i === -1 && !done) { if (fallback) clearTimeout(fallback); timerRef.current = setTimeout(go, 1500); } }, 500);
  };

  const answer = (key: string) => {
    if (answered || Date.now() < readyAt.current) return;
    readyAt.current = Date.now() + GUARD_MS;
    const ok = key === q.answer;
    setOkNow(ok);
    setPicked(key);
    if (inRetry) {
      if (ok) advanceAfterSound(items);
      else if (q.type === 'odd') speak(q.options.find(o => o.correct)!.text);
      return;
    }
    // 기억 상자: 틀렸거나 힌트를 보고 맞힌 상황은 몰랐던 것으로 보고 복습에 넣음
    if (!preview) {
      const cards = { ...getState().cards };
      const id = 'ph:' + q.itemId;
      cards[id] = applyAnswer(cards[id], ok && !hinted, false);
      actions.setCards(cards);
    }
    const rightText = q.options.find(o => o.correct)!.text;
    const item: RoundItem = { id: 'ph:' + q.itemId, type: 'odd', q: `${TYPE_HEAD[q.type].badge} · ${promptText(q)}`, ans: rightText, val: q.options.find(o => o.key === key)?.text || '', ok, hint: hinted };
    const next = [...items, item];
    setItems(next);
    const nc = ok ? combo + 1 : 0;
    setCombo(nc);
    if (nc > maxCombo) setMaxCombo(nc);
    if (ok) advanceAfterSound(next);
    else if (q.type === 'odd') speak(rightText);
    else if (q.play) speak(q.play);
  };

  /** 보기 지우기 힌트: 정답이 아닌 보기 하나를 지움 (무료 없음, 1회 별 1개) */
  const applyHint = () => {
    const right = q.options.filter(o => !o.correct && !removed.includes(o.key)).map(o => o.key);
    if (right.length <= 1) { toast('더 지울 보기가 없어요'); return; }
    const out = right[Math.floor(Math.random() * right.length)];
    setRemoved([...removed, out]);
    if (sel === out) setSel(null);
    setHinted(true);
    setPaidUsed(n => n + 1);
  };
  const pressHint = () => {
    if (answered || hinted || inRetry) return;
    if (preview) { applyHint(); return; }
    if (balance < HINT_COST) { toast('별이 모자라요. 끊어 듣기로 다시 들어 볼까? ✂️'); return; }
    setAskPaid(true);
  };

  const leave = () => { if (phase === 'solving') setAskQuit(true); else if (phase === 'retry') enterResult(); else onExit(); };
  const quit = () => {
    setAskQuit(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (items.length === 0) clearRound();
    onExit();
  };
  const choose = (key: string) => {
    if (answered || removed.includes(key)) return;
    selAt.current = Date.now();
    setSel(key);
    const sp = q.options.find(o => o.key === key)?.speak;
    if (sp) speak(sp);
  };
  const submitChoice = () => {
    if (!sel || removed.includes(sel) || Date.now() - selAt.current < GUARD_MS) return;
    answer(sel);
  };

  /** 상대의 말 (끊어 듣기 중이면 단어마다 색칠) */
  const SayLine = ({ text }: { text: string }) => (
    <div className="en text-[clamp(1.5rem,6vmin,2.5rem)] text-slate-800 flex flex-wrap justify-center gap-x-2">
      {text.split(/\s+/).map((w, i) => <span key={i} className={`rounded-lg px-1 transition-colors ${word === i ? 'bg-brand-100 text-brand-800' : ''}`}>{w}</span>)}
    </div>
  );

  // ════════ 새 표현 소개 ════════
  if (phase === 'intro') {
    const p = itemById(newIds[introIdx]);
    const last = introIdx + 1 >= newIds.length;
    const next = () => { stopSpeak(); last ? setPhase('solving') : setIntroIdx(introIdx + 1); };
    if (!p) return (
      <div className="flex-1 flex items-center justify-center p-8"><button className="btn-primary px-10 py-4 text-lg" onClick={next}>계속</button></div>
    );
    return (
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center">
        <div className="w-full max-w-md text-center space-y-5">
          <div className="text-sm font-black text-brand-600 flex items-center justify-center gap-2">
            <Sparkles size={16} />오늘 처음 만나는 표현 {introIdx + 1} / {newIds.length}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={p.id} initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }}
              className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-brand-100 p-7 space-y-4">
              {p.scene && <SceneArt scene={p.scene} size="lg" />}
              {p.scene && !p.say && <div className="text-lg font-black text-slate-700">{p.scene.ko}에는 이렇게 말해요</div>}
              {p.say && (
                <button onClick={() => speak(p.say!)} className="w-full bg-brand-50 rounded-2xl px-4 py-3 active:scale-95">
                  <div className="en text-3xl text-brand-800 flex items-center justify-center gap-2"><Volume2 size={24} />{p.say}</div>
                  <div className="text-sm font-bold text-brand-600 mt-1">{koOf(p.say, f)}</div>
                </button>
              )}
              {p.say && <div className="text-xs font-black text-slate-400">이렇게 대답할 수 있어요</div>}
              <div className="grid gap-2">
                {p.answers.map(a => (
                  <button key={a} onClick={() => speak(a)} className="flex items-center gap-3 bg-slate-50 rounded-2xl px-4 py-2.5 text-left active:scale-[0.98]">
                    <Volume2 size={18} className="text-brand-500 shrink-0" />
                    <span className="min-w-0"><span className="en text-xl text-slate-800 block">{a}</span><span className="text-xs font-bold text-slate-400">{koFilled(a, f)}</span></span>
                  </button>
                ))}
              </div>
              <button onClick={() => speakParts(p.say ? [p.say, ...p.answers] : p.answers, undefined, 600)} className="btn-secondary w-full py-3 flex items-center justify-center gap-2">
                <Volume2 size={18} />모두 이어서 듣기
              </button>
            </motion.div>
          </AnimatePresence>
          <button className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-2" onClick={next}>
            {last ? '문제 풀러 가기' : '다음 표현'}<ArrowRight size={22} />
          </button>
          <button className="text-sm font-bold text-slate-400" onClick={onExit}>홈으로</button>
        </div>
      </div>
    );
  }

  // ════════ 결과 ════════
  if (phase === 'result' && record) {
    const pct = record.total ? Math.round((record.correct / record.total) * 100) : 0;
    const cfg = pct >= 90 ? { emoji: '🏆', msg: '완벽해요!', sub: '엉뚱한 대답을 척척 찾았어!', color: 'bg-amber-100' }
      : pct >= 70 ? { emoji: '🌟', msg: '잘했어요!', sub: '여러 가지 대답을 잘 알고 있구나!', color: 'bg-brand-100' }
        : pct >= 50 ? { emoji: '💪', msg: '조금만 더!', sub: '헷갈린 표현은 곧 다시 만나게 돼!', color: 'bg-orange-100' }
          : { emoji: '📚', msg: '다시 도전!', sub: '보기를 하나씩 눌러 들어 보면 잘할 수 있어!', color: 'bg-rose-100' };
    const spent = record.hintsPaid * HINT_COST;
    const newLevel = pending.current.newLevel;
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-lg landscape:max-w-5xl mx-auto space-y-6 landscape:space-y-0 landscape:grid landscape:grid-cols-2 landscape:gap-6 landscape:items-start">
          <div className="bg-white rounded-[2.5rem] p-7 shadow-2xl shadow-slate-200/50 border border-slate-100 space-y-5 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 10, delay: 0.1 }}
              className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center text-4xl ${cfg.color}`}>{cfg.emoji}</motion.div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 font-display">{cfg.msg}</h2>
              <p className="text-slate-500 font-medium mt-1">{cfg.sub}</p>
            </div>
            {newLevel > 0 && (
              <div className="rounded-3xl p-4 font-black text-sm bg-brand-50 text-brand-700 border border-brand-100">🎉 새 표현이 생겼어요! 다음 판부터 {newLevel}단계 표현이 나와요.</div>
            )}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 p-3 rounded-3xl">
                <div className="text-2xl font-black text-brand-600 font-display">{record.correct}<span className="text-xs text-slate-400">/{record.total}</span></div>
                <div className="text-[11px] font-bold text-slate-400 mt-1">정답</div>
              </div>
              <div className="bg-slate-50 p-3 rounded-3xl">
                <div className="text-2xl font-black text-amber-500 font-display flex items-center justify-center gap-1"><Star size={20} className="fill-amber-500" />+{record.stars}</div>
                <div className="text-[11px] font-bold text-slate-400 mt-1">번 별</div>
              </div>
              <div className="bg-slate-50 p-3 rounded-3xl">
                <div className="text-2xl font-black text-orange-500 font-display flex items-center justify-center gap-1"><Flame size={20} />{maxCombo}</div>
                <div className="text-[11px] font-bold text-slate-400 mt-1">최고 콤보</div>
              </div>
            </div>
            <button onClick={onOpenShop} className="w-full bg-amber-50 border border-amber-100 rounded-3xl p-4 text-left active:scale-[0.98] transition-transform">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-amber-700">지금 가진 별</span>
                <span className="flex items-center gap-1.5 text-2xl font-black text-amber-600 font-display"><Star size={22} className="fill-amber-500 text-amber-500" />{balance}</span>
              </div>
              <p className="text-xs font-bold text-amber-600 mt-1">
                이번 판: 번 별 {record.stars}개{spent > 0 ? ` · 힌트에 쓴 별 ${spent}개` : ''}
                <span className="text-amber-400 font-medium"> · 5문제 맞힐 때마다 별 1개</span>
              </p>
              {preview && <p className="text-xs font-black text-slate-500 mt-2 bg-white rounded-xl px-3 py-2">👀 부모님 체험이라 별과 기록은 남지 않았어요.</p>}
              {record.lowAcc && (
                <p className="text-xs font-black text-rose-500 mt-2 bg-white rounded-xl px-3 py-2">
                  10문제 중 4문제보다 적게 맞혀서 이번 판은 별이 없어요. 보기를 하나씩 들어 보고 고르면 별을 받을 수 있어! 💪
                </p>
              )}
            </button>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm text-left">
              <h4 className="text-sm font-black text-slate-800 mb-3">문제별 결과</h4>
              <div className="grid gap-2 max-h-72 overflow-y-auto pr-1">
                {record.items.map((it, i) => (
                  <div key={i} className={`p-3 rounded-xl border flex justify-between items-center gap-3 ${it.ok ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                    <button className="min-w-0 text-left" onClick={() => speak(it.q.match(/[a-z]/i) ? it.q : it.ans)}>
                      <div className="text-sm font-black text-slate-700 truncate flex items-center gap-1"><Volume2 size={14} className="text-slate-400 shrink-0" />{it.q}</div>
                      <div className="text-[11px] font-bold text-slate-400 truncate">엉뚱한 대답: {it.ans}{it.hint ? ' · 힌트 봄' : ''}</div>
                    </button>
                    <div className="flex items-center gap-2 shrink-0">
                      {!it.ok && <span className="text-xs font-black text-rose-600 en">{it.val || '-'}</span>}
                      {it.ok ? <CheckCircle2 size={18} className="text-emerald-500" /> : <XCircle size={18} className="text-rose-500" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pb-4">
              <button className="btn-primary flex-1 py-5 text-lg flex items-center justify-center gap-2" onClick={onAgain}>
                <RotateCcw size={20} /><span>한 판 더</span>
              </button>
              <button className="btn-secondary flex-1 py-5 text-lg flex items-center justify-center gap-2" onClick={onExit}>
                <Home size={20} /><span>홈으로</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ════════ 문제 풀기 ════════
  if (!q) return null;
  const curNo = inRetry ? rIdx + 1 : idx + 1;
  const curTotal = inRetry ? retryQs.length : questions.length;
  const rightOpt = q.options.find(o => o.correct)!;
  const head = TYPE_HEAD[q.type];
  const listenText = q.type === 'odd' ? q.say : q.play;   // 이 문제에서 듣는 말
  const pickedOpt = q.options.find(o => o.key === picked);
  const koText = (t: string) => koFilled(t, f);

  return (
    <div className="flex flex-col h-full max-w-2xl landscape:max-w-6xl mx-auto w-full">
      <div className="shrink-0 px-4 pt-4 pb-2">
        <div className="flex items-center gap-3">
          <button onClick={leave} aria-label="나가기"
            className="shrink-0 w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 text-slate-400">
            <Home size={16} />
          </button>
          <div className="bg-slate-200 h-2.5 flex-1 rounded-full overflow-hidden">
            <motion.div className="bg-gradient-to-r from-brand-500 to-brand-400 h-full rounded-full"
              initial={{ width: 0 }} animate={{ width: `${(curNo / curTotal) * 100}%` }} />
          </div>
          <AnimatePresence>
            {combo >= 2 && (
              <motion.span key={combo} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
                className="shrink-0 flex items-center gap-1 bg-orange-100 text-orange-600 font-black text-xs px-2.5 py-1 rounded-full">
                <Flame size={12} /> {combo}
              </motion.span>
            )}
          </AnimatePresence>
          <span className="shrink-0 flex items-center gap-1 text-xs font-black text-amber-600"><Star size={14} className="fill-amber-400 text-amber-400" />{balance}</span>
          <span className="shrink-0 text-xs font-black text-slate-400">{curNo}/{curTotal}</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col landscape:flex-row">
        <div className="flex-1 min-h-0 min-w-0 px-4 py-2 landscape:pr-2 landscape:pb-4">
          <div className="w-full h-full bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col items-center justify-center px-5 py-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-brand-500/10" />
            <div className="absolute top-4 left-5 right-5 flex items-center justify-between text-xs font-black">
              <span className={inRetry ? 'text-rose-500' : 'text-slate-400'}>{inRetry ? '틀린 문제 다시 풀기 · 별과 상관없는 연습이에요' : '오늘의 한 마디'}</span>
              {q.isNew && !inRetry && <span className="bg-brand-100 text-brand-700 px-2.5 py-1 rounded-full">새 표현</span>}
              {q.isReview && !q.isNew && !inRetry && <span className="bg-brand-100 text-brand-700 px-2.5 py-1 rounded-full">다시 만난 표현</span>}
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={inRetry ? `r${rIdx}` : idx} initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}
                className="flex flex-col items-center justify-center gap-4 w-full text-center">
                <div className="space-y-1">
                  <div className={`inline-flex items-center gap-1.5 text-sm font-black px-4 py-1.5 rounded-full ${q.type === 'odd' ? 'bg-rose-100 text-rose-700' : 'bg-brand-100 text-brand-800'}`}>{q.type === 'odd' ? <Search size={16} strokeWidth={2.6} /> : <Ear size={16} strokeWidth={2.6} />}{head.badge}</div>
                  <div className="text-lg font-black text-slate-800">{head.title}</div>
                </div>
                {q.type === 'odd' && q.scene && <SceneArt scene={q.scene} size="lg" />}
                {q.type === 'odd' && q.scene && !q.say && <div className="text-xl font-black text-slate-700">{q.scene.ko} 뭐라고 할까?</div>}
                {listenText && (
                  <div className="space-y-3">
                    {(q.type === 'odd' || answered) ? <SayLine text={listenText} /> : <div className="w-20 h-20 rounded-[1.75rem] bg-brand-50 text-brand-500 flex items-center justify-center mx-auto"><Ear size={40} strokeWidth={2.2} /></div>}
                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => speak(listenText)} aria-label="다시 듣기"
                        className="h-14 px-6 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center gap-2 font-black shadow-lg shadow-brand-200 active:scale-95">
                        <Volume2 size={24} />다시 듣기
                      </button>
                      <button onClick={() => speakWords(listenText, setWord)} aria-label="끊어 듣기"
                        className="h-14 px-5 rounded-full bg-white border-2 border-brand-200 text-brand-600 flex items-center gap-2 font-black active:scale-95">
                        <Scissors size={20} />끊어 듣기
                      </button>
                    </div>
                  </div>
                )}

                {answered && (
                  <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`px-5 py-3 rounded-2xl font-black max-w-md ${lastOk ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                    {q.type === 'odd' ? (
                      <>
                        <div className="text-sm">{lastOk ? (combo >= 3 && !inRetry ? `${combo}연속! 엉뚱한 대답 찾기 선수야! ⚡` : '엉뚱한 대답을 찾았어! 😆') : `'${pickedOpt?.text}'도 어울리는 대답이에요!`}</div>
                        <div className="mt-1 text-sm font-bold text-slate-600 break-keep">
                          <span className="en text-base text-slate-800">{rightOpt.text}</span>는 "{koText(rightOpt.text)}"라는 말이라서 여기엔 안 어울려요.
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-sm">{lastOk ? (combo >= 3 && !inRetry ? `${combo}연속! 대단해! ⚡` : '정답이야! 🌟') : '아까비! 정답을 같이 볼까? 💪'}</div>
                        <div className="mt-1 text-sm font-bold text-slate-600 break-keep">
                          <span className="en text-base text-slate-800">{q.play}</span>
                          {q.type === 'reply' ? <> 는 <span className="en text-base text-slate-800">{rightOpt.text}</span>에 하는 대답이에요.</>
                            : q.type === 'scene' ? <> 는 "{rightOpt.text}" 하는 말이에요.</> : <> 는 "{rightOpt.text}"라는 뜻이에요.</>}
                        </div>
                      </>
                    )}
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="shrink-0 px-4 pb-4 pt-1 space-y-2 landscape:w-[44%] landscape:max-w-lg landscape:pl-2 landscape:pt-2 landscape:flex landscape:flex-col landscape:justify-center">
          <div className={`grid gap-2.5 ${q.type === 'scene' ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {q.options.map(o => {
              const isAns = o.correct;
              const isPicked = o.key === picked;
              const gone = removed.includes(o.key) && !answered;
              const tone = answered
                ? isAns ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                  : isPicked ? 'bg-rose-50 border-rose-400 text-rose-600' : 'bg-white border-slate-100 text-slate-500'
                : gone ? 'bg-slate-50 border-slate-100 text-slate-200'
                  : o.key === sel ? 'bg-brand-100 border-brand-500 text-brand-900 shadow-md ring-2 ring-brand-200'
                    : 'bg-white border-slate-200 text-slate-800 shadow-sm active:bg-brand-50 active:border-brand-300';
              return (
                <button key={o.key} disabled={gone} {...tap(() => (answered ? (o.speak && speak(o.speak)) : choose(o.key)))}
                  className={`relative rounded-3xl border-2 transition-colors select-none flex items-center gap-3 px-4 py-3.5 text-left ${q.type === 'scene' ? 'flex-col justify-center text-center py-4' : ''} ${tone}`}>
                  {o.scene && <SceneArt scene={o.scene} size="sm" dim={gone} />}
                  {o.speak && <Volume2 size={20} className="shrink-0 opacity-60" />}
                  <span className="min-w-0">
                    <span className={`${o.speak ? 'en text-[clamp(1.2rem,4.5vmin,1.6rem)]' : 'text-[clamp(1rem,3.8vmin,1.25rem)] font-black'} block`}>{o.text}</span>
                    {answered && o.speak && <span className="text-xs font-bold text-slate-500">{koText(o.text)}</span>}
                  </span>
                  {q.type === 'odd' && answered && isAns && <span className="ml-auto shrink-0 text-[11px] font-black bg-emerald-500 text-white px-2 py-1 rounded-full">엉뚱해요</span>}
                  {q.type === 'odd' && answered && !isAns && <CheckCircle2 size={18} className="ml-auto shrink-0 text-emerald-400" />}
                  {q.type !== 'odd' && answered && isAns && <CheckCircle2 size={20} className="absolute top-2 right-2 text-emerald-500" />}
                  {q.type !== 'odd' && answered && isPicked && !isAns && <XCircle size={20} className="absolute top-2 right-2 text-rose-500" />}
                </button>
              );
            })}
          </div>
          {!answered && q.type !== 'scene' && q.type !== 'meaning' && <p className="text-center text-[11px] font-bold text-slate-400">보기를 누르면 소리가 나와요. 다 들어 보고 골라요</p>}
          {answered && q.type === 'odd' && <p className="text-center text-[11px] font-bold text-slate-400">✅ 표시는 모두 어울리는 대답이에요. 눌러서 다시 들어 봐요</p>}

          {!answered && (
            <div className="flex items-stretch gap-6 mt-4 pt-4 border-t-2 border-dashed border-slate-200">
              <div className="w-[26%] shrink-0">
                {!inRetry && (
                  <button onClick={pressHint} disabled={hinted} aria-label="힌트: 맞는 대답 하나 지우기"
                    className="btn-secondary w-full h-full px-2 py-2 flex flex-col items-center justify-center gap-1 disabled:opacity-40">
                    <span className="flex items-center gap-1 text-sm whitespace-nowrap"><Lightbulb size={18} className="text-amber-500 shrink-0" />힌트</span>
                    <span className="flex items-center gap-0.5 text-[11px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full"><Star size={11} className="fill-amber-500 text-amber-500" />{preview ? 0 : HINT_COST}개</span>
                  </button>
                )}
              </div>
              <div className="flex-1 min-w-0 flex gap-2">
                <button className="btn-primary flex-1 py-4 text-lg flex items-center justify-center gap-2" disabled={!sel} onClick={submitChoice}>
                  <span>{sel ? (q.type === 'odd' ? '이게 엉뚱해요!' : '정답 확인') : (q.type === 'odd' ? '엉뚱한 대답을 골라요' : '보기를 골라요')}</span>{sel && <ArrowRight size={22} />}
                </button>
              </div>
            </div>
          )}

          {answered && lastOk && (
            <button className="btn-secondary w-full py-4 mt-3 text-lg flex items-center justify-center gap-2" onClick={() => nextRef.current()}>
              <span>다음</span><ArrowRight size={22} />
            </button>
          )}
          {answered && !lastOk && (
            <button className="btn-primary w-full py-4 mt-3 text-lg flex items-center justify-center gap-2" onClick={() => { if (Date.now() >= readyAt.current) goNext(items); }}>
              <span>알겠어요</span><ArrowRight size={22} />
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {askQuit && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setAskQuit(false)}>
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8, opacity: 0 }} onClick={e => e.stopPropagation()}
              className="bg-white rounded-[2rem] p-7 max-w-xs w-full text-center shadow-2xl space-y-4">
              <div className="text-5xl">🚪</div>
              <h3 className="text-xl font-black text-slate-900 font-display">풀이를 그만둘까요?</h3>
              <p className="text-sm font-bold text-slate-500 break-keep">
                {items.length > 0 ? '지금까지 푼 문제는 저장돼요. 홈에서 이어서 풀 수 있어요.' : '아직 푼 문제가 없어요.'}
              </p>
              <div className="flex gap-2">
                <button className="btn-secondary flex-1 py-3" onClick={quit}>그만두기</button>
                <button className="btn-primary flex-1 py-3" onClick={() => setAskQuit(false)}>계속 풀기</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {askPaid && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setAskPaid(false)}>
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8, opacity: 0 }} onClick={e => e.stopPropagation()}
              className="bg-white rounded-[2rem] p-7 max-w-xs w-full text-center shadow-2xl space-y-4">
              <div className="text-5xl">💡</div>
              <h3 className="text-xl font-black text-slate-900 font-display">별 {HINT_COST}개를 쓰고 보기 하나를 지울까?</h3>
              <p className="text-sm font-bold text-slate-500 break-keep">✂️ 끊어 듣기는 별 없이 몇 번이든 할 수 있어요. 지금 가진 별은 {balance}개예요.</p>
              <div className="flex gap-2">
                <button className="btn-secondary flex-1 py-3" onClick={() => setAskPaid(false)}>스스로 풀래</button>
                <button className="btn-primary flex-1 py-3" onClick={() => {
                  setAskPaid(false);
                  if (actions.spendHint(promptText(q))) applyHint();
                  else toast('별이 모자라요.');
                }}>지울래</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
