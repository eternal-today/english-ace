/**
 * 소리 탐정 — 글자 소리 (설계 문서 5-4, 1차 P1~P2)
 * 글자 소리는 녹음 없이 "S. sun." 처럼 글자 이름과 단어를 묶어 기기 목소리로 들려줌.
 * 묶음 순서는 많이 쓰는 파닉스 순서(s a t p i n → c k e h r m d → g o u l f b).
 * 대표 단어는 첫소리가 글자 소리 그대로인 것만, 그림(이모지)은 오래된 기기에도 나오는 것만 씀.
 */

export interface PhWord { word: string; emoji: string; ko: string }
export interface Letter {
  id: string;          // 작은 글자 (s)
  upper: string;       // 큰 글자 (S)
  name: string;        // 이름 (한글로 비슷하게: 에스)
  sound: string;       // 소리 (한글로 비슷하게: 스)
  words: PhWord[];
}
export interface PhGroup { id: string; no: number; letters: string[] }

const L = (id: string, name: string, sound: string, words: [string, string, string][]): Letter =>
  ({ id, upper: id.toUpperCase(), name, sound, words: words.map(([word, emoji, ko]) => ({ word, emoji, ko })) });

export const LETTERS: Letter[] = [
  // 1묶음
  L('s', '에스', '스', [['sun', '☀️', '해'], ['sock', '🧦', '양말'], ['snake', '🐍', '뱀']]),
  L('a', '에이', '애', [['apple', '🍎', '사과'], ['ant', '🐜', '개미'], ['alligator', '🐊', '악어']]),
  L('t', '티', '트', [['tiger', '🐯', '호랑이'], ['tomato', '🍅', '토마토'], ['turtle', '🐢', '거북']]),
  L('p', '피', '프', [['pig', '🐷', '돼지'], ['panda', '🐼', '판다'], ['pizza', '🍕', '피자']]),
  L('i', '아이', '이', [['iguana', '🦎', '이구아나'], ['insect', '🐞', '곤충']]),
  L('n', '엔', '느', [['nose', '👃', '코'], ['nut', '🥜', '땅콩'], ['net', '🥅', '그물']]),
  // 2묶음
  L('c', '씨', '크', [['cat', '🐱', '고양이'], ['cow', '🐄', '소'], ['cake', '🎂', '케이크'], ['car', '🚗', '자동차']]),
  L('k', '케이', '크', [['king', '🤴', '왕'], ['key', '🔑', '열쇠'], ['koala', '🐨', '코알라']]),
  L('e', '이', '에', [['egg', '🥚', '달걀'], ['elephant', '🐘', '코끼리']]),
  L('h', '에이치', '흐', [['hat', '🎩', '모자'], ['horse', '🐴', '말'], ['house', '🏠', '집']]),
  L('r', '알', '르', [['rabbit', '🐰', '토끼'], ['robot', '🤖', '로봇'], ['ring', '💍', '반지'], ['rainbow', '🌈', '무지개']]),
  L('m', '엠', '므', [['moon', '🌙', '달'], ['monkey', '🐵', '원숭이'], ['mouse', '🐭', '생쥐'], ['milk', '🥛', '우유']]),
  L('d', '디', '드', [['dog', '🐶', '강아지'], ['duck', '🦆', '오리'], ['drum', '🥁', '북'], ['door', '🚪', '문']]),
  // 3묶음
  L('g', '쥐', '그', [['goat', '🐐', '염소'], ['gift', '🎁', '선물'], ['guitar', '🎸', '기타'], ['gorilla', '🦍', '고릴라']]),
  L('o', '오', '아', [['octopus', '🐙', '문어'], ['ox', '🐂', '황소']]),
  L('u', '유', '어', [['umbrella', '☂️', '우산'], ['up', '⬆️', '위로']]),
  L('l', '엘', '을', [['lion', '🦁', '사자'], ['lemon', '🍋', '레몬'], ['leaf', '🍃', '나뭇잎']]),
  L('f', '에프', '프', [['fish', '🐟', '물고기'], ['frog', '🐸', '개구리'], ['fox', '🦊', '여우'], ['fire', '🔥', '불']]),
  L('b', '비', '브', [['bear', '🐻', '곰'], ['banana', '🍌', '바나나'], ['bus', '🚌', '버스'], ['bee', '🐝', '벌']]),
];

export const LETTER_BY_ID = Object.fromEntries(LETTERS.map(l => [l.id, l])) as Record<string, Letter>;

export const GROUPS: PhGroup[] = [
  { id: 'g1', no: 1, letters: ['s', 'a', 't', 'p', 'i', 'n'] },
  { id: 'g2', no: 2, letters: ['c', 'k', 'e', 'h', 'r', 'm', 'd'] },
  { id: 'g3', no: 3, letters: ['g', 'o', 'u', 'l', 'f', 'b'] },
];

/** 소리가 같은 글자 (보기에 같이 나오면 정답이 둘이 됨) */
export const SAME_SOUND: Record<string, string[]> = { c: ['k'], k: ['c'] };

/** 모양이 비슷한 글자 (큰 글자·작은 글자 짝 찾기의 보기로 씀) */
export const LOOKALIKE: Record<string, string[]> = {
  b: ['d', 'p'], d: ['b', 'p'], p: ['b', 'd'], n: ['m', 'h', 'u'], m: ['n'], h: ['n', 'k'], u: ['n'],
  i: ['l', 't'], l: ['i', 't'], t: ['f', 'l'], f: ['t'], a: ['o', 'e'], o: ['a', 'e', 'c'], e: ['c', 'o'],
  c: ['e', 'o'], s: ['c', 'e'], g: ['p', 'd'], k: ['h'], r: ['n'],
};

/** "S. sun." — 글자 이름과 단어를 묶어 읽기 (따로 읽으면 글자 하나를 안 읽는 기기가 있음) */
export const letterSay = (l: Letter, words = l.words.slice(0, 2)) => `${l.upper}. ${words.map(w => w.word).join('. ')}.`;

/** 묶음별 개념 정리 ③ 조심해요 */
export const GROUP_CAREFUL: Record<string, { title: string; note: string; say?: string[] }[]> = {
  g1: [
    { title: 'a의 이름은 "에이", 소리는 "애"', note: '알파벳 노래에서는 "에이"지만, 단어 속에서는 "애" 소리가 나요.', say: ['apple', 'ant'] },
    { title: 'i의 이름은 "아이", 소리는 "이"', note: '단어 앞에서는 짧게 "이" 소리가 나요.', say: ['iguana', 'insect'] },
  ],
  g2: [
    { title: 'c와 k는 소리가 같아요', note: '둘 다 "크" 소리예요. 그래서 소리 문제에서는 c와 k가 같이 나오지 않아요.', say: ['cat', 'king'] },
    { title: 'e의 이름은 "이", 소리는 "에"', note: 'egg는 "이그"가 아니라 "에그"예요.', say: ['egg', 'elephant'] },
  ],
  g3: [
    { title: 'b와 d는 모양이 비슷해요', note: 'b는 배가 오른쪽, d는 배가 왼쪽이에요.', say: ['bear', 'dog'] },
    { title: 'f와 p는 달라요', note: 'f는 윗니를 아랫입술에 살짝 대고 바람을 내요. p는 입술을 붙였다 터뜨려요.', say: ['fish', 'pig'] },
    { title: 'o는 "아", u는 "어"', note: '이름은 "오", "유"지만 단어 앞에서는 "아", "어" 소리가 나요.', say: ['octopus', 'umbrella'] },
  ],
};
