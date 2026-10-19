/** 아이 홈의 메뉴 (1차: 숫자 영어부터 순서대로 엶) */
export type MenuId = 'numbers' | 'phrases' | 'songs' | 'phonics' | 'alphabet';

/** 숫자 영어 단계: 1~100 / 100~999 / 1,000~9,999 */
export type NumStage = 'n100' | 'n999' | 'n9999';

/**
 * listen 소리 듣고 숫자 고르기
 * say    숫자 보고 맞는 소리 고르기 (소리 버튼)
 * place  색칠한 부분 뒤에 붙는 말 고르기 (thousand / hundred / 없음)
 */
export type QType = 'listen' | 'say' | 'place';

/** check = 1~100 확인 문제 (다 맞히면 다음 단계가 열림) */
export type RoundKind = 'play' | 'check';

export interface Option { key: string; label: string }

export interface Question {
  type: QType;
  id: string;            // 기억 상자 카드 번호 (예: n999:325)
  value: number;
  options: Option[];
  answer: string;        // 정답 key
  hi?: [number, number]; // place: 색칠할 글자 범위 (쉼표 포함 표기 기준, 끝은 포함 안 함)
  isReview?: boolean;    // 복습 차례로 나온 문제
}

export interface RoundItem {
  id: string; type: QType | 'odd'; q: string; ans: string; val: string; ok: boolean; hint: boolean;
}

export interface RoundRecord {
  ts: number;
  date: string;
  menu: 'numbers' | 'phrases' | 'songs' | 'phonics' | 'daily';
  stage?: NumStage;           // 숫자 영어만
  unit?: string;              // 주제 여행 단원
  kind: RoundKind;
  correct: number;
  total: number;
  stars: number;         // 이 판에서 번 별
  lowAcc?: boolean;      // 정답이 40%보다 적어 별을 받지 못한 판
  hintsPaid: number;
  items: RoundItem[];
}

/** 기억 상자 속 카드 한 장 (한자 에이스와 같은 모양) */
export interface Card {
  box: number;
  due: number;
  seen: number;
  wrong: number;
  last: number;
}

export interface Config {
  count: number;          // 한 판의 문제 수 (5~30)
  difficulty: number;     // 1 쉬움(보기 3개), 2 보통(4개, 비슷한 것 섞기), 3 어려움(4개 모두 헷갈리는 것)
  newPerRound: number;    // 한 판에 새로 나오는 것 (표현·단어·글자 소리에서 씀)
  modes: { listen: boolean; say: boolean; place: boolean };
  childName: string;
  childNameEn: string;    // 영어로 쓴 이름 (예: Jimin). "What's your name?"에 씀
  childAge: number;       // 오늘의 한 마디 "How old are you?"에 씀 (0이면 그 문제는 안 나옴)
  voiceURI: string;       // 고른 영어 목소리 (비우면 미국 영어 자동)
  songs: Record<string, string>;   // 주제 여행 단원별 유튜브 주소 (부모님이 넣음)
}

export interface Progress {
  numCheck: boolean;      // 1~100 확인을 통과했는지 (또는 부모가 열어 줌)
  concepts: string[];     // 끝까지 본 개념 정리
  phraseLevel: number;    // 오늘의 한 마디에서 아이에게 알려 준 마지막 단계 (새 단계가 열리면 알림)
  phonicsOpen: number;    // 소리 탐정: 부모님이 열어 준 묶음 수 (기본 1)
  phonicsShown: number;   // 소리 탐정: 아이에게 알려 준 마지막 열린 묶음 수
}
