import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, CheckCircle2, Flame, Home, Lightbulb, RotateCcw, Scissors, Star, Volume2, XCircle } from 'lucide-react';
import { NumStage, Question, RoundItem, RoundKind, RoundRecord } from '../types';
import { Milestone, actions, getState, useStore } from '../engine/store';
import { HINT_COST, useWallet } from '../ace/wallet';
import { STAGE_BY_ID, answerText, numWords, planRound, questionText, shownAnswer, shuffle } from '../engine/numbers';
import { applyAnswer } from '../engine/srs';
import { speak, stopSpeak } from '../engine/speech';
import { NumberView, sayNumber, sayNumberSlow } from '../components/NumberView';
import { fireConfetti, tap, toast } from '../components/ui';
import { SavedRound, clearRound, saveRound } from '../engine/resume';

/** 잘못 눌림 방지: 문제가 바뀌거나 보기를 고른 직후 이 시간(ms) 동안은 답이 제출되지 않음 */
const GUARD_MS = 400;
const CIRCLE = ['①', '②', '③', '④'];

interface Props {
  stage: NumStage;
  kind: RoundKind;
  onExit: () => void;
  onAgain: () => void;
  onMilestone: (m: Milestone) => void;
  onOpenShop: () => void;
  resume?: SavedRound | null;
  backRef: React.MutableRefObject<null | (() => void)>;
}

export default function Play({ stage, kind, onExit, onAgain, onMilestone, onOpenShop, resume, backRef }: Props) {
  const store = useStore();
  const { config } = store;
  const balance = useWallet().balance;
  const [questions] = useState<Question[]>(() => resume ? resume.questions : planRound(getState().config, getState().cards, stage, kind));
  const roundName = kind === 'check' ? '1 ~ 100 확인' : `숫자 영어 ${STAGE_BY_ID[stage].name}`;

  const [phase, setPhase] = useState<'solving' | 'retry' | 'result'>('solving');
  const [idx, setIdx] = useState(resume ? resume.items.length : 0);
  const [picked, setPicked] = useState<string | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const selAt = useRef(0);
  const [okNow, setOkNow] = useState<boolean | null>(null);
  const [retryQs, setRetryQs] = useState<Question[]>([]);
  const [rIdx, setRIdx] = useState(0);
  const pending = useRef<{ pct: number; hit: Milestone | null }>({ pct: 0, hit: null });
  const [removed, setRemoved] = useState<string[]>([]);
  const [hinted, setHinted] = useState(false);
  const [paidUsed, setPaidUsed] = useState(resume?.paidUsed || 0);
  const [askQuit, setAskQuit] = useState(false);
  const [askPaid, setAskPaid] = useState(false);
  const [combo, setCombo] = useState(resume?.combo || 0);
  const [maxCombo, setMaxCombo] = useState(resume?.maxCombo || 0);
  const [items, setItems] = useState<RoundItem[]>(resume?.items || []);
  const [record, setRecord] = useState<RoundRecord | null>(null);
  const [active, setActive] = useState(-1);   // 끊어 읽는 중인 덩어리
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); stopSpeak(); }, []);
  const readyAt = useRef(0);
  const advanced = useRef(false);                       // 맞힌 뒤 다음 문제로 넘어갔는지
  const nextRef = useRef<() => void>(() => { });        // 「다음」 버튼이 부르는 동작
  useEffect(() => { readyAt.current = Date.now() + GUARD_MS; }, [idx, rIdx, phase]);

  // 풀 때마다 자동 저장 (앱이 닫혀도 이어서 풀 수 있게)
  const preview = store.preview;
  useEffect(() => {
    if (phase !== 'solving' || !questions.length || preview) return;
    saveRound({ ts: Date.now(), stage, kind, questions, items, paidUsed, combo, maxCombo });
  }, [phase, items, paidUsed]);

  // 기기의 뒤로가기: 풀이 중이면 확인창, 아니면 홈으로
  useEffect(() => {
    backRef.current = () => { if (phase === 'solving') setAskQuit(v => !v); else if (phase === 'retry') enterResult(); else onExit(); };
    return () => { backRef.current = null; };
  });

  const inRetry = phase === 'retry';
  const q = inRetry ? retryQs[rIdx] : questions[idx];
  const answered = picked !== null;
  const lastOk = answered && okNow === true;
  const name = config.childName?.trim();

  // 듣고 고르기: 문제가 나오면 바로 읽어 줌
  useEffect(() => {
    setActive(-1);
    if ((phase === 'solving' || phase === 'retry') && q?.type === 'listen') {
      const t = setTimeout(() => sayNumber(q.value), 350);
      return () => clearTimeout(t);
    }
  }, [phase, idx, rIdx]);

  // 이어서 풀기인데 마지막 문제까지 이미 답한 상태로 닫혔던 경우: 바로 결과로
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
        <p className="text-lg font-bold text-slate-600">문제를 만들 수 없어요. 부모님 화면에서 문제 유형을 확인해 주세요.</p>
        <button className="btn-primary px-10 py-4 text-lg" onClick={onExit}>홈으로</button>
      </div>
    );
  }

  const finish = (finalItems: RoundItem[]) => {
    const correct = finalItems.filter(i => i.ok).length;
    const total = finalItems.length;
    // 찍기 방지: 정답이 40%보다 적은 판은 별 없음 (아무거나 고르면 25~33%)
    const accOk = total === 0 || correct / total >= 0.4;
    const stars = accOk ? Math.floor(correct / 5) : 0;
    const rec: RoundRecord = {
      ts: Date.now(), date: new Date().toLocaleDateString('ko-KR'), menu: 'numbers', stage, kind, correct, total, stars,
      hintsPaid: paidUsed, items: finalItems,
      ...(!accOk && Math.floor(correct / 5) > 0 ? { lowAcc: true } : {}),
    };
    clearRound();
    // 체험 중에는 기록·별·단계 열기를 남기지 않음
    const hit = preview ? null : actions.addRecord(rec);
    // 1~100 확인을 다 맞히면 다음 단계가 열림
    if (!preview && kind === 'check' && correct === total && total > 0 && !getState().progress.numCheck) actions.setProgress({ numCheck: true });
    setRecord(rec);
    const pct = total ? Math.round((correct / total) * 100) : 0;
    pending.current = { pct, hit };
    const wrongQs = questions.filter((_, i) => finalItems[i] && !finalItems[i].ok);
    if (wrongQs.length) {
      setRetryQs(wrongQs.map(x => ({ ...x, options: shuffle(x.options) })));
      setRIdx(0);
      resetQ();
      setPhase('retry');
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

  function resetQ() { setPicked(null); setSel(null); setRemoved([]); setHinted(false); setOkNow(null); setActive(-1); }

  const goNext = (finalItems: RoundItem[]) => {
    stopSpeak();
    if (inRetry) {
      if (rIdx + 1 >= retryQs.length) { enterResult(); return; }
      setRIdx(rIdx + 1); resetQ();
      return;
    }
    if (idx + 1 >= questions.length) { finish(finalItems); return; }
    setIdx(idx + 1); resetQ();
  };

  const answer = (value: string) => {
    if (answered || Date.now() < readyAt.current) return;
    readyAt.current = Date.now() + GUARD_MS;
    const ok = value === q.answer;
    setOkNow(ok);
    setPicked(value);
    // 틀렸으면 정답 소리를 덩어리로 한 번 더, 맞혔으면 보통 속도로 한 번
    if (!ok) timerRef.current = setTimeout(() => sayNumberSlow(q.value, setActive), 300);
    if (inRetry) {   // 다시 풀기: 연습만. 별·기록·기억 상자는 그대로
      if (ok) advanceAfterSound(items);
      return;
    }
    // 기억 상자: 틀렸거나 힌트를 보고 맞힌 숫자는 "몰랐던 것"으로 보고 복습에 넣음.
    // 처음 맞힌 숫자는 카드를 만들지 않음 (숫자는 끝없이 많아서)
    const cards = { ...getState().cards };
    const known = ok && !hinted;
    if (!preview && (!known || cards[q.id])) { cards[q.id] = applyAnswer(cards[q.id], known, false); actions.setCards(cards); }

    const item: RoundItem = { id: q.id, type: q.type, q: questionText(q), ans: answerText(q), val: shownAnswer(q, value), ok, hint: hinted };
    const next = [...items, item];
    setItems(next);
    const nc = ok ? combo + 1 : 0;
    setCombo(nc);
    if (nc > maxCombo) setMaxCombo(nc);
    if (ok) advanceAfterSound(next);
  };

  /**
   * 맞혔을 때: 정답 숫자를 한 번 읽어 준 뒤 1.5초 쉬고 다음 문제로.
   * 소리가 끝났다는 신호를 주지 않는 기기를 위해 6초가 지나면 넘어감. 「다음」을 누르면 바로 넘어감.
   */
  const advanceAfterSound = (list: RoundItem[]) => {
    advanced.current = false;
    const go = () => { if (advanced.current) return; advanced.current = true; if (timerRef.current) clearTimeout(timerRef.current); goNext(list); };
    nextRef.current = go;
    const fallback = setTimeout(go, 6000);
    sayNumber(q.value, () => { clearTimeout(fallback); timerRef.current = setTimeout(go, 1500); });
  };
  /** 보기 지우기 힌트: 무료 없음, 1회 별 1개 (공통 장부) */
  const pressHint = () => {
    if (answered || hinted || inRetry) return;
    if (preview) { applyHint(); return; }   // 체험 중에는 별을 쓰지 않음
    if (balance < HINT_COST) { toast('별이 모자라요. 끊어 듣기로 다시 들어 볼까? ✂️'); return; }
    setAskPaid(true);
  };
  const applyHint = () => {
    const wrong = q.options.filter(o => o.key !== q.answer && !removed.includes(o.key)).map(o => o.key);
    const out = wrong[Math.floor(Math.random() * wrong.length)];
    setRemoved([out]);
    if (sel === out) setSel(null);
    setHinted(true);
    setPaidUsed(n => n + 1);
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
    if (q.type === 'say') speak(numWords(Number(key)));   // 소리 고르기: 누르면 그 소리를 들려줌
  };
  const submitChoice = () => {
    if (!sel || removed.includes(sel) || Date.now() - selAt.current < GUARD_MS) return;
    answer(sel);
  };

  // ════════ 결과 ════════
  if (phase === 'result' && record) {
    const pct = record.total ? Math.round((record.correct / record.total) * 100) : 0;
    const cfg = pct >= 90 ? { emoji: '🏆', msg: '완벽해요!', sub: '영어 숫자를 정말 잘 듣는구나!', color: 'bg-amber-100' }
      : pct >= 70 ? { emoji: '🌟', msg: '잘했어요!', sub: '정말 열심히 들었구나!', color: 'bg-brand-100' }
        : pct >= 50 ? { emoji: '💪', msg: '조금만 더!', sub: '틀린 숫자는 곧 다시 만나게 돼!', color: 'bg-orange-100' }
          : { emoji: '📚', msg: '다시 도전!', sub: '끊어 들으면 잘할 수 있어!', color: 'bg-rose-100' };
    const spent = record.hintsPaid * HINT_COST;
    const passed = kind === 'check' && record.correct === record.total;
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
            {kind === 'check' && (
              <div className={`rounded-3xl p-4 font-black text-sm ${passed ? 'bg-brand-50 text-brand-700 border border-brand-100' : 'bg-slate-50 text-slate-600'}`}>
                {passed ? '🎉 1~100은 다 알아! 100 ~ 999, 1,000 ~ 9,999가 열렸어요.' : '다 맞히면 다음 단계가 열려요. 한 번 더 해 볼까?'}
              </div>
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
              <p className="text-[11px] font-bold text-amber-500 mt-0.5">모든 과목에서 모은 별을 함께 써요</p>
              {preview && <p className="text-xs font-black text-slate-500 mt-2 bg-white rounded-xl px-3 py-2">👀 부모님 체험이라 별과 기록은 남지 않았어요.</p>}
              {record.lowAcc && (
                <p className="text-xs font-black text-rose-500 mt-2 bg-white rounded-xl px-3 py-2">
                  10문제 중 4문제보다 적게 맞혀서 이번 판은 별이 없어요. 끊어 듣기로 잘 듣고 고르면 별을 받을 수 있어! 💪
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
                    <button className="min-w-0 text-left" onClick={() => speak(numWords(Number(it.id.split(':')[1])))}>
                      <div className="text-sm font-black text-slate-700 truncate flex items-center gap-1"><Volume2 size={14} className="text-slate-400 shrink-0" />{it.ans}</div>
                      <div className="text-[11px] font-bold text-slate-400 truncate">{it.q}{it.hint ? ' · 힌트 봄' : ''}</div>
                    </button>
                    <div className="flex items-center gap-2 shrink-0">
                      {!it.ok && <span className="text-xs font-black text-rose-600">{it.val || '-'}</span>}
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
  const caption = q.type === 'listen' ? '잘 듣고 알맞은 숫자를 골라요'
    : q.type === 'say' ? '이 숫자를 영어로 맞게 읽은 소리를 골라요'
      : '색칠한 부분 뒤에 붙는 말은?';

  return (
    <div className="flex flex-col h-full max-w-2xl landscape:max-w-6xl mx-auto w-full">
      {/* 진행바 */}
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
        {/* 문제 카드 */}
        <div className="flex-1 min-h-0 min-w-0 px-4 py-2 landscape:pr-2 landscape:pb-4">
          <div className="w-full h-full bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col items-center justify-center px-5 py-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-brand-500/10" />
            <div className="absolute top-4 left-5 right-5 flex items-center justify-between text-xs font-black">
              <span className={inRetry ? 'text-rose-500' : 'text-slate-400'}>{inRetry ? '틀린 문제 다시 풀기 · 별과 상관없는 연습이에요' : roundName}</span>
              {q.isReview && !inRetry && <span className="bg-brand-100 text-brand-700 px-2.5 py-1 rounded-full">다시 만난 숫자</span>}
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={inRetry ? `r${rIdx}` : idx} initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}
                className="flex flex-col items-center justify-center gap-4 w-full text-center">
                <div className="text-sm font-bold text-slate-500">{caption}</div>

                {q.type === 'listen' && !answered && (
                  <div className="flex items-end gap-4">
                    <button onClick={() => sayNumber(q.value)} aria-label="다시 듣기"
                      className="w-32 h-32 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white flex flex-col items-center justify-center gap-1 shadow-xl shadow-brand-200 active:scale-95 transition-transform">
                      <Volume2 size={48} />
                      <span className="text-xs font-black">다시 듣기</span>
                    </button>
                    <button onClick={() => sayNumberSlow(q.value)} aria-label="끊어 듣기"
                      className="w-20 h-20 rounded-full bg-white border-2 border-brand-200 text-brand-600 flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform">
                      <Scissors size={24} />
                      <span className="text-[10px] font-black">끊어 듣기</span>
                    </button>
                  </div>
                )}

                {(q.type === 'say' || q.type === 'place' || answered) && (
                  <NumberView value={q.value} hi={q.type === 'place' && !answered ? q.hi : undefined}
                    colored={answered} labels={answered && q.type === 'place'} active={active} words={answered}
                    className="text-[clamp(3.5rem,16vmin,7rem)]" />
                )}

                {answered && (
                  <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`px-5 py-3 rounded-2xl font-black ${lastOk ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                    <div className="text-sm">{lastOk ? (inRetry ? '이번엔 맞혔어! 👍' : combo >= 5 ? `${combo}연속 정답! 불타오른다! 🔥` : combo >= 3 ? `${combo}연속! 대단해! ⚡` : '정답이야! 🌟') : '아까비! 덩어리로 끊어서 다시 들어 볼까? 💪'}</div>
                    <button onClick={() => sayNumberSlow(q.value, setActive)} className="mt-2 inline-flex items-center gap-1.5 text-xs font-black bg-white/80 text-slate-600 px-3 py-1.5 rounded-xl">
                      <Scissors size={14} />끊어서 다시 듣기
                    </button>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* 보기와 버튼 */}
        <div className="shrink-0 px-4 pb-4 pt-1 space-y-2 landscape:w-[44%] landscape:max-w-lg landscape:pl-2 landscape:pt-2 landscape:flex landscape:flex-col landscape:justify-center">
          <div className={`grid gap-2.5 ${q.type === 'place' ? 'grid-cols-1' : q.options.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {q.options.map((o, i) => {
              const isAns = o.key === q.answer;
              const isPicked = o.key === picked;
              const gone = removed.includes(o.key) && !answered;
              const tone = answered
                ? isAns ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                  : isPicked ? 'bg-rose-50 border-rose-400 text-rose-600' : 'bg-white border-slate-100 text-slate-300'
                : gone ? 'bg-slate-50 border-slate-100 text-slate-200'
                  : o.key === sel ? 'bg-brand-100 border-brand-500 text-brand-900 shadow-md ring-2 ring-brand-200'
                    : 'bg-white border-slate-200 text-slate-800 shadow-sm active:bg-brand-50 active:border-brand-300';
              return (
                <button key={o.key} disabled={answered || gone} {...tap(() => choose(o.key))}
                  className={`relative rounded-3xl border-2 transition-colors select-none flex flex-col items-center justify-center px-2 ${q.type === 'place' ? 'py-4' : 'py-5 landscape:py-7'} ${tone}`}>
                  {q.type === 'say' ? (
                    answered
                      ? <><span className="en text-[clamp(1.5rem,6vmin,2.25rem)]">{o.label}</span><span className="en text-xs font-medium text-slate-500 break-words">{numWords(Number(o.key))}</span></>
                      : <span className="flex items-center gap-2 text-[clamp(1.25rem,5vmin,1.75rem)] font-black"><Volume2 size={24} />{CIRCLE[i]}</span>
                  ) : q.type === 'place'
                    ? <span className={o.key === 'none' ? 'text-lg font-black' : 'en text-[clamp(1.5rem,6vmin,2.25rem)]'}>{o.label}</span>
                    : <span className="en text-[clamp(1.75rem,7vmin,2.75rem)]">{o.label}</span>}
                  {answered && isAns && <CheckCircle2 size={22} className="absolute top-2 right-2 text-emerald-500" />}
                  {answered && isPicked && !isAns && <XCircle size={22} className="absolute top-2 right-2 text-rose-500" />}
                </button>
              );
            })}
          </div>
          {q.type === 'say' && !answered && <p className="text-center text-[11px] font-bold text-slate-400">보기를 누르면 소리가 나와요. 다 들어 보고 골라요</p>}

          {/* 힌트는 왼쪽, 정답 확인은 오른쪽 — 서로 떨어뜨려 잘못 누르지 않게 함 */}
          {!answered && (
            <div className="flex items-stretch gap-6 mt-4 pt-4 border-t-2 border-dashed border-slate-200">
              <div className="w-[26%] shrink-0">
                {!inRetry && (
                  <button onClick={pressHint} disabled={hinted} aria-label="힌트: 보기 하나 지우기"
                    className="btn-secondary w-full h-full px-2 py-2 flex flex-col items-center justify-center gap-1 disabled:opacity-40">
                    <span className="flex items-center gap-1 text-sm whitespace-nowrap"><Lightbulb size={18} className="text-amber-500 shrink-0" />힌트</span>
                    <span className="flex items-center gap-0.5 text-[11px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full"><Star size={11} className="fill-amber-500 text-amber-500" />{HINT_COST}개</span>
                  </button>
                )}
              </div>
              <div className="flex-1 min-w-0 flex gap-2">
                <button className="btn-primary flex-1 py-4 text-lg flex items-center justify-center gap-2" disabled={!sel} onClick={submitChoice}>
                  <span>{sel ? '정답 확인' : '보기를 골라요'}</span>{sel && <ArrowRight size={22} />}
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

      {/* 그만둘지 확인 */}
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

      {/* 별을 쓰는 힌트 확인 */}
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
                  if (actions.spendHint(questionText(q))) applyHint();
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
