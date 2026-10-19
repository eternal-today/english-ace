import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, CheckCircle2, Ear, Music, Search, Flame, Home, Lightbulb, RotateCcw, Scissors, Sparkles, Star, Volume2, XCircle } from 'lucide-react';
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
import { planSongRound } from '../engine/songs';
import { SONG_BY_ID, WORDS, lyricFilled } from '../data/songs';
import { openGroups, planPhonicsRound } from '../engine/phonics';
import { LETTER_BY_ID, letterSay } from '../data/phonics';
import { SONGS } from '../data/songs';
import { planDailyRound } from '../engine/daily';
import { answerText, numWords, questionText, shownAnswer } from '../engine/numbers';
import { NumberView, sayNumber, sayNumberSlow } from '../components/NumberView';

const GUARD_MS = 400;

interface Props {
  onExit: () => void;
  onAgain: () => void;
  onMilestone: (m: Milestone) => void;
  onOpenShop: () => void;
  resume?: SavedRound | null;
  backRef: React.MutableRefObject<null | (() => void)>;
  /** 주제 여행 단원 (있으면 주제 여행, 없으면 오늘의 한 마디) */
  unitId?: string;
  /** 주제 여행: 다 풀고 축하 노래 */
  onSong?: () => void;
  /** 소리 탐정 */
  phonics?: boolean;
  /** 오늘의 한 판 (모든 메뉴를 섞음) */
  daily?: boolean;
}

const PH_TYPES = new Set<PType>(['pfirst', 'pmatch', 'pcase']);
/** 소리 탐정 문제에서 맞힌 뒤 들려줄 말: "S. sun." */
const phSay = (q: PQuestion) => { const l = LETTER_BY_ID[q.itemId]; return q.fb ? `${l.upper}. ${q.fb.word}.` : letterSay(l); };

/** 상황 설명 (기록·힌트 장부에 남기는 짧은 글) */
const promptText = (q: PQuestion) => (PH_TYPES.has(q.type) ? (q.type === 'pfirst' ? q.play : q.letter) : '') || q.lyric || q.play || q.say || q.scene?.ko || (q.emoji ? WORDS[q.itemId]?.word : '') || '';

/** 문제 종류별 제목 (무엇을 고르는지 크게 보여 줌) */
const TYPE_HEAD: Record<PType, { badge: string; title: string; sub: string }> = {
  odd: { badge: '엉뚱한 대답 찾기', title: '딱 하나만 안 어울려요!', sub: '어울리지 않는 대답 하나를 골라요' },
  scene: { badge: '언제 하는 말일까?', title: '이 말은 언제 할까요?', sub: '듣고 알맞은 상황을 골라요' },
  meaning: { badge: '무슨 뜻일까?', title: '이 말은 무슨 뜻일까요?', sub: '듣고 알맞은 뜻을 골라요' },
  reply: { badge: '어떤 말에 한 대답일까?', title: '누가 뭐라고 했을 때 한 대답일까요?', sub: '듣고 알맞은 말을 골라요' },
  wlisten: { badge: '듣고 그림 찾기', title: '어떤 그림일까요?', sub: '' },
  wsee: { badge: '소리 고르기', title: '이 그림을 영어로 맞게 읽은 소리는?', sub: '' },
  lyric: { badge: '가사 빈칸', title: '빈칸에 들어갈 말은?', sub: '' },
  sound: { badge: '누구 소리일까?', title: '이 소리는 누가 낼까요?', sub: '' },
  pfirst: { badge: '첫소리 찾기', title: '어떤 글자로 시작할까요?', sub: '' },
  pmatch: { badge: '소리 짝 찾기', title: '이 글자 소리로 시작하는 그림은?', sub: '' },
  pcase: { badge: '짝 글자 찾기', title: '이 큰 글자의 작은 글자는?', sub: '' },
  num: { badge: '숫자 영어', title: '', sub: '' },
};
/** 숫자 문제의 제목 (숫자 영어 화면과 같은 말) */
const NUM_HEAD: Record<string, { badge: string; title: string }> = {
  listen: { badge: '숫자 듣고 고르기', title: '잘 듣고 알맞은 숫자를 골라요' },
  say: { badge: '숫자 소리 고르기', title: '이 숫자를 영어로 맞게 읽은 소리를 골라요' },
  place: { badge: '붙는 말 고르기', title: '색칠한 부분 뒤에 붙는 말은?' },
};
const THING: Record<string, string> = { songs: '단어', phonics: '글자', numbers: '숫자', phrases: '표현' };
const CIRCLE = ['①', '②', '③', '④'];

export default function PhrasePlay({ onExit, onAgain, onMilestone, onOpenShop, resume, backRef, unitId: unitProp, onSong, phonics: phProp, daily }: Props) {
  const store = useStore();
  const { config, preview } = store;
  const f = fillOf(config);
  const balance = useWallet().balance;
  const unitId = unitProp || resume?.unitId;
  const dailyMode = !!daily || resume?.menu === 'daily';
  const songMode = !dailyMode && !!unitId;
  const phMode = !dailyMode && !songMode && (!!phProp || resume?.menu === 'phonics');
  const menu: 'phrases' | 'songs' | 'phonics' | 'daily' = dailyMode ? 'daily' : songMode ? 'songs' : phMode ? 'phonics' : 'phrases';
  const thing = dailyMode ? '문제' : songMode ? '단어' : phMode ? '글자' : '표현';
  const unit = unitId ? SONG_BY_ID[unitId] : undefined;
  const [round] = useState(() => {
    if (resume?.pquestions) return { questions: resume.pquestions, newIds: resume.newIds || [] };
    const s = getState();
    if (dailyMode) return planDailyRound({ config: s.config, cards: s.cards, custom: s.custom, progress: s.progress, preview });
    if (unitId) return planSongRound(s.config, s.cards, unitId);
    if (phMode) return planPhonicsRound(s.config, s.cards, preview ? 99 : openGroups(s.cards, s.progress.phonicsOpen));
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
  const pending = useRef<{ pct: number; hit: Milestone | null; newLevel: number; newGroup: number }>({ pct: 0, hit: null, newLevel: 0, newGroup: 0 });
  const [active, setActive] = useState(-1);   // 숫자 끊어 듣기 중인 덩어리
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
    saveRound({ ts: Date.now(), menu, unitId, stage: 'n100', kind: 'play', questions: [], pquestions: questions, newIds, items, paidUsed, combo, maxCombo });
  }, [phase, items, paidUsed]);

  useEffect(() => {
    backRef.current = () => { if (phase === 'solving') setAskQuit(v => !v); else if (phase === 'retry') enterResult(); else onExit(); };
    return () => { backRef.current = null; };
  });

  const inRetry = phase === 'retry';
  const q = inRetry ? retryQs[rIdx] : questions[idx];
  const answered = picked !== null;
  const lastOk = answered && okNow === true;
  const qSong = !!q && (q.menu === 'songs' || songMode);
  const qNum = q?.type === 'num' && !!q.num;
  /** 새 것 소개: 오늘의 한 판에서는 카드 번호 앞글자로 메뉴를 앎 (l: 글자, w: 노래 단어, ph: 표현) */
  const introKey = newIds[introIdx] || '';
  const introKind = dailyMode ? (introKey.startsWith('l:') ? 'phonics' : introKey.startsWith('w:') ? 'songs' : 'phrases') : menu;
  const introId = dailyMode ? introKey.slice(introKey.indexOf(':') + 1) : introKey;

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
        <p className="text-lg font-bold text-slate-600 break-keep">아직 나올 {thing}{phMode ? '가' : '이'} 없어요. 부모님 화면에서 "한 판에 새로 나오는 것"을 1개 이상으로 해 주세요.</p>
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
      ts: Date.now(), date: new Date().toLocaleDateString('ko-KR'), menu, ...(unitId ? { unit: unitId } : {}), kind: 'play', correct, total, stars,
      hintsPaid: paidUsed, items: finalItems,
      ...(!accOk && Math.floor(correct / 5) > 0 ? { lowAcc: true } : {}),
    };
    clearRound();
    const hit = preview ? null : actions.addRecord(rec);
    // 새 단계가 열렸는지 (아이에게 한 번 알려 줌)
    let newLevel = 0, newGroup = 0;
    if (!preview && (phMode || dailyMode)) {
      const s = getState();
      const g = openGroups(s.cards, s.progress.phonicsOpen);
      if (g > s.progress.phonicsShown) { newGroup = g; actions.setProgress({ phonicsShown: g }); }
    }
    if (!preview && !songMode && !phMode) {
      const s = getState();
      const lv = openLevel(s.cards, fillOf(s.config));
      if (lv > s.progress.phraseLevel) { newLevel = lv; actions.setProgress({ phraseLevel: lv }); }
    }
    setRecord(rec);
    pending.current = { pct: total ? Math.round((correct / total) * 100) : 0, hit, newLevel, newGroup };
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

  function resetQ() { setPicked(null); setSel(null); setRemoved([]); setHinted(false); setOkNow(null); setWord(-1); setActive(-1); }

  const goNext = (finalItems: RoundItem[]) => {
    stopSpeak();
    if (inRetry) {
      if (rIdx + 1 >= retryQs.length) { enterResult(); return; }
      setRIdx(rIdx + 1); resetQ(); return;
    }
    if (idx + 1 >= questions.length) { finish(finalItems); return; }
    setIdx(idx + 1); resetQ();
  };

  /** 맞혔을 때: 상대의 말 → 대답을 대화로 한 번 들려줌. 다음 문제로는 「다음」을 눌러야 넘어감 (뜻을 볼 시간을 주려고) */
  const advanceAfterSound = (list: RoundItem[]) => {
    nextRef.current = () => goNext(list);
    if (qNum) { sayNumber(q.num!.value); return; }
    if (PH_TYPES.has(q.type)) { speak(phSay(q)); return; }
    if (qSong) {   // 주제 여행: 단어(가사 빈칸이면 채운 가사)를 한 번 들려줌
      const w = WORDS[q.itemId];
      speak(q.type === 'lyric' && q.lyric ? q.lyric.replace('___', w.word) : q.type === 'sound' ? `${w.word}! ${w.sound}, ${w.sound}!` : w.word);
      return;
    }
    const it = itemById(q.itemId);
    const dialog = (q.type === 'odd' ? [q.say, q.options.find(o => !o.correct)?.text]
      : q.type === 'reply' ? [it?.say, q.play]
        : [it?.say && it.say !== q.play ? it.say : undefined, q.play]).filter((x): x is string => !!x);
    speakParts(dialog, undefined, 500);
  };

  const answer = (key: string) => {
    if (answered || Date.now() < readyAt.current) return;
    readyAt.current = Date.now() + GUARD_MS;
    const ok = key === q.answer;
    setOkNow(ok);
    setPicked(key);
    if (inRetry) {
      if (ok) advanceAfterSound(items);
      else if (qNum) timerRef.current = setTimeout(() => sayNumberSlow(q.num!.value, setActive), 300);
      else if (PH_TYPES.has(q.type)) speak(phSay(q));
      else if (q.type === 'odd' || qSong) speak(q.options.find(o => o.correct)!.text);
      return;
    }
    // 기억 상자: 틀렸거나 힌트를 보고 맞힌 상황은 몰랐던 것으로 보고 복습에 넣음
    // 숫자는 숫자 영어와 같게: 처음부터 맞힌 숫자는 카드를 만들지 않음 (숫자는 끝없이 많아서)
    if (!preview) {
      const cards = { ...getState().cards };
      const id = q.cardId || 'ph:' + q.itemId;
      const known = ok && !hinted;
      if (!qNum || !known || cards[id]) { cards[id] = applyAnswer(cards[id], known, false); actions.setCards(cards); }
    }
    const rightText = q.options.find(o => o.correct)!.text;
    const item: RoundItem = qNum
      ? { id: q.cardId!, type: q.num!.type, q: questionText(q.num!), ans: answerText(q.num!), val: shownAnswer(q.num!, key), ok, hint: hinted }
      : { id: q.cardId || 'ph:' + q.itemId, type: 'odd', q: `${TYPE_HEAD[q.type].badge} · ${promptText(q)}`, ans: rightText, val: q.options.find(o => o.key === key)?.text || '', ok, hint: hinted };
    const next = [...items, item];
    setItems(next);
    const nc = ok ? combo + 1 : 0;
    setCombo(nc);
    if (nc > maxCombo) setMaxCombo(nc);
    if (ok) advanceAfterSound(next);
    else if (qNum) timerRef.current = setTimeout(() => sayNumberSlow(q.num!.value, setActive), 300);
    else if (PH_TYPES.has(q.type)) speak(phSay(q));
    else if (q.type === 'odd' || qSong) speak(rightText);
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
    if (qNum && q.num!.type === 'say') { speak(numWords(Number(key))); return; }
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

  // ════════ 새 글자 소개 (소리 탐정) ════════
  if (phase === 'intro' && introKind === 'phonics') {
    const l = LETTER_BY_ID[introId];
    const last = introIdx + 1 >= newIds.length;
    const next = () => { stopSpeak(); last ? setPhase('solving') : setIntroIdx(introIdx + 1); };
    if (!l) return (
      <div className="flex-1 flex items-center justify-center p-8"><button className="btn-primary px-10 py-4 text-lg" onClick={next}>계속</button></div>
    );
    return (
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
        <div className="w-full max-w-md text-center space-y-5 my-auto">
          <div className="text-sm font-black text-brand-600 flex items-center justify-center gap-2">
            <Sparkles size={16} />{dailyMode ? '오늘 처음 만나는 것' : '오늘 처음 만나는 글자 소리'} {introIdx + 1} / {newIds.length}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={l.id} initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }}
              className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-brand-100 p-7 space-y-4">
              <button onClick={() => speak(letterSay(l, l.words))} className="en text-[clamp(5rem,20vmin,8rem)] leading-none text-rose-500 active:scale-95">
                {l.upper}<span className="ml-3">{l.id}</span>
              </button>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 rounded-2xl py-2"><div className="text-[11px] font-black text-slate-400">이름</div><div className="text-xl font-black text-slate-700">{l.name}</div></div>
                <div className="bg-brand-50 rounded-2xl py-2"><div className="text-[11px] font-black text-brand-600">단어 속 소리</div><div className="text-xl font-black text-brand-800">{l.sound}</div></div>
              </div>
              <div className="text-xs font-black text-slate-400">{l.id} 소리로 시작하는 단어</div>
              <div className={`grid gap-2 ${l.words.length >= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                {l.words.slice(0, 3).map(w => (
                  <button key={w.word} onClick={() => speak(`${l.upper}. ${w.word}.`)} className="bg-slate-50 rounded-2xl p-2 flex flex-col items-center gap-1 active:scale-95">
                    <span className="text-4xl leading-none">{w.emoji}</span>
                    <span className="en text-lg text-slate-800"><span className="text-rose-500">{w.word[0]}</span>{w.word.slice(1)}</span>
                    <span className="text-[11px] font-bold text-slate-400">{w.ko}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => speak(letterSay(l, l.words.slice(0, 3)))} className="btn-secondary w-full py-3 flex items-center justify-center gap-2">
                <Volume2 size={18} />모두 이어서 듣기
              </button>
            </motion.div>
          </AnimatePresence>
          <button className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-2" onClick={next}>
            {last ? '문제 풀러 가기' : dailyMode ? '다음' : '다음 글자'}<ArrowRight size={22} />
          </button>
          <button className="text-sm font-bold text-slate-400" onClick={onExit}>홈으로</button>
        </div>
      </div>
    );
  }

  // ════════ 새 표현 소개 ════════
  if (phase === 'intro' && introKind === 'songs') {
    const w = WORDS[introId];
    const wUnit = unit || SONGS.find(u => u.words.some(x => x.id === introId));
    const last = introIdx + 1 >= newIds.length;
    const next = () => { stopSpeak(); last ? setPhase('solving') : setIntroIdx(introIdx + 1); };
    const lines = (wUnit?.lyrics || []).filter(l => l.answer === w?.id);
    if (!w) return (
      <div className="flex-1 flex items-center justify-center p-8"><button className="btn-primary px-10 py-4 text-lg" onClick={next}>계속</button></div>
    );
    return (
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
        <div className="w-full max-w-md text-center space-y-5 my-auto">
          <div className="text-sm font-black text-brand-600 flex items-center justify-center gap-2">
            <Sparkles size={16} />{dailyMode ? '오늘 처음 만나는 것' : '오늘 처음 만나는 단어'} {introIdx + 1} / {newIds.length}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={w.id} initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }}
              className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-brand-100 p-7 space-y-4">
              <div className="text-[clamp(5rem,20vmin,8rem)] leading-none">{w.emoji}</div>
              <button onClick={() => speak(w.word)} className="inline-flex items-center gap-2 bg-brand-50 text-brand-800 px-6 py-3 rounded-2xl active:scale-95">
                <Volume2 size={24} /><span className="en text-4xl"><span className="text-rose-500">{w.word[0]}</span>{w.word.slice(1)}</span>
              </button>
              <div className="text-sm font-bold text-slate-500">{w.ko}</div>
              {w.sound && wUnit?.id === 'oldmac' && (
                <button onClick={() => speak(`${w.sound}, ${w.sound}!`)} className="btn-secondary px-4 py-2 text-sm inline-flex items-center gap-1.5"><Volume2 size={14} />{w.word}의 소리: <span className="en">{w.sound} {w.sound}</span></button>
              )}
              {lines.length > 0 && (
                <div className="bg-slate-50 rounded-2xl p-3 space-y-1">
                  <div className="text-[11px] font-black text-slate-400">노래에서는 이렇게 나와요</div>
                  {lines.slice(0, 1).map((l, i) => (
                    <button key={i} onClick={() => speak(lyricFilled(l))} className="en text-lg text-slate-700 flex items-center gap-2 mx-auto"><Volume2 size={16} className="text-brand-500 shrink-0" />{lyricFilled(l)}</button>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
          <button className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-2" onClick={next}>
            {last ? '문제 풀러 가기' : dailyMode ? '다음' : '다음 단어'}<ArrowRight size={22} />
          </button>
          <button className="text-sm font-bold text-slate-400" onClick={onExit}>홈으로</button>
        </div>
      </div>
    );
  }

  if (phase === 'intro') {
    const p = itemById(introId);
    const last = introIdx + 1 >= newIds.length;
    const next = () => { stopSpeak(); last ? setPhase('solving') : setIntroIdx(introIdx + 1); };
    if (!p) return (
      <div className="flex-1 flex items-center justify-center p-8"><button className="btn-primary px-10 py-4 text-lg" onClick={next}>계속</button></div>
    );
    return (
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
        <div className="w-full max-w-md text-center space-y-5 my-auto">
          <div className="text-sm font-black text-brand-600 flex items-center justify-center gap-2">
            <Sparkles size={16} />{dailyMode ? '오늘 처음 만나는 것' : '오늘 처음 만나는 표현'} {introIdx + 1} / {newIds.length}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={p.id} initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }}
              className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-brand-100 p-7 space-y-4">
              {p.scene && <SceneArt scene={p.scene} size="lg" />}
              {p.scene?.name && <div className="text-lg font-black text-slate-700">오늘은 {p.scene.name}</div>}
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
            {last ? '문제 풀러 가기' : dailyMode ? '다음' : '다음 표현'}<ArrowRight size={22} />
          </button>
          <button className="text-sm font-bold text-slate-400" onClick={onExit}>홈으로</button>
        </div>
      </div>
    );
  }

  // ════════ 결과 ════════
  if (phase === 'result' && record) {
    const pct = record.total ? Math.round((record.correct / record.total) * 100) : 0;
    const great = dailyMode ? '오늘의 영어를 척척 해냈어!' : phMode ? '글자 소리를 척척 찾았어!' : songMode ? '노래 속 단어를 척척 찾았어!' : '엉뚱한 대답을 척척 찾았어!';
    const good = dailyMode ? '오늘도 영어 에이스!' : phMode ? '소리 탐정 실력이 쑥쑥!' : songMode ? '노래 속 단어를 잘 알고 있구나!' : '여러 가지 대답을 잘 알고 있구나!';
    const cfg = pct >= 90 ? { emoji: '🏆', msg: '완벽해요!', sub: great, color: 'bg-amber-100' }
      : pct >= 70 ? { emoji: '🌟', msg: '잘했어요!', sub: good, color: 'bg-brand-100' }
        : pct >= 50 ? { emoji: '💪', msg: '조금만 더!', sub: `헷갈린 ${thing}${phMode || dailyMode ? '는' : '은'} 곧 다시 만나게 돼!`, color: 'bg-orange-100' }
          : { emoji: '📚', msg: '다시 도전!', sub: '보기를 하나씩 눌러 들어 보면 잘할 수 있어!', color: 'bg-rose-100' };
    const spent = record.hintsPaid * HINT_COST;
    const { newLevel, newGroup } = pending.current;
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
            {newGroup > 0 && (
              <div className="rounded-3xl p-4 font-black text-sm bg-brand-50 text-brand-700 border border-brand-100">🎉 {newGroup}묶음 글자가 열렸어요! 소리 탐정에서 개념 정리를 먼저 봐요.</div>
            )}
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
                    <button className="min-w-0 text-left" onClick={() => speak(it.q.split(' · ').pop()?.match(/[a-z]/i) ? (it.q.split(' · ').pop() || '') : it.ans)}>
                      <div className="text-sm font-black text-slate-700 truncate flex items-center gap-1"><Volume2 size={14} className="text-slate-400 shrink-0" />{it.q}</div>
                      <div className="text-[11px] font-bold text-slate-400 truncate">{it.q.startsWith(TYPE_HEAD.odd.badge) ? '엉뚱한 대답' : '정답'}: {it.ans}{it.hint ? ' · 힌트 봄' : ''}</div>
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
              {onSong && (
                <button className="btn-secondary flex-1 py-5 text-lg flex items-center justify-center gap-2" onClick={onSong}>
                  <Music size={20} /><span>노래 듣기</span>
                </button>
              )}
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
  const head = qNum ? NUM_HEAD[q.num!.type] : TYPE_HEAD[q.type];
  const listenText = qNum ? undefined : q.type === 'odd' ? q.say : q.play;   // 이 문제에서 듣는 말
  const songWord = qSong ? WORDS[q.itemId] : undefined;
  const qThing = dailyMode ? THING[q.menu || 'phrases'] : thing;
  const pictureOpts = q.options.some(o => o.emoji) && q.type !== 'wsee';
  const phQ = PH_TYPES.has(q.type);
  const letterOpts = phQ && !pictureOpts;
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
              <span className={inRetry ? 'text-rose-500' : 'text-slate-400'}>{inRetry ? '틀린 문제 다시 풀기 · 별과 상관없는 연습이에요' : dailyMode ? '오늘의 한 판' : unit ? `주제 여행 · ${unit.title}` : phMode ? '소리 탐정' : '오늘의 한 마디'}</span>
              {q.isNew && !inRetry && <span className="bg-brand-100 text-brand-700 px-2.5 py-1 rounded-full">새 {qThing}</span>}
              {q.isReview && !q.isNew && !inRetry && <span className="bg-brand-100 text-brand-700 px-2.5 py-1 rounded-full">다시 만난 {qThing}</span>}
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
                {q.type === 'odd' && q.scene?.name && <div className="text-lg font-black text-slate-700 bg-slate-50 rounded-2xl px-4 py-2">오늘은 {q.scene.name}이에요</div>}
                {phQ && q.letter && <div className="en text-[clamp(5.5rem,24vmin,10rem)] leading-none text-slate-800">{q.letter}</div>}
                {(q.type === 'wsee' || q.type === 'pfirst') && q.emoji && <div className="text-[clamp(5rem,22vmin,9rem)] leading-none">{q.emoji}</div>}
                {q.type === 'lyric' && q.lyric && (
                  <div className="en text-[clamp(1.4rem,5.5vmin,2.2rem)] text-slate-800 leading-snug max-w-lg">
                    {q.lyric.split('___').map((part, i, arr) => (
                      <React.Fragment key={i}>{part}{i < arr.length - 1 && (
                        <span className={`inline-block min-w-[3.5em] mx-1 px-2 rounded-xl border-b-4 ${answered ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-brand-300 bg-brand-50 text-brand-300'}`}>{answered ? songWord?.word : '?'}</span>
                      )}</React.Fragment>
                    ))}
                  </div>
                )}
                {qNum && q.num!.type === 'listen' && !answered && (
                  <div className="flex items-end gap-4">
                    <button onClick={() => sayNumber(q.num!.value)} aria-label="다시 듣기"
                      className="w-28 h-28 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white flex flex-col items-center justify-center gap-1 shadow-xl shadow-brand-200 active:scale-95 transition-transform">
                      <Volume2 size={44} /><span className="text-xs font-black">다시 듣기</span>
                    </button>
                    <button onClick={() => sayNumberSlow(q.num!.value, setActive)} aria-label="끊어 듣기"
                      className="w-20 h-20 rounded-full bg-white border-2 border-brand-200 text-brand-600 flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform">
                      <Scissors size={24} /><span className="text-[10px] font-black">끊어 듣기</span>
                    </button>
                  </div>
                )}
                {qNum && (q.num!.type !== 'listen' || answered) && (
                  <NumberView value={q.num!.value} hi={q.num!.type === 'place' && !answered ? q.num!.hi : undefined}
                    colored={answered} labels={answered && q.num!.type === 'place'} active={active} words={answered}
                    className="text-[clamp(3.5rem,16vmin,7rem)]" />
                )}
                {listenText && (
                  <div className="space-y-3">
                    {q.type === 'lyric' || (phQ && (q.letter || q.emoji || answered)) ? null : (q.type === 'odd' || (answered && !qSong)) ? <SayLine text={listenText} /> : <div className="w-20 h-20 rounded-[1.75rem] bg-brand-50 text-brand-500 flex items-center justify-center mx-auto"><Ear size={40} strokeWidth={2.2} /></div>}
                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => speak(listenText)} aria-label="다시 듣기"
                        className="h-14 px-6 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center gap-2 font-black shadow-lg shadow-brand-200 active:scale-95">
                        <Volume2 size={24} />{phQ && q.letter ? '이름 듣기' : '다시 듣기'}
                      </button>
                      {/\s/.test(listenText.trim()) && <button onClick={() => speakWords(listenText, setWord)} aria-label="끊어 듣기"
                        className="h-14 px-5 rounded-full bg-white border-2 border-brand-200 text-brand-600 flex items-center gap-2 font-black active:scale-95">
                        <Scissors size={20} />끊어 듣기
                      </button>}
                    </div>
                  </div>
                )}

                {answered && (
                  <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`px-5 py-3 rounded-2xl font-black max-w-md ${lastOk ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                    {qNum ? (
                      <>
                        <div className="text-sm">{lastOk ? (combo >= 3 && !inRetry ? `${combo}연속! 대단해! ⚡` : '정답이야! 🌟') : '아까비! 덩어리로 끊어서 다시 들어 볼까? 💪'}</div>
                        <button onClick={() => sayNumberSlow(q.num!.value, setActive)} className="mt-2 inline-flex items-center gap-1.5 text-xs font-black bg-white/80 text-slate-600 px-3 py-1.5 rounded-xl">
                          <Scissors size={14} />끊어서 다시 듣기
                        </button>
                      </>
                    ) : phQ && q.fb ? (
                      <>
                        <div className="text-sm">{lastOk ? (combo >= 3 && !inRetry ? `${combo}연속! 소리 탐정이야! 🔍` : '정답이야! 🌟') : '아까비! 정답을 같이 볼까? 💪'}</div>
                        <button onClick={() => speak(phSay(q))} className="mt-1 text-sm font-bold text-slate-600 break-keep flex items-center justify-center gap-2 mx-auto">
                          <span className="text-2xl">{q.fb.emoji}</span><span className="en text-xl text-slate-800"><span className="text-rose-500">{q.fb.word[0]}</span>{q.fb.word.slice(1)}</span> = {q.fb.ko}
                        </button>
                        <div className="text-xs font-bold text-slate-500 mt-0.5">
                          {q.type === 'pcase' ? <>큰 글자 <span className="en text-base">{LETTER_BY_ID[q.itemId].upper}</span>의 작은 글자는 <span className="en text-base">{q.itemId}</span></> : <><span className="en text-base text-rose-500">{q.itemId}</span> 소리 "{LETTER_BY_ID[q.itemId].sound}"로 시작해요</>}
                        </div>
                      </>
                    ) : songWord ? (
                      <>
                        <div className="text-sm">{lastOk ? (combo >= 3 && !inRetry ? `${combo}연속! 대단해! ⚡` : '정답이야! 🌟') : '아까비! 정답을 같이 볼까? 💪'}</div>
                        <div className="mt-1 text-sm font-bold text-slate-600 break-keep flex items-center justify-center gap-2">
                          <span className="text-2xl">{songWord.emoji}</span><span className="en text-xl text-slate-800"><span className="text-rose-500">{songWord.word[0]}</span>{songWord.word.slice(1)}</span> = {songWord.ko}
                          {q.type === 'sound' && songWord.sound && <span className="en text-base text-slate-500">({songWord.sound} {songWord.sound})</span>}
                        </div>
                      </>
                    ) : q.type === 'odd' ? (
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
          <div className={`grid gap-2.5 ${qNum ? (q.num!.type === 'place' ? 'grid-cols-1' : q.options.length === 3 ? 'grid-cols-3' : 'grid-cols-2') : letterOpts ? (q.options.length === 3 ? 'grid-cols-3' : 'grid-cols-4') : pictureOpts ? (q.options.length === 3 ? 'grid-cols-3' : 'grid-cols-2') : q.type === 'scene' || (q.type === 'wsee' && q.options.length === 4) ? 'grid-cols-2' : q.type === 'wsee' ? 'grid-cols-3' : 'grid-cols-1'}`}>
            {q.options.map((o, oi) => {
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
                <button key={o.key} disabled={gone} {...tap(() => (answered ? (qNum ? (q.num!.type === 'place' ? undefined : speak(numWords(Number(o.key)))) : speak(o.after || o.speak || (qSong ? o.text : ''))) : choose(o.key)))}
                  className={`relative rounded-3xl border-2 transition-colors select-none flex items-center gap-3 px-4 py-3.5 text-left ${q.type === 'scene' || pictureOpts || q.type === 'wsee' || letterOpts ? 'flex-col justify-center text-center py-4' : ''} ${tone}`}>
                  {qNum ? (
                    q.num!.type === 'say' ? (answered
                      ? <span className="w-full text-center"><span className="en text-[clamp(1.5rem,6vmin,2.25rem)] block">{o.text}</span><span className="en text-xs font-medium text-slate-500 break-words">{numWords(Number(o.key))}</span></span>
                      : <span className="w-full flex items-center justify-center gap-2 text-[clamp(1.25rem,5vmin,1.75rem)] font-black"><Volume2 size={24} />{CIRCLE[oi]}</span>)
                      : q.num!.type === 'place' ? <span className={`w-full text-center ${o.key === 'none' ? 'text-lg font-black' : 'en text-[clamp(1.5rem,6vmin,2.25rem)]'}`}>{o.text}</span>
                        : <span className="w-full text-center en text-[clamp(1.75rem,7vmin,2.75rem)]">{o.text}</span>
                  ) : <>
                  {o.scene && <SceneArt scene={o.scene} size="sm" dim={gone} />}
                  {pictureOpts && o.emoji && <span className={`text-[clamp(2.75rem,10vmin,4rem)] leading-none ${gone ? 'opacity-20' : ''}`}>{o.emoji}</span>}
                  {o.speak && q.hideText && !answered
                    ? <span className="flex items-center gap-2 text-[clamp(1.25rem,5vmin,1.75rem)] font-black"><Volume2 size={24} />{CIRCLE[oi]}</span>
                    : <>
                      {o.speak && <Volume2 size={20} className="shrink-0 opacity-60" />}
                      {!(q.hideText && !answered) && (
                        <span className="min-w-0">
                          <span className={`${letterOpts ? 'en text-[clamp(2.5rem,10vmin,4rem)] leading-none' : o.speak || qSong ? 'en text-[clamp(1.2rem,4.5vmin,1.6rem)]' : 'text-[clamp(1rem,3.8vmin,1.25rem)] font-black'} block`}>{o.text}</span>
                          {answered && phQ && o.sub && <span className="text-[11px] font-bold text-slate-500 block mt-1">{o.sub}</span>}
                          {answered && o.speak && !qSong && !phQ && <span className="text-xs font-bold text-slate-500">{koText(o.text)}</span>}
                          {answered && qSong && <span className="text-xs font-bold text-slate-500">{WORDS[o.key === 'ok' ? q.itemId : o.key.slice(1)]?.ko}</span>}
                        </span>
                      )}
                    </>}
                  </>}
                  {q.type === 'odd' && answered && isAns && <span className="ml-auto shrink-0 text-[11px] font-black bg-emerald-500 text-white px-2 py-1 rounded-full">엉뚱해요</span>}
                  {q.type === 'odd' && answered && !isAns && <CheckCircle2 size={18} className="ml-auto shrink-0 text-emerald-400" />}
                  {q.type !== 'odd' && answered && isAns && <CheckCircle2 size={20} className="absolute top-2 right-2 text-emerald-500" />}
                  {q.type !== 'odd' && answered && isPicked && !isAns && <XCircle size={20} className="absolute top-2 right-2 text-rose-500" />}
                </button>
              );
            })}
          </div>
          {!answered && q.type === 'pmatch' && <p className="text-center text-[11px] font-bold text-slate-400">그림을 누르면 단어 소리가 나와요. 첫소리를 잘 들어 봐요</p>}
          {!answered && qNum && q.num!.type === 'say' && <p className="text-center text-[11px] font-bold text-slate-400">보기를 누르면 소리가 나와요. 다 들어 보고 골라요</p>}
          {!answered && q.type !== 'pmatch' && q.options.some(o => o.speak) && <p className="text-center text-[11px] font-bold text-slate-400">보기를 누르면 소리가 나와요. 다 들어 보고 골라요</p>}
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
            <button className="btn-primary w-full py-4 mt-3 text-lg flex items-center justify-center gap-2" onClick={() => { if (Date.now() >= readyAt.current) nextRef.current(); }}>
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
