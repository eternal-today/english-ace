import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, ChevronRight, MessageCircle, Music, PlayCircle, Search, Sparkles, Star, Volume2 } from 'lucide-react';
import { MenuId } from '../types';
import { BADGES, useStore } from '../engine/store';
import { useWallet } from '../ace/wallet';
import { AceNav } from '../ace/AceNav';
import { AceRewardCards } from '../ace/Rewards';
import { STAGE_BY_ID } from '../engine/numbers';
import { hasEnglishVoice, onVoicesChanged } from '../engine/speech';
import { loadRound } from '../engine/resume';
import { dailyStatus } from '../engine/daily';

interface Props {
  onParent: () => void;
  onMenu: (m: MenuId) => void;
  onResume: () => void;
  onRewards: () => void;
  onDogam: () => void;
  onDaily: () => void;
}

const MENUS: { id: MenuId; label: string; sub: string; icon: React.ReactNode; ready: boolean }[] = [
  { id: 'numbers', label: '숫자 영어', sub: '큰 숫자도 척척', icon: <span className="en text-xl leading-none">123</span>, ready: true },
  { id: 'phrases', label: '오늘의 한 마디', sub: '엉뚱한 대답 찾기', icon: <MessageCircle size={28} />, ready: true },
  { id: 'songs', label: '주제 여행', sub: '노래 속 단어 찾기', icon: <Music size={28} />, ready: true },
  { id: 'phonics', label: '소리 탐정', sub: '첫소리 찾기', icon: <Search size={28} />, ready: true },
];

export default function ChildHome({ onParent, onMenu, onResume, onRewards, onDogam, onDaily }: Props) {
  const store = useStore();
  const { config, cards, heard } = store;
  const st = dailyStatus(store);
  const dailySub = st.unseen > 0 && st.due > 0 ? `새 것과 복습 ${st.due}개가 기다려요` : st.unseen > 0 ? '새 영어를 만나러 가요' : st.due > 0 ? `복습할 것 ${st.due}개가 기다려요` : '오늘 복습은 끝! 한 판 더 해도 좋아요';
  const metPhrases = Object.keys(cards).filter(k => k.startsWith('ph:')).length;
  const heardCount = Object.keys(heard).length;
  const metLetters = Object.keys(cards).filter(k => k.startsWith('l:')).length;
  const balance = useWallet().balance;
  const name = config.childName?.trim();
  const saved = loadRound();
  // 목소리 목록은 늦게 오는 기기가 있어서 조금 기다렸다가 확인
  const [noVoice, setNoVoice] = useState(false);
  useEffect(() => {
    const check = () => setNoVoice(!hasEnglishVoice());
    const off = onVoicesChanged(check);
    const t = setTimeout(check, 1500);
    return () => { off(); clearTimeout(t); };
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <header className="flex flex-wrap items-center gap-2 mb-6 max-w-lg landscape:max-w-5xl mx-auto w-full">
        <AceNav current="english" onParent={onParent} />
        <button onClick={onRewards} aria-label="내 보상 보기"
          className="ml-auto bg-white px-5 py-2.5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3 active:scale-95 transition-transform">
          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
            <Star size={18} className="text-amber-500 fill-amber-500" />
          </div>
          <span className="font-black text-slate-700 text-lg font-display">{balance}</span>
          <ChevronRight size={16} className="text-slate-300 -ml-1" />
        </button>
      </header>

      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-lg landscape:max-w-5xl mx-auto space-y-6 landscape:space-y-0 landscape:grid landscape:grid-cols-2 landscape:gap-8 landscape:items-start">
        <div className="space-y-5">
          <div className="text-center space-y-1">
            <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 2, repeat: Infinity }} className="text-brand-400 flex justify-center">
              <Sparkles size={26} />
            </motion.div>
            <h2 className="text-3xl font-black text-slate-900 font-display">{name ? `안녕, ${name}!` : '안녕, 영어 에이스!'}</h2>
            <p className="text-slate-500 font-medium">오늘은 어떤 영어를 들어 볼까?</p>
          </div>

          {noVoice && (
            <div className="bg-rose-50 border-2 border-rose-200 rounded-3xl p-4 flex gap-3">
              <Volume2 size={22} className="text-rose-500 shrink-0 mt-0.5" />
              <p className="text-sm font-bold text-rose-700 break-keep">영어 목소리를 찾지 못했어요. 부모님께 "소리 확인"을 부탁해요.</p>
            </div>
          )}

          {saved && (
            <motion.button whileTap={{ scale: 0.97 }} onClick={onResume}
              className="w-full bg-emerald-50 border-2 border-emerald-300 rounded-3xl p-4 flex items-center gap-4 text-left">
              <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shrink-0"><PlayCircle size={26} /></div>
              <div className="flex-1 min-w-0">
                <div className="font-black text-emerald-800">이어서 풀기</div>
                <div className="text-xs font-bold text-emerald-600">{saved.menu === 'daily' ? '오늘의 한 판' : saved.menu === 'phrases' ? '오늘의 한 마디' : saved.menu === 'songs' ? '주제 여행' : saved.menu === 'phonics' ? '소리 탐정' : saved.kind === 'check' ? '1 ~ 100 확인' : `숫자 영어 ${STAGE_BY_ID[saved.stage].name}`} · {(saved.pquestions || saved.questions).length}문제 중 {Math.min(saved.items.length + 1, (saved.pquestions || saved.questions).length)}번 문제부터</div>
              </div>
              <ChevronRight size={18} className="text-emerald-400 shrink-0" />
            </motion.button>
          )}

          <motion.button whileTap={{ scale: 0.97 }} onClick={onDaily}
            className="w-full bg-gradient-to-br from-brand-500 to-brand-700 p-7 landscape:p-6 rounded-[2rem] shadow-xl shadow-brand-200 flex items-center gap-5 text-left">
            <div className="w-16 h-16 bg-white/25 rounded-2xl flex items-center justify-center shrink-0">
              <span className="en text-3xl text-white">ABC</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-2xl font-black text-white">오늘의 한 판</div>
              <div className="text-white/80 text-sm font-medium mt-0.5">{config.count}문제 · {dailySub}</div>
            </div>
            <ChevronRight size={24} className="text-white/60 shrink-0" />
          </motion.button>

          <div>
            <div className="text-xs font-black text-slate-400 mb-2 px-1">골라 하는 놀이터</div>
            <div className="grid grid-cols-2 gap-3">
              {MENUS.map(m => (
                <motion.button key={m.id} whileTap={{ scale: m.ready ? 0.95 : 1 }} disabled={!m.ready} onClick={() => onMenu(m.id)}
                  className="rounded-3xl p-4 flex items-center gap-3 text-left bg-white border-2 border-slate-200 text-brand-600 disabled:opacity-50">
                  <div className="h-12 min-w-12 px-2 rounded-2xl flex items-center justify-center bg-brand-50 shrink-0">{m.icon}</div>
                  <div className="min-w-0">
                    <div className="font-black text-base text-slate-700">{m.label}</div>
                    <div className="text-xs font-bold text-slate-400">{m.sub}</div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <button onClick={onDogam} className="w-full bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 space-y-2 text-left active:scale-[0.98] transition-transform">
            <div className="flex items-center justify-between">
              <span className="font-black text-slate-800 flex items-center gap-2"><BookOpen size={18} className="text-brand-500" />표현 도감</span>
              <span className="text-xs font-bold text-brand-500 flex items-center">펼쳐 보기<ChevronRight size={14} /></span>
            </div>
            <p className="text-xs font-bold text-slate-400">만난 표현 {metPhrases}개{heardCount ? ` · 들었어요 도장 ${heardCount}개` : ''} · 찾은 글자 소리 {metLetters}개 (소리 도감은 소리 탐정 안에)</p>
          </button>

          {/* 내 보상 · 찬스 바꾸기 · 명예의 전당 (모든 에이스 같은 모양) */}
          <AceRewardCards subject="english" badges={BADGES} onOpen={onRewards} />
        </div>
      </motion.div>
    </div>
  );
}
