import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2, ChevronLeft, Eye, ChevronRight, Database, Gift, Hash, History, Home, Lightbulb, Lock,
  Plus, Settings, Scissors, Smartphone, Star, Volume2, XCircle,
} from 'lucide-react';
import { Config, RoundRecord } from '../types';
import { MAX_COUNT, MIN_COUNT, actions, earnedStars, getState, useStore } from '../engine/store';
import { HINT_COST, couponState, coupons as aceCoupons, hubPin, mathWishCoupons, useWallet } from '../ace/wallet';
import { goHome } from '../ace/links';
import { STAGE_BY_ID, fmt, numWords } from '../engine/numbers';
import { canSpeak, englishVoices, onVoicesChanged, setVoiceURI, speak } from '../engine/speech';
import { dayIndex } from '../engine/srs';
import { toast } from '../components/ui';
import { sayNumberSlow } from '../components/NumberView';
import { MessageCircle, Stamp, Trash2 } from 'lucide-react';
import { PhraseItem } from '../data/phrases';
import { allItems, fillOf, levelProgress, resolve } from '../engine/phrases';
import { SONGS, SONG_BY_ID } from '../data/songs';
import { SongPlayer, youtubeId } from '../components/SongPlayer';
import { Music } from 'lucide-react';
import { clearRound, loadRound } from '../engine/resume';
import { AceSaveBar, confirmLeave } from '../ace/SaveBar';
import { groupProgress, openGroups } from '../engine/phonics';

const Card = ({ children, dim = false }: { children: React.ReactNode; dim?: boolean }) => (
  <section className={`bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5 ${dim ? 'opacity-70 hover:opacity-100 transition-opacity' : ''}`}>{children}</section>
);
const Title = ({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) => (
  <div className="flex items-center gap-2 text-slate-900 font-bold">{icon}<h3>{children}</h3></div>
);
const Label = ({ children }: { children: React.ReactNode }) => <label className="text-xs font-bold text-slate-400 tracking-wider block">{children}</label>;
const Stepper = ({ value, min, max, onChange, unit }: { value: number; min: number; max: number; onChange: (n: number) => void; unit: string }) => (
  <div className="flex items-center gap-3">
    <button className="w-11 h-11 rounded-xl border-2 border-slate-200 font-black text-slate-500 active:scale-90 disabled:opacity-30" disabled={value <= min} onClick={() => onChange(value - 1)}>−</button>
    <span className="font-black text-slate-800 w-16 text-center">{value}{unit}</span>
    <button className="w-11 h-11 rounded-xl border-2 border-slate-200 font-black text-slate-500 active:scale-90 disabled:opacity-30" disabled={value >= max} onClick={() => onChange(value + 1)}>+</button>
  </div>
);

/** 기록 정리 — 부모님이 아이 모드로 시험해 본 뒤 지우기 */
function ResetCard() {
  const store = useStore();
  const [saved, setSaved] = useState(() => loadRound());
  const menuName = (m?: string) => (m === 'phrases' ? '오늘의 한 마디' : m === 'songs' ? '주제 여행' : m === 'phonics' ? '소리 탐정' : '숫자 영어');
  return (
    <Card dim>
      <Title icon={<Trash2 size={18} className="text-slate-400" />}>기록 정리</Title>
      <p className="text-sm text-slate-500 leading-relaxed">아이 모드로 시험해 본 기록을 지울 때 써요. 지운 기록은 되돌릴 수 없어요.</p>
      <div className="space-y-2">
        <button className="btn-secondary w-full py-3 text-sm disabled:opacity-40" disabled={!saved} onClick={() => {
          if (!window.confirm('풀던 판을 지울까요? 아이 홈의 "이어서 풀기"가 사라져요.')) return;
          clearRound(); setSaved(null); toast('풀던 판을 지웠어요');
        }}>{saved ? `풀던 판 지우기 (${menuName(saved.menu)} · ${saved.items.length}문제 풂)` : '풀던 판 없음'}</button>
        <button className="btn-secondary w-full py-3 text-sm text-rose-600" onClick={() => {
          if (!window.confirm('영어 학습 기록을 모두 지울까요?\n\n지우는 것: 기억 상자, 판 기록(영어에서 번 별 포함), 단계 진행, 들었어요 도장, 풀던 판\n남기는 것: 문제 설정, PIN, 부모님이 넣은 표현, 노래 주소\n\n힌트로 쓴 별은 모든 과목이 함께 쓰는 장부에 있어서 되돌아오지 않아요.')) return;
          actions.resetLearning(); setSaved(null); toast('영어 학습 기록을 지웠어요');
        }}>영어 학습 기록 모두 지우기 (기억 상자 {Object.keys(store.cards).length}개 · 판 {store.records.length}개)</button>
      </div>
    </Card>
  );
}

/** 소리 확인 — 기기의 영어 목소리 목록과 들어 보기 (시험 페이지 기능을 앱 안으로) */
function VoiceCard({ draft, setDraft }: { draft: Config; setDraft: (c: Config) => void }) {
  const [voices, setVoices] = useState(englishVoices());
  useEffect(() => {
    const refresh = () => setVoices(englishVoices());
    const off = onVoicesChanged(refresh);
    const t = setTimeout(refresh, 800);
    return () => { off(); clearTimeout(t); };
  }, []);
  const us = voices.filter(v => /en[-_]US/i.test(v.lang)).length;
  // 들어 보기는 저장 전에도 고른 목소리로
  const play = (fn: () => void) => { setVoiceURI(draft.voiceURI); fn(); setVoiceURI(getState().config.voiceURI); };
  return (
    <Card>
      <Title icon={<Volume2 size={18} className="text-trust-600" />}>소리 확인</Title>
      {!canSpeak() ? (
        <p className="text-sm font-bold text-rose-600 bg-rose-50 rounded-xl p-3">이 브라우저는 음성 읽기를 지원하지 않아요. 크롬에서 열어 주세요.</p>
      ) : voices.length === 0 ? (
        <p className="text-sm font-bold text-rose-600 bg-rose-50 rounded-xl p-3 leading-relaxed">
          영어 목소리를 찾지 못했어요. 안드로이드 설정 → 텍스트 음성 변환 → Google 음성 엔진 → 음성 데이터 설치에서 영어(미국)를 받아 주세요.
          받은 뒤 이 화면을 다시 열면 목록이 나와요.
        </p>
      ) : (
        <>
          <div className="bg-trust-50 text-trust-700 text-sm font-bold rounded-xl px-4 py-3">영어 목소리 {voices.length}개 · 미국 {us}개</div>
          <div className="space-y-2">
            <Label>쓸 목소리</Label>
            <select className="input-field bg-slate-50" value={draft.voiceURI} onChange={e => setDraft({ ...draft, voiceURI: e.target.value })}>
              <option value="">자동 (미국 영어)</option>
              {voices.map(v => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang}){v.localService ? '' : ' · 온라인'}</option>)}
            </select>
          </div>
        </>
      )}
      <div className="space-y-2">
        <Label>들어 보기</Label>
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-secondary py-3 text-sm" onClick={() => play(() => speak(numWords(1234567)))}><span className="en">{fmt(1234567)}</span></button>
          <button className="btn-secondary py-3 text-sm flex items-center justify-center gap-1.5" onClick={() => play(() => sayNumberSlow(12345))}><Scissors size={16} /><span className="en">{fmt(12345)}</span> 끊어 읽기</button>
          <button className="btn-secondary py-3 text-sm en" onClick={() => play(() => speak('How are you?'))}>How are you?</button>
          <button className="btn-secondary py-3 text-sm en" onClick={() => play(() => speak('a, apple'))}>a, apple</button>
        </div>
        <div className="space-y-1.5 pt-2">
          <Label>짧은 말 확인 (Hi 소리가 안 날 때)</Label>
          <div className="flex flex-wrap gap-1.5">
            {['Hi!', 'Hi.', 'Hi', 'Hai!', 'Hey!', 'Hi there!', 'Hello!'].map(t => (
              <button key={t} className="btn-secondary px-3 py-2 text-sm en" onClick={() => play(() => speak(t))}>{t}</button>
            ))}
          </div>
          <p className="text-[11px] text-slate-400">이 기기에서 소리가 나는 것과 안 나는 것을 알려 주시면, 안 나는 말은 소리가 나는 형태로 바꿔 읽게 하겠습니다.</p>
        </div>
      </div>
      <p className="text-[11px] text-slate-400 leading-relaxed">소리는 기기의 음성 엔진이 냅니다. 기기마다 목소리가 다를 수 있어 아이 태블릿에서 한 번 들어 보세요.</p>
    </Card>
  );
}

/** 주제 여행 노래 주소 (저장 버튼으로 저장) */
function SongCard({ draft, setDraft }: { draft: Config; setDraft: (c: Config) => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<Record<string, boolean>>({});
  return (
    <Card>
      <Title icon={<Music size={18} className="text-trust-600" />}>주제 여행 노래</Title>
      <p className="text-sm text-slate-500 leading-relaxed">
        단원마다 유튜브 주소를 넣어 주세요. 앱 안에서 재생하고 노래가 끝나면 저절로 닫혀서, 추천 영상으로 빠지지 않습니다.
        저작권이 끝난 오래된 동요라도 영상은 만든 채널의 것이라 앱에 담지 않고 주소로만 연결합니다.
        주소가 비어 있으면 "유튜브에서 찾기"로 바로 검색할 수 있어요. 마음에 드는 영상의 주소를 복사해 넣고 "미리 재생"으로 확인해 주세요.
      </p>
      {SONGS.map(u => {
        const url = draft.songs?.[u.id] || '';
        const ok = !!youtubeId(url);
        return (
          <div key={u.id} className="space-y-2">
            <Label>{u.title} {u.known ? '(아는 노래)' : '(새 노래)'}</Label>
            <div className="flex gap-2">
              <input className="input-field bg-slate-50 flex-1" placeholder="https://youtu.be/…" value={url}
                onChange={e => { setDraft({ ...draft, songs: { ...(draft.songs || {}), [u.id]: e.target.value.trim() } }); setBlocked(b => ({ ...b, [u.id]: false })); }} />
              {ok
                ? <button className="btn-secondary px-4 shrink-0" onClick={() => setPreview(u.id)}>미리 재생</button>
                : <a className="btn-secondary px-4 shrink-0 flex items-center" target="_blank" rel="noopener noreferrer"
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(u.title + ' nursery rhyme')}`}>유튜브에서 찾기</a>}
            </div>
            {url && !ok && <p className="text-[11px] font-bold text-rose-500">유튜브 주소가 아닌 것 같아요.</p>}
            {blocked[u.id] && <p className="text-[11px] font-bold text-amber-600">이 영상은 앱 안 재생이 막혀 있어요. 아이 화면에서는 "새 창으로 열기"로 열립니다. 다른 영상을 고르는 것을 권해요.</p>}
          </div>
        );
      })}
      <SongPlayer open={!!preview} url={preview ? draft.songs?.[preview] || '' : ''} title={preview ? SONG_BY_ID[preview].title : ''}
        onClose={() => setPreview(null)} onBlocked={b => preview && setBlocked(x => ({ ...x, [preview]: b }))} />
    </Card>
  );
}

/** 오늘의 한 마디 — 단계 진행, 표현 추가, 들었어요 도장 (바로 저장됨) */
/** 소리 탐정 — 묶음별 진행, 먼저 열어 주기 */
function PhonicsCard() {
  const { cards, progress } = useStore();
  const prog = groupProgress(cards);
  const auto = openGroups(cards, 1);
  const open = openGroups(cards, progress.phonicsOpen);
  return (
    <Card>
      <Title icon={<Volume2 size={18} className="text-trust-600" />}>소리 탐정</Title>
      <div className="grid gap-2">
        {prog.map(g => {
          const on = g.no <= open;
          return (
            <div key={g.id} className="bg-slate-50 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-400">{g.no}묶음 · <span className="en text-sm text-slate-600">{g.letters.join(' ')}</span></div>
                <div className="text-sm font-black text-slate-700">{on ? `익힘 ${g.learned} · 만남 ${g.met} / ${g.total}` : '닫혀 있음'}</div>
              </div>
              {!on && <button className="btn-secondary px-3 py-2 text-xs shrink-0" onClick={() => {
                if (window.confirm(`${g.no}묶음을 지금 열어 줄까요? 앞 묶음을 다 익히지 않아도 새 글자로 나오기 시작해요.`)) actions.setProgress({ phonicsOpen: g.no });
              }}>열어 주기</button>}
              {on && g.no > auto && g.no === open && <button className="btn-secondary px-3 py-2 text-xs shrink-0" onClick={() => actions.setProgress({ phonicsOpen: g.no - 1 })}>다시 닫기</button>}
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-400 leading-relaxed">한 묶음의 글자를 모두 만나고 80%가 기억 상자 3칸 이상이 되면 다음 묶음이 저절로 열립니다. 아이가 이미 아는 글자라면 먼저 열어 줄 수 있어요. c와 k처럼 소리가 같은 글자는 소리 문제에서 같이 나오지 않습니다.</p>
    </Card>
  );
}

function PhraseCard() {
  const { config, cards, custom, heard } = useStore();
  const f = fillOf(config);
  const prog = levelProgress(cards, f);
  const [ko, setKo] = useState('');
  const [say, setSay] = useState('');
  const [emoji, setEmoji] = useState('');
  const [answers, setAnswers] = useState('');
  const lines = answers.split('\n').map(a => a.trim()).filter(Boolean);
  const met = allItems(custom).filter(p => cards['ph:' + p.id]).map(p => resolve(p, f)).filter((p): p is PhraseItem => !!p);
  const add = () => {
    if (!ko.trim()) { toast('어떤 상황인지 한국어로 적어 주세요'); return; }
    if (lines.length < 2) { toast('대답을 두 줄 이상 적어 주세요 (한 줄에 하나)'); return; }
    const item: PhraseItem = {
      id: 'cu-' + Date.now(), level: 1, group: '우리 집 표현', custom: true,
      ...(say.trim() ? { say: say.trim() } : {}),
      scene: { emoji: emoji.trim() || '💬', ko: ko.trim() },
      answers: lines.slice(0, 6), oddEasy: [], oddNormal: [],
    };
    actions.addCustom(item);
    setKo(''); setSay(''); setEmoji(''); setAnswers('');
    toast('표현을 넣었어요. 다음 판부터 새 표현으로 나와요');
  };
  return (
    <Card>
      <Title icon={<MessageCircle size={18} className="text-trust-600" />}>오늘의 한 마디</Title>
      <div className="grid grid-cols-2 gap-2">
        {prog.map(p => (
          <div key={p.level} className="bg-slate-50 rounded-xl px-4 py-3">
            <div className="text-xs font-bold text-slate-400">{p.level}단계</div>
            <div className="text-sm font-black text-slate-700">익힘 {p.learned} · 만남 {p.met} / {p.total}</div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-slate-400 leading-relaxed">한 단계 표현의 80%가 기억 상자 3칸 이상이 되면 다음 단계가 저절로 열립니다. 2단계의 "What's your name?"과 "How old are you?"는 아래 아이 이름(영어)과 나이를 넣어야 나옵니다.</p>

      <div className="space-y-2 pt-2 border-t border-slate-100">
        <Label>유치원에서 배운 표현 넣기</Label>
        <input className="input-field bg-slate-50" placeholder="상황 (예: 놀이터에서 친구를 만났을 때)" value={ko} onChange={e => setKo(e.target.value)} maxLength={30} />
        <div className="grid grid-cols-[1fr_5rem] gap-2">
          <input className="input-field bg-slate-50" placeholder="상대가 하는 말 (선택, 예: Let's be friends!)" value={say} onChange={e => setSay(e.target.value)} maxLength={60} />
          <input className="input-field bg-slate-50 text-center" placeholder="🙂" value={emoji} onChange={e => setEmoji(e.target.value)} maxLength={4} />
        </div>
        <textarea className="input-field bg-slate-50 min-h-[6rem]" placeholder={'어울리는 대답 (한 줄에 하나, 두 개 이상)\nOkay!\nSure!'} value={answers} onChange={e => setAnswers(e.target.value)} />
        {(say.trim() || lines.length > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {[say.trim(), ...lines].filter(Boolean).map((t, i) => (
              <button key={i} onClick={() => speak(t)} className="bg-trust-50 text-trust-700 rounded-lg px-2.5 py-1 text-xs font-bold flex items-center gap-1"><Volume2 size={12} />{t}</button>
            ))}
          </div>
        )}
        <p className="text-[11px] text-slate-400">넣기 전에 눌러서 소리가 자연스러운지 들어 보세요. 엉뚱한 대답은 기본 표현에서 자동으로 고릅니다.</p>
        <button className="btn-secondary w-full py-3" onClick={add}>표현 넣기</button>
        {custom.length > 0 && (
          <div className="grid gap-1.5">
            {custom.map(p => (
              <div key={p.id} className="flex items-center justify-between gap-2 bg-slate-50 rounded-xl px-3 py-2">
                <span className="text-sm font-bold text-slate-600 min-w-0 truncate">{p.scene?.emoji} {p.scene?.ko}{p.say ? ` · ${p.say}` : ''} <span className="text-slate-400">({p.answers.length}개)</span></span>
                <button aria-label="빼기" className="text-slate-300 hover:text-rose-500 shrink-0" onClick={() => { if (window.confirm('이 표현을 뺄까요?')) actions.removeCustom(p.id); }}><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2 pt-2 border-t border-slate-100">
        <Label>"들었어요!" 도장</Label>
        <p className="text-[11px] text-slate-400">아이가 영상이나 생활에서 아는 표현을 들었다고 하면 눌러 주세요. 표현 도감에 도장이 찍힙니다. 별은 붙지 않습니다.</p>
        {met.length === 0 ? <p className="text-sm text-slate-400">아직 만난 표현이 없어요.</p> : (
          <div className="flex flex-wrap gap-1.5">
            {met.map(p => (
              <button key={p.id} onClick={() => actions.toggleHeard(p.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold border-2 flex items-center gap-1 ${heard[p.id] ? 'bg-rose-50 border-rose-300 text-rose-600' : 'bg-white border-slate-200 text-slate-500'}`}>
                {heard[p.id] && <Stamp size={12} />}{p.say || p.scene?.ko}
              </button>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

export default function Parent({ onHome }: { onHome: () => void }) {
  const store = useStore();
  const [tab, setTab] = useState<'settings' | 'chance' | 'records'>('settings');
  const [draft, setDraft] = useState<Config>(store.config);
  // 다른 기기에서 설정이 넘어오면, 고치던 중이 아닐 때만 화면 값도 바꿈
  const shownCfg = useRef(store.config);
  useEffect(() => {
    if (store.config === shownCfg.current) return;
    const prev = shownCfg.current;
    shownCfg.current = store.config;
    setDraft(d => (JSON.stringify(d) === JSON.stringify(prev) ? store.config : d));
  }, [store.config]);
  const [newPin, setNewPin] = useState('');
  const [selected, setSelected] = useState<RoundRecord | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const dirty = JSON.stringify(draft) !== JSON.stringify(store.config);
  const save = () => {
    if (!Object.values(draft.modes).some(Boolean)) { toast('문제 유형을 하나 이상 켜 주세요'); return; }
    actions.saveConfig(draft);
    toast('설정이 저장되었습니다!');
  };

  const wallet = useWallet();
  const coupons = [...aceCoupons().filter(c => couponState(c) === 'active'), ...mathWishCoupons()];
  const today = dayIndex();
  const reviewCards = Object.entries(store.cards).filter(([id, c]) => c.box < 5 && /^n/.test(id));
  const dueNow = reviewCards.filter(([, c]) => c.due <= today).length;
  const weak = Object.entries(store.cards).filter(([id, v]) => v.wrong > 0 && /^n/.test(id)).sort((a, b) => b[1].wrong - a[1].wrong).slice(0, 12);

  const exportBackup = () => {
    const data: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      if (k.startsWith('english_')) data[k] = localStorage.getItem(k) || '';
    }
    const blob = new Blob([JSON.stringify({ app: 'english-ace', at: Date.now(), data }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `영어에이스_백업_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const importBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (parsed?.app !== 'english-ace' || !parsed.data) throw new Error('형식');
        if (!window.confirm('이 기기의 영어 에이스 기록·설정을 백업 파일의 내용으로 바꿉니다.\n\n계속할까요?')) return;
        Object.keys(localStorage).filter(k => k.startsWith('english_')).forEach(k => localStorage.removeItem(k));
        for (const [k, v] of Object.entries(parsed.data as Record<string, string>)) {
          if (k.startsWith('english_')) localStorage.setItem(k, v);
        }
        location.reload();
      } catch { toast('영어 에이스 백업 파일이 아니에요'); }
    };
    reader.readAsText(file);
  };

  const stageName = (r: RoundRecord) => (r.menu === 'daily' ? '오늘의 한 판' : r.menu === 'phonics' ? '소리 탐정' : r.menu === 'songs' ? `주제 여행 · ${r.unit ? SONG_BY_ID[r.unit]?.title : ''}` : r.menu === 'phrases' ? '오늘의 한 마디' : r.kind === 'check' ? '1 ~ 100 확인' : `숫자 영어 ${r.stage ? STAGE_BY_ID[r.stage].name : ''}`);

  return (
    <div className="min-h-[100dvh] bg-slate-50 pb-24">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => { if (confirmLeave()) onHome(); }} aria-label="아이 홈" className="p-2 hover:bg-slate-100 rounded-full transition-colors"><Home size={20} className="text-slate-600" /></button>
          <h2 className="font-bold text-slate-900">부모님 설정</h2>
        </div>
        <div className="bg-trust-100 text-trust-700 text-[10px] font-black px-2 py-1 rounded-md tracking-wider">ADMIN</div>
      </header>

      <nav className="bg-white border-b border-slate-200 px-6 flex gap-6 overflow-x-auto">
        {([['settings', '학습 설정', <Settings size={16} />], ['chance', '찬스와 별', <Gift size={16} />], ['records', '학습 기록', <History size={16} />]] as const).map(([id, label, icon]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`shrink-0 py-4 text-sm font-bold transition-all border-b-2 ${tab === id ? 'border-trust-600 text-trust-600' : 'border-transparent text-slate-400'}`}>
            <div className="flex items-center gap-2">{icon}{label}{id === 'chance' && coupons.length > 0 && <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{coupons.length}</span>}</div>
          </button>
        ))}
      </nav>

      <main className="p-6 max-w-2xl mx-auto">
        {/* ══════════ 학습 설정 ══════════ */}
        {tab === 'settings' && (
          <div className="space-y-6 animate-slide-up">
            <Card>
              <Title icon={<Settings size={18} className="text-trust-600" />}>문제 설정</Title>
              <div className="space-y-3">
                <Label>한 판의 문제 수 ({draft.count}문제)</Label>
                <input type="range" min={MIN_COUNT} max={MAX_COUNT} step={5} value={draft.count}
                  onChange={e => setDraft({ ...draft, count: parseInt(e.target.value) })} className="w-full accent-trust-600" />
                <div className="flex justify-between text-[10px] font-bold text-slate-300"><span>5문제</span><span>15문제</span><span>30문제</span></div>
              </div>
              <div className="space-y-3">
                <Label>난이도</Label>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  {[1, 2, 3].map(d => (
                    <button key={d} onClick={() => setDraft({ ...draft, difficulty: d })}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${draft.difficulty === d ? 'bg-white text-trust-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                      {d === 1 ? '쉬움' : d === 2 ? '보통' : '어려움'}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {draft.difficulty === 1 ? '보기 3개 가운데 고릅니다. 틀린 보기는 소리가 확연히 다른 것으로 나옵니다.'
                    : draft.difficulty === 2 ? '보기 4개 가운데 고릅니다. 13과 30, 325와 352처럼 헷갈리는 보기를 2개쯤 섞습니다.'
                      : '보기 4개가 모두 헷갈리는 것으로 나옵니다.'}
                </p>
              </div>
              <div className="space-y-3">
                <Label>한 판에 새로 나오는 것</Label>
                <Stepper value={draft.newPerRound} min={0} max={10} unit="개" onChange={n => setDraft({ ...draft, newPerRound: n })} />
                <p className="text-[11px] text-slate-400 leading-relaxed">오늘의 한 마디, 주제 여행, 소리 탐정에서 새 표현·단어·글자 소리를 몇 개씩 낼지 정합니다. 숫자 영어는 판마다 새 숫자를 만들고, 틀린 숫자를 다시 냅니다.</p>
              </div>
              <div className="space-y-3">
                <Label>숫자 영어에 섞을 문제 유형</Label>
                <div className="grid gap-2">
                  {([['listen', '듣고 고르기', '영어 소리를 듣고 숫자 고르기'], ['say', '소리 고르기', '숫자를 보고 맞게 읽은 소리 고르기 (보기를 눌러 들어 봄)'],
                    ['place', '붙는 말 고르기', '색칠한 자리 뒤에 thousand · hundred가 붙는지 고르기 (100 이상에서만)']] as const).map(([k, label, desc]) => (
                    <button key={k} onClick={() => setDraft({ ...draft, modes: { ...draft.modes, [k]: !draft.modes[k] } })}
                      className={`text-left px-4 py-3 rounded-xl border-2 flex items-center justify-between gap-3 ${draft.modes[k] ? 'border-trust-200 bg-trust-50' : 'border-slate-100 bg-white'}`}>
                      <span>
                        <span className={`text-sm font-bold ${draft.modes[k] ? 'text-trust-700' : 'text-slate-400'}`}>{label}</span>
                        <span className="block text-[11px] text-slate-400">{desc}</span>
                      </span>
                      <span className={`w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 ${draft.modes[k] ? 'bg-trust-600' : 'bg-slate-200'}`}>
                        <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${draft.modes[k] ? 'translate-x-5' : ''}`} />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            <Card>
              <Title icon={<Hash size={18} className="text-trust-600" />}>숫자 영어 단계</Title>
              <p className="text-sm text-slate-500 leading-relaxed">
                처음에는 1~100 확인 문제 10개를 풀고, 다 맞히면 100 ~ 999와 1,000 ~ 9,999가 열립니다.
                1만 이상은 "쉼표에서 끊어 읽기" 개념 정리를 보면 열리게 할 예정입니다 (2차).
              </p>
              <div className="flex items-center justify-between gap-3 bg-slate-50 rounded-xl px-4 py-3">
                <span className="text-sm font-bold text-slate-700">{store.progress.numCheck ? '✅ 큰 숫자가 열려 있어요' : '🔒 1~100 확인 전이에요'}</span>
                <button className="btn-secondary px-4 py-2 text-sm" onClick={() => {
                  actions.setProgress({ numCheck: !store.progress.numCheck });
                  toast(store.progress.numCheck ? '다시 잠갔어요' : '확인 없이 큰 숫자를 열었어요');
                }}>{store.progress.numCheck ? '다시 잠그기' : '확인 없이 열기'}</button>
              </div>
            </Card>

            <PhraseCard />

            <SongCard draft={draft} setDraft={setDraft} />
            <PhonicsCard />

            <Card>
              <Title icon={<Eye size={18} className="text-trust-600" />}>아이 화면 체험하기</Title>
              <p className="text-sm text-slate-500 leading-relaxed">
                모든 단계가 열린 아이 화면으로 들어갑니다. 체험 중에 푼 문제는 별·기록·복습에 남지 않고, 힌트도 별을 쓰지 않습니다.
                화면 위의 「체험 끝내기」를 누르거나 30분이 지나면 아이 모드로 돌아갑니다.
              </p>
              <button className="btn-secondary w-full flex items-center justify-center gap-2" onClick={() => { if (!confirmLeave()) return; actions.setPreview(true); onHome(); }}>
                <Eye size={18} />체험 시작
              </button>
            </Card>

            <VoiceCard draft={draft} setDraft={setDraft} />

            <Card>
              <Title icon={<Lightbulb size={18} className="text-amber-500" />}>힌트</Title>
              <div className="space-y-2 text-sm text-slate-500 leading-relaxed">
                <p><strong className="text-slate-700">끊어 듣기</strong>는 몇 번이든 무료입니다. 덩어리마다 쉬어 가며 읽고, 읽는 자리를 색으로 보여 줍니다.</p>
                <p><strong className="text-slate-700">보기 지우기</strong>는 무료가 없고, 한 번에 별 {HINT_COST}개를 씁니다.</p>
                <p className="text-[11px] text-slate-400">힌트를 보고 맞힌 문제는 별은 그대로 받지만, 몰랐던 것으로 보고 다시 복습에 나옵니다.</p>
              </div>
            </Card>

            <Card>
              <Title icon={<Star size={18} className="text-amber-400" />}>아이 이름</Title>
              <input type="text" className="input-field bg-slate-50" placeholder="예: 지민" maxLength={10}
                value={draft.childName || ''} onChange={e => setDraft({ ...draft, childName: e.target.value })} />
              <p className="text-[11px] text-slate-400">인사와 칭찬에서 아이 이름을 불러 줘요. (선택)</p>
              <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
                <div className="space-y-2">
                  <Label>영어로 쓴 이름 (예: Jimin)</Label>
                  <input type="text" className="input-field bg-slate-50 en" placeholder="Jimin" maxLength={16}
                    value={draft.childNameEn || ''} onChange={e => setDraft({ ...draft, childNameEn: e.target.value.replace(/[^A-Za-z \-']/g, '') })} />
                </div>
                <div className="space-y-2">
                  <Label>나이</Label>
                  <Stepper value={draft.childAge || 0} min={0} max={12} unit="살" onChange={n => setDraft({ ...draft, childAge: n })} />
                </div>
              </div>
              <p className="text-[11px] text-slate-400">오늘의 한 마디의 "What's your name?", "How old are you?" 대답에 씁니다. 한글 이름은 영어 목소리가 읽지 못해서 영어로 따로 받습니다. 비워 두면 그 문제는 나오지 않아요.</p>
              {draft.childNameEn && <button className="btn-secondary px-4 py-2 text-sm flex items-center gap-1.5" onClick={() => speak(`My name is ${draft.childNameEn}.`)}><Volume2 size={14} />My name is {draft.childNameEn}.</button>}
            </Card>


            <div className="pt-10 border-t-2 border-dashed border-slate-200 space-y-6">
              <div className="flex items-center justify-center gap-2">
                <div className="h-px bg-slate-200 flex-1" />
                <div className="text-[10px] font-black text-slate-300 tracking-[0.3em] whitespace-nowrap">SYSTEM</div>
                <div className="h-px bg-slate-200 flex-1" />
              </div>

              <Card dim>
                <Title icon={<Lock size={18} className="text-slate-400" />}>보안 설정</Title>
                <Label>새 PIN 번호 (4자리)</Label>
                <div className="flex gap-2">
                  <input type="password" inputMode="numeric" maxLength={4} className="input-field flex-1 bg-slate-50" placeholder="****"
                    value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))} />
                  <button className="btn-secondary px-6" onClick={() => {
                    if (newPin.length !== 4) { toast('PIN 번호는 4자리여야 합니다.'); return; }
                    if (newPin === hubPin()) { toast('에이스 홈 PIN과 다른 번호로 정해 주세요.'); return; }
                    actions.setPin(newPin); setNewPin(''); toast('PIN 번호가 변경되었습니다!');
                  }}>변경</button>
                </div>
                <p className="text-[11px] text-slate-400">처음 PIN은 1234입니다. 수학·한자 에이스의 PIN과는 따로 저장됩니다.</p>
              </Card>

              <Card dim>
                <Title icon={<Database size={18} className="text-slate-400" />}>기록 백업</Title>
                <p className="text-sm text-slate-500 leading-relaxed">
                  판 기록(별 계산에 쓰는 것)은 수학 에이스에 연결한 동기화 서버로 올라가서 에이스 홈과 다른 기기에서도 별이 맞게 보입니다. 설정과 PIN도 다른 기기와 맞춰집니다. 기억 상자·단계 진행은 이 기기에만 저장되니, 기기를 바꾸기 전에 백업 파일로 내려받아 두세요.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button className="btn-secondary py-3 text-sm" onClick={exportBackup}>백업 파일 받기</button>
                  <button className="btn-secondary py-3 text-sm" onClick={() => fileRef.current?.click()}>백업 파일 불러오기</button>
                </div>
                <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={importBackup} />
              </Card>

              <ResetCard />

              <Card dim>
                <Title icon={<Smartphone size={18} className="text-slate-400" />}>홈 화면에 추가하기</Title>
                <p className="text-sm text-slate-500 leading-relaxed">
                  브라우저 메뉴에서 <strong>'홈 화면에 추가'</strong>를 누르면 앱처럼 아이콘으로 바로 실행할 수 있습니다.
                </p>
                <div className="flex gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-10 h-10 bg-trust-600 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm"><Plus size={20} /></div>
                  <div className="text-[11px] text-slate-400 leading-tight flex items-center">
                    아이폰: 공유 버튼 → 홈 화면에 추가<br />안드로이드: 메뉴 버튼 → 앱 설치 또는 홈 화면에 추가
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ══════════ 찬스와 별 (에이스 홈에서) ══════════ */}
        {tab === 'chance' && (
          <div className="space-y-6 animate-slide-up">
            <div className="grid grid-cols-3 gap-3">
              {[['남은 별 (합산)', wallet.balance, 'text-amber-600'], ['영어에서 번 별', earnedStars(store), 'text-emerald-600'], ['쓴 별 (합산)', wallet.spent, 'text-slate-600']].map(([label, n, color]) => (
                <div key={label as string} className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
                  <div className={`text-2xl font-black font-display ${color}`}>{n as number}</div>
                  <div className="text-[11px] font-bold text-slate-400 mt-1">{label as string}</div>
                </div>
              ))}
            </div>
            <Card>
              <Title icon={<Gift size={18} className="text-trust-600" />}>찬스와 쿠폰은 에이스 홈에서</Title>
              <p className="text-sm text-slate-500 leading-relaxed">
                별은 모든 과목이 함께 쓰는 지갑 하나예요. 찬스 가게, 쿠폰 사용 처리, 별 장부는 에이스 홈의 부모님 모드에서 해요.
              </p>
              {coupons.length > 0 && <p className="text-sm font-bold text-amber-600">사용을 기다리는 쿠폰 {coupons.length}장</p>}
              <button className="btn-secondary w-full flex items-center justify-center gap-2" onClick={() => goHome()}>
                <Star size={16} className="text-amber-500 fill-amber-500" />에이스 홈 열기
              </button>
            </Card>
          </div>
        )}

        {/* ══════════ 학습 기록 ══════════ */}
        {tab === 'records' && (
          <div className="space-y-4 animate-slide-up">
            {selected ? (
              <div className="space-y-6">
                <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-trust-600 font-bold hover:underline">
                  <ChevronLeft size={20} />목록으로 돌아가기
                </button>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0">
                      <h3 className="text-xl font-black text-slate-900">{stageName(selected)}</h3>
                      <p className="text-sm text-slate-400">{selected.date}</p>
                      <p className="text-xs text-slate-400 mt-1">번 별 {selected.stars}개 · 별로 본 힌트 {selected.hintsPaid}번</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-3xl font-black text-trust-600">{selected.correct} / {selected.total}</div>
                      <div className="text-[10px] font-bold text-slate-400 tracking-widest">SCORE</div>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    {selected.items.map((it, i) => (
                      <div key={i} className={`p-3 rounded-2xl border flex justify-between items-center gap-3 ${it.ok ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs font-bold text-slate-400 w-5 shrink-0">{i + 1}</span>
                          <span className="min-w-0">
                            <span className="font-bold text-slate-700 block truncate">{it.ans}</span>
                            <span className="text-[11px] text-slate-400 block truncate">{it.q}{it.hint ? ' · 힌트 봄' : ''}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {!it.ok && <span className="text-sm font-black text-rose-600">답: {it.val || '-'}</span>}
                          {it.ok ? <CheckCircle2 size={20} className="text-emerald-500" /> : <XCircle size={20} className="text-rose-500" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900">다시 만날 숫자 {reviewCards.length}개</h3>
                    <span className="text-xs font-bold text-trust-600">오늘 복습 차례 {dueNow}개</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">틀렸거나 힌트를 보고 맞힌 숫자는 기억 상자에 들어가 다시 나옵니다. 처음부터 맞힌 숫자는 따로 모으지 않습니다.</p>
                  {weak.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {weak.map(([id, v]) => (
                        <button key={id} onClick={() => speak(numWords(Number(id.split(':')[1])))} className="bg-rose-50 border border-rose-100 rounded-xl px-3 py-2 text-left">
                          <span className="en text-xl text-slate-800">{fmt(Number(id.split(':')[1]))}</span>
                          <span className="block text-[10px] font-bold text-rose-500">{v.wrong}번 틀림</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {store.records.length === 0 ? (
                  <div className="text-center py-16">
                    <History size={48} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-slate-400 font-medium">아직 학습 기록이 없습니다.</p>
                  </div>
                ) : store.records.map(r => (
                  <button key={r.ts} onClick={() => setSelected(r)}
                    className="w-full text-left bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center gap-4 group hover:border-trust-300 transition-all active:scale-[0.98]">
                    <div className="space-y-1 min-w-0">
                      <div className="font-bold text-slate-900">{stageName(r)} <span className="text-xs font-bold text-amber-500">★ +{r.stars}</span></div>
                      <div className="text-xs text-slate-400 truncate">{r.date}</div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <div className="text-2xl font-black text-trust-600 font-display">{r.correct} / {r.total}</div>
                        <div className="text-[10px] font-bold text-slate-400 tracking-widest">SCORE</div>
                      </div>
                      <ChevronRight size={20} className="text-slate-300 group-hover:text-trust-500" />
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </main>
      <AceSaveBar dirty={dirty} onSave={save} onRevert={() => setDraft(store.config)} />
    </div>
  );
}
