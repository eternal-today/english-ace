import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { MenuId, NumStage, RoundKind } from './types';
import { BADGES, Milestone, useStore } from './engine/store';
import { initCelebration } from './ace/wallet';
import { startAceSync } from './ace/aceSync';
import { AceRewardsSheet } from './ace/Rewards';
import { Overlays, askPin, fireConfetti } from './components/ui';
import { actions } from './engine/store';
import ChildHome from './screens/ChildHome';
import NumberMenu from './screens/NumberMenu';
import Concept from './screens/Concept';
import Play from './screens/Play';
import Parent from './screens/Parent';
import { CONCEPT_BY_STAGE } from './engine/concepts';
import { SavedRound, loadRound } from './engine/resume';
import { stopSpeak } from './engine/speech';

type ChildView = 'home' | 'numbers' | 'concept' | 'play';

// 첫 화면 그리기 전에: 축하 목록 준비 (처음이면 지금까지의 마일스톤을 조용히 "축하 완료"로)
initCelebration();

export default function App() {
  const store = useStore();
  const [screen, setScreen] = useState<'parent' | 'child'>('child');
  const [view, setView] = useState<ChildView>('home');
  const [stage, setStage] = useState<NumStage>('n100');
  const [kind, setKind] = useState<RoundKind>('play');
  const [roundKey, setRoundKey] = useState(0);
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const [rewardsOpen, setRewardsOpen] = useState(false);
  const [resume, setResume] = useState<SavedRound | null>(null);
  const playBackRef = useRef<null | (() => void)>(null);

  // ── 기기의 뒤로가기 (한자 에이스와 같은 방식) ──
  const atHome = screen === 'child' && view === 'home';
  const nav = useRef({ screen, view });
  nav.current = { screen, view };
  const guard = useRef(false);
  useEffect(() => {
    const onPop = () => {
      guard.current = false;
      const cur = nav.current;
      if (cur.screen === 'child' && cur.view === 'play') {
        history.pushState({ english: 1 }, '');
        guard.current = true;
        if (playBackRef.current) playBackRef.current(); else setView('numbers');
        return;
      }
      if (cur.screen === 'child' && cur.view === 'home') return;
      if (cur.screen === 'child' && cur.view === 'concept') {
        history.pushState({ english: 1 }, ''); guard.current = true; stopSpeak(); setView('numbers'); return;
      }
      stopSpeak();
      setScreen('child'); setView('home');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  useEffect(() => {
    if (!atHome && !guard.current) { history.pushState({ english: 1 }, ''); guard.current = true; }
    else if (atHome && guard.current) { guard.current = false; history.back(); }
  }, [atHome]);
  const name = store.config.childName?.trim();

  useEffect(() => {
    startAceSync({ pullMath: true });
    const fallback = document.getElementById('loading-fallback');
    if (fallback) fallback.style.display = 'none';
  }, []);

  const start = (st: NumStage, k: RoundKind) => { stopSpeak(); setResume(null); setStage(st); setKind(k); setRoundKey(n => n + 1); setView('play'); };
  const resumeRound = () => {
    const saved = loadRound();
    if (!saved) { setView('home'); return; }
    setResume(saved); setStage(saved.stage); setKind(saved.kind); setRoundKey(n => n + 1); setView('play');
  };
  const openMenu = (m: MenuId) => { if (m === 'numbers') setView('numbers'); };

  return (
    <div className="min-h-[100dvh] bg-slate-50 selection:bg-brand-100 selection:text-brand-900">
      <Overlays pin={store.pin} />

      <AnimatePresence mode="wait">
        {screen === 'parent' && (
          <motion.div key="parent" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Parent onHome={() => { setScreen('child'); setView('home'); }} />
          </motion.div>
        )}

        {screen === 'child' && (
          <motion.div key="child" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="h-[100dvh] bg-gradient-to-b from-brand-50 to-white flex flex-col overflow-hidden">
            {store.preview && (
              <div className="shrink-0 bg-slate-800 text-white px-4 py-2 flex items-center justify-center gap-3 text-sm font-bold">
                <span>👀 부모님 체험 중 · 모든 단계가 열려 있고 별과 기록이 남지 않아요</span>
                <button className="bg-white/15 rounded-lg px-3 py-1 text-xs font-black" onClick={() => { actions.setPreview(false); setView('home'); }}>체험 끝내기</button>
              </div>
            )}
            {view === 'home' && <ChildHome onParent={() => askPin('', () => setScreen('parent'))} onMenu={openMenu} onResume={resumeRound} onRewards={() => setRewardsOpen(true)} />}
            {view === 'numbers' && <NumberMenu onBack={() => setView('home')} onStart={start} onConcept={st => { setStage(st); setView('concept'); }} />}
            {view === 'concept' && (
              <Concept key={stage} note={CONCEPT_BY_STAGE[stage]} onBack={() => { stopSpeak(); setView('numbers'); }} onPlay={() => start(stage, 'play')} />
            )}
            {view === 'play' && (
              <Play key={roundKey} stage={stage} kind={kind} resume={resume} backRef={playBackRef}
                onExit={() => setView('numbers')} onAgain={() => start(stage, kind)}
                onMilestone={m => { setMilestone(m); fireConfetti(m.hall ? 'epic' : m.value % 50 === 0 ? 'big' : 'normal'); }}
                onOpenShop={() => setRewardsOpen(true)} />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 내 보상 (별 잔액·내 보상 카드·결과 화면의 별을 누르면) */}
      <AceRewardsSheet open={rewardsOpen && screen === 'child'} onClose={() => setRewardsOpen(false)} childName={name} subject="english" badges={BADGES} />

      {/* 번 별 10개마다 축하 */}
      <AnimatePresence>
        {milestone && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setMilestone(null)}>
            <motion.div initial={{ scale: 0.5, y: 40 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', damping: 14 }} onClick={e => e.stopPropagation()}
              className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full text-center shadow-2xl">
              <div className="text-7xl mb-4">{milestone.hall ? '👑' : milestone.badge ? '🏅' : '🎉'}</div>
              <h2 className={`text-3xl font-black font-display mb-2 ${milestone.hall ? 'text-brand-600' : 'text-slate-900'}`}>
                {milestone.hall ? '명예의 전당 입성!' : milestone.value ? `별 ${milestone.value}개를 모았어!` : '새 뱃지!'}
              </h2>
              {milestone.value > 0 && <p className="text-xs font-bold text-slate-400 mb-2">모든 과목에서 모은 별 {milestone.value}개</p>}
              <p className="text-slate-500 font-medium">
                {milestone.badge
                  ? <>영어 뱃지 <strong className="text-brand-600">‘{milestone.badge}’</strong>를 받았어요!</>
                  : milestone.hall ? <>{name ? `${name}는 ` : ''}진정한 에이스야 👑</> : <>{name ? `${name}, ` : ''}정말 대단해! 계속 모아 보자 ⭐</>}
              </p>
              <button onClick={() => setMilestone(null)} className="btn-primary w-full mt-6 py-4 text-lg">좋아! 🙌</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
